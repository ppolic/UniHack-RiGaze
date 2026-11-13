/** Official EcoMutare palette. Keep component colors behind semantic tokens. */
const brand = {
  green: '#237A50',
  forest: '#164D3B',
  lime: '#D3EF6A',
  petrol: '#287C86',
  natural: '#F7F9F3',
  mint: '#E8F3EB',
  white: '#FFFFFF',
  warning: '#925410',
  error: '#AE353D',
};

export const colors = {
  primary: brand.green,
  primaryLight: brand.mint,
  primaryDark: brand.forest,
  secondary: brand.petrol,
  accent: brand.lime,

  // Mode labels/icons must accompany colors; several modes share brand hues.
  modes: {
    walking: brand.green,
    bicycle: brand.forest,
    scooter: brand.petrol,
    publicTransit: brand.petrol,
    carpooling: brand.green,
    carWithParking: '#52665B',
  },

  background: brand.natural,
  surface: brand.white,
  surfaceMuted: brand.mint,
  surfaceDark: brand.forest,
  surfaceDarkRaised: brand.green,
  border: '#B5C8BB', // Decorative separators, not control boundaries.
  borderHover: brand.green,
  controlBorder: '#6B8174',

  textPrimary: brand.forest,
  textSecondary: '#52665B',
  textMuted: '#52665B', // Placeholders still require normal-text contrast.
  textInverse: brand.white,
  textOnDark: brand.mint,

  success: brand.green,
  successLight: brand.mint,
  warning: brand.warning,
  warningLight: '#FFF2DF',
  danger: brand.error,
  dangerLight: '#FCECEF',
  info: brand.petrol,
  infoLight: brand.natural,
  rewardBackground: brand.lime,
  rewardText: brand.forest,
  rewardBorder: brand.green,

  overlay: 'rgba(22, 77, 59, 0.45)',
  mapLabelBackground: brand.forest,
  mapBadgeBackground: brand.white,
  mapWater: brand.mint,
  mapPolylineInactive: '#6B8174',
  onDarkHighlight: 'rgba(255, 255, 255, 0.15)',
  onDarkDivider: 'rgba(255, 255, 255, 0.30)',
};
