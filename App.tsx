import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useFonts, Jost_400Regular, Jost_500Medium, Jost_700Bold } from '@expo-google-fonts/jost';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navegacionRef } from './src/navigation/navegacionRef';
import { RenasiaLauncher } from './src/features/renasia/components/RenasiaLauncher';
import { SparkieOverlay } from './src/features/sparkie/components/SparkieOverlay';
import { AnfitrionAlerta } from './src/components/Alerta';
import { MapaRenacimientoProvider } from './src/features/mapa-renacimiento/MapaRenacimientoContext';
import { RadarProvider } from './src/features/radar/RadarContext';
import { CodigoRenaserOverlay } from './src/features/radar/components/CodigoRenaserOverlay';
import { RenombrarHabitoOverlay } from './src/features/habits/components/RenombrarHabitoOverlay';

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
      {/* El Codigo Renaser de esta hora (dias 1-7). Aca arriba y no dentro de Hoy porque para el
          aprendiz es innegociable: dentro de una pestaña se esquivaria tocando otra. */}
      <CodigoRenaserOverlay />
      {/* Ofrece UNA sola vez cambiarle el nombre a las bebidas del catalogo (jugo verde / agua con
          limon), para quien no las puede tomar. Aca arriba por el mismo motivo que los otros tres:
          ninguna de las cinco pantallas cambia. No es un Modal — no bloquea lo que hay debajo. */}
      <RenombrarHabitoOverlay />
      {/* Dibuja los Alert en el build web, donde el Alert de react-native-web es un metodo vacio
          que nunca ejecuta los onPress de sus botones (E-144). En movil no pinta nada. */}
      <AnfitrionAlerta />
    </NavigationContainer>
  );
}

export default function App() {
  /* Jost_200ExtraLight y Jost_300Light se cargaban y AGENTS.md 4 los prohibe; tras sustituir
     sus tres usos (token `hero`, dia del Plan, hora del picker) ya no hay consumidores.

     Fraunces entra en dos pesos y SOLO para los titulos de display (`t.hero`, `t.screenTitle` en
     `theme/tokens.ts`). Todo el texto de lectura sigue en Jost, que es lo que protege AGENTS.md 4.
     Si esta linea se quita, los titulos no fallan: caen al tipo del sistema en silencio, que es
     peor que un error — por eso la fuente se carga aca, junto a las otras, y no a demanda. */
  const [loaded, error] = useFonts({
    Jost_400Regular,
    Jost_500Medium,
    Jost_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  const scheme = useColorScheme();

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider initial={scheme === 'dark' ? 'dark' : 'light'}>
        <AuthProvider>
          {/* El Mapa de Renacimiento (Día 7) se abre a pantalla completa por encima de las
              pestañas; este proveedor guarda si está abierto. Ver RootNavigator. */}
          <MapaRenacimientoProvider>
            {/* Una sola lectura del Codigo Renaser para toda la app: la tarjeta de Hoy y el
                formulario a pantalla completa comparten estado. Ver RadarContext. */}
            <RadarProvider>
              <Shell />
            </RadarProvider>
          </MapaRenacimientoProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}