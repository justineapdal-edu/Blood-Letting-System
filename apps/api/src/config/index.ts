export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
  },
  cors: {
    allowedOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  google: {
    sheetsApiKey: process.env.GOOGLE_SHEETS_API_KEY ?? '',
  },
  portalUrl: process.env.PORTAL_URL ?? 'http://localhost:4000',
}
