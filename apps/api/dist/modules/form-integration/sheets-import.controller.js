"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sheetsImportRouter = void 0;
const express_1 = require("express");
const sheets_import_service_1 = require("./sheets-import.service");
exports.sheetsImportRouter = (0, express_1.Router)();
function handleError(res, err) {
    if (err instanceof sheets_import_service_1.SheetsImportError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
        });
        return;
    }
    console.error('Unexpected error:', err);
    res.status(500).json({
        success: false,
        error: 'An internal server error occurred. Please try again.',
    });
}
exports.sheetsImportRouter.post('/connect', async (req, res) => {
    try {
        const { name, url } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({
                success: false,
                error: 'Sheet Identifier Name is required.',
            });
            return;
        }
        if (!url || typeof url !== 'string' || !url.trim()) {
            res.status(400).json({
                success: false,
                error: 'Google Sheets URL is required.',
            });
            return;
        }
        const { connection, rowCount } = await sheets_import_service_1.SheetsImportService.connectSheet(name.trim(), url.trim());
        res.status(201).json({
            success: true,
            data: {
                id: connection.id,
                name: connection.name,
                spreadsheetId: connection.spreadsheet_id,
                sheetUrl: connection.sheet_url,
                tableName: connection.table_name,
                columnMetadata: connection.column_metadata,
                active: connection.active,
                lastSyncedAt: connection.last_synced_at,
                createdAt: connection.created_at,
            },
            rowCount,
            message: `Successfully connected "${name}" and imported ${rowCount} rows.`,
        });
    }
    catch (err) {
        handleError(res, err);
    }
});
exports.sheetsImportRouter.get('/', async (_req, res) => {
    try {
        const connections = await sheets_import_service_1.SheetsImportService.listConnections();
        res.json({
            success: true,
            data: connections.map((c) => ({
                id: c.id,
                name: c.name,
                spreadsheetId: c.spreadsheet_id,
                sheetUrl: c.sheet_url,
                tableName: c.table_name,
                columnMetadata: c.column_metadata,
                active: c.active,
                lastSyncedAt: c.last_synced_at,
                createdAt: c.created_at,
            })),
        });
    }
    catch (err) {
        handleError(res, err);
    }
});
exports.sheetsImportRouter.post('/:id/sync', async (req, res) => {
    try {
        const id = String(req.params.id);
        const { rowCount } = await sheets_import_service_1.SheetsImportService.syncSheet(id);
        res.json({
            success: true,
            rowCount,
            lastSyncedAt: new Date().toISOString(),
            message: `Sync complete. ${rowCount} rows imported.`,
        });
    }
    catch (err) {
        handleError(res, err);
    }
});
exports.sheetsImportRouter.delete('/:id', async (req, res) => {
    try {
        const id = String(req.params.id);
        await sheets_import_service_1.SheetsImportService.disconnectSheet(id);
        res.json({
            success: true,
            message: 'Sheet disconnected and dynamic table dropped.',
        });
    }
    catch (err) {
        handleError(res, err);
    }
});
