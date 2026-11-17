import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { GrillaDelMes } from '../../eventos/components/GrillaDelMes';
import { mesDeLaFecha, mismoMes, moverMes, nombreDelMes, type Mes } from '../../eventos/utils/calendarioDelMes';
import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';
import { coloresDelSemaforo } from '../../semaforo/utils/coloresDelSemaforo';
import { sePuedeElegir, tituloDelDia } from '../utils/fechasDeLaFicha';

/**
 * El mes desplegado de la ficha (spec 055 FR-015): la grilla del calendario de Eventos (`GrillaDelMes`) con el color del semáforo de
 * cada día. Se puede ir a meses anteriores hasta el del Día 1 y no a los futuros; un día antes del Día 1 o posterior a hoy va sin
 * color y no se elige. «Ver solo la semana» lo pliega (lo pone quien lo usa).
 */
export function MesDeColores({
  mes,
  hoy,
  diaUno,
  elegido,
  colorDe,
  onElegir,
  onCambiarMes,
}: {
  mes: Mes;
  hoy: string;
  diaUno: string | null;
  elegido: string | null;
  colorDe: (fecha: string) => ColorSemaforo | null;
  onElegir: (fecha: string) => void;
  onCambiarMes: (mes: Mes) => void;
}) {
  const { c, t } = useTheme();
  const primerMes = diaUno ? mesDeLaFecha(diaUno) : mesDeLaFecha(hoy);
  const ultimoMes = mesDeLaFecha(hoy);
  const hayAnterior = !mismoMes(mes, primerMes) && mes.anio * 12 + mes.mes > primerMes.anio * 12 + primerMes.mes;
  const haySiguiente = mes.anio * 12 + mes.mes < ultimoMes.anio * 12 + ultimoMes.mes;

  return (
    <View style={{ gap: 8 }}>
      <View style={estilos.cabecera}>
        <Presionable
          onPress={() => onCambiarMes(moverMes(mes, -1))}
          disabled={!hayAnterior}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          accessibilityState={{ disabled: !hayAnterior }}
          style={[estilos.flecha, { opacity: hayAnterior ? 1 : 0.35 }]}
        >
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={16} color={c.goldInk} />
          </View>
        </Presionable>
        <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong, flex: 1, textAlign: 'center' }]}>
          {nombreDelMes(mes)}
        </Text>
        <Presionable
          onPress={() => onCambiarMes(moverMes(mes, 1))}
          disabled={!haySiguiente}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          accessibilityState={{ disabled: !haySiguiente }}
          style={[estilos.flecha, { opacity: haySiguiente ? 1 : 0.35 }]}
        >
          <Icon name="chevron" size={16} color={c.goldInk} />
        </Presionable>
      </View>

      <GrillaDelMes
        mes={mes}
        empiezaEn="sabado"
        renderDia={celda => {
          /* Los días de otro mes no se dibujan: en Android un texto «transparente» sale negro y parecían elegibles. */
          if (!celda.delMes) return <View key={celda.fecha} style={estilos.celda} />;
          const elegible = celda.delMes && sePuedeElegir(celda.fecha, diaUno, hoy);
          const color = elegible ? colorDe(celda.fecha) : null;
          const esElElegido = celda.fecha === elegido;
          return (
            <Presionable
              onPress={() => onElegir(celda.fecha)}
              disabled={!elegible}
              accessibilityRole="button"
              accessibilityState={{ selected: esElElegido, disabled: !elegible }}
              accessibilityLabel={`${tituloDelDia(celda.fecha)}${elegible ? '' : ', fuera del programa'}`}
              contenedorStyle={estilos.celda}
              style={estilos.contenidoDeLaCelda}
            >
              <View
                testID={`dia-${celda.fecha}`}
                style={[
                  estilos.dia,
                  color && color !== 'SIN_DATOS'
                    ? { backgroundColor: coloresDelSemaforo(color, c).lavado, borderWidth: 1.5, borderColor: coloresDelSemaforo(color, c).relleno }
                    : null,
                  esElElegido ? { borderWidth: 2.5, borderColor: c.gold } : null,
                ]}
              >
                <Text
                  style={[
                    estilos.numero,
                    {
                      color: elegible ? c.textStrong : c.tabInactive,
                      /* La letra no cambia al elegir: en Android, cambiar la fuente de un texto ya dibujado lo dejaba invisible
                         (el 17 desaparecía al elegir otro día). El elegido se marca con el anillo dorado. */
                      fontFamily: fuentes.media,
                    },
                  ]}
                >
                  {celda.dia}
                </Text>
              </View>
            </Presionable>
          );
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flecha: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  celda: { flex: 1, height: 52 },
  contenidoDeLaCelda: { height: 52, alignItems: 'center', justifyContent: 'center' },
  dia: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  numero: { fontSize: 15 /* metadato */},
});
