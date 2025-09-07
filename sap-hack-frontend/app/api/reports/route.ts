import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/reports - List user's generated reports
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('Auth error:', userError);
      return NextResponse.json(
        { error: "Unauthorized", details: userError?.message },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Use service role client for database operations (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();

    // Get pagination and filter parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get filter parameters
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const type = url.searchParams.get('type');

    // First get the employee ID for the authenticated user
    console.log('Looking up employee for user:', user.id);
    const { data: employee, error: empError } = await serviceSupabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (empError || !employee) {
      console.log('Employee lookup error:', empError);
      return NextResponse.json(
        { error: 'Employee record not found', details: empError?.message },
        { status: 404 }
      );
    }

    console.log('Found employee:', employee.id);

    // First, get the conversation sessions for this employee with date filters
    let sessionsQuery = serviceSupabase
      .from('employee_conversation_sessions')
      .select('id, session_id, title, conversation_type, started_at')
      .eq('employee_id', employee.id);

    // Apply date filters if provided
    if (startDate) {
      sessionsQuery = sessionsQuery.gte('started_at', startDate);
    }
    if (endDate) {
      sessionsQuery = sessionsQuery.lte('started_at', endDate + 'T23:59:59.999Z'); // Include end of day
    }
    if (type) {
      sessionsQuery = sessionsQuery.eq('conversation_type', type);
    }

    const { data: sessions, error: sessionError } = await sessionsQuery;

    if (sessionError) {
      console.log('Session lookup error:', sessionError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: sessionError.message },
        { status: 500 }
      );
    }

    console.log('Found sessions:', sessions?.length || 0);

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        reports: [],
        pagination: {
          page,
          limit,
          total: 0,
          total_pages: 0
        }
      });
    }

    // Get session IDs for the messages query
    const sessionIds = sessions.map(s => s.id);
    console.log('Session IDs:', sessionIds);
    console.log('Session IDs types:', sessionIds.map(id => typeof id));

    // Query for career guidance reports (assistant messages with structured reports)
    console.log('Querying career guidance reports for sessionIds:', sessionIds);

    let careerGuidanceQuery = serviceSupabase
      .from('employee_conversation_messages')
      .select('id, session_id, message_type, content, created_at, tool_name, tool_output')
      .eq('message_type', 'assistant')
      .or('content.ilike.%## Executive Summary%,content.ilike.%## Career Guidance%,content.ilike.%📊 **Report Generated**%,content.ilike.%## Career Development Plan%');

    // Only apply the session filter if we have sessions
    if (sessionIds.length > 0) {
      careerGuidanceQuery = careerGuidanceQuery.in('session_id', sessionIds);
    }

    const { data: careerGuidanceMessages, error: careerGuidanceError } = await careerGuidanceQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (careerGuidanceError) {
      console.log('Career guidance query error:', careerGuidanceError);
      return NextResponse.json(
        { error: 'Failed to fetch career guidance reports', details: careerGuidanceError.message },
        { status: 500 }
      );
    }

    // Use the career guidance messages directly
    const allMessages = careerGuidanceMessages || [];

    // Apply pagination to the results
    const messages = allMessages.slice(offset, offset + limit);

    console.log('Found career guidance reports:', careerGuidanceMessages?.length || 0);
    console.log('Total career guidance reports:', messages?.length || 0);

    // Create a lookup map for sessions
    const sessionMap = new Map(sessions.map(s => [s.id, s]));

    // Transform the data
    const formattedReports = messages?.map(message => {
      const session = sessionMap.get(message.session_id);
      return {
        id: message.id,
        session_id: session?.session_id,
        session_title: session?.title,
        conversation_type: session?.conversation_type,
        message_type: message.message_type,
        content: message.content,
        tool_name: message.tool_name,
        tool_output: message.tool_output,
        metadata: null, // Temporarily removed from query due to JSON parsing issue
        created_at: message.created_at,
        session_started_at: session?.started_at
      };
    }) || [];

    // Calculate total count from career guidance reports
    const totalCount = careerGuidanceMessages?.length || 0;

    return NextResponse.json({
      reports: formattedReports,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Unexpected error in reports endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/reports - Generate a new report (placeholder for future implementation)
export async function POST() {
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

    // For now, return a placeholder response
    // In the future, this could trigger report generation via the career coach agent
    return NextResponse.json({
      success: true,
      message: 'Report generation endpoint - coming soon',
      note: 'Use the career coach chatbot to generate new reports'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/reports - Test database connectivity (debug endpoint)
export async function PATCH() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", details: userError?.message },
        { status: 401 }
      );
    }

    // Use service role client for database operations
    const serviceSupabase = createServiceRoleClient();

    // Test basic connectivity
    const { data: testData, error: testError } = await serviceSupabase
      .from('employee_conversation_sessions')
      .select('count')
      .limit(1);

    if (testError) {
      return NextResponse.json({
        error: 'Database connectivity test failed',
        details: testError.message,
        user: user.id
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connectivity test passed',
      user: user.id,
      testResult: testData
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
