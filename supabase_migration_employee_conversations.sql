-- Migration: Employee Conversation History Storage
-- Created: 2024
-- Description: Adds tables for storing employee conversation histories with SAP Career Coach

-- =============================================
-- TABLE: employee_conversation_sessions
-- =============================================
-- Stores conversation session metadata and links to employees
CREATE TABLE IF NOT EXISTS public.employee_conversation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  title TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  conversation_type TEXT DEFAULT 'career_coach' CHECK (conversation_type IN ('career_coach', 'general')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABLE: employee_conversation_messages
-- =============================================
-- Stores individual messages within conversations
CREATE TABLE IF NOT EXISTS public.employee_conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.employee_conversation_sessions(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant', 'tool_call', 'tool_result', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  sequence_number INTEGER NOT NULL,
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- UNIQUE CONSTRAINTS to Prevent Duplicates
-- =============================================

-- Prevent duplicate messages within the same session
ALTER TABLE public.employee_conversation_messages
ADD CONSTRAINT unique_message_per_session_sequence
UNIQUE (session_id, message_type, content, sequence_number);

-- =============================================
-- INDEXES for Performance
-- =============================================

-- Conversation sessions indexes
CREATE INDEX IF NOT EXISTS idx_employee_conversation_sessions_employee_id
ON public.employee_conversation_sessions(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_conversation_sessions_started_at
ON public.employee_conversation_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_conversation_sessions_status
ON public.employee_conversation_sessions(status);

-- Conversation messages indexes
CREATE INDEX IF NOT EXISTS idx_employee_conversation_messages_session_id
ON public.employee_conversation_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_employee_conversation_messages_sequence
ON public.employee_conversation_messages(session_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_employee_conversation_messages_created_at
ON public.employee_conversation_messages(created_at DESC);

-- Full-text search index for message content
CREATE INDEX IF NOT EXISTS idx_employee_conversation_messages_content
ON public.employee_conversation_messages USING gin(to_tsvector('english', content));

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on conversation tables
ALTER TABLE public.employee_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_conversation_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can only see their own conversation sessions
CREATE POLICY "Employees can view own conversation sessions"
ON public.employee_conversation_sessions
FOR SELECT
USING (employee_id IN (
  SELECT id FROM public.employees
  WHERE auth_user_id = auth.uid()
));

-- Policy: Employees can insert their own conversation sessions
CREATE POLICY "Employees can create own conversation sessions"
ON public.employee_conversation_sessions
FOR INSERT
WITH CHECK (employee_id IN (
  SELECT id FROM public.employees
  WHERE auth_user_id = auth.uid()
));

-- Policy: Employees can update their own conversation sessions
CREATE POLICY "Employees can update own conversation sessions"
ON public.employee_conversation_sessions
FOR UPDATE
USING (employee_id IN (
  SELECT id FROM public.employees
  WHERE auth_user_id = auth.uid()
));

-- Policy: Employees can view messages from their own conversations
CREATE POLICY "Employees can view own conversation messages"
ON public.employee_conversation_messages
FOR SELECT
USING (session_id IN (
  SELECT id FROM public.employee_conversation_sessions
  WHERE employee_id IN (
    SELECT id FROM public.employees
    WHERE auth_user_id = auth.uid()
  )
));

-- Policy: Employees can insert messages to their own conversations
CREATE POLICY "Employees can create own conversation messages"
ON public.employee_conversation_messages
FOR INSERT
WITH CHECK (session_id IN (
  SELECT id FROM public.employee_conversation_sessions
  WHERE employee_id IN (
    SELECT id FROM public.employees
    WHERE auth_user_id = auth.uid()
  )
));

-- =============================================
-- FUNCTIONS for Conversation Management
-- =============================================

-- Function to update conversation session metadata
CREATE OR REPLACE FUNCTION update_conversation_session_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent session's metadata
  UPDATE public.employee_conversation_sessions
  SET
    last_message_at = NEW.created_at,
    message_count = (
      SELECT COUNT(*) FROM public.employee_conversation_messages
      WHERE session_id = NEW.session_id
    ),
    updated_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update session metadata when messages are added
CREATE TRIGGER trigger_update_session_metadata
  AFTER INSERT ON public.employee_conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_session_metadata();

-- Function to generate conversation title from first user message
CREATE OR REPLACE FUNCTION generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
  -- If no title is set and this is the first user message, generate a title
  IF (SELECT title FROM public.employee_conversation_sessions WHERE id = NEW.session_id) IS NULL
     AND NEW.message_type = 'user'
     AND NEW.sequence_number = 1 THEN

    UPDATE public.employee_conversation_sessions
    SET title = CASE
      WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 47) || '...'
      ELSE NEW.content
    END
    WHERE id = NEW.session_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate conversation titles
CREATE TRIGGER trigger_generate_conversation_title
  AFTER INSERT ON public.employee_conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION generate_conversation_title();

-- =============================================
-- VIEWS for Simplified Access
-- =============================================

-- View for conversation sessions with employee details
CREATE OR REPLACE VIEW employee_conversation_sessions_with_details AS
SELECT
  cs.*,
  e.first_name,
  e.last_name,
  e.email,
  e.employee_id as employee_number,
  e.current_department_id,
  e.current_role_id
FROM public.employee_conversation_sessions cs
JOIN public.employees e ON cs.employee_id = e.id;

-- View for conversation messages with session details
CREATE OR REPLACE VIEW employee_conversation_messages_with_details AS
SELECT
  cm.*,
  cs.employee_id,
  cs.title as session_title,
  cs.started_at as session_started_at
FROM public.employee_conversation_messages cm
JOIN public.employee_conversation_sessions cs ON cm.session_id = cs.id;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to get conversation statistics for an employee
CREATE OR REPLACE FUNCTION get_employee_conversation_stats(employee_uuid UUID)
RETURNS TABLE (
  total_conversations BIGINT,
  total_messages BIGINT,
  total_tokens BIGINT,
  oldest_conversation TIMESTAMP WITH TIME ZONE,
  newest_conversation TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cs.id) as total_conversations,
    COUNT(cm.id) as total_messages,
    COALESCE(SUM(cs.total_tokens), 0) as total_tokens,
    MIN(cs.started_at) as oldest_conversation,
    MAX(cs.last_message_at) as newest_conversation
  FROM public.employee_conversation_sessions cs
  LEFT JOIN public.employee_conversation_messages cm ON cs.id = cm.session_id
  WHERE cs.employee_id = employee_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search employee conversations
CREATE OR REPLACE FUNCTION search_employee_conversations(
  employee_uuid UUID,
  search_query TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  session_id UUID,
  session_title TEXT,
  message_content TEXT,
  message_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  relevance_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id as session_id,
    cs.title as session_title,
    cm.content as message_content,
    cm.message_type,
    cm.created_at,
    ts_rank(to_tsvector('english', cm.content), plainto_tsquery('english', search_query)) as relevance_score
  FROM public.employee_conversation_sessions cs
  JOIN public.employee_conversation_messages cm ON cs.id = cm.session_id
  WHERE cs.employee_id = employee_uuid
    AND to_tsvector('english', cm.content) @@ plainto_tsquery('english', search_query)
  ORDER BY relevance_score DESC, cm.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANTS for Application Access
-- =============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.employee_conversation_sessions TO authenticated;
GRANT SELECT, INSERT ON public.employee_conversation_messages TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON SCHEMA public TO authenticated;

-- =============================================
-- COMMENTS for Documentation
-- =============================================

COMMENT ON TABLE public.employee_conversation_sessions IS 'Stores conversation session metadata for employees';
COMMENT ON TABLE public.employee_conversation_messages IS 'Stores individual messages within employee conversations';
COMMENT ON COLUMN public.employee_conversation_sessions.employee_id IS 'References employees.id - links conversation to specific employee';
COMMENT ON COLUMN public.employee_conversation_sessions.session_id IS 'Unique identifier for the conversation session';
COMMENT ON COLUMN public.employee_conversation_messages.message_type IS 'Type of message: user, assistant, tool_call, tool_result, system';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Add any additional setup or data migration here if needed
-- For example, migrating existing conversation data if any exists
