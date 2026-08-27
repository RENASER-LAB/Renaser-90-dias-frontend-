import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useFonts, Jost_200ExtraLight, Jost_300Light, Jost_400Regular, Jost_500Medium, Jost_700Bold } from '@expo-google-fonts/jost';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function Shell() {
  const { mode, c } = useTheme();
  const navTheme = mode === 'light'
    ? { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.bg } }
    : { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg } };
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [loaded] = useFonts({ Jost_200ExtraLight, Jost_300Light, Jost_400Regular, Jost_500Medium, Jost_700Bold });
  const scheme = useColorScheme();
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider initial={scheme === 'dark' ? 'dark' : 'light'}>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}