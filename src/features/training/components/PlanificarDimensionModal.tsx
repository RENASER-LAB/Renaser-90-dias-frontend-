import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
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
import { ICONOS_ELEGIBLES } from '../../habits/utils/iconosDeHabito';
import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import { formatearFechaLarga } from '../../programa/hooks/useArranqueDelPrograma';
import {
  aFechaIso,
  DIAS_DEL_PLAN,
  NOMBRE_ISO_DEL_DIA,
  type DiaDelPlan,
} from '../../habits/utils/semanaDelPlan';
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
import type { CategoriaHabitoApi, PreferenciaHabitoApi } from '../../habits/types/habits.types';
import type { HabitItem } from '../../../screens/TrainingScreen';

/**
 * PLANIFICAR los hábitos de una dimensión: a qué hora va cada uno, y prenderlo o apagarlo.
 *
 * ## POR QUÉ ESTA PANTALLA SE REHIZO (2026-09-07)
 *
 * La primera versión pedía marcar varios hábitos y aplicarles UNA hora a todos. Reporte del dueño
 * después de probarla con aprendices: *"se les hace difícil, no saben cómo hacerlo o se pierden y
 * no quieren hacerlo"* — y él mismo se perdía. Al revisarla, los motivos eran concretos y ninguno
 * era de redacción:
 *
 *  1. **Pedía cuatro decisiones antes de que pasara nada** (bloque, hora, días, qué hábitos), y
 *     abría con cero marcados y el botón apagado. Si no descubrías que había que tocar las filas,
 *     la pantalla no hacía nada, nunca.
 *  2. **Las 7 pastillas de días no hacían nada**: el guardado las ignoraba por completo.
 *  3. **Nadie decía el alcance real** de guardar: no era "el lunes", era todos los días en que ese
 *     hábito corre, desde mañana.
 *
 * El fondo es que "marcá varios y aplicá una hora" es un modelo de administrador. Un aprendiz
 * quiere mover UN hábito de hora. Así que la hoja tiene dos pasos y el principal es ese:
 *
 *   **Paso 1 — la lista.** Cada hábito con su icono, su hora, su bloque y su interruptor. Las
 *   pastillas de arriba filtran por bloque para encontrarlo rápido.
 *   **Paso 2 — un hábito.** Se toca una fila y se abre SU hora, ya cargada. Se guarda y se vuelve.
 *
 * Una decisión por pantalla, y en el paso 2 no hay nada que marcar: el hábito ya es el que tocaste.
 *
 * ## LAS DOS REGLAS QUE SOSTIENEN EL RESTO
 *
 * **El bloque del día se calcula, nunca se elige a mano.** Sale de la hora, siempre. En el paso 2,
 * tocar un bloque mueve la rueda a donde ese bloque empieza — no marca nada aparte. Antes existía
 * en Plan un "mover de bloque" que cambiaba el bloque SIN cambiar la hora: no persistía nada y
 * dejaba en pantalla un hábito de las 21:00 rotulado "MAÑANA". Acá es imposible por construcción.
 *
 * **Dónde empieza cada bloque lo decide la persona** (`utils/momentosDelDia.ts`), y se guarda en el
 * teléfono (`storage/rangosDelDia.ts`) porque el backend no tiene dónde ponerlo. Es lo que arregla
 * que dormir a las 00:30 apareciera en la mañana: hoy eso es MADRUGADA, un bloque propio.
 *
 * ## LO QUE EL BACKEND SÍ Y NO PUEDE
 *
 * Escribe con los endpoints que ya usa Plan:
 *   - hora   -> `PATCH /api/v1/habit-preferences/{id}`, preservando el `limitTime` del hábito;
 *   - estado -> `PUT` + `PATCH /api/v1/habit-unlocks/{id}` (el PUT primero: el PATCH exige que el
 *               hábito ya esté en el plan del aprendiz — D-99).
 *
 * **"Pausar solo hoy" es real y "pausar solo el jueves" no.** La pausa termina en `pausedUntil`:
 * mandar la fecha de HOY lo apaga hoy y lo devuelve mañana, que es lo que hace falta en una
 * pantalla del día. Un día suelto a futuro necesitaría un `pausadoDesde` (ver `PlanScreen`).
 *
 * **La hora puede ser distinta por día de la semana** desde V39 (`.../weekdays/{weekday}`). La fila
 * de días es el control: tocar un día pasa a editar SU hora, tocarlo de nuevo vuelve al horario
 * general, y cada pastilla muestra la hora que rige ese día. Un día en que el hábito no corre no se
 * puede tocar — eso lo decide el catálogo, no el aprendiz.
 *
 * Lo que se guarda rige **desde mañana**: el día en curso no se reacomoda (D-91), y por eso esta
 * pantalla organiza la semana y no el día de hoy.
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

/** Un hábito de catálogo: los únicos que se pueden planificar. */
type HabitoPlanificable = HabitItem & { habitoId: string };

/** Cuánto mueve cada toque de − / + el comienzo de un bloque. */
const PASO_DE_AJUSTE = 15;

/**
 * Las antelaciones que se ofrecen. `null` = sin aviso; `0` = a la hora exacta.
 *
 * Cuatro y no un campo libre: elegir entre cuatro es un toque, escribir un número son cinco y una
 * decisión que nadie tiene ganas de tomar. Si alguien necesita 7 minutos, no necesita 7 minutos.
 */
const ANTELACIONES: readonly { minutos: number; etiqueta: string }[] = [
  { minutos: 30, etiqueta: '30 min antes' },
  { minutos: 10, etiqueta: '10 min antes' },
  { minutos: 0, etiqueta: 'A la hora' },
];

/**
 * Los hábitos sin hora van en su propia sección, arriba de todo. No se reparten en un bloque
 * porque no están en ninguno todavía, y esconderlos abajo dejaría lo único que hay que hacer —
 * ponerles hora — en el último lugar donde se mira.
 */
type SeccionDeLista = MomentoDelDia | 'sinHora';

/**
 * La dimensión de Training → la categoría que el backend entiende. Las cuatro que existen de
 * verdad en `renaser.categorias_habito`; VIDA Y NEGOCIO no es una categoría de hábito (son rocas,
 * de otro módulo), así que ahí no se puede crear y el botón no aparece.
 */
const CATEGORIA_POR_DIMENSION: Readonly<Record<string, CategoriaHabitoApi>> = {
  CUERPO: 'BODY',
  MENTE: 'MIND',
  EMOCIONES: 'CONSCIENCE',
  'ESPÍRITU': 'SPIRIT',
};

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
    () => habits.filter((h): h is HabitoPlanificable => Boolean(h.habitoId)),
    [habits],
  );

  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [rangos, setRangos] = useState<RangosDelDia>(RANGOS_POR_DEFECTO);
  const [editandoBloques, setEditandoBloques] = useState(false);
  /**
   * Qué bloque mueven los − / +. Estado propio y NO derivado de la hora: mover un corte puede
   * hacer que la hora cambie de bloque, y si los botones siguieran a la hora, a mitad de un ajuste
   * pasarían a mover OTRO corte sin que la persona hiciera nada.
   */
  const [bloqueEnEdicion, setBloqueEnEdicion] = useState<MomentoDelDia>('mañana');

  /**
   * EL PASO EN QUE ESTAMOS. `null` = la lista; con hábito = su editor de hora.
   *
   * Un solo estado y no un booleano más el hábito: así no existe el estado imposible de "estamos
   * editando pero no se sabe qué".
   */
  const [habitoEnEdicion, setHabitoEnEdicion] = useState<HabitoPlanificable | null>(null);
  /** Secciones plegadas. Arrancan TODAS abiertas: llegar a una lista vacía es el problema que esta
   *  pantalla vino a resolver, no uno que convenga reintroducir por prolijidad. */
  const [plegadas, setPlegadas] = useState<Set<SeccionDeLista>>(new Set());
  /** `true` = el formulario de hábito nuevo (paso 3). */
  const [creando, setCreando] = useState(false);
  const [tituloNuevo, setTituloNuevo] = useState('');
  const [iconoNuevo, setIconoNuevo] = useState<string | null>(null);
  /**
   * QUÉ DÍAS se están editando. Vacío = el horario general, que rige todos los días; con días = la
   * hora propia de ESOS días, todas las semanas (V39).
   *
   * **Sí es selección múltiple, y no contradice lo de sacarla del paso 1.** Allá se marcaban
   * HÁBITOS, que es el modelo de administrador que hacía perder a la gente. Acá son días del mismo
   * hábito, y "lunes, miércoles y viernes a las 6" es una sola decisión: obligar a repetirla tres
   * veces sería el trabajo tonto que la pantalla tiene que evitar.
   */
  const [diasEnEdicion, setDiasEnEdicion] = useState<DiaDelPlan[]>([]);
  /** La hora de cada día, tal cual la resolvió el servidor. `propio` = tiene hora propia. */
  const [horarioSemanal, setHorarioSemanal] = useState<Record<string, { hora: string | null; propio: boolean }>>({});
  /**
   * Los avisos del hábito abierto, en minutos antes. Vacío = sin aviso.
   *
   * Es un conjunto porque se puede querer más de uno — "30 min antes Y a la hora" —, y cada uno es
   * una alarma diaria propia en el teléfono.
   */
  const [antelaciones, setAntelaciones] = useState<number[]>([]);
  const [hora, setHora] = useState(6);
  const [minuto, setMinuto] = useState(0);
  /**
   * `RuedaHoraPicker` es no controlada: arranca donde le digan y después la maneja el dedo. Subir
   * este contador la vuelve a montar, que es la única forma de reposicionarla cuando el salto lo
   * pide la pantalla (abrir un hábito, tocar un bloque) y no el dedo.
   */
  const [semillaRueda, setSemillaRueda] = useState(0);

  const [guardando, setGuardando] = useState(false);
  /** `habitoId` -> hora que YA se guardó en esta sesión de la hoja. Es la marca de "listo". */
  const [guardados, setGuardados] = useState<Record<string, string>>({});
  const [preferencias, setPreferencias] = useState<Map<string, PreferenciaHabitoApi>>(new Map());
  const [pausados, setPausados] = useState<Set<string>>(new Set());
  /** Hábitos con el interruptor en vuelo, para no disparar dos PATCH sobre el mismo. */
  const [enVuelo, setEnVuelo] = useState<Set<string>>(new Set());
  /**
   * `true` en cuanto UNA escritura salió bien, para que cerrar con la ✕ refresque Training igual:
   * si no, la pantalla de atrás seguiría mostrando los horarios viejos.
   */
  const [huboEscritura, setHuboEscritura] = useState(false);

  const hoyIso = aFechaIso(new Date());

  useEffect(() => {
    if (!visible) return;
    setEstado('cargando');
    setHabitoEnEdicion(null);
    setEditandoBloques(false);
    setPlegadas(new Set());
    setCreando(false);
    setTituloNuevo('');
    setIconoNuevo(null);
    setGuardados({});
    setHuboEscritura(false);
    (async () => {
      try {
        // Los cortes salen del teléfono y los otros dos del backend; independientes, van juntos.
        const [rangosLeidos, prefs, desbloqueos] = await Promise.all([
          almacenRangos.leer(claveUsuario),
          habitsApi.obtenerPreferencias(),
          habitsApi.obtenerPlanDesbloqueos(),
        ]);
        setRangos(rangosLeidos);
        setPreferencias(new Map<string, PreferenciaHabitoApi>(prefs.map(p => [p.habitId, p])));
        // Una pausa VENCIDA no es una pausa: `paused` queda en true aunque `pausedUntil` ya haya
        // pasado, así que sin comparar contra hoy el interruptor mostraría apagado un hábito que
        // el generador del día ya vuelve a crear.
        setPausados(
          new Set(
            desbloqueos.items
              .filter(d => d.paused && (d.pausedUntil === null || d.pausedUntil >= hoyIso))
              .map(d => d.habitId),
          ),
        );
        setEstado('listo');
      } catch (e) {
        setEstado('error');
        Alert.alert('No pudimos cargar los horarios', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, dimension]);

  /** La hora que rige HOY para un hábito: la recién guardada, la del backend, o la de la lista. */
  const horaDe = (habitoId: string, porDefecto: string) =>
    guardados[habitoId] ?? preferencias.get(habitoId)?.triggerTime?.slice(0, 5) ?? porDefecto;

  /** En qué bloque cae hoy. `null` = todavía no tiene hora, y esos NO se filtran nunca. */
  const bloqueDe = (habitoId: string, porDefecto: string): MomentoDelDia | null => {
    const minutos = aMinutos(horaDe(habitoId, porDefecto));
    return minutos === null ? null : momentoDeMinutos(minutos, rangos);
  };

  const minutosElegidos = hora * 60 + minuto;
  // El bloque NO es estado propio: se deriva de la hora, siempre.
  const momentoActual = momentoDeMinutos(minutosElegidos, rangos);
  const horaTexto = `${aDosDigitos(hora)}:${aDosDigitos(minuto)}`;

  const cerrar = () => (huboEscritura ? onGuardado() : onCerrar());

  /** Volver de un hábito a la lista sin guardar nada. */
  const volverALaLista = () => setHabitoEnEdicion(null);

  /** Abre el editor de UN hábito con su hora ya cargada. Ese es el camino principal. */
  const abrirHabito = (h: HabitoPlanificable) => {
    const minutos = aMinutos(horaDe(h.habitoId, h.time));
    // Sin hora todavía: se propone el comienzo de la mañana, que es donde arranca la jornada.
    const inicial = minutos ?? rangos.inicioManana;
    setHora(Math.floor(inicial / 60));
    setMinuto(inicial % 60);
    setSemillaRueda(n => n + 1);
    setBloqueEnEdicion(momentoDeMinutos(inicial, rangos));
    setEditandoBloques(false);
    setDiasEnEdicion([]);
    setHorarioSemanal({});
    // Se pide DESPUÉS de abrir, no antes: el toque tiene que responder ya. Mientras llega, las
    // pastillas muestran el día sin hora, que es lo honesto.
    void (async () => {
      try {
        const dias = await habitsApi.obtenerHorarioSemanal(h.habitoId);
        const porNombre = new Map(dias.map(d => [d.weekday, d]));
        setHorarioSemanal(
          Object.fromEntries(
            DIAS_DEL_PLAN.map(dia => {
              const d = porNombre.get(NOMBRE_ISO_DEL_DIA[dia]);
              return [dia, { hora: d?.triggerTime?.slice(0, 5) ?? null, propio: d?.custom ?? false }];
            }),
          ),
        );
      } catch {
        // Sin horario semanal la pantalla sigue sirviendo para el horario general, que es el caso
        // de siempre. No se rompe nada: las pastillas quedan sin hora.
      }
    })();
    const previa = preferencias.get(h.habitoId);
    // El conjunto vive en el teléfono (`minutos_recordatorio` del backend es UN solo número). Si
    // no hay nada guardado ahí, se cae al campo del servidor, que sí tiene el aviso principal:
    // así quien ya lo tenía puesto no lo pierde.
    void recordatorios.antelacionesDe(claveUsuario, h.habitoId).then(locales => {
      if (locales.length > 0) {
        setAntelaciones(locales);
        return;
      }
      setAntelaciones(previa?.reminderEnabled ? [previa.reminderMinutesBefore ?? 0] : []);
    });
    setHabitoEnEdicion(h);
  };

  /**
   * Tocar un día pasa a editar SU hora; tocarlo de nuevo vuelve al horario general. La rueda sigue
   * a lo que se está editando, que es lo que hace que no haya dos verdades en pantalla.
   */
  /** Lleva la rueda a una hora concreta. `null` cae en el comienzo de la mañana. */
  const moverRueda = (hhmm: string | null) => {
    const minutos = aMinutos(hhmm) ?? rangos.inicioManana;
    setHora(Math.floor(minutos / 60));
    setMinuto(minutos % 60);
    setSemillaRueda(n => n + 1);
  };

  /** Vuelve a editar el horario general: todos los días. */
  const volverATodos = () => {
    setDiasEnEdicion([]);
    moverRueda(horaDe(habitoEnEdicion?.habitoId ?? '', habitoEnEdicion?.time ?? ''));
  };

  /**
   * Marca o desmarca un día. La rueda se mueve SOLO al marcar el primero: a partir de ahí es la
   * hora que se va a poner, no la que había — si siguiera saltando con cada día que se suma,
   * borraría lo que la persona acaba de elegir.
   */
  const alternarDia = (dia: DiaDelPlan) => {
    setDiasEnEdicion(prev => {
      if (prev.includes(dia)) {
        const quedan = prev.filter(d => d !== dia);
        if (quedan.length === 0) {
          moverRueda(horaDe(habitoEnEdicion?.habitoId ?? '', habitoEnEdicion?.time ?? ''));
        }
        return quedan;
      }
      if (prev.length === 0) moverRueda(horarioSemanal[dia]?.hora ?? null);
      // En el orden de la semana, no en el orden en que se tocaron: "L M V" se lee mejor que "V L M".
      return DIAS_DEL_PLAN.filter(d => d === dia || prev.includes(d));
    });
  };

  /** En el editor, tocar un bloque lleva la rueda a donde ese bloque empieza. */
  const irAlBloque = (m: MomentoDelDia) => {
    const desde = limitesDelMomento(m, rangos).desde % (24 * 60);
    setHora(Math.floor(desde / 60));
    setMinuto(desde % 60);
    setSemillaRueda(n => n + 1);
  };

  /** Abre o cierra el panel de cortes, arrancando por el bloque que se está mirando. */
  const alternarEdicionDeBloques = () => {
    if (!editandoBloques) {
      setBloqueEnEdicion(habitoEnEdicion ? momentoActual : 'mañana');
    }
    setEditandoBloques(v => !v);
  };

  /** Mueve el comienzo del bloque EN EDICIÓN y lo persiste en el teléfono. */
  const ajustarBloque = (delta: number) => {
    const nuevos = moverInicio(rangos, bloqueEnEdicion, delta);
    if (nuevos === rangos) return; // dejaría un bloque por debajo del mínimo
    setRangos(nuevos);
    void almacenRangos.guardar(claveUsuario, nuevos);
  };

  /**
   * El interruptor de UN hábito. Escribe en el acto y se refleja de forma optimista; si el backend
   * lo rechaza se vuelve al valor anterior, para que nunca quede mostrando algo que no se guardó.
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

  const alternarActivo = (h: HabitoPlanificable) => {
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
   * Guarda la hora de UN día de la semana (V39) y se queda en la pantalla: lo normal es configurar
   * varios días seguidos, y volver a la lista despues de cada uno seria hacerlo entrar de nuevo.
   */
  const guardarDias = async (h: HabitoPlanificable, dias: DiaDelPlan[]) => {
    setGuardando(true);
    const limite = preferencias.get(h.habitoId)?.limitTime ?? null;
    const fallidos: DiaDelPlan[] = [];
    const guardados: DiaDelPlan[] = [];
    // En serie y no en paralelo: son escrituras sobre las mismas filas del aprendiz, y así un
    // fallo suelto queda identificado por día en vez de tumbar la tanda entera.
    for (const dia of dias) {
      try {
        await habitsApi.fijarHorarioDelDia(h.habitoId, NOMBRE_ISO_DEL_DIA[dia], `${horaTexto}:00`, limite);
        guardados.push(dia);
      } catch {
        fallidos.push(dia);
      }
    }
    if (guardados.length > 0) {
      setHorarioSemanal(prev => ({
        ...prev,
        ...Object.fromEntries(guardados.map(d => [d, { hora: horaTexto, propio: true }])),
      }));
      setHuboEscritura(true);
    }
    setGuardando(false);
    // Quedan marcados SOLO los que fallaron: reintentar es volver a tocar el botón.
    setDiasEnEdicion(fallidos);

    // Confirmar SIEMPRE, no solo cuando algo sale mal.
    //
    // > Reportado por el dueño: guardó cinco días, la pantalla no dijo nada y tuvo que ir a mirar
    // > la base para saber si había pasado algo. Guardar el horario general sí avisaba; guardar
    // > días era mudo. Un guardado silencioso se siente igual que uno que falló.
    if (fallidos.length > 0) {
      Alert.alert(
        'Se guardó a medias',
        `${guardados.join(', ') || 'Ninguno'} quedaron a las ${horaTexto}. No pudimos con ${fallidos.join(', ')}.`,
      );
      return;
    }
    Alert.alert(
      'Horario guardado',
      `“${h.title}” queda a las ${horaTexto} los ${guardados.join(', ').toLowerCase()}, todas las semanas.` +
        '\n\nEmpieza a regir mañana: el día en curso no se reacomoda.',
    );
  };

  /** Devuelve un día al horario general. */
  const quitarDias = async (h: HabitoPlanificable, dias: DiaDelPlan[]) => {
    setGuardando(true);
    try {
      for (const dia of dias) {
        await habitsApi.quitarHorarioDelDia(h.habitoId, NOMBRE_ISO_DEL_DIA[dia]);
      }
      const general = horaDe(h.habitoId, h.time);
      setHorarioSemanal(prev => ({
        ...prev,
        ...Object.fromEntries(dias.map(d => [d, { hora: general || null, propio: false }])),
      }));
      setHuboEscritura(true);
      volverATodos();
    } catch (e) {
      Alert.alert('No pudimos quitarlo', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setGuardando(false);
    }
  };

  /** Guarda la hora GENERAL del hábito —todos los días— y vuelve a la lista. */
  const guardarHora = async (h: HabitoPlanificable) => {
    setGuardando(true);
    try {
      // El `limitTime` que ya tenía: el PATCH reemplaza los dos campos a la vez y mandar `null`
      // le borraría la hora límite a hábitos que sí vencen dentro del día.
      const previa = preferencias.get(h.habitoId);
      // Al servidor va la antelación MÁS TEMPRANA: es lo que ese campo puede representar, y la
      // que mejor describe "cuándo hay que empezar a avisar" si algún día el push sale de ahí.
      const recordatorio = {
        activo: antelaciones.length > 0,
        minutosAntes: antelaciones.length > 0 ? Math.max(...antelaciones) : null,
      };
      const resultado = await habitsApi.cambiarHorario(
        h.habitoId,
        `${horaTexto}:00`,
        previa?.limitTime ?? null,
        recordatorio,
      );
      // La PREFERENCIA vive en el servidor (viaja entre dispositivos); la ALARMA la dispara este
      // teléfono. Si la persona niega el permiso, `programar` devuelve false y se lo decimos en vez
      // de dejarla creyendo que va a sonar.
      const ok = await recordatorios.programar(
        claveUsuario, h.habitoId, h.title, horaTexto, antelaciones,
      );
      const avisoImposible = antelaciones.length > 0 && !ok;
      // El horario local se actualiza acá y no recargando todo: recargar con la hoja abierta
      // reordenaría la lista debajo del dedo.
      setPreferencias(prev => {
        const siguiente = new Map(prev);
        const base = prev.get(h.habitoId);
        if (base) {
          siguiente.set(h.habitoId, {
            ...base,
            triggerTime: `${horaTexto}:00`,
            reminderEnabled: recordatorio.activo,
            reminderMinutesBefore: recordatorio.minutosAntes,
          });
        }
        return siguiente;
      });
      setGuardados(prev => ({ ...prev, [h.habitoId]: horaTexto }));
      setHuboEscritura(true);
      setHabitoEnEdicion(null);
      const cuando = resultado.deferredEffectiveDate
        ? formatearFechaLarga(resultado.deferredEffectiveDate)
        : 'el día siguiente';
      Alert.alert(
        'Listo',
        `“${h.title}” queda a las ${horaTexto} (${ETIQUETA_MOMENTO[momentoActual]}).` +
          (resultado.deferred ? `\n\nEmpieza a regir ${cuando}: el día en curso no se reacomoda.` : '') +
          (avisoImposible
            ? '\n\nEl recordatorio quedó guardado, pero este teléfono no tiene permiso para avisarte. Habilitá las notificaciones de la app.'
            : ''),
      );
    } catch (e) {
      Alert.alert('No pudimos guardar la hora', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Antes de guardar, avisa si el hábito quedaría en un bloque que contradice lo que ese hábito ES
   * (despertarse de tarde, dormir de mañana). Avisa y deja seguir: quien trabaja de noche tiene
   * derecho a dormir a las 09:00 — lo que no puede es hacerlo sin enterarse.
   */
  const intentarGuardar = (h: HabitoPlanificable) => {
    const aceptables = h.systemKey ? MOMENTO_ESPERADO[h.systemKey] : undefined;
    if (aceptables !== undefined && !aceptables.includes(momentoActual)) {
      Alert.alert(
        'Revisá el bloque del día',
        `“${h.title}” quedaría a las ${horaTexto}, que con tus bloques es ${ETIQUETA_MOMENTO[momentoActual]}.` +
          '\n\nSi es a propósito, seguí. Si no, movés la rueda y listo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Guardar igual', onPress: () => void guardarHora(h) },
        ],
      );
      return;
    }
    if (diasEnEdicion.length > 0) {
      void guardarDias(h, diasEnEdicion);
      return;
    }
    void guardarHora(h);
  };

  /** Los días en que corre ESTE hábito — informativo: es el alcance del cambio. */
  const diasDe = (h: HabitoPlanificable) => h.diasCatalogo ?? todosLosDias();

  /**
   * Los hábitos repartidos por bloque, en orden del día. Se calcula acá y no se guarda: el bloque
   * de un hábito sale de su hora, y la hora cambia mientras la hoja está abierta.
   */
  const porSeccion = (): { seccion: SeccionDeLista; habitos: HabitoPlanificable[] }[] => {
    const vacio: Record<SeccionDeLista, HabitoPlanificable[]> = {
      sinHora: [], madrugada: [], mañana: [], tarde: [], noche: [],
    };
    for (const h of planificables) {
      const bloque = bloqueDe(h.habitoId, h.time);
      vacio[bloque ?? 'sinHora'].push(h);
    }
    const orden: SeccionDeLista[] = ['sinHora', ...MOMENTOS];
    // Las secciones vacías NO se dibujan: un encabezado con cero filas es ruido, no información.
    return orden.filter(sec => vacio[sec].length > 0).map(sec => ({ seccion: sec, habitos: vacio[sec] }));
  };

  const alternarSeccion = (sec: SeccionDeLista) =>
    setPlegadas(prev => {
      const siguiente = new Set(prev);
      if (siguiente.has(sec)) siguiente.delete(sec);
      else siguiente.add(sec);
      return siguiente;
    });

  const categoriaDeLaDimension = CATEGORIA_POR_DIMENSION[dimension];

  /**
   * Da de alta un hábito PROPIO del aprendiz, en el backend.
   *
   * > Ojo con el antecedente: el "➕ Crear Hábito" de Training arma hoy un objeto en memoria con un
   * > id inventado y anuncia que lo creó. El hábito no existe en ninguna parte y desaparece al
   * > recargar — es el mismo bug que E-137 ya corrigió en Plan llamando a este endpoint. Acá se
   * > llama de entrada.
   */
  const crearHabito = async () => {
    const titulo = tituloNuevo.trim();
    if (!titulo) {
      Alert.alert('Falta el nombre', 'Escribí cómo se llama el hábito.');
      return;
    }
    if (!categoriaDeLaDimension) return;
    setGuardando(true);
    try {
      await habitsApi.crearHabitoPersonal({
        title: titulo,
        habitType: 'CHECKBOX',
        category: categoriaDeLaDimension,
        template: 'OTRO',
        goalLabel: null,
        iconKey: iconoNuevo,
        triggerTime: `${horaTexto}:00`,
        // Un hábito propio no vence dentro del día: sin hora límite.
        limitTime: null,
      });
      setHuboEscritura(true);
      setCreando(false);
      setTituloNuevo('');
      setIconoNuevo(null);
      // Acá SÍ se recarga todo: el hábito nuevo no está en `habits`, que viene de la pantalla de
      // atrás, así que la única forma de verlo es que Training vuelva a pedir su lista.
      onGuardado();
      Alert.alert('Hábito creado', `“${titulo}” queda a las ${horaTexto}, todos los días.`);
    } catch (e) {
      Alert.alert('No pudimos crear el hábito', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setGuardando(false);
    }
  };

  /** Una fila de la lista. Tocarla abre su hora; el interruptor de la derecha la prende o apaga. */
  const filaDeHabito = (h: HabitoPlanificable) => {
    const horaGuardada = guardados[h.habitoId];
    const horaActual = horaDe(h.habitoId, h.time);
    const bloqueDelHabito = bloqueDe(h.habitoId, h.time);
    const activo = !pausados.has(h.habitoId);
    return (
      <Pressable
        key={h.habitoId}
        onPress={() => abrirHabito(h)}
        style={[styles.filaHabito, { borderColor: c.border, opacity: activo ? 1 : 0.55 }]}
      >
        <View style={styles.iconoHabito}>
          <Text style={styles.emojiHabito}>{h.icon ?? '🎯'}</Text>
        </View>

        <View style={{ flex: 1, flexShrink: 1, gap: 1 }}>
          <Text style={[t.body, { color: c.text, fontSize: 13.5 }]} numberOfLines={2}>
            {h.title}
          </Text>
          <View style={styles.filaMeta}>
            <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
              {bloqueDelHabito === null ? 'Tocá para ponerle hora' : horaActual}
            </Text>
            {horaGuardada && (
              <Text style={[t.micro, { color: '#4E9F76', fontSize: 10, fontWeight: '700' }]}>✓ GUARDADO</Text>
            )}
            {!activo && (
              <Text style={[t.micro, { color: '#E06A66', fontSize: 10, fontWeight: '700' }]}>PAUSADO</Text>
            )}
          </View>
        </View>

        <Icon name="chevron" size={14} color={c.chevron} />

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
  };

  const pastillasDeBloque = (activo: (m: MomentoDelDia) => boolean, alTocar: (m: MomentoDelDia) => void) => (
    <View style={styles.filaMomentos}>
      {MOMENTOS.map(m => {
        const on = activo(m);
        return (
          <Pressable
            key={m}
            onPress={() => alTocar(m)}
            style={[
              styles.pastillaMomento,
              { borderColor: on ? c.gold : c.border, backgroundColor: on ? c.cardBgAlt : 'transparent' },
            ]}
          >
            <Text
              style={[t.micro, { fontSize: 10.5, fontWeight: '700', color: on ? c.gold : c.textSoft }]}
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
  );

  const panelDeCortes = (
    <View style={[styles.filaAjuste, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
      <Pressable
        onPress={() => ajustarBloque(-PASO_DE_AJUSTE)}
        hitSlop={10}
        disabled={bloqueEnEdicion === 'madrugada'}
        style={[styles.botonAjuste, { borderColor: c.gold, opacity: bloqueEnEdicion === 'madrugada' ? 0.3 : 1 }]}
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
            : 'Se guarda en este teléfono'}
        </Text>
      </View>
      <Pressable
        onPress={() => ajustarBloque(PASO_DE_AJUSTE)}
        hitSlop={10}
        disabled={bloqueEnEdicion === 'madrugada'}
        style={[styles.botonAjuste, { borderColor: c.gold, opacity: bloqueEnEdicion === 'madrugada' ? 0.3 : 1 }]}
      >
        <Text style={[t.cardTitle, { color: c.gold, fontSize: 18 }]}>+</Text>
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={creando ? () => setCreando(false) : habitoEnEdicion ? volverALaLista : cerrar}
    >
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
            {habitoEnEdicion || creando ? (
              <Pressable
                onPress={creando ? () => setCreando(false) : volverALaLista}
                hitSlop={12}
                style={styles.volver}
              >
                <Icon name="arrowLeft" size={14} color={c.gold} />
                <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>VOLVER</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>PLANIFICAR</Text>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]} numberOfLines={1}>
                  {dimension}
                </Text>
              </View>
            )}
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

          {/* =================================================================== */}
          {/* PASO 1 — LA LISTA. Encontrar el hábito y, si hace falta, apagarlo.  */}
          {/* =================================================================== */}
          {estado === 'listo' && habitoEnEdicion === null && !creando && (
            <>
              <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 10, lineHeight: 17 }]}>
                Tocá un hábito para cambiarle la hora. El interruptor de la derecha lo prende o lo apaga.
              </Text>

              {/* Las pastillas ya no filtran: la lista viene agrupada por bloque, que dice lo
                  mismo sin ocupar media pantalla ni pedir un toque para ver el resto. Quedan solo
                  para elegir QUÉ corte mueven los − / +, y por eso aparecen únicamente al ajustar. */}
              <View style={styles.filaTituloCompacta}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>TU DÍA</Text>
                <Pressable onPress={alternarEdicionDeBloques} hitSlop={10}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                    {editandoBloques ? 'LISTO' : '✎ AJUSTAR BLOQUES'}
                  </Text>
                </Pressable>
              </View>

              {editandoBloques && (
                <>
                  {pastillasDeBloque(
                    m => m === bloqueEnEdicion,
                    m => setBloqueEnEdicion(m),
                  )}
                  {panelDeCortes}
                </>
              )}

              <ScrollView
                style={{ flexShrink: 1, marginTop: 10 }}
                contentContainerStyle={{ gap: 10, paddingBottom: 6 }}
                showsVerticalScrollIndicator={false}
              >
                {planificables.length === 0 && (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 13, paddingVertical: 16 }]}>
                    Todavía no hay hábitos en esta dimensión.
                  </Text>
                )}

                {porSeccion().map(({ seccion, habitos }) => {
                  const plegada = plegadas.has(seccion);
                  const esSinHora = seccion === 'sinHora';
                  return (
                    <View key={seccion} style={{ gap: 8 }}>
                      <Pressable
                        onPress={() => alternarSeccion(seccion)}
                        style={[styles.cabezaSeccion, { borderBottomColor: c.divider }]}
                      >
                        <View style={{ flex: 1, flexShrink: 1 }}>
                          <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                            {esSinHora ? '⏳ SIN HORA TODAVÍA' : ETIQUETA_MOMENTO[seccion]} ({habitos.length})
                          </Text>
                          {!esSinHora && (
                            <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>
                              {rangoTexto(seccion, rangos)}
                            </Text>
                          )}
                        </View>
                        <Text style={[t.micro, { color: c.gold, fontSize: 12 }]}>{plegada ? '▸' : '▾'}</Text>
                      </Pressable>

                      {!plegada && habitos.map(h => filaDeHabito(h))}
                    </View>
                  );
                })}

                {/* Crear un hábito propio, en la dimensión que está abierta. Solo en las cuatro que
                    son categorías de verdad: VIDA Y NEGOCIO son rocas, de otro módulo. */}
                {categoriaDeLaDimension && (
                  <Pressable
                    onPress={() => {
                      const inicio = rangos.inicioManana;
                      setHora(Math.floor(inicio / 60));
                      setMinuto(inicio % 60);
                      setSemillaRueda(n => n + 1);
                      setTituloNuevo('');
                      setIconoNuevo(null);
                      setCreando(true);
                    }}
                    style={[styles.crearHabito, { borderColor: c.gold }]}
                  >
                    <Icon name="plus" size={14} color={c.gold} />
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                      CREAR UN HÁBITO EN {dimension}
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </>
          )}

          {/* =================================================================== */}
          {/* PASO 2 — UN HÁBITO. Una sola decisión: a qué hora.                  */}
          {/* =================================================================== */}
          {estado === 'listo' && habitoEnEdicion !== null && (
            <View style={{ flexShrink: 1 }}>
              <View style={styles.cabezalHabito}>
                <View style={styles.iconoHabitoGrande}>
                  <Text style={styles.emojiHabitoGrande}>{habitoEnEdicion.icon ?? '🎯'}</Text>
                </View>
                <View style={{ flex: 1, flexShrink: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]} numberOfLines={2}>
                    {habitoEnEdicion.title}
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
                    Ahora: {horaDe(habitoEnEdicion.habitoId, habitoEnEdicion.time) || 'sin hora'}
                  </Text>
                </View>
              </View>

              <View style={styles.filaTituloCompacta}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>BLOQUE DEL DÍA</Text>
                <Pressable onPress={alternarEdicionDeBloques} hitSlop={10}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                    {editandoBloques ? 'LISTO' : '✎ AJUSTAR'}
                  </Text>
                </Pressable>
              </View>

              {pastillasDeBloque(
                m => (editandoBloques ? m === bloqueEnEdicion : m === momentoActual),
                m => (editandoBloques ? setBloqueEnEdicion(m) : irAlBloque(m)),
              )}
              {editandoBloques && panelDeCortes}

              <View style={{ paddingTop: 8, paddingBottom: 2 }}>
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
              </Text>

              {/* El alcance real del guardado. Describe, no promete: la hora es una sola para todos
                  los días en que el hábito corre. */}
              {/* LOS DÍAS, ahora sí tocables (V39). Tocar uno pasa a editar SU hora; tocarlo de
                  nuevo vuelve al horario general. Cada pastilla muestra la hora que rige ese día,
                  así que la fila entera se lee de un vistazo: "los lunes 05:00, el resto 09:00". */}
              <View style={styles.filaTituloCompacta}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]} numberOfLines={1}>
                  {diasEnEdicion.length === 0 ? 'TODOS LOS DÍAS' : `SOLO ${diasEnEdicion.join(' · ')}`}
                </Text>
                {diasEnEdicion.length > 0 && (
                  <Pressable onPress={volverATodos} hitSlop={10}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                      ← TODOS
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.filaDias}>
                {DIAS_DEL_PLAN.map(dia => {
                  const corre = diasDe(habitoEnEdicion)[dia];
                  const editando = diasEnEdicion.includes(dia);
                  const delDia = horarioSemanal[dia];
                  return (
                    <Pressable
                      key={dia}
                      // Un día en que el hábito NO corre no se puede editar: la hora de un día que
                      // no existe no significa nada. Eso lo decide el catálogo, no el aprendiz.
                      onPress={() => corre && alternarDia(dia)}
                      disabled={!corre}
                      style={[
                        styles.pastillaDia,
                        {
                          borderColor: editando ? c.gold : c.border,
                          backgroundColor: editando ? c.gold : 'transparent',
                          opacity: corre ? 1 : 0.35,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          t.micro,
                          { fontSize: 12, fontWeight: '700', color: editando ? c.onGold : c.textSoft },
                        ]}
                      >
                        {dia.charAt(0)}
                      </Text>
                      {corre && (
                        <Text
                          style={[
                            t.micro,
                            {
                              fontSize: 8.5,
                              color: editando ? c.onGold : delDia?.propio ? c.gold : c.textSoft,
                              fontWeight: delDia?.propio ? '700' : '400',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {delDia?.hora ?? '·'}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 5, lineHeight: 14 }]}>
                {diasEnEdicion.length === 0
                  ? 'Tocá uno o varios días para darles su propia hora. Lo que guardes acá rige el resto, desde mañana.'
                  : `Solo ${diasEnEdicion.join(', ').toLowerCase()}, todas las semanas. El día en curso no se reacomoda.`}
              </Text>

              {/* Solo cuando TODOS los marcados tienen hora propia: ofrecer "quitar" con alguno que
                  no la tiene sería prometer deshacer algo que no está puesto. */}
              {diasEnEdicion.length > 0 && diasEnEdicion.every(d => horarioSemanal[d]?.propio) && (
                <Pressable
                  onPress={() => void quitarDias(habitoEnEdicion, diasEnEdicion)}
                  hitSlop={8}
                  style={{ marginTop: 8, minHeight: 36, justifyContent: 'center' }}
                >
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
                    ✕ Quitar la hora propia de {diasEnEdicion.join(', ').toLowerCase()} y volver al horario general
                  </Text>
                </Pressable>
              )}

              {/* No se ofrece donde no se puede cumplir: web (la librería no soporta esa
                  plataforma) ni Expo Go (el push salió de ahí en el SDK 53). Ver
                  `recordatoriosDeHabito`. Mostrarlo igual sería prometer un aviso que no suena. */}
              {recordatorios.HAY_RECORDATORIOS && (
                <>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', marginTop: 12 }]}>
                    RECORDATORIO {antelaciones.length > 1 ? `(${antelaciones.length} avisos)` : ''}
                  </Text>
                  <View style={styles.filaAntelaciones}>
                    {/* "Sin aviso" no es una opción más: es el conjunto vacío, y por eso va aparte
                        y no compite con las otras tres. */}
                    <Pressable
                      onPress={() => setAntelaciones([])}
                      style={[
                        styles.pastillaAntelacion,
                        {
                          borderColor: antelaciones.length === 0 ? c.gold : c.border,
                          backgroundColor: antelaciones.length === 0 ? c.cardBgAlt : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          t.micro,
                          {
                            fontSize: 10.5,
                            fontWeight: '700',
                            color: antelaciones.length === 0 ? c.gold : c.textSoft,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        Sin aviso
                      </Text>
                    </Pressable>
                    {ANTELACIONES.map(({ minutos, etiqueta }) => {
                      const on = antelaciones.includes(minutos);
                      return (
                        <Pressable
                          key={etiqueta}
                          onPress={() =>
                            setAntelaciones(prev =>
                              prev.includes(minutos)
                                ? prev.filter(x => x !== minutos)
                                : [...prev, minutos].sort((a, b) => b - a),
                            )
                          }
                          style={[
                            styles.pastillaAntelacion,
                            {
                              borderColor: on ? c.gold : c.border,
                              backgroundColor: on ? c.cardBgAlt : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            style={[t.micro, { fontSize: 10.5, fontWeight: '700', color: on ? c.gold : c.textSoft }]}
                            numberOfLines={1}
                          >
                            {etiqueta}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              <GoldButton
                label={
                  guardando
                    ? 'GUARDANDO…'
                    : diasEnEdicion.length === 0
                      ? `GUARDAR ${horaTexto} · TODOS LOS DÍAS`
                      : `GUARDAR ${horaTexto} · ${diasEnEdicion.join(' ')}`
                }
                onPress={() => intentarGuardar(habitoEnEdicion)}
                disabled={guardando}
                style={{ width: '100%', marginTop: 14 }}
              />
            </View>
          )}

          {/* =================================================================== */}
          {/* PASO 3 — HÁBITO NUEVO. Nombre y hora, nada más: la categoría sale de */}
          {/* la dimensión que ya está abierta y los días son todos.               */}
          {/* =================================================================== */}
          {estado === 'listo' && creando && (
            <View style={{ flexShrink: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15, marginTop: 12 }]}>
                Hábito nuevo en {dimension}
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11, marginTop: 2, marginBottom: 10 }]}>
                Es tuyo: podés pausarlo o sacarlo cuando quieras.
              </Text>

              <TextInput
                value={tituloNuevo}
                onChangeText={setTituloNuevo}
                placeholder="Caminar 30 minutos"
                placeholderTextColor={c.tabInactive}
                style={[styles.campoTitulo, { borderColor: c.border, color: c.text, backgroundColor: c.cardBgAlt }]}
                maxLength={80}
                returnKeyType="done"
              />

              <Text style={[t.micro, { color: c.gold, fontWeight: '700', marginTop: 16 }]}>ELEGÍ UN ICONO</Text>
              {/* Los mismos iconos del catálogo, no una lista aparte: así un hábito propio se ve
                  igual de curado que uno del programa. Sin elegir ninguno se guarda `null` y el
                  hábito hereda el de su categoría, que es como nacían todos hasta ahora. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.grillaIconos}
                keyboardShouldPersistTaps="handled"
              >
                {ICONOS_ELEGIBLES.map(({ clave, emoji }) => {
                  const elegido = iconoNuevo === clave;
                  return (
                    <Pressable
                      key={clave}
                      onPress={() => setIconoNuevo(elegido ? null : clave)}
                      style={[
                        styles.opcionIcono,
                        {
                          borderColor: elegido ? c.gold : c.border,
                          backgroundColor: elegido ? c.cardBgAlt : 'transparent',
                        },
                      ]}
                    >
                      <Text style={styles.emojiHabito}>{emoji}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={[t.micro, { color: c.gold, fontWeight: '700', marginTop: 16 }]}>¿A QUÉ HORA?</Text>
              <View style={{ paddingTop: 4 }}>
                <RuedaHoraPicker
                  key={`rueda-nuevo-${semillaRueda}`}
                  horaInicial={hora}
                  minutoInicial={minuto}
                  onCambiar={(h, m) => {
                    setHora(h);
                    setMinuto(m);
                  }}
                />
              </View>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, textAlign: 'center', lineHeight: 15 }]}>
                {horaTexto} cae en {ETIQUETA_MOMENTO[momentoActual]}
                {'\n'}Un hábito propio corre los 7 días y no vence: la hora lo ubica en tu jornada.
              </Text>

              <GoldButton
                label={guardando ? 'CREANDO…' : `CREAR A LAS ${horaTexto}`}
                onPress={() => void crearHabito()}
                disabled={guardando}
                style={{ width: '100%', marginTop: 16 }}
              />
            </View>
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
  volver: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  cerrar: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cabezalHabito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  iconoHabitoGrande: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiHabitoGrande: {
    fontSize: 28,
    lineHeight: 34,
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
  // Cuatro bloques en una sola fila dejarían el rango ilegible en un teléfono angosto; `47%` los
  // acomoda en 2x2 y en tablet vuelven a entrar de a cuatro solos.
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
    marginTop: 6,
  },
  // Alto para dos renglones: la letra del día y la hora que rige ese día.
  pastillaDia: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabezaSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: 6,
    minHeight: 40,
    gap: 10,
  },
  // Tira HORIZONTAL y no una grilla que envuelve: 17 iconos en dos o tres filas empujaban la rueda
  // fuera de la hoja, y un ScrollView vertical acá adentro se pelearía con las ruedas por el dedo
  // (AGENTS.md §2). En horizontal no compiten: cada uno se lleva su propio eje.
  filaAntelaciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  pastillaAntelacion: {
    flexGrow: 1,
    minWidth: '47%',
    minHeight: 44,
    borderWidth: 1.2,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  grillaIconos: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingRight: 8,
  },
  opcionIcono: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crearHabito: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderRadius: 12,
    minHeight: 52,
    marginTop: 4,
  },
  campoTitulo: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 52,
    fontSize: 15,
    fontFamily: 'Jost_400Regular',
  },
  filaHabito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `lineHeight` explícito: sin él, en Android un emoji se recorta por arriba dentro de su caja.
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
