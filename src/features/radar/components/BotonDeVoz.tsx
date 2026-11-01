import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Icon, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';

/**
 * Un botón de voz del Código Renaser (spec 030): «Escuchar» la pregunta o «Dictar» la respuesta. Los dos son el mismo
 * componente, así que se ven, miden y responden igual.
 *
 * - **48 de alto** y ancho a lo que diga la palabra: se toca con el pulgar sin apuntar. Ícono de 20 y texto de 15.
 * - **El estado no depende solo del color.** Activo cambia la palabra («Escuchar» → «Detener», «Dictar» → «Parar»), el ícono y
 *   el color; y el lector de pantalla lo oye como botón «seleccionado» con su nombre completo.
 * - **Sin movimiento propio**: solo el hundimiento de `Presionable` (0,97 en 120 ms). Se toca varias veces por formulario, doce
 *   formularios al día los primeros siete días: lo que no ayuda a entender, no se anima.
 */
export function BotonDeVoz({
  icono,
  iconoActivo,
  etiqueta,
  etiquetaActiva,
  activo,
  nombreAccesible,
  nombreAccesibleActivo,
  deshabilitado,
  alPresionar,
}: {
  icono: IconName;
  iconoActivo: IconName;
  etiqueta: string;
  etiquetaActiva: string;
  activo: boolean;
  nombreAccesible: string;
  nombreAccesibleActivo: string;
  deshabilitado?: boolean;
  alPresionar: () => void;
}) {
  const { c } = useTheme();
  // Dictar abre el micrófono (rojo, como el del chat de SER); escuchar usa el dorado de la marca.
  const esMicrofono = icono === 'mic';
  const fondo = activo ? (esMicrofono ? c.danger : c.goldWash) : c.cardBgAlt;
  const borde = activo ? (esMicrofono ? c.danger : c.goldInk) : c.border;
  const tinta = activo && esMicrofono ? '#FFFFFF' : activo ? c.goldInk : c.text;

  return (
    <Presionable
      onPress={alPresionar}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={activo ? nombreAccesibleActivo : nombreAccesible}
      accessibilityState={{ selected: activo, disabled: !!deshabilitado }}
      style={[estilos.boton, { backgroundColor: fondo, borderColor: borde, opacity: deshabilitado ? 0.5 : 1 }]}
    >
      <Icon name={activo ? iconoActivo : icono} size={20} color={activo && esMicrofono ? '#FFFFFF' : c.goldInk} />
      <Text style={[estilos.texto, { color: tinta }]}>{activo ? etiquetaActiva : etiqueta}</Text>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  texto: { fontFamily: fuentes.media, fontSize: 15, lineHeight: 20 },
});
