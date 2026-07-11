"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const migrate_1 = require("./db/migrate");
const sheets_import_controller_1 = require("./modules/form-integration/sheets-import.controller");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: config_1.config.cors.origin }));
app.use(express_1.default.json());
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/sheets', sheets_import_controller_1.sheetsImportRouter);
async function start() {
    try {
        await (0, migrate_1.runMigrations)();
        app.listen(config_1.config.port, () => {
            console.log(`API server running on http://localhost:${config_1.config.port}`);
        });
    }
    catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}
start();
