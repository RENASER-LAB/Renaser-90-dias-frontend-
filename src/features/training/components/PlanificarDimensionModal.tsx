import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { OpcionDeHoja } from '../../../components/hojaDesdeAbajo/HojaDeOpciones';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useAuth } from '../../auth/context/AuthContext';
import * as habitsApi from '../../habits/api/habitsApi';
import { FilaDeDiasDelPlan } from '../../habits/components/FilaDeDiasDelPlan';
import { RuedaAntelacionPicker } from '../../habits/components/RuedaAntelacionPicker';
import { RuedaHoraPicker } from '../../habits/components/RuedaHoraPicker';
import { ICONOS_ELEGIBLES } from '../../habits/utils/iconosDeHabito';
import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import { formatearFechaLarga } from '../../programa/hooks/useArranqueDelPrograma';
import {
  aFechaIso,
  DIAS_DEL_PLAN,
  NOMBRE_ISO_DEL_DIA,
  diasDelMesDeLaSemana,
  esPlanificable,
  type DiaDelPlan,
} from '../../habits/utils/semanaDelPlan';
// De `momentosDelDia` ya solo se usa el parseo de horas: los bloques del día salieron de la
// pantalla el 2026-09-08 y con ellos las etiquetas, los cortes y el "momento esperado".
import { aMinutos } from '../../habits/utils/momentosDelDia';
import type { CategoriaHabitoApi, PreferenciaHabitoApi } from '../../habits/types/habits.types';
import type { HabitItem } from '../../../screens/TrainingScreen';
import {
  antelacionesAMostrar,
  etiquetaDeAntelacion,
  minutosDeArranqueDeLaRueda,
  MINUTOS_OTRA_POR_DEFECTO,
} from '../../habits/utils/etiquetaDeAntelacion';
import {
  abrirPermisoDeAlarmasExactas,
  anotarQueSePidioAlarmaExacta,
  hayQuePedirAlarmaExactaAlGuardar,
  hayQueRecordarAlarmaExacta,
  LINEA_ALARMA_EXACTA_PENDIENTE,
  TEXTO_PEDIDO_ALARMA_EXACTA,
} from '../../alarmas/pedirAlarmaExacta';
import { horaDelEditor, preferenciaTrasGuardar, textoDelCambioProgramado } from '../utils/horaDelEditor';

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
 * **Sin bloques del día (2026-09-08).** Esta pantalla mostraba madrugada / mañana / tarde / noche,
 * con un "✎ AJUSTAR" para mover dónde empieza cada uno, y agrupaba la lista por ellos. **El cliente
 * pidió no verlos más.** Lo que quedó: la rueda elige la hora, la lista va en orden de reloj, y el
 * único grupo aparte es el de los hábitos que todavía no tienen hora — que es un estado real, no
 * una caja horaria. Se fue también el aviso de "despertarse de tarde": nombraba un bloque que ya
 * no está en pantalla, y contradecía la libertad total de configuración que se pidió para quien
 * trabaja de noche o de madrugada.
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
 *
 * ## LA HOJA DE SIEMPRE (rediseño de Training, 2026-10-05)
 *
 * Era una hoja hecha a mano (agarradera decorativa, borde dorado, «× CERRAR» y «← VOLVER» en
 * versalitas de 11). Ahora es `HojaDesdeAbajo` grande: se arrastra para cerrarla, la ✕ y la ‹ son de
 * 44, y el atrás de Android vuelve un paso (la ‹) antes de cerrar. Los textos van en tipo oración a
 * 15–17 px, los emojis de hábito pasaron a íconos de línea, «Pausar…» es una hoja de opciones y los
 * avisos de éxito son una línea que se va sola (`ConfirmacionEnLinea`); los errores siguen en diálogo.
 */

interface Props {
  visible: boolean;
  /**
   * La dimensión abierta, en versales (`CUERPO`): la clave que entienden la categoría del hábito
   * nuevo y los recordatorios.
   */
  dimension: string;
  /** Cómo se lee en el título (`Cuerpo`). Sin él, la clave tal cual. */
  nombreDimension?: string;
  /** Los hábitos de esa dimensión, tal cual los tiene `TrainingScreen`. */
  habits: HabitItem[];
  onCerrar: () => void;
  /** Hubo cambios: Training recarga. Con texto, lo confirma en línea (el hábito recién creado). */
  onGuardado: (confirmacion?: string) => void;
}

/** Los botones de la hoja, en tipo oración y a tamaño de lectura (no las versalitas de 11 del botón). */
const TEXTO_DE_BOTON = { fontSize: 16, letterSpacing: 0 } as const;

/** «LUN, MIÉ» → «lun, mié», para leerlo dentro de una frase. */
function diasEnFrase(dias: DiaDelPlan[]): string {
  return dias.join(', ').toLowerCase();
}

/** Un hábito de catálogo: los únicos que se pueden planificar. */
type HabitoPlanificable = HabitItem & { habitoId: string };

/**
 * Las antelaciones SUGERIDAS. `[]` = sin aviso; `0` = a la hora exacta.
 *
 * > **Corregido el 2026-09-14.** Acá decía que cuatro fijas bastaban, con el argumento de que
 * > "si alguien necesita 7 minutos, no necesita 7 minutos". El dueño pidió lo contrario: que se
 * > pueda elegir la propia. Así que estas dejan de ser el límite y pasan a ser el atajo — el que
 * > las quiera usa un toque, el que necesita 45 los busca en "Otra".
 *
 * > **Corregido el 2026-09-21.** La antelación propia se ESCRIBÍA, en un campo con teclado
 * > numérico, y el teclado del sistema se abría encima tapando el propio campo: se escribía a
 * > ciegas. Ahora "Otra" despliega una rueda de 1 a 60 minutos, la misma de la hora de arriba. El
 * > rango de la rueda no recorta lo guardado — un aviso viejo de 90 minutos sigue en la fila y
 * > sigue sonando, solo que la rueda no puede volver a fabricarlo.
 *
 * Nada cambia aguas abajo: el conjunto siempre viajó como `number[]` hasta el programador de
 * alarmas, que calcula `(hora - minutos) mod 1440` y **ya aceptaba cualquier valor**.
 */
const ANTELACIONES_SUGERIDAS: readonly number[] = [30, 10];

/**
 * Los hábitos sin hora van en su propia sección, arriba de todo. No se reparten en un bloque
 * porque no están en ninguno todavía, y esconderlos abajo dejaría lo único que hay que hacer —
 * ponerles hora — en el último lugar donde se mira.
 */
/**
 * Ya no es un bloque del día: son los dos únicos grupos que quedan tras sacarlos (2026-09-08).
 * "Sin hora" es un estado real del hábito; el resto va junto, en orden de reloj.
 */
type SeccionDeLista = 'sinHora' | 'conHora';

/** Dónde arranca la jornada cuando un hábito todavía no tiene hora. Antes salía del bloque
 *  "mañana", que el aprendiz podía mover; sin bloques es un default y nada más. */
const INICIO_DE_JORNADA_MIN = 6 * 60;

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

/**
 * Los avisos que el servidor tiene para un hábito (E-408): todos si los conoce (V81), si no el único
 * número de siempre, y nada si el recordatorio está apagado.
 */
function avisosDelServidor(p: PreferenciaHabitoApi | undefined): number[] {
  if (!p?.reminderEnabled) return [];
  if (p.reminderMinutesList && p.reminderMinutesList.length > 0) return [...p.reminderMinutesList];
  return [p.reminderMinutesBefore ?? 0];
}

export function PlanificarDimensionModal({ visible, dimension, nombreDimension, habits, onCerrar, onGuardado }: Props) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const nombre = nombreDimension ?? dimension;
  /** El hábito al que se le está eligiendo hasta cuándo pausarlo (hoja de opciones). */
  const [pausando, setPausando] = useState<HabitoPlanificable | null>(null);
  /**
   * Lo que se acaba de guardar, en una línea que se va sola (2026-10-05). Antes cada guardado abría
   * un diálogo («Horario guardado», «Listo») que había que cerrar para seguir.
   */
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const confirmar = (texto: string) => {
    tacto.logro();
    setConfirmacion({ clave: Date.now(), texto });
  };
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
  /**
   * Qué bloque mueven los − / +. Estado propio y NO derivado de la hora: mover un corte puede
   * hacer que la hora cambie de bloque, y si los botones siguieran a la hora, a mitad de un ajuste
   * pasarían a mover OTRO corte sin que la persona hiciera nada.
   */

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
  /**
   * Los días en que va a correr el hábito que se está creando. **Los siete por defecto**: es lo que
   * hacían todos los hábitos propios hasta el 2026-09-08, así que quien no toque nada obtiene el
   * mismo resultado de siempre. Se sacó del modal en E-137 porque el backend fijaba `TipoDia.TODOS`
   * y el selector era un campo muerto — un campo que el servidor no guarda es un bug esperando.
   * Vuelve ahora que `POST /api/v1/habits` acepta `activeWeekdays`.
   */
  const [diasNuevo, setDiasNuevo] = useState<Set<DiaDelPlan>>(new Set(DIAS_DEL_PLAN));
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
  const [horarioSemanal, setHorarioSemanal] =
    useState<Record<string, { hora: string | null; propio: boolean; activo: boolean }>>({});
  /**
   * Los avisos del hábito abierto, en minutos antes. Vacío = sin aviso.
   *
   * Es un conjunto porque se puede querer más de uno — "30 min antes Y a la hora" —, y cada uno es
   * una alarma diaria propia en el teléfono.
   */
  const [antelaciones, setAntelaciones] = useState<number[]>([]);
  /** E-408: qué hábito está abierto y si la persona ya tocó sus avisos (ver `abrirHabito`). */
  const abiertoRef = useRef<string | null>(null);
  const avisosTocadosRef = useRef(false);
  /**
   * Si la rueda de "Otra" está desplegada. Cerrada por defecto: la hoja no tiene scroll y cada
   * píxel de alto que se ocupa empuja el botón de guardar hacia afuera — ya pasó una vez.
   */
  const [ruedaOtraAbierta, setRuedaOtraAbierta] = useState(false);
  /** Lo que marca la rueda de "Otra" ahora mismo. Es lo que dice el botón de al lado. */
  const [minutosOtra, setMinutosOtra] = useState(MINUTOS_OTRA_POR_DEFECTO);
  /**
   * Dónde ABRE la rueda de "Otra". Es ref y no estado a propósito: `RuedaAntelacionPicker` es no
   * controlada, así que si el valor inicial cambiara en cada giro la rueda saltaría sola debajo
   * del dedo. Se fija una vez, al desplegarla, y la rueda lo lee al montarse.
   */
  const arranqueDeLaRuedaOtra = useRef(MINUTOS_OTRA_POR_DEFECTO);
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

  /**
   * El día del mes (`09`) de cada día de la semana que se está mostrando, para que la pastilla diga
   * "M 09" y no solo "M": sin el número no se sabe a qué martes le está pegando el cambio.
   *
   * `useMemo` atado a `visible` y no suelto en cada render: se construye a partir de `new Date()`,
   * así que recalcularlo dejaría que la semana se corriera a mitad de una interacción si el reloj
   * cruza la medianoche.
   */
  const diasDelMes = useMemo(() => diasDelMesDeLaSemana(), [visible]);

  useEffect(() => {
    if (!visible) return;
    setEstado('cargando');
    setHabitoEnEdicion(null);
    setPlegadas(new Set());
    setCreando(false);
    setTituloNuevo('');
    setIconoNuevo(null);
    setGuardados({});
    setHuboEscritura(false);
    setConfirmacion(null);
    setPausando(null);
    (async () => {
      try {
        const [prefs, desbloqueos] = await Promise.all([
          habitsApi.obtenerPreferencias(),
          habitsApi.obtenerPlanDesbloqueos(),
        ]);
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

  /**
   * La hora de la LISTA para un hábito: la recién guardada en esta hoja, la del backend, o la de la
   * lista de Training.
   *
   * > **Corregido 2026-09-27 (PLN-02).** Decía «La hora que rige HOY», y el editor la usaba para su
   * > «Ahora:». Con D-91 la recién guardada rige recién mañana: al reabrir el hábito decía «Ahora:
   * > 09:30» el mismo día en que todavía iba a las 09:00. Lo de hoy y lo pendiente del editor salen
   * > ahora de `horaDelEditor`; esta queda para la lista, que marca lo guardado con «✓ GUARDADO».
   */
  const horaDe = (habitoId: string, porDefecto: string) =>
    guardados[habitoId] ?? preferencias.get(habitoId)?.triggerTime?.slice(0, 5) ?? porDefecto;

  /** Minutos desde medianoche de la hora de la lista (`horaDe`). `null` = todavía no tiene hora. */
  const minutosDe = (habitoId: string, porDefecto: string): number | null =>
    aMinutos(horaDe(habitoId, porDefecto));

  const horaTexto = `${aDosDigitos(hora)}:${aDosDigitos(minuto)}`;

  const cerrar = () => (huboEscritura ? onGuardado() : onCerrar());

  /** Volver de un hábito a la lista sin guardar nada. */
  const volverALaLista = () => setHabitoEnEdicion(null);

  /**
   * Abre el editor de UN hábito con su hora ya cargada. Ese es el camino principal.
   *
   * La rueda arranca en la hora que rige DE MAÑANA EN ADELANTE: si hay un cambio guardado que todavía
   * no rige, la de ese cambio (PLN-02). Lo que se guarda desde acá rige desde mañana, así que arrancar
   * en la de hoy y guardar sin mover la rueda deshacía el cambio.
   */
  const abrirHabito = (h: HabitoPlanificable) => {
    const minutos = aMinutos(horaDelEditor(preferencias.get(h.habitoId), h.time).arranqueDeLaRueda);
    // Sin hora todavía: se propone el comienzo de la mañana, que es donde arranca la jornada.
    const inicial = minutos ?? INICIO_DE_JORNADA_MIN;
    setHora(Math.floor(inicial / 60));
    setMinuto(inicial % 60);
    setSemillaRueda(n => n + 1);
    setDiasEnEdicion([]);
    setHorarioSemanal({});
    // La rueda de "Otra" es del hábito que se estaba mirando: abrir otro con ella desplegada
    // mostraría los minutos del anterior sobre un recordatorio que todavía no terminó de cargar.
    setRuedaOtraAbierta(false);
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
              return [dia, {
                hora: d?.triggerTime?.slice(0, 5) ?? null,
                propio: d?.custom ?? false,
                // `?? true` para un backend anterior a V40, donde todos los días estaban encendidos.
                activo: d?.active ?? true,
              }];
            }),
          ),
        );
      } catch {
        // Sin horario semanal la pantalla sigue sirviendo para el horario general, que es el caso
        // de siempre. No se rompe nada: las pastillas quedan sin hora.
      }
    })();
    const previa = preferencias.get(h.habitoId);
    // E-408: lo que muestra el recordatorio sale YA de lo que dice el servidor, no de lo que quedó del
    // hábito abierto antes. Después, si el teléfono tiene sus avisos guardados, se usan esos, pero solo
    // si sigue abierto este mismo hábito y la persona todavía no tocó nada: una lectura que llega tarde
    // no puede pisar lo que se eligió (se veía «A la hora» y se guardaba sin recordatorio).
    setAntelaciones(avisosDelServidor(previa));
    abiertoRef.current = h.habitoId;
    avisosTocadosRef.current = false;
    void recordatorios.antelacionesDe(claveUsuario, h.habitoId).then(locales => {
      if (abiertoRef.current !== h.habitoId || avisosTocadosRef.current) return;
      if (locales.length > 0 && previa?.reminderEnabled !== false) setAntelaciones(locales);
    });
    setHabitoEnEdicion(h);
  };

  /** Cambiar el alcance conserva la hora elegida, tanto al añadir días como al volver a todos. */
  const volverATodos = () => setDiasEnEdicion([]);

  const alternarDia = (dia: DiaDelPlan) => {
    setDiasEnEdicion(prev => prev.includes(dia)
      ? prev.filter(d => d !== dia)
      : DIAS_DEL_PLAN.filter(d => d === dia || prev.includes(d)));
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
    // Dos plazos y nada más, porque son los dos que el backend sabe cumplir de verdad. Se eligen en
    // una hoja de opciones (2026-10-05; antes, un diálogo de tres botones). Cancelar es cerrarla.
    setPausando(h);
  };

  const pausarHasta = (h: HabitoPlanificable, soloHoy: boolean) => {
    tacto.seleccion();
    setPausando(null);
    void aplicarEstado(h.habitoId, false, soloHoy ? hoyIso : undefined);
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
        ...Object.fromEntries(guardados.map(d => [d, { hora: horaTexto, propio: true, activo: true }])),
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
    confirmar(`Queda a las ${horaTexto} los ${diasEnFrase(guardados)}, desde mañana.`);
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
        ...Object.fromEntries(dias.map(d => [d, { hora: general || null, propio: false, activo: true }])),
      }));
      setHuboEscritura(true);
      volverATodos();
    } catch (e) {
      Alert.alert('No pudimos quitarlo', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setGuardando(false);
    }
  };

  /**
   * "Los martes no": apaga el hábito esos días de la semana, todas las semanas (V40).
   *
   * NO le toca la hora: el día queda apagado, no sin horario, así que volver a encenderlo lo
   * devuelve a la que regía.
   */
  const apagarDias = async (h: HabitoPlanificable, dias: DiaDelPlan[]) => {
    setGuardando(true);
    try {
      for (const dia of dias) {
        await habitsApi.apagarDiaDeLaSemana(h.habitoId, NOMBRE_ISO_DEL_DIA[dia]);
      }
      setHorarioSemanal(prev => ({
        ...prev,
        ...Object.fromEntries(dias.map(d => [d, { ...prev[d], propio: true, activo: false }])),
      }));
      setHuboEscritura(true);
      setDiasEnEdicion([]);
      confirmar(`No va los ${diasEnFrase(dias)}. El resto de la semana sigue igual.`);
    } catch (e) {
      Alert.alert(
        'No pudimos apagarlo',
        mensajeDeError(e, 'Si es un hábito obligatorio del programa, no se puede sacar.'),
      );
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Prende o apaga un aviso. El conjunto se mantiene ordenado de la antelación mayor a la menor,
   * que es el orden en que los avisos llegan y también en el que el programador los recorre.
   */
  const alternarAntelacion = (minutos: number) => {
    tacto.seleccion();
    avisosTocadosRef.current = true;
    setAntelaciones(prev =>
      prev.includes(minutos) ? prev.filter(x => x !== minutos) : [...prev, minutos].sort((a, b) => b - a),
    );
  };

  /**
   * Despliega o pliega la rueda de "Otra".
   *
   * Al desplegarla se fija dónde abre: en el aviso que ya rige, no en el primer valor de la lista.
   * Abrir siempre en "1 min antes" obligaría a girar media rueda a quien solo quiere corregir de
   * 30 a 35.
   */
  const alternarRuedaOtra = () => {
    if (ruedaOtraAbierta) {
      setRuedaOtraAbierta(false);
      return;
    }
    const arranque = minutosDeArranqueDeLaRueda(antelaciones);
    arranqueDeLaRuedaOtra.current = arranque;
    setMinutosOtra(arranque);
    setRuedaOtraAbierta(true);
  };

  /**
   * Añade lo que marca la rueda. Queda ENCENDIDA al añadirla: nadie elige un número para después
   * tener que tocarlo, y una pastilla nueva apagada parece que no se guardó.
   *
   * Se pliega la rueda después: la pastilla recién añadida aparece en la fila de arriba, y dejar
   * la rueda abierta taparía la confirmación de lo que se acaba de hacer.
   */
  const agregarAntelacionDeLaRueda = () => {
    avisosTocadosRef.current = true;
    setAntelaciones(prev => (
      prev.includes(minutosOtra) ? prev : [...prev, minutosOtra].sort((a, b) => b - a)
    ));
    setRuedaOtraAbierta(false);
  };

  /** Guarda la hora GENERAL del hábito —todos los días— y vuelve a la lista. */
  const guardarHora = async (h: HabitoPlanificable) => {
    setGuardando(true);
    try {
      // El navegador solo permite abrir el permiso Web Push dentro de una accion del usuario.
      // Se hace antes del PATCH para conservar ese gesto; el backend se actualiza igual aunque
      // la persona rechace el permiso y la alerta final lo deja claro.
      const webPushPreparado = antelaciones.length > 0 && recordatorios.HAY_RECORDATORIOS_WEB
        ? await recordatorios.prepararWebPush()
        : null;
      // El `limitTime` que ya tenía: el PATCH reemplaza los dos campos a la vez y mandar `null`
      // le borraría la hora límite a hábitos que sí vencen dentro del día.
      const previa = preferencias.get(h.habitoId);
      // Al servidor va la antelación MÁS TEMPRANA: es lo que ese campo puede representar, y la
      // que mejor describe "cuándo hay que empezar a avisar" si algún día el push sale de ahí.
      const recordatorio = {
        activo: antelaciones.length > 0,
        minutosAntes: antelaciones.length > 0 ? Math.max(...antelaciones) : null,
        // D-217: y todos, para que otro teléfono (o este reinstalado) los reconstruya.
        lista: antelaciones.length > 0 ? antelaciones : null,
      };
      const resultado = await habitsApi.cambiarHorario(
        h.habitoId,
        `${horaTexto}:00`,
        previa?.limitTime ?? null,
        recordatorio,
      );
      // Android programa la alarma en el dispositivo. Web registra la suscripción del navegador
      // y los dos avisos los envía el scheduler del backend para esta misma persona.
      const ok = recordatorios.HAY_RECORDATORIOS_WEB
        ? (antelaciones.length === 0 || webPushPreparado === true)
        : resultado.deferred && resultado.deferredEffectiveDate
          // D-217: el cambio rige desde su fecha (D-91), y la alarma también: hoy suena a la hora de
          // hoy y la nueva empieza ese día. Antes la diaria se movía en el acto y hoy sonaba a la nueva.
          ? await recordatorios.programarConCambioDiferido(claveUsuario, h.habitoId, h.title, {
            horaDeHoy: horaDelEditor(previa, h.time).ahora,
            horaNueva: horaTexto,
            desde: resultado.deferredEffectiveDate,
          }, antelaciones, { dimension })
          : await recordatorios.programar(claveUsuario, h.habitoId, h.title, horaTexto, antelaciones, { dimension });
      const avisoImposible = antelaciones.length > 0 && !ok;
      // El horario local se actualiza acá y no recargando todo: recargar con la hoja abierta
      // reordenaría la lista debajo del dedo. Diferido (D-91), la hora de hoy no cambia y el cambio
      // queda pendiente, como lo devolverá el servidor al reabrir la hoja (PLN-02).
      setPreferencias(prev => {
        const siguiente = new Map(prev);
        siguiente.set(
          h.habitoId,
          preferenciaTrasGuardar(prev.get(h.habitoId), {
            habitoId: h.habitoId,
            titulo: h.title,
            horaDeLaTarjeta: h.time,
            horaNueva: horaTexto,
            recordatorio,
            resultado,
          }),
        );
        return siguiente;
      });
      setGuardados(prev => ({ ...prev, [h.habitoId]: horaTexto }));
      setHuboEscritura(true);
      setHabitoEnEdicion(null);
      const cuando = resultado.deferredEffectiveDate
        ? `el ${formatearFechaLarga(resultado.deferredEffectiveDate)}`
        : 'mañana';
      const corto = `«${h.title}» queda a las ${horaTexto}` + (resultado.deferred ? ` desde ${cuando}.` : '.');
      const mensaje = corto +
        (avisoImposible
          ? `\n\nEl recordatorio quedó guardado, pero ${recordatorios.HAY_RECORDATORIOS_WEB ? 'este navegador no tiene el permiso Web Push' : 'este teléfono no tiene permiso para avisarte'}. Habilita las notificaciones para recibir las dos alertas.`
          : '');
      // D-217: con el primer recordatorio, si Android no deja alarmas exactas, se pide acá mismo —una
      // sola vez— en vez de dejar que suene hasta 40 min tarde sin que nadie lo sepa.
      // Después, si sigue negado, solo una línea corta; el diálogo no vuelve a abrirse (dueño, 28/09).
      const conAviso = antelaciones.length > 0 && ok;
      if (conAviso && (await hayQuePedirAlarmaExactaAlGuardar(claveUsuario))) {
        await anotarQueSePidioAlarmaExacta(claveUsuario);
        Alert.alert('Listo', `${mensaje}\n\n${TEXTO_PEDIDO_ALARMA_EXACTA}`, [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Permitir', onPress: () => void abrirPermisoDeAlarmasExactas() },
        ]);
      } else if (avisoImposible) {
        // Sin permiso el aviso no va a sonar: eso hay que leerlo, así que va en diálogo.
        Alert.alert('Hora guardada', mensaje);
      } else if (conAviso && (await hayQueRecordarAlarmaExacta(claveUsuario))) {
        confirmar(`${corto} ${LINEA_ALARMA_EXACTA_PENDIENTE}`);
      } else {
        confirmar(corto);
      }
    } catch (e) {
      Alert.alert('No pudimos guardar la hora', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Guarda, y nada más.
   *
   * **Sacado el 2026-09-08 junto con los bloques del día**: acá había un aviso —"despertarse de
   * tarde", "dormir de mañana"— que nombraba el bloque en el que caía la hora elegida. Con los
   * bloques fuera de la pantalla, el aviso hablaba de algo que el aprendiz ya no ve; y era además
   * lo contrario de lo que se pidió, que es **libertad total para configurar los hábitos**: quien
   * trabaja de noche duerme a las 09:00 y no tiene por qué justificarse ante un diálogo.
   */
  const intentarGuardar = (h: HabitoPlanificable) => {
    if (diasEnEdicion.length > 0) {
      void guardarDias(h, diasEnEdicion);
      return;
    }
    void guardarHora(h);
  };

  /** Los días en que corre ESTE hábito — informativo: es el alcance del cambio. */
  const diasDe = (h: HabitoPlanificable) => h.diasCatalogo ?? todosLosDias();

  /**
   * Dos grupos, no cuatro bloques: los que todavía no tienen hora, y el resto EN ORDEN DE RELOJ.
   *
   * **Cambiado el 2026-09-08 por decisión del cliente**: antes esto repartía los hábitos en
   * madrugada / mañana / tarde / noche. Los bloques se sacaron de toda la pantalla, así que
   * agrupar por ellos dejaría de tener sentido — y ordenar por hora dice lo mismo que decían los
   * cuatro encabezados, sin partir el día en cajas que no son de nadie.
   */
  const porSeccion = (): { seccion: SeccionDeLista; habitos: HabitoPlanificable[] }[] => {
    const sinHora: HabitoPlanificable[] = [];
    const conHora: HabitoPlanificable[] = [];
    for (const h of planificables) {
      const minutos = minutosDe(h.habitoId, h.time);
      if (minutos === null) sinHora.push(h);
      else conHora.push(h);
    }
    conHora.sort((a, b) => (minutosDe(a.habitoId, a.time) ?? 0) - (minutosDe(b.habitoId, b.time) ?? 0));
    // Un grupo vacío NO se dibuja: un encabezado con cero filas es ruido, no información.
    return ([
      { seccion: 'sinHora' as const, habitos: sinHora },
      { seccion: 'conHora' as const, habitos: conHora },
    ]).filter(g => g.habitos.length > 0);
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
  /**
   * Prender y apagar un día del hábito que se está creando. **No se puede dejar ninguno**: un
   * hábito que no corre ningún día no es un hábito, es una fila que no genera nada.
   */
  const alternarDiaNuevo = (dia: DiaDelPlan) => {
    if (!(diasNuevo.has(dia) && diasNuevo.size === 1)) tacto.seleccion();
    setDiasNuevo(prev => {
      const siguiente = new Set(prev);
      if (siguiente.has(dia)) {
        if (siguiente.size === 1) return prev;
        siguiente.delete(dia);
      } else {
        siguiente.add(dia);
      }
      return siguiente;
    });
  };

  const crearHabito = async () => {
    const titulo = tituloNuevo.trim();
    if (!titulo) {
      Alert.alert('Falta el nombre', 'Escribe cómo se llama el hábito.');
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
        // Los siete no se mandan: omitirlo ya significa "todos" del lado del servidor, y así el
        // cuerpo dice lo mismo que decía antes cuando el aprendiz no eligió nada.
        activeWeekdays: diasNuevo.size === DIAS_DEL_PLAN.length
          ? undefined
          : DIAS_DEL_PLAN.filter(d => diasNuevo.has(d)).map(d => NOMBRE_ISO_DEL_DIA[d]),
      });
      setHuboEscritura(true);
      setCreando(false);
      setTituloNuevo('');
      setIconoNuevo(null);
      setDiasNuevo(new Set(DIAS_DEL_PLAN));
      // Acá SÍ se recarga todo: el hábito nuevo no está en `habits`, que viene de la pantalla de
      // atrás, así que la única forma de verlo es que Training vuelva a pedir su lista. La hoja se
      // cierra y Training lo confirma en línea, arriba de la lista (2026-10-05; antes, un diálogo).
      const cuando = diasNuevo.size === DIAS_DEL_PLAN.length
        ? 'todos los días'
        : `los ${diasEnFrase(DIAS_DEL_PLAN.filter(d => diasNuevo.has(d)))}`;
      onGuardado(`Hábito creado: «${titulo}», a las ${horaTexto}, ${cuando}.`);
    } catch (e) {
      Alert.alert('No pudimos crear el hábito', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Una fila de la lista. Tocarla abre su hora; el interruptor de la derecha la prende o apaga.
   *
   * El interruptor y el candado van AL LADO de lo que abre el editor, no adentro (PLN-03, e2e web del
   * 2026-09-27): en la web, el clic del `Switch` (un `<input type="checkbox">`) subía hasta el
   * `Pressable` de la fila y abría también el editor, detrás del diálogo de pausa. En el teléfono no
   * pasaba porque el interruptor nativo se queda con el toque. Se ve igual: el borde y el relleno de
   * la fila son los de siempre, repartidos entre las dos partes.
   *
   * 2026-10-05: el ícono de línea del hábito en vez del emoji, el título a 16, la hora a 14 y
   * «Guardado» / «Pausado» en tipo oración a 14 (eran versalitas de 10).
   */
  const filaDeHabito = (h: HabitoPlanificable) => {
    const horaGuardada = guardados[h.habitoId];
    const horaActual = horaDe(h.habitoId, h.time);
    const tieneHora = minutosDe(h.habitoId, h.time) !== null;
    const activo = !pausados.has(h.habitoId);
    return (
      <View
        key={h.habitoId}
        style={[styles.filaHabito, { borderColor: c.border, opacity: activo ? 1 : 0.55 }]}
      >
        <Presionable
          onPress={() => abrirHabito(h)}
          accessibilityRole="button"
          accessibilityLabel={`${h.title}, ${tieneHora ? `a las ${horaActual}` : 'sin hora'}${activo ? '' : ', pausado'}`}
          contenedorStyle={styles.filaHabitoAbrirArea}
          style={styles.filaHabitoAbrir}
        >
          <View style={[styles.iconoHabito, { backgroundColor: c.goldWash }]}>
            <Icon name={h.icon ?? 'target'} size={TAMANO_ICONO.normal} color={c.goldInk} />
          </View>

          <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
            <Text style={[t.body, { color: c.text, fontSize: 16 }]} numberOfLines={2}>
              {h.title}
            </Text>
            <View style={styles.filaMeta}>
              <Text style={[t.small, styles.hora, { color: c.textSoft }]}>
                {tieneHora ? horaActual : 'Toca para ponerle hora'}
              </Text>
              {horaGuardada && (
                <View style={styles.marca}>
                  <Icon name="check" size={TAMANO_ICONO.chico} color={c.success} />
                  <Text style={[t.small, styles.marcaTexto, { color: c.success }]}>Guardado</Text>
                </View>
              )}
              {!activo && (
                <Text style={[t.small, styles.marcaTexto, { color: c.danger }]}>Pausado</Text>
              )}
            </View>
          </View>

          <Icon name="chevron" size={TAMANO_ICONO.normal} color={c.chevron} />
        </Presionable>

        {h.isDeactivatable === false ? (
          // SIN `hitSlop`: el candado ya mide 48×48, de sobra para el dedo (AGENTS.md §4), y el
          // hitSlop de 10px le agregaba área hacia la IZQUIERDA — se comía los 8px de `gap` y
          // llegaba a tapar el chevron. Como un Pressable anidado se queda con el toque, tocar la
          // flecha de "abrir" en un hábito OBLIGATORIO disparaba "no se puede pausar" en vez de
          // abrir el editor: la hora de los obligatorios no había forma de cambiarla desde acá.
          // Los no obligatorios llevan un Switch en ese lugar, sin hitSlop, y por eso no fallaban.
          <Presionable
            onPress={() => alternarActivo(h)}
            accessibilityRole="button"
            accessibilityLabel={`${h.title} es obligatorio del programa`}
            style={styles.candado}
          >
            <Icon name="lock" size={TAMANO_ICONO.normal} color={c.tabInactive} />
          </Presionable>
        ) : (
          <Switch
            value={activo}
            disabled={enVuelo.has(h.habitoId)}
            onValueChange={() => alternarActivo(h)}
            trackColor={{ false: '#332C20', true: c.gold }}
            thumbColor={activo ? '#1E1B18' : '#888'}
          />
        )}
      </View>
    );
  };

  /** Las horas del hábito abierto en el paso 2: la de hoy, la del cambio pendiente (PLN-02). */
  const horasDelHabitoAbierto = habitoEnEdicion
    ? horaDelEditor(preferencias.get(habitoEnEdicion.habitoId), habitoEnEdicion.time)
    : null;

  /** Una pastilla de recordatorio: elegida = borde dorado y relleno, como antes; texto a 14. */
  const pastilla = (on: boolean) => [
    styles.pastillaAntelacion,
    { borderColor: on ? c.gold : c.border, backgroundColor: on ? c.cardBgAlt : 'transparent' },
  ];
  const textoPastilla = (on: boolean) => [t.small, styles.textoPastilla, { color: on ? c.goldInk : c.textSoft }];
  const rotulo = [t.body, styles.rotulo, { color: c.goldInk }];

  const lineaConfirmacion = confirmacion ? (
    <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} />
  ) : null;

  const paso: 'lista' | 'habito' | 'nuevo' = creando ? 'nuevo' : habitoEnEdicion ? 'habito' : 'lista';
  const tituloDeLaHoja =
    paso === 'habito' && habitoEnEdicion ? habitoEnEdicion.title
      : paso === 'nuevo' ? `Hábito nuevo en ${nombre}`
        : `Planificar ${nombre}`;
  const subtituloDeLaHoja =
    estado !== 'listo' ? undefined
      : paso === 'habito' ? `Ahora: ${horasDelHabitoAbierto?.ahora || 'sin hora'}`
        : paso === 'nuevo' ? 'Es tuyo: puedes pausarlo cuando quieras.'
          : 'Toca uno para cambiarle la hora.';

  const pie =
    estado === 'listo' && paso === 'habito' && habitoEnEdicion ? (
      <GoldButton
        label={
          guardando
            ? 'Guardando…'
            : diasEnEdicion.length === 0
              ? `Guardar ${horaTexto} · todos los días`
              : `Guardar ${horaTexto} · ${diasEnFrase(diasEnEdicion)}`
        }
        onPress={() => intentarGuardar(habitoEnEdicion)}
        disabled={guardando}
        textStyle={TEXTO_DE_BOTON}
        style={{ width: '100%' }}
      />
    ) : estado === 'listo' && paso === 'nuevo' ? (
      <GoldButton
        label={guardando ? 'Creando…' : `Crear a las ${horaTexto}`}
        onPress={() => void crearHabito()}
        disabled={guardando}
        textStyle={TEXTO_DE_BOTON}
        style={{ width: '100%' }}
      />
    ) : undefined;

  return (
    <>
      <HojaDesdeAbajo
        visible={visible}
        alCerrar={cerrar}
        alVolver={paso === 'nuevo' ? () => setCreando(false) : paso === 'habito' ? volverALaLista : undefined}
        etiquetaVolver="Volver a la lista"
        etiquetaCerrar="Cerrar Planificar"
        titulo={tituloDeLaHoja}
        subtitulo={subtituloDeLaHoja}
        tamano="grande"
        pie={pie}
      >
        {estado === 'cargando' && (
          <Text style={[t.body, styles.estadoCentrado, { color: c.textSoft }]}>Cargando horarios…</Text>
        )}

        {estado === 'error' && (
          <Text style={[t.body, styles.estadoCentrado, { color: c.textSoft }]}>
            No pudimos cargar los horarios de esta dimensión.
          </Text>
        )}

        {/* =================================================================== */}
        {/* PASO 1 — LA LISTA. Encontrar el hábito y, si hace falta, apagarlo.  */}
        {/* La ayuda de arriba quedó en una línea en el subtítulo de la hoja:   */}
        {/* el interruptor se explica solo (2026-10-05).                        */}
        {/* =================================================================== */}
        {estado === 'listo' && paso === 'lista' && (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            contentContainerStyle={[styles.cuerpoLista, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}
            showsVerticalScrollIndicator={false}
          >
            {lineaConfirmacion}

            {planificables.length === 0 && (
              <Text style={[t.body, { color: c.textSoft, paddingVertical: 16 }]}>
                Todavía no hay hábitos en esta dimensión.
              </Text>
            )}

            {porSeccion().map(({ seccion, habitos }) => {
              const plegada = plegadas.has(seccion);
              const esSinHora = seccion === 'sinHora';
              const etiqueta = esSinHora ? 'Sin hora todavía' : 'Tu día';
              return (
                <View key={seccion} style={{ gap: 8 }}>
                  {/* Antes: «🕗 TU DÍA (7) ▾» y «⏳ SIN HORA TODAVÍA» en versalitas de 11, con el
                      triángulo de texto. Ahora reloj o reloj de arena de línea y un chevron. */}
                  <Presionable
                    onPress={() => alternarSeccion(seccion)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !plegada }}
                    accessibilityLabel={`${etiqueta}, ${habitos.length} ${habitos.length === 1 ? 'hábito' : 'hábitos'}`}
                    style={[styles.cabezaSeccion, { borderBottomColor: c.divider }]}
                  >
                    <Icon name={esSinHora ? 'hourglass' : 'clock'} size={TAMANO_ICONO.normal} color={c.goldInk} />
                    <Text style={[t.body, styles.rotulo, { color: c.textStrong, flex: 1 }]}>
                      {etiqueta} ({habitos.length})
                    </Text>
                    <View style={{ transform: [{ rotate: plegada ? '0deg' : '90deg' }] }}>
                      <Icon name="chevron" size={TAMANO_ICONO.normal} color={c.textSoft} />
                    </View>
                  </Presionable>

                  {!plegada && habitos.map(h => filaDeHabito(h))}
                </View>
              );
            })}

            {/* Crear un hábito propio, en la dimensión que está abierta. Solo en las cuatro que
                son categorías de verdad: VIDA Y NEGOCIO son rocas, de otro módulo.
                2026-10-05: una fila más de la lista, con su «+», en vez del recuadro punteado en
                versalitas. */}
            {categoriaDeLaDimension && (
              <Presionable
                onPress={() => {
                  const inicio = INICIO_DE_JORNADA_MIN;
                  setHora(Math.floor(inicio / 60));
                  setMinuto(inicio % 60);
                  setSemillaRueda(n => n + 1);
                  setTituloNuevo('');
                  setIconoNuevo(null);
                  setDiasNuevo(new Set(DIAS_DEL_PLAN));
                  setConfirmacion(null);
                  setCreando(true);
                }}
                accessibilityRole="button"
                style={[styles.crearHabito, { borderColor: c.border }]}
              >
                <View style={[styles.iconoHabito, { backgroundColor: c.goldWash }]}>
                  <Icon name="plus" size={TAMANO_ICONO.normal} color={c.goldInk} />
                </View>
                <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_500Medium', fontSize: 16 }]}>
                  Crear un hábito
                </Text>
              </Presionable>
            )}
          </ScrollView>
        )}

        {/* =================================================================== */}
        {/* PASO 2 — UN HÁBITO. Una sola decisión: a qué hora.                  */}
        {/* Sin scroll a propósito: las ruedas se pelearían por el dedo con un   */}
        {/* ScrollView (AGENTS.md §2). El botón de guardar va fijo en el pie.    */}
        {/* =================================================================== */}
        {estado === 'listo' && paso === 'habito' && habitoEnEdicion && (
          <View style={styles.cuerpo}>
            {lineaConfirmacion}

            {/* El cambio ya guardado que todavía no rige (D-91), con la misma frase que la tarjeta
                del hábito en Plan. Sin esto, «Ahora: 09:00» parecía decir que el cambio no se
                había guardado (PLN-02). Solo aparece cuando hay uno: la hoja no tiene scroll y cada
                renglón empuja el botón de guardar. */}
            {horasDelHabitoAbierto?.programado && (
              <View style={[styles.cambioProgramado, { backgroundColor: c.goldWash }]}>
                <Icon name="clock" size={TAMANO_ICONO.chico} color={c.goldInk} />
                <Text style={[t.body, { color: c.goldInk, fontSize: 16, lineHeight: 22, flexShrink: 1 }]}>
                  {textoDelCambioProgramado(horasDelHabitoAbierto.programado)}
                </Text>
              </View>
            )}

            {/* Los bloques del día (madrugada / mañana / tarde / noche) se sacaron el
                2026-09-08 por decisión del cliente: no los quiere ver. Con ellos se fue el
                "✎ AJUSTAR", que era la única forma de moverlos. La hora se elige libre en la
                rueda y ya — es lo mismo que pedía el caso de quien trabaja de noche. */}
            <View style={{ paddingTop: 4, paddingBottom: 2 }}>
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
            {/* LOS DÍAS, tocables (V39). Tocar uno pasa a editar SU hora; tocarlo de nuevo vuelve
                al horario general. Cada pastilla muestra la hora que rige ese día, así que la fila
                entera se lee de un vistazo: "los lunes 05:00, el resto 09:00". */}
            <View style={styles.filaTituloCompacta}>
              <Text style={rotulo} numberOfLines={1}>
                {diasEnEdicion.length === 0 ? 'Todos los días' : `Solo ${diasEnFrase(diasEnEdicion)}`}
              </Text>
              {diasEnEdicion.length > 0 && (
                <Presionable
                  onPress={volverATodos}
                  accessibilityRole="button"
                  accessibilityLabel="Volver a todos los días"
                  style={styles.enlaceTodos}
                >
                  <Icon name="arrowLeft" size={TAMANO_ICONO.chico} color={c.goldInk} />
                  <Text style={[t.small, styles.marcaTexto, { color: c.goldInk }]}>Todos</Text>
                </Presionable>
              )}
            </View>
            {/* La fila salió a `FilaDeDiasDelPlan` (2026-09-22) para que el planificador de las
                acciones del día use la MISMA, en vez de una copia. Acá no cambió nada: los mismos
                días, el mismo candado de D-91 y las mismas medidas. */}
            <FilaDeDiasDelPlan
              corre={diasDe(habitoEnEdicion)}
              horarios={horarioSemanal}
              enEdicion={diasEnEdicion}
              onAlternarDia={alternarDia}
            />
            {/* La ayuda, corta (2026-10-05; eran dos frases a 10,5 px). */}
            <Text style={[t.small, { color: c.textSoft, marginTop: 6 }]}>
              {diasEnEdicion.length === 0
                ? 'Toca un día para darle su propia hora. Hoy y lo pasado van con candado.'
                : `Solo ${diasEnFrase(diasEnEdicion)}, todas las semanas. Hoy no cambia.`}
            </Text>

            {/* Apagar esos días, o volver a encenderlos. Se ofrece una cosa o la otra según cómo
                estén los marcados: mostrar las dos sería pedir que la persona adivine cuál aplica.
                "No hacer" es una decisión de peso: botón con borde y alto de toque cómodo
                (AGENTS.md §4). En un hábito OBLIGATORIO no aparece: esos se pueden mover de hora
                pero no sacar. 2026-10-05: ⊘ y ↺ de texto pasan a íconos de línea. */}
            {diasEnEdicion.length > 0
              && habitoEnEdicion.isDeactivatable !== false
              && diasEnEdicion.every(d => horarioSemanal[d]?.activo !== false) && (
              <Presionable
                onPress={() => void apagarDias(habitoEnEdicion, diasEnEdicion)}
                accessibilityRole="button"
                style={[styles.accionApagar, { borderColor: c.danger }]}
              >
                <Icon name="ban" size={TAMANO_ICONO.normal} color={c.danger} />
                <Text style={[t.body, styles.textoAccion, { color: c.danger }]}>
                  No hacerlo los {diasEnFrase(diasEnEdicion)}
                </Text>
              </Presionable>
            )}

            {diasEnEdicion.length > 0 && diasEnEdicion.every(d => horarioSemanal[d]?.activo === false) && (
              <Presionable
                onPress={() => void quitarDias(habitoEnEdicion, diasEnEdicion)}
                accessibilityRole="button"
                style={[styles.accionApagar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
              >
                <Icon name="rotateCcw" size={TAMANO_ICONO.normal} color={c.goldInk} />
                <Text style={[t.body, styles.textoAccion, { color: c.goldInk }]}>
                  Volver a hacerlo los {diasEnFrase(diasEnEdicion)}
                </Text>
              </Presionable>
            )}

            {/* Los obligatorios se pueden mover de hora, no sacar. Decirlo evita que alguien
                busque un botón que no está. */}
            {diasEnEdicion.length > 0 && habitoEnEdicion.isDeactivatable === false && (
              <View style={[styles.accionApagar, { borderColor: c.border }]}>
                <Icon name="lock" size={TAMANO_ICONO.chico} color={c.tabInactive} />
                <Text style={[t.small, { color: c.textSoft, flexShrink: 1 }]}>
                  Obligatorio del programa: puedes cambiarle la hora, no sacarlo
                </Text>
              </View>
            )}

            {/* Solo cuando TODOS los marcados tienen hora propia Y están encendidos: ofrecer
                "quitar la hora" de un día apagado no significa nada. */}
            {diasEnEdicion.length > 0
              && diasEnEdicion.every(d => horarioSemanal[d]?.propio && horarioSemanal[d]?.activo !== false) && (
              <Presionable
                onPress={() => void quitarDias(habitoEnEdicion, diasEnEdicion)}
                accessibilityRole="button"
                hitSlop={8}
                style={{ marginTop: 8, minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={[t.small, { color: c.textSoft, textDecorationLine: 'underline' }]}>
                  Quitar la hora propia de {diasEnFrase(diasEnEdicion)}
                </Text>
              </Presionable>
            )}

            {/* En Android es alarma local; en web es Web Push y los dos avisos salen del
                scheduler del backend. Expo Go sigue sin ofrecer el canal remoto. */}
            {/* E-408: guardar días no guarda el recordatorio; con días elegidos no se ofrece. */}
            {recordatorios.HAY_RECORDATORIOS && diasEnEdicion.length > 0 && (
              <Text style={[t.small, { color: c.textSoft, marginTop: 12 }]}>
                El recordatorio se elige sin días marcados.
              </Text>
            )}
            {recordatorios.HAY_RECORDATORIOS && diasEnEdicion.length === 0 && (
              <>
                <Text style={[rotulo, { marginTop: 14 }]}>
                  Recordatorio{antelaciones.length > 1 ? ` · ${antelaciones.length} avisos` : ''}
                </Text>
                <View style={styles.filaAntelaciones}>
                  {/* "Sin aviso" no es una opción más: es el conjunto vacío, y por eso va aparte
                      y no compite con las otras tres. */}
                  <Presionable
                    onPress={() => { tacto.seleccion(); avisosTocadosRef.current = true; setAntelaciones([]); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: antelaciones.length === 0 }}
                    contenedorStyle={styles.pastillaArea}
                    style={pastilla(antelaciones.length === 0)}
                  >
                    <Text style={textoPastilla(antelaciones.length === 0)} numberOfLines={1}>Sin aviso</Text>
                  </Presionable>
                  {/* Las sugeridas MAS las que la persona haya escrito, en orden de tiempo:
                      primero el aviso que llega antes. "A la hora" va al final, aparte, porque
                      no es una antelacion sino el momento exacto. */}
                  {antelacionesAMostrar(ANTELACIONES_SUGERIDAS, antelaciones).map(minutos => {
                    const on = antelaciones.includes(minutos);
                    return (
                      <Presionable
                        key={minutos}
                        onPress={() => alternarAntelacion(minutos)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`${etiquetaDeAntelacion(minutos)}${on ? ', activado' : ''}`}
                        contenedorStyle={styles.pastillaArea}
                        style={pastilla(on)}
                      >
                        <Text style={textoPastilla(on)} numberOfLines={1}>
                          {etiquetaDeAntelacion(minutos)}
                        </Text>
                      </Presionable>
                    );
                  })}
                  <Presionable
                    onPress={() => alternarAntelacion(0)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: antelaciones.includes(0) }}
                    accessibilityLabel={`A la hora exacta${antelaciones.includes(0) ? ', activado' : ''}`}
                    contenedorStyle={styles.pastillaArea}
                    style={pastilla(antelaciones.includes(0))}
                  >
                    <Text style={textoPastilla(antelaciones.includes(0))} numberOfLines={1}>A la hora</Text>
                  </Presionable>
                  {/* "Otra" ABRE UNA RUEDA, no un teclado (2026-09-21). Era un `TextInput` con
                      `keyboardType="number-pad"`: al tocarlo el teclado del sistema subía y
                      tapaba el propio campo, así que se escribía a ciegas. La rueda se despliega
                      debajo y solo cuando se pide, porque cada píxel de alto empuja el botón de
                      guardar fuera de la hoja. */}
                  <Presionable
                    onPress={alternarRuedaOtra}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: ruedaOtraAbierta }}
                    accessibilityLabel="Otra antelación, elegir los minutos en una rueda"
                    contenedorStyle={styles.pastillaArea}
                    style={pastilla(ruedaOtraAbierta)}
                  >
                    <Text style={textoPastilla(ruedaOtraAbierta)} numberOfLines={1}>Otra</Text>
                  </Presionable>
                </View>

                {/* La rueda y su botón van en UNA fila horizontal: apilados sumaban casi 200 px
                    de alto y el botón de guardar se caía de la hoja. Al lado, la rueda cuesta
                    sus 132 px y nada más. */}
                {ruedaOtraAbierta && (
                  <View style={styles.filaRuedaOtra}>
                    <RuedaAntelacionPicker
                      minutosIniciales={arranqueDeLaRuedaOtra.current}
                      onCambiar={setMinutosOtra}
                    />
                    <Presionable
                      onPress={agregarAntelacionDeLaRueda}
                      accessibilityRole="button"
                      accessibilityLabel={`Añadir ${etiquetaDeAntelacion(minutosOtra)}`}
                      contenedorStyle={styles.pastillaArea}
                      style={[pastilla(true), styles.conIcono]}
                    >
                      {/* El botón repite lo que marca la rueda, igual que el de guardar repite
                          la hora: es la confirmación de lo que se va a añadir, y de paso dice
                          que esos números sueltos son minutos. */}
                      <Icon name="plus" size={TAMANO_ICONO.chico} color={c.goldInk} />
                      <Text style={textoPastilla(true)} numberOfLines={1}>
                        Añadir {etiquetaDeAntelacion(minutosOtra)}
                      </Text>
                    </Presionable>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* =================================================================== */}
        {/* PASO 3 — HÁBITO NUEVO. Nombre y hora, nada más: la categoría sale de */}
        {/* la dimensión que ya está abierta y los días son todos.               */}
        {/* =================================================================== */}
        {estado === 'listo' && paso === 'nuevo' && (
          <View style={styles.cuerpo}>
            <TextInput
              value={tituloNuevo}
              onChangeText={setTituloNuevo}
              placeholder="Caminar 30 minutos"
              placeholderTextColor={c.tabInactive}
              accessibilityLabel="Nombre del hábito"
              style={[styles.campoTitulo, { borderColor: c.border, color: c.text, backgroundColor: c.cardBgAlt }]}
              maxLength={80}
              returnKeyType="done"
            />

            <Text style={[rotulo, { marginTop: 14 }]}>Elige un ícono</Text>
            {/* Los mismos iconos del catálogo, no una lista aparte: así un hábito propio se ve
                igual de curado que uno del programa. Sin elegir ninguno se guarda `null` y el
                hábito hereda el de su categoría, que es como nacían todos hasta ahora.
                2026-10-05: de línea, por la misma clave (antes, la grilla de emojis). */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.grillaIconos}
              keyboardShouldPersistTaps="handled"
            >
              {ICONOS_ELEGIBLES.map(({ clave, icono, nombre: nombreDelIcono }) => {
                const elegido = iconoNuevo === clave;
                return (
                  <Presionable
                    key={clave}
                    onPress={() => {
                      tacto.seleccion();
                      setIconoNuevo(elegido ? null : clave);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: elegido }}
                    accessibilityLabel={nombreDelIcono}
                    style={[
                      styles.opcionIcono,
                      {
                        borderColor: elegido ? c.gold : c.border,
                        backgroundColor: elegido ? c.goldWash : 'transparent',
                      },
                    ]}
                  >
                    <Icon name={icono} size={TAMANO_ICONO.grande} color={elegido ? c.goldInk : c.textSoft} />
                  </Presionable>
                );
              })}
            </ScrollView>

            <Text style={[rotulo, { marginTop: 12 }]}>¿A qué hora?</Text>
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
            {/* Los días en que corre. Volvió el 2026-09-08, cuando el backend pasó a aceptar
                `activeWeekdays`: antes era un campo que la app mostraba y el servidor tiraba a la
                basura, y por eso E-137 lo sacó del modal. */}
            <Text style={[rotulo, { marginTop: 12 }]}>¿Qué días?</Text>
            <View style={styles.filaDias}>
              {DIAS_DEL_PLAN.map(dia => {
                const corre = diasNuevo.has(dia);
                return (
                  <Presionable
                    key={dia}
                    onPress={() => alternarDiaNuevo(dia)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: corre }}
                    contenedorStyle={{ flex: 1 }}
                    style={[
                      styles.pastillaDia,
                      {
                        borderColor: corre ? c.gold : c.border,
                        backgroundColor: corre ? c.cardBgAlt : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[t.small, styles.textoPastilla, { color: corre ? c.goldInk : c.textSoft }]}>
                      {dia.charAt(0) + dia.slice(1).toLowerCase()}
                    </Text>
                  </Presionable>
                );
              })}
            </View>
            <Text style={[t.small, { color: c.textSoft, marginTop: 8 }]}>
              {diasNuevo.size === DIAS_DEL_PLAN.length
                ? 'Los 7 días. Toca uno para sacarlo.'
                : `${diasNuevo.size} ${diasNuevo.size === 1 ? 'día' : 'días'} por semana.`}
              {' '}Un hábito propio no vence.
            </Text>
          </View>
        )}
      </HojaDesdeAbajo>

      {/* «¿Hasta cuándo lo pausamos?» (2026-10-05): una hoja con las dos opciones que el backend sabe
          cumplir, encima de la de Planificar. Era un diálogo de tres botones; cancelar es cerrarla. */}
      <HojaDesdeAbajo
        visible={pausando !== null}
        alCerrar={() => setPausando(null)}
        titulo={pausando ? `Pausar «${pausando.title}»` : 'Pausar'}
        subtitulo="¿Hasta cuándo?"
        etiquetaCerrar="No pausar"
      >
        <View style={{ paddingBottom: 4 }}>
          {pausando && (
            <>
              <OpcionDeHoja etiqueta="Solo hoy" detalle="Vuelve mañana" elegida={false} alTocar={() => pausarHasta(pausando, true)} />
              <OpcionDeHoja etiqueta="Hasta que yo lo reactive" elegida={false} alTocar={() => pausarHasta(pausando, false)} />
            </>
          )}
        </View>
      </HojaDesdeAbajo>
    </>
  );
}

const styles = StyleSheet.create({
  estadoCentrado: {
    textAlign: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  cuerpoLista: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  cuerpo: {
    flex: 1,
    paddingHorizontal: 20,
  },
  /** Rótulo de un bloque de la hoja: tipo oración a 15 (eran versalitas de 10,5–11). */
  rotulo: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Jost_500Medium',
  },
  // La fila tiene dos partes (PLN-03): lo que abre el editor y, al lado, el interruptor o el candado.
  // El relleno de siempre (10 por lado) quedó repartido: el derecho acá, el resto en `filaHabitoAbrir`.
  filaHabito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingRight: 10,
    minHeight: 60,
  },
  filaHabitoAbrirArea: {
    flex: 1,
    flexShrink: 1,
    alignSelf: 'stretch',
  },
  // Se estira al alto de la fila y lleva su relleno: tocar arriba o abajo del título sigue abriendo.
  filaHabitoAbrir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
    paddingVertical: 10,
  },
  iconoHabito: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  hora: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  marcaTexto: {
    fontSize: 14,
    fontFamily: 'Jost_500Medium',
  },
  // 48×48 y no 44: es el mínimo cómodo de AGENTS.md §4, y hace innecesario el `hitSlop` que le
  // robaba el toque al chevron de la fila. Crece 2px por lado, que caben en el `gap` de 8.
  // `marginVertical: 10` es el relleno vertical que la fila le daba antes de partirse (PLN-03): sin
  // él, las filas de los obligatorios quedaban 12 px más bajas que antes (de 70 a 58).
  candado: {
    width: 48,
    height: 48,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabezaSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    gap: 10,
  },
  crearHabito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 56,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  // «Desde el lunes 28 de septiembre: 09:30» (PLN-02): el mismo lavado dorado que la tarjeta del
  // hábito en Plan, a lo ancho de la hoja para que entre en un renglón a 16 px.
  cambioProgramado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  filaTituloCompacta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 6,
    gap: 10,
    minHeight: 44,
  },
  enlaceTodos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  // Alto de toque cómodo y borde propio: "no hacerlo" es una decisión de peso y tiene que verse
  // como una acción, no como una nota al pie (AGENTS.md §4).
  accionApagar: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    borderWidth: 1.2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 10,
  },
  textoAccion: {
    fontFamily: 'Jost_500Medium',
    flexShrink: 1,
  },
  filaAntelaciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  /* 31 % y no 47 %: desde que se puede elegir una antelación propia hay hasta seis elementos en
     esta fila, y a dos por renglón el botón de guardar quedaba fuera de la hoja —que no tiene
     scroll a propósito—. A tres por renglón entran en el mismo alto de antes. La altura de 44 no
     se toca: es el mínimo cómodo para el dedo (AGENTS.md §4). El ancho va en el área táctil
     (`Presionable`), el dibujo la llena. */
  pastillaArea: {
    flexGrow: 1,
    minWidth: '31%',
  },
  pastillaAntelacion: {
    minHeight: 44,
    borderWidth: 1.2,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  textoPastilla: {
    fontSize: 14,
    fontFamily: 'Jost_500Medium',
  },
  conIcono: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
  },
  /* La rueda de "Otra" y su botón, uno al lado del otro. `alignItems: 'center'` para que el
     botón quede a la altura de la franja central de la rueda, que es la fila que cuenta. */
  filaRuedaOtra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  campoTitulo: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 52,
    fontSize: 16,
    fontFamily: 'Jost_400Regular',
  },
  // Tira HORIZONTAL y no una grilla que envuelve: 17 iconos en dos o tres filas empujaban la rueda
  // fuera de la hoja, y un ScrollView vertical acá adentro se pelearía con las ruedas por el dedo
  // (AGENTS.md §2). En horizontal no compiten: cada uno se lleva su propio eje.
  grillaIconos: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingRight: 8,
  },
  opcionIcono: {
    width: 48,
    height: 48,
    borderRadius: 13,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaDias: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  pastillaDia: {
    minHeight: 44,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
