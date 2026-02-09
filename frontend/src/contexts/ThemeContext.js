import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();
const GOOGLE_FONTS_BASE_URL = 'https://fonts.googleapis.com/css2';
const THEME_FONT_WEIGHTS = '300;400;500;600;700';
const LITTLE_SPARROWS_THEME_SLUG = 'little-sparrows-public';

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
    success: '#2F9E6A',
    danger: '#D04B45',
    card_colors: ['#E5D4ED', '#B8E6D5', '#FFF4CC', '#FFDCC8'],
    card_text_colors: ['#44403C', '#44403C', '#44403C', '#44403C'],
  },
  fonts: {
    heading: 'Quicksand',
    body: 'Inter',
    script: 'Dancing Script',
    import_url:
      'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Dancing+Script:wght@400;500;600;700&display=swap',
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

const hexToRgbParts = (hex) => {
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
    return { r, g, b };
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return null;
    }
    return { r, g, b };
  }
  return null;
};

const mixHexColors = (baseHex, blendHex, blendWeight = 0.5) => {
  const base = hexToRgbParts(baseHex);
  const blend = hexToRgbParts(blendHex);
  if (!base && !blend) {
    return null;
  }
  if (!base) {
    return blendHex;
  }
  if (!blend) {
    return baseHex;
  }
  const weight = Math.min(Math.max(blendWeight, 0), 1);
  const r = Math.round(base.r * (1 - weight) + blend.r * weight);
  const g = Math.round(base.g * (1 - weight) + blend.g * weight);
  const b = Math.round(base.b * (1 - weight) + blend.b * weight);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
};

const parseOpacity = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, 0), 1);
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

const stripFontQuotes = (value) => String(value || '').trim().replace(/^["']|["']$/g, '');

const sanitizeFontFamily = (value, fallback) => {
  const normalized = stripFontQuotes(value);
  if (normalized && !/^[A-Za-z0-9\- ]+$/.test(normalized)) {
    return stripFontQuotes(fallback);
  }
  if (!normalized) {
    return stripFontQuotes(fallback);
  }
  return normalized;
};

const buildFontStack = (fontFamily, fallbackStack) => {
  const normalized = stripFontQuotes(fontFamily);
  if (!normalized) {
    return fallbackStack;
  }
  const quotedFont = normalized.includes(' ') ? `"${normalized}"` : normalized;
  return `${quotedFont}, ${fallbackStack}`;
};

const buildGoogleFontsImportUrl = (fontFamilies) => {
  const uniqueFamilies = Array.from(
    new Set(
      (fontFamilies || [])
        .map((family) => stripFontQuotes(family))
        .filter((family) => /^[A-Za-z0-9\- ]+$/.test(family))
    )
  );

  if (uniqueFamilies.length === 0) {
    return null;
  }

  const queries = uniqueFamilies.map((family) => (
    `family=${family.trim().replace(/\s+/g, '+')}:wght@${THEME_FONT_WEIGHTS}`
  ));

  return `${GOOGLE_FONTS_BASE_URL}?${queries.join('&')}&display=swap`;
};

const resolveThemeFontImportUrl = (fonts) => {
  const explicitImportUrl = typeof fonts?.import_url === 'string' ? fonts.import_url.trim() : '';
  if (explicitImportUrl) {
    return explicitImportUrl;
  }

  return buildGoogleFontsImportUrl([fonts?.heading, fonts?.body, fonts?.script]);
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
  const background = palette.background || defaultTheme.palette.background;
  const surface = palette.surface || defaultTheme.palette.surface;
  const accent = palette.accent || defaultTheme.palette.accent;
  const border = palette.border || defaultTheme.palette.border;
  const warmedBackground = mixHexColors(background, accent, 0.16) || background;
  const warmedBorder = mixHexColors(border, accent, 0.18) || border;
  const backdrop = palette.app_backdrop || 'rgba(0, 0, 0, 0)';

  root.style.setProperty('--primary', palette.primary);
  root.style.setProperty('--primary-dark', palette.primary_dark);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--background', warmedBackground);
  root.style.setProperty('--surface', surface);
  root.style.setProperty('--text', palette.text);
  root.style.setProperty('--muted', palette.muted);
  root.style.setProperty('--border', warmedBorder);
  root.style.setProperty('--on-primary', palette.on_primary);
  root.style.setProperty('--on-accent', palette.on_accent);
  root.style.setProperty('--app-backdrop', backdrop);

  const primaryRgb = hexToRgb(palette.primary);
  if (primaryRgb) {
    root.style.setProperty('--primary-rgb', primaryRgb);
  }
  const accentRgb = hexToRgb(palette.accent) || primaryRgb;
  if (accentRgb) {
    root.style.setProperty('--accent-rgb', accentRgb);
    root.style.setProperty('--bubble-bg', `rgba(${accentRgb}, 0.16)`);
    root.style.setProperty('--bubble-border', `rgba(${accentRgb}, 0.32)`);
    root.style.setProperty('--bubble-bg-strong', `rgba(${accentRgb}, 0.24)`);
    root.style.setProperty('--card-tint', `rgba(${accentRgb}, 0.12)`);
  }

  const menuBg = theme?.id === 1
    ? surface
    : (palette.menu_bg || surface || palette.background || palette.surface);
  const menuBorder = palette.menu_border || border;
  const menuText = palette.menu_text || palette.text || palette.muted;
  const menuActiveBg = palette.menu_active_bg || accent;
  const menuActiveText = palette.menu_active_text || palette.primary_dark || palette.primary;
  const menuAccent = palette.menu_accent || palette.primary;
  const menuShadowRgb = hexToRgb(menuAccent);
  const menuShadow = menuShadowRgb ? `rgba(${menuShadowRgb}, 0.24)` : 'rgba(0, 0, 0, 0.12)';

  root.style.setProperty('--menu-bg', menuBg);
  root.style.setProperty('--menu-border', menuBorder);
  root.style.setProperty('--menu-text', menuText);
  root.style.setProperty('--menu-active-bg', menuActiveBg);
  root.style.setProperty('--menu-active-text', menuActiveText);
  root.style.setProperty('--menu-accent', menuAccent);
  root.style.setProperty('--menu-shadow', menuShadow);

  const parentBackgroundImage = palette.parent_background_image || 'none';
  const parentOverlay = palette.parent_overlay || 'rgba(0, 0, 0, 0)';
  const parentShellBg = palette.parent_shell_bg || '#f7f7f5';
  const parentShellGradient = palette.parent_shell_gradient
    || 'none';
  const parentText = palette.parent_text || '#1f2937';
  const parentTextMuted = palette.parent_text_muted || '#6b7280';

  const parentCardBaseColor = palette.parent_card_base || palette.surface || '#ffffff';
  const parentCardBaseRgb = hexToRgb(parentCardBaseColor) || '255, 255, 255';

  const parentBorderBaseColor = palette.parent_border_base || palette.parent_card_border || '#f3f4f6';
  const parentBorderRgb = hexToRgb(parentBorderBaseColor) || '243, 244, 246';

  const parentSoftBaseColor = palette.parent_soft_base || palette.parent_button_bg || '#5bbcbe';
  const parentSoftRgb = hexToRgb(parentSoftBaseColor) || '91, 188, 190';

  const parentPillBaseColor = palette.parent_pill_base || palette.parent_button_bg || '#5bbcbe';
  const parentPillRgb = hexToRgb(parentPillBaseColor) || '91, 188, 190';

  const parentCardBg = palette.parent_card_bg
    || `rgba(${parentCardBaseRgb}, ${parseOpacity(palette.parent_card_alpha, 1)})`;
  const parentCardBgStrong = palette.parent_card_bg_strong
    || `rgba(${parentCardBaseRgb}, ${parseOpacity(palette.parent_card_alpha_strong, 1)})`;
  const parentCardBorder = palette.parent_card_border
    || `rgba(${parentBorderRgb}, ${parseOpacity(palette.parent_border_alpha, 1)})`;
  const parentSoftBg = palette.parent_soft_bg
    || `rgba(${parentSoftRgb}, ${parseOpacity(palette.parent_soft_alpha, 0.12)})`;
  const parentSoftBgHover = palette.parent_soft_bg_hover
    || `rgba(${parentSoftRgb}, ${parseOpacity(palette.parent_soft_hover_alpha, 0.18)})`;
  const parentPillBg = palette.parent_pill_bg
    || `rgba(${parentPillRgb}, ${parseOpacity(palette.parent_pill_alpha, 0.18)})`;
  const parentPillText = palette.parent_pill_text || parentText;
  const parentTableHeadBg = palette.parent_table_head_bg
    || '#f9fafb';
  const parentInputBg = palette.parent_input_bg || '#ffffff';
  const parentInputBorder = palette.parent_input_border
    || '#e5e7eb';
  const parentButtonBg = palette.parent_button_bg || '#5bbcbe';
  const parentButtonHover = palette.parent_button_hover || '#3ea1a3';
  const parentButtonText = palette.parent_button_text || palette.on_primary || defaultTheme.palette.on_primary;
  const parentHeaderBg = palette.parent_header_bg || '#ffffff';
  const parentHeaderBorder = palette.parent_header_border || parentCardBorder;
  const parentNavText = palette.parent_nav_text || '#6b7280';
  const parentNavActiveText = palette.parent_nav_active_text || '#318285';
  const parentNavIndicator = palette.parent_nav_indicator || '#5bbcbe';
  const parentBrandColor = palette.parent_brand_color || parentNavIndicator;
  const parentIconBg = palette.parent_icon_bg || parentSoftBg;
  const parentIconText = palette.parent_icon_text || '#5bbcbe';
  const parentIconBorder = palette.parent_icon_border || parentCardBorder;
  const parentCardShadow = palette.parent_card_shadow || '0 1px 2px rgba(0, 0, 0, 0.04)';
  const parentCardShadowStrong = palette.parent_card_shadow_strong || '0 4px 10px rgba(0, 0, 0, 0.08)';
  const parentCardHoverBorder = palette.parent_card_hover_border || '#dbe5e8';
  const parentTableRowHover = palette.parent_table_row_hover || parentSoftBg;
  const parentPillBorder = palette.parent_pill_border || '#bceceb';
  const parentFocusRing = palette.parent_focus_ring || `rgba(${primaryRgb || parentSoftRgb}, 0.28)`;
  const parentButtonSoftBg = palette.parent_button_soft_bg || parentInputBg;
  const parentButtonSoftText = palette.parent_button_soft_text || '#318285';
  const parentButtonSoftBorder = palette.parent_button_soft_border || '#bceceb';
  const parentButtonSoftHover = palette.parent_button_soft_hover || parentSoftBg;

  root.style.setProperty('--parent-bg-image', parentBackgroundImage);
  root.style.setProperty('--parent-bg-overlay', parentOverlay);
  root.style.setProperty('--parent-shell-bg', parentShellBg);
  root.style.setProperty('--parent-shell-gradient', parentShellGradient);
  root.style.setProperty('--parent-text', parentText);
  root.style.setProperty('--parent-text-muted', parentTextMuted);
  root.style.setProperty('--parent-card-bg', parentCardBg);
  root.style.setProperty('--parent-card-bg-strong', parentCardBgStrong);
  root.style.setProperty('--parent-card-border', parentCardBorder);
  root.style.setProperty('--parent-soft-bg', parentSoftBg);
  root.style.setProperty('--parent-soft-bg-hover', parentSoftBgHover);
  root.style.setProperty('--parent-pill-bg', parentPillBg);
  root.style.setProperty('--parent-pill-text', parentPillText);
  root.style.setProperty('--parent-table-head-bg', parentTableHeadBg);
  root.style.setProperty('--parent-input-bg', parentInputBg);
  root.style.setProperty('--parent-input-border', parentInputBorder);
  root.style.setProperty('--parent-button-bg', parentButtonBg);
  root.style.setProperty('--parent-button-hover', parentButtonHover);
  root.style.setProperty('--parent-button-text', parentButtonText);
  root.style.setProperty('--parent-header-bg', parentHeaderBg);
  root.style.setProperty('--parent-header-border', parentHeaderBorder);
  root.style.setProperty('--parent-nav-text', parentNavText);
  root.style.setProperty('--parent-nav-active-text', parentNavActiveText);
  root.style.setProperty('--parent-nav-indicator', parentNavIndicator);
  root.style.setProperty('--parent-brand-color', parentBrandColor);
  root.style.setProperty('--parent-icon-bg', parentIconBg);
  root.style.setProperty('--parent-icon-text', parentIconText);
  root.style.setProperty('--parent-icon-border', parentIconBorder);
  root.style.setProperty('--parent-card-shadow', parentCardShadow);
  root.style.setProperty('--parent-card-shadow-strong', parentCardShadowStrong);
  root.style.setProperty('--parent-card-hover-border', parentCardHoverBorder);
  root.style.setProperty('--parent-table-row-hover', parentTableRowHover);
  root.style.setProperty('--parent-pill-border', parentPillBorder);
  root.style.setProperty('--parent-focus-ring', parentFocusRing);
  root.style.setProperty('--parent-button-soft-bg', parentButtonSoftBg);
  root.style.setProperty('--parent-button-soft-text', parentButtonSoftText);
  root.style.setProperty('--parent-button-soft-border', parentButtonSoftBorder);
  root.style.setProperty('--parent-button-soft-hover', parentButtonSoftHover);

  root.style.setProperty('--success', palette.success || defaultTheme.palette.success);
  root.style.setProperty('--danger', palette.danger || defaultTheme.palette.danger);

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

  const isLittleSparrowsTheme = String(theme?.slug || '').toLowerCase() === LITTLE_SPARROWS_THEME_SLUG;
  let headingFont = sanitizeFontFamily(fonts.heading, defaultTheme.fonts.heading);
  const bodyFont = sanitizeFontFamily(fonts.body, defaultTheme.fonts.body);
  const scriptFont = sanitizeFontFamily(fonts.script, defaultTheme.fonts.script);
  if (isLittleSparrowsTheme) {
    // Keep admin/educator typography aligned with parent portal for this theme.
    headingFont = bodyFont;
  }
  const fontImportUrl = resolveThemeFontImportUrl({
    ...fonts,
    heading: headingFont,
    body: bodyFont,
    script: scriptFont,
  });

  root.style.setProperty('--font-heading', buildFontStack(headingFont, 'sans-serif'));
  root.style.setProperty('--font-body', buildFontStack(bodyFont, 'system-ui, sans-serif'));
  root.style.setProperty('--font-script', buildFontStack(scriptFont, 'cursive'));
  ensureFontImport(fontImportUrl || defaultTheme.fonts.import_url);
};

const getInitialDensity = () => {
  if (typeof window === 'undefined') {
    return 'comfortable';
  }
  const stored = window.localStorage.getItem('uiDensity');
  return stored === 'compact' ? 'compact' : 'comfortable';
};

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState(defaultTheme);
  const [density, setDensityState] = useState(getInitialDensity);
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
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

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

  const updateDensity = (nextDensity) => {
    const normalized = nextDensity === 'compact' ? 'compact' : 'comfortable';
    setDensityState(normalized);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-density', normalized);
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('uiDensity', normalized);
    }
  };

  const value = useMemo(() => ({
    theme,
    loading,
    setTheme: updateTheme,
    density,
    setDensity: updateDensity,
  }), [theme, loading, density]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
