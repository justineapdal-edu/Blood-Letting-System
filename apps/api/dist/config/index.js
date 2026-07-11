"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: parseInt(process.env.PORT ?? '4000', 10),
    database: {
        url: process.env.DATABASE_URL ?? '',
    },
    jwt: {
        secret: process.env.JWT_SECRET ?? '',
    },
    cors: {
        origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    },
};
