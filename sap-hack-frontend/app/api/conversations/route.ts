import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/conversations - List user's conversation sessions
export async function GET(request: NextRequest) {
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

    // Get pagination parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // First get the employee ID for the authenticated user
    const { data: employee, error: empError } = await serviceSupabase
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

    // Get user's conversations with message count
    const { data: conversations, error, count } = await serviceSupabase
      .from('employee_conversation_sessions')
      .select(`
        id,
        session_id,
        title,
        started_at,
        last_message_at,
        message_count,
        status,
        conversation_type
      `, { count: 'exact' })
      .eq('employee_id', employee.id)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversations: conversations || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { title, conversation_type = 'career_coach' } = await request.json();

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

    // Get employee ID for the authenticated user
    const { data: employee, error: empError } = await serviceSupabase
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

    // Generate unique session ID
    const sessionId = `session_${employee.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create conversation session
    const { data: conversation, error } = await serviceSupabase
      .from('employee_conversation_sessions')
      .insert({
        employee_id: employee.id,
        session_id: sessionId,
        title: title || 'New Conversation',
        conversation_type,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
