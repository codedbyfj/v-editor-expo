/**
 * VEditor Dark Theme Design System
 */

export const Colors = {
    // Primary backgrounds
    background: '#0A0A0F',
    surface: '#14141F',
    surfaceElevated: '#1C1C2E',
    surfaceHighlight: '#242438',

    // Primary accent
    primary: '#6C5CE7',
    primaryLight: '#8B7CF6',
    primaryDark: '#5A4BD6',
    primaryMuted: 'rgba(108, 92, 231, 0.15)',

    // Secondary accent
    accent: '#00D2FF',
    accentMuted: 'rgba(0, 210, 255, 0.15)',

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0B8',
    textMuted: '#6B6B80',
    textInverse: '#0A0A0F',

    // Semantic
    success: '#00C48C',
    warning: '#FFB800',
    error: '#FF4D6A',
    info: '#00B4D8',

    // Borders
    border: '#2A2A3E',
    borderLight: '#3A3A50',
    borderFocused: '#6C5CE7',

    // Timeline-specific
    timelineTrack: '#1A1A2C',
    timelineClip: '#6C5CE7',
    timelinePlayhead: '#FF4D6A',
    timelineTrimHandle: '#00D2FF',
    timelineWaveform: '#4A4A6A',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.4)',

    // Transparent
    transparent: 'transparent',
} as const;

export const Typography = {
    title: {
        fontSize: 28,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
        color: Colors.textPrimary,
    },
    heading: {
        fontSize: 22,
        fontWeight: '600' as const,
        letterSpacing: -0.3,
        color: Colors.textPrimary,
    },
    subheading: {
        fontSize: 17,
        fontWeight: '600' as const,
        color: Colors.textPrimary,
    },
    body: {
        fontSize: 15,
        fontWeight: '400' as const,
        color: Colors.textSecondary,
    },
    caption: {
        fontSize: 13,
        fontWeight: '400' as const,
        color: Colors.textMuted,
    },
    button: {
        fontSize: 16,
        fontWeight: '600' as const,
        letterSpacing: 0.3,
    },
    mono: {
        fontSize: 13,
        fontWeight: '400' as const,
        fontFamily: 'monospace',
        color: Colors.textMuted,
    },
} as const;

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
} as const;

export const BorderRadius = {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 999,
} as const;

export const Shadows = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    glow: (color: string = Colors.primary) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    }),
} as const;

export const Animation = {
    fast: 150,
    normal: 250,
    slow: 400,
    spring: {
        damping: 15,
        stiffness: 150,
        mass: 0.8,
    },
} as const;
