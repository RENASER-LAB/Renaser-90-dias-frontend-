import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { useAuth } from '../../auth/context/AuthContext';
import { NOMBRE_ACOMPANANTE } from '../data/agentes';
import { FenixDeSerQueSalta } from '../../fenix/components/FenixDeSerQueSalta';
import { useMantenerSemaforoVigente } from '../../semaforo/estado/useSemaforoVigente';
import { RenasiaPanel } from '../screens/RenasiaPanel';
import { useMapaRenacimientoAbierto } from '../../mapa-renacimiento/MapaRenacimientoContext';
import { useHayChatEnPantalla } from '../state/chatEnPantalla';
import { useBarraInferior } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { ALTO_TAB_BAR, DIAMETRO, MARGEN_DERECHO, SEPARACION } from './lugarDelLanzador';

/**
 * Botón flotante que abre al ACOMPAÑANTE de los 90 días (`agent: 'COMPANION'`, D-102), más el
 * panel que abre. Dentro de un curso la entrada a SER es `ChatDelCurso`, al pie del curso y de la
 * lección, que le pasa el curso de contexto (antes abría a Sparkie, retirado en D-255).
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
  const { isAuthenticated, isOnboardingCompleted, user } = useAuth();
  /* El color vigente del semáforo que leen el fénix de este botón y el de la tarjeta de Hoy (2026-10-06): este botón
     vive sobre todas las pantallas, así que es el lugar de mantenerlo al día (vuelta al frente, hábito cumplido). */
  useMantenerSemaforoVigente(user?.role, isAuthenticated ? user?.id : null);
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
  // esconde. En el curso porque la entrada que corresponde es la del curso (SER con el curso de
  // contexto, D-255); en Comunidad porque
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
          {/* El fénix es la cara de SER (2026-10-06, pedido del dueño): acá es FOTO FIJA en el ánimo del semáforo
              propio (`FenixDeSerQuieto`), sin Rive. Todo lo vivo del fénix está en el centro de Hoy.
              2026-10-07: la foto da un saltito al cumplirse un hábito (`FenixDeSerQueSalta`, un transform).
              > **Corregido 2026-10-07.** Decía «sin Rive ni animación»: sigue sin Rive, ahora con ese saltito.
              > **Corregido 2026-10-06.** Era el orbe de SER (`OrbeQuieto`) sobre el disco dorado (2026-10-05). El
              > fénix dorado sobre dorado no se leía: el disco pasa a ser el de las tarjetas, con un borde dorado,
              > y el fénix desborda un poco el círculo (alas y cresta) para que se reconozca a 52 px. Mismo tamaño de
              > toque (52), misma acción y misma etiqueta. */}
          <Presionable
            onPress={() => setVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Hablar con ${NOMBRE_ACOMPANANTE}, tu acompañante`}
            style={[
              styles.disco,
              { width: DIAMETRO, height: DIAMETRO, borderRadius: DIAMETRO / 2, backgroundColor: c.cardBg, borderColor: c.gold },
            ]}
          >
            <FenixDeSerQueSalta size={TAMANO_FENIX} style={styles.fenix} />
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

/** El fénix es más grande que el disco: el dibujo deja aire alrededor (sombra, brasas) y así el ave se lee a 52 px. */
const TAMANO_FENIX = Math.round(DIAMETRO * 1.25);

const styles = StyleSheet.create({
  posicion: { position: 'absolute', right: MARGEN_DERECHO },
  disco: {
    borderWidth: 1.5,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fenix: { position: 'absolute', left: (DIAMETRO - TAMANO_FENIX) / 2 - 1.5, top: (DIAMETRO - TAMANO_FENIX) / 2 - 5 },
});
