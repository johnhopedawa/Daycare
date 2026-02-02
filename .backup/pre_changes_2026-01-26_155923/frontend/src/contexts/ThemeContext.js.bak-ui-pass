import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

const defaultTheme = {
  id: 1,
  name: 'Default',
  palette: {
    primary: '#FF9B85',
    primary_dark: '#E07A5F',
    accent: '#FFE5D9',
    background: '#FFF8F3',
    surface: '#FFFFFF',
    text: '#1C1917',
    muted: '#78716C',
    border: '#FFE5D9',
    on_primary: '#FFFFFF',
    on_accent: '#7A3B2A',
    card_colors: ['#E5D4ED', '#B8E6D5', '#FFF4CC', '#FFDCC8'],
    card_text_colors: ['#44403C', '#44403C', '#44403C', '#44403C'],
  },
  fonts: {
    heading: 'Quicksand',
    body: 'Inter',
    import_url:
      'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap',
  },
};

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') {
    return null;
  }
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return null;
    }
    return `${r}, ${g}, ${b}`;
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return null;
    }
    return `${r}, ${g}, ${b}`;
  }
  return null;
};

const ensureFontImport = (importUrl) => {
  if (!importUrl) {
    return;
  }
  const existing = document.getElementById('theme-fonts');
  if (existing && existing.getAttribute('href') === importUrl) {
    return;
  }
  if (existing) {
    existing.setAttribute('href', importUrl);
    return;
  }
  const link = document.createElement('link');
  link.id = 'theme-fonts';
  link.rel = 'stylesheet';
  link.href = importUrl;
  document.head.appendChild(link);
};

const applyTheme = (theme) => {
  if (!theme || typeof document === 'undefined') {
    return;
  }
  let paletteInput = {};
  let fontsInput = {};
  if (theme.palette && typeof theme.palette === 'object') {
    paletteInput = theme.palette;
  } else if (typeof theme.palette === 'string') {
    try {
      paletteInput = JSON.parse(theme.palette);
    } catch (error) {
      paletteInput = {};
    }
  }
  if (theme.fonts && typeof theme.fonts === 'object') {
    fontsInput = theme.fonts;
  } else if (typeof theme.fonts === 'string') {
    try {
      fontsInput = JSON.parse(theme.fonts);
    } catch (error) {
      fontsInput = {};
    }
  }
  const palette = { ...defaultTheme.palette, ...paletteInput };
  const fonts = { ...defaultTheme.fonts, ...fontsInput };
  const root = document.documentElement;

  root.style.setProperty('--primary', palette.primary);
  root.style.setProperty('--primary-dark', palette.primary_dark);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--background', palette.background);
  root.style.setProperty('--surface', palette.surface);
  root.style.setProperty('--text', palette.text);
  root.style.setProperty('--muted', palette.muted);
  root.style.setProperty('--border', palette.border);
  root.style.setProperty('--on-primary', palette.on_primary);
  root.style.setProperty('--on-accent', palette.on_accent);

  const primaryRgb = hexToRgb(palette.primary);
  if (primaryRgb) {
    root.style.setProperty('--primary-rgb', primaryRgb);
  }

  const menuBg = theme?.id === 1
    ? defaultTheme.palette.surface
    : (palette.menu_bg || palette.background || palette.surface);
  const menuBorder = palette.menu_border || palette.border;
  const menuText = palette.menu_text || palette.muted || palette.text;
  const menuActiveBg = palette.menu_active_bg || palette.accent;
  const menuActiveText = palette.menu_active_text || palette.primary_dark || palette.primary;
  const menuAccent = palette.menu_accent || palette.primary;
  const menuShadowRgb = hexToRgb(menuAccent);
  const menuShadow = menuShadowRgb ? `rgba(${menuShadowRgb}, 0.25)` : 'rgba(0, 0, 0, 0.08)';

  root.style.setProperty('--menu-bg', menuBg);
  root.style.setProperty('--menu-border', menuBorder);
  root.style.setProperty('--menu-text', menuText);
  root.style.setProperty('--menu-active-bg', menuActiveBg);
  root.style.setProperty('--menu-active-text', menuActiveText);
  root.style.setProperty('--menu-accent', menuAccent);
  root.style.setProperty('--menu-shadow', menuShadow);

  let cardColors = defaultTheme.palette.card_colors;
  if (Array.isArray(palette.card_colors) && palette.card_colors.length > 0) {
    cardColors = palette.card_colors;
  } else if (typeof palette.card_colors === 'string') {
    try {
      const parsed = JSON.parse(palette.card_colors);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cardColors = parsed;
      }
    } catch (error) {
      cardColors = defaultTheme.palette.card_colors;
    }
  }
  if (theme?.id === 1) {
    cardColors = defaultTheme.palette.card_colors;
  } else if (cardColors.length === 0) {
    const fallbackColors = [
      palette.primary,
      palette.accent,
      palette.background,
      palette.surface,
    ].filter(Boolean);
    if (fallbackColors.length > 0) {
      cardColors = fallbackColors;
    }
  }
  const previousCardCount = parseInt(root.style.getPropertyValue('--card-count'), 10) || 0;
  const resolvedCardColors = cardColors.length > 0 ? cardColors : defaultTheme.palette.card_colors;
  const maxCardSlots = Math.max(
    previousCardCount,
    resolvedCardColors.length,
    defaultTheme.palette.card_colors.length
  );
  const expandedCardColors = [...resolvedCardColors];
  while (expandedCardColors.length < maxCardSlots) {
    expandedCardColors.push(
      resolvedCardColors[expandedCardColors.length % resolvedCardColors.length]
    );
  }
  expandedCardColors.forEach((color, index) => {
    root.style.setProperty(`--card-${index + 1}`, color);
  });
  root.style.setProperty('--card-count', String(resolvedCardColors.length));

  let cardTextColors = defaultTheme.palette.card_text_colors;
  if (Array.isArray(palette.card_text_colors) && palette.card_text_colors.length > 0) {
    cardTextColors = palette.card_text_colors;
  } else if (typeof palette.card_text_colors === 'string') {
    try {
      const parsed = JSON.parse(palette.card_text_colors);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cardTextColors = parsed;
      }
    } catch (error) {
      cardTextColors = defaultTheme.palette.card_text_colors;
    }
  }
  if (theme?.id === 1 || cardTextColors.length === 0) {
    cardTextColors = defaultTheme.palette.card_text_colors;
  }
  const resolvedCardTextColors = cardTextColors.length > 0
    ? cardTextColors
    : defaultTheme.palette.card_text_colors;
  const expandedCardTextColors = [...resolvedCardTextColors];
  while (expandedCardTextColors.length < maxCardSlots) {
    expandedCardTextColors.push(
      resolvedCardTextColors[expandedCardTextColors.length % resolvedCardTextColors.length]
    );
  }
  expandedCardTextColors.forEach((color, index) => {
    root.style.setProperty(`--card-text-${index + 1}`, color);
  });

  root.style.setProperty('--font-heading', fonts.heading || defaultTheme.fonts.heading);
  root.style.setProperty('--font-body', fonts.body || defaultTheme.fonts.body);
  ensureFontImport(fonts.import_url);
};

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState(defaultTheme);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cachedTheme = localStorage.getItem('theme');
    if (cachedTheme) {
      try {
        const parsed = JSON.parse(cachedTheme);
        setTheme(parsed);
        applyTheme(parsed);
        return;
      } catch (error) {
        // ignore cache errors
      }
    }
    applyTheme(defaultTheme);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    const loadTheme = async () => {
      try {
        setLoading(true);
        const response = await api.get('/themes/active');
        if (cancelled) {
          return;
        }
        if (response.data?.theme) {
          setTheme(response.data.theme);
          applyTheme(response.data.theme);
          localStorage.setItem('theme', JSON.stringify(response.data.theme));
        }
      } catch (error) {
        // fallback to cached/default theme
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTheme();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateTheme = (nextTheme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem('theme', JSON.stringify(nextTheme));
  };

  const value = useMemo(() => ({
    theme,
    loading,
    setTheme: updateTheme,
  }), [theme, loading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
