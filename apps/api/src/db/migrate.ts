import { readFileSync } from 'fs'
import { join } from 'path'
import { query } from './client'

export async function runMigrations(): Promise<void> {
  const migrationsDir = join(__dirname, 'migrations')
  const migrationFiles = ['001_form_connections.sql', '002_add_token_column.sql']

  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8')
    await query(sql)
    console.log(`Migration applied: ${file}`)
  }
}
