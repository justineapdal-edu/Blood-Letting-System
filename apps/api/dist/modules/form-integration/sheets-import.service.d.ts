export declare class SheetsImportService {
    static extractSpreadsheetId(url: string): string;
    static buildExportUrl(spreadsheetId: string): string;
    static fetchCsvData(spreadsheetId: string): Promise<string>;
    static parseCsv(csvText: string): {
        headers: string[];
        rows: string[][];
    };
    static sanitizeColumnName(header: string): string;
    static sanitizeTableName(identifierName: string): string;
    static createDynamicTable(tableName: string, sanitizedColumns: string[]): Promise<void>;
    static batchInsertRows(tableName: string, sanitizedColumns: string[], rows: string[][]): Promise<number>;
    static connectSheet(name: string, url: string): Promise<{
        connection: any;
        rowCount: number;
    }>;
    static listConnections(): Promise<any[]>;
    static syncSheet(connectionId: string): Promise<{
        rowCount: number;
    }>;
    static disconnectSheet(connectionId: string): Promise<void>;
}
export declare class SheetsImportError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
