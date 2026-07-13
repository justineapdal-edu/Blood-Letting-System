import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return Response.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || email.split('@')[0],
        },
      },
    })

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    // If email confirmation is required, user won't have a session
    if (data.user && !data.session) {
      return Response.json({
        success: true,
        message: 'Account created. Please check your email to confirm your account.',
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          requiresConfirmation: true,
        },
      })
    }

    return Response.json({
      success: true,
      data: {
        user: {
          id: data.user!.id,
          email: data.user!.email,
          name: data.user!.user_metadata?.full_name || data.user!.email?.split('@')[0],
        },
        session: {
          access_token: data.session!.access_token,
          expires_at: data.session!.expires_at,
        },
      },
    })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Signup failed' },
      { status: 500 }
    )
  }
}
