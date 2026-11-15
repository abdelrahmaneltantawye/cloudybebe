import {
  lightTheme,
  darkTheme as darkColors,
  spacing,
  radius,
  fontFamily,
  typeSize,
} from './design-system/tokens';

export const theme = {
  colors: lightTheme,
  space: spacing,
  radius: radius,
  font: fontFamily,
  type: typeSize,
};

export const darkTheme = {
  colors: darkColors,
  space: spacing,
  radius: radius,
  font: fontFamily,
  type: typeSize,
};

export type Theme = typeof theme;
