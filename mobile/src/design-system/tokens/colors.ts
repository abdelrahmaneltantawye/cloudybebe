export const palette = {
  // Brand colors from CloudyBebe website
  white: '#FFFFFF',
  black: '#242424', // --wd-title-color
  grey: '#767676', // --wd-text-color
  slatePine: '#3B4540', // Mobile toolbar icons and active/inactive text
  indigo: '#5463D8', // --wd-primary-color (signature periwinkle blue)
  indigoHover: '#1F40B9', // --btn-accented-bgcolor-hover
  indigoLight: '#EDF0FB', // Periwinkle soft tint / active pill background
  sageMist: '#E8F3EE', // Baby eucalyptus soft tint
  creamBlush: '#F7F3F0', // Warm oatmeal / linen surface (.wd-footer, .wd-page-title)
  greyBorder: '#E6E9F2', // Soft border divider
  redDark: '#A52C38', // Semantic error
  mintGreen: '#9FCDBF', // --wd-alternative-color (soft sage mint)
  actionGreen: '#A0C269', // Instant buy button (.wd-buy-now-btn)
  actionGreenHover: '#83AC2B',
  peachAccent: '#E2AC8E', // Announcement banner (.wd-hb) & featured badge
  overlayDark: '#15222BBF',
  overlayTransparent: '#15222B00',
  greenDark: '#366A58',
  noticeSuccess: '#459647', // --notices-success-bg
  noticeWarning: '#E0B252', // --notices-warning-bg
  noticeRed: '#E01020', // Alert / dot red
  surfaceMuted: '#F7F7F7', // --btn-default-bgcolor

  // Dark mode counterparts
  charcoal: '#121212',
  darkSurface: '#1E1E1E',
  darkSurfaceElevated: '#282828',
  lightGrey: '#E8E8E8',
  midGrey: '#9E9EA8',
  indigoPale: '#7B8AE8',
  indigoDark: '#252840',
  darkSage: '#1A2F25',
  darkCream: '#2A2520',
  darkBorder: '#333340',
  redMid: '#E05565',
  darkMint: '#5A9E85',
  darkOverlay: '#15222BBF',
  darkTransparent: '#15222B00',
  darkSuccess: '#5AAE85',
  darkNavSlate: '#D2D7D4',
} as const;

export type ColorKey =
  | 'background'
  | 'surface'
  | 'surfaceMuted'
  | 'ink'
  | 'muted'
  | 'navSlate'
  | 'primary'
  | 'primaryHover'
  | 'primarySoft'
  | 'sage'
  | 'cream'
  | 'border'
  | 'error'
  | 'white'
  | 'mint'
  | 'actionGreen'
  | 'peach'
  | 'photo'
  | 'heroOverlay'
  | 'transparent'
  | 'success'
  | 'warning';

export type ColorTheme = Record<ColorKey, string>;

export const lightTheme: ColorTheme = {
  background: palette.white,
  surface: palette.white,
  surfaceMuted: palette.surfaceMuted,
  ink: palette.black,
  muted: palette.grey,
  navSlate: palette.slatePine,
  primary: palette.indigo,
  primaryHover: palette.indigoHover,
  primarySoft: palette.indigoLight,
  sage: palette.sageMist,
  cream: palette.creamBlush,
  border: palette.greyBorder,
  error: palette.redDark,
  white: palette.white,
  mint: palette.mintGreen,
  actionGreen: palette.actionGreen,
  peach: palette.peachAccent,
  photo: palette.white,
  heroOverlay: palette.overlayDark,
  transparent: palette.overlayTransparent,
  success: palette.greenDark,
  warning: palette.noticeWarning,
};

export const darkTheme: ColorTheme = {
  background: palette.charcoal,
  surface: palette.darkSurface,
  surfaceMuted: palette.darkSurfaceElevated,
  ink: palette.lightGrey,
  muted: palette.midGrey,
  navSlate: palette.darkNavSlate,
  primary: palette.indigoPale,
  primaryHover: palette.indigoLight,
  primarySoft: palette.indigoDark,
  sage: palette.darkSage,
  cream: palette.darkCream,
  border: palette.darkBorder,
  error: palette.redMid,
  white: palette.white,
  mint: palette.darkMint,
  actionGreen: palette.darkMint,
  peach: palette.peachAccent,
  photo: palette.darkSurface,
  heroOverlay: palette.darkOverlay,
  transparent: palette.darkTransparent,
  success: palette.darkSuccess,
  warning: palette.noticeWarning,
};
