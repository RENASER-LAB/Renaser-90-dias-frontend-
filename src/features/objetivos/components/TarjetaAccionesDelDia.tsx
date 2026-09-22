import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { useAccionesDelMapa } from '../../mapa-renacimiento/hooks/useAccionesDelMapa';
import { useTheme } from '../../../theme/ThemeContext';
import type { Palette } from '../../../theme/tokens';
import type { useRocasDiarias } from '../hooks/useRocasDiarias';
import type { useRocasSemanales } from '../hooks/useRocasSemanales';
import type { ItemPlanDiario, RocaDiariaApi } from '../types/objetivos.types';
import { ETIQUETA_EJE } from '../types/objetivos.types';
import { AgendarAccionesModal } from './AgendarAccionesModal';
import { Icon } from '../../../components/Icon';

/**
 * Parte 3 del plan: el día.
 *
 * **Acá cierra el circuito.** Las acciones que se agendan desde esta tarjeta son las mismas que
 * Training muestra en la dimensión **VIDA Y NEGOCIO** — que hoy marca `0/0 CUMPLIDOS` justamente
 * porque nadie planifica rocas. El recorrido completo: objetivo de 90 días → roca de la semana →
 * tres acciones críticas → agendadas con hora → aparecen en el entrenamiento del día.
 *
 * **No se ofrece antes que la parte 2.** `POST /rocks/plan` exige la roca semanal del eje: sin ella
 * responde `400 NO_WEEKLY_ROCK`. Ofrecer el botón igual sería ofrecer un error.
 */

interface TarjetaAccionesDelDiaProps {
  diaria: ReturnType<typeof useRocasDiarias>;
  semanal: ReturnType<typeof useRocasSemanales>;
  diaPrograma: number;
}

export function TarjetaAccionesDelDia({ diaria, semanal, diaPrograma }: TarjetaAccionesDelDiaProps) {
  const { c, t } = useTheme();
  const [agendando, setAgendando] = useState(false);
  /* Solo cuando el planificador se abre: quien nunca lo toca no paga la lectura del Mapa. */
  const accionesDelMapa = useAccionesDelMapa(agendando);

  const hayPlanSemanal = semanal.estado === 'planificada' || semanal.estado === 'cerrada';
  // Los dos cubos vienen del servidor, que es el único que sabe en qué día está el participante.
  const cubos: { titulo: string; rocas: RocaDiariaApi[] }[] = [
    { titulo: 'Hoy', rocas: diaria.hoy },
    { titulo: 'Mañana', rocas: diaria.manana },
  ].filter(cubo => cubo.rocas.length > 0);

  const guardar = async (items: ItemPlanDiario[]) => {
    const resultado = await diaria.planificar(diaria.objetivo.fecha, items);
    setAgendando(false);
    if (!resultado.ok) {
      Alert.alert('Tus acciones del día', resultado.mensaje);
    }
  };

  return (
    <View style={[estilos.tarjeta, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
      <View style={estilos.encabezado}>
        <Icon name="target" size={18} color={c.goldInk} />
        <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1, fontSize: 12 }]}>
          3. TUS ACCIONES · DÍA {diaPrograma}
        </Text>
      </View>

      {!hayPlanSemanal ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 15, marginTop: 8, lineHeight: 22 }]}>
          Primero arma tu semana. Las acciones del día salen de las que escribiste en tu Mapa, no
          se escriben sueltas.
        </Text>
      ) : cubos.length > 0 ? (
        <View style={{ gap: 10, marginTop: 10 }}>
          {cubos.map(cubo => (
            <View key={cubo.titulo} style={{ gap: 10 }}>
              {/* El rótulo sale de en qué cubo lo puso el servidor, no del reloj del teléfono:
                  a las 00:41 el dispositivo puede estar un día adelante del participante. */}
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                {cubo.titulo.toUpperCase()}
              </Text>
              {cubo.rocas.map(roca => (
            <View key={roca.id} style={[estilos.fila, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
              {/* El color es la regla de Pareto, no decoración: la VERDE va primero y desbloquea
                  a las otras dos de su eje. */}
              <View style={[estilos.marca, { backgroundColor: colorDePareto(roca.color, c) }]} />
              <View style={{ flex: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22 }]}>{roca.titulo}</Text>
                <Text style={[t.small, { color: c.textSoft, fontSize: 14, marginTop: 2 }]}>
                  {ETIQUETA_EJE[roca.eje]}
                  {roca.horaInicio ? ` · ${roca.horaInicio.slice(0, 5)}` : ''}
                  {roca.bloqueada ? ' · se abre al completar la primera' : ''}
                </Text>
              </View>
              {roca.completada && (
                <Text style={[t.small, { color: c.success, fontFamily: 'Jost_700Bold', fontSize: 14 }]}>✓</Text>
              )}
                </View>
              ))}
            </View>
          ))}
          <Text style={[t.small, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>
            Las marcas con evidencia desde Entrenamiento, en Vida y Negocio.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12, marginTop: 8 }}>
          <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 22 }]}>
            Todavía no agendaste acciones. Elige cuáles de tu semana caen ahora, y a qué hora. Desde
            las 18:00 el programa planifica el día siguiente.
          </Text>
          <Pressable
            onPress={() => setAgendando(true)}
            style={[estilos.boton, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
          >
            <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
              Agendar mis acciones
            </Text>
          </Pressable>
        </View>
      )}

      {!!diaria.error && (
        <Text style={[t.small, { color: c.danger, fontSize: 14, marginTop: 8 }]}>{diaria.error}</Text>
      )}

      <AgendarAccionesModal
        visible={agendando}
        semanal={semanal}
        fecha={diaria.objetivo.fecha}
        accionesDelMapa={accionesDelMapa}
        guardando={diaria.guardando}
        onGuardar={guardar}
        onCerrar={() => setAgendando(false)}
      />
    </View>
  );
}

/* Recibe la paleta en vez de leer colores fijos: el verde y el rojo cambian con el tema
   (el verde claro fallaba AA sobre fondo crema) y el ambar sale del degradado dorado. */
function colorDePareto(color: RocaDiariaApi['color'], c: Palette): string {
  switch (color) {
    case 'VERDE':
      return c.success;
    case 'AMARILLA':
      return c.goldGrad[0];
    default:
      return c.danger;
  }
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 16 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14 },
  marca: { width: 6, height: 34, borderRadius: 3 },
  boton: { minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
