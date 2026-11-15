export const fontFamily = {
  body: 'Cabin',
  strong: 'CabinBold',
  display: 'Lexend',
} as const;

export const typeSize = {
  caption: 12,
  small: 14,
  body: 16,
  title: 24,
  hero: 32,
} as const;

export type FontFamily = typeof fontFamily;
export type TypeSize = typeof typeSize;
