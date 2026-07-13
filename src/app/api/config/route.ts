export async function GET() {
  const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000'
  return Response.json({ portalUrl })
}
