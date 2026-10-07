package election.ems_backend.service.implement;

import election.ems_backend.entity.ReportFile;
import election.ems_backend.entity.ReportSnapshot;

import election.ems_backend.repository.ReportFileRepository;
import election.ems_backend.repository.ReportSnapshotRepository;

import election.ems_backend.service.ReportGeneratorService;
import election.ems_backend.service.ReportStorageService;

import election.ems_backend.views.service.TenantGucService;

import lombok.RequiredArgsConstructor;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;

import org.apache.poi.xssf.streaming.SXSSFWorkbook;

import org.knowm.xchart.BitmapEncoder;
import org.knowm.xchart.CategoryChart;
import org.knowm.xchart.CategoryChartBuilder;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import org.xhtmlrenderer.pdf.ITextRenderer;

import java.awt.image.BufferedImage;

import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;

import java.nio.charset.StandardCharsets;

import java.time.OffsetDateTime;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import java.util.concurrent.atomic.AtomicInteger;

import java.util.stream.Collectors;

// ============================================================================
// REPORT GENERATOR SERVICE
// ============================================================================

/**
 * Generates stored election-report artifacts from an already-authorized
 * ReportSnapshot.
 *
 * SECURITY MODEL
 * --------------------------------------------------------------------------
 *
 * Authorization happens BEFORE this async generator is started:
 *
 * ReportServiceImplementation
 *
 *     authenticated user
 *          ↓
 *     organization boundary
 *          ↓
 *     election assignment
 *          ↓
 *     geographic scope
 *          ↓
 *     report-generation authority
 *          ↓
 *     ReportSnapshot persisted
 *          ↓
 *     generator.generate(snapshotId)
 *
 * This generator therefore does NOT attempt to reconstruct user
 * authorization.
 *
 * Instead, the persisted ReportSnapshot is the immutable generation boundary.
 *
 * Every generated representation:
 *
 * - CSV
 * - XLSX
 * - PDF
 * - PDF totals
 * - PDF candidate summary
 * - PDF sample rows
 *
 * MUST apply exactly the same snapshot filters.
 */
@Service
@RequiredArgsConstructor
public class ReportGeneratorServiceImplementation
        implements ReportGeneratorService {

    // ========================================================================
    // DEPENDENCIES
    // ========================================================================

    private final ReportSnapshotRepository snapshotRepo;

    private final ReportFileRepository fileRepo;

    private final JdbcTemplate jdbc;

    private final ReportStorageService storage;

    private final TenantGucService tenantGucService;

    private final TemplateEngine templateEngine;

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    @Value("${reports.pdf.topN:10}")
    private int pdfTopN;

    @Value("${reports.pdf.sampleSize:20}")
    private int pdfSampleSize;

    @Value("${reports.s3.presign.ttl:86400}")
    private long presignTtl;

    // ========================================================================
    // GENERATE
    // ========================================================================

    @Override
    @Async("reportTaskExecutor")
    @Transactional
    public void generate(
            UUID snapshotId
    ) {

        if (snapshotId == null) {
            return;
        }

        ReportSnapshot snapshot =
                snapshotRepo
                        .findById(snapshotId)
                        .orElse(null);

        if (snapshot == null) {
            return;
        }

        // --------------------------------------------------------------------
        // SNAPSHOT VALIDITY
        // --------------------------------------------------------------------

        if (
                snapshot.getOrgId() == null
                        || snapshot.getElectionId() == null
        ) {

            snapshot.setStatus(
                    "FAILED"
            );

            snapshot.setStatusMessage(
                    "Report snapshot is missing organization or election context"
            );

            snapshotRepo.save(
                    snapshot
            );

            return;
        }

        // --------------------------------------------------------------------
        // RUNNING
        // --------------------------------------------------------------------

        snapshot.setStatus(
                "RUNNING"
        );

        snapshot.setStatusMessage(
                null
        );

        snapshotRepo.save(
                snapshot
        );

        // --------------------------------------------------------------------
        // TENANT / RLS CONTEXT
        // --------------------------------------------------------------------
        //
        // Async execution does not inherit the HTTP request's thread-local
        // tenant context.
        //
        // The organization persisted on the authorized ReportSnapshot is
        // therefore applied explicitly to the report-generation transaction.
        //
        // --------------------------------------------------------------------

        tenantGucService.applyForTransaction(
                snapshot.getOrgId(),
                false,
                false
        );

        File csvFile =
                null;

        File xlsxFile =
                null;

        File pdfFile =
                null;

        try {

            // =================================================================
            // CANONICAL CSV
            // =================================================================

            csvFile =
                    generateCsvForSnapshot(
                            snapshot
                    );

            String csvUri =
                    storage.store(
                            csvFile,
                            "report-"
                                    + snapshot.getSnapshotId()
                                    + ".csv"
                    );

            persistReportFile(
                    snapshot,
                    "CSV",
                    csvFile.length(),
                    csvUri
            );

            String requestedFormat =
                    normalizeFormat(
                            snapshot.getRequestedFormat()
                    );

            // =================================================================
            // CSV REQUEST
            // =================================================================

            if ("CSV".equals(requestedFormat)) {

                complete(
                        snapshot,
                        "CSV generated"
                );

                return;
            }

            // =================================================================
            // XLSX REQUEST
            // =================================================================

            if ("XLSX".equals(requestedFormat)) {

                xlsxFile =
                        generateXlsxForSnapshot(
                                snapshot
                        );

                String xlsxUri =
                        storage.store(
                                xlsxFile,
                                "report-"
                                        + snapshot.getSnapshotId()
                                        + ".xlsx"
                        );

                persistReportFile(
                        snapshot,
                        "XLSX",
                        xlsxFile.length(),
                        xlsxUri
                );

                complete(
                        snapshot,
                        "XLSX generated"
                );

                return;
            }

            // =================================================================
            // PDF REQUEST
            // =================================================================

            if ("PDF".equals(requestedFormat)) {

                /*
                 * IMPORTANT:
                 *
                 * Every helper below now applies:
                 *
                 * electionId
                 * countyId
                 * districtId
                 * centerId
                 * candidateId
                 * partyId
                 *
                 * from the exact same ReportSnapshot.
                 */
                Map<String, Object> totals =
                        computeTotals(
                                snapshot
                        );

                List<Map<String, Object>> topCandidates =
                        computeTopCandidates(
                                snapshot,
                                pdfTopN
                        );

                List<Map<String, Object>> sampleRows =
                        computeSampleRows(
                                snapshot,
                                pdfSampleSize
                        );

                byte[] chartPng =
                        generateTopCandidatesChart(
                                topCandidates
                        );

                // ------------------------------------------------------------
                // CANONICAL CSV DOWNLOAD LINK
                // ------------------------------------------------------------

                String csvDownloadUrl;

                try {

                    csvDownloadUrl =
                            storage.presign(
                                    csvUri,
                                    presignTtl
                            );

                } catch (Exception ignored) {

                    /*
                     * Preserve existing fallback behavior.
                     *
                     * Depending on the storage provider, csvUri may itself be
                     * directly usable.
                     */
                    csvDownloadUrl =
                            csvUri;
                }

                // ------------------------------------------------------------
                // TEMPLATE CONTEXT
                // ------------------------------------------------------------

                Context context =
                        new Context();

                context.setVariable(
                        "reportTitle",
                        "Election Results Summary"
                );

                context.setVariable(
                        "subtitle",
                        buildReportSubtitle(
                                snapshot
                        )
                );

                context.setVariable(
                        "snapshotId",
                        snapshot
                                .getSnapshotId()
                                .toString()
                );

                context.setVariable(
                        "requestedBy",
                        snapshot.getRequestedBy()
                );

                context.setVariable(
                        "requestedAt",
                        snapshot.getRequestedAt()
                );

                context.setVariable(
                        "totals",
                        totals
                );

                context.setVariable(
                        "topCandidates",
                        topCandidates
                );

                context.setVariable(
                        "sampleRows",
                        sampleRows
                );

                String chartDataUri =
                        "data:image/png;base64,"
                                + Base64
                                .getEncoder()
                                .encodeToString(
                                        chartPng
                                );

                context.setVariable(
                        "chartDataUri",
                        chartDataUri
                );

                context.setVariable(
                        "logoDataUri",
                        null
                );

                context.setVariable(
                        "downloadUrl",
                        csvDownloadUrl
                );

                context.setVariable(
                        "generatedAt",
                        OffsetDateTime
                                .now()
                                .toString()
                );

                // ------------------------------------------------------------
                // RENDER PDF
                // ------------------------------------------------------------

                String html =
                        templateEngine.process(
                                "report-summary",
                                context
                        );

                pdfFile =
                        File.createTempFile(
                                "report-",
                                ".pdf"
                        );

                try (
                        FileOutputStream outputStream =
                                new FileOutputStream(
                                        pdfFile
                                )
                ) {

                    ITextRenderer renderer =
                            new ITextRenderer();

                    renderer.setDocumentFromString(
                            html
                    );

                    renderer.layout();

                    renderer.createPDF(
                            outputStream
                    );
                }

                String pdfUri =
                        storage.store(
                                pdfFile,
                                "report-"
                                        + snapshot.getSnapshotId()
                                        + ".pdf"
                        );

                persistReportFile(
                        snapshot,
                        "PDF",
                        pdfFile.length(),
                        pdfUri
                );

                complete(
                        snapshot,
                        "PDF summary generated"
                );

                return;
            }

            // =================================================================
            // DEFENSIVE FALLBACK
            // =================================================================

            complete(
                    snapshot,
                    "CSV generated"
            );

        } catch (Exception ex) {

            snapshot.setStatus(
                    "FAILED"
            );

            snapshot.setStatusMessage(
                    safeErrorMessage(
                            ex
                    )
            );

            snapshotRepo.save(
                    snapshot
            );

        } finally {

            deleteQuietly(
                    csvFile
            );

            deleteQuietly(
                    xlsxFile
            );

            deleteQuietly(
                    pdfFile
            );
        }
    }

    // =========================================================================
    // COMPLETE
    // =========================================================================

    private void complete(
            ReportSnapshot snapshot,
            String message
    ) {

        snapshot.setStatus(
                "COMPLETED"
        );

        snapshot.setStatusMessage(
                message
        );

        snapshotRepo.save(
                snapshot
        );
    }

    // =========================================================================
    // REPORT FILE
    // =========================================================================

    private void persistReportFile(
            ReportSnapshot snapshot,
            String format,
            long size,
            String uri
    ) {

        ReportFile file =
                new ReportFile();

        file.setFileId(
                UUID.randomUUID()
        );

        file.setSnapshotId(
                snapshot.getSnapshotId()
        );

        file.setFormat(
                format
        );

        file.setFileSize(
                size
        );

        file.setStorageUri(
                uri
        );

        file.setStatus(
                "READY"
        );

        file.setGeneratedAt(
                OffsetDateTime.now()
        );

        fileRepo.save(
                file
        );
    }

    // =========================================================================
    // CSV
    // =========================================================================

    private File generateCsvForSnapshot(
            ReportSnapshot snapshot
    ) throws Exception {

        File temp =
                File.createTempFile(
                        "report-csv-",
                        ".csv"
                );

        try (
                BufferedWriter writer =
                        new BufferedWriter(
                                new OutputStreamWriter(
                                        new FileOutputStream(
                                                temp
                                        ),
                                        StandardCharsets.UTF_8
                                )
                        );

                CSVPrinter csv =
                        new CSVPrinter(
                                writer,

                                CSVFormat.DEFAULT.withHeader(
                                        "election_id",
                                        "county_id",
                                        "county_name",
                                        "district_id",
                                        "district_name",
                                        "center_id",
                                        "center_code",
                                        "center_name",
                                        "candidate_id",
                                        "candidate_name",
                                        "party_id",
                                        "party_name",
                                        "party_code",
                                        "candidate_votes",
                                        "registered_voters",
                                        "ballots_cast",
                                        "center_valid_votes",
                                        "center_invalid_total"
                                )
                        )
        ) {

            StringBuilder sql =
                    new StringBuilder(
                            """
                            SELECT
                                election_id,
                                county_id,
                                county_name,
                                district_id,
                                district_name,
                                center_id,
                                center_code,
                                center_name,
                                candidate_id,
                                candidate_name,
                                party_id,
                                party_name,
                                party_code,
                                candidate_votes,
                                registered_voters,
                                ballots_cast,
                                center_valid_votes,
                                center_invalid_total
                            FROM v_candidate_center_stats_official
                            WHERE election_id = ?
                            """
                    );

            List<Object> params =
                    new ArrayList<>();

            params.add(
                    snapshot.getElectionId()
            );

            appendSnapshotFilters(
                    sql,
                    params,
                    snapshot
            );

            sql.append(
                    """
                    
                    ORDER BY
                        county_name,
                        district_name,
                        center_code,
                        candidate_name
                    """
            );

            jdbc.query(
                    sql.toString(),

                    rs -> {

                        try {

                            csv.printRecord(
                                    rs.getObject(
                                            "election_id"
                                    ),

                                    rs.getObject(
                                            "county_id"
                                    ),

                                    rs.getString(
                                            "county_name"
                                    ),

                                    rs.getObject(
                                            "district_id"
                                    ),

                                    rs.getString(
                                            "district_name"
                                    ),

                                    rs.getObject(
                                            "center_id"
                                    ),

                                    rs.getString(
                                            "center_code"
                                    ),

                                    rs.getString(
                                            "center_name"
                                    ),

                                    rs.getObject(
                                            "candidate_id"
                                    ),

                                    rs.getString(
                                            "candidate_name"
                                    ),

                                    rs.getObject(
                                            "party_id"
                                    ),

                                    rs.getString(
                                            "party_name"
                                    ),

                                    rs.getString(
                                            "party_code"
                                    ),

                                    rs.getObject(
                                            "candidate_votes"
                                    ),

                                    rs.getObject(
                                            "registered_voters"
                                    ),

                                    rs.getObject(
                                            "ballots_cast"
                                    ),

                                    rs.getObject(
                                            "center_valid_votes"
                                    ),

                                    rs.getObject(
                                            "center_invalid_total"
                                    )
                            );

                        } catch (IOException ex) {

                            throw new RuntimeException(
                                    ex
                            );
                        }
                    },

                    params.toArray()
            );
        }

        return temp;
    }

    // =========================================================================
    // XLSX
    // =========================================================================

    private File generateXlsxForSnapshot(
            ReportSnapshot snapshot
    ) throws Exception {

        File temp =
                File.createTempFile(
                        "report-xlsx-",
                        ".xlsx"
                );

        try (
                SXSSFWorkbook workbook =
                        new SXSSFWorkbook(
                                100
                        );

                FileOutputStream output =
                        new FileOutputStream(
                                temp
                        )
        ) {

            var sheet =
                    workbook.createSheet(
                            "Report"
                    );

            AtomicInteger rowNumber =
                    new AtomicInteger(
                            0
                    );

            // -----------------------------------------------------------------
            // HEADER
            // -----------------------------------------------------------------

            var header =
                    sheet.createRow(
                            rowNumber.getAndIncrement()
                    );

            String[] columns =
                    new String[]{
                            "election_id",
                            "county_id",
                            "county_name",
                            "district_id",
                            "district_name",
                            "center_id",
                            "center_code",
                            "center_name",
                            "candidate_id",
                            "candidate_name",
                            "party_id",
                            "party_name",
                            "party_code",
                            "candidate_votes",
                            "registered_voters",
                            "ballots_cast",
                            "center_valid_votes",
                            "center_invalid_total"
                    };

            for (
                    int index = 0;
                    index < columns.length;
                    index++
            ) {

                header
                        .createCell(index)
                        .setCellValue(
                                columns[index]
                        );
            }

            // -----------------------------------------------------------------
            // QUERY
            // -----------------------------------------------------------------

            StringBuilder sql =
                    new StringBuilder(
                            """
                            SELECT
                                election_id,
                                county_id,
                                county_name,
                                district_id,
                                district_name,
                                center_id,
                                center_code,
                                center_name,
                                candidate_id,
                                candidate_name,
                                party_id,
                                party_name,
                                party_code,
                                candidate_votes,
                                registered_voters,
                                ballots_cast,
                                center_valid_votes,
                                center_invalid_total
                            FROM v_candidate_center_stats_official
                            WHERE election_id = ?
                            """
                    );

            List<Object> params =
                    new ArrayList<>();

            params.add(
                    snapshot.getElectionId()
            );

            appendSnapshotFilters(
                    sql,
                    params,
                    snapshot
            );

            sql.append(
                    """
                    
                    ORDER BY
                        county_name,
                        district_name,
                        center_code,
                        candidate_name
                    """
            );

            jdbc.query(
                    sql.toString(),

                    rs -> {

                        var row =
                                sheet.createRow(
                                        rowNumber.getAndIncrement()
                                );

                        int column =
                                0;

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "election_id"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "county_id"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        safeString(
                                                rs.getString(
                                                        "county_name"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "district_id"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        safeString(
                                                rs.getString(
                                                        "district_name"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "center_id"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        safeString(
                                                rs.getString(
                                                        "center_code"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        safeString(
                                                rs.getString(
                                                        "center_name"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "candidate_id"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        safeString(
                                                rs.getString(
                                                        "candidate_name"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "party_id"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        safeString(
                                                rs.getString(
                                                        "party_name"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        safeString(
                                                rs.getString(
                                                        "party_code"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "candidate_votes"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "registered_voters"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "ballots_cast"
                                                )
                                        )
                                );

                        row.createCell(
                                        column++
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "center_valid_votes"
                                                )
                                        )
                                );

                        row.createCell(
                                        column
                                )
                                .setCellValue(
                                        stringOf(
                                                rs.getObject(
                                                        "center_invalid_total"
                                                )
                                        )
                                );
                    },

                    params.toArray()
            );

            workbook.write(
                    output
            );

            workbook.dispose();
        }

        return temp;
    }

    // =========================================================================
    // PDF TOTALS
    // =========================================================================

    /**
     * IMPORTANT:
     *
     * v_candidate_center_stats_official contains one candidate row per center.
     *
     * Therefore center-level values such as:
     *
     * - registered_voters
     * - ballots_cast
     * - center_valid_votes
     * - center_invalid_total
     *
     * may appear repeatedly across candidate rows.
     *
     * Summing those columns directly would over-count totals.
     *
     * The inner query first reduces the result to one row per center.
     */
    private Map<String, Object> computeTotals(
            ReportSnapshot snapshot
    ) {

        StringBuilder inner =
                new StringBuilder(
                        """
                        SELECT
                            center_id,
                            MAX(registered_voters) AS registered_voters,
                            MAX(ballots_cast) AS ballots_cast,
                            MAX(center_valid_votes) AS center_valid_votes,
                            MAX(center_invalid_total) AS center_invalid_total
                        FROM v_candidate_center_stats_official
                        WHERE election_id = ?
                        """
                );

        List<Object> params =
                new ArrayList<>();

        params.add(
                snapshot.getElectionId()
        );

        appendSnapshotFilters(
                inner,
                params,
                snapshot
        );

        inner.append(
                """
                
                GROUP BY center_id
                """
        );

        String sql =
                """
                SELECT
                    COALESCE(SUM(registered_voters), 0) AS registered_voters,
                    COALESCE(SUM(ballots_cast), 0) AS ballots_cast,
                    COALESCE(SUM(center_valid_votes), 0) AS total_valid_votes,
                    COALESCE(SUM(center_invalid_total), 0) AS total_invalid_votes
                FROM (
                """
                        + inner
                        + """
                        
                        ) scoped_centers
                        """;

        Map<String, Object> result =
                jdbc.queryForMap(
                        sql,
                        params.toArray()
                );

        Map<String, Object> output =
                new HashMap<>();

        long registeredVoters =
                numberAsLong(
                        result.get(
                                "registered_voters"
                        )
                );

        long ballotsCast =
                numberAsLong(
                        result.get(
                                "ballots_cast"
                        )
                );

        long validVotes =
                numberAsLong(
                        result.get(
                                "total_valid_votes"
                        )
                );

        long invalidVotes =
                numberAsLong(
                        result.get(
                                "total_invalid_votes"
                        )
                );

        output.put(
                "registeredVoters",
                registeredVoters
        );

        output.put(
                "ballotsCast",
                ballotsCast
        );

        output.put(
                "totalValidVotes",
                validVotes
        );

        output.put(
                "totalInvalidVotes",
                invalidVotes
        );

        double turnoutPct =
                registeredVoters <= 0
                        ? 0.0
                        : (
                        ballotsCast
                                * 100.0
                                / registeredVoters
                );

        output.put(
                "turnoutPct",
                String.format(
                        Locale.ROOT,
                        "%.2f",
                        turnoutPct
                )
        );

        return output;
    }

    // =========================================================================
    // PDF TOP CANDIDATES
    // =========================================================================

    private List<Map<String, Object>> computeTopCandidates(
            ReportSnapshot snapshot,
            int topN
    ) {

        int safeTopN =
                Math.max(
                        1,
                        topN
                );

        StringBuilder sql =
                new StringBuilder(
                        """
                        SELECT
                            candidate_id,
                            candidate_name,
                            party_id,
                            party_name,
                            SUM(candidate_votes) AS candidate_votes
                        FROM v_candidate_center_stats_official
                        WHERE election_id = ?
                        """
                );

        List<Object> params =
                new ArrayList<>();

        params.add(
                snapshot.getElectionId()
        );

        appendSnapshotFilters(
                sql,
                params,
                snapshot
        );

        sql.append(
                """
                
                GROUP BY
                    candidate_id,
                    candidate_name,
                    party_id,
                    party_name

                ORDER BY
                    SUM(candidate_votes) DESC

                LIMIT ?
                """
        );

        params.add(
                safeTopN
        );

        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        sql.toString(),
                        params.toArray()
                );

        /*
         * Vote-share denominator.
         *
         * Use valid votes from the exact same snapshot boundary.
         */
        long totalValidVotes =
                computeTotalValidVotes(
                        snapshot
                );

        for (
                Map<String, Object> row :
                rows
        ) {

            long candidateVotes =
                    numberAsLong(
                            row.get(
                                    "candidate_votes"
                            )
                    );

            double percentage =
                    totalValidVotes <= 0
                            ? 0.0
                            : candidateVotes
                            * 100.0
                            / totalValidVotes;

            row.put(
                    "voteSharePct",
                    String.format(
                            Locale.ROOT,
                            "%.2f",
                            percentage
                    )
            );
        }

        return rows;
    }

    // =========================================================================
    // TOTAL VALID VOTES
    // =========================================================================

    private long computeTotalValidVotes(
            ReportSnapshot snapshot
    ) {

        StringBuilder inner =
                new StringBuilder(
                        """
                        SELECT
                            center_id,
                            MAX(center_valid_votes) AS center_valid_votes
                        FROM v_candidate_center_stats_official
                        WHERE election_id = ?
                        """
                );

        List<Object> params =
                new ArrayList<>();

        params.add(
                snapshot.getElectionId()
        );

        appendSnapshotFilters(
                inner,
                params,
                snapshot
        );

        inner.append(
                """
                
                GROUP BY center_id
                """
        );

        String sql =
                """
                SELECT
                    COALESCE(
                        SUM(center_valid_votes),
                        0
                    )
                FROM (
                """
                        + inner
                        + """
                        
                        ) scoped_centers
                        """;

        Number result =
                jdbc.queryForObject(
                        sql,
                        Number.class,
                        params.toArray()
                );

        return result == null
                ? 0L
                : result.longValue();
    }

    // =========================================================================
    // PDF SAMPLE ROWS
    // =========================================================================

    private List<Map<String, Object>> computeSampleRows(
            ReportSnapshot snapshot,
            int limit
    ) {

        int safeLimit =
                Math.max(
                        1,
                        limit
                );

        StringBuilder sql =
                new StringBuilder(
                        """
                        SELECT
                            county_name,
                            district_name,
                            center_name,
                            candidate_name,
                            party_name,
                            candidate_votes,
                            center_valid_votes,
                            ballots_cast
                        FROM v_candidate_center_stats_official
                        WHERE election_id = ?
                        """
                );

        List<Object> params =
                new ArrayList<>();

        params.add(
                snapshot.getElectionId()
        );

        appendSnapshotFilters(
                sql,
                params,
                snapshot
        );

        sql.append(
                """
                
                ORDER BY
                    county_name,
                    district_name,
                    center_name,
                    candidate_name

                LIMIT ?
                """
        );

        params.add(
                safeLimit
        );

        return jdbc.queryForList(
                sql.toString(),
                params.toArray()
        );
    }

    // =========================================================================
    // SNAPSHOT FILTERS
    // =========================================================================

    /**
     * This is the single authoritative query-filter builder for generated
     * report contents.
     *
     * Every generated artifact and PDF helper uses this method.
     *
     * This prevents:
     *
     * CSV having one scope,
     * XLSX having another scope,
     * PDF summary having a broader scope.
     */
    private void appendSnapshotFilters(
            StringBuilder sql,
            List<Object> params,
            ReportSnapshot snapshot
    ) {

        // --------------------------------------------------------------------
        // COUNTY
        // --------------------------------------------------------------------

        if (snapshot.getCountyId() != null) {

            sql.append(
                    " AND county_id = ?"
            );

            params.add(
                    snapshot.getCountyId()
            );
        }

        // --------------------------------------------------------------------
        // DISTRICT
        // --------------------------------------------------------------------

        if (snapshot.getDistrictId() != null) {

            sql.append(
                    " AND district_id = ?"
            );

            params.add(
                    snapshot.getDistrictId()
            );
        }

        // --------------------------------------------------------------------
        // CENTER
        // --------------------------------------------------------------------

        if (snapshot.getCenterId() != null) {

            sql.append(
                    " AND center_id = ?"
            );

            params.add(
                    snapshot.getCenterId()
            );
        }

        // --------------------------------------------------------------------
        // CANDIDATE
        // --------------------------------------------------------------------

        if (snapshot.getCandidateId() != null) {

            sql.append(
                    " AND candidate_id = ?"
            );

            params.add(
                    snapshot.getCandidateId()
            );
        }

        // --------------------------------------------------------------------
        // PARTY
        // --------------------------------------------------------------------

        if (snapshot.getPartyId() != null) {

            sql.append(
                    " AND party_id = ?"
            );

            params.add(
                    snapshot.getPartyId()
            );
        }
    }

    // =========================================================================
    // PDF CHART
    // =========================================================================

    private byte[] generateTopCandidatesChart(
            List<Map<String, Object>> rows
    ) throws IOException {

        if (
                rows == null
                        || rows.isEmpty()
        ) {

            BufferedImage image =
                    new BufferedImage(
                            1,
                            1,
                            BufferedImage.TYPE_INT_ARGB
                    );

            ByteArrayOutputStream output =
                    new ByteArrayOutputStream();

            javax.imageio.ImageIO.write(
                    image,
                    "png",
                    output
            );

            return output.toByteArray();
        }

        List<String> names =
                rows
                        .stream()
                        .map(row ->
                                safeString(
                                        row.get(
                                                "candidate_name"
                                        )
                                )
                        )
                        .collect(
                                Collectors.toList()
                        );

        List<Number> votes =
                rows
                        .stream()
                        .map(row -> {

                            Object value =
                                    row.get(
                                            "candidate_votes"
                                    );

                            if (value instanceof Number number) {
                                return number;
                            }

                            return 0L;
                        })
                        .collect(
                                Collectors.toList()
                        );

        CategoryChart chart =
                new CategoryChartBuilder()
                        .width(
                                600
                        )
                        .height(
                                300
                        )
                        .title(
                                "Top Candidates"
                        )
                        .xAxisTitle(
                                "Candidate"
                        )
                        .yAxisTitle(
                                "Votes"
                        )
                        .build();

        chart.addSeries(
                "Votes",
                names,
                votes
        );

        ByteArrayOutputStream output =
                new ByteArrayOutputStream();

        BitmapEncoder.saveBitmap(
                chart,
                output,
                BitmapEncoder.BitmapFormat.PNG
        );

        return output.toByteArray();
    }

    // =========================================================================
    // PDF SUBTITLE
    // =========================================================================

    private String buildReportSubtitle(
            ReportSnapshot snapshot
    ) {

        List<String> parts =
                new ArrayList<>();

        if (snapshot.getCenterId() != null) {

            parts.add(
                    "Center-level report"
            );

        } else if (snapshot.getDistrictId() != null) {

            parts.add(
                    "District-level report"
            );

        } else if (snapshot.getCountyId() != null) {

            parts.add(
                    "County-level report"
            );

        } else {

            parts.add(
                    "Election-wide report"
            );
        }

        if (snapshot.getCandidateId() != null) {

            parts.add(
                    "Candidate filtered"
            );
        }

        if (snapshot.getPartyId() != null) {

            parts.add(
                    "Party filtered"
            );
        }

        return String.join(
                " • ",
                parts
        );
    }

    // =========================================================================
    // FORMAT
    // =========================================================================

    private String normalizeFormat(
            String value
    ) {

        if (
                value == null
                        || value.isBlank()
        ) {

            return "CSV";
        }

        return value
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private long numberAsLong(
            Object value
    ) {

        if (value instanceof Number number) {
            return number.longValue();
        }

        if (value == null) {
            return 0L;
        }

        try {

            return Long.parseLong(
                    String.valueOf(
                            value
                    )
            );

        } catch (Exception ignored) {

            return 0L;
        }
    }

    private String stringOf(
            Object value
    ) {

        return value == null
                ? ""
                : String.valueOf(
                value
        );
    }

    private String safeString(
            Object value
    ) {

        return value == null
                ? ""
                : String.valueOf(
                value
        );
    }

    private String safeErrorMessage(
            Exception ex
    ) {

        if (ex == null) {
            return "Report generation failed";
        }

        String message =
                ex.getMessage();

        if (
                message == null
                        || message.isBlank()
        ) {

            return "Report generation failed";
        }

        /*
         * Avoid storing an arbitrarily large exception message in the report
         * status field.
         */
        if (message.length() > 1000) {

            return message.substring(
                    0,
                    1000
            );
        }

        return message;
    }

    private void deleteQuietly(
            File file
    ) {

        if (
                file == null
                        || !file.exists()
        ) {
            return;
        }

        try {

            file.delete();

        } catch (Exception ignored) {
        }
    }
}