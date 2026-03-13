export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function buildQueryString(query?: Record<string, string | number | boolean | undefined | null>) {
  if (!query) {
    return '';
  }

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return params.length > 0 ? `?${params.join('&')}` : '';
}

function buildRequestUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | undefined | null>) {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}${buildQueryString(query)}`;
}

export async function requestJson<T>({
  baseUrl,
  path,
  method = 'GET',
  token,
  body,
  query,
}: {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}): Promise<T> {
  const response = await fetch(buildRequestUrl(baseUrl, path, query), {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
