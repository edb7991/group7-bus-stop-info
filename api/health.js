/**
 * Health check endpoint for the LTA transit connection
 * GET /api/health
 */
export default async function healthHandler(req, res) {
  const ltaKey =
    process.env.LTA_DATAMALL_ACCOUNT_KEY ||
    process.env.LTA_ACCOUNT_KEY ||
    process.env.ACCOUNT_KEY;

  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');
  res.status(200).json({
    status: 'ok',
    service: 'smu-bus-transit-api',
    timestamp: new Date().toISOString(),
    ltaKeyConfigured: Boolean(ltaKey && ltaKey.trim() !== ''),
    endpoints: {
      feed: '/api/feed',
      bus: '/api/bus?BusStopCode=83139&ServiceNo=15',
      nextBus: '/api/nextbus?BusStopCode=83139&ServiceNo=15',
      health: '/api/health',
      ltaDocumentation: 'https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html',
    },
  });
}
