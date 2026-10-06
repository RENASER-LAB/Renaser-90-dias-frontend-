import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ControlSegmentado } from '../../../../components/ControlSegmentado';
import { Icon } from '../../../../components/Icon';
import { BotonSecundario } from '../../../../components/Legible';
import { useTheme } from '../../../../theme/ThemeContext';
import type { ListaDeAsistencia } from '../../types/asistencia.types';
import type { Ocurrencia } from '../../types/eventos.types';
import { fechaConMes, resumirLista, textoEnLaListaCerrada, type MomentoDeLaLista } from '../../utils/asistencia';
import { horaEnZona } from '../../utils/zonaHoraria';
import { BotonVolver, LETRA } from '../piezas';
import { Etiqueta, FilaDePersona, Vacio } from './piezasDeAsistencia';

type Quienes = 'asistieron' | 'faltaron';

/**
 * La lista cerrada, o la que ya no se puede tocar porque pasó el plazo (D-256, maqueta 4): resumen en
 * tres números, «Asistieron» / «Faltaron» (dijeron «Voy» y no vinieron), y abajo «Corregir» (reabre,
 * solo dentro del plazo: supuesto S-3) y «Compartir».
 */
export function ListaCerrada({
  oc,
  lista,
  momento,
  ahoraMs,
  ocupada,
  onVolver,
  onCorregir,
  onCompartir,
}: {
  oc: Ocurrencia;
  lista: ListaDeAsistencia;
  momento: MomentoDeLaLista;
  ahoraMs: number;
  ocupada: boolean;
  onVolver: () => void;
  onCorregir: () => void;
  onCompartir: () => void;
}) {
  const { c } = useTheme();
  const zona = oc.evento.zona;
  const [quienes, setQuienes] = useState<Quienes>('asistieron');
  const r = resumirLista(lista.personas);
  const asistieron = lista.personas.filter(p => p.llegada !== null);
  const faltaron = lista.personas.filter(p => p.llegada === null && p.respuesta === 'GOING');
  const filas = quienes === 'asistieron' ? asistieron : faltaron;
  const sePuedeCorregir = momento === 'cerrada' && ahoraMs <= Date.parse(lista.cierraEn);

  return (
    <View style={{ gap: 16 }}>
      <BotonVolver etiqueta="Volver al evento" onPress={onVolver} />
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
          Lista de asistencia
        </Text>
        <Text style={[estilos.sub, { color: c.textSoft }]} numberOfLines={2}>
          {oc.titulo} · {fechaConMes(oc.iniciaEn, zona)}
        </Text>
      </View>
      <View style={estilos.estado}>
        {lista.cerrada ? (
          <>
            <Etiqueta texto="Cerrada" tono="oro" icono="lock" />
            <Text style={[estilos.sub, { color: c.textSoft, flexShrink: 1 }]} numberOfLines={1}>
              {lista.cerrada.porNombre ? `por ${lista.cerrada.porNombre} · ` : ''}
              {horaEnZona(lista.cerrada.en, zona)}
            </Text>
          </>
        ) : (
          <Etiqueta texto="Terminó el plazo para pasar lista" tono="neutro" />
        )}
      </View>

      <View style={[estilos.resumen, { backgroundColor: c.cardBg, borderColor: c.border }]}>
        <Cifra numero={`${r.presentes}`} texto={r.presentes === 1 ? 'asistió' : 'asistieron'} />
        <View style={[estilos.separador, { backgroundColor: c.divider }]} />
        <Cifra numero={`${r.vinieronDeLosQueDijeronVoy}`} de={`/${r.dijeronVoy}`} texto="de los que dijeron «Voy»" />
        <View style={[estilos.separador, { backgroundColor: c.divider }]} />
        <Cifra numero={`${r.sinConfirmar}`} texto="sin confirmar" />
      </View>

      <ControlSegmentado<Quienes>
        opciones={[
          { valor: 'asistieron', etiqueta: `Asistieron ${asistieron.length}` },
          { valor: 'faltaron', etiqueta: `Faltaron ${faltaron.length}` },
        ]}
        valor={quienes}
        onCambiar={setQuienes}
        accessibilityLabel="A quiénes mostrar"
      />

      <View>
        {filas.length === 0 ? (
          <Vacio>{quienes === 'asistieron' ? 'No se marcó a nadie.' : 'Vinieron todos los que dijeron «Voy».'}</Vacio>
        ) : (
          filas.map((p, i) => (
            <FilaDePersona
              key={p.id}
              nombre={p.nombre}
              avatarUrl={p.avatarUrl}
              linea={textoEnLaListaCerrada(p, zona)}
              ultima={i === filas.length - 1}
              derecha={
                p.llegada === 'TARDE' ? (
                  <Etiqueta texto="Tarde" tono="oro" />
                ) : p.llegada && p.respuesta !== 'GOING' ? (
                  <Etiqueta texto="Sin confirmar" tono="oro" />
                ) : p.llegada ? (
                  <Icon name="check" size={24} color={c.success} />
                ) : null
              }
            />
          ))
        )}
      </View>

      <View style={estilos.pie}>
        {sePuedeCorregir ? (
          <BotonSecundario etiqueta="Corregir" icono="pencil" cargando={ocupada} estilo={estilos.mitad} onPress={onCorregir} />
        ) : null}
        <BotonSecundario etiqueta="Compartir" icono="share" estilo={estilos.mitad} onPress={onCompartir} />
      </View>
    </View>
  );
}

function Cifra({ numero, de, texto }: { numero: string; de?: string; texto: string }) {
  const { c } = useTheme();
  return (
    <View style={estilos.cifra}>
      <Text style={{ color: c.textStrong }}>
        <Text style={estilos.numero}>{numero}</Text>
        {de ? <Text style={estilos.de}>{de}</Text> : null}
      </Text>
      <Text style={[estilos.cifraTexto, { color: c.textSoft }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: LETRA.grande + 2, lineHeight: 30 },
  sub: { fontFamily: 'Jost_400Regular', fontSize: 17, lineHeight: 23 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  resumen: { flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 12 },
  separador: { width: StyleSheet.hairlineWidth, marginHorizontal: 8 },
  cifra: { flex: 1, gap: 2, paddingHorizontal: 4 },
  numero: { fontFamily: 'Jost_500Medium', fontSize: 30, lineHeight: 36 },
  de: { fontFamily: 'Jost_400Regular', fontSize: 18 },
  cifraTexto: { fontFamily: 'Jost_400Regular', fontSize: 15, lineHeight: 20 },
  pie: { flexDirection: 'row', gap: 10 },
  mitad: { flex: 1 },
});
