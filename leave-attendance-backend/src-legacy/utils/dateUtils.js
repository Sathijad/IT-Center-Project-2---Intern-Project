export function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Inclusive
}

export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function isValidDateRange(startDate, endDate) {
  return new Date(endDate) >= new Date(startDate);
}

