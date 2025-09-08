import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('Career Goals API - GET individual - Auth error:', userError);
      return NextResponse.json(
        { error: "Unauthorized", details: userError?.message },
        { status: 401 }
      );
    }

    console.log('Career Goals API - GET individual - User authenticated:', user.id);

    // Use service role client for database operations (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();

    // First get the employee ID for the authenticated user
    console.log('Career Goals API - GET individual - Looking up employee for user:', user.id);
    const { data: employee, error: empError } = await serviceSupabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (empError || !employee) {
      console.log('Career Goals API - GET individual - Employee lookup error:', empError);
      return NextResponse.json(
        { error: 'Employee record not found', details: empError?.message },
        { status: 404 }
      );
    }

    console.log('Career Goals API - GET individual - Found employee:', employee.id);

    const { id } = await params;

    // First check if the goal belongs to this employee
    const { data: goalCheck, error: goalCheckError } = await serviceSupabase
      .from('career_goals')
      .select('employee_id')
      .eq('id', id)
      .single();

    if (goalCheckError || !goalCheck) {
      console.log('Career Goals API - GET individual - Goal not found:', goalCheckError);
      return NextResponse.json({ error: 'Career goal not found' }, { status: 404 });
    }

    // Security check: only allow access to own goals
    if (goalCheck.employee_id !== employee.id) {
      console.log('Career Goals API - GET individual - Access denied for goal:', id);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data, error } = await serviceSupabase
      .from('career_goals')
      .select(`
        *,
        employee:employees!employee_id(first_name, last_name, email),
        mentor:employees!mentor_id(first_name, last_name),
        milestones:goal_milestones(*),
        progress_updates:goal_progress_updates(
          *,
          updated_by_user:employees!updated_by(first_name, last_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Career Goals API - GET individual - Error fetching career goal:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Career goal not found' }, { status: 404 });
    }

    console.log('Career Goals API - GET individual - Successfully fetched goal:', data.id);

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Career Goals API - GET individual - Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use service role client for database operations (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();

    // First get the employee ID for the authenticated user
    console.log('Career Goals API - PUT - Looking up employee for user:', user.id);
    const { data: employee, error: empError } = await serviceSupabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (empError || !employee) {
      console.log('Career Goals API - PUT - Employee lookup error:', empError);
      return NextResponse.json(
        { error: 'Employee record not found', details: empError?.message },
        { status: 404 }
      );
    }

    console.log('Career Goals API - PUT - Found employee:', employee.id);

    const { id } = await params;
    const body = await request.json();

    // Security check: verify the goal belongs to this employee
    const { data: goalCheck, error: goalCheckError } = await serviceSupabase
      .from('career_goals')
      .select('employee_id')
      .eq('id', id)
      .single();

    if (goalCheckError || !goalCheck) {
      console.log('Career Goals API - PUT - Goal not found:', goalCheckError);
      return NextResponse.json({ error: 'Career goal not found' }, { status: 404 });
    }

    if (goalCheck.employee_id !== employee.id) {
      console.log('Career Goals API - PUT - Access denied for goal:', id);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const {
      title,
      description,
      category,
      goal_type,
      priority,
      status,
      start_date,
      target_completion_date,
      actual_completion_date,
      progress_percentage,
      current_status,
      success_criteria,
      measurement_method,
      target_metric,
      current_metric,
      required_resources,
      required_skills,
      mentor_id,
      budget_allocated,
      approved_by,
      approved_at,
      review_date,
      tags,
      notes,
      attachments
    } = body;

    const { data, error } = await serviceSupabase
      .from('career_goals')
      .update({
        title,
        description,
        category,
        goal_type,
        priority,
        status,
        start_date,
        target_completion_date,
        actual_completion_date,
        progress_percentage,
        current_status,
        success_criteria,
        measurement_method,
        target_metric,
        current_metric,
        required_resources,
        required_skills,
        mentor_id,
        budget_allocated,
        approved_by,
        approved_at,
        review_date,
        tags,
        notes,
        attachments,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        employee:employees!employee_id(first_name, last_name, email),
        mentor:employees!mentor_id(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error updating career goal:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Career goal not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use service role client for database operations (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();

    // First get the employee ID for the authenticated user
    console.log('Career Goals API - DELETE - Looking up employee for user:', user.id);
    const { data: employee, error: empError } = await serviceSupabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (empError || !employee) {
      console.log('Career Goals API - DELETE - Employee lookup error:', empError);
      return NextResponse.json(
        { error: 'Employee record not found', details: empError?.message },
        { status: 404 }
      );
    }

    console.log('Career Goals API - DELETE - Found employee:', employee.id);

    const { id } = await params;

    // Security check: verify the goal belongs to this employee
    const { data: goalCheck, error: goalCheckError } = await serviceSupabase
      .from('career_goals')
      .select('employee_id')
      .eq('id', id)
      .single();

    if (goalCheckError || !goalCheck) {
      console.log('Career Goals API - DELETE - Goal not found:', goalCheckError);
      return NextResponse.json({ error: 'Career goal not found' }, { status: 404 });
    }

    if (goalCheck.employee_id !== employee.id) {
      console.log('Career Goals API - DELETE - Access denied for goal:', id);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { error } = await serviceSupabase
      .from('career_goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting career goal:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Career goal deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
