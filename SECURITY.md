# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| v0.1.x  | Yes       |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in RunwayCtrl, please report it responsibly:

1. **Email:** Send details to [security@runwayctrl.com](mailto:security@runwayctrl.com) (or open a [GitHub Security Advisory][ghsa] on this repository)
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if you have one)
3. **Response timeline:**
   - Acknowledgment within **48 hours**
   - Initial assessment within **5 business days**
   - Fix timeline communicated within **10 business days**

---

## Security Design Principles

RunwayCtrl is built with security as a foundational concern:

### Data Minimization

- Sensitive systems should store the minimum necessary metadata for safety and auditing.
- Payload capture should require explicit opt-in and careful review.
- Detailed rationale and threat-model notes are maintained in private design documentation.

### Tenant Isolation

- Strong tenant isolation is a core requirement.
- Defense-in-depth measures are recommended where applicable.
- Detailed design documentation is maintained privately.

### Credential Handling

- Secrets should be stored as hashed values where possible and never logged.
- Privilege separation should minimize the blast radius of credential compromise.

### Telemetry Safety

- Telemetry should avoid PII/secrets by default.
- Emitted attributes should be explicitly reviewed and constrained.

### Abuse Prevention

- Per-tenant and per-IP rate limiting
- Request size and time limits
- Circuit breakers prevent cascading failures
- Kill-switch surface: disable tenant or tool immediately

---

## Dependency Management

- Dependencies are monitored via Dependabot/Renovate
- Critical security updates are applied within 48 hours
- CodeQL (SAST) runs on every PR

---

## Security Controls Checklist (v0.1)

Detailed security requirements checklists and runbooks are maintained privately.

Key controls that must exist (not just be documented):

- [ ] Per-tenant auth with hashed key storage and immediate revocation
- [ ] Per-tenant and per-IP rate limiting
- [ ] Append-only audit log for sensitive operations
- [ ] Enforced retention/deletion jobs
- [ ] Request size and time limits
- [ ] Kill-switch surface (disable tenant/tool)
- [ ] No secrets in logs or telemetry

[ghsa]: https://github.com/RunwayCtrl/RunwayCtrl/security/advisories/new
