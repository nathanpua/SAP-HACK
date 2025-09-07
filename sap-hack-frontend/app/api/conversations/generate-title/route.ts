import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// OpenRouter API configuration
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Title Generation Utility Functions
class ConversationTitleGenerator {
  // Method 1: Pattern-based title generation
  static generatePatternBasedTitle(message: string): string {
    const patterns = [
      // Career transitions
      /(?:want to|transition to|become|move to|switch to)\s+(?:a|an)?\s*([^.!?]+?)(?:\s+role|\s+position|\s+in|\s+at|$)/i,
      // Certifications
      /(?:certifications?|certified?)\s+(?:for|in|with|as)\s*([^.!?]+?)(?:\s+role|\s+position|$)/i,
      // Experience levels
      /(?:with|have)\s+(\d+)\s+years?\s+(?:of\s+)?experience?\s+(?:in|with|as)\s*([^.!?]+?)(?:\s+and|$)/i,
      // Specializations
      /(?:specialize|expert|skilled)\s+in\s*([^.!?]+?)(?:\s+and|$)/i,
      // Questions about paths/planning
      /(?:what'?s|how|what|can|should)\s+(?:my|the|a)?\s*(?:career|path|plan|next|step|way)\s+(?:to|for|in)\s*([^.!?]+?)(?:\?|$)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        if (extracted.length > 3 && extracted.length < 50) {
          return this.cleanAndFormatTitle(extracted);
        }
      }
    }

    // Fallback: extract first meaningful phrase
    return this.extractFirstPhrase(message);
  }

  // Method 2: Keyword-based title generation
  static generateKeywordBasedTitle(message: string): string {
    const keywords = [
      'SAP', 'career', 'certification', 'consultant', 'architect', 'developer',
      'analyst', 'manager', 'senior', 'junior', 'expert', 'specialist', 'lead',
      'transition', 'planning', 'path', 'growth', 'development', 'skills'
    ];

    const words = message.toLowerCase().split(/\s+/);
    const foundKeywords = keywords.filter(keyword =>
      words.some(word => word.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(word))
    );

    if (foundKeywords.length >= 2) {
      return this.cleanAndFormatTitle(foundKeywords.slice(0, 3).join(' '));
    }

    return this.extractFirstPhrase(message);
  }

  // Method 3: AI-powered title generation (using OpenRouter)
  static async generateAIPoweredTitle(message: string): Promise<string | null> {
    try {
      if (!OPENROUTER_API_KEY) {
        console.warn('OpenRouter API key not found, skipping AI-powered title generation');
        return null;
      }

      const prompt = `Generate a concise, descriptive title (max 8 words) for a conversation based on this user message about SAP career development. Focus on the main topic, intent, or goal. Be specific but brief.

User message: "${message}"

Title:`;

      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'SAP Career Coach Title Generator'
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-8b-instruct:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        console.error('OpenRouter API error:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      const title = data.choices?.[0]?.message?.content?.trim();

      if (title && title.length > 3 && title.length < 60) {
        return this.cleanAndFormatTitle(title);
      }
    } catch (error) {
      console.error('AI title generation failed:', error);
    }

    return null; // Return null to indicate fallback should be used
  }

  // Method 4: Fallback simple truncation
  static generateFallbackTitle(message: string): string {
    // Remove common filler words and clean up
    const cleaned = message
      .replace(/^(hi|hello|hey|can you|could you|would you|please|i want|i need|i'm|i am|what|how|when|where|why|can|should|do you|are you)\s+/i, '')
      .replace(/[\?\!\.\,]+$/, '')
      .trim();

    if (cleaned.length <= 50) {
      return this.cleanAndFormatTitle(cleaned);
    }

    // Find a good break point (end of sentence or word boundary)
    const sentences = cleaned.split(/[.!?]/);
    if (sentences[0] && sentences[0].length <= 47) {
      return this.cleanAndFormatTitle(sentences[0].trim());
    }

    // Find word boundary near 47 characters
    const truncated = cleaned.substring(0, 47);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 20) {
      return this.cleanAndFormatTitle(truncated.substring(0, lastSpace)) + '...';
    }

    return this.cleanAndFormatTitle(truncated) + '...';
  }

  // Helper: Clean and format title
  private static cleanAndFormatTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/^[-—\s]+|[-—\s]+$/g, '') // Remove leading/trailing punctuation
      .replace(/^(a|an|the)\s+/i, '') // Remove articles
      .replace(/\b(i'm|i am|want to|need to|can you|could you|would you|please)\b/gi, '') // Remove common verbs
      .replace(/\s+/g, ' ') // Re-normalize spaces
      .trim()
      .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
  }

  // Helper: Extract first meaningful phrase
  private static extractFirstPhrase(message: string): string {
    const words = message.split(/\s+/).filter(word => word.length > 2);
    const phrase = words.slice(0, Math.min(8, words.length)).join(' ');

    if (phrase.length < 10) {
      return this.generateFallbackTitle(message);
    }

    return this.cleanAndFormatTitle(phrase);
  }

  // Main method to generate title using all strategies
  static async generateTitle(message: string): Promise<string> {
    console.log('Starting title generation for message:', message.substring(0, 50) + '...');

    // Try AI-powered generation first
    const aiTitle = await this.generateAIPoweredTitle(message);
    if (aiTitle) {
      console.log('Generated AI-powered title:', aiTitle);
      return aiTitle;
    }

    console.log('AI generation failed, trying pattern-based generation');

    // Try pattern-based generation
    const patternTitle = this.generatePatternBasedTitle(message);
    if (patternTitle && patternTitle.length > 5) {
      console.log('Generated pattern-based title:', patternTitle);
      return patternTitle;
    }

    console.log('Pattern generation insufficient, trying keyword-based generation');

    // Try keyword-based generation
    const keywordTitle = this.generateKeywordBasedTitle(message);
    if (keywordTitle && keywordTitle !== patternTitle) {
      console.log('Generated keyword-based title:', keywordTitle);
      return keywordTitle;
    }

    console.log('All methods insufficient, using fallback generation');

    // Fallback to simple truncation
    const fallbackTitle = this.generateFallbackTitle(message);
    console.log('Generated fallback title:', fallbackTitle);
    return fallbackTitle;
  }
}

// PUT /api/conversations/generate-title - Generate intelligent title for conversation
export async function PUT(request: NextRequest) {
  try {
    console.log('Title generation endpoint called');

    const supabase = await createClient();
    const { message, sessionId } = await request.json();

    console.log('Received request with message:', message?.substring(0, 50) + '...');
    console.log('Session ID:', sessionId);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication failed:', userError);
      console.error('User error details:', userError);
      return NextResponse.json(
        {
          error: "Unauthorized - Please log in first",
          details: "This endpoint requires authentication. Make sure you're logged in and have valid session cookies.",
          code: "AUTH_REQUIRED"
        },
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
      console.error('Employee lookup failed:', empError);
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      );
    }

    console.log('Starting title generation process...');

    // Generate intelligent title
    const generatedTitle = await ConversationTitleGenerator.generateTitle(message);

    console.log('Title generated successfully:', generatedTitle);

    // Update conversation title if sessionId is provided
    if (sessionId) {
      console.log('Updating conversation title in database...');

      const { error: updateError } = await serviceSupabase
        .from('employee_conversation_sessions')
        .update({
          title: generatedTitle,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('employee_id', employee.id);

      if (updateError) {
        console.error('❌ Error updating conversation title in database:', updateError);
        return NextResponse.json(
          { error: 'Failed to update conversation title' },
          { status: 500 }
        );
      }

      console.log('✅ Conversation title updated successfully in database:', generatedTitle);
    }

    return NextResponse.json({
      success: true,
      title: generatedTitle,
      sessionId: sessionId || null
    });

  } catch (error) {
    console.error('Unexpected error in title generation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
