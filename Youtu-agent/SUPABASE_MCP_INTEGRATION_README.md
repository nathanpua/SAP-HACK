# SAP Career Coach Supabase MCP Integration

## Overview

This document describes the complete integration of Supabase database access into the SAP Career Coach system using the Model Context Protocol (MCP). The integration enables the analysis agent to query real employee data, skills, certifications, and career progression patterns to provide data-driven career recommendations.

## Architecture

### Components

1. **Supabase Database**: PostgreSQL database with comprehensive SAP employee schema
2. **Supabase MCP Server**: MCP server that provides secure database access
3. **Youtu-agent Framework**: Multi-agent AI system with orchestra coordination
4. **SAP Analysis Agent**: Specialized agent with database query capabilities
5. **WebUI Interface**: User-friendly interface for career coaching conversations

### Data Flow

```
User Query → WebUI → Orchestra Agent → Analysis Agent → Supabase MCP → Database → AI Analysis → Response
```

## Setup Instructions

### 1. Environment Configuration

Ensure your `.env` file contains:

```bash
# Supabase Configuration
SUPABASE_ACCESS_TOKEN=your_personal_access_token_here
SUPABASE_PROJECT_REF=your_project_reference_here
SUPABASE_PROJECT_URL=https://your-project-ref.supabase.co

# Optional security settings
SUPABASE_READ_ONLY=true  # Recommended for analysis workloads
```

### 2. Database Schema

The integration expects the following key tables:

- `employees` - Core employee information
- `employee_skills` - Skills and proficiency levels
- `employee_certifications` - Certification tracking
- `projects` - Project information
- `performance_reviews` - Performance data
- `roles` - Job roles and career levels

### 3. Configuration Files

#### Supabase Tool Configuration (`configs/agents/tools/supabase.yaml`)
```yaml
name: supabase
mode: mcp
activated_tools: null
config:
  command: npx
  args: ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "${oc.env:SUPABASE_ACCESS_TOKEN}"]
  env:
    SUPABASE_ACCESS_TOKEN: ${oc.env:SUPABASE_ACCESS_TOKEN}
    SUPABASE_PROJECT_REF: ${oc.env:SUPABASE_PROJECT_REF}
```

#### SAP Analysis Agent Configuration (`configs/agents/simple_agents/sap_analysis_agent.yaml`)
```yaml
toolkits:
  document: ${oc.select:toolkit.document}
  python_executor: ${oc.select:toolkit.python_executor}
  supabase: ${oc.select:toolkit.supabase}

agent:
  name: SAPAnalysisAgent
  instructions: |
    You are a specialized SAP career analysis expert with access to the SAP Employee Database.
    Use database queries to provide data-driven insights and realistic career recommendations.
```

## Testing the Integration

### 1. Run Integration Tests

```bash
python test_supabase_mcp_integration.py
```

This will verify:
- ✅ Environment variables are configured
- ✅ SAP Analysis Agent has Supabase tool access
- ✅ Orchestra configuration includes the analysis agent
- ✅ Sample database queries are properly defined

### 2. Test Database Queries

```bash
python test_database_queries.py
```

This shows sample queries and test questions for the analysis agent.

### 3. Launch WebUI

```bash
python examples/career_coach/main_web.py
```

## Usage Examples

### Sample Questions to Test

1. **Certification Analysis**
   - "What SAP certifications do senior architects typically have?"
   - "How do certification completion rates compare across different SAP modules?"

2. **Career Progression**
   - "How long does it take to become a SAP Solution Architect?"
   - "What are the most common career paths in our SAP organization?"

3. **Skills Analysis**
   - "What skills differentiate senior from junior SAP consultants?"
   - "Which SAP modules are most frequently used by our team?"

4. **Project Experience**
   - "What types of projects do Solution Architects typically work on?"
   - "How many employees have transitioned from consultant to architect roles?"

## Database Query Capabilities

The analysis agent can perform various types of queries:

### Employee Demographics
```sql
SELECT COUNT(*) as active_employees
FROM employees
WHERE employment_status = 'active';
```

### Skills Analysis
```sql
SELECT s.name, COUNT(es.*) as employee_count
FROM skills s
JOIN employee_skills es ON s.id = es.skill_id
WHERE s.category = 'sap_module'
GROUP BY s.name
ORDER BY employee_count DESC;
```

### Career Progression
```sql
SELECT r.career_level, COUNT(e.*) as employee_count
FROM roles r
JOIN employees e ON r.id = e.current_role_id
GROUP BY r.career_level
ORDER BY employee_count DESC;
```

### Certification Tracking
```sql
SELECT c.name, COUNT(ec.*) as completion_count
FROM certifications c
JOIN employee_certifications ec ON c.id = ec.certification_id
WHERE ec.status = 'completed'
GROUP BY c.name
ORDER BY completion_count DESC;
```

## Security Features

### Row Level Security (RLS)

The database implements comprehensive RLS policies:

- **Employee Access**: Users can only view their own records
- **Manager Access**: Managers can view their direct reports' data
- **HR/Admin Access**: HR personnel can access all employee data
- **Department Access**: Users can view department-level aggregated data

### MCP Server Security

- **Personal Access Tokens**: Secure authentication using PATs
- **Project Scoping**: Limit access to specific Supabase projects
- **Read-Only Mode**: Optional read-only access for analysis workloads
- **Encrypted Connections**: All data transmission is encrypted

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loaded**
   ```
   Solution: Ensure .env file exists and contains SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF
   ```

2. **MCP Server Connection Failed**
   ```
   Solution: Verify Supabase credentials and project reference are correct
   ```

3. **Database Permission Denied**
   ```
   Solution: Check RLS policies and user roles in Supabase dashboard
   ```

4. **Tool Not Found in Agent**
   ```
   Solution: Verify supabase tool is properly configured in agent toolkits
   ```

### Debug Commands

```bash
# Test environment variables
echo $SUPABASE_ACCESS_TOKEN
echo $SUPABASE_PROJECT_REF

# Test MCP server connection
npx @supabase/mcp-server-supabase@latest --access-token $SUPABASE_ACCESS_TOKEN --project-ref $SUPABASE_PROJECT_REF

# Check agent configuration
python -c "from utu.config import ConfigLoader; config = ConfigLoader.load_agent_config('simple_agents/sap_analysis_agent'); print('Toolkits:', list(config.toolkits.keys()))"
```

## Performance Optimization

### Database Indexes

Ensure these indexes exist for optimal query performance:

```sql
CREATE INDEX CONCURRENTLY idx_employees_dept_role ON employees(current_department_id, current_role_id);
CREATE INDEX CONCURRENTLY idx_employee_skills_proficiency ON employee_skills(employee_id, final_proficiency);
CREATE INDEX CONCURRENTLY idx_performance_reviews_employee_date ON performance_reviews(employee_id, review_date DESC);
```

### Query Optimization

- Use appropriate indexes for frequently queried columns
- Implement query result caching for common queries
- Monitor query performance and optimize slow queries
- Use database connection pooling for concurrent access

## Monitoring and Maintenance

### Key Metrics to Monitor

1. **Query Performance**
   - Response times for database queries
   - Query success/failure rates
   - Most frequently executed queries

2. **Security Events**
   - Failed authentication attempts
   - Unauthorized access attempts
   - Data access patterns

3. **System Health**
   - Database connection status
   - MCP server availability
   - Agent response times

### Maintenance Tasks

- **Regular Backups**: Ensure database backups are current
- **Security Audits**: Regular review of access patterns and permissions
- **Performance Tuning**: Monitor and optimize slow queries
- **Token Rotation**: Regularly rotate Supabase access tokens

## Advanced Features

### Custom Database Queries

The analysis agent can be extended to perform custom queries:

```python
# Example: Custom career progression analysis
query = """
SELECT
    e.hire_date,
    r.career_level,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date)) as years_experience
FROM employees e
JOIN roles r ON e.current_role_id = r.id
WHERE e.employment_status = 'active'
ORDER BY years_experience DESC;
"""
```

### Integration with Other Tools

The Supabase integration works alongside other tools:

- **Document Analysis**: Process resumes and job descriptions
- **Web Research**: Gather external SAP career information
- **Python Execution**: Perform complex data analysis
- **Calendar Integration**: Schedule career development activities

## Support and Resources

### Documentation
- [Supabase MCP Server Documentation](https://github.com/mcp-research/supabase-community__supabase-mcp)
- [Youtu-agent Configuration Guide](docs/config.md)
- [SAP Database Schema](tasks/sap-employee-database-schema.sql)

### Getting Help
1. Check the integration test output for specific error messages
2. Verify environment variables are properly set
3. Ensure database schema matches the expected structure
4. Review Supabase project permissions and RLS policies

## Conclusion

The Supabase MCP integration provides powerful data-driven capabilities to the SAP Career Coach system. By combining AI analysis with real employee data, the system can provide personalized, realistic career guidance based on actual organizational patterns and success metrics.

The integration is designed to be secure, scalable, and maintainable, with comprehensive monitoring and troubleshooting capabilities.

## Updated Tool Configuration

### Supabase MCP Tools

The SAP Analysis Agent now uses only two specific Supabase MCP tools:

1. **list_tables**: Lists all available tables in the database schema
2. **execute_sql**: Executes SQL queries against the database

### Tool Configuration

```yaml
# configs/agents/tools/supabase.yaml
name: supabase
mode: mcp
activated_tools:
  - list_tables
  - execute_sql
config:
  command: npx
  args: ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "${oc.env:SUPABASE_ACCESS_TOKEN}"]
```

### Analysis Agent Focus

The agent is now focused on:
- Database schema exploration using `list_tables`
- Direct SQL query execution using `execute_sql`
- Cross-table analysis for comprehensive career insights
- Real-time data-driven recommendations

This approach ensures the agent works directly with your actual employee data rather than searching documentation.
