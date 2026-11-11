import type { Request, Response } from 'express';

const LTA_DATAMALL_ENDPOINT = 'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival';

/**
 * Serverless / Express proxy endpoint to fetch real-time bus arrivals from LTA Datamall v3
 * GET /api/nextbus?BusStopCode=83139&ServiceNo=15
 * Header required by upstream: AccountKey
 */
export default async function nextBusHandler(req: Request, res: Response) {
  try {
    // Read query parameters supporting both camelCase and PascalCase
    const busStopCode = (req.query.BusStopCode || req.query.busStopCode || req.query.stopId || '') as string;
    const serviceNo = (req.query.ServiceNo || req.query.serviceNo || '') as string;

    if (!busStopCode) {
      return res.status(400).json({
        error: 'Missing required query parameter: BusStopCode',
        example: '/api/nextbus?BusStopCode=83139&ServiceNo=15',
      });
    }

    const accountKey =
      process.env.LTA_DATAMALL_ACCOUNT_KEY ||
      process.env.LTA_ACCOUNT_KEY ||
      process.env.ACCOUNT_KEY ||
      '';

    if (!accountKey || accountKey.trim() === '') {
      // Key not configured yet: notify user gracefully so app does not crash
      return res.status(200).json({
        status: 'notice',
        configured: false,
        message:
          'LTA_DATAMALL_ACCOUNT_KEY is not yet configured in environment. Please add LTA_DATAMALL_ACCOUNT_KEY="<your_key>" to your .env file.',
        BusStopCode: busStopCode,
        Services: [],
      });
    }

    // Construct LTA DataMall v3 URL
    const url = new URL(LTA_DATAMALL_ENDPOINT);
    url.searchParams.append('BusStopCode', busStopCode.trim());
    if (serviceNo && serviceNo.trim() !== '') {
      url.searchParams.append('ServiceNo', serviceNo.trim());
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 8000);

    const ltaResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        AccountKey: accountKey.trim(),
        accept: 'application/json',
      },
      signal: abortController.signal,
    });

    clearTimeout(timeout);

    if (!ltaResponse.ok) {
      const errorText = await ltaResponse.text();
      return res.status(ltaResponse.status).json({
        error: `LTA DataMall responded with HTTP status ${ltaResponse.status}`,
        details: errorText,
        busStopCode,
      });
    }

    const data = await ltaResponse.json();

    // Cache-Control headers: LTA updates bus arrivals every 20 seconds
    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=5');
    return res.status(200).json({
      ...data,
      configured: true,
      cachedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Upstream LTA DataMall request timed out after 8 seconds.',
      });
    }

    return res.status(500).json({
      error: 'Failed to communicate with LTA DataMall service.',
      details: error?.message || String(error),
    });
  }
}
