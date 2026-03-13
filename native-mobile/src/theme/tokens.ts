import { UserRole } from '../types/domain';

export const fonts = {
  heading: 'Quicksand_700Bold',
  body: 'Inter_500Medium',
  bodyStrong: 'Inter_700Bold',
  bodySemiBold: 'Inter_600SemiBold',
};

export const rolePalettes = {
  ADMIN: {
    primary: '#FF9B85',
    primaryDark: '#E07A5F',
    accent: '#FFE5D9',
    background: '#FFF8F3',
    surface: '#FFFFFF',
    text: '#1C1917',
    muted: '#78716C',
    border: '#F1D8CC',
    success: '#15803D',
    warning: '#C2410C',
    danger: '#B91C1C',
  },
  EDUCATOR: {
    primary: '#FF9B85',
    primaryDark: '#E07A5F',
    accent: '#FFE5D9',
    background: '#FFF8F3',
    surface: '#FFFFFF',
    text: '#1C1917',
    muted: '#78716C',
    border: '#F1D8CC',
    success: '#15803D',
    warning: '#C2410C',
    danger: '#B91C1C',
  },
  PARENT: {
    primary: '#5BBCBE',
    primaryDark: '#318285',
    accent: '#DFF5F4',
    background: '#F5FBFB',
    surface: '#FFFFFF',
    text: '#1C1917',
    muted: '#5B6B6C',
    border: '#CDEBEA',
    success: '#15803D',
    warning: '#C2410C',
    danger: '#B91C1C',
  },
} as const;

export function getRolePalette(role: UserRole) {
  return rolePalettes[role];
}
