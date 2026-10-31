import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { DiaConHuecos } from '../types/huecos.types';
import {
  etiquetaDeLaColumna,
  horasCortas,
  letraDelDia,
  momentoDelDia,
  proporcionLibre,
} from '../utils/agendaDelDia';
import { diaCorto } from '../utils/textosDeHuecos';

/** Alto de cada barra: lo bastante alto para que 4 h y 6 h libres se distingan de un vistazo. */
export const ALTO_DE_LA_BARRA = 64;

/**
 * Los siete días de la semana, de lunes a domingo, como siete columnas (spec 015, corregido 2026-10-29: «por día»). Cada
 * una dice cuánto tiempo libre le queda a ese día DENTRO de su ventana de Despertar a Dormir: la barra se llena de dorado
 * en esa proporción, y debajo van las horas libres. Un punto marca hoy. Tocar una columna la elige.
 *
 * - **Un día sin ventana** (sin Despertar o sin Dormir) tiene la barra vacía y «—»: no se sabe cuánto es su día y no se
 *   inventa. Lo mismo si el servidor no mandó los minutos libres.
 * - **La columna entera es el botón**: ~43 dp de ancho en un teléfono de 360 y más de 110 de alto. Con siete columnas no
 *   caben 48 de ancho en ese teléfono; el alto compensa (el mínimo de 48 de `AGENTS.md` §4 se cumple en el alto).
 * - **Cambiar de día es instantáneo**: se hace decenas de veces por visita. Responde con la escala de {@link Presionable}
 *   (0.97), el cambio de fondo y borde, y un «tic» de selección.
 */
export function ColumnasDeLaSemana({
  dias,
  hoy,
  cerrada,
  elegido,
  alElegir,
}: {
  dias: DiaConHuecos[];
  hoy: string | null;
  cerrada: boolean;
  elegido: string | null;
  alElegir: (fecha: string) => void;
}) {
  return (
    <View accessibilityLabel="Días de la semana" style={estilos.fila}>
      {dias.map(dia => (
        <Columna
          key={dia.fecha}
          dia={dia}
          esHoy={momentoDelDia(dia.fecha, hoy, cerrada) === 'hoy'}
          elegida={dia.fecha === elegido}
          alElegir={alElegir}
        />
      ))}
    </View>
  );
}

function Columna({
  dia,
  esHoy,
  elegida,
  alElegir,
}: {
  dia: DiaConHuecos;
  esHoy: boolean;
  elegida: boolean;
  alElegir: (fecha: string) => void;
}) {
  const { c } = useTheme();
  const proporcion = proporcionLibre(dia);
  const horas = dia.ventana ? horasCortas(dia.minutosLibres) : '—';
  const etiqueta = etiquetaDeLaColumna(diaCorto(dia.fecha), dia, esHoy ? 'hoy' : 'pasado');

  return (
    <Presionable
      onPress={() => {
        if (!elegida) tacto.seleccion();
        alElegir(dia.fecha);
      }}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: elegida }}
      contenedorStyle={estilos.contenedor}
      style={[
        estilos.columna,
        { borderColor: elegida ? c.gold : 'transparent', backgroundColor: elegida ? c.ring3 : 'transparent' },
      ]}
    >
      <Text style={[estilos.letra, { color: elegida || esHoy ? c.goldInk : c.textSoft }]} allowFontScaling>
        {letraDelDia(dia.fecha)}
      </Text>
      <View style={[estilos.barra, { backgroundColor: c.border }]}>
        {proporcion !== null && proporcion > 0 ? (
          <View
            testID={`libre-${dia.fecha}`}
            style={[estilos.relleno, { height: `${Math.round(proporcion * 100)}%`, backgroundColor: c.gold }]}
          />
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[estilos.horas, { color: c.textStrong }]}
      >
        {horas}
      </Text>
      {/* El punto de hoy ocupa su lugar en todas: las barras no se corren. */}
      <View style={[estilos.punto, { backgroundColor: esHoy ? c.goldInk : 'transparent' }]} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  /* Sale 8 dp del relleno de la tarjeta (12): ahí ganan las columnas el ancho que no tendrían, ~43 dp en un teléfono de 360. */
  fila: { flexDirection: 'row', gap: 2, marginHorizontal: -8, marginTop: 14 },
  contenedor: { flex: 1, minWidth: 0 },
  columna: {
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 1,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 112,
  },
  letra: { fontFamily: fuentes.negrita, fontSize: 13, lineHeight: 17 },
  barra: { width: 20, height: ALTO_DE_LA_BARRA, borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end' },
  relleno: { width: '100%', borderRadius: 7 },
  horas: { fontFamily: fuentes.negrita, fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'], maxWidth: '100%' },
  punto: { width: 6, height: 6, borderRadius: 3 },
});
