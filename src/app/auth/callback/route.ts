import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectParam = requestUrl.searchParams.get('redirect')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      
      // Check if error is due to email already existing with different provider
      // This happens when user has email/password account and tries to login with Google
      if (error.message?.includes('already registered') || error.message?.includes('email already exists')) {
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('This email is already registered with email/password. Please sign in with your password or enable account linking in Supabase settings.')}`
        )
      }
      
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data?.user) {
      // If there's a redirect parameter, use it
      if (redirectParam) {
        return NextResponse.redirect(decodeURIComponent(redirectParam))
      }

      // Check if user has a workspace
      const { data: workspaces } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', data.user.id)
        .limit(1)

      if (workspaces && workspaces.length > 0) {
        return NextResponse.redirect(`${origin}/dashboard`)
      } else {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  // Default redirect if no code or user
  return NextResponse.redirect(`${origin}/onboarding`)
}

