import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { Alert } from '../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, Row, RowBetween, ScreenHeader } from '../components/ui';
import { Icon } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { usePlanHabitos } from '../features/habits/hooks/usePlanHabitos';
import { DIAS_DEL_PROGRAMA, puntoDelMedidor, useProgramaDia } from '../features/programa/hooks/useProgramaDia';
import {
  diaAnterior,
  formatearFechaLarga,
  useArranqueDelPrograma,
} from '../features/programa/hooks/useArranqueDelPrograma';
import { HoraPickerModal } from '../features/habits/components/HoraPickerModal';
import * as habitsApi from '../features/habits/api/habitsApi';
import { aMomento, mapearPlanHabit } from '../features/habits/api/habitsMappers';
import {
  diasDelMesDeLaSemana,
  fechasIsoDeLaSemana,
  INDICE_DE_HOY,
  MOSTRAR_SEMANA_SIGUIENTE,
} from '../features/habits/utils/semanaDelPlan';
import type { DiaDelPlan } from '../features/habits/utils/semanaDelPlan';
import type { CategoriaHabitoApi } from '../features/habits/types/habits.types';
import { mensajeDeError } from '../services/http/apiClient';
import { useRocasMaestras } from '../features/objetivos/hooks/useRocasMaestras';
import type { EjeObjetivo } from '../features/objetivos/types/objetivos.types';
import { etiquetaDelMes, mesDe, semanaDe } from '../features/objetivos/utils/periodoDelPrograma';

// =========================================================================
// TIPOS: PLAN, HÁBITOS 7 DÍAS Y OBJETIVOS EN 3 NIVELES
// =========================================================================
/**
 * Se reexporta desde `semanaDelPlan`, que es donde vive el concepto de "los días del plan", en vez
 * de declararse acá otra vez. La dirección de la dependencia es a propósito: ese archivo no importa
 * nada, para que esta pantalla pueda importarlo sin armar un ciclo (ver su cabecera).
 */
export type DayOfWeek = DiaDelPlan;
export type DayMoment = 'mañana' | 'tarde' | 'noche';

export interface PlanHabit {
  id: string;
  title: string;
  icon: string;
  tag: string;
  tagColor: string;
  time: string;
  duration: string;
  moment: DayMoment;
  desc: string;
  days: Record<DayOfWeek, boolean>;
  /** `HH:mm:ss` crudo del backend. `null` = el hábito no vence dentro del día. */
  limitTime: string | null;
  /**
   * Posición del hábito en el catálogo curado del panel admin (`habitos.orden`, V28/V30). Es el
   * orden en que el dueño del producto los acomodó y el que manda en la lista del plan.
   */
  ordenCatalogo: number;
  /**
   * `true` = el hábito todavía no se desbloqueó para este aprendiz (su `dia_inicio` es posterior
   * al día de programa en que está). Se muestra con candado, sin poder marcarlo ni pausarlo.
   */
  locked: boolean;
  /** Día de programa en que se desbloquea. */
  unlockDay: number;
  /** Días que faltan para eso. 0 cuando ya está disponible. */
  daysUntilUnlock: number;
  /** `false` = obligatorio: el interruptor de activar/pausar se muestra bloqueado en ON. */
  isOptional: boolean;
  /** false = el aprendiz no puede sacarlo de su plan; el interruptor queda en ON y bloqueado. */
  isDeactivatable: boolean;
  /**
   * Horario ya guardado que empieza a regir MAÑANA, no hoy. `null` = nada pendiente.
   *
   * Existe porque el backend nunca rechaza un cambio sobre un hábito cuya ventana ya arrancó:
   * lo difiere. Sin este campo la pantalla revertía la hora y el aprendiz leía "no se guardó"
   * cuando en realidad sí se había guardado — el reclamo de "estando en el día no puedo editar
   * mis hábitos".
   */
  cambioProgramado: { time: string; desde: string } | null;
}

export interface WeeklyGoalItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface PlanGoals {
  // Los campos `principal*` se eliminaron: el objetivo de 90 días ya no vive acá sino en el
  // backend (`useRocasMaestras`). Eran datos inventados —"Facturar $30,000 USD en Contratos
  // High-Ticket", 19.500 de 30.000— que se le mostraban igual a todos los aprendices como si
  // fueran su plan, y que al editarse solo cambiaban este estado y se perdían al recargar.
  weeklyTitle: string;
  weeklySubtitle: string;
  weeklyItems: WeeklyGoalItem[];
  dailyTitle: string;
  dailyCompleted: boolean;
}

// =========================================================================
// DATOS ESTÁTICOS INICIALES
// =========================================================================
// `INITIAL_HABITS` se eliminó: eran 5 hábitos inventados (Protocolo 05:00 AM, Hidratación
// Somática, Deep Work 90m, Auditoría 80/20, Cierre Somático) que no existen en el catálogo y
// que se mostraban como si fueran el plan del aprendiz. Peor: el reemplazo por los reales solo
// ocurría con `habitsDelBackend.length > 0`, así que un aprendiz con catálogo vacío se quedaba
// con ellos para siempre. Ahora la pantalla arranca vacía y dibuja esqueleto / error / estado
// vacío según lo que diga `usePlanHabitos` — ver el bloque de estados más abajo.

/**
 * El objetivo semanal y el diario arrancan **vacíos**.
 *
 * Antes venían con datos inventados —"Sprint de Cierre", "Enviar propuesta a Corporación Delta
 * ($8,500 USD)", "Cerrar contrato Grupo Sol", tres de cuatro ya tildados— que se le mostraban
 * igual a **todos** los aprendices como si fueran su plan de la semana. Es el mismo problema que
 * ya se corrigió con `INITIAL_HABITS` y con el objetivo de 90 días: mostrar el plan inventado de
 * nadie es peor que mostrar que todavía no hay plan.
 *
 * Siguen viviendo solo en memoria y se pierden al recargar: sus endpoints existen en el backend
 * (`/api/v1/rocks/weekly` y `/api/v1/rocks`), pero el modelo real —título, obstáculo,
 * contingencia, autoevaluación 1-10, acciones críticas— no coincide con esta lista de tildes, así
 * que conectarlos es un rediseño de la tarjeta, no un cableado. Queda pendiente y documentado.
 */
const INITIAL_GOALS: PlanGoals = {
  weeklyTitle: '',
  weeklySubtitle: '',
  weeklyItems: [],
  dailyTitle: '',
  dailyCompleted: false,
};

/**
 * Eje al que pertenece esta sub-pantalla. Es la de "Diseñar libertad financiera", o sea TRABAJO.
 * Los otros dos ejes del programa (CUERPO, RELACIONES) ya existen en el backend pero todavía no
 * tienen pantalla propia; cuando la tengan, esto pasa a ser un parámetro y no una constante.
 */
const EJE_DE_ESTA_PANTALLA: EjeObjetivo = 'TRABAJO';

const DAY_OPTIONS: DayOfWeek[] = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

/**
 * `INDICE_DE_HOY`, `MOSTRAR_SEMANA_SIGUIENTE` y las fechas ya NO se calculan acá: viven en
 * `features/habits/utils/semanaDelPlan`, porque el mapeo de hábitos necesita exactamente la misma
 * semana para saber sobre qué días cae una pausa (E-145). Dos copias de esta cuenta que se
 * separaran un día pintarían la pausa en la casilla equivocada, sin que ninguna de las dos
 * pareciera rota.
 */

/**
 * Día del mes de cada pestaña (`07`, `08`…). Antes eran del 14 al 20 escritas a mano: la pantalla
 * mostraba días que no correspondían a la fecha actual.
 */
const DAY_DATES: Record<DayOfWeek, string> = diasDelMesDeLaSemana();

/**
 * Último índice de la semana mostrada que YA NO se puede planificar (hoy y todo lo anterior).
 * En la semana siguiente no hay ninguno: ni siquiera su lunes llegó todavía, así que vale -1 y
 * los 7 días quedan abiertos.
 */
const ULTIMO_INDICE_NO_PLANIFICABLE = MOSTRAR_SEMANA_SIGUIENTE ? -1 : INDICE_DE_HOY;


/** Para escribir "Solo el lunes" en vez de "Solo hoy" — ver `opcionesDePausa`. */
const NOMBRE_LARGO_DEL_DIA: Record<DayOfWeek, string> = {
  LUN: 'lunes', MAR: 'martes', 'MIÉ': 'miércoles', JUE: 'jueves',
  VIE: 'viernes', 'SÁB': 'sábado', DOM: 'domingo',
};

/**
 * Las opciones de "¿hasta cuándo lo pauso?", **relativas al día que la persona está mirando**, no
 * al día de hoy.
 *
 * > **Corregido 2026-09-06 (E-146).** Antes la primera opción decía "Solo hoy" y mandaba la fecha
 * > del dispositivo. Estaba mal por lo que esta pantalla ES: acá no se registra el día que uno
 * > está viviendo, se PLANIFICA hacia adelante — hoy y todo lo anterior no son editables
 * > (`ULTIMO_INDICE_NO_PLANIFICABLE`). Así que "hoy" nunca es un día que se pueda tocar, y la
 * > opción mandaba una fecha que no correspondía a ninguna de las pestañas.
 * >
 * > **El síntoma con el que apareció**, reportado por el dueño: un **domingo**, la semana que se
 * > dibuja es la siguiente (E-137), del lunes 7 al domingo 13. "Solo hoy" mandaba el **6**, que no
 * > está en esa semana: el backend guardaba la pausa y la pantalla no apagaba ningún día, porque
 * > ninguno caía dentro del plazo. "Hasta que yo lo reactive" sí funcionaba — no lleva fecha.
 * >
 * > Ahora la opción se llama por el día elegido ("Solo el lunes", "Solo el martes") y manda **la
 * > fecha real de esa pestaña**, que es lo que la persona está mirando cuando decide.
 *
 * **POR QUÉ DICE "Hasta el lunes" Y NO "Solo el lunes".** Es la etiqueta que el dueño pidió, y se
 * cambió al verificarla: sería mentira. La pausa que el backend sabe guardar es un **rango que
 * arranca cuando tocás el botón** — `desbloqueos_habito.pausado_en` es `clock.now()` y
 * `estaPausadoEl` solo compara contra el extremo de arriba (`fecha <= pausadoHasta`). No hay forma
 * de expresar "salteá ESE día y ninguno más". Comprobado: elegir el martes con la etiqueta vieja
 * apagaba **lunes y martes**, porque el lunes también cae dentro de "desde ahora hasta el martes".
 *
 * Pausar un solo día suelto a mitad de semana **no se puede hoy**, y arreglarlo no es de esta
 * pantalla: haría falta que el backend acepte un `pausadoDesde` además del `pausadoHasta`. Queda
 * planteado, sin tocar.
 *
 * Las fechas salen del dispositivo, que es la zona en la que la persona piensa cuando dice "hasta
 * el domingo"; el backend las compara contra el calendario del aprendiz, nunca contra el reloj del
 * servidor.
 */
function opcionesDePausa(diaElegido: DayOfWeek): { etiqueta: string; hasta?: string }[] {
  const fechas = fechasIsoDeLaSemana();
  const opciones: { etiqueta: string; hasta?: string }[] = [
    { etiqueta: `Hasta el ${NOMBRE_LARGO_DEL_DIA[diaElegido]}`, hasta: fechas[diaElegido] },
  ];
  // "Hasta el domingo" solo si el día elegido no ES el domingo: ahí las dos opciones harían
  // exactamente lo mismo y tener dos botones idénticos confunde.
  if (diaElegido !== 'DOM') {
    opciones.push({ etiqueta: 'Hasta el domingo', hasta: fechas.DOM });
  }
  // Sin fecha: el comportamiento de siempre. Va último a propósito — es el que deja el hábito
  // apagado indefinidamente, y en un programa de 90 días conviene que sea la opción deliberada.
  opciones.push({ etiqueta: 'Hasta que yo lo reactive' });
  return opciones;
}

/**
 * Las cuatro categorías reales (`renaser.categorias_habito`) con la etiqueta y el icono que la
 * tarjeta va a mostrar de verdad — los mismos que `habitsMappers.CATEGORIA` aplica al leer el
 * catálogo, para que lo que se elige al crear sea exactamente lo que después se ve.
 *
 * > **Corregido 2026-09-06 (E-137).** Antes acá había un `ICON_PALETTE` de 12 emojis sueltos y el
 * > formulario dejaba elegir uno. El backend no tiene dónde guardarlo (`CreatePersonalHabitRequest`
 * > no lleva icono; `mapearPlanHabit` lo deriva de la CATEGORÍA), así que el emoji elegido se
 * > perdía en la primera recarga. La categoría, en cambio, es obligatoria del lado del servidor y
 * > nunca se pedía.
 */
const CATEGORIAS_HABITO: { valor: CategoriaHabitoApi; etiqueta: string; icono: string }[] = [
  { valor: 'BODY', etiqueta: 'Cuerpo', icono: '💪' },
  { valor: 'MIND', etiqueta: 'Mente', icono: '🧘' },
  { valor: 'SPIRIT', etiqueta: 'Espíritu', icono: '✨' },
  { valor: 'CONSCIENCE', etiqueta: 'Emociones', icono: '❤️' },
];

/**
 * `"06:30 AM"` / `"6:30 pm"` / `"18:30"` → `"18:30"` (24 h). `null` si no se entiende.
 *
 * El campo de hora del formulario es texto libre y su valor por defecto venía en formato 12 h con
 * sufijo, que el backend no acepta (`triggerTime` viaja como `HH:mm:ss`). Sin esta traducción el
 * alta se caía con un 400 de formato — y con el alta rota de antes (E-137) nunca se había notado.
 */
function aHora24(texto: string): string | null {
  const limpio = texto.trim().toUpperCase();
  const partes = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/.exec(limpio);
  if (!partes) return null;
  let hora = Number(partes[1]);
  const minuto = Number(partes[2]);
  const sufijo = partes[3];
  if (minuto > 59) return null;
  if (sufijo) {
    if (hora < 1 || hora > 12) return null;
    hora = (hora % 12) + (sufijo === 'PM' ? 12 : 0);
  } else if (hora > 23) {
    return null;
  }
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

const FASES = [
  { d: 'DÍAS 1–30', n: 'FUNDACIÓN' },
  { d: 'DÍAS 31–60', n: 'ACELERACIÓN' },
  { d: 'DÍAS 61–90', n: 'EXPANSIÓN' },
];

/**
 * `HH:mm` de ahora, en la zona horaria del dispositivo.
 *
 * Debería ser la zona del aprendiz (`participantes_programa.timezone`, ej. `America/Lima`), no la
 * del servidor — eso lo pide el encargo explícitamente. Pero **ningún endpoint la expone hoy**
 * (verificado con `curl` contra `/api/v1/users/me`, `/api/v1/users/me/trainee-profile` y
 * `/api/v1/onboarding/activate-program`: ninguno trae `timezone`). Se usa la zona del propio
 * teléfono como aproximación: el aprendiz completa sus hábitos desde su celular, así que salvo
 * que tenga mal configurada la hora del equipo, coincide con su zona real — a diferencia de la
 * hora del servidor, que sí podía estar en otro huso. Ver `## Falta en el backend` en el informe.
 */
function horaActualHHmm(): string {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
}

/**
 * Un hábito "venció" hoy cuando tiene hora límite (`limitTime`) y esa hora ya pasó. La mayoría de
 * los hábitos NO tiene hora límite (`limitTime: null`) — esos no vencen nunca dentro del día,
 * aunque su hora de disparo ya haya pasado: la hora de disparo es solo un recordatorio, no un
 * cierre. Fuera del día de hoy (ayer ya está bloqueado por el selector de días; mañana todavía no
 * llega) el vencimiento no aplica — por eso pide `esHoy`.
 */
function habitoVencidoHoy(habit: PlanHabit, esHoy: boolean, nowHHmm: string): boolean {
  if (!esHoy || !habit.limitTime) return false;
  return nowHHmm > habit.limitTime.slice(0, 5);
}

/**
 * Texto del aviso "esto ya está guardado, pero empieza a regir tal día". Se arma acá y no en el
 * JSX para que la tarjeta se lea de un vistazo, y devuelve algo útil incluso si el backend no
 * mandó la fecha: el dato que de verdad importa es la hora nueva.
 */
function textoCambioProgramado(cambio: { time: string; desde: string }): string {
  const cuando = cambio.desde ? formatearFechaLarga(cambio.desde) : 'mañana';
  return `Desde el ${cuando}: ${cambio.time}`;
}

export default function PlanScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet, horizontalPadding } = useResponsive();
  const gaugeW = rs(228);
  const gaugeH = rs(120);

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN
  // =========================================================================
  const [activeSubView, setActiveSubView] = useState<'main' | 'habitos' | 'objetivos'>('main');

  // Estados de Hábitos
  // D-98: arranca en el primer día planificable, que es MAÑANA (hoy está bloqueado). Quien abre
  // Plan un miércoles cae en el jueves, no en el lunes. Un domingo, ese "mañana" es el lunes de
  // la semana siguiente, que es la que se dibuja (ver `MOSTRAR_SEMANA_SIGUIENTE`, E-137).
  const indiceInicial = ULTIMO_INDICE_NO_PLANIFICABLE + 1;
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(DAY_OPTIONS[indiceInicial]);
  // Los hábitos vienen del backend (catálogo + horario propio del aprendiz). "Todavía no
  // respondió" y "respondió con cero hábitos" NO son lo mismo: lo primero es un esqueleto, lo
  // segundo es un estado legítimo (día 0, plan sin generar) que hay que mostrar tal cual. Por eso
  // se mira `loading`/`error` y no `length > 0` — mismo criterio que ya usa `TrainingScreen`.
  const {
    habits: habitsDelBackend,
    loading: cargandoHabitos,
    error: errorHabitos,
    recargar: recargarHabitos,
  } = usePlanHabitos();
  // Dia real del programa: antes el 37, el arco y la fase estaban escritos a mano.
  const { diaPrograma, loading: cargandoDiaPrograma } = useProgramaDia();
  const medidor = puntoDelMedidor(diaPrograma);
  // D-84: el dia 0 no es "un plan vacio", es "el programa todavia no arranco". Se consulta
  // el porque solo en ese caso — quien ya esta en el dia 5 no paga la llamada.
  //
  // D-90: y solo cuando el dia YA SE SABE. `useProgramaDia` arranca en 0 mientras `/api/v1/home`
  // viaja, asi que sin `!cargandoDiaPrograma` esta consulta salia siempre en el primer render y
  // el aprendiz veia parpadear el cartel de "todavia no arrancaste" antes de su propio plan.
  const arranque = useArranqueDelPrograma(!cargandoDiaPrograma && diaPrograma === 0);
  const programaSinArrancar = arranque.estado === 'PENDIENTE_ELEGIR' || arranque.estado === 'ESPERANDO_INICIO';
  const [habits, setHabits] = useState<PlanHabit[]>([]);
  const conectadoAlBackend = !cargandoHabitos && !errorHabitos;
  useEffect(() => {
    if (!cargandoHabitos && !errorHabitos) {
      setHabits(habitsDelBackend);
    }
  }, [cargandoHabitos, errorHabitos, habitsDelBackend]);

  // Reloj del "ahora" para el sombreado de hábitos vencidos (§2). Se recalcula solo, sin que el
  // aprendiz tenga que tocar nada: si deja Plan abierto y cruza la hora límite de un hábito, se
  // sombrea y se bloquea sin necesidad de recargar la pantalla.
  const [nowHHmm, setNowHHmm] = useState(horaActualHHmm());
  useEffect(() => {
    const id = setInterval(() => setNowHHmm(horaActualHHmm()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Selector de hora táctil (§1)
  const [horaPickerVisible, setHoraPickerVisible] = useState(false);
  const [habitoParaHora, setHabitoParaHora] = useState<PlanHabit | null>(null);

  // Estados de Objetivos
  const [goals, setGoals] = useState<PlanGoals>(INITIAL_GOALS);

  // Modales
  const [createHabitModalVisible, setCreateHabitModalVisible] = useState(false);
  const [editGoalModalVisible, setEditGoalModalVisible] = useState(false);
  const [editingGoalType, setEditingGoalType] = useState<'principal' | 'semanal' | 'diario'>('principal');

  // Modal para Mover Hábito de Momento (Long Press)
  const [moveMomentModalVisible, setMoveMomentModalVisible] = useState(false);
  const [selectedHabitForMove, setSelectedHabitForMove] = useState<PlanHabit | null>(null);

  // Formulario Crear Hábito. Solo se piden los tres datos que el backend guarda de verdad
  // (`POST /api/v1/habits`): nombre, categoría y hora de disparo. El momento del día lo deriva el
  // servidor de la hora, el icono sale de la categoría y un hábito propio aplica los 7 días
  // (`TipoDia.TODOS`) — ver E-137 y el aviso dentro del modal.
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState<CategoriaHabitoApi>('BODY');
  const [newHabitTime, setNewHabitTime] = useState('06:30');
  const [guardandoNuevoHabito, setGuardandoNuevoHabito] = useState(false);

  // Formulario Editar Objetivos
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalCurrentVal, setEditGoalCurrentVal] = useState('');
  const [editGoalTargetVal, setEditGoalTargetVal] = useState('');
  /** Unidad de la meta (USD, kg, clientes...). El backend la exige junto con los dos números. */
  const [editGoalUnidad, setEditGoalUnidad] = useState('');

  /**
   * El objetivo de 90 días real del aprendiz, traído del backend.
   *
   * Esta sub-pantalla es la de "Diseñar libertad financiera", así que el eje es TRABAJO. Los otros
   * dos ejes (CUERPO, RELACIONES) existen en el backend pero todavía no tienen pantalla propia.
   *
   * Reemplaza a `INITIAL_GOALS.principal*`, que eran datos inventados escritos a mano en este
   * archivo —los mismos para todos los aprendices— y que al editarse solo cambiaban un estado de
   * React que se perdía al recargar. Mismo problema, y misma corrección, que la que ya se hizo con
   * `INITIAL_HABITS`.
   */
  const objetivos = useRocasMaestras();
  const rocaDeTrabajo = objetivos.deEje(EJE_DE_ESTA_PANTALLA);

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
    if (moveMomentModalVisible) {
      setMoveMomentModalVisible(false);
      return true;
    }
    if (createHabitModalVisible) {
      setCreateHabitModalVisible(false);
      return true;
    }
    if (editGoalModalVisible) {
      setEditGoalModalVisible(false);
      return true;
    }
    if (activeSubView !== 'main') {
      setActiveSubView('main');
      return true;
    }
    return false;
  }, activeSubView !== 'main' || createHabitModalVisible || editGoalModalVisible || moveMomentModalVisible);

  // =========================================================================
  // HANDLERS
  // =========================================================================
  /**
   * D-87: ahora PERSISTE. Antes esto era solo `setHabits(...)` — estado local de React: apagabas
   * un hábito, cerrabas la app, y volvía encendido. La causa de fondo era que no existía un flag
   * "activo para MÍ": `habitos.activo` es del catálogo compartido y solo lo escribe el panel
   * admin, así que este botón no tenía ningún endpoint propio al que llamar.
   *
   * Optimista y con vuelta atrás: se ve al toque, y si el backend rechaza (por ejemplo un hábito
   * obligatorio, que no se puede pausar) se revierte y se dice por qué.
   */
  /**
   * Al PAUSAR se pregunta hasta cuándo (V31). Al REACTIVAR no se pregunta nada: volver a encender
   * es siempre un toque.
   *
   * Es la separación que evita que esta función choque con el interruptor, que era el riesgo que
   * planteó el dueño del producto: el switch sigue diciendo una sola cosa —está encendido o
   * apagado— y la fecha solo agrega "hasta cuándo" al apagarlo.
   */
  const toggleHabitDayStatus = (habitId: string) => {
    const habito = habits.find(h => h.id === habitId);
    if (!habito) return;
    const vaAPausar = habito.days[selectedDay];
    if (!vaAPausar) {
      void aplicarEstadoHabito(habito, true);
      return;
    }
    if (!habito.isDeactivatable) {
      Alert.alert('Hábito obligatorio', 'Este hábito es parte del programa y no se puede pausar.');
      return;
    }
    const opciones = opcionesDePausa(selectedDay);
    Alert.alert(
      `Pausar "${habito.title}"`,
      '¿Hasta cuándo lo pausamos? Vuelve solo cuando termine el plazo.',
      [
        ...opciones.map(o => ({ text: o.etiqueta, onPress: () => void aplicarEstadoHabito(habito, false, o.hasta) })),
        { text: 'Cancelar', style: 'cancel' as const },
      ],
    );
  };

  const aplicarEstadoHabito = async (habito: PlanHabit, activo: boolean, pausadoHasta?: string) => {
    const habitId = habito.id;
    const anteriores = habits;
    const nuevoValor = activo;
    setHabits(prev =>
      prev.map(h => (h.id === habitId ? { ...h, days: { ...h.days, [selectedDay]: nuevoValor } } : h))
    );
    if (!conectadoAlBackend) return;
    try {
      // D-99: el PATCH del interruptor exige que el habito YA este en el plan del aprendiz
      // (`desbloqueos_habito`), y esa tabla arranca vacia para todo el mundo — la generacion
      // diaria no la necesita (D-87: sin fila, el habito se genera igual). Resultado: el boton
      // devolvia 404 "Este habito no esta en tu plan" en TODOS los habitos de una cuenta nueva
      // y la pantalla revertia con "Intenta de nuevo". Se asegura la fila primero con el PUT
      // (idempotente: si ya existe no hace nada) y recien despues se cambia el estado.
      await habitsApi.agregarHabitoAlPlan(habitId);
      await habitsApi.cambiarEstadoHabito(habitId, nuevoValor, pausadoHasta);
    } catch {
      setHabits(anteriores);
      Alert.alert(
        'No pudimos guardar el cambio',
        habito.isDeactivatable
          ? 'Intenta de nuevo en unos segundos.'
          : 'Este hábito es obligatorio del programa y no se puede pausar.',
      );
    }
  };

  /**
   * Cambia la hora Y recalcula el bloque del día (`moment`) a partir de esa hora, con
   * `aMomento` — la misma función que ya usa el mapeo inicial del backend (§ bug reportado:
   * antes esto dejaba `moment` intacto y el hábito se quedaba en la sección vieja aunque su
   * hora ahora fuera de otro bloque).
   */
  const updateHabitTime = (habitId: string, newTime: string) => {
    setHabits(prev =>
      prev.map(h => (h.id === habitId ? { ...h, time: newTime, moment: aMomento(newTime) } : h))
    );
  };

  const abrirSelectorDeHora = (habit: PlanHabit) => {
    setHabitoParaHora(habit);
    setHoraPickerVisible(true);
  };

  /**
   * Guarda la nueva hora de disparo. Optimista en pantalla (se ve al toque); si el hábito viene
   * del backend real se persiste con `PATCH /habit-preferences/{id}`, preservando `limitTime` tal
   * cual estaba — cambiar la hora de disparo no debe borrar la hora límite del hábito. Los
   * hábitos de relleno (`INITIAL_HABITS`, mientras el backend no respondió) no existen del otro
   * lado, así que ahí el cambio queda solo local.
   */
  const guardarNuevaHora = async (habitId: string, nuevaHora: string) => {
    setHoraPickerVisible(false);
    const anteriores = habits;
    const habito = habits.find(h => h.id === habitId);
    updateHabitTime(habitId, nuevaHora);
    if (!conectadoAlBackend || !habito) return;
    try {
      const resultado = await habitsApi.cambiarHorario(habitId, `${nuevaHora}:00`, habito.limitTime);
      // D-91: el backend YA NO aplica ningún cambio en el día en curso — todos se difieren a
      // mañana, arranque o no arranque la ventana del hábito. `deferred` es hoy siempre true;
      // la rama de abajo se deja igual porque el contrato del campo no cambió y no queremos
      // depender de que siempre lo sea.
      //
      // D-90: antes acá se hacía `setHabits(anteriores)`. Revertir era correcto en un sentido
      // (la hora de HOY no cambió, mostrarla cambiada sería mentir) y desastroso en otro: el
      // aprendiz veía la hora volver sola al valor viejo y concluía que estando en el día no
      // podía editar sus hábitos — cuando el cambio SÍ había quedado guardado. Ahora la hora de
      // hoy se restaura pero el hábito queda marcado con su cambio programado, que la tarjeta
      // pinta como "desde mañana 09:00". Editar deja rastro visible en vez de parecer un no-op.
      if (resultado.deferred) {
        const desde = resultado.deferredEffectiveDate;
        setHabits(prev =>
          prev.map(h =>
            h.id === habitId
              ? {
                  ...h,
                  time: habito.time,
                  moment: habito.moment,
                  cambioProgramado: { time: nuevaHora, desde: desde ?? '' },
                }
              : h,
          ),
        );
        Alert.alert(
          'Guardado, se aplica desde mañana',
          `El día en curso no se reacomoda: lo que planificaste para hoy se respeta hasta la medianoche. Desde el ${
            desde ? formatearFechaLarga(desde) : 'día siguiente'
          } este hábito va a ser a las ${nuevaHora}. Lo vas a ver anotado en la tarjeta.`,
        );
        return;
      }
      // Cambio inmediato: si había uno programado de antes, el backend lo borró
      // (`saveCambioPendientePort.borrar`), así que la tarjeta no debe seguir anunciándolo.
      setHabits(prev => prev.map(h => (h.id === habitId ? { ...h, cambioProgramado: null } : h)));
    } catch {
      setHabits(anteriores);
      Alert.alert('No pudimos guardar el horario', 'Intenta de nuevo en unos segundos.');
    }
  };

  const openMoveMomentDrawer = (habit: PlanHabit) => {
    setSelectedHabitForMove(habit);
    setMoveMomentModalVisible(true);
  };

  const applyMomentChange = (targetMoment: DayMoment) => {
    if (!selectedHabitForMove) return;
    setHabits(prev =>
      prev.map(h => (h.id === selectedHabitForMove.id ? { ...h, moment: targetMoment } : h))
    );
    setMoveMomentModalVisible(false);
    setSelectedHabitForMove(null);
  };

  /**
   * Da de alta el hábito propio contra `POST /api/v1/habits` y lo agrega al plan con la forma que
   * devolvió el servidor.
   *
   * > **Corregido 2026-09-06 (E-137).** Esto NO llamaba al backend. Construía un `PlanHabit` en
   * > memoria con un id inventado (`habit_<timestamp>`), lo empujaba al estado de React y avisaba
   * > "¡Hábito Creado! 🦅". El hábito no existía en ninguna parte: se perdía al recargar, y en
   * > cuanto el aprendiz tocaba su interruptor el id falso viajaba al servidor, que respondía
   * > `400 "El valor de 'habitId' no tiene el formato esperado"` (visto en producción el
   * > 2026-09-06). Además nacía con `SÁB`/`DOM` en `false`, así que a quien lo creaba un domingo
   * > le aparecía en `PAUSADO` recién nacido — el segundo síntoma que reportó el dueño.
   *
   * La tarjeta se arma con `mapearPlanHabit` sobre la respuesta real, no a mano: así el icono, la
   * categoría, los días y el momento del día son exactamente los que va a devolver la próxima
   * lectura del catálogo, y no hay dos verdades conviviendo en la pantalla.
   */
  const handleSaveNewHabit = async () => {
    const titulo = newHabitTitle.trim();
    if (!titulo) {
      Alert.alert('Campo requerido', 'Por favor ingresa un nombre para tu hábito.');
      return;
    }
    const hora = aHora24(newHabitTime);
    if (!hora) {
      Alert.alert('Hora inválida', 'Escribe la hora como 06:30 (o 06:30 AM). No pudimos entenderla.');
      return;
    }

    setGuardandoNuevoHabito(true);
    try {
      const creado = await habitsApi.crearHabitoPersonal({
        title: titulo,
        habitType: 'CHECKBOX',
        category: newHabitCategory,
        template: 'OTRO',
        goalLabel: null,
        triggerTime: `${hora}:00`,
        // Un hábito propio no vence dentro del día: la hora es un recordatorio, no un cierre.
        limitTime: null,
      });
      // Los personales van DETRÁS del catálogo: el orden curado (`habitos.orden`) solo cubre los
      // de sistema, y un hábito propio recién creado no tiene lugar asignado en esa secuencia.
      const nuevo = mapearPlanHabit(
        creado,
        { habitId: creado.id, title: creado.title, triggerTime: `${hora}:00`, limitTime: null,
          customized: true, pendingChange: null },
        Number.MAX_SAFE_INTEGER,
      );
      setHabits(prev => [...prev, nuevo]);
      setNewHabitTitle('');
      setCreateHabitModalVisible(false);
      Alert.alert('¡Hábito Creado! 🦅', 'Se ha programado correctamente en tu plan semanal.');
    } catch (e) {
      // Nunca más un "creado" que no se creó: si el servidor lo rechaza, se dice y el modal queda
      // abierto con lo que el aprendiz escribió.
      Alert.alert('No pudimos crear el hábito', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setGuardandoNuevoHabito(false);
    }
  };

  const toggleWeeklyItem = (itemId: string) => {
    setGoals(prev => ({
      ...prev,
      weeklyItems: prev.weeklyItems.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    }));
  };

  const toggleDailyGoal = () => {
    setGoals(prev => ({ ...prev, dailyCompleted: !prev.dailyCompleted }));
  };

  const openEditGoalModal = (type: 'principal' | 'semanal' | 'diario') => {
    setEditingGoalType(type);
    if (type === 'principal') {
      // Prellena con lo que hay guardado. Si el aprendiz todavía no definió su objetivo, los
      // campos arrancan vacíos: es su primera vez, no hay nada que corregir.
      setEditGoalTitle(rocaDeTrabajo?.objetivo ?? '');
      setEditGoalCurrentVal(rocaDeTrabajo?.avance != null ? String(rocaDeTrabajo.avance) : '');
      setEditGoalTargetVal(rocaDeTrabajo?.meta != null ? String(rocaDeTrabajo.meta) : '');
      setEditGoalUnidad(rocaDeTrabajo?.unidad ?? '');
    } else if (type === 'semanal') {
      setEditGoalTitle(goals.weeklyTitle);
    } else {
      setEditGoalTitle(goals.dailyTitle);
    }
    setEditGoalModalVisible(true);
  };

  /**
   * Guarda el objetivo de 90 días contra el backend (`PUT /api/v1/rocks/master/{eje}`).
   *
   * La parte medible es opcional pero va entera: si la persona escribió una meta, se le exigen
   * también el avance y la unidad, porque el backend rechaza media meta con un 400 y es mejor
   * decírselo acá, en su idioma, que dejar que rebote el servidor. Si no escribió ninguna de las
   * tres, se guarda un objetivo cualitativo, que es perfectamente válido.
   */
  const guardarObjetivoPrincipal = async () => {
    const meta = editGoalTargetVal.trim() === '' ? undefined : Number(editGoalTargetVal);
    const avance = editGoalCurrentVal.trim() === '' ? undefined : Number(editGoalCurrentVal);
    const unidad = editGoalUnidad.trim() === '' ? undefined : editGoalUnidad.trim();
    const algunNumero = meta !== undefined || avance !== undefined || unidad !== undefined;

    if (algunNumero) {
      if (meta === undefined || avance === undefined || unidad === undefined) {
        Alert.alert(
          'Falta un dato de la meta',
          'Para medir tu objetivo hacen falta las tres cosas: cuánto llevas, cuánto querés llegar y en qué se mide (USD, kg, clientes...). Si no querés medirlo con un número, dejá los tres campos vacíos.'
        );
        return;
      }
      if (!Number.isFinite(meta) || !Number.isFinite(avance)) {
        Alert.alert('Número inválido', 'Revisá los valores: tienen que ser números.');
        return;
      }
      if (meta <= 0) {
        Alert.alert('Meta inválida', 'La meta tiene que ser mayor que cero.');
        return;
      }
      if (avance < 0) {
        Alert.alert('Avance inválido', 'El avance no puede ser negativo.');
        return;
      }
    }

    const resultado = await objetivos.definir(EJE_DE_ESTA_PANTALLA, {
      objetivo: editGoalTitle.trim(),
      meta,
      avance,
      unidad,
    });
    if (!resultado.ok) {
      Alert.alert('No se pudo guardar', resultado.mensaje);
      return;
    }
    setEditGoalModalVisible(false);
    Alert.alert('¡Objetivo actualizado! 🎯', 'Tu objetivo de 90 días quedó guardado.');
  };

  const handleSaveGoal = () => {
    if (!editGoalTitle.trim()) {
      Alert.alert('Campo requerido', 'Por favor escribe la declaración de tu objetivo.');
      return;
    }

    if (editingGoalType === 'principal') {
      void guardarObjetivoPrincipal();
      return;
    }
    if (editingGoalType === 'semanal') {
      setGoals(prev => ({ ...prev, weeklyTitle: editGoalTitle.trim() }));
    } else {
      setGoals(prev => ({ ...prev, dailyTitle: editGoalTitle.trim() }));
    }

    setEditGoalModalVisible(false);
    Alert.alert('¡Objetivo Actualizado! 🎯', 'Los cambios han sido guardados en tu plan.');
  };

  // `principalPercent` se eliminó: el porcentaje ahora lo calcula el backend y viaja en la
  // respuesta, para que no haya dos versiones de la misma regla (incluido el tope al 100 %).

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="PLAN" right="dots" />

      {/* ========================================================================= */}
      {/* VISTA 1: PANTALLA PRINCIPAL DE PLAN (DISEÑO ORIGINAL DE LUJO CON GAUGE)   */}
      {/* ========================================================================= */}
      {activeSubView === 'main' && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', paddingTop: 14 }}>
            <Text style={[t.sectionTitle, { color: c.text }]}>TU MAPA DE LOS PRÓXIMOS 90 DÍAS</Text>
            <Text style={[t.sectionSub, { color: c.micro, marginTop: 6 }]}>Enfocado. Estratégico. Real.</Text>
          </View>

          {/* GAUGE DE 90 DÍAS */}
          <View style={[styles.gauge, { height: gaugeH + 8 }]}>
            <Svg width={gaugeW} height={gaugeH} viewBox="0 0 228 120">
              <Path d="M14 108a100 100 0 0 1 200 0" stroke={c.divider} strokeWidth={5} strokeLinecap="round" fill="none" />
              <Path d={medidor.path} stroke={c.chevron} strokeWidth={5} strokeLinecap="round" fill="none" />
              <Circle cx={medidor.x} cy={medidor.y} r={6} fill={c.gold} />
            </Svg>
            <View style={styles.gaugeCenter}>
              <Text style={[t.micro, { color: c.micro }]}>DÍA</Text>
              <Text style={{ fontFamily: 'Jost_300Light', fontSize: 40, color: c.textStrong }}>{diaPrograma}</Text>
              <Text style={[t.small, { color: c.micro }]}>DE {DIAS_DEL_PROGRAMA}</Text>
            </View>
            <Text style={[t.small, styles.gaugeLeft, { color: c.textSoft }]}>01</Text>
            <Text style={[t.small, styles.gaugeRight, { color: c.textSoft }]}>90</Text>
          </View>

          {/* FASE ACTUAL */}
          <View style={[styles.section, { borderTopColor: c.divider }]}>
            <MicroLabel>FASE ACTUAL</MicroLabel>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 10 }}>
              <Text style={[t.small, { color: c.gold }]}>01</Text>
              <Text style={[t.cardTitle, { color: c.text, flex: 1 }]}>Fundamentación</Text>
              <Text style={[t.small, { color: c.micro }]}>Días 1–30</Text>
            </View>
          </View>

          {/* PRIORIDADES CLAVE (INTERACTIVAS) */}
          <View style={[styles.section, { borderTopColor: c.divider }]}>
            <MicroLabel>PRIORIDADES CLAVE</MicroLabel>
            <View style={{ marginTop: 8, gap: 8 }}>
              {/* 01. Convertirme en mi mejor versión -> HÁBITOS 7D */}
              <Pressable
                onPress={() => setActiveSubView('habitos')}
                style={[styles.priorityCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <Text style={[t.small, { color: c.gold }]}>01</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>
                    Convertirme en mi mejor versión
                  </Text>
                  <Text style={[t.micro, { color: c.gold, fontSize: 9.5, marginTop: 2 }]}>
                    Gestión y Horario de Hábitos (7 Días) ›
                  </Text>
                </View>
                <Icon name="chevron" size={12} color={c.gold} />
              </Pressable>

              {/* 02. Diseñar libertad financiera -> OBJETIVOS 3 NIVELES */}
              <Pressable
                onPress={() => setActiveSubView('objetivos')}
                style={[styles.priorityCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <Text style={[t.small, { color: c.gold }]}>02</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>
                    Diseñar libertad financiera
                  </Text>
                  <Text style={[t.micro, { color: '#70d2a0', fontSize: 9.5, marginTop: 2 }]}>
                    Objetivo Principal (90D), Semanal y Diario ›
                  </Text>
                </View>
                <Icon name="chevron" size={12} color={c.gold} />
              </Pressable>

              {/* 03. Impactar y servir a más personas */}
              <Pressable
                onPress={() => Alert.alert('Propósito y Servicio', 'Módulo de Liderazgo y Expansión en construcción (Próximamente).')}
                style={[styles.priorityCard, { borderColor: c.border, backgroundColor: c.cardBg, opacity: 0.8 }]}
              >
                <Text style={[t.small, { color: c.textSoft }]}>03</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>
                    Impactar y servir a más personas
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5, marginTop: 2 }]}>
                    Legado y Red de Tribu ›
                  </Text>
                </View>
                <Icon name="chevron" size={12} color={c.textSoft} />
              </Pressable>
            </View>
          </View>

          {/* ARQUITECTURA DE TIEMPO */}
          <View style={[styles.section, { borderTopColor: c.divider, flex: 1, justifyContent: 'flex-end', paddingBottom: 24 }]}>
            <MicroLabel>ARQUITECTURA DE TIEMPO</MicroLabel>
            <Svg width="100%" height={74} viewBox="0 0 300 74" style={{ marginVertical: 10 }}>
              <Path d="M6 62 L64 50 L122 54 L180 34 L238 32 L294 8" stroke={c.gold} strokeWidth={1.6} strokeLinecap="round" fill="none" />
              {[[6, 62], [64, 50], [122, 54], [180, 34], [238, 32], [294, 8]].map(([x, y]) => (
                <Circle key={x} cx={x} cy={y} r={3.4} fill={c.gold} />
              ))}
            </Svg>
            <View style={{ flexDirection: 'row' }}>
              {FASES.map((p, i) => (
                <View key={p.n} style={{ flex: 1, alignItems: i === 0 ? 'flex-start' : i === 1 ? 'center' : 'flex-end' }}>
                  <Text style={[t.micro, { color: c.micro }]}>{p.d}</Text>
                  <Text style={[t.micro, { color: c.textSoft, marginTop: 4 }]}>{p.n}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: SUB-PANTALLA: HÁBITOS 7 DÍAS (DENTRO DE PRIORIDAD 01)            */}
      {/* ========================================================================= */}
      {activeSubView === 'habitos' && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveSubView('main')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A PLAN
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                01. HÁBITOS (7 DÍAS)
              </Text>
            </View>
          </View>

          <RowBetween style={{ marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>
                Convertirme en mi mejor versión
              </Text>
            </View>
            <Pressable
              onPress={() => setCreateHabitModalVisible(true)}
              style={[styles.createHabitBtn, { backgroundColor: c.gold }]}
            >
              <Text style={{ color: '#1E1B18', fontWeight: '800', fontSize: 10.5 }}>➕ Crear Hábito</Text>
            </Pressable>
          </RowBetween>

          {/* Selector de Días Semanales (LUN - DOM) */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
            {DAY_OPTIONS.map((d, indice) => {
              const isSelected = selectedDay === d;
              // Los días ya pasados no se pueden planificar: organizar hábitos de un día que ya
              // terminó no tiene efecto sobre nada. Quedan visibles pero apagados y sin responder
              // al toque, para que la semana se siga leyendo completa.
              //
              // D-98: HOY también queda apagado. El día en curso no se reacomoda (D-91, el
              // backend difiere todo a mañana), y el dueño pidió que se VEA así — sombreado como
              // los días pasados — en vez de dejar tocar y avisar después. Lo que se planifica es
              // de mañana en adelante. En la semana siguiente (domingo, E-137) no hay ninguno:
              // `ULTIMO_INDICE_NO_PLANIFICABLE` vale -1 y los 7 quedan abiertos.
              const esPasado = indice <= ULTIMO_INDICE_NO_PLANIFICABLE;
              // D-84: con el programa sin arrancar NINGUN dia es planificable, ni los futuros
              // — no hay plan que organizar todavia.
              const bloqueado = esPasado || programaSinArrancar;
              return (
                <Pressable
                  key={d}
                  disabled={bloqueado}
                  onPress={() => setSelectedDay(d)}
                  style={[
                    styles.dayPillBtn,
                    {
                      borderColor: isSelected ? c.gold : c.border,
                      backgroundColor: isSelected ? c.cardBgAlt : c.cardBg,
                      opacity: bloqueado ? 0.35 : 1,
                    },
                  ]}
                >
                  <Text style={[t.micro, { color: isSelected ? c.gold : c.textSoft, fontSize: 8.5, fontWeight: '700' }]}>
                    {d}
                  </Text>
                  <Text style={[t.cardTitle, { color: isSelected ? c.gold : c.textStrong, fontSize: 13, marginTop: 2 }]}>
                    {DAY_DATES[d]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* D-84 — Por qué no se puede planificar todavía. Antes de esto, el día 0 mostraba un
              plan vacío sin una palabra: el aprendiz no tenía forma de saber si estaba roto, si
              le faltaba hacer algo, o si simplemente no había llegado su fecha. */}
          {programaSinArrancar && (
            <View
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.cardBgAlt,
                gap: 8,
              }}
              accessibilityLabel="Tu programa todavía no arrancó"
            >
              <Row gap={8}>
                <Icon name="lock" size={13} color={c.gold} />
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>
                  {arranque.estado === 'PENDIENTE_ELEGIR'
                    ? 'Todavía no elegiste tu Día 1'
                    : 'Tu programa arranca pronto'}
                </Text>
              </Row>
              <Text style={[t.small, { color: c.textSoft, lineHeight: 18 }]}>
                {arranque.estado === 'PENDIENTE_ELEGIR'
                  ? 'Elegí en qué día querés empezar tus 90 días. Hasta entonces no hay plan que organizar.'
                  : `Empezás el ${formatearFechaLarga(arranque.fechaInicio)}. Desde el ${formatearFechaLarga(diaAnterior(arranque.fechaInicio))} vas a poder organizar los hábitos de tu primer día; hasta entonces no hay nada que hacer acá.`}
              </Text>
            </View>
          )}

          {/* LISTA DE HÁBITOS POR MOMENTO DEL DÍA (CON LONG-PRESS PARA MOVER) */}
          {/* D-84: con el programa sin arrancar la lista NO se dibuja. No es un detalle
              estetico: Plan lee el catalogo completo (`GET /api/v1/habits`), no los habitos
              del dia, asi que en dia 0 mostraba los 23 habitos del programa como si
              aplicaran hoy — incluidos los que recien arrancan en el dia 8. El aviso de
              arriba ya explica que pasa; la lista solo agregaba ruido y confusion. */}
          <View style={{ gap: 14, marginTop: 16, paddingBottom: 28, display: programaSinArrancar ? 'none' : 'flex' }}>
            {/* Mientras carga, si falla, o si de verdad no hay hábitos. Antes de esto se
                dibujaban 5 hábitos inventados que no existen en el catálogo. */}
            {cargandoHabitos && (
              <View style={{ gap: 10 }} accessibilityLabel="Cargando tus hábitos">
                {[0, 1, 2, 3].map(i => (
                  <View
                    key={i}
                    style={{
                      height: 76,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: c.cardBg,
                      opacity: 0.45,
                    }}
                  />
                ))}
              </View>
            )}

            {!cargandoHabitos && errorHabitos !== null && (
              <View
                style={{
                  gap: 10,
                  padding: 18,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E06A66',
                  backgroundColor: c.cardBg,
                }}
              >
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]}>
                  No pudimos cargar tus hábitos
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 13.5 }]}>{errorHabitos}</Text>
                <Pressable
                  onPress={() => {
                    void recargarHabitos();
                  }}
                  style={{
                    minHeight: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.gold,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={[t.cardTitle, { color: c.gold, fontSize: 14.5 }]}>Reintentar</Text>
                </Pressable>
              </View>
            )}

            {conectadoAlBackend && habits.length === 0 && (
              <View
                style={{
                  gap: 6,
                  padding: 20,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.cardBg,
                }}
              >
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]}>
                  Tu plan todavía no se generó
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 13.5 }]}>
                  Cuando tu programa arranque vas a ver acá tus hábitos repartidos en mañana, tarde
                  y noche.
                </Text>
              </View>
            )}

            {conectadoAlBackend && habits.length > 0 && (['mañana', 'tarde', 'noche'] as DayMoment[]).map(momentName => {
              // Orden del CATALOGO (`habitos.orden`), no por hora.
              //
              // > **Corregido 2026-09-04.** Esto ordenaba por hora desde D-86, que buscaba que la
              // > seccion no se leyera 22:30, 18:00, 21:00. El dueño del producto pidio despues que
              // > el plan respete el orden que el mismo curo en el panel de checklist, y esa es la
              // > decision que manda. En la practica casi no se pierde la lectura cronologica: el
              // > catalogo ya viene ordenado a mano de forma sensata (NOCHE queda 18:00, 21:00,
              // > 21:30, 22:00, 22:30) y ademas arregla un caso que la hora hacia peor — DESPERTAR
              // > no tiene horario y con el orden por hora caia al FINAL de la mañana.
              const momentHabits = habits
                .filter(h => h.moment === momentName)
                .slice()
                .sort((a, b) => a.ordenCatalogo - b.ordenCatalogo);
              const momentLabel = momentName === 'mañana' ? '🌅 MAÑANA' : momentName === 'tarde' ? '☀️ TARDE' : '🌙 NOCHE';

              return (
                <View key={momentName} style={{ gap: 8 }}>
                  <RowBetween>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1, fontSize: 10.5 }]}>
                      {momentLabel} ({momentHabits.length})
                    </Text>
                  </RowBetween>

                  {momentHabits.map(habit => {
                    const isDayActive = habit.days[selectedDay];
                    // § 2 — solo importa si ya venció HOY: un hábito de mañana o de un día que
                    // todavía no llega no puede estar "vencido". Si lo que se está mirando es la
                    // semana siguiente (domingo, E-137), ninguno de sus días es hoy.
                    const esHoy = !MOSTRAR_SEMANA_SIGUIENTE && selectedDay === DAY_OPTIONS[INDICE_DE_HOY];
                    const vencido = habitoVencidoHoy(habit, esHoy, nowHHmm);
                    // § 3 — obligatorio: el interruptor se ve siempre encendido y bloqueado.
                    const bloqueadoObligatorio = !habit.isDeactivatable;
                    const switchBloqueado = vencido || bloqueadoObligatorio;
                    const switchValor = bloqueadoObligatorio ? true : isDayActive;

                    // Los OPCIONALES se muestran atenuados y sobre un fondo hundido, para que
                    // se distingan de un vistazo de los que sí suman a la coherencia del día. Se
                    // usa `c.canvas` porque es el tono "por detrás de la tarjeta" del sistema de
                    // diseño: queda más oscuro que la tarjeta en modo oscuro y más gris en modo
                    // claro, así el efecto lee igual en los dos temas (a diferencia de un gris
                    // fijo, que en oscuro aclararía en vez de hundir).
                    const esOpcional = habit.isOptional;
                    // El candado manda sobre vencido/pausado/opcional: si el hábito todavía no
                    // existe para este aprendiz, cualquier otro estado es ruido.
                    const bloqueado = habit.locked;

                    let estadoLabel: string;
                    let estadoColor: string;
                    if (bloqueado) {
                      estadoLabel =
                        habit.daysUntilUnlock === 1 ? 'FALTA 1 DÍA' : `FALTAN ${habit.daysUntilUnlock} DÍAS`;
                      estadoColor = c.tabInactive;
                    } else if (vencido) {
                      estadoLabel = 'VENCIDO';
                      estadoColor = c.textSoft;
                    } else if (bloqueadoObligatorio) {
                      estadoLabel = 'OBLIGATORIO';
                      estadoColor = c.gold;
                    } else if (esOpcional && isDayActive) {
                      estadoLabel = 'OPCIONAL';
                      estadoColor = c.textSoft;
                    } else {
                      estadoLabel = isDayActive ? 'ACTIVO' : 'PAUSADO';
                      estadoColor = isDayActive ? '#70d2a0' : c.textSoft;
                    }

                    return (
                      <Pressable
                        key={habit.id}
                        style={[
                          styles.habitPlanCard,
                          {
                            // El opcional activo NO lleva el borde dorado: el dorado marca lo
                            // que de verdad sostiene el día.
                            borderColor: vencido || esOpcional || bloqueado ? c.border : isDayActive ? c.gold : c.border,
                            backgroundColor: esOpcional || bloqueado ? c.canvas : c.cardBg,
                            // Un solo valor, no opacidades encadenadas: vencido y pausado mandan
                            // sobre "opcional" porque dicen algo más urgente sobre el hábito.
                            opacity: bloqueado ? 0.55 : vencido ? 0.5 : !isDayActive ? 0.6 : esOpcional ? 0.78 : 1,
                          },
                        ]}
                      >
                        <RowBetween>
                          <Row gap={10} style={{ flex: 1 }}>
                            <View style={[styles.habitIconBox, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                              <Text style={{ fontSize: 18 }}>{habit.icon}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Row gap={4}>
                                <View style={[styles.tagPill, { borderColor: c.border, backgroundColor: c.cardBgAlt, alignSelf: 'flex-start' }]}>
                                  <Text style={[t.micro, { color: c.gold, fontSize: 8.5, fontWeight: '800' }]}>
                                    {habit.tag}
                                  </Text>
                                </View>
                                {bloqueadoObligatorio ? <Icon name="lock" size={10} color={c.gold} /> : null}
                              </Row>
                              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13, marginTop: 2 }]}>
                                {habit.title}
                              </Text>
                              {/* Horario: selector táctil, ya no texto libre (§1).
                                  D-85: ya NO se bloquea cuando el hábito venció hoy. Que hoy se
                                  haya pasado su hora no impide reprogramarlo — el backend acepta
                                  el cambio y lo aplica mañana (`deferred: true`). Bloquearlo acá
                                  impedía justo lo que uno quiere hacer de noche: acomodar el día
                                  siguiente. El hábito vencido se sigue viendo apagado, pero se
                                  puede tocar. */}
                              <Row gap={6} style={{ marginTop: 3 }}>
                                <Icon name="clock" size={11} color={vencido ? c.textSoft : c.gold} />
                                <Pressable
                                  onPress={() => (bloqueado ? undefined : abrirSelectorDeHora(habit))}
                                  disabled={bloqueado}
                                  style={[
                                    styles.timeInputDirect,
                                    { borderColor: c.border, backgroundColor: c.cardBgAlt },
                                  ]}
                                >
                                  <Text
                                    style={{
                                      color: vencido ? c.textSoft : c.gold,
                                      fontSize: 11,
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    {habit.time || 'Sin horario'}
                                  </Text>
                                </Pressable>
                                {habit.duration ? (
                                  <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>({habit.duration})</Text>
                                ) : null}
                                <View style={[styles.momentBadgePill, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                                  <Text style={[t.micro, { color: c.textSoft, fontSize: 9 }]}>{momentLabel}</Text>
                                </View>
                              </Row>

                              {/* D-90: el horario que YA se guardó pero todavía no rige. Sin esto,
                                  cambiar la hora de un hábito que hoy ya arrancó se veía como si
                                  no hubiera pasado nada — la hora volvía sola al valor viejo y el
                                  aprendiz concluía que no podía editar. `flexWrap` porque el
                                  texto crece con el nombre del día (AGENTS.md §2). */}
                              {habit.cambioProgramado ? (
                                <View
                                  style={[
                                    styles.cambioProgramadoPill,
                                    { borderColor: c.gold, backgroundColor: c.cardBgAlt },
                                  ]}
                                >
                                  <Icon name="clock" size={9} color={c.gold} />
                                  <Text style={[t.micro, { color: c.gold, fontSize: 9.5, flexShrink: 1 }]}>
                                    {textoCambioProgramado(habit.cambioProgramado)}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </Row>

                          {/* Switch Activar/Pausar para el día — o el candado si todavía no le toca */}
                          <View style={{ alignItems: 'center', gap: 2 }} onStartShouldSetResponder={() => true}>
                            <Text style={[t.micro, { color: estadoColor, fontSize: 8.5, fontWeight: '800' }]}>
                              {estadoLabel}
                            </Text>
                            {bloqueado ? (
                              // Candado en lugar del interruptor, y no un Switch deshabilitado: un
                              // switch apagado se lee como "yo lo pausé", que es otra cosa. Acá el
                              // hábito todavía no existe para este aprendiz.
                              <Pressable
                                onPress={() =>
                                  Alert.alert(
                                    habit.title,
                                    `Se desbloquea el día ${habit.unlockDay} de tu programa. ` +
                                      (habit.daysUntilUnlock === 1
                                        ? 'Falta 1 día.'
                                        : `Faltan ${habit.daysUntilUnlock} días.`),
                                  )
                                }
                                hitSlop={10}
                                style={{ paddingVertical: 6, paddingHorizontal: 4 }}
                              >
                                <Icon name="lock" size={16} color={c.tabInactive} />
                              </Pressable>
                            ) : (
                              <Switch
                                value={switchValor}
                                disabled={switchBloqueado}
                                onValueChange={() => toggleHabitDayStatus(habit.id)}
                                trackColor={{ false: '#332C20', true: c.gold }}
                                thumbColor={switchValor ? '#1E1B18' : '#888'}
                              />
                            )}
                          </View>
                        </RowBetween>

                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: SUB-PANTALLA: OBJETIVOS 3 NIVELES (DENTRO DE PRIORIDAD 02)       */}
      {/* ========================================================================= */}
      {activeSubView === 'objetivos' && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: isTablet ? 560 : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveSubView('main')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A PLAN
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                02. OBJETIVOS (3 NIVELES)
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>
              Diseñar libertad financiera & Metas
            </Text>
            <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 2 }]}>
              Tu pirámide de metas: 90 Días, Semanal y Diario
            </Text>
          </View>

          <View style={{ gap: 14, marginTop: 14, paddingBottom: 28 }}>
            {/* 1. 👑 OBJETIVO PRINCIPAL (90 DÍAS) */}
            <View style={[styles.goalCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <RowBetween>
                <Row gap={6}>
                  <Text style={{ fontSize: 16 }}>👑</Text>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                    1. OBJETIVO PRINCIPAL (90 DÍAS)
                  </Text>
                </Row>
                <Pressable
                  onPress={() => openEditGoalModal('principal')}
                  style={[styles.editGoalBtn, { borderColor: c.gold, backgroundColor: c.cardBg }]}
                >
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✏️ Editar</Text>
                </Pressable>
              </RowBetween>

              {objetivos.cargando && !rocaDeTrabajo ? (
                <Text style={[t.micro, { color: c.textSoft, marginTop: 8 }]}>Cargando tu objetivo...</Text>
              ) : objetivos.error && !rocaDeTrabajo ? (
                <Text style={[t.micro, { color: '#f28e8e', marginTop: 8 }]}>{objetivos.error}</Text>
              ) : !rocaDeTrabajo ? (
                // Estado vacío real: antes acá se mostraba un objetivo inventado ("Facturar
                // $30.000 USD") que no era de nadie. Es preferible una invitación honesta.
                <Text style={[t.micro, { color: c.textSoft, marginTop: 8, lineHeight: 16 }]}>
                  Todavía no definiste tu objetivo de 90 días. Tocá Editar y escribí a dónde querés
                  llegar. Si se puede medir con un número, agregalo: vas a ver tu avance acá.
                </Text>
              ) : (
                <>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13.5, marginTop: 6 }]}>
                    {rocaDeTrabajo.objetivo}
                  </Text>

                  {/* La barra solo aparece si el objetivo tiene meta medible. Un objetivo
                      cualitativo es válido y no tiene nada que graficar. */}
                  {rocaDeTrabajo.porcentaje != null && (
                    <View style={{ gap: 4, marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>Avance cuantitativo:</Text>
                        <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 11 }]}>
                          {rocaDeTrabajo.porcentaje}% CUMPLIDO
                        </Text>
                      </View>
                      <View style={[styles.progressBarBg, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                        <View style={[styles.progressBarFill, { width: `${rocaDeTrabajo.porcentaje}%`, backgroundColor: c.gold }]} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>
                          Llevas: <Text style={{ color: c.gold, fontWeight: '700' }}>{rocaDeTrabajo.avance} {rocaDeTrabajo.unidad}</Text>
                        </Text>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>
                          Meta: {rocaDeTrabajo.meta} {rocaDeTrabajo.unidad}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Dónde está parado dentro del programa. Se deriva del día, de corrido: el "mes" es un
                bloque de 4 semanas contado desde que arrancó, no un mes del calendario. */}
            <View style={[styles.goalCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
              <Row gap={6}>
                <Text style={{ fontSize: 15 }}>🗓️</Text>
                <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                  {etiquetaDelMes(mesDe(diaPrograma))}
                </Text>
              </Row>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10, marginTop: 4 }]}>
                Vas por la semana {semanaDe(diaPrograma)} de 12 · día {diaPrograma} de 90
              </Text>
            </View>

            {/* 2. ⚡ OBJETIVO SEMANAL (SPRINT DE 7 DÍAS) */}
            <View style={[styles.goalCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <RowBetween>
                <Row gap={6}>
                  <Text style={{ fontSize: 16 }}>⚡</Text>
                  <Text style={[t.micro, { color: '#70d2a0', fontWeight: '800', letterSpacing: 1 }]}>
                    2. OBJETIVO SEMANAL (SEM 06)
                  </Text>
                </Row>
                <Pressable
                  onPress={() => openEditGoalModal('semanal')}
                  style={[styles.editGoalBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                >
                  <Text style={[t.micro, { color: c.textSoft, fontWeight: '700' }]}>✏️ Editar</Text>
                </Pressable>
              </RowBetween>

              {goals.weeklyTitle ? (
                <>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13, marginTop: 4 }]}>
                    {goals.weeklyTitle}
                  </Text>
                  {!!goals.weeklySubtitle && (
                    <Text style={[t.micro, { color: c.micro, fontSize: 9.5 }]}>
                      {goals.weeklySubtitle}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[t.micro, { color: c.textSoft, fontSize: 10, marginTop: 4, lineHeight: 15 }]}>
                  Todavía no definiste tu foco de esta semana. Tocá Editar para escribirlo.
                </Text>
              )}

              {/* Checklist de Metas Semanales */}
              <View style={{ gap: 6, marginTop: 8 }}>
                {goals.weeklyItems.map(item => (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleWeeklyItem(item.id)}
                    style={[styles.weeklyCheckRow, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                  >
                    <View style={[styles.checkBoxSquare, { borderColor: item.completed ? c.gold : c.border, backgroundColor: item.completed ? c.gold : 'transparent' }]}>
                      {item.completed && <Text style={{ color: '#1E1B18', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                    </View>
                    <Text
                      style={[
                        t.body,
                        {
                          color: item.completed ? c.textSoft : c.textStrong,
                          fontSize: 12,
                          textDecorationLine: item.completed ? 'line-through' : 'none',
                          flex: 1,
                        },
                      ]}
                    >
                      {item.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 3. 🎯 OBJETIVO DIARIO (ROCA DE HOY) */}
            <View style={[styles.goalCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
              <RowBetween>
                <Row gap={6}>
                  <Text style={{ fontSize: 16 }}>🎯</Text>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                    3. OBJETIVO DIARIO (HOY · DÍA {diaPrograma})
                  </Text>
                </Row>
                <Pressable
                  onPress={() => openEditGoalModal('diario')}
                  style={[styles.editGoalBtn, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
                >
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✏️ Cambiar</Text>
                </Pressable>
              </RowBetween>

              <View style={[styles.dailyGoalBox, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <View style={{ flex: 1 }}>
                  <View style={[styles.tagPill, { borderColor: c.border, backgroundColor: '#173429', alignSelf: 'flex-start' }]}>
                    <Text style={[t.micro, { color: '#70d2a0', fontSize: 8.5, fontWeight: '800' }]}>
                      ROCA INNEGOCIABLE
                    </Text>
                  </View>
                  <Text
                    style={[
                      t.cardTitle,
                      { color: goals.dailyTitle ? c.textStrong : c.textSoft, fontSize: 13, marginTop: 4 },
                    ]}
                  >
                    {goals.dailyTitle || 'Todavía no elegiste tu roca innegociable de hoy.'}
                  </Text>
                </View>

                {/* Botón de Victoria Diaria */}
                <Pressable
                  onPress={toggleDailyGoal}
                  style={[
                    styles.dailyVictoryBtn,
                    {
                      borderColor: goals.dailyCompleted ? '#70d2a0' : c.border,
                      backgroundColor: goals.dailyCompleted ? '#173429' : c.cardBg,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 14 }}>{goals.dailyCompleted ? '✓' : '○'}</Text>
                  <Text style={[t.micro, { color: goals.dailyCompleted ? '#70d2a0' : c.textSoft, fontSize: 8.5, fontWeight: '900' }]}>
                    {goals.dailyCompleted ? 'LOGRADO' : 'PENDIENTE'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL: MOVER HÁBITO A OTRO MOMENTO (LONG PRESS)                  */}
      {/* ========================================================================= */}
      <Modal
        visible={moveMomentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveMomentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 8 }}>
              <View>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>REUBICAR HÁBITO</Text>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>
                  {selectedHabitForMove?.title}
                </Text>
              </View>
              <Pressable onPress={() => setMoveMomentModalVisible(false)}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✕ Cerrar</Text>
              </Pressable>
            </View>

            <Text style={[t.micro, { color: c.textSoft, fontSize: 11, marginTop: 10 }]}>
              ¿En qué momento del día deseas ubicar este hábito?
            </Text>

            <View style={{ gap: 8, marginTop: 12 }}>
              {/* Opción 1: Mañana */}
              <Pressable
                onPress={() => applyMomentChange('mañana')}
                style={[
                  styles.momentMoveOptionBtn,
                  {
                    borderColor: selectedHabitForMove?.moment === 'mañana' ? c.gold : c.border,
                    backgroundColor: selectedHabitForMove?.moment === 'mañana' ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <Row gap={10}>
                  <Text style={{ fontSize: 20 }}>🌅</Text>
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>BLOQUE DE LA MAÑANA</Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>05:00 AM – 12:00 PM</Text>
                  </View>
                </Row>
                <Text style={[t.micro, { color: c.gold, fontWeight: '800' }]}>Seleccionar ›</Text>
              </Pressable>

              {/* Opción 2: Tarde */}
              <Pressable
                onPress={() => applyMomentChange('tarde')}
                style={[
                  styles.momentMoveOptionBtn,
                  {
                    borderColor: selectedHabitForMove?.moment === 'tarde' ? c.gold : c.border,
                    backgroundColor: selectedHabitForMove?.moment === 'tarde' ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <Row gap={10}>
                  <Text style={{ fontSize: 20 }}>☀️</Text>
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>BLOQUE DE LA TARDE</Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>12:00 PM – 18:00 PM</Text>
                  </View>
                </Row>
                <Text style={[t.micro, { color: c.gold, fontWeight: '800' }]}>Seleccionar ›</Text>
              </Pressable>

              {/* Opción 3: Noche */}
              <Pressable
                onPress={() => applyMomentChange('noche')}
                style={[
                  styles.momentMoveOptionBtn,
                  {
                    borderColor: selectedHabitForMove?.moment === 'noche' ? c.gold : c.border,
                    backgroundColor: selectedHabitForMove?.moment === 'noche' ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <Row gap={10}>
                  <Text style={{ fontSize: 20 }}>🌙</Text>
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>BLOQUE DE LA NOCHE</Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>18:00 PM – 22:00 PM</Text>
                  </View>
                </Row>
                <Text style={[t.micro, { color: c.gold, fontWeight: '800' }]}>Seleccionar ›</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CREAR NUEVO HÁBITO CON ICONOS VISUALES (UX 40+)                    */}
      {/* ========================================================================= */}
      <Modal
        visible={createHabitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateHabitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 8 }}>
              <Text style={[t.cardTitle, { color: c.gold, fontSize: 13 }]}>CREAR NUEVO HÁBITO</Text>
              <Pressable onPress={() => setCreateHabitModalVisible(false)}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✕ Cerrar</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, paddingVertical: 8 }}>
                {/* 1. Nombre */}
                <View style={{ gap: 4 }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>1. NOMBRE DEL HÁBITO:</Text>
                  <TextInput
                    value={newHabitTitle}
                    onChangeText={setNewHabitTitle}
                    placeholder="Ej: Caminata 20m, Lectura Estratégica..."
                    placeholderTextColor={c.textSoft}
                    style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                  />
                </View>

                {/* 2. Categoría — obligatoria del lado del servidor, y de ella salen la etiqueta y
                    el icono que va a mostrar la tarjeta (E-137). */}
                <View style={{ gap: 4 }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>2. ÁREA DEL HÁBITO:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORIAS_HABITO.map(cat => {
                      const elegida = newHabitCategory === cat.valor;
                      return (
                        <Pressable
                          key={cat.valor}
                          onPress={() => setNewHabitCategory(cat.valor)}
                          style={[
                            styles.categoryPickPill,
                            {
                              borderColor: elegida ? c.gold : c.border,
                              backgroundColor: elegida ? c.cardBgAlt : c.cardBg,
                            },
                          ]}
                        >
                          <Text style={[t.micro, { color: elegida ? c.gold : c.textSoft, fontWeight: '800' }]}>
                            {cat.icono} {cat.etiqueta}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Hora de disparo. El bloque del día (mañana/tarde/noche) sale de esta hora, no
                    de un selector aparte: antes había uno y lo que eligiera se perdía al recargar. */}
                <View style={{ gap: 4 }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>3. HORA DEL DÍA:</Text>
                  <TextInput
                    value={newHabitTime}
                    onChangeText={setNewHabitTime}
                    placeholder="06:30"
                    placeholderTextColor={c.textSoft}
                    style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                  />
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5, lineHeight: 14 }]}>
                    Tu hábito propio se repite los 7 días y no vence: la hora es un recordatorio, y con
                    ella queda en el bloque de mañana, tarde o noche.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <GoldButton
              label={guardandoNuevoHabito ? 'GUARDANDO…' : '✓ GUARDAR HÁBITO'}
              onPress={() => void handleSaveNewHabit()}
              disabled={guardandoNuevoHabito}
              style={{ width: '100%', marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR OBJETIVO (PRINCIPAL, SEMANAL O DIARIO)                      */}
      {/* ========================================================================= */}
      <Modal
        visible={editGoalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 8 }}>
              <Text style={[t.cardTitle, { color: c.gold, fontSize: 13 }]}>
                EDITAR OBJETIVO {editingGoalType.toUpperCase()}
              </Text>
              <Pressable onPress={() => setEditGoalModalVisible(false)}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✕ Cerrar</Text>
              </Pressable>
            </View>

            <View style={{ gap: 10, paddingVertical: 10 }}>
              <View style={{ gap: 4 }}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>DECLARACIÓN DEL OBJETIVO:</Text>
                <TextInput
                  value={editGoalTitle}
                  onChangeText={setEditGoalTitle}
                  placeholder="Escribe tu objetivo aquí..."
                  placeholderTextColor={c.textSoft}
                  multiline
                  style={[styles.modalInputText, { minHeight: 60, borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                />
              </View>

              {editingGoalType === 'principal' && (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[t.micro, { color: c.textSoft }]}>LLEVAS:</Text>
                      <TextInput
                        value={editGoalCurrentVal}
                        onChangeText={setEditGoalCurrentVal}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={c.micro}
                        style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.gold }]}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[t.micro, { color: c.textSoft }]}>META:</Text>
                      <TextInput
                        value={editGoalTargetVal}
                        onChangeText={setEditGoalTargetVal}
                        keyboardType="numeric"
                        placeholder="30000"
                        placeholderTextColor={c.micro}
                        style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                      />
                    </View>
                    {/* La unidad dejó de estar fija en dólares: el objetivo puede medirse en kg,
                        horas o clientes. El backend la exige junto con los dos números. */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[t.micro, { color: c.textSoft }]}>UNIDAD:</Text>
                      <TextInput
                        value={editGoalUnidad}
                        onChangeText={setEditGoalUnidad}
                        placeholder="USD"
                        placeholderTextColor={c.micro}
                        maxLength={20}
                        autoCapitalize="none"
                        style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                      />
                    </View>
                  </View>
                  <Text style={[t.micro, { color: c.micro, fontSize: 9.5, lineHeight: 14 }]}>
                    Si tu objetivo no se mide con un número, dejá los tres campos vacíos.
                  </Text>
                </View>
              )}
            </View>

            <GoldButton
              label="✓ GUARDAR OBJETIVO"
              onPress={handleSaveGoal}
              style={{ width: '100%', marginTop: 6 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: SELECTOR DE HORA TÁCTIL (§1 — reemplaza el TextInput de texto libre) */}
      {/* ========================================================================= */}
      <HoraPickerModal
        visible={horaPickerVisible}
        tituloHabito={habitoParaHora?.title ?? ''}
        horaInicial={habitoParaHora?.time ?? ''}
        onConfirmar={hora => {
          if (habitoParaHora) void guardarNuevaHora(habitoParaHora.id, hora);
        }}
        onCerrar={() => setHoraPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  gauge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    position: 'relative',
  },
  gaugeCenter: {
    position: 'absolute',
    bottom: 2,
    alignItems: 'center',
  },
  gaugeLeft: {
    position: 'absolute',
    bottom: 0,
    left: 8,
  },
  gaugeRight: {
    position: 'absolute',
    bottom: 0,
    right: 8,
  },
  section: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 14,
  },
  priorityCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPillBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  createHabitBtn: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dayPillBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitPlanCard: {
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  habitIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  timeInputDirect: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: 'bold',
  },
  cambioProgramadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 5,
    maxWidth: '100%',
  },
  momentBadgePill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  momentMoveOptionBtn: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 14,
  },
  editGoalBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  weeklyCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  checkBoxSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyGoalBox: {
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  dailyVictoryBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContentCard: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 16,
  },
  modalInputText: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
  },
  // Sin `flex: 1` a proposito: las 4 areas del habito viven en un contenedor con `flexWrap`, y
  // estirarlas las obligaria a entrar todas en una sola fila apretada en un telefono angosto.
  // Asi caen en dos filas de dos cuando no entran.
  categoryPickPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});