import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Interruptor } from '../../../components/Interruptor';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import type { HabitItem } from '../../../screens/TrainingScreen';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { RenombrarHabitoModal } from '../../habits/components/RenombrarHabitoModal';
import type { useRenombreLocal } from '../../habits/hooks/useRenombreDeHabito';
import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import { esRenombrable, tituloVisible } from '../../habits/utils/renombreDeHabito';
import { DIMENSIONES_CONFIG, type DimensionConfig } from '../data/dimensiones';
import { useRepasoSemanal } from '../hooks/useRepasoSemanal';
import { iconoDeLaDimension } from '../utils/iconoDeLaDimension';
import { PRACTICAS_ABIERTAS, PRACTICAS_CERRADAS, alRetroceder, type EstadoDePracticas } from '../utils/navegacionDePracticas';
import { PlanificarDimensionModal } from './PlanificarDimensionModal';

/**
 * «Tus prácticas»: el engranaje de Training (spec 014). Es SOLO para planificar: ninguna fila registra, no hay cámara,
 * ni ✓, ni «Subir». Todo lo que antes se veía afuera de Training para organizar el día vive acá:
 *
 * - «Arma tu semana los domingos»;
 * - las cinco dimensiones, con cuántos hábitos de cada una van hoy;
 * - cada dimensión abre su detalle: «Planificar <dimensión>» —la hoja de siempre, con su pausa «Solo hoy» / «Hasta que
 *   yo lo reactive» y los avisos y alarmas por día (specs 008 a 011)— y la lista de sus hábitos; tocar un hábito abre
 *   su editor en Planificar. Y, como antes, «Cambiar nombre» en las dos bebidas renombrables.
 *
 * Es una pantalla completa con `CabeceraAdmin` (la flecha y el retroceso del sistema suben un nivel por vez:
 * `navegacionDePracticas`).
 */
export function PracticasDeTraining({
  estado,
  onEstado,
  habits,
  planHabits,
  cargando,
  error,
  onReintentar,
  deshabilitada,
  sinLista,
  userId,
  renombre,
  onGuardado,
  confirmacion,
  onConfirmacionTerminada,
  scrollProps,
  estiloDelContenido,
}: {
  estado: EstadoDePracticas;
  onEstado: (siguiente: EstadoDePracticas) => void;
  /** Los hábitos con registro de hoy: de ahí sale «N de M hoy». */
  habits: HabitItem[];
  /** El inventario completo: de ahí salen los hábitos de cada dimensión (también los pausados). */
  planHabits: HabitItem[];
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  /** El programa todavía no arrancó o no se pudo confirmar: no hay nada que planificar ni avisos que armar. */
  deshabilitada: boolean;
  /** Sin programa propio o sin confirmar: ni siquiera se listan las dimensiones (como antes en Training). */
  sinLista: boolean;
  userId: string | undefined;
  renombre: ReturnType<typeof useRenombreLocal>;
  /** Hubo cambios en Planificar: Training recarga. Con texto, se confirma en línea. */
  onGuardado: (confirmacion?: string) => void;
  confirmacion: { clave: number; texto: string } | null;
  onConfirmacionTerminada: () => void;
  scrollProps: ScrollViewProps;
  estiloDelContenido: StyleProp<ViewStyle>;
}) {
  const { c, t } = useTheme();
  const repaso = useRepasoSemanal(userId);
  const [habitoARenombrar, setHabitoARenombrar] = useState<HabitItem | null>(null);

  const dimension: DimensionConfig | null = DIMENSIONES_CONFIG.find(d => d.key === estado.dimension) ?? null;
  const volver = () => onEstado(alRetroceder(estado) ?? PRACTICAS_CERRADAS);
  const delaDimension = dimension ? planHabits.filter(h => h.dimension === dimension.key) : [];
  const planificables = delaDimension.filter(h => h.habitoId);

  return (
    <View style={{ flex: 1 }}>
      <CabeceraAdmin titulo={dimension ? dimension.nombre : 'Tus prácticas'} onVolver={volver} />

      <ScrollView {...scrollProps} contentContainerStyle={estiloDelContenido} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {confirmacion ? (
          <View style={{ marginBottom: space.gapLg }}>
            <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={onConfirmacionTerminada} />
          </View>
        ) : null}

        {!dimension ? (
          <View style={{ gap: space.gapLg }}>
            <Text style={[t.body, { color: c.textSoft }]}>
              Planifica cada dimensión: la hora, los días, el recordatorio y cómo suena.
            </Text>

            {/* Aviso de los domingos. Solo donde puede sonar de verdad. */}
            {recordatorios.HAY_RECORDATORIOS_LOCALES && repaso.valor !== null && !deshabilitada ? (
              <View style={[estilos.repaso, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                <Icon name="calendar" size={TAMANO_ICONO.normal} color={c.goldInk} />
                <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
                  <Text style={[t.body, { color: c.textStrong, fontFamily: 'Jost_500Medium' }]}>Arma tu semana los domingos</Text>
                  <Text style={[t.small, { color: c.textSoft }]}>Te avisamos a las 19:00 para revisar a qué hora va cada hábito</Text>
                </View>
                <Interruptor valor={repaso.valor} onCambiar={valor => void repaso.alternar(valor)} etiqueta="Arma tu semana los domingos" />
              </View>
            ) : null}

            {cargando ? (
              <Text style={[t.body, { color: c.textSoft }]} accessibilityLiveRegion="polite">
                Actualizando tus hábitos…
              </Text>
            ) : null}
            {!cargando && error ? (
              <View style={{ gap: 4 }}>
                <Text style={[t.body, { color: c.textSoft }]}>{error}</Text>
                <Presionable onPress={onReintentar} accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }}>
                  <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>Reintentar</Text>
                </Presionable>
              </View>
            ) : null}

            <View style={{ gap: 12 }}>
              {!cargando && !error && !sinLista
                ? DIMENSIONES_CONFIG.map(d => {
                    const deLaDimension = habits.filter(h => h.dimension === d.key);
                    // Mismo criterio de siempre (E-118): la prueba entregada en la forma que cada hábito acepta.
                    const cumplidos = deLaDimension.filter(h => h.done || h.hasEvidence).length;
                    return (
                      <Presionable
                        key={d.key}
                        onPress={() => onEstado({ ...PRACTICAS_ABIERTAS, dimension: d.key })}
                        accessibilityRole="button"
                        accessibilityLabel={`${d.nombre}: ${cumplidos} de ${deLaDimension.length} cumplidos hoy`}
                        style={[estilos.dimension, { borderColor: c.border, backgroundColor: c.cardBg }]}
                      >
                        <View style={[estilos.medallon, { backgroundColor: c.goldWash }]}>
                          <Icon name={iconoDeLaDimension(d.key)} size={TAMANO_ICONO.normal} color={c.goldInk} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={estilos.cabeceraDeLaDimension}>
                            <Text numberOfLines={2} style={[t.cardTitle, estilos.nombre, { color: c.textStrong }]}>
                              {d.nombre}
                            </Text>
                            <Text numberOfLines={1} style={[t.small, estilos.cuenta, { color: c.goldInk }]}>
                              {cumplidos} de {deLaDimension.length} hoy
                            </Text>
                          </View>
                          <Text style={[t.small, { color: c.textSoft }]}>{d.sub}</Text>
                        </View>
                        <Icon name="chevron" size={TAMANO_ICONO.normal} color={c.chevron} />
                      </Presionable>
                    );
                  })
                : null}
            </View>
          </View>
        ) : (
          <View style={{ gap: space.gapLg }}>
            {/* "Planificar <dimensión>": una sola opción, grande, arriba de todo. Solo si hay algo que planificar:
                las acciones de VIDA Y NEGOCIO no son hábitos de este módulo. */}
            {planificables.length > 0 && !deshabilitada ? (
              <Presionable
                onPress={() => onEstado({ ...estado, planificando: true, habitoId: null })}
                accessibilityRole="button"
                accessibilityLabel={`Planificar ${dimension.nombre}`}
                style={[estilos.planificar, { backgroundColor: c.goldWash }]}
              >
                <View style={[estilos.cajaDelIcono, { backgroundColor: c.cardBgAlt }]}>
                  <Icon name="clock" size={TAMANO_ICONO.normal} color={c.goldInk} />
                </View>
                <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>Planificar {dimension.nombre}</Text>
                  <Text style={[t.small, { color: c.textSoft }]}>
                    Hora, días y pausa de tus {planificables.length} {planificables.length === 1 ? 'hábito' : 'hábitos'}
                  </Text>
                </View>
                <Icon name="chevron" size={TAMANO_ICONO.normal} color={c.goldInk} />
              </Presionable>
            ) : null}

            {planificables.length === 0 ? (
              <Text style={[t.body, { color: c.textSoft }]}>
                {dimension.key === 'VIDA Y NEGOCIO'
                  ? 'Las acciones de tus objetivos se planifican en Plan, al agendarlas.'
                  : `Todavía no hay hábitos en ${dimension.nombre}.`}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={[t.body, { color: c.textSoft, fontFamily: 'Jost_500Medium' }]}>
                  Tus hábitos ({planificables.length})
                </Text>
                {planificables.map(habit => {
                  const titulo = tituloVisible({ id: habit.habitoId ?? habit.id, title: habit.title }, renombre.titulos);
                  return (
                    <View key={habit.habitoId ?? habit.id} style={{ gap: 6 }}>
                      <Presionable
                        onPress={() => onEstado({ ...estado, planificando: true, habitoId: habit.habitoId ?? null })}
                        accessibilityRole="button"
                        accessibilityLabel={`${titulo}, ${habit.time || 'sin hora'}. Abrir para planificarlo.`}
                        style={[estilos.habito, { borderColor: c.border, backgroundColor: c.cardBg }]}
                      >
                        {habit.icon ? <Icon name={habit.icon} size={TAMANO_ICONO.normal} color={c.goldInk} /> : null}
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>{titulo}</Text>
                          <Text style={[t.small, { color: c.textSoft, fontVariant: ['tabular-nums'] }]}>{habit.time || 'Sin hora'}</Text>
                        </View>
                        <Icon name="chevron" size={TAMANO_ICONO.normal} color={c.chevron} />
                      </Presionable>
                      {/* Cambiarle el nombre a las dos bebidas (D-127): fuera del toque de la fila, como siempre. */}
                      {esRenombrable(habit.systemKey) && habit.habitoId ? (
                        <Presionable
                          onPress={() => setHabitoARenombrar(habit)}
                          accessibilityRole="button"
                          accessibilityLabel={`Cambiarle el nombre a ${titulo}`}
                          contenedorStyle={{ alignSelf: 'flex-start' }}
                          style={estilos.renombrar}
                        >
                          <Icon name="pencil" size={18} color={c.goldInk} />
                          <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>
                            {renombre.titulos[habit.habitoId] ? 'Cambiar o quitar el nombre' : 'Cambiar nombre'}
                          </Text>
                        </Presionable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={[t.small, { color: c.textSoft }]}>Aquí solo se planifica. Para registrar, vuelve a Training.</Text>
          </View>
        )}
      </ScrollView>

      {/* La hoja de siempre: hora, días, pausa, recordatorio y cómo suena (specs 008 a 011). Con un hábito tocado, abre
          directo en su editor. */}
      <PlanificarDimensionModal
        visible={estado.planificando && dimension !== null}
        dimension={dimension?.title ?? ''}
        nombreDimension={dimension?.nombre}
        habits={delaDimension}
        abrirEnHabitoId={estado.habitoId}
        onCerrar={() => onEstado({ ...estado, planificando: false, habitoId: null })}
        onGuardado={texto => {
          onEstado({ ...estado, planificando: false, habitoId: null });
          onGuardado(texto);
        }}
      />

      {habitoARenombrar?.habitoId ? (
        <RenombrarHabitoModal
          visible
          tituloCatalogo={habitoARenombrar.title}
          tituloActual={renombre.titulos[habitoARenombrar.habitoId] ?? null}
          onGuardar={(titulo, motivo) => renombre.renombrar(habitoARenombrar.habitoId!, titulo, motivo)}
          onQuitar={
            renombre.titulos[habitoARenombrar.habitoId]
              ? () => renombre.quitarRenombre(habitoARenombrar.habitoId!)
              : undefined
          }
          onCerrar={() => setHabitoARenombrar(null)}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  repaso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: space.radius,
    paddingHorizontal: space.cardPad,
    paddingVertical: 14,
    minHeight: 56,
  },
  dimension: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: space.radius,
    paddingHorizontal: space.cardPad,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  medallon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  // `flex-start`: si el nombre llega a dos líneas, el contador se queda arriba alineado con la primera.
  cabeceraDeLaDimension: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  nombre: { fontSize: 17, lineHeight: 22, flexShrink: 1 },
  cuenta: { fontSize: 14, lineHeight: 20, fontFamily: 'Jost_500Medium', fontVariant: ['tabular-nums'], flexShrink: 0 },
  planificar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    width: '100%',
    borderRadius: space.radius,
    paddingHorizontal: space.cardPad,
    paddingVertical: 14,
  },
  cajaDelIcono: { width: 40, height: 40, borderRadius: space.radiusSm, alignItems: 'center', justifyContent: 'center' },
  habito: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: space.radius,
    paddingHorizontal: space.cardPad,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  renombrar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 2 },
});
