# Security Policy

## Supported Versions

We release security patches for the latest minor version only.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < latest | :x:               |

We recommend always updating to the latest version.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please report it privately:

1. Go to the [Security Advisories](https://github.com/DDEV-Manager/ddev-manager/security/advisories) page
2. Click "Report a vulnerability"
3. Provide a detailed description of the vulnerability

Alternatively, you can email the maintainers directly (check the repository for contact information).

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### What to expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Updates**: We will keep you informed of our progress
- **Resolution**: We aim to resolve critical issues within 7 days
- **Credit**: We will credit you in the release notes (unless you prefer to remain anonymous)

## Scope

Security issues we are interested in:

- Remote code execution
- Privilege escalation
- Data exposure or leakage
- Authentication/authorization bypasses
- Command injection vulnerabilities

### Out of scope

- Issues in DDEV itself (report to [DDEV's security policy](https://github.com/ddev/ddev/security))
- Issues in Docker or container infrastructure
- Social engineering attacks
- Physical attacks
- Denial of service attacks

## Security Best Practices

When using DDEV Manager:

- Keep DDEV Manager updated to the latest version
- Keep DDEV updated to the latest version
- Be cautious when installing third-party add-ons
- Review project configurations before importing from untrusted sources
