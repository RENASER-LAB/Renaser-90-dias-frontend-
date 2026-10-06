import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '../../../../components/Icon';
import { BotonPrincipal, BotonSecundario } from '../../../../components/Legible';
import { Presionable } from '../../../../components/Presionable';
import { AvatarPersona } from '../../../../components/ui';
import { useTheme } from '../../../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../../../theme/movimiento';
import type { ListaDeAsistencia } from '../../types/asistencia.types';
import { agruparRespuestas, momentoDeLaLista, type MomentoDeLaLista } from '../../utils/asistencia';
import { horaEnZona } from '../../utils/zonaHoraria';
import { LETRA, Parrafo } from '../piezas';
import { Etiqueta } from './piezasDeAsistencia';

const AVATARES_A_LA_VISTA = 4;

/**
 * La tarjeta «Asistencia» del detalle de un evento (D-256, maqueta 1). Solo existe si la lista se pudo
 * leer: quien no puede verla, o un backend sin el endpoint, no ve nada (`useAsistenciaDelEvento`).
 *
 * Cuántos van, no van y no respondieron, las caras de los primeros que van, una barra con las tres
 * partes y «Ver quién respondió». Abajo, «Pasar lista» solo mientras está abierta la ventana.
 *
 * Movimiento: la tarjeta llega después que el resto del detalle (es otro pedido), así que aparece con
 * un fundido de 200 ms en vez de saltar (evita el cambio brusco); con «reducir movimiento», sin fundido.
 * La barra NO se anima: es un dato, no un logro.
 */
export function TarjetaDeAsistencia({
  lista,
  zona,
  ahoraMs,
  onVerRespuestas,
  onPasarLista,
}: {
  lista: ListaDeAsistencia;
  zona: string | null;
  ahoraMs: number;
  onVerRespuestas: () => void;
  onPasarLista: () => void;
}) {
  const { c } = useTheme();
  const opacidad = useSharedValue(0);
  useEffect(() => {
    opacidad.set(withTiming(1, { duration: DURACION_MS.paso - 60, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.System }));
  }, [opacidad]);
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.get() }));

  const g = agruparRespuestas(lista.personas);
  const total = Math.max(1, lista.personas.length);
  const momento = momentoDeLaLista(lista, ahoraMs);
  const visibles = g.van.slice(0, AVATARES_A_LA_VISTA);
  const resto = g.van.length - visibles.length;

  return (
    <Animated.View style={[{ gap: 12 }, estilo]}>
      <View style={estilos.cabecera}>
        <Text accessibilityRole="header" style={[estilos.subtitulo, { color: c.textStrong }]}>
          Asistencia
        </Text>
        <EtiquetaDelMomento momento={momento} abreEn={lista.abreEn} zona={zona} />
      </View>

      <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
        <View style={estilos.fila}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: c.textStrong }} accessibilityLabel={`${g.van.length} van`}>
              <Text style={estilos.numero}>{g.van.length}</Text>
              <Text style={estilos.unidad}> van</Text>
            </Text>
            <Parrafo>
              {g.noVan.length} no {g.noVan.length === 1 ? 'va' : 'van'} · {g.sinRespuesta.length}{' '}
              {g.sinRespuesta.length === 1 ? 'no respondió' : 'no respondieron'}
            </Parrafo>
          </View>
          {visibles.length > 0 ? (
            <View style={estilos.caras} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {visibles.map((p, i) => (
                <AvatarPersona
                  key={p.id}
                  nombre={p.nombre}
                  avatarUrl={p.avatarUrl}
                  size={36}
                  style={{ marginLeft: i === 0 ? 0 : -10, borderWidth: 2, borderColor: c.cardBg }}
                />
              ))}
              {resto > 0 ? (
                <View style={[estilos.mas, { backgroundColor: c.placeholderA, borderColor: c.cardBg }]}>
                  <Text style={[estilos.masTexto, { color: c.goldInk }]}>+{resto}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={[estilos.barra, { backgroundColor: c.divider }]} accessibilityElementsHidden>
          <View style={{ flex: g.van.length / total, backgroundColor: c.success }} />
          {g.van.length > 0 && g.noVan.length > 0 ? <View style={{ width: 2 }} /> : null}
          <View style={{ flex: g.noVan.length / total, backgroundColor: c.danger }} />
          <View style={{ flex: g.sinRespuesta.length / total }} />
        </View>

        <Presionable
          onPress={onVerRespuestas}
          accessibilityRole="button"
          accessibilityLabel="Ver quién respondió"
          style={estilos.ver}
        >
          <Text style={[estilos.verTexto, { color: c.goldInk }]}>Ver quién respondió</Text>
          <Icon name="chevron" size={16} color={c.goldInk} />
        </Presionable>
      </View>

      <BotonDeLaLista momento={momento} onPasarLista={onPasarLista} />
      {momento === 'todavia' || momento === 'abierta' ? (
        <Text style={[estilos.nota, { color: c.textSoft }]}>Se abre 30 min antes y hasta 12 h después de que termine.</Text>
      ) : null}
    </Animated.View>
  );
}

function EtiquetaDelMomento({ momento, abreEn, zona }: { momento: MomentoDeLaLista; abreEn: string; zona: string | null }) {
  if (momento === 'abierta') return <Etiqueta texto="En curso" tono="bien" conPunto />;
  if (momento === 'cerrada') return <Etiqueta texto="Cerrada" tono="oro" icono="lock" />;
  if (momento === 'vencida') return <Etiqueta texto="Terminó" tono="neutro" />;
  return <Etiqueta texto={`Lista desde las ${horaEnZona(abreEn, zona)}`} tono="neutro" />;
}

function BotonDeLaLista({ momento, onPasarLista }: { momento: MomentoDeLaLista; onPasarLista: () => void }) {
  if (momento === 'abierta') return <BotonPrincipal etiqueta="Pasar lista" icono="listChecks" onPress={onPasarLista} />;
  if (momento === 'todavia') return <BotonSecundario etiqueta="Pasar lista" icono="listChecks" deshabilitado onPress={() => {}} />;
  return <BotonSecundario etiqueta="Ver la lista" icono={momento === 'cerrada' ? 'lock' : 'listChecks'} onPress={onPasarLista} />;
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  subtitulo: { fontFamily: 'Jost_500Medium', fontSize: LETRA.titulo, lineHeight: 24 },
  tarjeta: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numero: { fontFamily: 'Jost_500Medium', fontSize: 34, lineHeight: 40 },
  unidad: { fontFamily: 'Jost_400Regular', fontSize: 18 },
  caras: { flexDirection: 'row', alignItems: 'center' },
  mas: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  masTexto: { fontFamily: 'Jost_700Bold', fontSize: 13 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  ver: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  verTexto: { fontFamily: 'Jost_500Medium', fontSize: 17 },
  nota: { fontFamily: 'Jost_400Regular', fontSize: 15, lineHeight: 21 },
});
