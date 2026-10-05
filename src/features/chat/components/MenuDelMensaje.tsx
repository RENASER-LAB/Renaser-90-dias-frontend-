import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, type IconName } from '../../../components/Icon';
import type { ChatMessage } from '../../../screens/ComunidadScreen';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { citaDeMensajeCargado, textoParaCopiar } from '../utils/citaDelMensaje';

/**
 * Lo que se puede hacer con un mensaje al mantenerlo presionado (pedido del dueño, 2026-10-05): una
 * hoja desde abajo, la misma de los selectores, con «Responder» y «Copiar».
 *
 * - **Responder** siempre (también a un mensaje del programa o a uno propio).
 * - **Copiar** solo si hay texto que alguien escribió ({@link textoParaCopiar}) y el teléfono puede
 *   copiar: un binario sin `expo-clipboard` no lo ofrece (ver `utils/portapapeles.ts`).
 *
 * Cada fila mide 52 px, con el ícono a la izquierda y la palabra en tamaño de lectura; al apoyar el
 * dedo se tiñe, como las filas de las listas del sistema. Elegir vibra con el «tic» de selección.
 * El título dice de quién es el mensaje y el subtítulo, qué decía: así se sabe sobre qué se actúa.
 */
export interface AccionesDelMensaje {
  alResponder: (mensaje: ChatMessage) => void;
  alCopiar: (texto: string) => void;
  /** Si este binario puede copiar al portapapeles. */
  puedeCopiar: boolean;
}

export function opcionesDelMensaje(mensaje: ChatMessage, puedeCopiar: boolean): ('responder' | 'copiar')[] {
  return puedeCopiar && textoParaCopiar(mensaje) ? ['responder', 'copiar'] : ['responder'];
}

export function MenuDelMensaje({
  mensaje,
  alCerrar,
  alResponder,
  alCopiar,
  puedeCopiar,
  alTerminarDeCerrar,
}: AccionesDelMensaje & {
  /** El mensaje del menú; `null` con la hoja cerrada. */
  mensaje: ChatMessage | null;
  alCerrar: () => void;
  /** La hoja ya bajó y se fue: ahí recién se puede abrir el teclado del campo (ver `HojaDesdeAbajo`). */
  alTerminarDeCerrar?: () => void;
}) {
  const cita = mensaje ? citaDeMensajeCargado(mensaje) : null;
  const opciones = mensaje ? opcionesDelMensaje(mensaje, puedeCopiar) : [];
  const elegir = (accion: 'responder' | 'copiar') => {
    if (!mensaje) return;
    tacto.seleccion();
    if (accion === 'responder') {
      alResponder(mensaje);
    } else {
      const texto = textoParaCopiar(mensaje);
      if (texto) alCopiar(texto);
    }
  };
  return (
    <HojaDesdeAbajo
      visible={mensaje !== null}
      alCerrar={alCerrar}
      alTerminarDeCerrar={alTerminarDeCerrar}
      titulo={cita ? (cita.esMia ? 'Tu mensaje' : `Mensaje de ${cita.autor}`) : 'Mensaje'}
      subtitulo={cita?.resumen}
      etiquetaCerrar="Cerrar las opciones del mensaje"
    >
      <View style={styles.lista}>
        {opciones.map(accion => (
          <FilaDeAccion
            key={accion}
            icono={accion === 'responder' ? 'reply' : 'copy'}
            etiqueta={accion === 'responder' ? 'Responder' : 'Copiar'}
            alTocar={() => elegir(accion)}
          />
        ))}
      </View>
    </HojaDesdeAbajo>
  );
}

function FilaDeAccion({ icono, etiqueta, alTocar }: { icono: IconName; etiqueta: string; alTocar: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.fila, { backgroundColor: pressed ? c.goldWash : 'transparent' }]}
    >
      <Icon name={icono} size={22} color={c.goldInk} />
      <Text style={[t.body, styles.etiqueta, { color: c.textStrong }]}>{etiqueta}</Text>
      <View style={[styles.divisor, { backgroundColor: c.divider }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lista: {
    paddingBottom: 4,
  },
  fila: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  etiqueta: {
    flex: 1,
    fontSize: 17,
    fontFamily: 'Jost_500Medium',
  },
  divisor: {
    position: 'absolute',
    left: 58,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
