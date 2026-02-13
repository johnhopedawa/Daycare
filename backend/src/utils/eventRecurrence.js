const RECURRING_VALUES = new Set(['MONTHLY', 'ANNUAL']);

const toUpper = (value, fallback = 'NONE') => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value).trim().toUpperCase();
};

const parseDateOnly = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate()
    ));
  }

  const text = String(value).split('T')[0];
  const [year, month, day] = text.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDateOnly = (value) => {
  const date = parseDateOnly(value);
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const daysInMonth = (year, monthIndex) => (
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
);

const buildDate = (year, monthIndex, day) => {
  const safeDay = Math.min(day, daysInMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, safeDay));
};

const compareDates = (a, b) => a.getTime() - b.getTime();

const isWithinRange = (date, start, end) => (
  compareDates(date, start) >= 0 && compareDates(date, end) <= 0
);

const cloneEventWithDate = (event, date) => ({
  ...event,
  event_date: formatDateOnly(date),
});

const expandEventForRange = (event, startDate, endDate) => {
  const baseDate = parseDateOnly(event.event_date);
  if (!baseDate) return [];

  const recurrence = toUpper(event.recurrence, 'NONE');

  if (!RECURRING_VALUES.has(recurrence)) {
    if (!isWithinRange(baseDate, startDate, endDate)) return [];
    return [cloneEventWithDate(event, baseDate)];
  }

  const results = [];
  const baseYear = baseDate.getUTCFullYear();
  const baseMonth = baseDate.getUTCMonth();
  const baseDay = baseDate.getUTCDate();

  if (recurrence === 'ANNUAL') {
    const startYear = Math.max(startDate.getUTCFullYear(), baseYear);
    const endYear = endDate.getUTCFullYear();

    for (let year = startYear; year <= endYear; year += 1) {
      const occurrence = buildDate(year, baseMonth, baseDay);
      if (compareDates(occurrence, baseDate) < 0) continue;
      if (!isWithinRange(occurrence, startDate, endDate)) continue;
      results.push(cloneEventWithDate(event, occurrence));
    }
    return results;
  }

  const startMonthIndex = Math.max(
    baseYear * 12 + baseMonth,
    startDate.getUTCFullYear() * 12 + startDate.getUTCMonth()
  );
  const endMonthIndex = endDate.getUTCFullYear() * 12 + endDate.getUTCMonth();

  for (let monthIndex = startMonthIndex; monthIndex <= endMonthIndex; monthIndex += 1) {
    const year = Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const occurrence = buildDate(year, month, baseDay);
    if (compareDates(occurrence, baseDate) < 0) continue;
    if (!isWithinRange(occurrence, startDate, endDate)) continue;
    results.push(cloneEventWithDate(event, occurrence));
  }

  return results;
};

const compareEvents = (left, right) => {
  const leftDate = String(left.event_date || '');
  const rightDate = String(right.event_date || '');
  if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);

  const leftTime = String(left.start_time || '99:99:99');
  const rightTime = String(right.start_time || '99:99:99');
  if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);

  return Number(left.id || 0) - Number(right.id || 0);
};

const expandEventsForRange = (events, options) => {
  const fromDate = parseDateOnly(options?.from);
  const toDate = parseDateOnly(options?.to);

  if (!fromDate || !toDate || compareDates(fromDate, toDate) > 0) {
    return [];
  }

  const expanded = [];
  (events || []).forEach((event) => {
    expanded.push(...expandEventForRange(event, fromDate, toDate));
  });

  expanded.sort(compareEvents);

  const limit = Number(options?.limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return expanded;
  }

  return expanded.slice(0, limit);
};

module.exports = {
  expandEventsForRange,
  formatDateOnly,
  parseDateOnly,
};
