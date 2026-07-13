import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }

    return Response.json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
        },
        session: {
          access_token: data.session.access_token,
          expires_at: data.session.expires_at,
        },
      },
    })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Login failed' },
      { status: 500 }
    )
  }
}
