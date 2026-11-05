import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { Interruptor } from '../../../components/Interruptor';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { EstadoDeLaCarrera, PreferenciasDeLaCarrera, Tramo } from '../types/carrera.types';
import { activoMs, indiceDelMejorKm, pasosPorMinuto, ritmoActualSegPorKm } from '../utils/motorDeCarrera';
import {
  formatoEntero,
  formatoKm,
  formatoRitmo,
  formatoVelocidad,
  ritmoSegPorKm,
  velocidadKmh,
} from '../utils/ritmoYCalorias';
import { TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';

/**
 * Las piezas de la pantalla de la carrera (FR-007 a FR-010): la fila de tres datos, las cuatro pestañas y los paneles de
 * estadísticas, tramos y voz. Quietas: cambian varias veces por segundo y lo que cambia tiene que leerse en el acto, sin animación.
 */

export type PestanaDeLaCarrera = 'mapa' | 'estadisticas' | 'tramos' | 'voz';

/** Un dato: el número grande y su rótulo. */
export function Dato({ valor, rotulo, atenuado = false }: { valor: string; rotulo: string; atenuado?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={estilos.dato} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text
        style={[estilos.valorDato, { color: atenuado ? c.textSoft : c.textStrong }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {valor}
      </Text>
      <Text style={[estilos.rotuloDato, { color: c.textSoft }]} numberOfLines={1}>
        {rotulo}
      </Text>
    </View>
  );
}

export function FilaDeTresDatos({ e, ahora, atenuado = false }: { e: EstadoDeLaCarrera; ahora: number; atenuado?: boolean }) {
  const act = activoMs(e, ahora);
  const ritmo = ritmoActualSegPorKm(e, ahora) ?? ritmoSegPorKm(e.distanciaM, act / 1000);
  return (
    <View style={estilos.filaDatos}>
      <Dato valor={formatoKm(e.distanciaM)} rotulo={`${TEXTOS_DE_LA_CARRERA.distancia} km`} atenuado={atenuado} />
      <Dato valor={formatoRitmo(ritmo)} rotulo={`${TEXTOS_DE_LA_CARRERA.ritmo} min/km`} atenuado={atenuado} />
      <Dato valor={formatoEntero(e.caloriasKcal)} rotulo={TEXTOS_DE_LA_CARRERA.calorias} atenuado={atenuado} />
    </View>
  );
}

const PESTANAS: Array<{ valor: PestanaDeLaCarrera; icono: IconName }> = [
  { valor: 'mapa', icono: 'map' },
  { valor: 'estadisticas', icono: 'chartNoAxesColumn' },
  { valor: 'tramos', icono: 'listChecks' },
  { valor: 'voz', icono: 'volume' },
];

/** Las cuatro pestañas con íconos. Cambian al instante (se tocan muchas veces): sin animación. */
export function PestanasDeLaCarrera({ valor, onCambiar }: { valor: PestanaDeLaCarrera; onCambiar: (p: PestanaDeLaCarrera) => void }) {
  const { c } = useTheme();
  return (
    <View style={[estilos.pestanas, { borderColor: c.border }]} accessibilityRole="tablist">
      {PESTANAS.map(p => {
        const elegida = p.valor === valor;
        return (
          <Presionable
            key={p.valor}
            onPress={() => {
              if (!elegida) tacto.seleccion();
              onCambiar(p.valor);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: elegida }}
            accessibilityLabel={TEXTOS_DE_LA_CARRERA.pestanas[p.valor]}
            contenedorStyle={{ flex: 1 }}
            style={[estilos.pestana, elegida ? { backgroundColor: c.goldWash } : null]}
          >
            <Icon name={p.icono} size={TAMANO_ICONO.normal} color={elegida ? c.goldInk : c.textSoft} />
            <Text style={[estilos.textoPestana, { color: elegida ? c.goldInk : c.textSoft, fontFamily: elegida ? fuentes.seminegrita : fuentes.media }]}>
              {TEXTOS_DE_LA_CARRERA.pestanas[p.valor]}
            </Text>
          </Presionable>
        );
      })}
    </View>
  );
}

/** Los 8 datos de «Estadísticas» (FR-008). Sin pasos (sin permiso o sin sensor) no se muestran los de pasos (FR-036). */
export function PanelEstadisticas({ e, ahora }: { e: EstadoDeLaCarrera; ahora: number }) {
  const act = activoMs(e, ahora) / 1000;
  const ritmoMedio = ritmoSegPorKm(e.distanciaM, act);
  const ritmoActual = ritmoActualSegPorKm(e, ahora);
  const ppm = pasosPorMinuto(e, ahora);
  const datos: Array<[string, string]> = [
    ['Distancia', `${formatoKm(e.distanciaM)} km`],
    ['Ritmo medio', `${formatoRitmo(ritmoMedio)} min/km`],
    ['Ritmo actual', `${formatoRitmo(ritmoActual)} min/km`],
    ['Velocidad', `${formatoVelocidad(velocidadKmh(e.distanciaM, act))} km/h`],
    ['Calorías aprox.', `${formatoEntero(e.caloriasKcal)} kcal`],
    ...(e.conPasos
      ? ([
          ['Pasos', formatoEntero(e.pasos)],
          ['Pasos por minuto', ppm != null ? formatoEntero(ppm) : '–'],
        ] as Array<[string, string]>)
      : []),
    ['Subida acumulada', `${formatoEntero(e.subidaM)} m`],
  ];
  const { c } = useTheme();
  return (
    <View style={estilos.rejilla}>
      {datos.map(([rotulo, valor]) => (
        <View key={rotulo} style={[estilos.celda, { backgroundColor: c.cardBgAlt, borderColor: c.border }]} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
          <Text style={[estilos.valorCelda, { color: c.textStrong }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {valor}
          </Text>
          <Text style={[estilos.rotuloCelda, { color: c.textSoft }]}>{rotulo}</Text>
        </View>
      ))}
    </View>
  );
}

/** Los tramos por km (FR-009), con una barra por tramo; el mejor km completo, en verde. */
export function PanelTramos({ tramos }: { tramos: readonly Tramo[] }) {
  const { c, t } = useTheme();
  if (tramos.length === 0) {
    return <Text style={[t.body, { color: c.textSoft }]}>Tu primer tramo aparece al llegar a 10 m.</Text>;
  }
  const mejor = indiceDelMejorKm(tramos);
  const ritmos = tramos.map(tr => (tr.segundos / Math.max(1, tr.metros)) * 1000);
  const masRapido = Math.min(...ritmos);
  return (
    <View style={estilos.tramos}>
      {tramos.map((tr, i) => {
        const esMejor = i === mejor;
        const largo = Math.max(0.15, Math.min(1, masRapido / ritmos[i]));
        const texto = `${formatoRitmo(ritmos[i])} min/km`;
        return (
          <View
            key={tr.km}
            style={estilos.tramo}
            accessible
            accessibilityLabel={`Kilómetro ${tr.km}${tr.parcial ? ', en curso' : ''}: ${texto}${esMejor ? ', tu mejor kilómetro' : ''}`}
          >
            <Text style={[estilos.kmTramo, { color: c.textStrong }]}>{tr.parcial ? `Km ${tr.km}*` : `Km ${tr.km}`}</Text>
            <View style={[estilos.pistaTramo, { backgroundColor: c.border }]}>
              <View style={[estilos.barraTramo, { width: `${Math.round(largo * 100)}%`, backgroundColor: esMejor ? c.success : c.gold }]} />
            </View>
            <Text style={[estilos.ritmoTramo, { color: esMejor ? c.success : c.textSoft }]}>{texto}</Text>
          </View>
        );
      })}
      {tramos.some(tr => tr.parcial) ? <Text style={[t.small, { color: c.textSoft }]}>* El último tramo todavía no llega al km.</Text> : null}
    </View>
  );
}

/** «Voz y sonidos» (FR-010): las preferencias, por cuenta en el teléfono. Se guardan en el acto. */
export function PanelVoz({ prefs, onCambiar }: { prefs: PreferenciasDeLaCarrera; onCambiar: (p: PreferenciasDeLaCarrera) => void }) {
  const { c, t } = useTheme();
  const fila = (rotulo: string, valor: boolean, cambiar: (v: boolean) => void) => (
    <View key={rotulo} style={estilos.filaVoz}>
      <Text style={[t.body, { color: c.textStrong, flex: 1 }]}>{rotulo}</Text>
      <Interruptor valor={valor} onCambiar={cambiar} etiqueta={rotulo} />
    </View>
  );
  return (
    <View style={estilos.voz}>
      <Text style={[estilos.subtitulo, { color: c.textStrong }]}>Avisos de voz</Text>
      <ControlSegmentado
        rol="radio"
        accessibilityLabel="Avisos de voz"
        opciones={[
          { valor: 'km', etiqueta: 'Cada 1 km' },
          { valor: '5min', etiqueta: 'Cada 5 min' },
          { valor: 'nunca', etiqueta: 'Nunca' },
        ]}
        valor={prefs.avisos}
        onCambiar={avisos => onCambiar({ ...prefs, avisos })}
      />
      <Text style={[estilos.subtitulo, { color: c.textStrong }]}>Qué dice</Text>
      {fila('Distancia', prefs.dice.distancia, v => onCambiar({ ...prefs, dice: { ...prefs.dice, distancia: v } }))}
      {fila('Tiempo', prefs.dice.tiempo, v => onCambiar({ ...prefs, dice: { ...prefs.dice, tiempo: v } }))}
      {fila('Ritmo', prefs.dice.ritmo, v => onCambiar({ ...prefs, dice: { ...prefs.dice, ritmo: v } }))}
      {fila('Ritmo del último km', prefs.dice.ritmoUltimoKm, v => onCambiar({ ...prefs, dice: { ...prefs.dice, ritmoUltimoKm: v } }))}
      <Text style={[estilos.subtitulo, { color: c.textStrong }]}>Sonidos y pantalla</Text>
      {fila('Pitidos', prefs.pitidos, v => onCambiar({ ...prefs, pitidos: v }))}
      {fila('Pausa automática', prefs.pausaAutomatica, v => onCambiar({ ...prefs, pausaAutomatica: v }))}
      {fila('Pantalla siempre encendida', prefs.pantallaEncendida, v => onCambiar({ ...prefs, pantallaEncendida: v }))}
      {fila('Guardar mi ruta', prefs.guardarRuta, v => onCambiar({ ...prefs, guardarRuta: v }))}
    </View>
  );
}

const estilos = StyleSheet.create({
  dato: { flex: 1, alignItems: 'center', gap: 2 },
  valorDato: { fontFamily: fuentes.negrita, fontSize: 24, fontVariant: ['tabular-nums'] },
  rotuloDato: { fontFamily: fuentes.media, fontSize: 13 },
  filaDatos: { flexDirection: 'row', gap: 8 },
  pestanas: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 4, gap: 4 },
  pestana: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  textoPestana: { fontSize: 12 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  celda: { flexBasis: '48%', flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 12, gap: 2 },
  valorCelda: { fontFamily: fuentes.negrita, fontSize: 20, fontVariant: ['tabular-nums'] },
  rotuloCelda: { fontFamily: fuentes.media, fontSize: 13 },
  tramos: { gap: 10 },
  tramo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  kmTramo: { width: 52, fontFamily: fuentes.seminegrita, fontSize: 15 },
  pistaTramo: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barraTramo: { height: '100%', borderRadius: 5 },
  ritmoTramo: { width: 96, textAlign: 'right', fontFamily: fuentes.media, fontSize: 14, fontVariant: ['tabular-nums'] },
  voz: { gap: 10 },
  subtitulo: { fontFamily: fuentes.seminegrita, fontSize: 16, marginTop: 6 },
  filaVoz: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 12 },
});
