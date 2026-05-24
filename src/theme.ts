import { createTheme, type MantineColorsTuple } from '@mantine/core';

const violet: MantineColorsTuple = [
  '#f1edff',
  '#dfd7fb',
  '#bcabf2',
  '#977ce8',
  '#7855e0',
  '#653edc',
  '#5b32db',
  '#4b25c3',
  '#421fb0',
  '#37179c',
];

export const theme = createTheme({
  primaryColor: 'violet',
  primaryShade: { light: 6, dark: 4 },
  colors: { violet },
  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Card: {
      defaultProps: { withBorder: true, radius: 'lg' },
    },
    Button: {
      defaultProps: { radius: 'md' },
    },
    Modal: {
      defaultProps: { radius: 'lg', overlayProps: { backgroundOpacity: 0.55, blur: 4 } },
    },
    Paper: {
      defaultProps: { radius: 'lg' },
    },
  },
});
