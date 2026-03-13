export function formatDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(value?: string | null) {
  if (!value) {
    return '';
  }

  const [hours, minutes] = String(value).split(':');
  const parsedHours = Number.parseInt(hours, 10);
  if (!Number.isFinite(parsedHours)) {
    return value;
  }

  const suffix = parsedHours >= 12 ? 'PM' : 'AM';
  const hour12 = parsedHours % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value || 0));
}

export function todayKey() {
  return new Date().toISOString().split('T')[0];
}
