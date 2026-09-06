import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useFonts, Jost_200ExtraLight, Jost_300Light, Jost_400Regular, Jost_500Medium, Jost_700Bold } from '@expo-google-fonts/jost';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navegacionRef } from './src/navigation/navegacionRef';
import { RenasiaLauncher } from './src/features/renasia/components/RenasiaLauncher';
import { SparkieOverlay } from './src/features/sparkie/components/SparkieOverlay';
import { AnfitrionAlerta } from './src/components/Alerta';
import { MapaRenacimientoProvider } from './src/features/mapa-renacimiento/MapaRenacimientoContext';

function Shell() {
  const { mode, c } = useTheme();
  const navTheme = mode === 'light'
    ? { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.bg } }
    : { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg } };
  return (
    /* La `ref` la usa el arranque guiado para llevar al Muro desde fuera del arbol de navegacion
       (ver `navigation/navegacionRef.ts`). No cambia nada del comportamiento del contenedor. */
    <NavigationContainer ref={navegacionRef} theme={navTheme}>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <RootNavigator />
      {/* RENASIA vive por encima del navegador para poder abrirse desde cualquier tab sin tocar
          ninguna de las cinco pantallas. Se quita borrando esta linea. */}
      <RenasiaLauncher />
      {/* El arranque guiado (saludo -> primer post en el Muro -> Pacto), por el mismo motivo y
          con la misma forma. Se apaga solo cuando el Pacto queda firmado. */}
      <SparkieOverlay />
      {/* Dibuja los Alert en el build web, donde el Alert de react-native-web es un metodo vacio
          que nunca ejecuta los onPress de sus botones (E-144). En movil no pinta nada. */}
      <AnfitrionAlerta />
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
          {/* El Mapa de Renacimiento (Día 7) se abre a pantalla completa por encima de las
              pestañas; este proveedor guarda si está abierto. Ver RootNavigator. */}
          <MapaRenacimientoProvider>
            <Shell />
          </MapaRenacimientoProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}