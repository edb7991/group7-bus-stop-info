import { getBoardReading, getSimulatedBoardReading } from './bus.js';

/**
 * Escapes &, <, >, ", ' for safe XML text
 */
function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Computes Singapore Time (UTC+8) and quarter-hour rounded formats
 */
function getSingaporeTimes(date = new Date()) {
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const sgtNow = new Date(date.getTime() + SGT_OFFSET_MS);

  const year = sgtNow.getUTCFullYear();
  const month = String(sgtNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(sgtNow.getUTCDate()).padStart(2, '0');
  const hour = String(sgtNow.getUTCHours()).padStart(2, '0');
  const minute = String(sgtNow.getUTCMinutes()).padStart(2, '0');
  const second = String(sgtNow.getUTCSeconds()).padStart(2, '0');

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[sgtNow.getUTCDay()];
  const monthName = months[sgtNow.getUTCMonth()];

  // Round DOWN to the quarter hour (:00, :15, :30, :45)
  const rawMin = sgtNow.getUTCMinutes();
  const roundedMin = String(Math.floor(rawMin / 15) * 15).padStart(2, '0');

  const isoRounded = `${year}-${month}-${day}T${hour}:${roundedMin}+08:00`;
  const guid = `g7-board-${isoRounded}`;

  // RFC 822 format for pubDate based on the rounded time
  const roundedDate = new Date(
    Date.UTC(year, sgtNow.getUTCMonth(), sgtNow.getUTCDate(), sgtNow.getUTCHours(), parseInt(roundedMin, 10), 0)
  );
  const roundedDayName = days[roundedDate.getUTCDay()];
  const pubDate = `${roundedDayName}, ${day} ${monthName} ${year} ${hour}:${roundedMin}:00 +0800`;

  // RFC 822 for lastBuildDate (exact current reading time)
  const lastBuildDate = `${dayName}, ${day} ${monthName} ${year} ${hour}:${minute}:${second} +0800`;

  // Clean reading time for description
  const readingTimeStr = `${day} ${monthName} ${year}, ${hour}:${minute}:${second} SGT (UTC+8)`;

  return {
    isoRounded,
    guid,
    pubDate,
    lastBuildDate,
    readingTimeStr,
  };
}

/**
 * Builds the plain text description of bus services for all stops on the board
 */
function buildPlainTextDescription(stops, readingTimeStr) {
  const sections = [];

  for (const stop of stops) {
    const lines = [`Stop ${stop.stopId} (${stop.stopName}):`];
    if (!stop.services || stop.services.length === 0) {
      lines.push('  No active bus services reported.');
    } else {
      for (const svc of stop.services) {
        if (svc.nextBus2Minutes !== null && svc.nextBus2Minutes !== undefined) {
          lines.push(`  - Bus ${svc.serviceNo}: ${svc.nextBusMinutes} min, ${svc.nextBus2Minutes} min`);
        } else {
          lines.push(`  - Bus ${svc.serviceNo}: ${svc.nextBusMinutes} min`);
        }
      }
    }
    sections.push(lines.join('\n'));
  }

  sections.push(`Reading time: ${readingTimeStr}`);
  return sections.join('\n\n');
}

/**
 * Express / serverless handler for GET /api/feed
 * Responds with RSS 2.0 XML feed of the app's own live reading
 */
export default async function feedHandler(req, res) {
  // 1. Determine site address from Host header
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http') || 'https';
  const siteUrl = `${proto}://${host}`;

  const nowMs = Date.now();
  const times = getSingaporeTimes(new Date(nowMs));

  // 2. Fetch live board reading or handle test/mock override
  const isMockRequested = req.query && (req.query.mock === '1' || req.query.test === '1');
  let readingResult = isMockRequested ? getSimulatedBoardReading() : await getBoardReading(nowMs);

  let itemTitle = '';
  let itemDescription = '';

  // 3. Evaluate source status
  if (!readingResult.ok) {
    // If a source fails or a key is missing:
    // Item title starts with "Check failed:" and names the source and its HTTP status
    const sourceName = readingResult.source || 'LTA DataMall';
    const httpStatus = readingResult.status || 500;
    itemTitle = `Check failed: ${sourceName} HTTP ${httpStatus}`;

    // Plain text description without leaking any secret keys
    itemDescription = [
      `Check failed: ${sourceName} HTTP ${httpStatus}.`,
      readingResult.status === 401
        ? 'AccountKey is missing or not configured in environment variables. Please configure LTA_DATAMALL_ACCOUNT_KEY in .env.'
        : `Upstream error encountered while querying bus arrival feed: ${readingResult.error || 'Unknown error'}`,
      `Reading time: ${times.readingTimeStr}`,
    ].join('\n\n');
  } else {
    // Live reading succeeded:
    // Title: every stop on the board with its soonest bus (e.g. 04121 bus 7 in 2 min; then the next stop)
    const titleParts = [];
    for (const stop of readingResult.stops) {
      if (stop.soonestBus) {
        titleParts.push(`${stop.stopId} bus ${stop.soonestBus.serviceNo} in ${stop.soonestBus.minutes} min`);
      } else {
        titleParts.push(`${stop.stopId} no buses in service`);
      }
    }
    itemTitle = titleParts.join('; ');

    // Plain text description: services with next two buses in minutes, then reading time
    itemDescription = buildPlainTextDescription(readingResult.stops, times.readingTimeStr);
  }

  // 4. Construct Item Link with ?reading= and rounded quarter-hour time
  const itemLink = `${siteUrl}/?reading=${times.isoRounded}`;

  // 5. Build RSS 2.0 XML
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml('SMU Transit Board - Real-Time Bus Departures')}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml('Live bus arrival readings and run calculator for stops around Singapore Management University')}</description>
    <lastBuildDate>${escapeXml(times.lastBuildDate)}</lastBuildDate>
    <item>
      <title>${escapeXml(itemTitle)}</title>
      <description>${escapeXml(itemDescription)}</description>
      <link>${escapeXml(itemLink)}</link>
      <guid isPermaLink="false">${escapeXml(times.guid)}</guid>
      <pubDate>${escapeXml(times.pubDate)}</pubDate>
    </item>
  </channel>
</rss>`;

  // 6. Set response headers
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');
  res.status(200).send(rssXml);
}
