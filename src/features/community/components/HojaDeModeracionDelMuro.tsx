import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { PublicacionAModerar } from '../hooks/useModeracionDelMuro';

/**
 * La hoja del «…» de una publicación del Muro (ADMIN y ALCHEMIST, 2026-10-31): dos filas grandes, «Ocultar
 * publicación» —con la línea que dice que no se pierde— y «Eliminar para siempre», en rojo.
 *
 * Sin animación propia: la hoja es `HojaDesdeAbajo` y las filas son `Presionable` (se hunden al apoyar el dedo). Si hay
 * un pedido en curso las dos se apagan y la fila que trabaja lo dice («Ocultando…», «Eliminando…»).
 */
export function HojaDeModeracionDelMuro({
  publicacion,
  ocupado,
  alCerrar,
  alOcultar,
  alEliminar,
}: {
  /** La publicación de la hoja; `null` con la hoja cerrada. */
  publicacion: PublicacionAModerar | null;
  ocupado: 'ocultar' | 'eliminar' | null;
  alCerrar: () => void;
  alOcultar: () => void;
  alEliminar: () => void;
}) {
  const { c } = useTheme();
  return (
    <HojaDesdeAbajo
      visible={publicacion !== null}
      alCerrar={alCerrar}
      titulo="Moderar publicación"
      subtitulo={publicacion ? `De ${publicacion.autor}` : undefined}
      etiquetaCerrar="Cerrar las opciones de moderación"
    >
      <View style={estilos.lista}>
        <Fila
          icono="eyeOff"
          color={c.goldInk}
          etiqueta={ocupado === 'ocultar' ? 'Ocultando…' : 'Ocultar publicación'}
          detalle="Deja de verse en el Muro. Puedes devolverla desde Administración."
          apagada={ocupado !== null}
          alTocar={alOcultar}
          nombre="Ocultar publicación"
        />
        <Fila
          icono="trash"
          color={c.danger}
          etiqueta={ocupado === 'eliminar' ? 'Eliminando…' : 'Eliminar para siempre'}
          apagada={ocupado !== null}
          alTocar={alEliminar}
          nombre="Eliminar para siempre"
        />
      </View>
    </HojaDesdeAbajo>
  );
}

function Fila({
  icono,
  color,
  etiqueta,
  detalle,
  apagada,
  alTocar,
  nombre,
}: {
  icono: IconName;
  color: string;
  etiqueta: string;
  detalle?: string;
  apagada: boolean;
  alTocar: () => void;
  nombre: string;
}) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={alTocar}
      disabled={apagada}
      accessibilityRole="button"
      accessibilityLabel={detalle ? `${nombre}. ${detalle}` : nombre}
      accessibilityState={{ disabled: apagada, busy: apagada && etiqueta.endsWith('…') }}
      style={[estilos.fila, { opacity: apagada ? 0.6 : 1 }]}
    >
      <Icon name={icono} size={22} color={color} />
      <View style={{ flex: 1, flexShrink: 1 }}>
        <Text style={[t.body, estilos.etiqueta, { color: color === c.danger ? c.danger : c.textStrong }]}>{etiqueta}</Text>
        {detalle ? <Text style={[t.body, estilos.detalle, { color: c.textSoft }]}>{detalle}</Text> : null}
      </View>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  lista: { paddingBottom: 8 },
  fila: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  etiqueta: { fontSize: 17, fontFamily: 'Jost_500Medium' },
  detalle: { fontSize: 16, lineHeight: 22, marginTop: 2 },
});
