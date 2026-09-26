export const theme = {
  colors: {
    background: '#0F172A', // Slate 900
    surface: '#1E293B',    // Slate 800
    surfaceElevated: '#334155', // Slate 700
    glassBackground: 'rgba(30, 41, 59, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',

    primary: '#6366F1',       // Indigo 500
    primaryHover: '#4F46E5',  // Indigo 600
    primaryLight: '#818CF8',  // Indigo 400
    primaryGlow: 'rgba(99, 102, 241, 0.25)',

    secondary: '#10B981',     // Emerald 500
    secondaryGlow: 'rgba(16, 185, 129, 0.2)',

    warning: '#F59E0B',       // Amber 500
    warningGlow: 'rgba(245, 158, 11, 0.2)',

    danger: '#EF4444',        // Red 500
    dangerGlow: 'rgba(239, 68, 68, 0.2)',

    textPrimary: '#F8FAFC',   // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    textMuted: '#64748B',     // Slate 500

    border: '#334155',
    borderLight: '#475569',
    inputBg: '#1E293B',
    cardBg: '#1E293B',
  },
  typography: {
    fontFamily: 'System',
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 22,
      xxl: 28,
      hero: 34,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
    lg: {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 10,
    },
  },
};
