"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = require("fs");
const path_1 = require("path");
const client_1 = require("./client");
async function runMigrations() {
    const migrationsDir = (0, path_1.join)(__dirname, 'migrations');
    const migrationFiles = ['001_form_connections.sql'];
    for (const file of migrationFiles) {
        const sql = (0, fs_1.readFileSync)((0, path_1.join)(migrationsDir, file), 'utf-8');
        await (0, client_1.query)(sql);
        console.log(`Migration applied: ${file}`);
    }
}
