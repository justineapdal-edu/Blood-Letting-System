import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let serviceClient: ReturnType<typeof createClient<any, 'public', any>> | null = null

export function getSupabaseServiceClient() {
  if (serviceClient) return serviceClient

  serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  return serviceClient
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rpc(client: any, fn: string, args?: Record<string, unknown>) {
  return client.rpc(fn, args)
}

export { getSupabaseServiceClient as createServiceClient }
