import React, { useEffect, useMemo, useState } from 'react';
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
import { space } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, Row, RowBetween, ScreenHeader } from '../components/ui';
import { Icon } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { usePlanHabitos } from '../features/habits/hooks/usePlanHabitos';
import { DIAS_DEL_PROGRAMA, puntoDelMedidor, useProgramaDia } from '../features/programa/hooks/useProgramaDia';
import { descripcionDeFase } from '../features/home/hooks/useResumenHome';
import {
  diaAnterior,
  formatearFechaLarga,
  useArranqueDelPrograma,
} from '../features/programa/hooks/useArranqueDelPrograma';
import { HoraPickerModal } from '../features/habits/components/HoraPickerModal';
import { RenombrarHabitoModal } from '../features/habits/components/RenombrarHabitoModal';
import { useRenombreLocal } from '../features/habits/hooks/useRenombreDeHabito';
import {
  esRenombrable,
  tituloVisible,
} from '../features/habits/utils/renombreDeHabito';
import { useAuth } from '../features/auth/context/AuthContext';
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
import { useMapaRenacimientoAbierto } from '../features/mapa-renacimiento/MapaRenacimientoContext';
import { cifraEscrita } from '../features/objetivos/api/planMensualApi';
import { EditarObjetivoDelMesModal } from '../features/objetivos/components/EditarObjetivoDelMesModal';
import { usePlanMensual } from '../features/objetivos/hooks/usePlanMensual';
import { NivelesDelPlan } from '../features/objetivos/components/NivelesDelPlan';
import { useRocasMaestras } from '../features/objetivos/hooks/useRocasMaestras';
import type { EjeObjetivo } from '../features/objetivos/types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../features/objetivos/types/objetivos.types';
import { conPrincipalPrimero, usePrioridadPrincipal } from '../features/objetivos/hooks/usePrioridadPrincipal';
import { cifraDeEscala, cifraDelObjetivo, primeraClausula } from '../features/objetivos/utils/cifraDelObjetivo';
import { etiquetaDelMes, mesDe, semanaDe } from '../features/objetivos/utils/periodoDelPrograma';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';

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
  /** El recordatorio guardado, para poder preservarlo al cambiar la hora (ver `cambiarHorario`). */
  recordatorio: { activo: boolean; minutosAntes: number | null };
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
  /**
   * `Habito.claveSistema` del backend (`DAILY_CLASS`, `GREEN_JUICE`…), `null` en los personales.
   *
   * Se arrastra hasta acá para poder reconocer un hábito puntual sin mirar su título — hoy lo usa
   * el cambio de nombre de las bebidas (`utils/renombreDeHabito.ts`). `TrainingScreen` ya lo traía
   * por el mismo motivo, y la razón es la misma que documenta ahí: el título es editable, así que
   * emparejar por texto hace desaparecer la función en silencio el día que alguien lo renombre.
   */
  systemKey?: string | null;
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

/*
 * `WeeklyGoalItem`, `PlanGoals` e `INITIAL_GOALS` se eliminaron.
 *
 * Eran el objetivo semanal y el diario viviendo en `useState`: una lista de tildes que se perdía al
 * recargar mientras el Alert aseguraba "Los cambios han sido guardados en tu plan". El comentario
 * que estaba acá ya lo decía —"conectarlos es un rediseño de la tarjeta, no un cableado"—, y ese
 * rediseño es `features/objetivos/components/NivelesDelPlan`, contra el modelo real del backend:
 * tres rocas por semana con tres acciones críticas cada una, obstáculo, contingencia,
 * autoevaluación de entrada y de salida, y un cierre con bloqueo y corrección.
 */

/**
 * Con qué eje se abre la vista de Objetivos cuando nadie eligió todavía.
 *
 * > **Corregido 2026-09-08.** Acá había un `EJE_DE_ESTA_PANTALLA = 'TRABAJO'` fijo: la vista servía
 * > solo para "Diseñar libertad financiera" y los otros dos ejes no tenían por dónde entrar. Su
 * > propio comentario ya anticipaba el arreglo — *"cuando la tengan, esto pasa a ser un parámetro y
 * > no una constante"*. Es exactamente lo que se hizo: el eje entra por estado, lo fija la tarjeta
 * > que se toca, y esto queda solo como valor inicial.
 */
const EJE_POR_DEFECTO: EjeObjetivo = 'CUERPO';

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

/**
 * Los tres tramos del gráfico "ARQUITECTURA DE TIEMPO".
 *
 * > **Corregido 2026-09-08.** Esto se llamaba `FASES` y alimentaba también el rótulo "FASE ACTUAL",
 * > que por eso contradecía a Hoy y a Yo. **Las fases del programa son cuatro y las define el
 * > backend** (`descripcionDeFase`); esto es el arco de la curva de arriba —tres tramos parejos de
 * > 30 días— y nada más. Se le sacó el nombre "fase" para que la palabra tenga un solo significado
 * > en toda la app.
 *
 * > **Corregido 2026-09-14.** Ese arreglo no alcanzó: el bloque seguía mostrando los nombres
 * > **FUNDACIÓN / ACELERACIÓN / EXPANSIÓN**, y el dueño del producto lo leyó como una
 * > contradicción con la fase real que la misma pantalla muestra arriba. Tenía razón por dos
 * > motivos: **esos tres nombres no existen en ningún documento del método** —están inventados en
 * > esta pantalla, y `.claude/rules/00` prohíbe rellenar vocabulario de producto con supuestos—, y
 * > dos particiones distintas de los mismos 90 días en una sola pantalla (1–7/8–34/35–64/65–90
 * > arriba, 1–30/31–60/61–90 acá) se leen como que una de las dos está mal.
 * >
 * > Quitarle la palabra "fase" hizo el problema más silencioso, no lo resolvió. **Ahora se
 * > dibujan solo los rangos de días y el avance real**: el arco sigue contando los 90 días sin
 * > afirmar que son etapas del método. Si alguna vez el cliente define nombres para estos tres
 * > tramos, se agregan acá y salen de su documento, no de esta pantalla.
 */
const TRAMOS_DEL_RECORRIDO = [
  { d: 'DÍAS 1–30' },
  { d: 'DÍAS 31–60' },
  { d: 'DÍAS 61–90' },
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
  const { rs, isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
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
  const { diaPrograma, fase, loading: cargandoDiaPrograma } = useProgramaDia();

  /**
   * La fase del aprendiz, **la que dice el backend**, no una calculada acá.
   *
   * > **Corregido 2026-09-08.** Esto derivaba del día contra un arreglo local de TRES fases
   * > (FUNDACIÓN 1-30 / ACELERACIÓN 31-60 / EXPANSIÓN 61-90) inventado en esta pantalla. El
   * > programa tiene **cuatro**, con contrato firmado cada una, y **Hoy y Yo ya las mostraban**
   * > (`rotuloDeFase`): un aprendiz en el día 40 leía "GUERRERO ALQUIMISTA" en Hoy y "ACELERACIÓN ·
   * > Fase 2" en Plan, el mismo día. Ahora las tres pantallas dicen lo mismo porque leen lo mismo.
   *
   * `fase` ya viajaba en `GET /api/v1/home` y esta pantalla la estaba tirando a la basura.
   *
   * Es `null` mientras la respuesta viaja, y también ante una fase que esta versión de la app no
   * conozca. En los dos casos no se dibuja el rótulo: mejor nada que un dato inventado.
   */
  const faseActual = descripcionDeFase(fase);
  const medidor = puntoDelMedidor(diaPrograma);
  /* `null` mientras la carga no termina o el programa no arranco (dia 0): la arquitectura de
     tiempo no debe mostrar avance inventado, igual que Hoy no muestra un dia que no sabe. */
  const diaConocido = cargandoDiaPrograma || diaPrograma <= 0 ? null : diaPrograma;
  const tramoActual = diaConocido === null ? -1 : Math.min(2, Math.floor((diaConocido - 1) / 30));
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

  // =========================================================================
  // CAMBIARLE EL NOMBRE A UNA BEBIDA (jugo verde / agua con limón)
  // =========================================================================
  /**
   * Quien no puede tomar esas bebidas —gastritis, reflujo, diabetes— puede ponerles el nombre de
   * lo que sí va a hacer, en vez de incumplirlas 90 días. El cambio es SUYO: nadie más lo ve.
   *
   * Solo se ofrece sobre los dos hábitos que el backend acepta (por `systemKey`, nunca por título)
   * y **solo hasta el día 0**: desde el día 1 `RenombreHabitoService` rechaza tanto el cambio como
   * el quitarlo. Mostrar el botón después sería mostrar un botón que siempre falla.
   *
   * El nombre propio sale del almacenamiento del teléfono y no del servidor porque **ninguna
   * lectura del aprendiz devuelve `personalTitle`** — ver la cabecera de
   * `features/habits/storage/renombreDeHabito.ts`.
   */
  const { user } = useAuth();
  const renombre = useRenombreLocal(user?.id ?? null);
  // D-127: cualquier dia del programa. Ya no depende del dia, solo de que el habito sea uno
  // de los dos reemplazables (lo decide `esRenombrable` en cada tarjeta).
  const puedeRenombrar = true;
  const [habitoARenombrar, setHabitoARenombrar] = useState<PlanHabit | null>(null);

  // Estados de Objetivos

  // Modales
  const [createHabitModalVisible, setCreateHabitModalVisible] = useState(false);
  const [editGoalModalVisible, setEditGoalModalVisible] = useState(false);

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
   * Desde dónde arrancó. **Sin este campo, editar el objetivo borraba el punto de partida** y el
   * porcentaje volvía a la fórmula vieja: alguien que baja de peso pasaba de 0 % a 100 % por haber
   * corregido una palabra de su meta (E-166). Además es lo único que permite arreglar las rocas
   * creadas antes de la migración V43, que no lo tienen.
   */
  const [editGoalBase, setEditGoalBase] = useState('');

  /**
   * El objetivo de 90 días real del aprendiz, traído del backend.
   *
   * Los tres ejes, no uno: la tarjeta que se toca en PRIORIDADES CLAVE fija cuál se está editando.
   *
   * > **Corregido 2026-09-08.** Acá decía que esta sub-pantalla era la de "Diseñar libertad
   * > financiera" y que CUERPO y RELACIONES "todavía no tienen pantalla propia". Ya la tienen: es
   * > esta misma, parametrizada por eje.
   *
   * Reemplaza a los objetivos inventados que estaban escritos a mano en este
   * archivo —los mismos para todos los aprendices— y que al editarse solo cambiaban un estado de
   * React que se perdía al recargar. Mismo problema, y misma corrección, que la que ya se hizo con
   * `INITIAL_HABITS`.
   */
  const objetivos = useRocasMaestras();

  // Sin las tres rocas maestras, el backend cierra la planificación semanal con 403 ROCKS_LOCKED, y
  // quien las escribe es el Mapa de Renacimiento. Por eso ese estado no ofrece "reintentar" sino la
  // puerta al Mapa: es lo único que destraba la cadena.
  const { abrir: abrirMapa } = useMapaRenacimientoAbierto();
  /** El eje que se está mirando. Lo fija la tarjeta que se tocó en PRIORIDADES CLAVE. */
  const [ejeAbierto, setEjeAbierto] = useState<EjeObjetivo>(EJE_POR_DEFECTO);
  /**
   * Si se está leyendo la explicación de los tres niveles, en OBJETIVOS (3 NIVELES).
   *
   * Arranca cerrada (2026-09-21, pedido del dueño): lo primero que tiene que verse al entrar es el
   * objetivo y su avance, no cómo funciona el sistema. La explicación no se borró — está a un toque.
   */
  const [explicacionNivelesAbierta, setExplicacionNivelesAbierta] = useState(false);
  const rocaDeEje = (eje: EjeObjetivo) => objetivos.deEje(eje);
  const rocaAbierta = objetivos.deEje(ejeAbierto);

  /**
   * El eje que la persona eligió como principal en el paso 2 del Mapa, y los tres con ese adelante.
   *
   * Pedido del cliente el 2026-09-14: los tres objetivos se llenan igual, pero **el principal va
   * primero**. Mientras no haya prioridad guardada, `conPrincipalPrimero` devuelve el orden de
   * siempre, así que quien hizo el Mapa antes de que esto existiera no ve ningún cambio raro.
   */
  const { ejePrincipal, relacionesBase, relacionesMeta } = usePrioridadPrincipal();

  /* El objetivo de ESTE MES para el eje abierto, calculado por el servidor.
     Antes se calculaba acá y daba un número distinto al hito del Mapa para el mismo mes; el porqué
     del cambio está en la cabecera de `api/planMensualApi.ts`. */
  const planMensual = usePlanMensual();
  const mesDelEjeAbierto = planMensual.mesEnCursoDe(ejeAbierto);
  const planDelEjeAbierto = planMensual.porEje.get(ejeAbierto);
  const [editandoMes, setEditandoMes] = useState(false);

  const cifraDelMesAbierto =
    mesDelEjeAbierto?.cifra != null && planDelEjeAbierto
      ? cifraEscrita(mesDelEjeAbierto.cifra, planDelEjeAbierto.unidad, planDelEjeAbierto.unidadAdelante)
      : null;
  const ejesOrdenados = useMemo(() => conPrincipalPrimero(EJES, ejePrincipal), [ejePrincipal]);

  /** Abre la vista de Objetivos en el eje pedido. Un solo camino para las tres tarjetas. */
  const abrirObjetivoDe = (eje: EjeObjetivo) => {
    setEjeAbierto(eje);
    setActiveSubView('objetivos');
  };

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
    // El de arriba de todo va primero: el cambio de nombre se abre POR ENCIMA de la lista.
    if (habitoARenombrar !== null) {
      setHabitoARenombrar(null);
      return true;
    }
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
  }, activeSubView !== 'main' || createHabitModalVisible || editGoalModalVisible || moveMomentModalVisible
     || habitoARenombrar !== null);

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
      const resultado = await habitsApi.cambiarHorario(habitId, `${nuevaHora}:00`, habito.limitTime,
        habito.recordatorio);
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

  /**
   * Abre el editor del objetivo de 90 días del eje que se tocó.
   *
   * > **Corregido 2026-09-08.** Antes recibía un `type: 'principal' | 'semanal' | 'diario'` y los
   * > dos últimos escribían en un `useState` que se perdía al recargar, mientras el Alert decía
   * > "Los cambios han sido guardados en tu plan". El semanal y el diario ahora tienen su propio
   * > modelo contra el backend (`NivelesDelPlan`), así que este editor quedó donde correspondía:
   * > solo el objetivo de 90 días.
   */
  const openEditGoalModal = () => {
    // Prellena con lo que hay guardado. Si el aprendiz todavía no definió su objetivo, los
    // campos arrancan vacíos: es su primera vez, no hay nada que corregir.
    setEditGoalTitle(rocaAbierta?.objetivo ?? '');
    setEditGoalCurrentVal(rocaAbierta?.avance != null ? String(rocaAbierta.avance) : '');
    setEditGoalTargetVal(rocaAbierta?.meta != null ? String(rocaAbierta.meta) : '');
    setEditGoalUnidad(rocaAbierta?.unidad ?? '');
    // Si la roca ya tiene punto de partida se conserva; si es de las viejas, se propone el avance
    // actual, que es lo más cercano a la verdad que hay sin preguntarle a la persona.
    setEditGoalBase(
      rocaAbierta?.lineaBase != null
        ? String(rocaAbierta.lineaBase)
        : rocaAbierta?.avance != null
          ? String(rocaAbierta.avance)
          : ''
    );
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
    const lineaBase = editGoalBase.trim() === '' ? undefined : Number(editGoalBase);
    const algunNumero = meta !== undefined || avance !== undefined || unidad !== undefined;

    if (algunNumero) {
      if (meta === undefined || avance === undefined || unidad === undefined) {
        Alert.alert(
          'Falta un dato de la meta',
          'Para medir tu objetivo hacen falta las tres cosas: cuánto llevas, cuánto quieres llegar y en qué se mide (USD, kg, clientes...). Si no quieres medirlo con un número, deja los tres campos vacíos.'
        );
        return;
      }
      if (!Number.isFinite(meta) || !Number.isFinite(avance)) {
        Alert.alert('Número inválido', 'Revisa los valores: tienen que ser números.');
        return;
      }
      /**
       * **Una meta de CERO es válida.** Saldar una deuda, llegar a cero cigarrillos: el destino es
       * el cero y eso se mide perfecto mientras se sepa de dónde se arrancó —
       * `|avance − base| / |0 − base|`. El backend lo admite desde la V44 y el Mapa ya lo respeta
       * (`meta < 0` en `definicionDesde`); esta pantalla se había quedado con la regla vieja.
       *
       * El efecto era feo y silencioso: quien ponía "bajar mi deuda a 0" desde el Mapa lo guardaba
       * bien, y después quedaba ENCERRADO — el modal se precarga con meta 0 y cualquier intento de
       * guardar rebotaba contra este aviso, sin más salida que cambiar su objetivo de verdad.
       *
       * Lo que sí se rechaza es lo mismo que rechaza `MetaCuantitativa`: una meta negativa, y una
       * meta de cero sin punto de partida (ahí el porcentaje sería una división por cero).
       */
      if (meta < 0) {
        Alert.alert('Meta inválida', 'La meta no puede ser un número negativo.');
        return;
      }
      if (meta === 0 && lineaBase === undefined) {
        Alert.alert(
          'Falta tu punto de partida',
          'Llegar a cero es una meta válida, pero para medirla hace falta saber desde dónde arrancas. Escribe tu punto de partida.'
        );
        return;
      }
      if (avance < 0) {
        Alert.alert('Avance inválido', 'El avance no puede ser negativo.');
        return;
      }
    }

    if (lineaBase !== undefined && (!Number.isFinite(lineaBase) || lineaBase < 0)) {
      Alert.alert('Punto de partida inválido', 'Tiene que ser un número, y no puede ser negativo.');
      return;
    }
    if (lineaBase !== undefined && meta !== undefined && lineaBase === meta) {
      Alert.alert(
        'Punto de partida igual a la meta',
        'Si arrancas justo en tu meta no hay avance que medir. Revisa los dos números.'
      );
      return;
    }
    const resultado = await objetivos.definir(ejeAbierto, {
      objetivo: editGoalTitle.trim(),
      meta,
      avance,
      unidad,
      lineaBase,
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

    void guardarObjetivoPrincipal();
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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Alineado a la IZQUIERDA (2026-09-14). Antes iba centrado, y el par "versalitas
              chicas centradas + subtítulo centrado" es el gesto de plantilla que esta pasada
              viene a quitar: además obliga al ojo a volver al centro en cada línea. El rótulo
              queda de antetítulo y la frase pasa a tamaño de lectura. */}
          <View style={{ paddingTop: 6, gap: 6 }}>
            <Text style={[t.sectionTitle, { color: c.micro }]}>TU MAPA DE LOS PRÓXIMOS 90 DÍAS</Text>
            <Text style={[t.body, { color: c.text }]}>Enfocado. Estratégico. Real.</Text>
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
              {/* `t.metric` y no un `fontFamily` suelto: trae las cifras tabulares que pide
                  AGENTS.md §4 para todo número que cambia en pantalla. Sin eso, pasar del día 9
                  al 10 corría de lugar el número dentro del medidor. */}
              <Text style={[t.metric, { fontSize: 40, lineHeight: 46, color: c.textStrong }]}>{diaPrograma}</Text>
              <Text style={[t.small, { color: c.micro }]}>DE {DIAS_DEL_PROGRAMA}</Text>
            </View>
            <Text style={[t.small, styles.gaugeLeft, { color: c.textSoft }]}>01</Text>
            <Text style={[t.small, styles.gaugeRight, { color: c.textSoft }]}>90</Text>
          </View>

          {/* FASE ACTUAL — derivada del día, no escrita a mano.
              Decía "01 · Fundamentación · Días 1–30" fijo: seguía diciendo lo mismo en el día 75. */}
          <View style={styles.section}>
            <MicroLabel>Fase actual</MicroLabel>
            {/* Apilado, ya no en tres columnas (2026-09-14). Los nombres de fase del cliente son
                largos —"Sistema de Alto Rendimiento" son 27 caracteres, contra los 7 de
                "Renaser"— y en la fila de antes el nombre quedaba espachurrado entre el número y
                el rango: con `alignItems: 'baseline'` se partía en dos líneas mientras el rango
                seguía pegado a la primera, o se comía el aire de los costados. Ahora el nombre
                tiene el ancho entero de la pantalla y no se corta ni se trunca; el número y el
                rango bajan a una línea de contexto arriba, que es además el orden en que se leen.
                Sin `numberOfLines` a propósito: si algún día hay un nombre más largo todavía,
                preferimos que baje a dos líneas antes que perder letras en puntos suspensivos. */}
            {faseActual ? (
              <View style={{ marginTop: 12, gap: 4 }}>
                <Row gap={10} align="baseline">
                  <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                    {String(faseActual.numero).padStart(2, '0')}
                  </Text>
                  <Text style={[t.small, { color: c.micro }]}>{faseActual.rango}</Text>
                </Row>
                <Text style={[t.cardTitle, { color: c.text, fontSize: 20, lineHeight: 27 }]}>
                  {faseActual.nombre}
                </Text>
              </View>
            ) : (
              <Text style={[t.body, { color: c.textSoft, marginTop: 12 }]}>
                {cargandoDiaPrograma ? 'Cargando tu fase…' : 'Tu fase va a aparecer cuando arranque tu programa.'}
              </Text>
            )}
          </View>

          {/* PRIORIDADES CLAVE (INTERACTIVAS) */}
          <View style={styles.section}>
            <MicroLabel>Prioridades clave</MicroLabel>
            {/* La invitacion vivia dentro de cada tarjeta, asi que "Todavía sin definir · toca
                para escribirlo" se leia tres veces seguidas. Dicha una sola vez arriba, y solo
                mientras quede algo por definir, las tarjetas recuperan el nombre del eje como
                lo primero que se lee. */}
            {EJES.some(eje => !rocaDeEje(eje)?.objetivo?.trim()) && (
              <Text style={[t.small, { color: c.textSoft, marginTop: 6 }]}>
                Toca cada una para escribir tu objetivo.
              </Text>
            )}
            <View style={{ marginTop: 12, gap: 10 }}>
              {/* Una sola lista sobre los tres ejes, en vez de tres tarjetas casi idénticas
                  repetidas a mano. Estuvieron con candado y "Disponible en la próxima
                  actualización" desde el commit 8b78a00; se liberan el 2026-09-08.

                  **Lo que se lee es el objetivo del aprendiz, no un título de catálogo.** Los tres
                  nombres de eje quedan solo como estado vacío, para quien todavía no definió el
                  suyo. Nunca un dato inventado: es lo que D-120 corrigió cuando la pantalla
                  mostraba "Facturar $30.000 USD" igual para todos. */}
              {ejesOrdenados.map((eje, indice) => {
                const roca = rocaDeEje(eje);
                const definido = Boolean(roca?.objetivo?.trim());
                const esPrincipal = eje === ejePrincipal;
                /* Relaciones no tiene meta cuantitativa en su Roca —su escala 1-10 no es una
                   unidad de negocio— asi que su cifra sale de las respuestas del Mapa. Sin ellas
                   (quien lo recorrio antes del 2026-09-14) cae al texto, como antes. */
                const cifra =
                  eje === 'RELACIONES' ? cifraDeEscala(relacionesBase, relacionesMeta) : cifraDelObjetivo(roca);
                const avance = roca?.porcentaje ?? null;
                return (
                  <Pressable
                    key={eje}
                    onPress={() => abrirObjetivoDe(eje)}
                    accessibilityRole="button"
                    accessibilityLabel={`${ETIQUETA_EJE[eje]}${esPrincipal ? ', tu prioridad principal' : ''}. ${
                      definido ? cifra ?? roca!.objetivo : 'Todavía sin definir'
                    }`}
                    style={[
                      styles.priorityCard,
                      {
                        // Un solo grosor de borde para las tres: lo que distingue a la principal
                        // es el color del contorno y su distintivo, no una línea más gorda. (El
                        // ternario de antes, `definido ? c.border : c.border`, devolvía lo mismo
                        // en las dos ramas.)
                        borderColor: esPrincipal ? c.gold : c.border,
                        backgroundColor: esPrincipal ? c.cardBgAlt : c.cardBg,
                      },
                    ]}
                  >
                    <Text style={[t.small, { color: c.goldInk }]}>{String(indice + 1).padStart(2, '0')}</Text>
                    <View style={{ flex: 1, gap: 3 }}>
                      {/* El eje primero y el distintivo a su lado: es lo que la persona busca al
                          barrer la lista con la vista, y antes quedaba sepultado bajo la frase. */}
                      <Row gap={6}>
                        <Text
                          style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1, fontSize: 11 }]}
                        >
                          {ETIQUETA_EJE[eje].toUpperCase()}
                        </Text>
                        {esPrincipal && (
                          <View style={[styles.insigniaPrincipal, { backgroundColor: c.goldWash }]}>
                            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 0.8 }]}>
                              PRINCIPAL
                            </Text>
                          </View>
                        )}
                      </Row>

                      {!definido ? (
                        <Text style={[t.body, { color: c.textSoft }]}>Todavía sin definir</Text>
                      ) : cifra ? (
                        /* Con meta medible manda el NÚMERO: de dónde partió y a dónde va. La frase
                           redactada completa sigue estando, a un toque, en el modal de edición. */
                        /* `flexShrink` + dos líneas: una cifra grande con unidad larga
                           ("1 000 000 → 2 000 000 dólares") antes se cortaba con puntos
                           suspensivos justo donde está el dato. El porcentaje no encoge: es corto
                           y es lo que ancla la lectura a la derecha. */
                        <Row gap={8} style={{ alignItems: 'baseline' }}>
                          {/* `t.metric` de base para que la cifra lleve dígitos tabulares: es un
                              número que se mueve con cada avance, y sin ancho fijo el porcentaje
                              de al lado bailaba al pasar de 9 a 10 (AGENTS.md §4). */}
                          <Text
                            style={[
                              t.metric,
                              { color: c.textStrong, fontSize: 19, fontFamily: 'Jost_700Bold', flexShrink: 1 },
                            ]}
                            numberOfLines={2}
                          >
                            {cifra}
                          </Text>
                          {avance !== null && (
                            <Text
                              style={[
                                t.metric,
                                { color: c.goldInk, fontSize: 12, fontFamily: 'Jost_500Medium', flexShrink: 0 },
                              ]}
                            >
                              {avance}%
                            </Text>
                          )}
                        </Row>
                      ) : (
                        /* Sin números —Relaciones, que se mide en una escala 1-10 y no en unidades de
                           negocio— se muestra el objetivo en dos líneas. Decisión del dueño el
                           2026-09-14: antes que inventar una barra de avance sin con qué medirla. */
                        <Text style={[t.body, { color: c.textStrong }]} numberOfLines={2}>
                          {primeraClausula(roca!.objetivo)}
                        </Text>
                      )}

                      {cifra && avance !== null && (
                        <View style={[styles.barraObjetivo, { backgroundColor: c.border }]}>
                          <View
                            style={[
                              styles.barraObjetivoRelleno,
                              { backgroundColor: c.gold, width: `${Math.max(0, Math.min(100, avance))}%` },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                    <Icon name="chevron" size={15} color={c.goldInk} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ARQUITECTURA DE TIEMPO */}
          <View style={[styles.section, { flex: 1, justifyContent: 'flex-end', paddingBottom: 24 }]}>
            <MicroLabel>Arquitectura de tiempo</MicroLabel>
            {/* Antes aqui habia una linea ascendente con seis puntos en coordenadas FIJAS
                ("M6 62 L64 50 ... L294 8"). Parecia el progreso del aprendiz y no medía nada:
                subia igual el dia 2 que el 89. Ahora los tres tramos se rellenan con el dia
                real que devuelve `useProgramaDia`, y mientras ese dato no se sabe (o el
                programa no arranco) no se pinta ningun avance en vez de inventarlo. */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {TRAMOS_DEL_RECORRIDO.map((tramo, i) => {
                const primerDia = i * 30 + 1;
                const avance = diaConocido === null
                  ? 0
                  : Math.max(0, Math.min(1, (diaConocido - i * 30) / 30));
                return (
                  <View key={tramo.d} style={{ flex: 1 }}>
                    <View style={[estiloTramo.riel, { backgroundColor: c.border }]}>
                      <View
                        style={[
                          estiloTramo.relleno,
                          { backgroundColor: c.gold, width: `${avance * 100}%` },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        t.micro,
                        { color: i === tramoActual ? c.goldInk : c.micro, marginTop: 8 },
                      ]}
                    >
                      {tramo.d}
                    </Text>
                    {/* Sin `fontSize: 10`: 10.5 es el piso de micro para este público
                        (AGENTS.md §4), y lo da el propio token. */}
                    <Text style={[t.micro, styles.cifras, { color: c.chevron, marginTop: 3 }]}>
                      {i === tramoActual && diaConocido !== null
                        ? `vas por el ${diaConocido}`
                        : `desde el ${primerDia}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: SUB-PANTALLA: HÁBITOS 7 DÍAS (DENTRO DE PRIORIDAD 01)            */}
      {/* ========================================================================= */}
      {activeSubView === 'habitos' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveSubView('main')} style={styles.backBtnRow} hitSlop={12}>
              <Icon name="arrowLeft" size={16} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                VOLVER A PLAN
              </Text>
            </Pressable>
            {/* Relleno tenue en lugar de contorno dorado (2026-09-14): la píldora vivía pegada a
                la línea del encabezado, así que eran dos trazos discutiendo el mismo borde. */}
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                01. HÁBITOS (7 DÍAS)
              </Text>
            </View>
          </View>

          <RowBetween style={{ marginTop: space.gap, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>
                Convertirme en mi mejor versión
              </Text>
            </View>
            {/* 48 px de alto y etiqueta de 13: era un botón de ~25 px con texto de 10.5, por
                debajo del mínimo de pulsación cómoda de AGENTS.md §4. El color del texto sale
                del token `onGold` en vez del literal '#1E1B18' que estaba escrito a mano. */}
            <Pressable
              onPress={() => setCreateHabitModalVisible(true)}
              style={[styles.createHabitBtn, { backgroundColor: c.gold }]}
            >
              <Text style={{ color: c.onGold, fontFamily: 'Jost_700Bold', fontSize: 13 }}>➕ Crear Hábito</Text>
            </Pressable>
          </RowBetween>

          {/* Selector de Días Semanales (LUN - DOM) */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: space.gap }}>
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
                  <Text style={[t.micro, { color: isSelected ? c.goldInk : c.textSoft, fontFamily: 'Jost_700Bold' }]}>
                    {d}
                  </Text>
                  <Text
                    style={[
                      t.cardTitle,
                      styles.cifras,
                      { color: isSelected ? c.goldInk : c.textStrong, fontSize: 14, marginTop: 3 },
                    ]}
                  >
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
                marginTop: space.gapLg,
                padding: space.cardPad,
                borderRadius: space.radius,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.cardBgAlt,
                gap: 8,
              }}
              accessibilityLabel="Tu programa todavía no arrancó"
            >
              <Row gap={8}>
                <Icon name="lock" size={15} color={c.goldInk} />
                <Text style={[t.cardTitle, { color: c.textStrong, flexShrink: 1 }]}>
                  {arranque.estado === 'PENDIENTE_ELEGIR'
                    ? 'Todavía no elegiste tu Día 1'
                    : 'Tu programa arranca pronto'}
                </Text>
              </Row>
              <Text style={[t.body, { color: c.textSoft }]}>
                {arranque.estado === 'PENDIENTE_ELEGIR'
                  ? 'Elige en qué día quieres empezar tus 90 días. Hasta entonces no hay plan que organizar.'
                  : `Empiezas el ${formatearFechaLarga(arranque.fechaInicio)}. Desde el ${formatearFechaLarga(diaAnterior(arranque.fechaInicio))} vas a poder organizar los hábitos de tu primer día; hasta entonces no hay nada que hacer acá.`}
              </Text>
            </View>
          )}

          {/* LISTA DE HÁBITOS POR MOMENTO DEL DÍA (CON LONG-PRESS PARA MOVER) */}
          {/* D-84: con el programa sin arrancar la lista NO se dibuja. No es un detalle
              estetico: Plan lee el catalogo completo (`GET /api/v1/habits`), no los habitos
              del dia, asi que en dia 0 mostraba los 23 habitos del programa como si
              aplicaran hoy — incluidos los que recien arrancan en el dia 8. El aviso de
              arriba ya explica que pasa; la lista solo agregaba ruido y confusion. */}
          <View style={{ gap: space.gapLg, marginTop: space.gapLg, paddingBottom: 28, display: programaSinArrancar ? 'none' : 'flex' }}>
            {/* Mientras carga, si falla, o si de verdad no hay hábitos. Antes de esto se
                dibujaban 5 hábitos inventados que no existen en el catálogo. */}
            {cargandoHabitos && (
              <View style={{ gap: 12 }} accessibilityLabel="Cargando tus hábitos">
                {[0, 1, 2, 3].map(i => (
                  <View
                    key={i}
                    style={{
                      height: 84,
                      borderRadius: space.radius,
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
                  gap: 12,
                  padding: space.cardPad,
                  borderRadius: space.radius,
                  borderWidth: 1,
                  borderColor: c.danger,
                  backgroundColor: c.cardBg,
                }}
              >
                <Text style={[t.cardTitle, { color: c.textStrong }]}>
                  No pudimos cargar tus hábitos
                </Text>
                <Text style={[t.body, { color: c.textSoft }]}>{errorHabitos}</Text>
                {/* Relleno sólido y sin contorno: es la única acción de la tarjeta y ya vive
                    DENTRO de un recuadro. Un botón con borde acá era caja dentro de caja. */}
                <Pressable
                  onPress={() => {
                    void recargarHabitos();
                  }}
                  style={{
                    minHeight: 48,
                    borderRadius: space.radiusSm,
                    backgroundColor: c.gold,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={[t.cardTitle, { color: c.onGold }]}>Reintentar</Text>
                </Pressable>
              </View>
            )}

            {conectadoAlBackend && habits.length === 0 && (
              <View
                style={{
                  gap: 8,
                  padding: space.cardPad,
                  borderRadius: space.radius,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.cardBg,
                }}
              >
                <Text style={[t.cardTitle, { color: c.textStrong }]}>
                  Tu plan todavía no se generó
                </Text>
                <Text style={[t.body, { color: c.textSoft }]}>
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
                <View key={momentName} style={{ gap: 12 }}>
                  <RowBetween>
                    <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
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
                      estadoColor = c.goldInk;
                    } else if (esOpcional && isDayActive) {
                      estadoLabel = 'OPCIONAL';
                      estadoColor = c.textSoft;
                    } else {
                      estadoLabel = isDayActive ? 'ACTIVO' : 'PAUSADO';
                      estadoColor = isDayActive ? c.success : c.textSoft;
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
                            {/* Disco dorado tenue, sin anillo: el borde de este medallón vivía
                                dentro del borde de la tarjeta. `goldWash` es el token que existe
                                justo para esto y lo distingue sin dibujar una segunda caja.
                                Mismo criterio para la etiqueta de categoría de abajo. */}
                            <View style={[styles.habitIconBox, { backgroundColor: c.goldWash }]}>
                              <Text style={{ fontSize: 18 }}>{habit.icon}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Row gap={6}>
                                <View style={[styles.tagPill, { backgroundColor: c.goldWash, alignSelf: 'flex-start' }]}>
                                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                                    {habit.tag}
                                  </Text>
                                </View>
                                {bloqueadoObligatorio ? <Icon name="lock" size={11} color={c.goldInk} /> : null}
                              </Row>
                              {/* El nombre que puso la persona gana al del catálogo. Sin renombre
                                  devuelve `habit.title` tal cual, así que para los ~20 hábitos
                                  que no son bebidas no cambia absolutamente nada. */}
                              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 4 }]}>
                                {tituloVisible(habit, renombre.titulos)}
                              </Text>

                              {/* Cambiar el nombre de la bebida — solo en los dos hábitos que el
                                  backend acepta y solo mientras la ventana sigue abierta (día 0).
                                  Se reconoce por `systemKey`, nunca por el texto del título. */}
                              {esRenombrable(habit.systemKey) && puedeRenombrar && !bloqueado ? (
                                <Pressable
                                  onPress={() => setHabitoARenombrar(habit)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Cambiarle el nombre a ${tituloVisible(habit, renombre.titulos)}`}
                                  hitSlop={8}
                                  style={styles.renombrarBtn}
                                >
                                  <Icon name="spark" size={11} color={c.goldInk} />
                                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_500Medium', flexShrink: 1 }]}>
                                    {renombre.titulos[habit.id]
                                      ? 'CAMBIAR O QUITAR EL NOMBRE'
                                      : 'PONERLE OTRO NOMBRE'}
                                  </Text>
                                </Pressable>
                              ) : null}
                              {/* Horario: selector táctil, ya no texto libre (§1).
                                  D-85: ya NO se bloquea cuando el hábito venció hoy. Que hoy se
                                  haya pasado su hora no impide reprogramarlo — el backend acepta
                                  el cambio y lo aplica mañana (`deferred: true`). Bloquearlo acá
                                  impedía justo lo que uno quiere hacer de noche: acomodar el día
                                  siguiente. El hábito vencido se sigue viendo apagado, pero se
                                  puede tocar. */}
                              {/* `flexWrap` (2026-09-14): son cuatro piezas —reloj, hora,
                                  duración y momento del día— en la columna angosta que queda a la
                                  derecha del medallón y a la izquierda del interruptor. En un
                                  teléfono de 360 px no entran en una sola línea, y sin envolver se
                                  salían de la tarjeta (AGENTS.md §2, cero desbordamientos). */}
                              <Row gap={8} style={{ marginTop: 6, flexWrap: 'wrap' }}>
                                <Icon name="clock" size={12} color={vencido ? c.textSoft : c.goldInk} />
                                <Pressable
                                  onPress={() => (bloqueado ? undefined : abrirSelectorDeHora(habit))}
                                  disabled={bloqueado}
                                  hitSlop={10}
                                  style={[styles.timeInputDirect, { backgroundColor: c.goldWash }]}
                                >
                                  <Text
                                    style={[
                                      t.micro,
                                      styles.cifras,
                                      {
                                        color: vencido ? c.textSoft : c.goldInk,
                                        fontSize: 12,
                                        fontFamily: 'Jost_700Bold',
                                        letterSpacing: 0,
                                      },
                                    ]}
                                  >
                                    {habit.time || 'Sin horario'}
                                  </Text>
                                </Pressable>
                                {habit.duration ? (
                                  <Text style={[t.micro, { color: c.textSoft }]}>({habit.duration})</Text>
                                ) : null}
                                {/* El momento del día deja de ser una píldora con borde: ya lo
                                    dice el rótulo de la sección justo arriba, así que repetirlo
                                    dentro de un recuadro era una caja de más para un dato que el
                                    ojo ya tiene. Queda como texto apagado. */}
                                <Text style={[t.micro, { color: c.textSoft }]}>{momentLabel}</Text>
                              </Row>

                              {/* D-90: el horario que YA se guardó pero todavía no rige. Sin esto,
                                  cambiar la hora de un hábito que hoy ya arrancó se veía como si
                                  no hubiera pasado nada — la hora volvía sola al valor viejo y el
                                  aprendiz concluía que no podía editar. `flexWrap` porque el
                                  texto crece con el nombre del día (AGENTS.md §2). */}
                              {habit.cambioProgramado ? (
                                <View style={[styles.cambioProgramadoPill, { backgroundColor: c.goldWash }]}>
                                  <Icon name="clock" size={11} color={c.goldInk} />
                                  <Text style={[t.micro, { color: c.goldInk, fontSize: 12, flexShrink: 1 }]}>
                                    {textoCambioProgramado(habit.cambioProgramado)}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </Row>

                          {/* Switch Activar/Pausar para el día — o el candado si todavía no le toca */}
                          <View style={{ alignItems: 'center', gap: 4 }} onStartShouldSetResponder={() => true}>
                            <Text style={[t.micro, { color: estadoColor, fontFamily: 'Jost_700Bold' }]}>
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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveSubView('main')} style={styles.backBtnRow} hitSlop={12}>
              <Icon name="arrowLeft" size={16} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                VOLVER A PLAN
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                02. OBJETIVOS (3 NIVELES)
              </Text>
            </View>
          </View>

          {/* Introducción corta arriba, detalle detrás de «Más detalles» (2026-09-21, pedido del
              dueño). El título con su párrafo se comían media pantalla antes de que apareciera
              nada útil: quien entra acá viene a ver su objetivo y su avance, no a leer cómo se
              encadenan los niveles. El párrafo es el mismo de antes, palabra por palabra — se
              lee tocando. El botón va al lado del título y no debajo justamente para no volver a
              empujar la tarjeta del objetivo hacia abajo. */}
          <View style={{ marginTop: space.gap, gap: 6 }}>
            <Row align="flex-start" gap={12}>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 20, lineHeight: 27, flex: 1 }]}>
                Tus objetivos, de los 90 días al día de hoy
              </Text>
              <Pressable
                onPress={() => setExplicacionNivelesAbierta(abierta => !abierta)}
                style={styles.verDetallesBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  explicacionNivelesAbierta
                    ? 'Ocultar cómo funcionan los tres niveles'
                    : 'Ver cómo funcionan los tres niveles'
                }
              >
                <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 14 }]}>
                  {explicacionNivelesAbierta ? 'Ver menos' : 'Más detalles'}
                </Text>
              </Pressable>
            </Row>
            {explicacionNivelesAbierta && (
              <Text style={[t.body, { color: c.textSoft }]}>
                Tres niveles encadenados: el objetivo de 90 días manda sobre la semana, y la semana
                sobre lo que haces hoy.
              </Text>
            )}
          </View>

          <View style={{ gap: space.gap, marginTop: space.gapLg, paddingBottom: 28 }}>
            {/* 1. 👑 OBJETIVO PRINCIPAL (90 DÍAS) */}
            <View style={[styles.goalCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <RowBetween>
                <Row gap={6}>
                  <Icon name="trophy" size={16} color={c.goldInk} />
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                    1. OBJETIVO PRINCIPAL (90 DÍAS)
                  </Text>
                </Row>
                {/* Relleno tenue en vez de contorno (vivía dentro del borde de la tarjeta) y
                    48 px de alto, que es el mínimo de pulsación cómoda de AGENTS.md §4: antes
                    eran 3 px de padding vertical. */}
                <Pressable
                  onPress={() => openEditGoalModal()}
                  style={[styles.editGoalBtn, { backgroundColor: c.goldWash }]}
                >
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                    ✏️ Editar
                  </Text>
                </Pressable>
              </RowBetween>

              {objetivos.cargando && !rocaAbierta ? (
                <Text style={[t.small, { color: c.textSoft, fontSize: 15, marginTop: 8 }]}>Cargando tu objetivo…</Text>
              ) : objetivos.error && !rocaAbierta ? (
                <Text style={[t.small, { color: c.danger, fontSize: 15, marginTop: 8 }]}>{objetivos.error}</Text>
              ) : !rocaAbierta ? (
                // Estado vacío real: antes acá se mostraba un objetivo inventado ("Facturar
                // $30.000 USD") que no era de nadie. Es preferible una invitación honesta.
                <Text style={[t.body, { color: c.textSoft, fontSize: 15, marginTop: 8, lineHeight: 22 }]}>
                  Todavía no definiste tu objetivo de 90 días. Toca Editar y escribe a dónde quieres
                  llegar. Si se puede medir con un número, agrégalo: vas a ver tu avance acá.
                </Text>
              ) : (
                <>
                  {/* Solo la primera cláusula (2026-09-22, pedido del dueño: "quiero poco texto").
                      Acá iba `rocaAbierta.objetivo` entero —"Al Día 90 facturaré S/ 12000
                      mensuales, partiendo de S/ 5000, con evidencia en Reportes mensuales de
                      facturacion, porque Quiero estabilidad economica…"—, un párrafo de cinco
                      líneas sobre la tarjeta que la persona abre para ver su avance.

                      Lo que se corta no se pierde: "partiendo de X" es literalmente el "Partiste
                      de X" que está tres renglones más abajo, y la evidencia y el motivo se leen
                      en el Mapa, que es donde se escriben. Queda la frase que contesta la
                      pregunta de esta pantalla: a dónde vas. */}
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17, marginTop: 6, lineHeight: 24 }]}>
                    {primeraClausula(rocaAbierta.objetivo)}
                  </Text>

                  {/* La barra solo aparece si el objetivo tiene meta medible. Un objetivo
                      cualitativo es válido y no tiene nada que graficar. */}
                  {rocaAbierta.porcentaje != null && (
                    <View style={{ gap: 4, marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>Avance cuantitativo:</Text>
                        <Text style={[t.small, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
                          {rocaAbierta.porcentaje}% CUMPLIDO
                        </Text>
                      </View>
                      {/* El riel es el propio `border` como relleno, sin contorno: una barra de
                          8 px con un borde de 1 px alrededor era una caja dentro de la caja de la
                          tarjeta, y el borde se comía un cuarto de la altura. */}
                      <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
                        <View style={[styles.progressBarFill, { width: `${rocaAbierta.porcentaje}%`, backgroundColor: c.gold }]} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                        <Text style={[t.small, styles.cifras, { color: c.textSoft, fontSize: 14 }]}>
                          Vas en: <Text style={{ color: c.goldInk, fontFamily: 'Jost_700Bold' }}>{rocaAbierta.avance} {rocaAbierta.unidad}</Text>
                        </Text>
                        <Text style={[t.small, styles.cifras, { color: c.textSoft, fontSize: 14 }]}>
                          Meta: {rocaAbierta.meta} {rocaAbierta.unidad}
                        </Text>
                      </View>
                      {/* El punto de partida se muestra porque sin él el porcentaje no se entiende:
                          con "vas en 82, meta 75" y 0 %, la pregunta obvia es "¿0 % de qué?". Solo
                          aparece en las rocas que lo tienen — las anteriores a V43 no (E-166). */}
                      {rocaAbierta.lineaBase != null && (
                        <Text style={[t.small, { color: c.micro, fontSize: 13, marginTop: 2 }]}>
                          Partiste de {rocaAbierta.lineaBase} {rocaAbierta.unidad}
                        </Text>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Dónde está parado dentro del programa. Se deriva del día, de corrido: el "mes" es un
                bloque de 4 semanas contado desde que arrancó, no un mes del calendario. */}
            <View style={[styles.goalCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
              <Row gap={8}>
                <Icon name="calendar" size={15} color={c.goldInk} />
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                  {etiquetaDelMes(mesDe(diaPrograma))}
                </Text>
              </Row>
              <Text style={[t.body, styles.cifras, { color: c.textSoft, marginTop: 6 }]}>
                Vas por la semana {semanaDe(diaPrograma)} de 12 · día {diaPrograma} de 90
              </Text>

              {/* LA CIFRA DEL MES (2026-09-22, autorizada por el dueño — ver AGENTS.md §1).
                  El escalón que faltaba entre "de dónde partes" y "dónde quieres estar al Día 90".
                  La calcula el servidor; tocarla la corrige a mano.

                  Una línea y nada más. `null` cuando el objetivo no admite cuota mensual —una
                  condición clínica, o un ritmo fuera de alcance— y ahí no se muestra nada: esta
                  tarjeta ya tiene el objetivo de 90 días entero encima. */}
              {cifraDelMesAbierto && (
                <Pressable
                  onPress={() => setEditandoMes(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar el objetivo de este mes"
                  hitSlop={8}
                >
                  <Row gap={6} style={{ marginTop: 4 }}>
                    <Text style={[t.body, styles.cifras, { color: c.textSoft }]}>
                      Este mes:{' '}
                      <Text style={{ color: c.goldInk, fontFamily: 'Jost_700Bold' }}>{cifraDelMesAbierto}</Text>
                    </Text>
                    {/* Mismo ✏️ que el botón Editar del objetivo, tres tarjetas más arriba. */}
                    <Text style={[t.micro, { color: c.micro, fontSize: 12 }]}>✏️</Text>
                  </Row>
                </Pressable>
              )}
            </View>

            {/* 2 y 3: la semana y el día. Viven en `features/objetivos/components` y no acá porque
                son un ciclo con estados propios (bloqueada / sin planificar / en curso / cerrada) y
                dos formularios de varios pasos: inline sumaban ~400 líneas a una pantalla que ya
                pasa las 2000. Además así solo se piden al backend cuando esta vista está abierta. */}
            <NivelesDelPlan
              maestras={objetivos.rocas}
              numeroSemana={semanaDe(diaPrograma)}
              diaPrograma={diaPrograma}
              onIrAlMapa={abrirMapa}
            />
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
              <View style={{ flexShrink: 1, gap: 3 }}>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>REUBICAR HÁBITO</Text>
                <Text style={[t.cardTitle, { color: c.textStrong }]}>
                  {selectedHabitForMove?.title}
                </Text>
              </View>
              <Pressable onPress={() => setMoveMomentModalVisible(false)} hitSlop={10}>
                {/* 48 px de alto: era un texto de 10.5 sin área de toque propia. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingLeft: 12 }}>
                  <Icon name="close" size={14} color={c.goldInk} />
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>Cerrar</Text>
                </View>
              </Pressable>
            </View>

            <Text style={[t.body, { color: c.textSoft, marginTop: 14 }]}>
              ¿En qué momento del día deseas ubicar este hábito?
            </Text>

            <View style={{ gap: 10, marginTop: 14 }}>
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
                  <Icon name="sun" size={20} color={c.goldInk} />
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong }]}>BLOQUE DE LA MAÑANA</Text>
                    <Text style={[t.small, styles.cifras, { color: c.textSoft }]}>05:00 AM – 12:00 PM</Text>
                  </View>
                </Row>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>Seleccionar ›</Text>
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
                  <Icon name="clock" size={20} color={c.goldInk} />
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong }]}>BLOQUE DE LA TARDE</Text>
                    <Text style={[t.small, styles.cifras, { color: c.textSoft }]}>12:00 PM – 18:00 PM</Text>
                  </View>
                </Row>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>Seleccionar ›</Text>
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
                  <Icon name="moon" size={20} color={c.goldInk} />
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong }]}>BLOQUE DE LA NOCHE</Text>
                    <Text style={[t.small, styles.cifras, { color: c.textSoft }]}>18:00 PM – 22:00 PM</Text>
                  </View>
                </Row>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>Seleccionar ›</Text>
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
              <Text style={[t.cardTitle, { color: c.goldInk }]}>CREAR NUEVO HÁBITO</Text>
              <Pressable onPress={() => setCreateHabitModalVisible(false)} hitSlop={10}>
                {/* 48 px de alto: era un texto de 10.5 sin área de toque propia. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingLeft: 12 }}>
                  <Icon name="close" size={14} color={c.goldInk} />
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>Cerrar</Text>
                </View>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled" style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, paddingVertical: 8 }}>
                {/* 1. Nombre */}
                <View style={{ gap: 4 }}>
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>1. NOMBRE DEL HÁBITO:</Text>
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
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>2. ÁREA DEL HÁBITO:</Text>
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
                          <Text style={[t.micro, { color: elegida ? c.goldInk : c.textSoft, fontFamily: 'Jost_700Bold' }]}>
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
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>3. HORA DEL DÍA:</Text>
                  <TextInput
                    value={newHabitTime}
                    onChangeText={setNewHabitTime}
                    placeholder="06:30"
                    placeholderTextColor={c.textSoft}
                    style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                  />
                  <Text style={[t.small, { color: c.textSoft }]}>
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
              <Text style={[t.cardTitle, { color: c.goldInk, flexShrink: 1 }]}>
                EDITAR OBJETIVO DE 90 DÍAS
              </Text>
              <Pressable onPress={() => setEditGoalModalVisible(false)} hitSlop={10}>
                {/* 48 px de alto: era un texto de 10.5 sin área de toque propia. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingLeft: 12 }}>
                  <Icon name="close" size={14} color={c.goldInk} />
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>Cerrar</Text>
                </View>
              </Pressable>
            </View>

            {/* El cuerpo del formulario scrollea, igual que el de "Crear hábito" unos modales más
                arriba (2026-09-14). Con los campos a tamaño de lectura y la rejilla 2×2, la
                tarjeta creció ~75 px: en un teléfono corto y con el teclado abierto, el botón de
                guardar se iba abajo del borde y no había forma de llegar a él. Esto no es un
                scroll dentro de otro scroll (AGENTS.md §2): un `Modal` no es un `ScrollView`. */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: 4 }}>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>DECLARACIÓN DEL OBJETIVO:</Text>
                <TextInput
                  value={editGoalTitle}
                  onChangeText={setEditGoalTitle}
                  placeholder="Escribe tu objetivo aquí..."
                  placeholderTextColor={c.textSoft}
                  multiline
                  style={[styles.modalInputText, { minHeight: 60, borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                />
              </View>

              {(
                <View style={{ gap: 8 }}>
                  {/* Rejilla 2x2 y no cuatro columnas (2026-09-14). Con los inputs a tamaño
                      de lectura (15 px, AGENTS.md §4) cuatro campos en una fila de teléfono dejan
                      ~48 px de texto útil cada uno, y la etiqueta "PARTISTE DE:" ya se partía en
                      dos líneas antes del cambio. `flexBasis` al 45 % con `flexWrap` da dos por
                      fila en teléfono y en tablet, sin desbordar (AGENTS.md §2). */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {/* PARTISTE DE es lo que hace que el porcentaje sirva en las dos direcciones:
                        sin él, "bajar de 82 a 75 kg" marca 100 % el primer día (E-166). */}
                    <View style={{ flexGrow: 1, flexBasis: '45%', gap: 4 }}>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>PARTISTE DE:</Text>
                      <TextInput
                        value={editGoalBase}
                        onChangeText={setEditGoalBase}
                        keyboardType="numeric"
                        placeholder="82"
                        placeholderTextColor={c.micro}
                        style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                      />
                    </View>
                    <View style={{ flexGrow: 1, flexBasis: '45%', gap: 4 }}>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>VAS EN:</Text>
                      <TextInput
                        value={editGoalCurrentVal}
                        onChangeText={setEditGoalCurrentVal}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={c.micro}
                        style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.goldInk }]}
                      />
                    </View>
                    <View style={{ flexGrow: 1, flexBasis: '45%', gap: 4 }}>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>META:</Text>
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
                    <View style={{ flexGrow: 1, flexBasis: '45%', gap: 4 }}>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 12 }]}>UNIDAD:</Text>
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
                  <Text style={[t.small, { color: c.micro }]}>
                    Si tu objetivo no se mide con un número, deja los tres campos vacíos.
                  </Text>
                </View>
              )}
            </ScrollView>

            <GoldButton
              label="✓ GUARDAR OBJETIVO"
              onPress={handleSaveGoal}
              style={{ width: '100%', marginTop: 10 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CORREGIR A MANO EL OBJETIVO DEL MES                                */}
      {/* ========================================================================= */}
      <EditarObjetivoDelMesModal
        visible={editandoMes}
        mes={mesDelEjeAbierto}
        unidad={planDelEjeAbierto?.unidad ?? ''}
        guardando={planMensual.guardando}
        onCerrar={() => setEditandoMes(false)}
        onGuardar={async cifra => {
          if (!mesDelEjeAbierto) return;
          /* El título es obligatorio en el servidor y acá no se pide: este tramo es un número, no
             una frase, y obligar a escribir una para corregir un kilo sería el "mucho texto" que el
             dueño viene sacando de las pantallas. Se arma con el rótulo que ya usa la tarjeta. */
          const resultado = await planMensual.guardarMes(ejeAbierto, mesDelEjeAbierto.numeroMes, {
            titulo: `Objetivo del mes ${mesDelEjeAbierto.numeroMes}`,
            cifra,
            unidad: planDelEjeAbierto?.unidad ?? '',
          });
          setEditandoMes(false);
          if (!resultado.ok) Alert.alert('El objetivo de este mes', resultado.mensaje);
        }}
      />

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

      {/* ========================================================================= */}
      {/* MODAL: OTRO NOMBRE PARA LA BEBIDA (solo para quien lo pide, solo día 0)    */}
      {/* ========================================================================= */}
      {habitoARenombrar !== null && (
        <RenombrarHabitoModal
          visible
          tituloCatalogo={habitoARenombrar.title}
          tituloActual={renombre.titulos[habitoARenombrar.id] ?? null}
          onGuardar={(titulo, motivo) => renombre.renombrar(habitoARenombrar.id, titulo, motivo)}
          // Solo se ofrece quitar si hay algo que quitar: el `DELETE` sobre un hábito sin renombre
          // no falla, pero un botón que no hace nada visible es peor que no tenerlo.
          onQuitar={
            renombre.titulos[habitoARenombrar.id]
              ? () => renombre.quitarRenombre(habitoARenombrar.id)
              : undefined
          }
          onCerrar={() => setHabitoARenombrar(null)}
        />
      )}
    </SafeAreaView>
  );
}

const estiloTramo = StyleSheet.create({
  riel: { height: 8, borderRadius: 4, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4 },
});

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    paddingBottom: ESPACIO_PARA_LANZADOR,
  },
  /** Cifras que cambian en pantalla: ancho de dígito fijo para que nada salte (AGENTS.md §4). */
  cifras: {
    fontVariant: ['tabular-nums'],
  },
  gauge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.gap,
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
  /**
   * Sin `borderTopWidth` (2026-09-14). Eran tres filetes horizontales cortando la pantalla en
   * bandas, y arriba de cada bloque ya hay un rótulo (`MicroLabel`) que dice dónde empieza: la
   * línea no agregaba información, solo ruido. Lo que separa un bloque del siguiente es el aire
   * — `space.gapLg`, los 28 px que la referencia del dueño usa y esta pantalla no tenía.
   */
  section: {
    marginTop: space.gapLg,
  },
  priorityCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  /**
   * El distintivo del eje principal. Relleno tenue y **sin contorno** (2026-09-14): con borde era
   * un rectángulo dentro del rectángulo de la tarjeta, que es justo el patrón que esta pasada
   * viene a quitar. `goldWash` lo distingue sin dibujar una segunda caja.
   */
  insigniaPrincipal: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  barraObjetivo: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 5,
  },
  barraObjetivoRelleno: {
    height: '100%',
    borderRadius: 3,
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
    gap: 8,
    minHeight: 48,
    paddingRight: 12,
  },
  /* Sin borde: la píldora vive pegada a la línea del encabezado, así que eran dos trazos
     discutiendo el mismo borde. El relleno (`goldWash`) la separa igual. */
  categoryPillBadge: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  createHabitBtn: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 6,
    borderRadius: space.radiusSm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitPlanCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: 14,
    gap: 4,
  },
  /* Las cuatro piezas de adentro de la tarjeta —medallón, etiqueta de categoría, hora y aviso de
     cambio programado— perdieron su borde (2026-09-14). Eran cuatro rectángulos dentro del
     rectángulo de la tarjeta; ahora se distinguen por relleno (`goldWash`) y por el aire. */
  habitIconBox: {
    width: 40,
    height: 40,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPill: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  timeInputDirect: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  cambioProgramadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
    borderRadius: space.radiusSm,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 7,
    maxWidth: '100%',
  },
  /* "Cambiarle el nombre" de las bebidas. Sin relleno ni borde: es una acción de texto dentro de
     una tarjeta que ya tiene medallón, etiqueta y píldora de hora — una caja más ahí sería ruido.
     `minHeight` de 40 con `hitSlop` de 8 para llegar al área de pulsación de AGENTS.md §4 sin
     separar visualmente la línea del título. `flexWrap` porque la etiqueta es larga y en 360 px
     no entra en una sola línea. */
  renombrarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    alignSelf: 'flex-start',
    minHeight: 40,
    maxWidth: '100%',
    paddingRight: 6,
  },
  momentMoveOptionBtn: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  goalCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  /* «Más detalles» del encabezado de Objetivos: acción de texto al lado del título, sin caja —
     una más ahí, pegada a la píldora del encabezado, sería la enésima. `minHeight` de 40 con
     `hitSlop` de 8 para llegar al área de pulsación de AGENTS.md §4 sin estirar la fila del
     título, el mismo trato que `renombrarBtn`; los 3 px de arriba lo dejan a la altura de la
     PRIMERA línea del título, que es contra la que se lee, y no centrado contra las tres.
     `flexShrink: 0` para que lo que se achique en 360 px sea el título, que sí puede seguir en
     la línea de abajo, y no la etiqueta. */
  verDetallesBtn: {
    minHeight: 40,
    justifyContent: 'flex-start',
    paddingTop: 3,
    flexShrink: 0,
  },
  editGoalBtn: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  /* `weeklyCheckRow`, `checkBoxSquare`, `dailyGoalBox` y `dailyVictoryBtn` se borraron
     (2026-09-14): eran los estilos del objetivo semanal y del diario que vivían en `useState`, y
     que se quitaron del JSX cuando esos dos niveles pasaron a `NivelesDelPlan` (ver el comentario
     de `INITIAL_GOALS` arriba). Quedaron cuatro estilos sin un solo uso. */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContentCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  /* 15 px y 48 px de alto: estaba en 12 px, por debajo del mínimo de 14 que AGENTS.md §4 fija
     para inputs — y esto lo escribe gente de 40 a 60 años en su teléfono. */
  modalInputText: {
    borderWidth: 1,
    borderRadius: space.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 15,
  },
  // Sin `flex: 1` a proposito: las 4 areas del habito viven en un contenedor con `flexWrap`, y
  // estirarlas las obligaria a entrar todas en una sola fila apretada en un telefono angosto.
  // Asi caen en dos filas de dos cuando no entran.
  categoryPickPill: {
    borderWidth: 1,
    borderRadius: space.radiusSm,
    minHeight: 48,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
