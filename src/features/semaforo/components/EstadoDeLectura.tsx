import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { FalloSemaforo } from '../hooks/useMiSemaforo';
import { primeraEnMayuscula } from '../utils/lecturaDelSemaforo';

/** Mientras llega la respuesta: una rueda y lo que se está cargando, dicho. */
export function CargandoLectura({ texto }: { texto: string }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.cargando} accessible accessibilityLabel={texto}>
      <ActivityIndicator color={c.goldInk} />
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22, flexShrink: 1 }]}>{texto}</Text>
    </View>
  );
}

/**
 * Por qué no hay nada que mostrar. Cada motivo se dice distinto porque se arregla distinto (mismo
 * criterio que el detalle propio y que `EstadoCelula`):
 *
 * - `no_disponible` (404): el servidor todavía no tiene esta vista. Sin botón: reintentar no sirve.
 * - `sin_permiso` (403): esta cuenta no puede verla. Sin botón.
 * - `sin_red` y `error`: se ofrece reintentar; el error lleva además el detalle técnico, que dice
 *   qué cambió en el servidor.
 *
 * Las secciones metidas en otra pantalla (el grupo del mentor, la ficha) ni siquiera lo dibujan
 * para 404 y 403: desaparecen. Esto es para las pantallas propias del semáforo.
 *
 * @param que lo que no se pudo cargar, en minúscula: «el semáforo del grupo».
 */
export function FalloDeLectura({
  fallo,
  detalle,
  que,
  onReintentar,
}: {
  fallo: FalloSemaforo;
  detalle?: string | null;
  que: string;
  onReintentar: () => void;
}) {
  const { c, t } = useTheme();
  const { titulo, texto, reintentar } = textosDelFallo(fallo, que);

  return (
    <View style={estilos.caja}>
      <Text style={[t.cardTitle, { color: c.textStrong }]}>{titulo}</Text>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{texto}</Text>
      {fallo === 'error' && detalle ? (
        <Text style={[t.micro, { color: c.chevron, letterSpacing: 0 }]}>{detalle}</Text>
      ) : null}
      {reintentar ? (
        <Pressable
          onPress={onReintentar}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.boton, { borderColor: c.borderStrong, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[t.body, { fontSize: 16, color: c.textStrong, fontFamily: 'Jost_700Bold' }]}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function textosDelFallo(fallo: FalloSemaforo, que: string): { titulo: string; texto: string; reintentar: boolean } {
  switch (fallo) {
    case 'no_disponible':
      return {
        titulo: `${primeraEnMayuscula(que)} todavía no está disponible`,
        texto: 'Cuando esté listo lo vas a ver aquí, sin hacer nada.',
        reintentar: false,
      };
    case 'sin_permiso':
      return {
        titulo: `Tu cuenta no puede ver ${que}`,
        texto: 'Si crees que es un error, escríbelo por soporte.',
        reintentar: false,
      };
    case 'sin_red':
      return { titulo: 'No pudimos conectar', texto: 'Revisa tu conexión y vuelve a intentarlo.', reintentar: true };
    default:
      return {
        titulo: `No pudimos cargar ${que}`,
        texto: 'Vuelve a intentarlo. Si sigue pasando, avísanos por soporte.',
        reintentar: true,
      };
  }
}

const estilos = StyleSheet.create({
  cargando: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  caja: { gap: 8, paddingVertical: 8 },
  /* 48 px: pulsable con una sola mano (AGENTS.md §4). */
  boton: {
    marginTop: 4,
    minHeight: 48,
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
