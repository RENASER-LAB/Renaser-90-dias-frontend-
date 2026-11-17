import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';
import { coloresDelSemaforo } from '../../semaforo/utils/coloresDelSemaforo';
import { inicialDelDia, numeroDelDia, sePuedeElegir, tituloDelDia } from '../utils/fechasDeLaFicha';

/** El círculo de cada día (spec 055 FR-011): 24 px de color; el elegido lleva un anillo dorado por fuera. */
export const LADO_DEL_CIRCULO = 24;
const PALABRA: Record<ColorSemaforo, string> = { VERDE: 'verde', AMARILLO: 'amarillo', ROJO: 'rojo', SIN_DATOS: 'sin color' };

/**
 * La semana del aprendiz en siete círculos, de sábado a viernes (la misma del semáforo). El color de cada día es el que ya calcula
 * el semáforo (`colorDe`); un día antes del Día 1 o futuro va sin color y no se elige. Cada columna es un toque de 48 de alto con
 * su inicial y su número; el color nunca va solo: el lector de pantalla dice la palabra.
 */
export function SemanaDeCirculos({
  fechas,
  elegido,
  hoy,
  diaUno,
  colorDe,
  onElegir,
}: {
  /** Los 7 días, de sábado a viernes. */
  fechas: readonly string[];
  elegido: string | null;
  hoy: string;
  diaUno: string | null;
  colorDe: (fecha: string) => ColorSemaforo | null;
  onElegir: (fecha: string) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={estilos.fila} accessibilityRole="tablist">
      {fechas.map(fecha => {
        const elegible = sePuedeElegir(fecha, diaUno, hoy);
        const color = elegible ? colorDe(fecha) : null;
        const esElElegido = fecha === elegido;
        return (
          <Presionable
            key={fecha}
            onPress={() => onElegir(fecha)}
            disabled={!elegible}
            accessibilityRole="tab"
            accessibilityState={{ selected: esElElegido, disabled: !elegible }}
            accessibilityLabel={`${tituloDelDia(fecha)}${elegible ? `, ${PALABRA[color ?? 'SIN_DATOS']}` : ', fuera del programa'}`}
            contenedorStyle={estilos.columna}
            style={estilos.contenido}
          >
            <Text style={[estilos.inicial, { color: c.textSoft }]}>{inicialDelDia(fecha)}</Text>
            <View style={[estilos.anillo, { borderColor: esElElegido ? c.gold : 'transparent' }]}>
              <View
                testID={`circulo-${fecha}`}
                style={[
                  estilos.circulo,
                  color && color !== 'SIN_DATOS'
                    ? { backgroundColor: coloresDelSemaforo(color, c).relleno }
                    : { borderWidth: 1.5, borderColor: c.divider, backgroundColor: elegible ? c.cardBgAlt : 'transparent' },
                ]}
              />
            </View>
            <Text style={[estilos.numero, { color: elegible ? c.text : c.tabInactive, fontFamily: esElElegido ? fuentes.negrita : fuentes.regular }]}>
              {numeroDelDia(fecha)}
            </Text>
          </Presionable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row' },
  columna: { flex: 1, minHeight: 72 },
  contenido: { alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 72 },
  inicial: { fontFamily: fuentes.negrita, fontSize: 12, lineHeight: 16 },
  anillo: { width: LADO_DEL_CIRCULO + 10, height: LADO_DEL_CIRCULO + 10, borderRadius: (LADO_DEL_CIRCULO + 10) / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  circulo: { width: LADO_DEL_CIRCULO, height: LADO_DEL_CIRCULO, borderRadius: LADO_DEL_CIRCULO / 2 },
  numero: { fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] },
});
