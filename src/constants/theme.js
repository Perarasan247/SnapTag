const borderRadius = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, full: 999 };

export const darkTheme = {
  dark: true,
  background: '#080808',
  surface: '#111111',
  card: '#181818',
  accent: '#2563EB',
  accentSubtle: '#1E3A5F',
  accentPressed: '#1D4ED8',
  success: '#10B981',
  successSubtle: '#052E1C',
  error: '#EF4444',
  errorSubtle: '#2D0E0E',
  warning: '#F59E0B',
  warningSubtle: '#2D1F00',
  textPrimary: '#F5F5F5',
  textSecondary: '#737373',
  textMuted: '#3D3D3D',
  border: '#1F1F1F',
  borderStrong: '#2D2D2D',
  borderRadius,
};

export const lightTheme = {
  dark: false,
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#EBEBEB',
  accent: '#2563EB',
  accentSubtle: '#DBEAFE',
  accentPressed: '#1D4ED8',
  success: '#059669',
  successSubtle: '#D1FAE5',
  error: '#DC2626',
  errorSubtle: '#FEE2E2',
  warning: '#D97706',
  warningSubtle: '#FEF3C7',
  textPrimary: '#111111',
  textSecondary: '#525252',
  textMuted: '#A3A3A3',
  border: '#E5E5E5',
  borderStrong: '#D4D4D4',
  borderRadius,
};

// Default export kept for any legacy static usage
export const theme = darkTheme;
