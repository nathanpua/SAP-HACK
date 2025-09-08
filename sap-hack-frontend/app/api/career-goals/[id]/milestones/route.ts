import { createClient } from '@/lib/supabase/server';
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use authenticated client with corrected RLS policies
    const { id } = await params;

    const { data, error } = await supabase
      .from('goal_milestones')
      .select('*')
      .eq('career_goal_id', id)
      .order('target_date', { ascending: true });

    if (error) {
      console.error('Error fetching milestones:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { id } = await params;
    const body = await request.json();

    const {
      title,
      description,
      target_date,
      deliverables
    } = body;

    const { data, error } = await supabase
      .from('goal_milestones')
      .insert({
        career_goal_id: id,
        title,
        description,
        target_date,
        deliverables
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating milestone:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
