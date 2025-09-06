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

    // Insert new message using atomic function
    const { data: message, error: msgError } = await serviceSupabase
      .rpc('insert_employee_conversation_message', {
        p_session_id: conversation.id,
        p_message_type: message_type,
        p_content: content,
        p_metadata: metadata || {},
        p_tool_name: tool_name,
        p_tool_input: tool_input,
        p_tool_output: tool_output
      });

    if (msgError) {
      console.error('Error creating message:', msgError);
      console.error('Message details:', {
        sessionId: conversation.id,
        messageType: message_type,
        contentLength: content?.length,
        metadata
      });
      return NextResponse.json(
        { error: 'Failed to create message', details: msgError.message },
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
