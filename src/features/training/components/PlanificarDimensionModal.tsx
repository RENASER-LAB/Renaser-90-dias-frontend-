import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useAuth } from '../../auth/context/AuthContext';
import * as habitsApi from '../../habits/api/habitsApi';
import { RuedaHoraPicker } from '../../habits/components/RuedaHoraPicker';
import { rangosDelDia as almacenRangos } from '../../habits/storage/rangosDelDia';
import { formatearFechaLarga } from '../../programa/hooks/useArranqueDelPrograma';
import { aFechaIso, DIAS_DEL_PLAN, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import {
  ETIQUETA_MOMENTO,
  MOMENTO_ESPERADO,
  MOMENTOS,
  RANGOS_POR_DEFECTO,
  aHoraTexto,
  aMinutos,
  limitesDelMomento,
  momentoDeMinutos,
  moverInicio,
  rangoTexto,
  type MomentoDelDia,
  type RangosDelDia,
} from '../../habits/utils/momentosDelDia';
import type { PreferenciaHabitoApi } from '../../habits/types/habits.types';
import type { HabitItem } from '../../../screens/TrainingScreen';

/**
 * PLANIFICAR TODA UNA DIMENSIÓN, desde una sola hoja.
 *
 * > Reemplazó a `PlanificarHabitoModal`, que era por hábito y vivía en un botón chico al costado
 * > del de evidencia. Ese botón competía con "SUBIR" en la misma fila angosta y estorbaba lo único
 * > que la tarjeta tiene que hacer fácil, que es entregar la evidencia.
 *
 * ORDEN DE LA HOJA, de arriba hacia abajo:
 *   1. el BLOQUE del día (mañana / tarde / noche) con su rango de horas, editable;
 *   2. la hora y los minutos, que se mueven con el bloque y lo mueven a él;
 *   3. los días de la semana;
 *   4. los hábitos, cada uno con su casilla y su propio interruptor de activo / pausado;
 *   5. aplicar la hora a los que estén marcados.
 *
 * ## LAS TRES DECISIONES QUE EXPLICAN ESTE ARCHIVO
 *
 * **1. El bloque FILTRA la lista, y el bloque de un hábito se calcula, no se elige a mano.** Tocar
 * 🌅 MAÑANA deja a la vista solo los hábitos que hoy caen en la mañana (y lleva la rueda a donde
 * la mañana empieza); tocarlo otra vez vuelve a mostrarlos todos. Eso es lo que impide de raíz
 * meter "dormir" en la mañana: si dormir es de noche, no está en la lista que estás editando.
 * El bloque de cada hábito sale de su hora, siempre — antes existía en Plan un "mover de bloque"
 * que cambiaba el bloque SIN cambiar la hora, no persistía nada y dejaba en pantalla un hábito de
 * las 21:00 rotulado "MAÑANA". Acá eso es imposible por construcción.
 *
 * El filtro es estado propio y no sigue a la rueda (ver `filtroMomento`), porque si la siguiera,
 * mover la hora a las 14:00 con la mañana filtrada sacaría de la lista al hábito que estás
 * editando. Con el panel de cortes abierto las pastillas cambian de trabajo: eligen cuál corte
 * mover (ver `bloqueEnEdicion`).
 *
 * **2. Dónde empieza cada bloque lo decide la persona** (`utils/momentosDelDia.ts`), y se guarda en
 * el teléfono (`storage/rangosDelDia.ts`) porque el backend no tiene dónde ponerlo todavía. Esto
 * es lo que arregla el "dormir aparece en la mañana": las 00:30 son MADRUGADA, un bloque propio.
 * Con los cortes viejos —clavados en `hora < 12`— eran mañana, y con tres bloques habrían sido "la
 * noche de ayer", que también miente: a esa hora ya es otro día.
 *
 * **3. Guardar uno NO cierra la hoja ni pisa a los demás.** Cada hábito guardado se marca con su
 * hora nueva, se desmarca de la selección y su horario local se actualiza en el acto. Así se puede
 * guardar de a uno y seguir con el resto sin que una tanda posterior reescriba lo ya guardado, que
 * era el riesgo que planteó el dueño.
 *
 * ## LO QUE EL BACKEND SÍ Y NO PUEDE
 *
 * Escribe con los mismos endpoints que ya usa Plan, sin backend nuevo:
 *   - hora   -> `PATCH /api/v1/habit-preferences/{id}`, preservando el `limitTime` de cada hábito;
 *   - estado -> `PUT` + `PATCH /api/v1/habit-unlocks/{id}` (el PUT primero: el PATCH exige que el
 *               hábito ya esté en el plan del aprendiz — D-99).
 *
 * **"Pausar solo hoy" es real y "pausar solo el jueves" no.** La pausa del backend es un rango que
 * termina en `pausedUntil` — mandar la fecha de HOY lo apaga hoy y lo devuelve encendido mañana,
 * que es exactamente lo que hace falta en una pantalla del día. Un día suelto a futuro no se puede:
 * haría falta un `pausadoDesde` además del `pausadoHasta` (ver `opcionesDePausa` en `PlanScreen`).
 * Por eso el interruptor ofrece "solo hoy" y "hasta que yo lo reactive", y no una semana entera.
 *
 * La fila de días sigue siendo informativa por la misma razón, y cuando se toca, el resumen lo dice.
 */

interface Props {
  visible: boolean;
  /** Nombre de la dimensión abierta — solo para el encabezado. */
  dimension: string;
  /** Los hábitos de esa dimensión, tal cual los tiene `TrainingScreen`. */
  habits: HabitItem[];
  onCerrar: () => void;
  onGuardado: () => void;
}

/** Cuánto mueve cada toque de − / + el comienzo de un bloque. */
const PASO_DE_AJUSTE = 15;

function aDosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function todosLosDias(): Record<DiaDelPlan, boolean> {
  return Object.fromEntries(DIAS_DEL_PLAN.map(d => [d, true])) as Record<DiaDelPlan, boolean>;
}

export function PlanificarDimensionModal({ visible, dimension, habits, onCerrar, onGuardado }: Props) {
  const { c, t } = useTheme();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const claveUsuario = user?.id ?? 'anon';

  /**
   * Solo los hábitos REALES del catálogo. Las rocas de VIDA Y NEGOCIO no traen `habitoId`: no son
   * hábitos de este módulo y no hay nada que planificarles por acá.
   */
  const planificables = useMemo(
    () => habits.filter((h): h is HabitItem & { habitoId: string } => Boolean(h.habitoId)),
    [habits],
  );

  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [rangos, setRangos] = useState<RangosDelDia>(RANGOS_POR_DEFECTO);
  const [editandoBloques, setEditandoBloques] = useState(false);
  /**
   * Qué bloque están moviendo los botones − / +. Es estado propio y NO se deriva de la hora a
   * propósito: mover un corte puede hacer que la hora de la rueda cambie de bloque, y si los
   * botones siguieran a la hora, a mitad de un ajuste pasarían a mover OTRO corte sin que la
   * persona hiciera nada. Mientras el panel está abierto, las pastillas eligen qué corte se toca.
   */
  const [bloqueEnEdicion, setBloqueEnEdicion] = useState<MomentoDelDia>('mañana');
  /**
   * FILTRO de la lista: qué bloque se está mirando. `null` = los de la dimensión entera.
   *
   * Es estado propio y **no se deriva de la hora de la rueda**, y esa es la decisión que hace
   * que el filtro sirva. Si siguiera a la rueda, mover la hora a las 14:00 con la mañana filtrada
   * sacaría de la lista al hábito que estás editando justo mientras lo editás. Acá el filtro dice
   * "qué estoy mirando" y la rueda dice "a qué hora lo pongo": mover uno no mueve el otro.
   */
  const [filtroMomento, setFiltroMomento] = useState<MomentoDelDia | null>(null);
  const [hora, setHora] = useState(6);
  const [minuto, setMinuto] = useState(0);
  /**
   * `RuedaHoraPicker` es no controlada: arranca donde le digan y después la maneja el dedo.
   * Subir este contador la vuelve a montar, que es la única forma de reposicionarla cuando el
   * salto lo pide la pantalla (tocar un bloque) y no la persona.
   */
  const [semillaRueda, setSemillaRueda] = useState(0);
  const [dias, setDias] = useState<Record<DiaDelPlan, boolean>>(todosLosDias);
  const [diasSemilla, setDiasSemilla] = useState<Record<DiaDelPlan, boolean>>(todosLosDias);
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
  /** `habitoId` -> hora que YA se guardó en esta sesión de la hoja. Es la marca de "listo". */
  const [guardados, setGuardados] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [preferencias, setPreferencias] = useState<Map<string, PreferenciaHabitoApi>>(new Map());
  const [pausados, setPausados] = useState<Set<string>>(new Set());
  /** Hábitos con el interruptor en vuelo, para no dejar disparar dos PATCH sobre el mismo. */
  const [enVuelo, setEnVuelo] = useState<Set<string>>(new Set());
  const [huboEscritura, setHuboEscritura] = useState(false);

  const hoyIso = aFechaIso(new Date());

  useEffect(() => {
    if (!visible) return;
    setEstado('cargando');
    setSeleccion({});
    setGuardados({});
    setEditandoBloques(false);
    setFiltroMomento(null);
    setHuboEscritura(false);
    const semilla = planificables.reduce<Record<DiaDelPlan, boolean>>((acumulado, h) => {
      const propios = h.diasCatalogo ?? todosLosDias();
      for (const dia of DIAS_DEL_PLAN) acumulado[dia] = acumulado[dia] || propios[dia];
      return acumulado;
    }, Object.fromEntries(DIAS_DEL_PLAN.map(d => [d, false])) as Record<DiaDelPlan, boolean>);
    const inicial = DIAS_DEL_PLAN.some(d => semilla[d]) ? semilla : todosLosDias();
    setDias(inicial);
    setDiasSemilla(inicial);
    (async () => {
      try {
        // Los cortes del día salen del teléfono y los otros dos del backend; son independientes,
        // así que van juntos. Si el almacenamiento falla devuelve los de fábrica, no rompe.
        const [rangosLeidos, prefs, desbloqueos] = await Promise.all([
          almacenRangos.leer(claveUsuario),
          habitsApi.obtenerPreferencias(),
          habitsApi.obtenerPlanDesbloqueos(),
        ]);
        setRangos(rangosLeidos);
        setPreferencias(new Map<string, PreferenciaHabitoApi>(prefs.map(p => [p.habitId, p])));
        // Una pausa VENCIDA no es una pausa: `paused` queda en true en la fila aunque
        // `pausedUntil` ya haya pasado, así que sin comparar contra hoy el interruptor mostraría
        // apagado un hábito que el generador del día ya vuelve a crear.
        setPausados(
          new Set(
            desbloqueos.items
              .filter(d => d.paused && (d.pausedUntil === null || d.pausedUntil >= hoyIso))
              .map(d => d.habitId),
          ),
        );
        const primera = prefs.find(p => p.habitId === planificables[0]?.habitoId)?.triggerTime;
        const [h, m] = (primera ?? '06:00').split(':').map(Number);
        setHora(Number.isFinite(h) ? h : 6);
        setMinuto(Number.isFinite(m) ? m : 0);
        setSemillaRueda(n => n + 1);
        setEstado('listo');
      } catch (e) {
        setEstado('error');
        Alert.alert('No pudimos cargar los horarios', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, dimension]);

  const minutosElegidos = hora * 60 + minuto;
  // El bloque NO es estado propio: se deriva de la hora. Un estado paralelo podría desincronizarse
  // y eso es justo el bug que había en Plan (hábito de las 21:00 rotulado "MAÑANA").
  const momentoActual = momentoDeMinutos(minutosElegidos, rangos);
  const horaTexto = `${aDosDigitos(hora)}:${aDosDigitos(minuto)}`;

  // Los dos ayudantes van ANTES de `visibles`, que los usa. Declarados debajo eran `const` en
  // zona muerta temporal: la hoja reventaba con "undefined is not a function" en el filtro.
  /** La hora que rige HOY para un hábito: la recién guardada, la del backend, o la de la lista. */
  const horaDe = (habitoId: string, porDefecto: string) =>
    guardados[habitoId] ?? preferencias.get(habitoId)?.triggerTime?.slice(0, 5) ?? porDefecto;

  /** En qué bloque cae hoy. `null` = todavía no tiene hora, y esos NO se filtran nunca. */
  const bloqueDe = (habitoId: string, porDefecto: string): MomentoDelDia | null => {
    const minutos = aMinutos(horaDe(habitoId, porDefecto));
    return minutos === null ? null : momentoDeMinutos(minutos, rangos);
  };

  /**
   * Lo que la lista muestra. Los hábitos SIN hora aparecen siempre, filtre lo que filtre: son
   * justamente los que hace falta ubicar, y esconderlos detrás de un bloque que todavía no
   * tienen los volvería inalcanzables.
   */
  const visibles = planificables.filter(
    h => filtroMomento === null || (bloqueDe(h.habitoId, h.time) ?? filtroMomento) === filtroMomento,
  );
  const elegidos = visibles.filter(h => seleccion[h.habitoId]);
  const diasCambiados = DIAS_DEL_PLAN.some(d => dias[d] !== diasSemilla[d]);

  const cerrar = () => (huboEscritura ? onGuardado() : onCerrar());

  /**
   * Tocar un bloque FILTRA la lista a ese bloque y lleva la rueda a donde el bloque empieza.
   * Tocar el que ya está filtrando lo apaga y vuelven a verse todos.
   *
   * La selección se limpia al cambiar de filtro a propósito: si quedaran marcados hábitos que
   * ya no se ven, "aplicar" escribiría sobre cosas fuera de la pantalla. Nada seleccionado puede
   * estar invisible.
   */
  const elegirMomento = (m: MomentoDelDia) => {
    if (filtroMomento === m) {
      setFiltroMomento(null);
      setSeleccion({});
      return;
    }
    setFiltroMomento(m);
    setSeleccion({});
    const desde = limitesDelMomento(m, rangos).desde % (24 * 60);
    setHora(Math.floor(desde / 60));
    setMinuto(desde % 60);
    setSemillaRueda(n => n + 1);
  };

  /** Abre o cierra el panel de cortes, arrancando siempre por el bloque que se está mirando. */
  const alternarEdicionDeBloques = () => {
    if (!editandoBloques) setBloqueEnEdicion(momentoActual);
    setEditandoBloques(v => !v);
  };

  /** Mueve el comienzo del bloque EN EDICIÓN y lo persiste en el teléfono. */
  const ajustarBloque = (delta: number) => {
    const nuevos = moverInicio(rangos, bloqueEnEdicion, delta);
    if (nuevos === rangos) return; // el ajuste dejaría un bloque por debajo del mínimo
    setRangos(nuevos);
    void almacenRangos.guardar(claveUsuario, nuevos);
  };

  const alternarTodos = () => {
    const todosMarcados = elegidos.length === visibles.length && visibles.length > 0;
    setSeleccion(todosMarcados ? {} : Object.fromEntries(visibles.map(h => [h.habitoId, true])));
  };

  /**
   * El interruptor de UN hábito. Se escribe en el acto y se refleja de forma optimista; si el
   * backend lo rechaza se vuelve al valor anterior, para que el interruptor nunca quede mostrando
   * un estado que el servidor no guardó.
   */
  const aplicarEstado = async (habitoId: string, activo: boolean, pausadoHasta?: string) => {
    const estabaPausado = pausados.has(habitoId);
    setEnVuelo(prev => new Set(prev).add(habitoId));
    setPausados(prev => {
      const siguiente = new Set(prev);
      if (activo) siguiente.delete(habitoId);
      else siguiente.add(habitoId);
      return siguiente;
    });
    try {
      await habitsApi.agregarHabitoAlPlan(habitoId);
      await habitsApi.cambiarEstadoHabito(habitoId, activo, pausadoHasta);
      setHuboEscritura(true);
    } catch (e) {
      setPausados(prev => {
        const siguiente = new Set(prev);
        if (estabaPausado) siguiente.add(habitoId);
        else siguiente.delete(habitoId);
        return siguiente;
      });
      Alert.alert('No pudimos guardar el cambio', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setEnVuelo(prev => {
        const siguiente = new Set(prev);
        siguiente.delete(habitoId);
        return siguiente;
      });
    }
  };

  const alternarActivo = (h: HabitItem & { habitoId: string }) => {
    if (enVuelo.has(h.habitoId)) return;
    if (pausados.has(h.habitoId)) {
      void aplicarEstado(h.habitoId, true);
      return;
    }
    if (h.isDeactivatable === false) {
      Alert.alert('Hábito obligatorio', 'Este hábito es parte del programa y no se puede pausar.');
      return;
    }
    // Dos plazos y nada más, porque son los dos que el backend sabe cumplir de verdad.
    Alert.alert(`Pausar "${h.title}"`, '¿Hasta cuándo lo pausamos?', [
      { text: 'Solo hoy', onPress: () => void aplicarEstado(h.habitoId, false, hoyIso) },
      { text: 'Hasta que yo lo reactive', onPress: () => void aplicarEstado(h.habitoId, false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  /**
   * Escribe la hora en los hábitos marcados, en serie, y **deja la hoja abierta**: cada uno que
   * sale bien se marca como guardado, se desmarca de la selección y se le actualiza el horario
   * local. Así una segunda tanda no puede volver a tocar lo que ya quedó listo.
   */
  const escribirHora = async () => {
    setGuardando(true);
    const fallidos: { habitoId: string; title: string }[] = [];
    let diferidos = 0;
    let fechaDiferida: string | null = null;
    const nuevosGuardados: Record<string, string> = {};

    for (const h of elegidos) {
      try {
        // El `limitTime` que ya tenía: el PATCH reemplaza los dos campos a la vez y mandar `null`
        // le borraría la hora límite a hábitos que sí vencen dentro del día.
        const previa = preferencias.get(h.habitoId);
        const resultado = await habitsApi.cambiarHorario(
          h.habitoId,
          `${horaTexto}:00`,
          previa?.limitTime ?? null,
        );
        if (resultado.deferred) {
          diferidos += 1;
          fechaDiferida = fechaDiferida ?? resultado.deferredEffectiveDate ?? null;
        }
        nuevosGuardados[h.habitoId] = horaTexto;
        // El horario local se actualiza acá y no recargando todo: recargar mientras la hoja está
        // abierta reordenaría la lista y movería la rueda debajo del dedo.
        setPreferencias(prev => {
          const siguiente = new Map(prev);
          const base = prev.get(h.habitoId);
          if (base) siguiente.set(h.habitoId, { ...base, triggerTime: `${horaTexto}:00` });
          return siguiente;
        });
      } catch {
        fallidos.push({ habitoId: h.habitoId, title: h.title });
      }
    }

    setGuardando(false);
    const aplicados = Object.keys(nuevosGuardados).length;
    if (aplicados > 0) {
      setGuardados(prev => ({ ...prev, ...nuevosGuardados }));
      setHuboEscritura(true);
    }
    // Quedan marcados SOLO los que fallaron: reintentar es volver a tocar el botón.
    setSeleccion(Object.fromEntries(fallidos.map(f => [f.habitoId, true])));

    const partes: string[] = [];
    if (aplicados > 0) {
      partes.push(
        `${aplicados === 1 ? '1 hábito quedó' : `${aplicados} hábitos quedaron`} a las ${horaTexto} (${
          ETIQUETA_MOMENTO[momentoActual]
        }).`,
      );
    }
    if (diferidos > 0) {
      partes.push(
        `${diferidos === 1 ? 'Uno se aplica' : `${diferidos} se aplican`} desde el ${
          fechaDiferida ? formatearFechaLarga(fechaDiferida) : 'día siguiente'
        }: el día en curso no se reacomoda.`,
      );
    }
    if (diasCambiados) {
      partes.push('Los días que tocaste NO se guardaron: el servidor solo sabe de activo y pausado.');
    }
    if (fallidos.length > 0) {
      partes.push(`No pudimos guardar: ${fallidos.map(f => f.title).join(', ')}. Quedaron marcados para reintentar.`);
    }
    partes.push('La hoja sigue abierta: podés seguir con los demás sin tocar lo ya guardado.');

    Alert.alert(fallidos.length > 0 ? 'Se guardó a medias' : 'Listo', partes.join('\n\n'));
  };

  /**
   * Antes de escribir, avisa si algún hábito quedaría en un bloque que contradice lo que ese
   * hábito ES (despertarse de noche, dormir de mañana). Avisa y deja seguir: quien trabaja de
   * noche tiene todo el derecho a dormir a las 09:00 — lo que no puede es hacerlo sin enterarse.
   */
  const aplicar = () => {
    if (elegidos.length === 0) return;
    const enConflicto = elegidos.filter(h => {
      const aceptables = h.systemKey ? MOMENTO_ESPERADO[h.systemKey] : undefined;
      return aceptables !== undefined && !aceptables.includes(momentoActual);
    });
    if (enConflicto.length > 0) {
      Alert.alert(
        'Revisá el bloque del día',
        `${enConflicto.map(h => `“${h.title}”`).join(', ')} ${
          enConflicto.length === 1 ? 'quedaría' : 'quedarían'
        } a las ${horaTexto}, que con tus bloques es ${ETIQUETA_MOMENTO[momentoActual]}.\n\n` +
          'Si es a propósito, seguí. Si no, movés la rueda y listo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Guardar igual', onPress: () => void escribirHora() },
        ],
      );
      return;
    }
    void escribirHora();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cerrar}>
      <View style={styles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={cerrar} />

        <View
          style={[
            styles.hoja,
            {
              backgroundColor: c.cardBg,
              borderColor: c.gold,
              paddingBottom: Math.max(insets.bottom, 12),
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
        >
          <View style={[styles.agarre, { backgroundColor: c.border }]} />

          <View style={[styles.encabezado, { borderBottomColor: c.divider }]}>
            <View style={{ flex: 1 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>PLANIFICAR</Text>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]} numberOfLines={1}>
                {dimension}
              </Text>
            </View>
            <Pressable onPress={cerrar} hitSlop={12} style={styles.cerrar}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>✕ CERRAR</Text>
            </Pressable>
          </View>

          {estado === 'cargando' && (
            <Text style={[t.body, { color: c.textSoft, textAlign: 'center', paddingVertical: 40, fontSize: 14 }]}>
              Cargando horarios…
            </Text>
          )}

          {estado === 'error' && (
            <Text style={[t.body, { color: c.textSoft, textAlign: 'center', paddingVertical: 40, fontSize: 14 }]}>
              No pudimos cargar los horarios de esta dimensión.
            </Text>
          )}

          {estado === 'listo' && (
            <>
              {/* 1. BLOQUE DEL DÍA. La pastilla encendida es la que corresponde a la hora de la
                  rueda — no un estado aparte que pueda quedar desincronizado. */}
              <View style={styles.filaTituloCompacta}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>BLOQUE DEL DÍA</Text>
                <Pressable onPress={alternarEdicionDeBloques} hitSlop={10}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                    {editandoBloques ? 'LISTO' : '✎ AJUSTAR'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.filaMomentos}>
                {MOMENTOS.map(m => {
                  const on = editandoBloques ? m === bloqueEnEdicion : m === filtroMomento;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => (editandoBloques ? setBloqueEnEdicion(m) : elegirMomento(m))}
                      style={[
                        styles.pastillaMomento,
                        { borderColor: on ? c.gold : c.border, backgroundColor: on ? c.cardBgAlt : 'transparent' },
                      ]}
                    >
                      <Text
                        style={[
                          t.micro,
                          { fontSize: 10.5, fontWeight: '700', color: on ? c.gold : c.textSoft },
                        ]}
                        numberOfLines={1}
                      >
                        {ETIQUETA_MOMENTO[m]}
                      </Text>
                      <Text style={[t.micro, { fontSize: 9.5, color: c.textSoft }]} numberOfLines={1}>
                        {rangoTexto(m, rangos)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {editandoBloques && (
                <View style={[styles.filaAjuste, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Pressable
                    onPress={() => ajustarBloque(-PASO_DE_AJUSTE)}
                    hitSlop={10}
                    disabled={bloqueEnEdicion === 'madrugada'}
                    style={[
                      styles.botonAjuste,
                      { borderColor: c.gold, opacity: bloqueEnEdicion === 'madrugada' ? 0.3 : 1 },
                    ]}
                  >
                    <Text style={[t.cardTitle, { color: c.gold, fontSize: 18 }]}>−</Text>
                  </Pressable>
                  <View style={{ flex: 1, flexShrink: 1, alignItems: 'center' }}>
                    <Text style={[t.body, { color: c.textStrong, fontSize: 13, fontWeight: '600' }]} numberOfLines={1}>
                      {ETIQUETA_MOMENTO[bloqueEnEdicion]} empieza {aHoraTexto(limitesDelMomento(bloqueEnEdicion, rangos).desde)}
                    </Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]} numberOfLines={2}>
                      {bloqueEnEdicion === 'madrugada'
                        ? 'Empieza a las 00:00 siempre: es el cambio de día. Movés dónde termina desde MAÑANA.'
                        : 'Tocá otro bloque para moverlo · se guarda en este teléfono'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => ajustarBloque(PASO_DE_AJUSTE)}
                    hitSlop={10}
                    disabled={bloqueEnEdicion === 'madrugada'}
                    style={[
                      styles.botonAjuste,
                      { borderColor: c.gold, opacity: bloqueEnEdicion === 'madrugada' ? 0.3 : 1 },
                    ]}
                  >
                    <Text style={[t.cardTitle, { color: c.gold, fontSize: 18 }]}>+</Text>
                  </Pressable>
                </View>
              )}

              {/* 2. HORA Y MINUTOS — fuera de todo scroll: las ruedas SON dos ScrollView y
                  meterlas dentro de otro haría que el dedo no sepa a cuál le habla (AGENTS.md §2). */}
              <View style={{ paddingTop: 6, paddingBottom: 2 }}>
                <RuedaHoraPicker
                  key={`rueda-${semillaRueda}`}
                  horaInicial={hora}
                  minutoInicial={minuto}
                  onCambiar={(h, m) => {
                    setHora(h);
                    setMinuto(m);
                  }}
                />
              </View>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, textAlign: 'center' }]}>
                {horaTexto} cae en {ETIQUETA_MOMENTO[momentoActual]}
                {filtroMomento !== null && filtroMomento !== momentoActual
                  ? ` · los sacás de ${ETIQUETA_MOMENTO[filtroMomento]}`
                  : ''}
              </Text>

              {/* 3. DÍAS */}
              <View style={styles.filaDias}>
                {DIAS_DEL_PLAN.map(dia => {
                  const on = dias[dia];
                  return (
                    <Pressable
                      key={dia}
                      onPress={() => setDias(prev => ({ ...prev, [dia]: !prev[dia] }))}
                      style={[
                        styles.pastillaDia,
                        { borderColor: on ? c.gold : c.border, backgroundColor: on ? c.gold : c.cardBgAlt },
                      ]}
                    >
                      <Text style={[t.micro, { fontSize: 12.5, fontWeight: '700', color: on ? c.onGold : c.textSoft }]}>
                        {dia.charAt(0)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10, marginTop: 4, lineHeight: 13 }]}>
                {diasCambiados
                  ? '⚠ Los días todavía no se guardan. Para apagar un hábito usá su interruptor.'
                  : 'Días en que corren. Para apagar uno hoy, usá su interruptor de la derecha.'}
              </Text>

              {/* 4. HÁBITOS: casilla para la hora, interruptor propio para activo / pausado. */}
              <View style={styles.filaTitulo}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]} numberOfLines={1}>
                  {filtroMomento === null ? 'HÁBITOS' : ETIQUETA_MOMENTO[filtroMomento]} ({elegidos.length}/
                  {visibles.length})
                </Text>
                <Pressable onPress={alternarTodos} hitSlop={10}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                    {elegidos.length === visibles.length && visibles.length > 0 ? 'NINGUNO' : 'MARCAR TODOS'}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
                showsVerticalScrollIndicator={false}
              >
                {planificables.length === 0 && (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 13, paddingVertical: 16 }]}>
                    Esta dimensión no tiene hábitos que se puedan planificar.
                  </Text>
                )}

                {planificables.length > 0 && visibles.length === 0 && (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 13, paddingVertical: 16 }]}>
                    Ninguno de esta dimensión cae en {filtroMomento ? ETIQUETA_MOMENTO[filtroMomento] : 'este bloque'}.
                    Tocá el bloque de nuevo para verlos todos.
                  </Text>
                )}

                {visibles.map(h => {
                  const marcado = Boolean(seleccion[h.habitoId]);
                  const horaGuardada = guardados[h.habitoId];
                  const horaActual = horaDe(h.habitoId, h.time);
                  // `null` cuando el hábito todavía no tiene hora: ahí NO se inventa un bloque.
                  // Parsear "" daba 0 minutos y lo rotulaba 🌙 NOCHE, que es un dato falso.
                  const bloqueDelHabito = bloqueDe(h.habitoId, h.time);
                  const activo = !pausados.has(h.habitoId);
                  return (
                    <Pressable
                      key={h.habitoId}
                      onPress={() => setSeleccion(prev => ({ ...prev, [h.habitoId]: !prev[h.habitoId] }))}
                      style={[
                        styles.filaHabito,
                        {
                          borderColor: marcado ? c.gold : c.border,
                          backgroundColor: marcado ? c.cardBgAlt : 'transparent',
                          opacity: activo ? 1 : 0.55,
                        },
                      ]}
                    >
                      {/* El icono PROPIO del hábito, no una casilla. Lo que estaba marcado ya se
                          ve por el borde dorado de la fila y por el "→ 06:30" de abajo, así que la
                          casilla no agregaba información y sí ocupaba el lugar donde un icono
                          distingue una fila de otra de un vistazo. El anillo dorado alrededor del
                          icono es el que confirma la selección. */}
                      <View
                        style={[
                          styles.iconoHabito,
                          {
                            borderColor: marcado ? c.gold : 'transparent',
                            backgroundColor: marcado ? c.cardBg : 'transparent',
                          },
                        ]}
                      >
                        <Text style={styles.emojiHabito}>{h.icon ?? '🎯'}</Text>
                      </View>

                      <View style={{ flex: 1, flexShrink: 1, gap: 1 }}>
                        <Text style={[t.body, { color: c.text, fontSize: 13.5 }]} numberOfLines={2}>
                          {h.title}
                        </Text>
                        <View style={styles.filaMeta}>
                          <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
                            {bloqueDelHabito === null
                              ? 'Sin hora todavía'
                              : `${horaActual} · ${ETIQUETA_MOMENTO[bloqueDelHabito]}`}
                          </Text>
                          {horaGuardada && (
                            <Text style={[t.micro, { color: '#4E9F76', fontSize: 10, fontWeight: '700' }]}>
                              ✓ GUARDADO
                            </Text>
                          )}
                          {!activo && (
                            <Text style={[t.micro, { color: '#E06A66', fontSize: 10, fontWeight: '700' }]}>
                              PAUSADO
                            </Text>
                          )}
                          {marcado && (
                            <Text style={[t.micro, { color: c.gold, fontSize: 10, fontWeight: '700' }]}>
                              → {horaTexto}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Interruptor propio del hábito. Escribe solo, sin pasar por "aplicar":
                          apagar algo tiene que costar un toque, no una tanda. */}
                      {h.isDeactivatable === false ? (
                        <Pressable onPress={() => alternarActivo(h)} hitSlop={10} style={styles.candado}>
                          <Icon name="lock" size={16} color={c.tabInactive} />
                        </Pressable>
                      ) : (
                        <Switch
                          value={activo}
                          disabled={enVuelo.has(h.habitoId)}
                          onValueChange={() => alternarActivo(h)}
                          trackColor={{ false: '#332C20', true: c.gold }}
                          thumbColor={activo ? '#1E1B18' : '#888'}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* 5. APLICAR */}
              <GoldButton
                label={
                  guardando
                    ? 'GUARDANDO…'
                    : elegidos.length === 0
                      ? 'MARCÁ LOS QUE VAN A ESA HORA'
                      : `PONER ${elegidos.length === 1 ? '1 HÁBITO' : `${elegidos.length} HÁBITOS`} A LAS ${horaTexto}`
                }
                onPress={aplicar}
                disabled={guardando || elegidos.length === 0}
                style={{ width: '100%', marginTop: 8 }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  hoja: {
    // Sin alto fijo: la hoja crece con su contenido y se detiene en el 92% de la pantalla, con la
    // lista de hábitos scrolleando adentro.
    maxHeight: '92%',
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  agarre: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: 10,
    gap: 10,
  },
  cerrar: {
    minHeight: 44,
    justifyContent: 'center',
  },
  filaTituloCompacta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 6,
    gap: 10,
  },
  filaMomentos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // Con cuatro bloques, cuatro pastillas en una sola fila dejarian el rango ("00:00 – 03:00")
  // ilegible en un telefono angosto. `minWidth: 47%` las acomoda en 2x2 y en tablet vuelven a
  // entrar de a cuatro solas.
  pastillaMomento: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: '47%',
    minHeight: 48,
    borderWidth: 1.2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 1,
  },
  filaAjuste: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    minHeight: 52,
  },
  botonAjuste: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaDias: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  pastillaDia: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  },
  filaHabito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 56,
  },
  iconoHabito: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `lineHeight` explícito: sin él, en Android un emoji de 20px se recorta por arriba dentro de
  // un contenedor de 36 (AGENTS.md §2 — cero desbordamientos, también hacia adentro).
  emojiHabito: {
    fontSize: 20,
    lineHeight: 26,
  },
  filaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  candado: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
