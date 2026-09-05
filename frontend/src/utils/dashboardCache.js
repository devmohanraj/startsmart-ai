// localStorage summary cache; fresh snapshots skip the network, stale ones render then revalidate.
export const DASHBOARD_CACHE_TTL = 60 * 1000;

export function dashboardCacheKey(userId) {
  return `startsmart_dashboard_summary_${userId}`;
}

export function readDashboardCache(userId) {
  if (!userId) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(dashboardCacheKey(userId)));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.data ||
      typeof parsed.timestamp !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDashboardCache(userId, data) {
  if (!userId || !data) return;
  try {
    localStorage.setItem(
      dashboardCacheKey(userId),
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch {
    // Best-effort persistence; quota/serialization failures are dropped.
  }
}

export function invalidateDashboardCache(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(dashboardCacheKey(userId));
  } catch {
    // Best-effort invalidation; stale data is corrected by the TTL on next read.
  }
}
