const borderRadius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
const NAV_BG = '#0D2461';

export const corporateTheme = {
  dark: false,
  navBg: NAV_BG,
  background: '#F0F4F9',
  surface: '#FFFFFF',
  card: '#F7F9FC',
  accent: '#2563EB',
  accentSubtle: '#EFF6FF',
  accentPressed: '#1D4ED8',
  success: '#059669',
  successSubtle: '#ECFDF5',
  error: '#DC2626',
  errorSubtle: '#FEF2F2',
  warning: '#D97706',
  warningSubtle: '#FFFBEB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E9F0',
  borderStrong: '#CBD5E1',
  borderRadius,
};

export const corporateDarkTheme = {
  dark: true,
  navBg: NAV_BG,
  background: '#0D1421',
  surface: '#1A2540',
  card: '#1E2D4A',
  accent: '#3B82F6',
  accentSubtle: '#1E3A5F',
  accentPressed: '#2563EB',
  success: '#10B981',
  successSubtle: '#052E1C',
  error: '#EF4444',
  errorSubtle: '#2D0E0E',
  warning: '#F59E0B',
  warningSubtle: '#2D1F00',
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  textMuted: '#475569',
  border: '#263354',
  borderStrong: '#2D4070',
  borderRadius,
};

// Legacy aliases
export const darkTheme = corporateDarkTheme;
export const lightTheme = corporateTheme;
export const blueTheme = corporateTheme;
export const theme = corporateTheme;
