import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message ?? 'Logout failed' },
      { status: 500 }
    )
  }
}
