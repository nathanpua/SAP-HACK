import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/conversations/[sessionId]/messages - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use service role client for database operations
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

    // Verify user owns this conversation
    const { data: conversation, error: convError } = await serviceSupabase
      .from('employee_conversation_sessions')
      .select('id, title, started_at, employee_id')
      .eq('session_id', sessionId)
      .eq('employee_id', employee.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Get messages for this conversation
    const { data: messages, error: msgError } = await serviceSupabase
      .from('employee_conversation_messages')
      .select(`
        id,
        message_type,
        content,
        sequence_number,
        created_at,
        metadata,
        tool_name,
        tool_input,
        tool_output
      `)
      .eq('session_id', conversation.id)
      .order('sequence_number', { ascending: true });

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session: {
        id: conversation.id,
        session_id: sessionId,
        title: conversation.title,
        started_at: conversation.started_at
      },
      messages: messages || []
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[sessionId]/messages - Add a message to a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { sessionId } = await params;
    const { message_type, content, metadata, tool_name, tool_input, tool_output } = await request.json();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use service role client for database operations
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

    // Verify user owns this conversation and get session info
    const { data: conversation, error: convError } = await serviceSupabase
      .from('employee_conversation_sessions')
      .select('id, message_count')
      .eq('session_id', sessionId)
      .eq('employee_id', employee.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    // Get next sequence number
    const { data: lastMessage } = await serviceSupabase
      .from('employee_conversation_messages')
      .select('sequence_number')
      .eq('session_id', conversation.id)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .single();

    const nextSequenceNumber = (lastMessage?.sequence_number || 0) + 1;

    // Insert new message
    const { data: message, error: msgError } = await serviceSupabase
      .from('employee_conversation_messages')
      .insert({
        session_id: conversation.id,
        message_type,
        content,
        sequence_number: nextSequenceNumber,
        metadata: metadata || {},
        tool_name,
        tool_input,
        tool_output
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error creating message:', msgError);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      );
    }

    // Update conversation last_message_at and message_count (trigger will handle this)
    // The database triggers will automatically update these fields

    return NextResponse.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
