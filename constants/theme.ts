import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0E6BA8',
    secondary: '#56B4D3',
    tertiary: '#97D8C4',
    error: '#C62828',
    background: '#F7FAFC',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#56B4D3',
    secondary: '#97D8C4',
    tertiary: '#0E6BA8',
    error: '#EF5350',
    background: '#0B1320',
  },
};

export type AppTheme = typeof lightTheme;
