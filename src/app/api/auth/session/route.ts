import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return Response.json(
        { success: false, authenticated: false }
      )
    }

    return Response.json({
      success: true,
      authenticated: true,
      data: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        },
      },
    })
  } catch (error: any) {
    return Response.json(
      { success: false, authenticated: false, error: error.message },
      { status: 500 }
    )
  }
}
