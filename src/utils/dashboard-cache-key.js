export const buildDashboardCacheKey = (
  name,
  { period, startDate, endDate, limit } = {},
) => {
  return [
    "dashboard",
    name,
    period || "all",
    startDate || "none",
    endDate || "none",
    limit || "none",
  ].join(":");
};