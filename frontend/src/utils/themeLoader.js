import api from './api';

export const normalizeThemeScope = (scope) => (
  String(scope || '').toLowerCase() === 'parent' ? 'parent' : 'staff'
);

export const fetchPublicTheme = async (scope) => {
  const normalizedScope = normalizeThemeScope(scope);
  const response = await api.get('/themes/public-active', {
    params: { scope: normalizedScope },
  });
  return response.data?.theme || null;
};
