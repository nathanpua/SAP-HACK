# Supabase MCP Security Guide for SAP Analysis Agent

## Overview

This guide covers security considerations and best practices for integrating Supabase MCP with the SAP Analysis Agent in Youtu-agent.

## Security Architecture

### Row Level Security (RLS) Policies

The SAP employee database implements comprehensive RLS policies that automatically filter data access based on user roles and relationships.

#### Employee Data Access Policy

```sql
-- Users can only see their own employee record
CREATE POLICY "employees_select_own" ON employees
    FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

-- Users can update their own employee record
CREATE POLICY "employees_update_own" ON employees
    FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());

-- HR can view all employee records
CREATE POLICY "employees_select_hr" ON employees
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
            AND role IN ('hr', 'admin', 'super_admin')
        )
    );
```

#### Team Data Access Policy

```sql
-- Managers can view their direct reports
CREATE POLICY "employees_select_team" ON employees
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.auth_user_id = auth.uid()
            AND (
                e.id = employees.manager_id OR
                employees.id = e.manager_id OR
                e.current_department_id = employees.current_department_id
            )
        )
    );
```

### MCP Server Security

#### Personal Access Token (PAT) Security

1. **Token Scope**: Use PATs with minimal required permissions
2. **Token Rotation**: Regularly rotate PATs every 30-90 days
3. **Token Storage**: Store tokens securely in environment variables
4. **Token Monitoring**: Monitor token usage and revoke if compromised

#### Project Scoping

```bash
# Limit MCP server to specific project (recommended)
npx @supabase/mcp-server-supabase@latest \
  --access-token $SUPABASE_ACCESS_TOKEN \
  --project-ref $SUPABASE_PROJECT_REF
```

#### Read-Only Mode

```bash
# Enable read-only mode for analysis workloads
npx @supabase/mcp-server-supabase@latest \
  --access-token $SUPABASE_ACCESS_TOKEN \
  --read-only
```

## Security Best Practices

### 1. Environment Configuration

```bash
# Use separate tokens for different environments
SUPABASE_DEV_TOKEN=dev_token_here
SUPABASE_PROD_TOKEN=prod_token_here

# Enable read-only mode for development
SUPABASE_READ_ONLY=true
```

### 2. Network Security

- **HTTPS Only**: Ensure all connections use HTTPS
- **IP Whitelisting**: Restrict Supabase access to known IP ranges
- **VPN**: Use VPN for sensitive operations
- **Firewall Rules**: Configure database firewall rules

### 3. Data Protection

#### Encryption at Rest
- All sensitive fields are encrypted using Supabase Vault
- Use AES-256 encryption for PII data
- Implement field-level encryption for sensitive information

#### Encryption in Transit
- TLS 1.3 for all data transmission
- Certificate pinning for additional security
- Perfect forward secrecy enabled

### 4. Audit and Monitoring

#### Query Logging
```sql
-- Enable query logging for MCP operations
ALTER DATABASE postgres SET log_statement = 'all';
ALTER DATABASE postgres SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
```

#### Audit Trail
```sql
-- Comprehensive audit logging
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    employee_id UUID REFERENCES employees(id),
    action TEXT NOT NULL, -- INSERT, UPDATE, DELETE, SELECT
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMPTZ DEFAULT now()
);
```

#### Real-time Monitoring
- Monitor failed authentication attempts
- Alert on unusual query patterns
- Track data access by user and time
- Implement rate limiting for API calls

### 5. Privacy Compliance

#### GDPR Compliance
- **Data Minimization**: Only collect necessary employee data
- **Purpose Limitation**: Data used solely for HR and career development
- **Right to Access**: Users can view their own data access logs
- **Right to Erasure**: Automated data deletion procedures

#### Consent Management
```sql
-- Privacy consent tracking
CREATE TABLE privacy_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    consent_type TEXT NOT NULL, -- data_processing, marketing, analytics
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMPTZ,
    consent_withdrawn_date TIMESTAMPTZ
);
```

### 6. Access Control Best Practices

#### Role-Based Access Control (RBAC)
```sql
-- User roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    role TEXT NOT NULL, -- employee, manager, hr, admin, super_admin
    granted_by UUID REFERENCES employees(id),
    granted_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);
```

#### Principle of Least Privilege
- Grant minimum permissions required for each role
- Regular review of user permissions
- Automatic permission expiration
- Audit permission changes

### 7. Incident Response

#### Security Incident Plan
1. **Detection**: Monitor for security anomalies
2. **Assessment**: Evaluate incident severity and impact
3. **Containment**: Isolate affected systems
4. **Recovery**: Restore systems from clean backups
5. **Lessons Learned**: Update security measures

#### Breach Notification
```sql
-- Automated breach detection and notification
CREATE OR REPLACE FUNCTION notify_security_breach()
RETURNS trigger AS $$
BEGIN
    -- Send notification to security team
    PERFORM pg_notify('security_breach',
        json_build_object(
            'table', TG_TABLE_NAME,
            'action', TG_OP,
            'user', current_user,
            'timestamp', now()
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 8. Performance and Security

#### Query Optimization with Security
```sql
-- Secure query with performance optimization
CREATE INDEX CONCURRENTLY idx_secure_employee_search
ON employees(employee_id, current_department_id)
WHERE employment_status = 'active';
```

#### Rate Limiting
- Implement rate limiting at the application level
- Monitor query frequency per user
- Alert on suspicious activity patterns

### 9. Backup and Recovery

#### Secure Backup Strategy
- Encrypted backups stored in secure locations
- Regular backup testing and validation
- Point-in-time recovery capabilities
- Backup access logging and monitoring

#### Recovery Testing
```sql
-- Test backup integrity
SELECT COUNT(*) FROM employees; -- Compare with backup
-- Test RLS policies post-recovery
SET LOCAL auth.uid TO 'test-user-uuid';
SELECT * FROM employees LIMIT 1; -- Should return only user's data
```

### 10. Compliance Monitoring

#### Regular Security Audits
- Quarterly security assessments
- Penetration testing every 6 months
- Code security reviews
- Third-party security audits

#### Compliance Reporting
- Generate compliance reports automatically
- Track security metrics and KPIs
- Maintain audit trails for regulatory compliance
- Regular privacy impact assessments

## Configuration Examples

### Secure Development Environment
```yaml
# supabase.yaml for development
name: supabase
mode: mcp
config:
  command: npx
  args:
    - "-y"
    - "@supabase/mcp-server-supabase@latest"
    - "--access-token"
    - "${oc.env:SUPABASE_DEV_TOKEN}"
    - "--read-only"
    - "--project-ref"
    - "${oc.env:SUPABASE_DEV_PROJECT_REF}"
```

### Production Environment
```yaml
# supabase.yaml for production
name: supabase
mode: mcp
config:
  command: npx
  args:
    - "-y"
    - "@supabase/mcp-server-supabase@latest"
    - "--access-token"
    - "${oc.env:SUPABASE_PROD_TOKEN}"
    - "--project-ref"
    - "${oc.env:SUPABASE_PROD_PROJECT_REF}"
```

## Monitoring and Alerting

### Key Security Metrics
- Failed authentication attempts
- Unusual query patterns
- Data access volume by user
- Permission changes
- Token usage statistics

### Alert Configuration
```sql
-- Alert on suspicious activity
CREATE OR REPLACE FUNCTION security_monitor()
RETURNS void AS $$
DECLARE
    suspicious_count INTEGER;
BEGIN
    -- Check for unusual login patterns
    SELECT COUNT(*) INTO suspicious_count
    FROM audit_log
    WHERE action = 'SELECT'
    AND table_name = 'employees'
    AND timestamp > now() - interval '1 hour'
    GROUP BY employee_id
    HAVING COUNT(*) > 100; -- More than 100 queries per hour

    IF suspicious_count > 0 THEN
        -- Send alert
        PERFORM pg_notify('security_alert', 'Unusual query pattern detected');
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## Conclusion

Implementing these security measures ensures that the Supabase MCP integration with the SAP Analysis Agent maintains the highest standards of data protection while enabling powerful AI-driven career insights. Regular security reviews and updates are essential to maintain the integrity of the system.
