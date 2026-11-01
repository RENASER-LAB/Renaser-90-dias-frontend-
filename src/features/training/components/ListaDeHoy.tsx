import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { modoDeHoy, type ModoDeLaFila } from '../utils/filaDelDia';
import type { ItemDelDia } from '../utils/itemsDelDia';
import { armarListaDelDia, etiquetaDeLosHechos, minutosDeAhora } from '../utils/listaDelDia';
import { FilaDelDia } from './FilaDelDia';

/**
 * La lista de HOY, ordenada por la hora planificada (spec 014). Las reglas de qué va dónde son de
 * `armarListaDelDia`; acá solo se dibujan las secciones, en este orden:
 *
 * 1. lo que sigue, por hora (la primera fila con «Te toca ahora» o «Lo que sigue»);
 * 2. «Sin hora»;
 * 3. «Se te pasó la hora · todavía puedes registrarlos hoy»;
 * 4. lo que ya no se puede registrar (su día cerró), si lo hay;
 * 5. plegado, «N hechos hoy».
 *
 * Lo hecho sale con un fundido y la lista se acomoda (`FilaDelDia`). Los que se acaban de cumplir (`retenidos`)
 * se quedan en su lugar el tiempo justo para que el check se llene y suba su «+N».
 */
export function ListaDeHoy({
  items,
  ahoraMs,
  retenidos,
  onAbrir,
  onMarcar,
  onSubir,
}: {
  items: ItemDelDia[];
  ahoraMs: number;
  retenidos: ReadonlySet<string>;
  onAbrir: (item: ItemDelDia, modo: ModoDeLaFila) => void;
  onMarcar: (item: ItemDelDia) => void;
  onSubir?: (item: ItemDelDia) => void;
}) {
  const { c, t } = useTheme();
  const [hechosAbiertos, setHechosAbiertos] = useState(false);
  const lista = useMemo(() => armarListaDelDia(items, minutosDeAhora(ahoraMs), retenidos), [items, ahoraMs, retenidos]);
  const quedaAlgo = lista.enCurso.length + lista.sinHora.length + lista.atrasados.length + lista.cerrados.length > 0;
  const hayHechos = lista.hechos.length > 0;
  // Los que se despiden cuentan como hechos para el plegado, pero siguen en su lugar hasta irse.
  const sumaDeHechos = lista.hechos.length;

  const fila = (item: ItemDelDia, modo: ModoDeLaFila, primero = false) => (
    <FilaDelDia
      key={item.clave}
      item={item}
      modo={modo}
      marca={primero ? lista.marcaDelPrimero : null}
      ahoraMs={ahoraMs}
      resaltada={primero}
      animada
      onAbrir={onAbrir}
      onMarcar={onMarcar}
      onSubir={onSubir}
    />
  );

  return (
    <View>
      {!quedaAlgo && hayHechos ? (
        <View style={[estilos.terminaste, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <Text style={[t.cardTitle, { color: c.textStrong }]}>Terminaste lo de hoy</Text>
          <Text style={[t.body, { color: c.textSoft }]}>Mañana aparece lo que planificaste.</Text>
        </View>
      ) : null}

      {lista.enCurso.length > 0 ? (
        <View style={estilos.grupo}>{lista.enCurso.map(item => fila(item, 'hoy', item === lista.primero))}</View>
      ) : null}

      {lista.sinHora.length > 0 ? (
        <View style={estilos.grupo}>
          <View style={estilos.rotulo}>
            <MicroLabel>Sin hora</MicroLabel>
          </View>
          {lista.sinHora.map(item => fila(item, modoDeHoy('sinHora')))}
        </View>
      ) : null}

      {lista.atrasados.length > 0 ? (
        <View style={estilos.grupo}>
          <View style={estilos.rotulo}>
            <MicroLabel>Se te pasó la hora · todavía puedes cumplir tu compromiso</MicroLabel>
          </View>
          {lista.atrasados.map(item => fila(item, modoDeHoy('atrasados')))}
        </View>
      ) : null}

      {lista.cerrados.length > 0 ? (
        <View style={estilos.grupo}>
          <View style={estilos.rotulo}>
            <MicroLabel>Ya no se pueden registrar</MicroLabel>
          </View>
          {lista.cerrados.map(item => fila(item, modoDeHoy('cerrados')))}
        </View>
      ) : null}

      {hayHechos ? (
        <View style={{ marginTop: 12 }}>
          <Presionable
            onPress={() => setHechosAbiertos(abierto => !abierto)}
            accessibilityRole="button"
            accessibilityState={{ expanded: hechosAbiertos }}
            accessibilityLabel={etiquetaDeLosHechos(sumaDeHechos)}
            style={estilos.plegado}
          >
            <Icon name="check" size={TAMANO_ICONO.chico} color={c.textSoft} />
            <Text style={[t.body, { color: c.textSoft, flexShrink: 1 }]}>{etiquetaDeLosHechos(sumaDeHechos)}</Text>
            <View style={{ transform: [{ rotate: hechosAbiertos ? '90deg' : '0deg' }] }}>
              <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
            </View>
          </Presionable>
          {hechosAbiertos ? <View style={estilos.grupo}>{lista.hechos.map(item => fila(item, modoDeHoy('hechos')))}</View> : null}
        </View>
      ) : null}

      {quedaAlgo ? (
        <Text style={[t.small, estilos.pie, { color: c.textSoft }]}>
          Van en el orden y a la hora que planificaste. Lo que haces desaparece y sube lo que sigue.
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { marginTop: 8 },
  rotulo: { marginTop: 16, marginBottom: 4 },
  terminaste: { marginTop: 6, borderWidth: 1, borderRadius: 16, padding: 16, gap: 2 },
  // 48 de alto: el plegado se toca con una mano, y va alineado con el texto de las filas (46 + 10 de hueco).
  plegado: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingLeft: 56 },
  pie: { marginTop: 12 },
});
