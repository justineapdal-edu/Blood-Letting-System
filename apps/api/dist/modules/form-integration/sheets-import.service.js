"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetsImportError = exports.SheetsImportService = void 0;
const sync_1 = require("csv-parse/sync");
const client_1 = require("../../db/client");
const SPREADSHEET_ID_REGEX = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;
class SheetsImportService {
    static extractSpreadsheetId(url) {
        const match = url.match(SPREADSHEET_ID_REGEX);
        if (!match) {
            throw new SheetsImportError('Invalid Google Sheets URL format. Please provide a valid Google Sheets URL.', 400);
        }
        return match[1];
    }
    static buildExportUrl(spreadsheetId) {
        return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    }
    static async fetchCsvData(spreadsheetId) {
        const url = this.buildExportUrl(spreadsheetId);
        let res;
        try {
            res = await fetch(url);
        }
        catch (err) {
            throw new SheetsImportError('Unable to reach Google Sheets. Please check your network and try again.', 502);
        }
        if (res.status === 401 || res.status === 403) {
            throw new SheetsImportError("Unable to access sheet. Please ensure 'Anyone with the link can view' is enabled.", 403);
        }
        if (res.status === 404) {
            throw new SheetsImportError('Spreadsheet not found. Please check the URL and try again.', 404);
        }
        if (!res.ok) {
            throw new SheetsImportError(`Google Sheets returned an unexpected error (HTTP ${res.status}). Please try again.`, 502);
        }
        return res.text();
    }
    static parseCsv(csvText) {
        const records = (0, sync_1.parse)(csvText, {
            skip_empty_lines: true,
            trim: true,
        });
        if (records.length === 0) {
            throw new SheetsImportError('The sheet appears to be empty. Please add data rows before importing.', 400);
        }
        const headers = records[0];
        const rows = records.slice(1).filter((row) => row.some((cell) => cell.trim() !== ''));
        if (headers.length === 0) {
            throw new SheetsImportError('No column headers found in the sheet. Please ensure the first row contains headers.', 400);
        }
        return { headers, rows };
    }
    static sanitizeColumnName(header) {
        let name = header
            .toLowerCase()
            .replace(/[^a-z0-9\s_]/g, '')
            .replace(/[\s]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        if (!name || /^\d/.test(name)) {
            name = `col_${name}`;
        }
        return name || 'col_unnamed';
    }
    static sanitizeTableName(identifierName) {
        let name = identifierName
            .toLowerCase()
            .replace(/[^a-z0-9\s_]/g, '')
            .replace(/[\s]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
        return `sheet_${name || 'unnamed'}`;
    }
    static async createDynamicTable(tableName, sanitizedColumns) {
        const columnDefs = sanitizedColumns
            .map((col) => `"${col}" TEXT`)
            .join(', ');
        await (0, client_1.query)(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ${columnDefs},
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    }
    static async batchInsertRows(tableName, sanitizedColumns, rows) {
        if (rows.length === 0)
            return 0;
        const BATCH_SIZE = 500;
        let totalInserted = 0;
        await (0, client_1.transaction)(async (client) => {
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                const placeholders = [];
                const values = [];
                let paramIndex = 1;
                for (const row of batch) {
                    const rowPlaceholders = sanitizedColumns
                        .map(() => `$${paramIndex++}`)
                        .join(', ');
                    placeholders.push(`(${rowPlaceholders})`);
                    for (let j = 0; j < sanitizedColumns.length; j++) {
                        values.push(row[j] ?? null);
                    }
                }
                const insertQuery = `
          INSERT INTO "${tableName}" (${sanitizedColumns.map((c) => `"${c}"`).join(', ')})
          VALUES ${placeholders.join(', ')}
        `;
                const result = await client.query(insertQuery, values);
                totalInserted += result.rowCount ?? 0;
            }
        });
        return totalInserted;
    }
    static async connectSheet(name, url) {
        const spreadsheetId = this.extractSpreadsheetId(url);
        const csvText = await this.fetchCsvData(spreadsheetId);
        const { headers, rows } = this.parseCsv(csvText);
        const sanitizedColumns = headers.map((h) => this.sanitizeColumnName(h));
        const tableName = this.sanitizeTableName(name);
        const existing = await (0, client_1.query)('SELECT id FROM form_connections WHERE table_name = $1', [tableName]);
        if (existing.rows.length > 0) {
            throw new SheetsImportError(`A sheet with the name "${name}" is already connected. Please choose a different name.`, 409);
        }
        await this.createDynamicTable(tableName, sanitizedColumns);
        await this.batchInsertRows(tableName, sanitizedColumns, rows);
        const columnMetadata = headers.map((h, i) => ({
            key: sanitizedColumns[i],
            label: h,
            type: 'text',
        }));
        const result = await (0, client_1.query)(`INSERT INTO form_connections (name, spreadsheet_id, sheet_url, table_name, column_metadata, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`, [name, spreadsheetId, url, tableName, JSON.stringify(columnMetadata)]);
        return { connection: result.rows[0], rowCount: rows.length };
    }
    static async listConnections() {
        const result = await (0, client_1.query)('SELECT * FROM form_connections ORDER BY created_at DESC');
        return result.rows;
    }
    static async syncSheet(connectionId) {
        const result = await (0, client_1.query)('SELECT * FROM form_connections WHERE id = $1 AND active = true', [connectionId]);
        if (result.rows.length === 0) {
            throw new SheetsImportError('Connected sheet not found or has been deactivated.', 404);
        }
        const connection = result.rows[0];
        const csvText = await this.fetchCsvData(connection.spreadsheet_id);
        const { headers, rows } = this.parseCsv(csvText);
        const sanitizedColumns = headers.map((h) => this.sanitizeColumnName(h));
        const tableName = connection.table_name;
        await (0, client_1.transaction)(async (client) => {
            await client.query(`TRUNCATE "${tableName}"`);
            const columnDefs = sanitizedColumns.map((col) => `"${col}" TEXT`).join(', ');
            await client.query(`DROP TABLE IF EXISTS "${tableName}"`);
            await client.query(`
        CREATE TABLE "${tableName}" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ${columnDefs},
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
            const BATCH_SIZE = 500;
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                const placeholders = [];
                const values = [];
                let paramIndex = 1;
                for (const row of batch) {
                    const rowPlaceholders = sanitizedColumns
                        .map(() => `$${paramIndex++}`)
                        .join(', ');
                    placeholders.push(`(${rowPlaceholders})`);
                    for (let j = 0; j < sanitizedColumns.length; j++) {
                        values.push(row[j] ?? null);
                    }
                }
                await client.query(`INSERT INTO "${tableName}" (${sanitizedColumns.map((c) => `"${c}"`).join(', ')})
           VALUES ${placeholders.join(', ')}`, values);
            }
        });
        const columnMetadata = headers.map((h, i) => ({
            key: sanitizedColumns[i],
            label: h,
            type: 'text',
        }));
        await (0, client_1.query)(`UPDATE form_connections
       SET column_metadata = $1, last_synced_at = NOW()
       WHERE id = $2`, [JSON.stringify(columnMetadata), connectionId]);
        return { rowCount: rows.length };
    }
    static async disconnectSheet(connectionId) {
        const result = await (0, client_1.query)('SELECT * FROM form_connections WHERE id = $1', [connectionId]);
        if (result.rows.length === 0) {
            throw new SheetsImportError('Connected sheet not found.', 404);
        }
        const connection = result.rows[0];
        await (0, client_1.query)(`DROP TABLE IF EXISTS "${connection.table_name}"`);
        await (0, client_1.query)('DELETE FROM form_connections WHERE id = $1', [connectionId]);
    }
}
exports.SheetsImportService = SheetsImportService;
class SheetsImportError extends Error {
    statusCode;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'SheetsImportError';
    }
}
exports.SheetsImportError = SheetsImportError;
