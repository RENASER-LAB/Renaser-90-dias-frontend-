import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { FilaDelCierre } from '../../cierre/components/FilaDelCierre';
import { useTheme } from '../../../theme/ThemeContext';
import { modoEnOtroDia, type ModoDeLaFila } from '../utils/filaDelDia';
import type { ItemDelDia } from '../utils/itemsDelDia';
import { minutosDeLaHora } from '../utils/listaDelDia';
import type { RelacionConHoy } from '../utils/semanaDeTraining';
import { FilaDelDia } from './FilaDelDia';

/** Por hora; lo que no tiene hora, al final y en su orden. */
function porHora(items: ItemDelDia[]): ItemDelDia[] {
  return items
    .map((item, i) => ({ item, i, min: minutosDeLaHora(item.hora) }))
    .sort((a, b) => (a.min ?? Infinity) - (b.min ?? Infinity) || a.i - b.i)
    .map(x => x.item);
}

/**
 * La lista de un día que NO es hoy (spec 014). Nunca registra nada:
 *
 * - **Un día anterior leído del servidor** (`conLectura`): lo cumplido lleva ✓ y lo demás, candado; tocar uno solo
 *   dice «Ya hecho» o «Ese día ya cerró. No se puede registrar.». No abre nada más.
 * - **Un día anterior sin lectura, o un día que viene**: solo lo planificado, a su hora, sin ✓ ni candado ni botones
 *   (no se inventa qué se hizo). Las filas son solo texto, también las de eventos.
 */
export function ListaDeOtroDia({
  items,
  relacion,
  conLectura,
  ahoraMs,
  nota,
  onAbrir,
  accion,
}: {
  items: ItemDelDia[];
  relacion: Exclude<RelacionConHoy, 'hoy'>;
  conLectura: boolean;
  ahoraMs: number;
  nota: string | null;
  onAbrir: (item: ItemDelDia, modo: ModoDeLaFila) => void;
  /** Un botón de texto bajo la lista (el «Reintentar» de una lectura que falló). */
  accion?: { etiqueta: string; onPress: () => void } | null;
}) {
  const { c, t } = useTheme();
  const ordenados = useMemo(() => porHora(items), [items]);
  return (
    <View>
      <View style={{ marginTop: 8 }}>
        {ordenados.map(item => {
          // «Cerrado» / «Sin cerrar» (spec 017): solo texto. Un día que terminó no se cierra tarde.
          if (item.tipo === 'cierre') return <FilaDelCierre key={item.clave} item={item} soloLectura />;
          const modo = modoEnOtroDia(item, relacion, conLectura);
          // Solo se toca un ✓ o un candado de un día leído, y solo para decir «Ya hecho» o que ese día ya cerró.
          const tocable = modo === 'hecho' || modo === 'cerrado';
          return (
            <FilaDelDia
              key={item.clave}
              item={item}
              modo={modo}
              marca={null}
              ahoraMs={ahoraMs}
              tocable={tocable}
              esHoy={false}
              onAbrir={onAbrir}
            />
          );
        })}
      </View>
      {nota ? <Text style={[t.small, estilos.nota, { color: c.textSoft }]}>{nota}</Text> : null}
      {accion ? (
        <Presionable onPress={accion.onPress} accessibilityRole="button" style={estilos.accion}>
          <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>{accion.etiqueta}</Text>
        </Presionable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  nota: { marginTop: 12 },
  accion: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
});
