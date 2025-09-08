import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('Career Goals API - Auth error:', userError);
      return NextResponse.json(
        { error: "Unauthorized", details: userError?.message },
        { status: 401 }
      );
    }

    console.log('Career Goals API - User authenticated:', user.id);

    // Use service role client for database operations (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    // First get the employee ID for the authenticated user
    console.log('Career Goals API - Looking up employee for user:', user.id);
    const { data: employee, error: empError } = await serviceSupabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (empError || !employee) {
      console.log('Career Goals API - Employee lookup error:', empError);
      return NextResponse.json(
        { error: 'Employee record not found', details: empError?.message },
        { status: 404 }
      );
    }

    console.log('Career Goals API - Found employee:', employee.id);

    // If no employee_id provided in query params, use the current user's employee ID
    const targetEmployeeId = employeeId || employee.id;

    console.log('Career Goals API - Using target employee ID:', targetEmployeeId);

    let query = serviceSupabase
      .from('career_goals')
      .select(`
        *,
        employee:employees!employee_id(first_name, last_name, email),
        mentor:employees!mentor_id(first_name, last_name),
        milestones:goal_milestones(*)
      `)
      .eq('employee_id', targetEmployeeId) // Always filter by employee_id for security
      .order('created_at', { ascending: false });

    // Apply additional filters if provided
    if (status) {
      // Handle multiple status values (comma-separated)
      const statusArray = status.split(',').map(s => s.trim());
      if (statusArray.length > 1) {
        query = query.in('status', statusArray);
      } else {
        query = query.eq('status', status);
      }
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Career Goals API - Error fetching career goals:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Career Goals API - Successfully fetched', data?.length || 0, 'career goals');

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Career Goals API - Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('Career Goals API - POST Auth error:', userError);
      return NextResponse.json(
        { error: "Unauthorized", details: userError?.message },
        { status: 401 }
      );
    }

    console.log('Career Goals API - POST User authenticated:', user.id);

    // Use service role client for database operations (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();

    const body = await request.json();

    // Get employee ID for the authenticated user
    console.log('Career Goals API - POST Looking up employee for user:', user.id);
    const { data: employee, error: empError } = await serviceSupabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (empError || !employee) {
      console.log('Career Goals API - POST Employee lookup error:', empError);
      return NextResponse.json(
        { error: 'Employee record not found', details: empError?.message },
        { status: 404 }
      );
    }

    console.log('Career Goals API - POST Found employee:', employee.id);

    const {
      title,
      description,
      category,
      goal_type,
      priority,
      start_date,
      target_completion_date,
      success_criteria,
      measurement_method,
      target_metric,
      required_resources,
      required_skills,
      mentor_id,
      budget_allocated,
      tags,
      notes
    } = body;

    const { data, error } = await serviceSupabase
      .from('career_goals')
      .insert({
        employee_id: employee.id, // Use authenticated user's employee ID
        title,
        description,
        category,
        goal_type: goal_type || 'individual',
        priority: priority || 'medium',
        start_date,
        target_completion_date,
        success_criteria,
        measurement_method,
        target_metric,
        required_resources,
        required_skills,
        mentor_id,
        budget_allocated,
        tags,
        notes
      })
      .select(`
        *,
        employee:employees!employee_id(first_name, last_name, email),
        mentor:employees!mentor_id(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Career Goals API - POST Error creating career goal:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Career Goals API - POST Successfully created career goal:', data?.id);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Career Goals API - POST Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
