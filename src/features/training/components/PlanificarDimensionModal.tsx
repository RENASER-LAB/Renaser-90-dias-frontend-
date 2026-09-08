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

  /** La hora que rige HOY para un hábito: la recién guardada, la del backend, o la de la lista. */
  const horaDe = (habitoId: string, porDefecto: string) =>
    guardados[habitoId] ?? preferencias.get(habitoId)?.triggerTime?.slice(0, 5) ?? porDefecto;

  /** Minutos desde medianoche de la hora que rige hoy. `null` = todavía no tiene hora. */
  const minutosDe = (habitoId: string, porDefecto: string): number | null =>
    aMinutos(horaDe(habitoId, porDefecto));

  const horaTexto = `${aDosDigitos(hora)}:${aDosDigitos(minuto)}`;

  const cerrar = () => (huboEscritura ? onGuardado() : onCerrar());

  /** Volver de un hábito a la lista sin guardar nada. */
  const volverALaLista = () => setHabitoEnEdicion(null);

  /** Abre el editor de UN hábito con su hora ya cargada. Ese es el camino principal. */
  const abrirHabito = (h: HabitoPlanificable) => {
    const minutos = aMinutos(horaDe(h.habitoId, h.time));
    // Sin hora todavía: se propone el comienzo de la mañana, que es donde arranca la jornada.
    const inicial = minutos ?? INICIO_DE_JORNADA_MIN;
    setHora(Math.floor(inicial / 60));
    setMinuto(inicial % 60);
    setSemillaRueda(n => n + 1);
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
  /** Lleva la rueda a una hora concreta. `null` cae en el comienzo de la jornada. */
  const moverRueda = (hhmm: string | null) => {
    const minutos = aMinutos(hhmm) ?? INICIO_DE_JORNADA_MIN;
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
      Alert.alert(
        'Listo',
        `“${h.title}” no va los ${dias.join(', ').toLowerCase()}. El resto de la semana sigue igual.`,
      );
    } catch (e) {
      Alert.alert(
        'No pudimos apagarlo',
        mensajeDeError(e, 'Si es un hábito obligatorio del programa, no se puede sacar.'),
      );
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
        `“${h.title}” queda a las ${horaTexto}.` +
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
    const tieneHora = minutosDe(h.habitoId, h.time) !== null;
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
              {tieneHora ? horaActual : 'Tocá para ponerle hora'}
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
          // SIN `hitSlop`: el candado ya mide 48×48, de sobra para el dedo (AGENTS.md §4), y el
          // hitSlop de 10px le agregaba área hacia la IZQUIERDA — se comía los 8px de `gap` y
          // llegaba a tapar el chevron. Como un Pressable anidado se queda con el toque, tocar la
          // flecha de "abrir" en un hábito OBLIGATORIO disparaba "no se puede pausar" en vez de
          // abrir el editor: la hora de los obligatorios no había forma de cambiarla desde acá.
          // Los no obligatorios llevan un Switch en ese lugar, sin hitSlop, y por eso no fallaban.
          <Pressable onPress={() => alternarActivo(h)} style={styles.candado}>
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
                            {esSinHora ? '⏳ SIN HORA TODAVÍA' : '🕗 TU DÍA'} ({habitos.length})
                          </Text>
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
                      const inicio = INICIO_DE_JORNADA_MIN;
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

              {/* Los bloques del día (madrugada / mañana / tarde / noche) se sacaron el
                  2026-09-08 por decisión del cliente: no los quiere ver. Con ellos se fue el
                  "✎ AJUSTAR", que era la única forma de moverlos. La hora se elige libre en la
                  rueda y ya — es lo mismo que pedía el caso de quien trabaja de noche. */}
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
                  // D-98/D-91: el día en curso y los ya pasados no se planifican. El servidor
                  // empieza a contar en `hoy.plusDays(1)`, así que guardar sobre hoy no cambiaría
                  // hoy — dejarlo tocable sería ofrecer algo que el backend no va a hacer.
                  const planificable = esPlanificable(dia);
                  const bloqueado = !corre || !planificable;
                  return (
                    <Pressable
                      key={dia}
                      // Un día en que el hábito NO corre no se puede editar: la hora de un día que
                      // no existe no significa nada. Eso lo decide el catálogo, no el aprendiz.
                      onPress={() => !bloqueado && alternarDia(dia)}
                      disabled={bloqueado}
                      style={[
                        styles.pastillaDia,
                        {
                          borderColor: editando ? c.gold : c.border,
                          backgroundColor: editando ? c.gold : 'transparent',
                          opacity: bloqueado ? 0.35 : 1,
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
                      {/* El día del mes: convierte "el martes" en "el martes 09". */}
                      <Text
                        style={[
                          t.micro,
                          { fontSize: 9.5, fontWeight: '700', color: editando ? c.onGold : c.textSoft },
                        ]}
                      >
                        {diasDelMes[dia]}
                      </Text>
                      {/* Un candado en vez de la hora cuando el día ya no se puede planificar:
                          atenuarlo solo diría "algo pasa acá", y el candado dice qué pasa. Mismo
                          criterio que el interruptor bloqueado de `PlanScreen`. */}
                      {corre && !planificable && (
                        <Icon name="lock" size={11} color={c.tabInactive} />
                      )}
                      {corre && planificable && (
                        <Text
                          style={[
                            t.micro,
                            {
                              fontSize: 8.5,
                              color: editando
                                ? c.onGold
                                : delDia?.activo === false
                                  ? '#E06A66'
                                  : delDia?.propio
                                    ? c.gold
                                    : c.textSoft,
                              fontWeight: delDia?.propio ? '700' : '400',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {delDia?.activo === false ? 'no va' : (delDia?.hora ?? '·')}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 5, lineHeight: 14 }]}>
                {diasEnEdicion.length === 0
                  ? 'Tocá uno o varios días para darles su propia hora. Lo de hoy y lo que ya pasó va con candado: se planifica de mañana en adelante.'
                  : `Solo ${diasEnEdicion.join(', ').toLowerCase()}, todas las semanas. El día en curso no se reacomoda.`}
              </Text>

              {/* Apagar esos días, o volver a encenderlos. Se ofrece una cosa o la otra según cómo
                  estén los marcados: mostrar las dos sería pedir que la persona adivine cuál aplica. */}
              {/* "No hacer" es una decisión de peso y estaba como un renglón de texto perdido entre
                  otros dos. Ahora es un botón con borde y alto de toque cómodo (AGENTS.md §4): se
                  ve, se entiende que es una acción, y no se toca sin querer.
                  En un hábito OBLIGATORIO no aparece: esos se pueden mover de hora pero no sacar. */}
              {diasEnEdicion.length > 0
                && habitoEnEdicion.isDeactivatable !== false
                && diasEnEdicion.every(d => horarioSemanal[d]?.activo !== false) && (
                <Pressable
                  onPress={() => void apagarDias(habitoEnEdicion, diasEnEdicion)}
                  style={[styles.accionApagar, { borderColor: '#E06A66' }]}
                >
                  <Text style={[t.micro, { color: '#E06A66', fontSize: 11.5, fontWeight: '700' }]}>
                    ⊘ NO HACERLO LOS {diasEnEdicion.join(', ')}
                  </Text>
                </Pressable>
              )}

              {diasEnEdicion.length > 0 && diasEnEdicion.every(d => horarioSemanal[d]?.activo === false) && (
                <Pressable
                  onPress={() => void quitarDias(habitoEnEdicion, diasEnEdicion)}
                  style={[styles.accionApagar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
                >
                  <Text style={[t.micro, { color: c.gold, fontSize: 11.5, fontWeight: '700' }]}>
                    ↺ VOLVER A HACERLO LOS {diasEnEdicion.join(', ')}
                  </Text>
                </Pressable>
              )}

              {/* Los obligatorios se pueden mover de hora, no sacar. Decirlo evita que alguien
                  busque un botón que no está. */}
              {diasEnEdicion.length > 0 && habitoEnEdicion.isDeactivatable === false && (
                <View style={[styles.accionApagar, { borderColor: c.border, flexDirection: 'row', gap: 8 }]}>
                  <Icon name="lock" size={13} color={c.tabInactive} />
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
                    Obligatorio del programa: podés cambiarle la hora, no sacarlo
                  </Text>
                </View>
              )}

              {/* Solo cuando TODOS los marcados tienen hora propia Y están encendidos: ofrecer
                  "quitar la hora" de un día apagado no significa nada. */}
              {diasEnEdicion.length > 0
                && diasEnEdicion.every(d => horarioSemanal[d]?.propio && horarioSemanal[d]?.activo !== false) && (
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
                Un hábito propio corre los 7 días y no vence: la hora lo ubica en tu jornada.
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
  // Cuatro bloques en una sola fila dejarían el rango ilegible en un teléfono angosto; `47%` los
  // acomoda en 2x2 y en tablet vuelven a entrar de a cuatro solos.
  filaDias: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  // Alto para TRES renglones: la letra del día, su número del mes y la hora que rige ese día.
  // Subió de 48 a 58 al agregarse el número: con 48 los tres se apretaban y el de la hora quedaba
  // recortado en pantallas compactas. Sigue por encima del mínimo de AGENTS.md §4.
  pastillaDia: {
    flex: 1,
    minHeight: 58,
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
  // Alto de toque cómodo y borde propio: "no hacerlo" es una decisión de peso y tiene que verse
  // como una acción, no como una nota al pie (AGENTS.md §4).
  accionApagar: {
    minHeight: 48,
    borderWidth: 1.2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 10,
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
  // 48×48 y no 44: es el mínimo cómodo de AGENTS.md §4, y hace innecesario el `hitSlop` que le
  // robaba el toque al chevron de la fila. Crece 2px por lado, que caben en el `gap` de 8.
  candado: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
