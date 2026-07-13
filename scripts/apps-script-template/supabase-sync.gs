/**
 * Google Apps Script - Blood Donor Data Sync to Supabase
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet -> Extensions -> Apps Script
 * 2. Delete any existing code and paste this entire script
 * 3. Update the configuration variables below
 * 4. Run setupTrigger() to create a time-driven trigger (runs every hour)
 * 5. Run syncToSupabase() manually to test the connection
 *
 * HOW IT WORKS:
 * - This script runs on a time-driven trigger (e.g., every hour)
 * - It reads all rows from the spreadsheet
 * - It UPSERTs (insert or update) each row into your Supabase table
 * - Uses the service_role key for full database access
 *
 * SECURITY:
 * - The service_role key has full access to your database
 * - Keep it secure and never expose it in client-side code
 * - This script runs server-side in Google's infrastructure
 */

// ==================== CONFIGURATION ====================
// Replace these with your actual values

const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key-here';
const TABLE_NAME = 'donor_records'; // The Supabase table to upsert into

// ==================== MAIN FUNCTION ====================

/**
 * Main sync function - reads spreadsheet and upserts to Supabase
 * Runs on time-driven trigger (e.g., every hour)
 */
function syncToSupabase() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) {
    Logger.log('No data rows found (only header or empty sheet)');
    return;
  }
  
  // First row is headers
  const headers = data[0].map(h => sanitizeColumnName(h));
  const rows = data.slice(1).filter(row => row.some(cell => cell !== ''));
  
  Logger.log(`Found ${rows.length} rows to sync`);
  
  // Process in batches of 100 (Supabase REST API limit)
  const BATCH_SIZE = 100;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const payload = batch.map(row => {
      const record = {};
      headers.forEach((header, idx) => {
        const value = row[idx];
        record[header] = value !== null && value !== undefined ? String(value) : null;
      });
      return record;
    });
    
    try {
      const result = upsertBatch(payload);
      successCount += result.successCount;
      errorCount += result.errorCount;
    } catch (error) {
      Logger.log(`Batch error at offset ${i}: ${error.toString()}`);
      errorCount += batch.length;
    }
    
    // Rate limiting - wait 100ms between batches
    if (i + BATCH_SIZE < rows.length) {
      Utilities.sleep(100);
    }
  }
  
  Logger.log(`Sync complete: ${successCount} upserted, ${errorCount} errors`);
  
  // Update last sync timestamp in form_connections table
  updateLastSyncTimestamp();
}

// ==================== SUPABASE API FUNCTIONS ====================

/**
 * Upsert a batch of records to Supabase using PostgREST API
 */
function upsertBatch(records) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE_NAME}`;
  
  const options = {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates', // This enables UPSERT
    },
    payload: JSON.stringify(records),
    muteHttpExceptions: true,
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  
  if (statusCode === 200 || statusCode === 201) {
    Logger.log(`Batch upserted successfully: ${records.length} records`);
    return { successCount: records.length, errorCount: 0 };
  } else {
    const errorText = response.getContentText();
    Logger.log(`Upsert failed (${statusCode}): ${errorText}`);
    
    // If table doesn't exist, try to create it
    if (statusCode === 404 || (statusCode === 400 && errorText.includes('does not exist'))) {
      Logger.log('Table not found, attempting to create...');
      if (createTable(records[0])) {
        // Retry the upsert
        const retryResponse = UrlFetchApp.fetch(url, options);
        if (retryResponse.getResponseCode() === 200 || retryResponse.getResponseCode() === 201) {
          return { successCount: records.length, errorCount: 0 };
        }
      }
    }
    
    return { successCount: 0, errorCount: records.length };
  }
}

/**
 * Create the Supabase table if it doesn't exist
 * Uses Supabase SQL API to execute DDL
 */
function createTable(sampleRecord) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  
  // Build CREATE TABLE statement based on sample record
  let createSQL = `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  
  // Add columns based on sample record keys
  Object.keys(sampleRecord).forEach(key => {
    if (key !== 'id' && key !== 'created_at') {
      createSQL += `, ${key} TEXT`;
    }
  });
  
  createSQL += ')';
  
  // Use the SQL endpoint directly
  const sqlUrl = `${SUPABASE_URL}/sql`;
  const sqlOptions = {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({ query: createSQL }),
    muteHttpExceptions: true,
  };
  
  const response = UrlFetchApp.fetch(sqlUrl, sqlOptions);
  if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
    Logger.log('Table created successfully');
    return true;
  } else {
    Logger.log(`Table creation failed: ${response.getContentText()}`);
    return false;
  }
}

/**
 * Update the last_synced_at timestamp in form_connections table
 */
function updateLastSyncTimestamp() {
  const url = `${SUPABASE_URL}/rest/v1/form_connections`;
  
  const options = {
    method: 'PATCH',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    payload: JSON.stringify({
      last_synced_at: new Date().toISOString(),
      table_name: TABLE_NAME,
    }),
    muteHttpExceptions: true,
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    Logger.log(`Failed to update sync timestamp: ${error.toString()}`);
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Sanitize column names to match PostgreSQL conventions
 */
function sanitizeColumnName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '') // Remove special chars
    .replace(/\s+/g, '_')          // Spaces to underscores
    .replace(/^(\d)/, 'col_$1')    // Prefix with col_ if starts with digit
    .replace(/_+/g, '_')           // Collapse multiple underscores
    .replace(/^_|_$/g, '');        // Trim leading/trailing underscores
}

// ==================== TRIGGER SETUP ====================

/**
 * Run this function ONCE to set up the time-driven trigger
 * This will create a trigger that runs syncToSupabase() every hour
 */
function setupTrigger() {
  // Remove any existing sync triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncToSupabase') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('Removed existing sync trigger.');
    }
  });
  
  // Create new time-driven trigger (runs every hour)
  ScriptApp.newTrigger('syncToSupabase')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log('Time-driven trigger created! Script will run every hour.');
  Logger.log('You can also run syncToSupabase() manually to test.');
}

/**
 * Remove the time-driven trigger
 */
function removeTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncToSupabase') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('Sync trigger removed.');
    }
  });
}

// ==================== TESTING ====================

/**
 * Test function - syncs just the first 5 rows
 */
function testSync() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) {
    Logger.log('No data to test with');
    return;
  }
  
  const headers = data[0].map(h => sanitizeColumnName(h));
  const testRows = data.slice(1, 6).filter(row => row.some(cell => cell !== ''));
  
  if (testRows.length === 0) {
    Logger.log('No non-empty rows to test with');
    return;
  }
  
  const payload = testRows.map(row => {
    const record = {};
    headers.forEach((header, idx) => {
      const value = row[idx];
      record[header] = value !== null && value !== undefined ? String(value) : null;
    });
    return record;
  });
  
  Logger.log(`Testing with ${payload.length} rows...`);
  Logger.log(`Sample record: ${JSON.stringify(payload[0])}`);
  
  const result = upsertBatch(payload);
  Logger.log(`Test complete: ${result.successCount} upserted, ${result.errorCount} errors`);
}

/**
 * View the current spreadsheet data as JSON
 */
function previewData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) {
    Logger.log('No data');
    return;
  }
  
  const headers = data[0].map(h => sanitizeColumnName(h));
  const rows = data.slice(1, 6).filter(row => row.some(cell => cell !== ''));
  
  const preview = rows.map(row => {
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = row[idx];
    });
    return record;
  });
  
  Logger.log(`Headers: ${JSON.stringify(headers)}`);
  Logger.log(`First ${preview.length} rows:\n${JSON.stringify(preview, null, 2)}`);
}
