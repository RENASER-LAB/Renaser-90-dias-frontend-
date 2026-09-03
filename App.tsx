import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useFonts, Jost_200ExtraLight, Jost_300Light, Jost_400Regular, Jost_500Medium, Jost_700Bold } from '@expo-google-fonts/jost';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RenasiaLauncher } from './src/features/renasia/components/RenasiaLauncher';

function Shell() {
  const { mode, c } = useTheme();
  const navTheme = mode === 'light'
    ? { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.bg } }
    : { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg } };
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <RootNavigator />
      {/* RENASIA vive por encima del navegador para poder abrirse desde cualquier tab sin tocar
          ninguna de las cinco pantallas. Se quita borrando esta linea. */}
      <RenasiaLauncher />
    </NavigationContainer>
  );
}

export default function App() {
  const [loaded, error] = useFonts({ Jost_200ExtraLight, Jost_300Light, Jost_400Regular, Jost_500Medium, Jost_700Bold });
  const scheme = useColorScheme();

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider initial={scheme === 'dark' ? 'dark' : 'light'}>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}