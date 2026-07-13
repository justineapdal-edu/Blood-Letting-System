import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — ignore
          }
        },
      },
    }
  )
}

export function createServerClientForProxy(requestCookies: { getAll: () => { name: string; value: string }[]; set: (name: string, value: string, options?: Record<string, unknown>) => void }) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return requestCookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            requestCookies.set(name, value, options)
          )
        },
      },
    }
  )
}
