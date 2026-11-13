/**
 * EcoMutare Theme Colors
 * Purposeful palette prioritizing green eco identity, modern dark/light neutrals, and transport modes.
 */

export const colors = {
  // Eco Brand Colors
  primary: '#10B981',       // Emerald Green (action, eco, vitality)
  primaryLight: '#D1FAE5',  // Soft emerald surface
  primaryDark: '#047857',   // Deep green
  secondary: '#0EA5E9',     // Cyan / Sky (transit, water)
  accent: '#F59E0B',        // Amber (points, warnings)

  // Transport Modes Colors (High contrast, standard mapping)
  modes: {
    walking: '#10B981',       // Green
    bicycle: '#059669',       // Deep Green
    scooter: '#14B8A6',       // Teal
    publicTransit: '#3B82F6', // Transit Blue
    carpooling: '#8B5CF6',    // Purple
    carWithParking: '#64748B',// Slate Grey (baseline)
  },

  // Surfaces & Backgrounds
  background: '#F8FAFC',    // Light cool slate background
  surface: '#FFFFFF',       // Card / modal white
  surfaceMuted: '#F1F5F9',  // Subtle grey container
  border: '#E2E8F0',        // Border outline
  borderHover: '#CBD5E1',

  // Typography
  textPrimary: '#0F172A',   // Slate 900 (high contrast readable text)
  textSecondary: '#64748B', // Slate 500 (labels, subtitles)
  textMuted: '#94A3B8',     // Slate 400 (hints, placeholder)
  textInverse: '#FFFFFF',

  // Feedback & Status
  success: '#10B981',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Overlays
  overlay: 'rgba(15, 23, 42, 0.45)',
  mapPolylineInactive: '#94A3B8',
};
