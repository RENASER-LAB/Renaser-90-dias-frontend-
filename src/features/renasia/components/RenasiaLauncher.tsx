import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { NOMBRE_ACOMPANANTE } from '../data/agentes';
import { OrbeQuieto } from './OrbeQuieto';
import { RenasiaPanel } from '../screens/RenasiaPanel';
import { useMapaRenacimientoAbierto } from '../../mapa-renacimiento/MapaRenacimientoContext';
import { useHayChatEnPantalla } from '../state/chatEnPantalla';
import { useBarraInferior } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { ALTO_TAB_BAR, DIAMETRO, MARGEN_DERECHO, SEPARACION } from './lugarDelLanzador';

/**
 * Botón flotante que abre al ACOMPAÑANTE de los 90 días (`agent: 'COMPANION'`, D-102), más el
 * panel que abre. Sparkie, el tutor de cursos, NO entra por acá: su entrada es `ChatDelCurso`, al
 * pie del curso y de la lección.
 *
 * <p>Vive acá y no dentro de una pantalla de tab a propósito. `AGENTS.md` prohíbe alterar las
 * cinco pantallas principales, y además el acompañante tiene que poder abrirse desde cualquiera
 * de ellas, no solo desde una. Montándolo una vez por encima del navegador, se cumplen las dos
 * cosas y ninguna pantalla existente cambia una línea.
 *
 * <p>Solo aparece con sesión iniciada: en el login y durante el onboarding no tiene sentido, y
 * además el backend rechaza las rutas de `/renasia` sin sesión real.
 *
 * <p>Todo el estilo sale de los tokens del tema: el mismo disco dorado (`goldGrad`) que `GoldCircle`.
 * No hay un solo color ni medida inventada acá.
 *
 * > **Corregido 2026-10-05.** Decía que el botón ERA `GoldCircle`. Ya no: `GoldCircle` solo recibe un
 * > nombre de `Icon`, y el botón lleva el orbe de SER (`OrbeQuieto`), con nombre para el lector de
 * > pantalla y la respuesta al dedo de `Presionable`.
 */
export function RenasiaLauncher() {
  const { isAuthenticated, isOnboardingCompleted } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const hayChatEnPantalla = useHayChatEnPantalla();
  const { abierto: mapaAbierto } = useMapaRenacimientoAbierto();
  /* «Ocultar la barra al desplazar» (2026-10-02): cuando la barra de pestañas baja, el botón baja
     lo mismo y queda a la misma distancia del borde de abajo, en vez de quedar colgado sobre un
     hueco. Sigue a la vista: el acompañante se puede abrir aunque se esté leyendo una lista. */
  const barra = useBarraInferior();
  const escondida = barra?.escondida;
  const altoQueGana = barra?.altoQueGana;
  const acompanaALaBarra = useAnimatedStyle(() => {
    if (!escondida || !altoQueGana) return {};
    return { transform: [{ translateY: escondida.value * altoQueGana.value }] };
  });

  // El javadoc de esta clase ya decia "en el login y durante el onboarding no tiene sentido",
  // pero solo estaba implementada la mitad del login: durante la ficha inicial la sesion YA esta
  // iniciada, asi que `isAuthenticated` es true y el flotante aparecia encima del formulario
  // (2026-09-06, reportado por el dueno del proyecto).
  //
  // `isOnboardingCompleted` arranca en false y solo pasa a true con una respuesta confirmada del
  // servidor, asi que sirve tal cual: mientras no se sepa, el boton no esta. Preferir eso al
  // orden inverso — un flotante que aparece y desaparece al resolverse la consulta se ve roto.
  if (!isAuthenticated || !isOnboardingCompleted) return null;
  // D-101: con un chat abierto —el de un curso, o una conversacion de Comunidad— el flotante se
  // esconde. En el curso porque la entrada que corresponde es la de Sparkie; en Comunidad porque
  // se monta justo encima de la barra de escribir y tapa el boton de enviar, y porque una burbuja
  // de IA flotando sobre una conversacion entre personas no tiene por que estar ahi.
  // Se esconde el boton pero NO el panel: si la persona ya tenia abierto al acompanante, no se le
  // cierra en la cara.
  //
  // Y tambien con el Mapa de Renacimiento abierto (2026-09-22, reportado por el dueno mirando la
  // pantalla: "que hace ahi, quitalo cuando este haciendo el formulario del mapa del poder"). Es
  // exactamente el mismo caso que la ficha inicial de mas arriba, y se escapo por un detalle: el
  // Mapa es del DIA 7, o sea que el onboarding ya esta completo y `isOnboardingCompleted` no lo
  // filtra. No es solo estorbo visual — el flotante se monta justo encima del interruptor de
  // compromiso del ultimo paso, asi que tocar "me comprometo" abria el chat.

  return (
    <>
      {/*
        Una sola vista absoluta del tamaño del botón, no una capa a pantalla completa: así no hay
        nada que pueda comerse los toques de la pantalla que esté debajo.
      */}
      {!hayChatEnPantalla && !mapaAbierto && (
        <Animated.View style={[styles.posicion, { bottom: insets.bottom + ALTO_TAB_BAR + SEPARACION }, acompanaALaBarra]}>
          {/* El orbe de SER, no el globo de chat (2026-10-05, decisión del dueño). Por qué el orbe y no
              el fénix: ver `OrbeQuieto`. Antes era `GoldCircle` con `chat` —el mismo globo de «Comentar»,
              del Muro y del soporte—, sin nombre para el lector de pantalla. */}
          <Presionable
            onPress={() => setVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Hablar con ${NOMBRE_ACOMPANANTE}, tu acompañante`}
            style={[styles.disco, { width: DIAMETRO, height: DIAMETRO, borderRadius: DIAMETRO / 2 }]}
          >
            <LinearGradient
              colors={c.goldGrad}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.relleno}
            >
              <OrbeQuieto size={Math.round(DIAMETRO * 0.62)} color={c.onGold} />
            </LinearGradient>
          </Presionable>
        </Animated.View>
      )}

      <RenasiaPanel agent="COMPANION" visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

/*
 * Las medidas (alto de la barra, separación, diámetro, margen derecho) y `ESPACIO_PARA_LANZADOR`
 * viven en `lugarDelLanzador.ts` desde el 2026-10-05, con los mismos números: así una vista puede
 * reservarle lugar al botón sin cargar este archivo, que arrastra el panel entero. Se reexporta
 * `ESPACIO_PARA_LANZADOR` para que las pantallas que ya lo importaban de acá no cambien.
 */
export { ESPACIO_PARA_LANZADOR } from './lugarDelLanzador';

const styles = StyleSheet.create({
  posicion: { position: 'absolute', right: MARGEN_DERECHO },
  disco: { overflow: 'hidden' },
  relleno: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
