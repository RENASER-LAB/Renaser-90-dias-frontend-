import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import type { DiaConHuecos } from '../types/huecos.types';
import {
  avisoDeHoraQueFalta,
  conteosDelDia,
  type MomentoDelDia,
  titularDelDia,
} from '../utils/agendaDelDia';
import { diaCorto, duracionEnPalabras } from '../utils/textosDeHuecos';
import { LineaDeTiempoDelDia } from './LineaDeTiempoDelDia';

/** Lo que dice la agenda de un día de una semana cerrada, que no guarda lo que ocupaba cada hora. */
export const TEXTO_DE_DIA_SIN_DETALLE = 'De una semana cerrada solo queda guardado el tiempo libre.';
/** Lo que dice la agenda de un día de la semana en curso cuyo detalle el servidor no mandó (un servidor sin esta mejora). */
export const TEXTO_DE_DIA_SIN_DETALLE_AUN = 'Todavía no hay detalle de lo que ocupa este día.';

type Tono = 'ok' | 'tarde' | 'mal' | 'neutro' | 'libre';

/**
 * El día elegido (spec 015, corregido 2026-10-29): su nombre («Jueves 29 · hoy») con su ventana, lo cumplido o «Todavía no
 * llega», las horas libres y la agenda hora por hora. Sin ventana no hay agenda que dibujar: dice qué hora falta.
 *
 * **Nada de «sin cumplir» en rojo para lo que no es una falta**: un día que no llega o sin registros no escribe ceros (el
 * servidor manda ceros en un día por venir y eso no es un resultado). Las etiquetas llevan siempre número y palabra: el
 * color no es lo único que dice qué son.
 */
export function AgendaDelDia({ dia, momento, cerrada }: { dia: DiaConHuecos; momento: MomentoDelDia; cerrada: boolean }) {
  const { c, t } = useTheme();
  const nombre = diaCorto(dia.fecha);
  const titular = titularDelDia(nombre, momento);
  const ventana = dia.ventana ? `${dia.ventana.desde} a ${dia.ventana.hasta}` : null;
  const conteos = conteosDelDia(dia);
  const aviso = dia.ventana ? null : avisoDeHoraQueFalta(dia.sinVentanaPor);

  return (
    <View>
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={ventana ? `${titular}, de ${dia.ventana?.desde} a ${dia.ventana?.hasta}` : titular}
        style={estilos.cabecera}
      >
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18, lineHeight: 24 }]}>{titular}</Text>
        {ventana ? (
          <Text style={[t.body, estilos.ventana, { color: c.textSoft }]}>{ventana}</Text>
        ) : null}
      </View>

      <View style={estilos.etiquetas}>
        {momento === 'futuro' ? <Etiqueta texto="Todavía no llega" tono="neutro" /> : null}
        {momento !== 'futuro' && conteos ? (
          <>
            <Etiqueta texto={`${conteos.aTiempo} a tiempo`} tono="ok" />
            <Etiqueta texto={`${conteos.tarde} tarde`} tono="tarde" />
            <Etiqueta texto={`${conteos.sinCumplir} sin cumplir`} tono="mal" />
          </>
        ) : null}
        {dia.ventana && dia.minutosLibres !== null ? (
          <Etiqueta texto={`${duracionEnPalabras(dia.minutosLibres)} libres`} tono="libre" />
        ) : null}
      </View>

      {aviso ? (
        <View accessible accessibilityLabel={`${aviso.titulo}. ${aviso.detalle}`} style={estilos.aviso}>
          <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>
            <Text style={{ fontFamily: 'Jost_700Bold' }}>{aviso.titulo}. </Text>
            {aviso.detalle}
          </Text>
        </View>
      ) : null}

      {dia.ventana ? (
        <>
          {dia.ocupados === null ? (
            <Text style={[t.body, estilos.nota, { color: c.textSoft }]}>
              {cerrada ? TEXTO_DE_DIA_SIN_DETALLE : TEXTO_DE_DIA_SIN_DETALLE_AUN}
            </Text>
          ) : null}
          <LineaDeTiempoDelDia ventana={dia.ventana} huecos={dia.huecos} ocupados={dia.ocupados} />
        </>
      ) : null}
    </View>
  );
}

/** Una etiqueta chica de lectura: sin botón, 13 px en negrita, con el color del tono sobre su lavado. */
function Etiqueta({ texto, tono }: { texto: string; tono: Tono }) {
  const { c } = useTheme();
  const colores: Record<Tono, { fondo: string; tinta: string; borde: string }> = {
    ok: { fondo: c.successWash, tinta: c.success, borde: 'transparent' },
    tarde: { fondo: c.goldWash, tinta: c.goldInk, borde: 'transparent' },
    mal: { fondo: c.dangerWash, tinta: c.danger, borde: 'transparent' },
    neutro: { fondo: c.cardBgAlt, tinta: c.textSoft, borde: c.border },
    libre: { fondo: c.goldWash, tinta: c.goldInk, borde: c.gold },
  };
  const { fondo, tinta, borde } = colores[tono];
  return (
    <View style={[estilos.etiqueta, { backgroundColor: fondo, borderColor: borde }]}>
      <Text style={[estilos.textoDeEtiqueta, { color: tinta }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: 10, marginTop: 18 },
  ventana: { fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums'] },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  etiqueta: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1 },
  textoDeEtiqueta: { fontFamily: 'Jost_700Bold', fontSize: 13, lineHeight: 18 },
  aviso: { marginTop: 12 },
  nota: { fontSize: 14, lineHeight: 20, marginTop: 10 },
});
