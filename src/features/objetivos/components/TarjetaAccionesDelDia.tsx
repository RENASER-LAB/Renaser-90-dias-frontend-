import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { useAccionesDelMapa } from '../../mapa-renacimiento/hooks/useAccionesDelMapa';
import { useTheme } from '../../../theme/ThemeContext';
import type { Palette } from '../../../theme/tokens';
import type { useRocasDiarias } from '../hooks/useRocasDiarias';
import type { useRocasSemanales } from '../hooks/useRocasSemanales';
import type { EjeObjetivo, ItemPlanDiario, RocaDiariaApi } from '../types/objetivos.types';
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
  /**
   * El eje que se está mirando. **Esta tarjeta muestra SOLO sus acciones.**
   *
   * > **Agregado el 2026-09-23.** Mezclaba los tres ejes en una lista, así que estando en Negocio
   * > la única acción visible era *"Caminar 40 minutos · Cuerpo"*. El dueño lo pidió así: *"cada
   * > categoría tiene sus propias acciones, no es que se junte con Negocio"*.
   * >
   * > **Esto NO cambia dónde se cumplen.** Training sigue mostrando las de los tres ejes juntas en
   * > VIDA Y NEGOCIO: esa pantalla lee `GET /rocks/today` por su cuenta (`trainingApi`) y no pasa
   * > por acá. Lo que se filtra es la vista de Plan, no lo que se guarda ni lo que se evidencia.
   */
  ejeAbierto: EjeObjetivo;
}

export function TarjetaAccionesDelDia({ diaria, semanal, diaPrograma, ejeAbierto }: TarjetaAccionesDelDiaProps) {
  const { c, t } = useTheme();
  const [agendando, setAgendando] = useState(false);
  /* Solo cuando el planificador se abre: quien nunca lo toca no paga la lectura del Mapa. */
  const accionesDelMapa = useAccionesDelMapa(agendando);

  const hayPlanSemanal = semanal.estado === 'planificada' || semanal.estado === 'cerrada';
  // Los dos cubos vienen del servidor, que es el único que sabe en qué día está el participante.
  const delEjeAbierto = (rocas: RocaDiariaApi[]) => rocas.filter(roca => roca.eje === ejeAbierto);
  const cubos: { titulo: string; rocas: RocaDiariaApi[] }[] = [
    { titulo: 'Hoy', rocas: delEjeAbierto(diaria.hoy) },
    { titulo: 'Mañana', rocas: delEjeAbierto(diaria.manana) },
  ].filter(cubo => cubo.rocas.length > 0);

  /* La fecha la elige la persona en la fila de días del modal, no la propone más esta tarjeta:
     desde el 2026-09-22 se puede agendar cualquier día que quede de la semana. */
  const guardar = async (items: ItemPlanDiario[], fecha: string) => {
    const resultado = await diaria.planificar(fecha, items);
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
                {/* Los pasos, si los escribió. Numerados y en chico: son el CÓMO del objetivo, no
                    tareas propias — el que se cierra con evidencia es el objetivo, uno solo. */}
                {roca.acciones.map((accion, indice) => (
                  <Text key={indice} style={[t.small, { color: c.micro, fontSize: 13, marginTop: 2 }]}>
                    {indice + 1}. {accion}
                  </Text>
                ))}
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
          {/* Con algo ya agendado, el planificador seguía existiendo pero sin puerta: el botón solo
              salía cuando no había NADA. Planificabas un día y ya no podías abrir para agendar el
              viernes — justo lo que el dueño pidió poder hacer ("planifico para todo lo que
              queda"). Se vio probando: la tarjeta mostraba el plan de hoy y el botón desaparecía. */}
          <Pressable onPress={() => setAgendando(true)} hitSlop={10}>
            <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
              Agendar otro día
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 12, marginTop: 8 }}>
          <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 22 }]}>
            Todavía no agendaste acciones de {ETIQUETA_EJE[ejeAbierto]}. Elige cuáles caen cada día
            que quede de la semana, y a qué hora. Desde las 18:00 el día en curso ya no se reacomoda.
          </Text>
          <Pressable
            onPress={() => setAgendando(true)}
            style={[estilos.boton, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
          >
            <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15, textAlign: 'center' }]}>
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
  /*
   * `paddingVertical` además del `minHeight`: con la fuente del sistema en grande, "Agendar mis
   * acciones" no entra en un renglón y se veía cortado en "Agendar mis" (visto en el emulador el
   * 2026-09-23). El alto fijo no dejaba lugar al segundo renglón; con padding el botón crece.
   */
  boton: { minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10 },
});
