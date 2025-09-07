import { NextResponse } from "next/server";

export async function GET() {
  // Skip authentication for this test endpoint
  const response = NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "Set" : "Not Set",
    VERCEL_URL: process.env.VERCEL_URL,
    CAREER_COACH_WS_URL: process.env.CAREER_COACH_WS_URL,
    hasEnvVars: !!(process.env.NEXT_PUBLIC_SUPABASE_URL &&
                   (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ||
                    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)),
    hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
    message: "Environment variables loaded from root directory"
  });

  // Skip auth middleware for this test
  response.headers.set('x-skip-auth', 'true');
  return response;
}
