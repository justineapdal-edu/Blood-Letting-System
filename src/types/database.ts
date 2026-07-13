export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      form_connections: {
        Row: {
          id: string
          name: string
          token: string | null
          spreadsheet_id: string
          sheet_url: string
          table_name: string
          column_metadata: Json
          active: boolean
          last_synced_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          token?: string | null
          spreadsheet_id?: string
          sheet_url?: string
          table_name: string
          column_metadata?: Json
          active?: boolean
          last_synced_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          token?: string | null
          spreadsheet_id?: string
          sheet_url?: string
          table_name?: string
          column_metadata?: Json
          active?: boolean
          last_synced_at?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
