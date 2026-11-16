import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Interruptor } from '../../../components/Interruptor';
import { BotonSecundario } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import {
  DIAS_DE_LA_SEMANA,
  MAX_SEMANAS,
  SEMANAS_SUGERIDAS,
  alternarDia,
  primeraFechaDeLaSerie,
  resumenDeLaRepeticion,
  type FinDeLaRepeticion,
  type RepeticionDelFormulario,
} from '../utils/repeticionDelEvento';
import { diaEnPalabras } from '../utils/textosDeFecha';
import { sumarDiasIso } from '../utils/zonaHoraria';
import { LETRA, Parrafo } from './piezas';

const FINES: ReadonlyArray<{ tipo: FinDeLaRepeticion['tipo']; nombre: string }> = [
  { tipo: 'semanas', nombre: 'Semanas' },
  { tipo: 'hasta', nombre: 'Hasta' },
];

const acotar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * «Repetir» al crear un evento (spec 053, FR-007 a FR-010; D-357). Un interruptor; al prenderlo, siete botones de día (L M M J V S D) con el de la
 * fecha ya marcado, un fin por semanas (4 de entrada), hasta una fecha o cantidad de veces, y una línea que lo dice en palabras. Sin calendarios.
 */
export function RepetirPorDias({
  valor,
  fecha,
  onCambiar,
}: {
  valor: RepeticionDelFormulario;
  /** La fecha elegida del evento (`YYYY-MM-DD`). */
  fecha: string;
  onCambiar: (nuevo: RepeticionDelFormulario) => void;
}) {
  const { c } = useTheme();
  const primera = primeraFechaDeLaSerie(fecha, valor.dias);

  const cambiarFin = (tipo: FinDeLaRepeticion['tipo']) => {
    if (valor.fin.tipo === tipo) return;
    if (tipo === 'semanas') onCambiar({ ...valor, fin: { tipo, semanas: SEMANAS_SUGERIDAS } });
    else onCambiar({ ...valor, fin: { tipo, fecha: sumarDiasIso(primera, 7 * SEMANAS_SUGERIDAS - 1) } });
  };

  /** Mueve el fin: semanas y veces de a uno; «hasta», de a un día o de a una semana. */
  const mover = (delta: number, dias = false) => {
    const fin = valor.fin;
    if (fin.tipo === 'semanas') onCambiar({ ...valor, fin: { tipo: 'semanas', semanas: acotar(fin.semanas + delta, 1, MAX_SEMANAS) } });
    else {
      const nueva = sumarDiasIso(fin.fecha, dias ? delta : 7 * delta);
      onCambiar({ ...valor, fin: { tipo: 'hasta', fecha: nueva < primera ? primera : nueva } });
    }
  };

  const textoDelFin =
    valor.fin.tipo === 'semanas'
      ? `${valor.fin.semanas} ${valor.fin.semanas === 1 ? 'semana' : 'semanas'}`
      : diaEnPalabras(valor.fin.fecha);

  return (
    <View style={{ gap: 12 }}>
      <View style={[estilos.interruptor, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.opcionTexto, { color: c.textStrong }]}>Repetir</Text>
          <Parrafo>Elige los días de la semana en que se repite.</Parrafo>
        </View>
        <Interruptor
          valor={valor.activa}
          onCambiar={activa => onCambiar({ ...valor, activa })}
          etiqueta="Repetir"
        />
      </View>

      {valor.activa ? (
        <View style={{ gap: 12 }}>
          <View style={estilos.dias}>
            {DIAS_DE_LA_SEMANA.map(d => {
              const on = valor.dias.includes(d.iso);
              return (
                <Pressable
                  key={d.iso}
                  onPress={() => onCambiar(alternarDia(valor, d.iso))}
                  accessibilityRole="checkbox"
                  accessibilityLabel={d.nombre}
                  accessibilityState={{ checked: on }}
                  style={[estilos.dia, { borderColor: on ? c.gold : c.border, backgroundColor: on ? c.goldWash : c.cardBg }]}
                >
                  <Text style={[estilos.diaTexto, { color: c.textStrong, fontFamily: on ? fuentes.seminegrita : fuentes.media }]}>{d.letra}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={estilos.chips}>
            {FINES.map(f => {
              const on = valor.fin.tipo === f.tipo;
              return (
                <Pressable
                  key={f.tipo}
                  onPress={() => cambiarFin(f.tipo)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Terminar por ${f.nombre.toLowerCase()}`}
                  accessibilityState={{ checked: on }}
                  style={[estilos.chip, { borderColor: on ? c.gold : c.border, backgroundColor: on ? c.goldWash : c.cardBg }]}
                >
                  <Text style={[estilos.opcionTexto, { color: c.textStrong }]}>{f.nombre}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={estilos.paso}>
            {valor.fin.tipo === 'hasta' ? (
              <BotonSecundario etiqueta="‹‹" accessibilityLabel="Una semana antes" estilo={estilos.flecha} onPress={() => mover(-1)} />
            ) : null}
            <BotonSecundario
              etiqueta="‹"
              accessibilityLabel={valor.fin.tipo === 'hasta' ? 'Un día antes' : 'Menos'}
              estilo={estilos.flecha}
              onPress={() => mover(-1, true)}
            />
            <Text style={[estilos.valor, { color: c.textStrong }]} accessibilityLiveRegion="polite">
              {textoDelFin}
            </Text>
            <BotonSecundario
              etiqueta="›"
              accessibilityLabel={valor.fin.tipo === 'hasta' ? 'Un día después' : 'Más'}
              estilo={estilos.flecha}
              onPress={() => mover(1, true)}
            />
            {valor.fin.tipo === 'hasta' ? (
              <BotonSecundario etiqueta="››" accessibilityLabel="Una semana después" estilo={estilos.flecha} onPress={() => mover(1)} />
            ) : null}
          </View>

          <Text style={[estilos.resumen, { color: c.textStrong }]} accessibilityLiveRegion="polite">
            {resumenDeLaRepeticion(valor, fecha)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  opcionTexto: { fontFamily: fuentes.media, fontSize: 17, lineHeight: 22, flexShrink: 1 },
  dias: { flexDirection: 'row', gap: 6, width: '100%' },
  dia: { flex: 1, minHeight: 52, minWidth: 0, borderWidth: 1.5, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  diaTexto: { fontSize: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center' },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flecha: { width: 52 },
  valor: { flex: 1, textAlign: 'center', fontFamily: fuentes.media, fontSize: 17 },
  resumen: { fontFamily: fuentes.seminegrita, fontSize: LETRA.cuerpo, lineHeight: 22 },
});
