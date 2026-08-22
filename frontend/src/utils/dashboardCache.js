// ---------------------------------------------------------------
// Dashboard summary cache (per user, localStorage)
// Fresh snapshots skip the network entirely; older ones are shown
// instantly and refreshed in the background (stale-while-revalidate).
// ---------------------------------------------------------------
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
    // ignore quota / serialization errors
  }
}

// Called by App whenever the user's projects change (submit/delete) so the
// next Dashboard visit fetches fresh summary data instead of trusting a
// snapshot that predates the change.
export function invalidateDashboardCache(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(dashboardCacheKey(userId));
  } catch {
    // ignore storage errors
  }
}
