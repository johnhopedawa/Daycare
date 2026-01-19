const sanitizeFileNamePart = (value) => {
  if (!value) return 'Unknown';
  const cleaned = String(value)
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Unknown';
};

const formatYearMonth = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'UnknownDate';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const buildPdfFileName = (prefix, dateString, name) => {
  const safePrefix = sanitizeFileNamePart(prefix || 'Document');
  const safeName = sanitizeFileNamePart(name || 'Unknown');
  const yearMonth = formatYearMonth(dateString);
  return `${safePrefix}_${yearMonth}_${safeName}.pdf`;
};
