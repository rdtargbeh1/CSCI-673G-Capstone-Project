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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.knowm.xchart.BitmapEncoder;
import org.knowm.xchart.CategoryChart;
import org.knowm.xchart.CategoryChartBuilder;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Report generator: creates CSV (canonical), optionally XLSX and PDF summary.
 *
 * Notes:
 * - For large exports: stream directly to object storage using multipart upload (not implemented here).
 * - For PDF: generate CSV first, compute aggregates and top-N, render Thymeleaf template, convert to PDF.
 */
@Service
@RequiredArgsConstructor
public class ReportGeneratorServiceImplementation implements ReportGeneratorService {

    private final ReportSnapshotRepository snapshotRepo;
    private final ReportFileRepository fileRepo;
    private final JdbcTemplate jdbc;
    private final ReportStorageService storage;
    private final TenantGucService tenantGucService;
    private final TemplateEngine templateEngine;

    @Value("${reports.pdf.topN:10}")
    private int pdfTopN;

    @Value("${reports.pdf.sampleSize:20}")
    private int pdfSampleSize;

    @Value("${reports.s3.presign.ttl:86400}")
    private long presignTtl;

    @Override
    @Async("reportTaskExecutor")
    @Transactional
    public void generate(UUID snapshotId) {
        ReportSnapshot s = snapshotRepo.findById(snapshotId).orElse(null);
        if (s == null) return;

        s.setStatus("RUNNING");
        snapshotRepo.save(s);

        // apply tenant GUC if required by your RLS
        if (s.getOrgId() != null) tenantGucService.applyForTransaction(s.getOrgId(), false, false);
        else tenantGucService.applyForTransaction((java.util.UUID) null, false, false);

        try {
            // Generate CSV canonical artifact
            File csvFile = generateCsvForSnapshot(s);
            String csvUri = storage.store(csvFile, "report-" + s.getSnapshotId() + ".csv");
            persistReportFile(s, "CSV", csvFile.length(), csvUri);

            String fmt = s.getRequestedFormat() == null ? "CSV" : s.getRequestedFormat().toUpperCase(Locale.ROOT);

            if ("CSV".equals(fmt)) {
                s.setStatus("COMPLETED");
                s.setStatusMessage("CSV generated");
                snapshotRepo.save(s);
                csvFile.delete();
                return;
            }

            if ("XLSX".equals(fmt)) {
                File xlsx = generateXlsxForSnapshot(s);
                String xlsxUri = storage.store(xlsx, "report-" + s.getSnapshotId() + ".xlsx");
                persistReportFile(s, "XLSX", xlsx.length(), xlsxUri);
                s.setStatus("COMPLETED");
                s.setStatusMessage("XLSX generated");
                snapshotRepo.save(s);
                csvFile.delete();
                xlsx.delete();
                return;
            }

            if ("PDF".equals(fmt)) {
                Map<String, Object> totals = computeTotals(s);
                List<Map<String, Object>> topCandidates = computeTopCandidates(s, pdfTopN);
                List<Map<String,Object>> sampleRows = computeSampleRows(s, pdfSampleSize);

                byte[] chartPng = generateTopCandidatesChart(topCandidates);

                String csvPresigned = null;
                try {
                    csvPresigned = storage.presign(csvUri, presignTtl);
                } catch (Exception e) {
                    csvPresigned = csvUri;
                }

                Context ctx = new Context();
                ctx.setVariable("reportTitle", "Election Results Summary");
                ctx.setVariable("subtitle", "");
                ctx.setVariable("snapshotId", s.getSnapshotId().toString());
                ctx.setVariable("requestedBy", s.getRequestedBy());
                ctx.setVariable("requestedAt", s.getRequestedAt());
                ctx.setVariable("totals", totals);
                ctx.setVariable("topCandidates", topCandidates);
                ctx.setVariable("sampleRows", sampleRows);
                String chartDataUri = "data:image/png;base64," + Base64.getEncoder().encodeToString(chartPng);
                ctx.setVariable("chartDataUri", chartDataUri);
                ctx.setVariable("logoDataUri", null);
                ctx.setVariable("downloadUrl", csvPresigned);
                ctx.setVariable("generatedAt", OffsetDateTime.now().toString());

                String html = templateEngine.process("report-summary", ctx);
                File pdfTmp = File.createTempFile("report-", ".pdf");
                try (FileOutputStream os = new FileOutputStream(pdfTmp)) {
                    ITextRenderer renderer = new ITextRenderer();
                    renderer.setDocumentFromString(html);
                    renderer.layout();
                    renderer.createPDF(os);
                }

                String pdfUri = storage.store(pdfTmp, "report-" + s.getSnapshotId() + ".pdf");
                persistReportFile(s, "PDF", pdfTmp.length(), pdfUri);

                s.setStatus("COMPLETED");
                s.setStatusMessage("PDF summary generated");
                snapshotRepo.save(s);

                csvFile.delete();
                pdfTmp.delete();
                return;
            }

            // fallback
            s.setStatus("COMPLETED");
            s.setStatusMessage("CSV generated");
            snapshotRepo.save(s);
            csvFile.delete();
        } catch (Exception ex) {
            s.setStatus("FAILED");
            s.setStatusMessage(ex.getMessage());
            snapshotRepo.save(s);
        }
    }

    private void persistReportFile(ReportSnapshot s, String format, long size, String uri) {
        ReportFile f = new ReportFile();
        f.setFileId(UUID.randomUUID());
        f.setSnapshotId(s.getSnapshotId());
        f.setFormat(format);
        f.setFileSize(size);
        f.setStorageUri(uri);
        f.setStatus("READY");
        f.setGeneratedAt(OffsetDateTime.now());
        fileRepo.save(f);
    }

    private File generateCsvForSnapshot(ReportSnapshot s) throws Exception {
        File tmp = File.createTempFile("report-csv-", ".csv");
        try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(tmp), StandardCharsets.UTF_8));
             CSVPrinter csv = new CSVPrinter(writer, CSVFormat.DEFAULT.withHeader(
                     "election_id","county_id","county_name","district_id","district_name","center_id","center_code","center_name",
                     "candidate_id","candidate_name","party_id","party_name","party_code","candidate_votes","registered_voters",
                     "ballots_cast","center_valid_votes","center_invalid_total"
             ))) {

            StringBuilder sql = new StringBuilder();
            sql.append("SELECT election_id, county_id, county_name, district_id, district_name, center_id, center_code, center_name, candidate_id, " +
                    "candidate_name, party_id, party_name, party_code, candidate_votes, registered_voters, ballots_cast, center_valid_votes, " +
                    "center_invalid_total FROM v_candidate_center_stats_official WHERE election_id = ?");

            if (s.getCountyId() != null) sql.append(" AND county_id = '").append(s.getCountyId()).append("'");
            if (s.getDistrictId() != null) sql.append(" AND district_id = '").append(s.getDistrictId()).append("'");
            if (s.getCenterId() != null) sql.append(" AND center_id = '").append(s.getCenterId()).append("'");
            if (s.getCandidateId() != null) sql.append(" AND candidate_id = '").append(s.getCandidateId()).append("'");
            sql.append(" ORDER BY county_name, district_name, center_code, candidate_name");

            jdbc.query(sql.toString(), new Object[]{s.getElectionId()}, rs -> {
                try {
                    csv.printRecord(
                            rs.getObject("election_id"),
                            rs.getObject("county_id"),
                            rs.getString("county_name"),
                            rs.getObject("district_id"),
                            rs.getString("district_name"),
                            rs.getObject("center_id"),
                            rs.getString("center_code"),
                            rs.getString("center_name"),
                            rs.getObject("candidate_id"),
                            rs.getString("candidate_name"),
                            rs.getObject("party_id"),
                            rs.getString("party_name"),
                            rs.getString("party_code"),
                            rs.getObject("candidate_votes"),
                            rs.getObject("registered_voters"),
                            rs.getObject("ballots_cast"),
                            rs.getObject("center_valid_votes"),
                            rs.getObject("center_invalid_total")
                    );
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });
        }
        return tmp;
    }

    private File generateXlsxForSnapshot(ReportSnapshot s) throws Exception {

        File tmp = File.createTempFile("report-xlsx-", ".xlsx");
        try (SXSSFWorkbook wb = new SXSSFWorkbook(100); FileOutputStream fos = new FileOutputStream(tmp)) {
            var sheet = wb.createSheet("Report");
            AtomicInteger rowNum = new AtomicInteger(0);

            var header = sheet.createRow(rowNum.getAndIncrement());
            String[] cols = new String[] {"election_id","county_id","county_name","district_id","district_name","center_id",
                    "center_code","center_name","candidate_id","candidate_name","party_id","party_name","party_code","candidate_votes",
                    "registered_voters","ballots_cast","center_valid_votes","center_invalid_total"};
            for (int i = 0; i < cols.length; i++) header.createCell(i).setCellValue(cols[i]);

            StringBuilder sql = new StringBuilder();
            sql.append("SELECT election_id, county_id, county_name, district_id, district_name, center_id, center_code, center_name, " +
                    "candidate_id, candidate_name, party_id, party_name, party_code, candidate_votes, registered_voters, ballots_cast, center_valid_votes, " +
                    "center_invalid_total FROM v_candidate_center_stats_official WHERE election_id = ?");

            if (s.getCountyId() != null) sql.append(" AND county_id = '").append(s.getCountyId()).append("'");
            if (s.getDistrictId() != null) sql.append(" AND district_id = '").append(s.getDistrictId()).append("'");
            if (s.getCenterId() != null) sql.append(" AND center_id = '").append(s.getCenterId()).append("'");
            if (s.getCandidateId() != null) sql.append(" AND candidate_id = '").append(s.getCandidateId()).append("'");
            sql.append(" ORDER BY county_name, district_name, center_code, candidate_name");



            jdbc.query(sql.toString(), new Object[]{s.getElectionId()}, rs -> {
                var row = sheet.createRow(rowNum.getAndIncrement());

                int c = 0;
                row.createCell(c++).setCellValue(stringOf(rs.getObject("election_id")));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("county_id")));
                row.createCell(c++).setCellValue(rs.getString("county_name"));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("district_id")));
                row.createCell(c++).setCellValue(rs.getString("district_name"));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("center_id")));
                row.createCell(c++).setCellValue(rs.getString("center_code"));
                row.createCell(c++).setCellValue(rs.getString("center_name"));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("candidate_id")));
                row.createCell(c++).setCellValue(rs.getString("candidate_name"));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("party_id")));
                row.createCell(c++).setCellValue(rs.getString("party_name"));
                row.createCell(c++).setCellValue(rs.getString("party_code"));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("candidate_votes")));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("registered_voters")));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("ballots_cast")));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("center_valid_votes")));
                row.createCell(c++).setCellValue(stringOf(rs.getObject("center_invalid_total")));
            });

            wb.write(fos);
            wb.dispose();
        }
        return tmp;
    }

    private Map<String,Object> computeTotals(ReportSnapshot s) {
        String sql = "SELECT SUM(ballots_cast) AS ballots_cast, SUM(center_valid_votes) AS total_valid_votes, SUM(center_invalid_total) " +
                "AS total_invalid_votes FROM v_candidate_center_stats_official WHERE election_id = ?";
        if (s.getCountyId() != null) sql += " AND county_id = '" + s.getCountyId() + "'";
        Map<String, Object> r = jdbc.queryForMap(sql, s.getElectionId());
        Map<String, Object> out = new HashMap<>();
        out.put("ballotsCast", r.get("ballots_cast"));
        out.put("totalValidVotes", r.get("total_valid_votes"));
        out.put("totalInvalidVotes", r.get("total_invalid_votes"));
        double turnoutPct = 0.0;
        try {
            long cast = r.get("ballots_cast") == null ? 0L : ((Number) r.get("ballots_cast")).longValue();
            long valid = r.get("total_valid_votes") == null ? 0L : ((Number) r.get("total_valid_votes")).longValue();
            turnoutPct = cast == 0 ? 0.0 : (valid * 100.0 / cast);
        } catch (Exception ignored) {}
        out.put("turnoutPct", String.format("%.2f", turnoutPct));
        return out;
    }

    private List<Map<String,Object>> computeTopCandidates(ReportSnapshot s, int topN) {
        String sql = "SELECT candidate_id, candidate_name, party_name, SUM(candidate_votes) AS candidate_votes, " +
                "SUM(center_valid_votes) AS total_valid FROM v_candidate_center_stats_official WHERE election_id = ?";

        if (s.getCountyId() != null) sql += " AND county_id = '" + s.getCountyId() + "'";
        sql += " GROUP BY candidate_id, candidate_name, party_name ORDER BY SUM(candidate_votes) DESC LIMIT " + topN;
        List<Map<String,Object>> rows = jdbc.queryForList(sql, s.getElectionId());
        long totalValid = rows.stream().mapToLong(r -> r.get("total_valid") == null ? 0L : ((Number) r.get("total_valid")).longValue()).sum();
        if (totalValid == 0) totalValid = 1;
        for (Map<String,Object> r : rows) {
            long v = r.get("candidate_votes") == null ? 0L : ((Number) r.get("candidate_votes")).longValue();
            r.put("voteSharePct", String.format("%.2f", (v * 100.0 / totalValid)));
        }
        return rows;
    }

    private List<Map<String,Object>> computeSampleRows(ReportSnapshot s, int limit) {
        String sql = "SELECT center_name, candidate_name, candidate_votes, center_valid_votes, ballots_cast FROM v_candidate_center_stats_official WHERE election_id = ?";
        if (s.getCountyId() != null) sql += " AND county_id = '" + s.getCountyId() + "'";
        sql += " ORDER BY center_name, candidate_name LIMIT " + limit;
        return jdbc.queryForList(sql, s.getElectionId());
    }

    private byte[] generateTopCandidatesChart(List<Map<String,Object>> rows) throws IOException {
        if (rows == null || rows.isEmpty()) {
            BufferedImage img = new BufferedImage(1,1,BufferedImage.TYPE_INT_ARGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            javax.imageio.ImageIO.write(img, "png", baos);
            return baos.toByteArray();
        }
        List<String> names = rows.stream().map(r -> (String) r.get("candidate_name")).collect(Collectors.toList());
        List<Number> values = rows.stream().map(r -> ((Number) r.get("candidate_votes"))).collect(Collectors.toList());
        CategoryChart chart = new CategoryChartBuilder().width(600).height(300).title("Top Candidates").xAxisTitle("Candidate").yAxisTitle("Votes").build();
        chart.addSeries("Votes", names, values);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        BitmapEncoder.saveBitmap(chart, baos, BitmapEncoder.BitmapFormat.PNG);
        return baos.toByteArray();
    }

    private String stringOf(Object o) {
        return o == null ? "" : String.valueOf(o);
    }
}
