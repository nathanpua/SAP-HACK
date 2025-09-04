# Supabase MCP Integration Setup Guide

## Overview

This guide explains how to integrate Supabase database access into your Youtu-agent analysis agents using the Model Context Protocol (MCP).

## Prerequisites

1. **Supabase Account**: You need a Supabase account with a project
2. **Personal Access Token**: Generate a PAT from your Supabase dashboard
3. **Project Reference**: Your Supabase project reference ID

## Configuration Steps

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/account/tokens)
2. Generate a Personal Access Token (PAT)
3. Note your Project Reference from your project settings
4. Get your Project URL from the project settings

### 2. Set Environment Variables

Add these to your `.env` file:

```bash
# Required
SUPABASE_ACCESS_TOKEN=your_personal_access_token_here
SUPABASE_PROJECT_REF=your_project_reference_here

# Optional (for additional security)
SUPABASE_PROJECT_URL=https://your-project-ref.supabase.co
SUPABASE_READ_ONLY=true  # Limit to read-only operations
```

### 3. Verify Database Schema

Ensure your Supabase database has the SAP employee schema deployed. The integration expects these key tables:

- `employees` - Core employee information
- `employee_skills` - Skills and proficiency levels
- `employee_certifications` - Certification tracking
- `projects` - Project information
- `performance_reviews` - Performance data

## Usage in Analysis Agent

The SAP Analysis Agent now has access to query the Supabase database through MCP. It can:

### Query Capabilities

1. **Employee Data Analysis**:
   ```sql
   -- Find employees with specific SAP expertise
   SELECT * FROM employee_profiles
   WHERE current_role_title LIKE '%SAP%'
   AND career_level = 'senior';
   ```

2. **Skills Gap Analysis**:
   ```sql
   -- Compare skills with successful employees
   SELECT es.skill_name, es.final_proficiency,
          AVG(es.final_proficiency) as avg_proficiency
   FROM employee_skills es
   JOIN employees e ON es.employee_id = e.id
   WHERE e.career_level = 'senior'
   GROUP BY es.skill_name;
   ```

3. **Career Path Insights**:
   ```sql
   -- Find career transition patterns
   SELECT previous_role, current_role, COUNT(*) as transition_count
   FROM employee_role_assignments
   GROUP BY previous_role, current_role
   ORDER BY transition_count DESC;
   ```

### Agent Integration

The analysis agent will automatically use database queries to:

- Provide data-driven career recommendations
- Calculate realistic salary ranges based on actual data
- Identify mentorship opportunities
- Analyze certification completion rates
- Review project success patterns

## Security Considerations

### Row Level Security (RLS)

The database uses RLS policies to ensure:
- Employees can only access their own data
- Managers can access team member data
- HR/Admin can access all data
- All queries are automatically filtered by user permissions

### MCP Server Security

- **Read-Only Mode**: Enable `--read-only` flag for analysis-only workloads
- **Project Scoping**: Limit access to specific projects with `--project-ref`
- **Token Management**: Use dedicated tokens with minimal required permissions

## Testing the Integration

### 1. Start the Agent

```bash
cd /Users/nathanpua/Desktop/SAP hack/Youtu-agent
python examples/career_coach/main_orchestra.py
```

### 2. Test Database Queries

Ask questions like:
- "What SAP certifications do senior architects typically have?"
- "How long does it take to become a SAP Solution Architect?"
- "What skills are most valuable for SAP consultants?"

### 3. Verify Data Access

The agent should respond with insights based on actual employee data from your Supabase database.

## Troubleshooting

### Common Issues

1. **MCP Server Connection Failed**
   - Verify SUPABASE_ACCESS_TOKEN is set correctly
   - Check that the token hasn't expired
   - Ensure the project reference is correct

2. **Permission Denied**
   - Check RLS policies in your database
   - Verify user roles and permissions
   - Ensure the auth context is properly set

3. **No Data Returned**
   - Confirm the database schema is deployed
   - Check that tables have data
   - Verify query syntax and table names

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
export MCP_DEBUG=true
export SUPABASE_DEBUG=true
```

## Advanced Configuration

### Custom MCP Server Options

```yaml
# In supabase.yaml tool config
config:
  command: npx
  args:
    - "-y"
    - "@supabase/mcp-server-supabase@latest"
    - "--access-token"
    - "${oc.env:SUPABASE_ACCESS_TOKEN}"
    - "--read-only"  # Optional: read-only mode
    - "--project-ref"
    - "${oc.env:SUPABASE_PROJECT_REF}"  # Optional: project scoping
```

### Environment-Specific Configurations

You can create different configurations for development/production:

```yaml
# Development (read-only)
config:
  command: npx
  args: ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "${oc.env:SUPABASE_DEV_TOKEN}", "--read-only"]

# Production (full access)
config:
  command: npx
  args: ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "${oc.env:SUPABASE_PROD_TOKEN}"]
```

## Performance Optimization

### Database Indexes

Ensure these indexes are created for optimal query performance:

```sql
-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_employees_dept_role ON employees(current_department_id, current_role_id);
CREATE INDEX CONCURRENTLY idx_employee_skills_proficiency ON employee_skills(employee_id, final_proficiency);
CREATE INDEX CONCURRENTLY idx_performance_reviews_employee_date ON performance_reviews(employee_id, review_date DESC);
```

### Query Optimization

The MCP server automatically optimizes queries, but you can monitor performance through:

```sql
-- Monitor query performance
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
WHERE query LIKE '%employee%'
ORDER BY total_time DESC;
```

## Support

For issues with:
- **Youtu-agent**: Check the main repository documentation
- **Supabase MCP**: Visit https://github.com/mcp-research/supabase-community__supabase-mcp
- **Supabase**: Check https://supabase.com/docs

## Next Steps

After setup, you can:
1. Extend the analysis agent with custom database queries
2. Add more specialized SAP analysis tools
3. Integrate with additional Supabase features (Edge Functions, Storage)
4. Create custom dashboards for career insights
