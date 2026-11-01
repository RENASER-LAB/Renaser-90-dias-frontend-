import React from 'react';
import { useColorScheme, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { FUENTES_A_CARGAR } from './src/theme/fuentes';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { BarraInferiorProvider } from './src/navigation/barraAlDesplazar/BarraInferior';
import { navegacionRef } from './src/navigation/navegacionRef';
import { RenasiaLauncher } from './src/features/renasia/components/RenasiaLauncher';
import { SparkieOverlay } from './src/features/sparkie/components/SparkieOverlay';
import { AnfitrionAlerta } from './src/components/Alerta';
import { RadarProvider } from './src/features/radar/RadarContext';
import { CodigoRenaserOverlay } from './src/features/radar/components/CodigoRenaserOverlay';
import { RenombrarHabitoOverlay } from './src/features/habits/components/RenombrarHabitoOverlay';
import { AbridorDeEventos } from './src/features/eventos/components/AbridorDeEventos';
import { AbridorDeAvisos } from './src/features/alarmas/components/AbridorDeAvisos';
import { RearmadorDeAlarmas } from './src/features/alarmas/components/RearmadorDeAlarmas';
import { CargadorDeCategoriasDeHabito } from './src/features/habits/categorias/components/CargadorDeCategoriasDeHabito';
import { SincronizadorDeAcciones } from './src/features/objetivos/components/SincronizadorDeAcciones';
import { AnfitrionDeCelebraciones } from './src/features/fenix/components/AnfitrionDeCelebraciones';
import { FormacionProvider } from './src/features/formaciones/context/FormacionContext';
import { FuncionalidadesProvider } from './src/features/plataforma/estado/FuncionalidadesProvider';
import { FranjaVerComo, SinBordeDeArriba } from './src/features/soporte-ti/verComo/FranjaVerComo';

function Shell() {
  const { mode, c } = useTheme();
  const navTheme = mode === 'light'
    ? { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.bg } }
    : { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg } };
  return (
    /* «Ver como» (spec 002, fase 2): mientras Soporte TI ve la app como otro rol, la franja fija va arriba, en el flujo,
       y todo lo demás debajo (sin borde seguro de arriba: lo pone la franja). Sin «ver como» la franja no dibuja nada y
       la app queda exactamente como antes. */
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    <FranjaVerComo />
    <SinBordeDeArriba>
    {/* La `ref` la usa el arranque guiado para llevar al Muro desde fuera del arbol de navegacion
        (ver `navigation/navegacionRef.ts`). No cambia nada del comportamiento del contenedor. */}
    <NavigationContainer ref={navegacionRef} theme={navTheme}>
      {/* «Ocultar la barra al desplazar» (2026-10-02): la barra de pestañas y el botón del
          acompañante leen de acá si la barra está escondida. Ver `navigation/barraAlDesplazar`. */}
      <BarraInferiorProvider>
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
      {/* Canales de Android y alarmas de eventos al día al entrar. No pinta nada. */}
      <AbridorDeEventos />
      {/* Tocar un aviso abre lo suyo: un evento (Comunidad → Eventos, E-5), el recordatorio de un
          hábito (Training en su dimensión) o el de una acción (Plan → Objetivos), D-218. Espera a que
          se cierren el Código Renaser, el arranque guiado o el Pacto. No pinta nada. */}
      <AbridorDeAvisos />
      {/* Al abrir y al volver a primer plano, vuelve a armar las alarmas locales ya programadas
          (mismo id, contenido y hora): las de antes del permiso de alarmas exactas quedan exactas y las que el
          teléfono borró al cerrar la app vuelven, en silencio (2026-10-31: sin hoja ni aviso). No pinta nada.
          Ver `features/alarmas/rearmarAlarmas.ts`. */}
      <RearmadorDeAlarmas />
      {/* Las categorías de hábito (las dimensiones de Training) de la formación de la sesión, spec 023: una lectura, compartida. No pinta nada. */}
      <CargadorDeCategoriasDeHabito />
      {/* Pone al dia las alarmas de las acciones con hora (hoy y manana) al abrir y al volver a
          primer plano, solo si la persona pidio ese aviso. No pinta nada. Ver
          `features/objetivos/notificaciones/recordatoriosDeAcciones.ts`. */}
      <SincronizadorDeAcciones />
      {/* La pantalla completa de los momentos grandes (día completo, rachas de 7 y 30, fase nueva), una por día,
          donde ocurra el hito. Aca arriba por el mismo motivo que los otros: ninguna pantalla la dibuja. Se quita
          borrando esta linea. Ver `features/fenix/components/AnfitrionDeCelebraciones.tsx`. */}
      <AnfitrionDeCelebraciones />
      {/* Dibuja los Alert en el build web, donde el Alert de react-native-web es un metodo vacio
          que nunca ejecuta los onPress de sus botones (E-144). En movil no pinta nada. */}
      <AnfitrionAlerta />
      </BarraInferiorProvider>
    </NavigationContainer>
    </SinBordeDeArriba>
    </View>
  );
}

export default function App() {
  /* La fuente de la app es Inter y vive en UN solo archivo, `src/theme/fuentes.ts` (2026-10-31): ahí están los nombres por rol
     (`fuentes.regular`, `.media`, `.seminegrita`, `.negrita`, `.display`) y los cuatro archivos que se cargan. Cambiarla es tocar
     ese archivo. Si esta carga se quita, los textos no fallan: caen al tipo del sistema en silencio, que es peor que un error — por
     eso la fuente se carga acá, antes de dibujar nada, y no a demanda. */
  const [loaded, error] = useFonts(FUENTES_A_CARGAR);
  const scheme = useColorScheme();

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider initial={scheme === 'dark' ? 'dark' : 'light'}>
        <AuthProvider>
          {/* Los interruptores de Soporte TI (spec 002): qué está apagado para esta sesión. Relee al entrar, al
              volver al frente, cada 60 s y cuando el servidor responde 503 FUNCIONALIDAD_APAGADA. */}
          <FuncionalidadesProvider>
          {/* La formación de la sesión (spec 022): Escuela, Diplomado o Certificación. Nace del login y se relee al volver al frente. */}
          <FormacionProvider>
          {/* Una sola lectura del Codigo Renaser para toda la app: la tarjeta de Hoy y el
              formulario a pantalla completa comparten estado. Ver RadarContext. */}
          <RadarProvider>
            <Shell />
          </RadarProvider>
          </FormacionProvider>
          </FuncionalidadesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}