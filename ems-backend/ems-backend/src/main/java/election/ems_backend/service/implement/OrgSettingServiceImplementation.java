package election.ems_backend.service.implement;

import election.ems_backend.dto.OrgSettingDto;
import election.ems_backend.entity.OrgSetting;
import election.ems_backend.entity.Organization;
import election.ems_backend.repository.OrgSettingRepository;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.service.OrgSettingService;
import election.ems_backend.utility.OrgSettingDefaults;
import election.ems_backend.utility.OrgSettingKeys;
import election.ems_backend.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service                      // <-- critical so Spring creates the bean
@RequiredArgsConstructor
@Transactional
public class OrgSettingServiceImplementation implements OrgSettingService {

    @Autowired
    private OrganizationRepository organizationRepository;
    @Autowired
    private OrgSettingRepository orgSettingRepository;


    @Override
    @Transactional(readOnly = true)
    public OrgSettingDto getForCurrentTenant() {
        UUID orgId = requireTenant();
        OrgSetting s = orgSettingRepository.findById(orgId)
                .orElseGet(() -> buildTransientDefault(orgId)); // no DB write here
        return toDtoWithDefaults(s);
    }

    @Override
    public OrgSettingDto updateForCurrentTenant(Map<String, Object> patch) {
        UUID orgId = requireTenant();
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found"));

        OrgSetting s = orgSettingRepository.findById(orgId).orElseGet(() -> {
            OrgSetting ns = new OrgSetting();
            ns.setOrganization(org); // MapsId will align PK
            return ns;
        });

        // validate & normalize
        Map<String,Object> cleaned = validatePatch(patch);

        // merge & save
        s.merge(cleaned); // nulls removed inside merge()
        OrgSetting saved = orgSettingRepository.save(s);

        // optional: audit_log here

        return toDtoWithDefaults(saved);
    }

    /* ---------- helpers ---------- */

    private UUID requireTenant() {
        TenantContext ctx = TenantContext.get();
        UUID orgId = (ctx != null && ctx.orgId().isPresent()) ? ctx.orgId().get() : null;
        if (orgId == null) throw new IllegalStateException("X-Org-Id is required");
        return orgId;
    }


    private OrgSetting buildTransientDefault(UUID orgId) {
        OrgSetting s = new OrgSetting();
        s.setOrgId(orgId); // not persisted
        s.setSettings(new HashMap<>());
        return s;
    }

    private OrgSettingDto toDtoWithDefaults(OrgSetting s) {
        Map<String,Object> eff = new HashMap<>(s.getSettings());

        eff.putIfAbsent(OrgSettingKeys.RATE_LIMIT_PER_MIN, OrgSettingDefaults.DEFAULT_RATE_LIMIT_PER_MIN);
        eff.putIfAbsent(OrgSettingKeys.SHOW_OFFICIAL,      OrgSettingDefaults.DEFAULT_SHOW_OFFICIAL);
        eff.putIfAbsent(OrgSettingKeys.LOCKOUT_THRESHOLD,  OrgSettingDefaults.DEFAULT_LOCKOUT_THRESHOLD);
        eff.putIfAbsent(OrgSettingKeys.LOCKOUT_MINUTES,    OrgSettingDefaults.DEFAULT_LOCKOUT_MINUTES);

        OrgSettingDto dto = new OrgSettingDto();
        dto.setOrgId(s.getOrgId());
        dto.setSettings(eff);
        return dto;
    }

    /** Accept only known keys; coerce types and enforce ranges. */
    private Map<String,Object> validatePatch(Map<String,Object> patch) {
        if (patch == null) return Map.of();
        Map<String,Object> out = new HashMap<>();

        if (patch.containsKey(OrgSettingKeys.RATE_LIMIT_PER_MIN)) {
            Integer v = toIntOrNull(patch.get(OrgSettingKeys.RATE_LIMIT_PER_MIN));
            if (v != null && v >= 60 && v <= 10_000) out.put(OrgSettingKeys.RATE_LIMIT_PER_MIN, v);
            else if (v == null) out.put(OrgSettingKeys.RATE_LIMIT_PER_MIN, null); // remove
            else throw new IllegalArgumentException("rate_limit_per_min out of range [60..10000]");
        }

        if (patch.containsKey(OrgSettingKeys.SHOW_OFFICIAL)) {
            Boolean v = toBoolOrNull(patch.get(OrgSettingKeys.SHOW_OFFICIAL));
            out.put(OrgSettingKeys.SHOW_OFFICIAL, v); // null removes key
        }

        if (patch.containsKey(OrgSettingKeys.LOCKOUT_THRESHOLD)) {
            Integer v = toIntOrNull(patch.get(OrgSettingKeys.LOCKOUT_THRESHOLD));
            if (v != null && v >= 1 && v <= 20) out.put(OrgSettingKeys.LOCKOUT_THRESHOLD, v);
            else if (v == null) out.put(OrgSettingKeys.LOCKOUT_THRESHOLD, null);
            else throw new IllegalArgumentException("lockout_threshold out of range [1..20]");
        }

        if (patch.containsKey(OrgSettingKeys.LOCKOUT_MINUTES)) {
            Integer v = toIntOrNull(patch.get(OrgSettingKeys.LOCKOUT_MINUTES));
            if (v != null && v >= 5 && v <= 240) out.put(OrgSettingKeys.LOCKOUT_MINUTES, v);
            else if (v == null) out.put(OrgSettingKeys.LOCKOUT_MINUTES, null);
            else throw new IllegalArgumentException("lockout_minutes out of range [5..240]");
        }

        return out;
    }

    private Integer toIntOrNull(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        if (o instanceof String s && !s.isBlank()) return Integer.parseInt(s.trim());
        throw new IllegalArgumentException("Expected integer");
    }
    private Boolean toBoolOrNull(Object o) {
        if (o == null) return null;
        if (o instanceof Boolean b) return b;
        if (o instanceof String s) return Boolean.parseBoolean(s.trim());
        throw new IllegalArgumentException("Expected boolean");
    }
}