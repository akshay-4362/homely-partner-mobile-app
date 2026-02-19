// Homelyo Brand Colors - Purple/Indigo theme (distinct from UrbanClap green)
export const Colors = {
  // Brand
  primary: '#6366F1',         // Indigo - Homelyo signature
  primaryDark: '#4F46E5',
  primaryLight: '#A5B4FC',
  primaryBg: '#EEF2FF',       // Light indigo bg for cards

  // Backgrounds
  background: '#F7F8FC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // Status
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',

  // Purple (accent)
  purple: '#8B5CF6',
  purpleBg: '#F5F3FF',

  // Borders & dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#F1F5F9',

  // Grays
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  // Status badges
  confirmed: '#3B82F6',
  confirmedBg: '#EFF6FF',
  inProgress: '#F59E0B',
  inProgressBg: '#FFFBEB',
  completed: '#10B981',
  completedBg: '#ECFDF5',
  cancelled: '#EF4444',
  cancelledBg: '#FEF2F2',

  // Shadows
  shadowColor: '#000000',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: Colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary },
  h3: { fontSize: 18, fontWeight: '600' as const, color: Colors.textPrimary },
  h4: { fontSize: 16, fontWeight: '600' as const, color: Colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, color: Colors.textPrimary },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary },
  caption: { fontSize: 11, fontWeight: '500' as const, color: Colors.textTertiary },
  label: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary, letterSpacing: 0.5 },
};
