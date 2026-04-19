# VendHub OS Security Policy

## Vulnerability Disclosure

We take security seriously and appreciate responsible disclosure of security vulnerabilities. If you discover a security vulnerability in VendHub OS, please report it to us privately.

### Reporting a Vulnerability

**Email:** jamshidsmac@gmail.com

When reporting a vulnerability, please include:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes (if available)
- Your contact information

Please do not publicly disclose the vulnerability until we have had the opportunity to address it.

## Vulnerability Handling Process

1. **Triage (within 48 hours)**
   - We acknowledge receipt of your report
   - We assess the severity and validity of the vulnerability
   - We determine the affected components and versions

2. **Investigation & Fix (within 7 days for critical)**
   - Critical vulnerabilities: Fix within 7 days
   - High severity: Fix within 14 days
   - Medium severity: Fix within 30 days
   - Low severity: Fix within 60 days

3. **Release & Disclosure**
   - We release a patched version
   - We notify all affected users
   - We provide clear upgrade instructions
   - We update the Security Advisories section

4. **Attribution**
   - Upon request, we will publicly acknowledge your responsible disclosure
   - We respect your preference for anonymity

## Supported Versions

| Version | Supported | Status              |
| ------- | --------- | ------------------- |
| 1.x     | Yes       | Currently supported |
| < 1.x   | No        | End of life         |

Only the current version receives security updates. We recommend upgrading to the latest version promptly.

## Security Features

VendHub OS includes the following security features to protect your data and operations:

### Authentication & Authorization

- **JWT (JSON Web Tokens)**: Secure, stateless authentication mechanism
- **Refresh Tokens**: Automatic token rotation for enhanced security
- **Role-Based Access Control (RBAC)**: Fine-grained permission management

### Multi-Factor Authentication

- **Two-Factor Authentication (2FA)**: Optional second factor verification via OTP
- **Secure Code Transmission**: OTP codes sent via SMS or email
- **Session Validation**: 2FA codes are time-sensitive and single-use

### Payment Webhook Security

- **Payme**: Basic Auth verification per Payme JSON-RPC spec
- **Click**: MD5 signature with `crypto.timingSafeEqual` (constant-time comparison)
- **Uzum Bank**: HMAC-SHA256 signature with `crypto.timingSafeEqual`
- **Pessimistic locks**: All payment state transitions use `pessimistic_write` DB locks
- **Idempotency**: Duplicate webhook calls return existing state without re-processing

### API Security

- **Rate Limiting**: Request throttling to prevent abuse and DoS attacks
- **CORS (Cross-Origin Resource Sharing)**: Strict origin validation
- **Helmet.js**: Security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
- **Request Validation**: Input sanitization and schema validation via class-validator
- **HTTPS Enforcement**: All production traffic is encrypted
- **Telegram Webhooks**: `X-Telegram-Bot-Api-Secret-Token` header with `crypto.timingSafeEqual`

### Data Protection

- **Encryption at Rest**: Database and storage encryption
- **Encryption in Transit**: TLS 1.2+ for all network communications
- **Password Hashing**: Bcrypt with salt for secure password storage
- **Soft Deletes**: Recoverable data deletion with audit trails

### Database Security

- **SQL Injection Prevention**: Parameterized queries using ORM
- **Transaction Integrity**: ACID compliance with PostgreSQL
- **Access Control**: Principle of least privilege for database users
- **Backup & Recovery**: Regular automated backups with retention policy

### Monitoring & Logging

- **Security Logging**: All authentication attempts and permission changes logged
- **Audit Trails**: Complete action history for compliance
- **Error Handling**: Safe error messages without sensitive information leakage
- **Vulnerability Scanning**: Regular security audits and dependency scanning

### Infrastructure Security

- **Network Isolation**: Services run in isolated Docker containers
- **Health Checks**: Automated service monitoring
- **Resource Limits**: CPU and memory constraints prevent resource exhaustion
- **Environment Secrets**: Sensitive configuration managed via environment variables

## Security Best Practices

When deploying and operating VendHub OS:

1. **Environment Configuration**
   - Use strong, randomly generated secrets (minimum 32 characters)
   - Never commit `.env` files with production credentials
   - Rotate secrets regularly
   - Use different secrets for each environment (dev, staging, production)

2. **Dependency Management**
   - Keep dependencies updated
   - Run `pnpm audit` regularly
   - Review security advisories for your dependencies
   - Pin dependency versions for reproducibility

3. **Deployment Security**
   - Enable HTTPS/TLS in production
   - Use strong database passwords
   - Restrict database access to application servers only
   - Enable Redis authentication in production
   - Keep server software and OS patches current

4. **Access Control**
   - Use strong passwords and 2FA
   - Implement principle of least privilege
   - Regularly audit user permissions
   - Remove access promptly when users leave

5. **Monitoring & Incident Response**
   - Monitor logs for suspicious activity
   - Set up alerts for security events
   - Have an incident response plan
   - Keep backups current and tested

## Bug Bounty Program

VendHub OS has a planned bug bounty program to encourage security research and responsible disclosure. Details will be announced soon.

## Security Advisories

Security advisories will be posted here as they are addressed. Check back regularly for updates.

## Dependencies

VendHub OS uses the following critical security libraries:

- **helmet**: Express.js security middleware
- **passport**: Authentication middleware
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT creation and verification
- **express-rate-limit**: API rate limiting
- **typeorm**: ORM with parameterized queries
- **@nestjs/jwt**: NestJS JWT integration

Keep these dependencies updated for the latest security patches.

## Contact

For security questions or concerns (non-vulnerability related), please contact us at:

- Email: jamshidsmac@gmail.com
- Website: https://vendhub.uz

Thank you for helping us keep VendHub OS secure!
