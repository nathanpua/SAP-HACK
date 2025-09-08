import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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

    // Use authenticated client with corrected RLS policies
    // Get employee ID for the authenticated user
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const {
      milestone_id,
      progress_percentage,
      status_update,
      achievements,
      challenges,
      next_steps
    } = body;

    // Create progress update
    const { data: progressUpdate, error: progressError } = await supabase
      .from('goal_progress_updates')
      .insert({
        career_goal_id: id,
        milestone_id,
        progress_percentage,
        status_update,
        achievements,
        challenges,
        next_steps,
        updated_by: employee.id // Use employee ID instead of user ID
      })
      .select(`
        *,
        updated_by_user:employees(first_name, last_name)
      `)
      .single();

    if (progressError) {
      console.error('Error creating progress update:', progressError);
      return NextResponse.json({ error: progressError.message }, { status: 500 });
    }

    // Update the main goal's progress if percentage provided
    if (progress_percentage !== undefined) {
      const { error: updateError } = await supabase
        .from('career_goals')
        .update({
          progress_percentage,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating goal progress:', updateError);
        // Don't fail the whole request if this update fails
      }
    }

    return NextResponse.json({ data: progressUpdate }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
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

    // Use authenticated client with corrected RLS policies
    const { id } = await params;

    const { data, error } = await supabase
      .from('goal_progress_updates')
      .select(`
        *,
        updated_by_user:employees(first_name, last_name),
        milestone:goal_milestones(title)
      `)
      .eq('career_goal_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching progress updates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
