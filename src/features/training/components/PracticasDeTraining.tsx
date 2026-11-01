import { fuentes } from '../../../theme/fuentes';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Interruptor } from '../../../components/Interruptor';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import type { HabitItem } from '../../../screens/TrainingScreen';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import type { useRenombreLocal } from '../../habits/hooks/useRenombreDeHabito';
import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import { useCategoriasDeHabito } from '../../habits/categorias/hooks/useCategoriasDeHabito';
import { dimensionesDeTraining, type DimensionConfig } from '../data/dimensiones';
import { useOfertaDeRepetirSemana } from '../hooks/useOfertaDeRepetirSemana';
import { dimensionesQueSeDibujan } from '../utils/dimensionesQueSeDibujan';
import { useRepasoSemanal } from '../hooks/useRepasoSemanal';
import { reprogramarLasAlarmasConElServidor } from '../utils/reprogramarLasAlarmas';
import { iconoDeLaDimension } from '../utils/iconoDeLaDimension';
import { PRACTICAS_ABIERTAS, PRACTICAS_CERRADAS, alRetroceder, type EstadoDePracticas } from '../utils/navegacionDePracticas';
import { OfertaDeRepetirSemana } from './OfertaDeRepetirSemana';
import { PlanificarDimensionModal } from './PlanificarDimensionModal';

/**
 * «Tus prácticas»: el engranaje de Training (spec 014). Es SOLO para planificar: ninguna fila registra, no hay cámara,
 * ni ✓, ni «Subir». Todo lo que antes se veía afuera de Training para organizar el día vive acá:
 *
 * - «Arma tu semana los domingos»;
 * - las cinco dimensiones, con cuántos hábitos de cada una van hoy;
 * - tocar una dimensión abre DIRECTO «Planificar <dimensión>» —la hoja de siempre, con sus grupos, la pausa «Solo hoy»
 *   / «Hasta que yo lo reactive», el editor de cada hábito con «Cambiar nombre» en las dos bebidas, «Crear un hábito»
 *   y los avisos y alarmas por día (specs 008 a 011)—. Cerrarla vuelve acá.
 *
 * Es una pantalla completa con `CabeceraAdmin` (la flecha y el retroceso del sistema suben un nivel por vez:
 * `navegacionDePracticas`). Hasta el 2026-10-30 entre la dimensión y la hoja había un detalle que repetía la lista de
 * hábitos; se quitó (pedido del dueño del 2026-10-31).
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
  /** El programa todavía no arrancó o no se pudo confirmar: no se ofrece el aviso de los domingos. */
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
  /* Spec 023: las dimensiones son las categorías de la formación de la persona (en el orden de Administración), y una sin hábitos
     que le toquen no se dibuja. `categorias.dimensiones` cambia cuando llegan: esta lista se arma otra vez. */
  const categorias = useCategoriasDeHabito();
  const dimensiones = useMemo(
    () => dimensionesQueSeDibujan(dimensionesDeTraining({ conMisHabitos: planHabits.some(h => h.dimension === 'MIS_HABITOS') }), planHabits),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [planHabits, categorias.dimensiones],
  );

  /* Repetir la semana (spec 028): la oferta vive acá, arriba de las dimensiones, porque repetir toca a los hábitos de TODAS
     (una oferta por dimensión diría lo mismo cinco veces). Tras repetir o deshacer, las alarmas de este teléfono se ponen al
     día con lo que dice el servidor. Solo donde hay lista que planificar: sin programa o sin confirmar, ni se pide. */
  const dimensionDe = useCallback(
    (id: string): string | null => planHabits.find(h => h.habitoId === id)?.dimension ?? null,
    [planHabits],
  );
  const alCambiarLaSemana = useCallback(
    () => (userId ? reprogramarLasAlarmasConElServidor(userId, { dimensionDe }) : Promise.resolve(null)),
    [userId, dimensionDe],
  );
  const oferta = useOfertaDeRepetirSemana(userId, Boolean(userId) && !deshabilitada && !sinLista, alCambiarLaSemana);
  /* Al cerrar la hoja de una dimensión (pudo haberse cambiado esta semana «solo esta semana») la oferta se vuelve a leer. */
  const dimensionAbierta = useRef<string | null>(estado.dimension);
  const recargarOferta = oferta.recargar;
  useEffect(() => {
    if (dimensionAbierta.current && !estado.dimension) void recargarOferta();
    dimensionAbierta.current = estado.dimension;
  }, [estado.dimension, recargarOferta]);

  const dimension: DimensionConfig | null = dimensiones.find(d => d.key === estado.dimension) ?? null;
  const volver = () => onEstado(alRetroceder(estado) ?? PRACTICAS_CERRADAS);
  const delaDimension = dimension ? planHabits.filter(h => h.dimension === dimension.key) : [];

  return (
    <View style={{ flex: 1 }}>
      <CabeceraAdmin titulo="Tus prácticas" onVolver={volver} />

      <ScrollView {...scrollProps} contentContainerStyle={estiloDelContenido} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {confirmacion ? (
          <View style={{ marginBottom: space.gapLg }}>
            <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={onConfirmacionTerminada} />
          </View>
        ) : null}

        <View style={{ gap: space.gapLg }}>
          <Text style={[t.body, { color: c.textSoft }]}>
            Planifica cada dimensión: la hora, los días, el recordatorio y cómo suena.
          </Text>

          {/* Repetir la semana (spec 028). No dibuja nada mientras no se sabe, ni si no hay oferta. */}
          {!cargando && !error && !sinLista && !deshabilitada ? <OfertaDeRepetirSemana uso={oferta} /> : null}

          {/* Aviso de los domingos. Solo donde puede sonar de verdad. */}
          {recordatorios.HAY_RECORDATORIOS_LOCALES && repaso.valor !== null && !deshabilitada ? (
            <View style={[estilos.repaso, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
              <Icon name="calendar" size={TAMANO_ICONO.normal} color={c.goldInk} />
              <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
                <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.media }]}>Arma tu semana los domingos</Text>
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
                <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media }]}>Reintentar</Text>
              </Presionable>
            </View>
          ) : null}

          <View style={{ gap: 12 }}>
            {!cargando && !error && !sinLista
              ? dimensiones.map(d => {
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
                        {d.sub ? <Text style={[t.small, { color: c.textSoft }]}>{d.sub}</Text> : null}
                      </View>
                      <Icon name="chevron" size={TAMANO_ICONO.normal} color={c.chevron} />
                    </Presionable>
                  );
                })
              : null}
          </View>
        </View>
      </ScrollView>

      {/* La hoja de siempre, abierta directo con la dimensión tocada: hora, días, pausa, recordatorio, cómo suena
          (specs 008 a 011), «Crear un hábito» y, en el editor de las dos bebidas, «Cambiar nombre» (D-127). Cerrarla
          —✕, arrastrar o el atrás del sistema— vuelve a «Tus prácticas». */}
      <PlanificarDimensionModal
        visible={dimension !== null}
        dimension={dimension?.title ?? ''}
        nombreDimension={dimension?.nombre}
        habits={delaDimension}
        renombre={renombre}
        onCerrar={() => onEstado({ ...estado, dimension: null })}
        onGuardado={texto => {
          onEstado({ ...estado, dimension: null });
          onGuardado(texto);
        }}
      />
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
  cuenta: { fontSize: 14, lineHeight: 20, fontFamily: fuentes.media, fontVariant: ['tabular-nums'], flexShrink: 0 },
});
