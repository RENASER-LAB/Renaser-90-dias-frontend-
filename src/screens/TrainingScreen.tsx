import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { Alert } from '../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { ScreenHeader, MicroLabel } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { useTraining } from '../features/training/hooks/useTraining';
import { ProximoAVencerCard } from '../features/training/components/ProximoAVencerCard';
import { EvidenciaHabitoModal } from '../features/habits/components/EvidenciaHabitoModal';
import { sellarRocaDiaria } from '../features/objetivos/utils/sellarRocaDiaria';
import { PlanificarDimensionModal } from '../features/training/components/PlanificarDimensionModal';
import { completarRegistro, confirmarEvidencia } from '../features/habits/api/evidenciaHabitoApi';
import { mensajeDeError } from '../services/http/apiClient';
import { CLAVE_SISTEMA_PASTILLA_RENACER } from '../features/spirit/api/spiritApi';
import { escucharPostDiarioCerrado } from '../features/habits/events/avisoPostDiarioCerrado';
import { PastillaRenacerModal } from '../features/spirit/components/PastillaRenacerModal';
import type { AudioterapiaSemanal } from '../features/habits/api/audioterapiaApi';
import { audioDeLaAudioterapia, audioDeLaPastilla } from '../features/spirit/types/audioGuiado';
import { obtenerAudioterapiaSemanal } from '../features/habits/api/audioterapiaApi';
import { useEspiritu } from '../features/spirit/hooks/useEspiritu';
import { ClaseDiariaModal } from '../features/academy/components/ClaseDiariaModal';
import { useClaseDiaria } from '../features/academy/hooks/useClaseDiaria';
import type { ClaseDiariaApi } from '../features/academy/types/academy.types';
import { irAPestana } from '../navigation/navegacionRef';
import { useProgramaDia } from '../features/programa/hooks/useProgramaDia';
import * as recordatorios from '../features/habits/notificaciones/recordatoriosDeHabito';
import {
  diaAnterior,
  formatearFechaLarga,
  useArranqueDelPrograma,
} from '../features/programa/hooks/useArranqueDelPrograma';
import { borradorEspiritu } from '../features/spirit/storage/borradorEspiritu';
import type { DayOfWeek } from './PlanScreen';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';
import { RenombrarHabitoModal } from '../features/habits/components/RenombrarHabitoModal';
import { useRenombreLocal } from '../features/habits/hooks/useRenombreDeHabito';
import { esRenombrable, tituloVisible } from '../features/habits/utils/renombreDeHabito';
import { useAuth } from '../features/auth/context/AuthContext';

/**
 * Habitos con FLUJO PROPIO: no se cierran con el checkbox ni subiendo un archivo. Se ramifica por
 * `clave_sistema` del catalogo y NUNCA por titulo — el titulo es editable desde el panel admin, y
 * emparejar por texto haria desaparecer la funcion en silencio el dia que alguien lo renombre.
 */
const CLAVE_SISTEMA_CLASE_DIARIA = 'DAILY_CLASS';
/** La Audioterapia Semanal. Se ramifica por la clave, nunca por el título (ver `openEvidenceModal`). */
const CLAVE_SISTEMA_AUDIOTERAPIA = 'AUDIO_THERAPY_WEEKLY';
const CLAVE_SISTEMA_POST_COMUNIDAD = 'COMMUNITY_POST';
/**
 * D-97: en estos dos la evidencia ES el instante en que se toca el boton (queda en
 * `completado_en`). No hay archivo que subir ni texto que escribir: se completa directo.
 */
const CLAVES_SOLO_HORA: ReadonlySet<string> = new Set(['WAKE_UP', 'SLEEP']);

export interface HabitItem {
  id: string;
  dimension: 'CUERPO' | 'MENTE' | 'EMOCIONES' | 'ESPÍRITU' | 'VIDA Y NEGOCIO';
  title: string;
  time: string;
  tag: string;
  streak: number;
  done: boolean;
  hasEvidence: boolean;
  /**
   * `false` = el catálogo ya desbloqueó este hábito pero todavía no existe su registro de HOY
   * (`habit-tracks/today` no lo generó — bug de backend real, ver nota grande en
   * `useTraining.ts`). Con `false`, el check y "Subir evidencia" se deshabilitan: no hay ningún
   * id de registro real al que atarlos. "Planificar" sigue funcionando igual, porque solo
   * necesita `habitoId`.
   */
  tieneTrackHoy: boolean;
  note?: string;
  /**
   * Clave FUNCIONAL del hábito de catálogo (`DAILY_CLASS`, `PASTILLA_RENACER`…), `null` en las
   * rocas y en los hábitos personales. Es lo que ya emite `useTraining` y lo único estable para
   * reconocer un hábito puntual: el título lo puede renombrar el propio aprendiz.
   */
  systemKey?: string | null;
  /**
   * Id real del hábito de catálogo (`habitos.id`), distinto de `id` (que acá es el id del
   * *track* del día). Lo usa el botón "Planificar" para llamar a `habit-preferences` y
   * `habit-unlocks` — mismos endpoints que ya usa Plan. `null` en las rocas (VIDA Y NEGOCIO no
   * es un hábito de este módulo, así que ahí no hay nada que planificar por acá).
   */
  habitoId?: string | null;
  /** `false` = obligatorio del programa, el interruptor de Planificar queda bloqueado en ON. */
  isDeactivatable?: boolean;
  /**
   * `REQUIRED` = este hábito no se puede dar por cumplido sin subir la prueba.
   *
   * Lo decide la APP, no el servidor: `POST /habit-tracks/{id}/complete` **no mira la exigencia**
   * —`OBLIGATORIA` solo aparece en mapeos de DTO y de persistencia, en ningún guard del cierre—,
   * así que si el check llamara directo cerraría hábitos de evidencia obligatoria sin evidencia.
   */
  evidenceRequirement?: string;
  /**
   * Emoji propio del hábito, ya resuelto por `mapearPlanHabit` a partir de `iconKey` del backend
   * (`SLEEP` → 😴, `WATER` → 💧…). Distingue una fila de otra dentro de la misma dimensión, cosa
   * que el icono de categoría no podía: ahí los seis de CUERPO eran el mismo símbolo.
   */
  icon?: string;
  /**
   * Los mismos 7 días que ya pinta Plan para este hábito (catálogo + pausa aplicada,
   * `PlanHabit.days`) — solo para sembrar la fila decorativa de días en "Planificar", sin
   * recalcular nada acá.
   */
  diasCatalogo?: Record<DayOfWeek, boolean>;
  /** Lo que la persona escribió al completar el registro (`RegistroHabito.respuestaTexto`). */
  respuestaTexto?: string | null;
  /**
   * Puntos que paga completarlo AHORA, tal como los calcula el backend (D-97). `null` cuando el
   * hábito ya está en estado terminal o cuando el backend todavía no manda el campo.
   *
   * No se calcula acá a propósito: la escala es una regla de negocio del servidor, y si el
   * cliente la reimplementa, el día que cambie el aprendiz ve un número y cobra otro.
   */
  pointsAtStake?: number | null;
  /** Techo de la escala (hoy 10), para poder decir "6 de 10" sin hardcodear la constante. */
  maxPoints?: number | null;
  /** Instante ISO en que se bloquea. `null` si no vence — es el que ordena "el próximo a vencer". */
  deadline?: string | null;
}

interface DimensionConfig {
  key: 'CUERPO' | 'MENTE' | 'EMOCIONES' | 'ESPÍRITU' | 'VIDA Y NEGOCIO';
  title: string;
  sub: string;
  icon: IconName;
}

const DIMENSIONES_CONFIG: DimensionConfig[] = [
  {
    key: 'CUERPO',
    title: 'CUERPO',
    sub: 'Fuerza somática · Movilidad · Energía',
    icon: 'body',
  },
  {
    key: 'MENTE',
    title: 'MENTE',
    sub: 'Enfoque · Mentalidad · Aprendizaje',
    icon: 'brain',
  },
  {
    key: 'EMOCIONES',
    title: 'EMOCIONES',
    sub: 'Gestión Emocional · Relaciones · Propósito',
    icon: 'heart',
  },
  {
    key: 'ESPÍRITU',
    title: 'ESPÍRITU',
    sub: 'Propósito · Fe · Gratitud',
    icon: 'spark',
  },
  {
    key: 'VIDA Y NEGOCIO',
    title: 'VIDA Y NEGOCIO',
    sub: 'Hábitos · Entorno · Estilo de Vida · Estrategia',
    icon: 'briefcase',
  },
];

// `INITIAL_HABITS` se eliminó: eran 17 hábitos inventados que no existen en el catálogo, y 11 de
// ellos venían con `done: true`, `hasEvidence: true` y `streak: 37` — es decir, la pantalla
// mostraba hábitos ya marcados como hechos y con evidencia que nadie había hecho ni subido.
// `useTraining` ya distingue "todavía no respondió" de "respondió vacío", así que la pantalla
// arranca en [] y dibuja esqueleto / error / estado vacío según corresponda.

export default function TrainingScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
  const medallionSize = rs(42);

  // Selected Dimension State
  const [selectedDimension, setSelectedDimension] = useState<DimensionConfig | null>(null);
  const [innerTab, setInnerTab] = useState<'habitos' | 'guias'>('habitos');

  // Habits State
  // Los hábitos de CUERPO/MENTE/EMOCIONES/ESPÍRITU (habit-tracks/today) y la roca del día de VIDA
  // Y NEGOCIO (rocks/today) vienen del backend real. La distinción importante: "todavía no
  // respondió" y "respondió con cero ítems" NO son lo mismo. Mientras carga se dibuja un
  // esqueleto y si falla un mensaje con reintento — nunca hábitos de relleno, que además venían
  // premarcados como hechos y con evidencia. Una vez que responde bien se usa lo que trajo tal
  // cual, aunque venga vacío: un aprendiz sin hábitos generados o sin roca del día es un estado
  // legítimo (día 0, o su plan todavía no se generó), no un error.
  const {
    habits: habitsDelBackend,
    planHabits: planHabitsDelBackend,
    loading: cargandoBackend,
    error: errorBackend,
    recargar: recargarEntrenamiento,
  } = useTraining();
  /**
   * ¿El programa de esta persona ya arrancó?
   *
   * > **Hueco cerrado 2026-09-07.** Plan ya tenía esta compuerta desde D-84 y Training NO, así que
   * > antes del Día 1 esta pantalla mostraba las cinco dimensiones con sus hábitos y el botón de
   * > subir evidencia habilitado, como si el programa estuviera corriendo. Es el mismo problema
   * > que D-84 describe para Plan: la pantalla no mentía por un texto, mentía por dejar hacer.
   *
   * Se reusa el hook de Plan tal cual, sin reglas propias — incluida la de D-103: quien eligió
   * empezar MAÑANA sí puede organizar hoy ("hoy se organiza mañana"), y solo se bloquea a quien
   * empieza pasado mañana o más tarde. Si esa regla cambia, tiene que cambiar en un solo lugar y
   * valer para las dos pantallas.
   */
  const { diaPrograma, loading: cargandoDiaPrograma } = useProgramaDia();
  const arranque = useArranqueDelPrograma(!cargandoDiaPrograma && diaPrograma === 0);
  const programaSinArrancar =
    arranque.estado === 'PENDIENTE_ELEGIR' || arranque.estado === 'ESPERANDO_INICIO';

  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [planHabits, setPlanHabits] = useState<HabitItem[]>([]);
  useEffect(() => {
    if (!cargandoBackend && !errorBackend) {
      setHabits(habitsDelBackend);
      setPlanHabits(planHabitsDelBackend);
    }
  }, [cargandoBackend, errorBackend, habitsDelBackend, planHabitsDelBackend]);

  // El habito de post diario lo cierra el compositor del Muro, en OTRA pestana (E-117). Sin esto,
  // la persona lee "hábito completado" alla y vuelve a encontrar la tarjeta sin tildar, porque
  // `useTraining` carga una sola vez al montarse. No se marca nada a mano: se recarga del backend,
  // que es la unica fuente de verdad.
  useEffect(() => escucharPostDiarioCerrado(() => void recargarEntrenamiento()), [recargarEntrenamiento]);

  // Evidence Upload Modal State
  // El estado de la subida en sí (archivo elegido, nota, error, envío en curso) vive dentro de
  // `EvidenciaHabitoModal`. Acá solo queda CUÁL hábito tiene el modal abierto.
  const [activeEvidenceHabit, setActiveEvidenceHabit] = useState<HabitItem | null>(null);

  /**
   * "Planificar" — ahora es UNA opción grande de la dimensión entera, no un botón chico por
   * hábito (pedido del dueño 2026-09-07).
   *
   * > Antes cada tarjeta tenía un "PLAN" al costado de "SUBIR", en la misma fila angosta. Eso era
   * > el estorbo: la tarjeta tiene un solo trabajo, que es entregar la evidencia, y competía con
   * > un botón que se usa una vez cada tanto. Planificar subió al encabezado de la categoría y la
   * > hoja deja elegir a qué hábitos aplicar — a todos o a uno solo, que es el mismo caso de antes.
   *
   * Acá solo vive si la hoja está abierta; la edición en sí es de `PlanificarDimensionModal`.
   */
  const [planificarVisible, setPlanificarVisible] = useState(false);


  /**
   * "Pastilla Renacer" (modulo Espiritu). Es un habito con FLUJO PROPIO: no se cierra subiendo
   * evidencia sino escuchando el audio del dia y contestando, y su estado vive en otra tabla del
   * backend. Todo el flujo esta en `features/spirit/`; aca solo queda si el modal esta abierto.
   *
   * El estado se pide al MONTAR la pantalla, no al tocar la tarjeta, y eso es a proposito: la
   * respuesta trae la URL firmada del audio, asi que cuando la persona abre el modal ya no hay que
   * esperar ninguna llamada de red antes de empezar a bajar el mp3 (requisito: que suene en menos
   * de 3 segundos). Ver el javadoc de `useEspiritu`.
   */
  const [pastillaVisible, setPastillaVisible] = useState(false);
  const { user } = useAuth();
  // Renombrar las dos bebidas (D-127). Va ACA y no solo en Plan: la subvista de habitos de Plan
  // no tiene quien la abra --`setActiveSubView('habitos')` no se llama desde ningun lado--, asi
  // que el boton que vivia alla era inalcanzable. Esta lista, en cambio, es la que la persona
  // mira todos los dias. Comprobado en pantalla el 2026-09-15.
  const renombre = useRenombreLocal(user?.id ?? null);
  const [habitoARenombrar, setHabitoARenombrar] = useState<HabitItem | null>(null);

  /**
   * El aviso de los domingos para armar la semana (pedido del dueño 2026-09-07).
   *
   * Vive acá y no en la hoja de planificar porque es del PROGRAMA, no de un hábito ni de una
   * dimensión: uno solo por persona. Ponerlo en la hoja lo habría multiplicado por cuatro y habría
   * dado a entender que es del hábito que estás mirando.
   *
   * `null` mientras no se sabe: en web y en Expo Go no hay alarmas locales y la tarjeta no aparece,
   * en vez de ofrecer un aviso que nunca sonaría.
   */
  const [repasoSemanal, setRepasoSemanal] = useState<boolean | null>(null);
  useEffect(() => {
    if (!user?.id || !recordatorios.HAY_RECORDATORIOS_LOCALES) return;
    void recordatorios.tieneRepasoSemanal(user.id).then(setRepasoSemanal);
  }, [user?.id]);

  const alternarRepasoSemanal = async (querido: boolean) => {
    if (!user?.id) return;
    setRepasoSemanal(querido);
    if (!querido) {
      await recordatorios.cancelarRepasoSemanal(user.id);
      return;
    }
    const ok = await recordatorios.programarRepasoSemanal(user.id);
    if (!ok) {
      // Sin permiso no se promete nada: el interruptor vuelve solo y se dice por qué.
      setRepasoSemanal(false);
      Alert.alert(
        'Falta el permiso de notificaciones',
        'Habilita las notificaciones de la app para que podamos avisarte los domingos.',
      );
    }
  };
  const espiritu = useEspiritu();
  /** El dia en curso, o el ya entregado de hoy para poder releer lo que escribio. */
  const diaDePastilla = espiritu.diaEnCurso ?? espiritu.diaEntregadoHoy;

  /**
   * "Clase diaria". Tampoco se cierra subiendo evidencia: hay que ver la leccion del dia y escribir
   * que se entendio. El backend hace las DOS escrituras (cerrar el registro y marcar la leccion
   * vista) dentro del mismo POST, asi que no existe un estado intermedio "completado sin resumen":
   * si el modal se cierra sin querer, el habito sigue pendiente y se reintenta desde aca.
   *
   * A diferencia de Pastilla, la clase se pide BAJO DEMANDA (`abrir()`): Training se abre muchas
   * veces al dia y esta llamada solo hace falta cuando la persona toca ese habito puntual.
   */
  const [claseDiariaVisible, setClaseDiariaVisible] = useState(false);
  const [habitoClaseDiaria, setHabitoClaseDiaria] = useState<HabitItem | null>(null);
  const claseDiaria = useClaseDiaria();

  // New Custom Habit Modal State

  // Interceptar gestos de retroceso en pantalla táctil (Xiaomi / Android / iOS Edge Swipe)
  useSystemBackHandler(() => {
    // `PastillaRenacerModal` ya cablea su propio retroceso (para poder guardar el borrador antes
    // de cerrar). Esta rama es la red de seguridad por si el orden de registro de los dos
    // handlers cambia: el gesto lateral tiene que cerrar el modal, nunca la app.
    if (pastillaVisible) {
      setPastillaVisible(false);
      return true;
    }
    // Cerrar es SIEMPRE gratis y nunca completa: el registro solo se cierra con el POST del
    // resumen. Por eso el gesto lateral puede cerrar sin miedo a perder nada guardado.
    if (claseDiariaVisible) {
      setClaseDiariaVisible(false);
      claseDiaria.limpiar();
      return true;
    }
    if (activeEvidenceHabit !== null) {
      setActiveEvidenceHabit(null);
      return true;
    }
    // La hoja de planificar también tiene que cerrarse con el gesto lateral, no minimizar la app
    // (AGENTS.md §6). Va después de la evidencia y antes de la dimensión: es una capa por encima
    // del detalle de categoría y por debajo de un modal de evidencia abierto sobre ella.
    if (planificarVisible) {
      setPlanificarVisible(false);
      return true;
    }
    if (selectedDimension !== null) {
      setSelectedDimension(null);
      return true;
    }
    return false; // Permite el comportamiento por defecto si está en el menú raíz
  }, pastillaVisible || claseDiariaVisible || activeEvidenceHabit !== null || planificarVisible || selectedDimension !== null);

  /** Lleva al muro con el compositor abierto. Reusa el parametro que ComunidadScreen ya entiende. */
  const abrirMuroParaPublicar = () => {
    irAPestana('Comunidad', { abrirComposerMuro: true });
  };

  /**
   * Tocar el hábito de la Clase Diaria lleva PRIMERO a ver la clase, no a escribir sobre ella.
   *
   * Antes abría directo el formulario "¿qué entendiste de la clase?" con la lección reducida a un
   * enlace arriba. O sea, pedía el resumen de algo que la persona todavía no había visto: bastaba
   * escribir quince letras para completar el hábito sin mirar nada, y quien sí quería verla tenía
   * que descubrir que ese recuadro era un enlace.
   *
   * Ahora decide con `leccionCompletada`, que el backend expone desde 2026-09-05:
   *  - lección sin ver  -> se navega a la lección; el resumen no se pide todavía;
   *  - lección ya vista -> se abre el resumen, porque el paso 1 ya está cumplido;
   *  - hábito ya cerrado -> el modal muestra en solo lectura lo que escribió (no se lo manda de
   *    vuelta a la clase por algo que ya terminó).
   *
   * El modal se abre igual antes del `await` para que el toque tenga respuesta inmediata: si la
   * decisión es ir a la lección, `irALaLeccionDelDia` lo cierra.
   */
  const abrirClaseDiaria = async (habit: HabitItem) => {
    setHabitoClaseDiaria(habit);
    setClaseDiariaVisible(true);
    const clase = await claseDiaria.abrir();
    const yaEscribioElResumen = Boolean(habit.respuestaTexto?.trim());
    if (!yaEscribioElResumen && clase?.status === 'available' && clase.leccionCompletada === false) {
      irALaLeccionDelDia(clase);
    }
  };

  const cerrarClaseDiaria = () => {
    setClaseDiariaVisible(false);
    claseDiaria.limpiar();
  };

  /**
   * El habito queda completado con ESTE POST, no con un segundo `/complete`. Si el envio falla el
   * modal sigue abierto con el texto escrito, y nada se marca de forma optimista: la tarjeta se
   * actualiza recargando desde el backend, que es la unica fuente de verdad.
   */
  const handleEnviarResumen = async (leccionId: string, resumen: string) => {
    const enviado = await claseDiaria.enviarResumen(leccionId, resumen);
    if (!enviado) return;
    cerrarClaseDiaria();
    await recargarEntrenamiento();
  };

  /** Deep-link a la leccion del dia dentro de Cursos, por el mismo camino que usa Comunidad. */
  const irALaLeccionDelDia = (clase: ClaseDiariaApi) => {
    if (!clase.cursoId || !clase.leccionId) return;
    setClaseDiariaVisible(false);
    irAPestana('Comunidad', { abrirCursoId: clase.cursoId, abrirLeccionId: clase.leccionId });
  };

  /**
   * DESPERTAR / DORMIR: registrar la hora de la accion y nada mas. Sin marcado optimista — la
   * tarjeta se actualiza recargando del backend, que ademas es quien calcula los puntos con
   * la hora real del servidor (no la del telefono).
   */
  const registrarSoloHora = async (habit: HabitItem) => {
    try {
      await completarRegistro(habit.id, null);
      await recargarEntrenamiento();
    } catch (e) {
      Alert.alert('No pudimos registrar la hora', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    }
  };

  const toggleHabitState = (id: string) => {
    // Los habitos con flujo propio NO se marcan con el checkbox: hacerlo mentiria, porque el
    // backend exige la publicacion o el resumen para cerrarlos. Se desvia al flujo que corresponde.
    const habit = habits.find(h => h.id === id);
    // Deshacer no existe en el backend: no hay endpoint que reabra un registro cerrado. Antes esto
    // lo "deshacía" en memoria, o sea que mostraba algo que el servidor no iba a confirmar.
    if (habit?.done) {
      Alert.alert('Ya está cumplido', 'Un hábito cerrado no se puede deshacer desde acá.');
      return;
    }
    if (habit && !habit.done) {
      if (habit.systemKey === CLAVE_SISTEMA_CLASE_DIARIA) {
        void abrirClaseDiaria(habit);
        return;
      }
      if (habit.systemKey === CLAVE_SISTEMA_POST_COMUNIDAD) {
        abrirMuroParaPublicar();
        return;
      }
      if (habit.systemKey && CLAVES_SOLO_HORA.has(habit.systemKey)) {
        void registrarSoloHora(habit);
        return;
      }
    }
    // Si NO exige evidencia, se cierra contra el backend igual que Despertar/Dormir. Si la exige,
    // se manda al modal de evidencia: cerrarlo a secas sería posible (el servidor no lo impide) y
    // vaciaría de sentido la palabra "obligatoria".
    if (habit) {
      if (habit.evidenceRequirement === 'REQUIRED') {
        openEvidenceModal(habit);
        return;
      }
      void completarHabitoSimple(habit);
    }
  };

  /**
   * Cierra un hábito que no exige evidencia. Sin marcado optimista: la tarjeta se actualiza
   * recargando del backend, que además es quien calcula los puntos con la hora del servidor.
   *
   * > **Corregido 2026-09-07.** Acá antes había un `setHabits` y nada más: el check tachaba el
   * > hábito en el estado de React, sin llamar a nadie, y al recargar la pantalla volvía sin
   * > marcar. La interacción principal de Training no guardaba nada.
   */
  const completarHabitoSimple = async (habit: HabitItem) => {
    try {
      await completarRegistro(habit.id, null);
      await recargarEntrenamiento();
    } catch (e) {
      Alert.alert('No pudimos marcarlo', mensajeDeError(e, 'Intenta de nuevo en unos segundos.'));
    }
  };

  /**
   * La Audioterapia abierta: el audio de la semana MÁS el registro del día que hay que cerrar.
   * `null` cuando no está abierta, y ese `null` es lo que deja al modal siendo el de la Pastilla.
   *
   * Lleva el `registroId` porque la Audioterapia **no** se entrega por `/spirit-audio/submit`:
   * ese endpoint resuelve el hábito por la constante `PASTILLA_RENACER` y cerraría el equivocado.
   * Se cierra por el camino genérico de evidencia, que necesita el id del registro.
   */
  const [audioterapiaAbierta, setAudioterapiaAbierta] = useState<
    { semana: number; titulo: string; url: string; registroId: string } | null
  >(null);

  /** Entrega la Audioterapia: las dos respuestas como evidencia de TEXTO, y el registro cerrado. */
  const handleEntregarAudioterapia = async (texto: string) => {
    const abierta = audioterapiaAbierta;
    if (!abierta) return;
    try {
      await confirmarEvidencia(abierta.registroId, { tipo: 'TEXTO', contenidoTexto: texto });
      await completarRegistro(abierta.registroId);
      setAudioterapiaAbierta(null);
      await recargarEntrenamiento();
    } catch (e) {
      Alert.alert('No se pudo registrar', mensajeDeError(e, 'Intenta de nuevo en un momento.'));
    }
  };

  const openEvidenceModal = (habit: HabitItem) => {
    /* La Audioterapia usa el MISMO modal de evidencia que el resto —y por lo tanto el mismo camino
       de cierre, que completa el hábito correcto—, pero con el audio de la semana arriba y las dos
       preguntas de D-97 en vez del selector de foto/video. Lo único que hace falta es traer el
       audio; si falla, el modal abre igual y se comporta como siempre: mejor un selector genérico
       que un hábito que no se puede cerrar. */
    if (habit.systemKey === CLAVE_SISTEMA_AUDIOTERAPIA) {
      void obtenerAudioterapiaSemanal()
        .then(audio => {
          if (audio.estado !== 'con_audio') {
            Alert.alert('Todavía no hay audio', 'La audioterapia de esta semana no está cargada.');
            return;
          }
          setAudioterapiaAbierta({
            semana: audio.semana,
            titulo: audio.titulo,
            url: audio.url,
            registroId: habit.id,
          });
        })
        .catch(e => Alert.alert('No se pudo abrir', mensajeDeError(e, 'No pudimos traer el audio de esta semana.')));
      return;
    }
    // Se ramifica por `systemKey` (la `clave_sistema` del catalogo) y NUNCA por titulo: el titulo
    // es editable desde el panel admin, y emparejar por texto haria desaparecer la funcion en
    // silencio el dia que alguien lo renombre.
    if (habit.systemKey === CLAVE_SISTEMA_PASTILLA_RENACER) {
      setPastillaVisible(true);
      return;
    }
    if (habit.systemKey === CLAVE_SISTEMA_CLASE_DIARIA) {
      void abrirClaseDiaria(habit);
      return;
    }
    // El post diario no se evidencia con un archivo: se evidencia publicando. El backend lo
    // verifica del lado del servidor, asi que mandar al muro es el unico camino que cierra.
    //
    // Corregido 2026-09-05 (E-117): "mandar al muro cierra" era falso — navegar no cerraba nada.
    // Quien cierra el habito es `cerrarHabitoPostDiarioComunidad`, que el compositor del Muro
    // llama con la publicacion ya confirmada. Desde aca se sigue navegando y nada mas.
    if (habit.systemKey === CLAVE_SISTEMA_POST_COMUNIDAD) {
      abrirMuroParaPublicar();
      return;
    }
    if (habit.systemKey && CLAVES_SOLO_HORA.has(habit.systemKey)) {
      void registrarSoloHora(habit);
      return;
    }
    setActiveEvidenceHabit(habit);
  };

  /**
   * Entrega la respuesta de la Pastilla del dia. El backend cierra el habito con ESTA misma
   * llamada (`EspirituService` refleja la entrega en el registro de "Pastilla Renacer"), asi que
   * no hace falta un segundo POST a `/habit-tracks/{id}/complete`.
   *
   * Si el envio falla, el modal SIGUE ABIERTO con lo escrito: nada se marca de forma optimista.
   */
  const handleEntregarPastilla = async (dia: number, texto: string) => {
    const enviado = await espiritu.entregar(dia, texto);
    if (!enviado) return;
    // El borrador ya no representa nada: la respuesta esta en el servidor.
    if (user?.id) {
      await borradorEspiritu.borrar(user.id, dia);
    }
    setPastillaVisible(false);
    await Promise.all([espiritu.recargar(), recargarEntrenamiento()]);
    Alert.alert('Pastilla Renaser registrada 🦅', 'Tu respuesta quedo guardada y el habito, completado.');
  };

  /**
   * Lo llama `EvidenciaHabitoModal` cuando el BACKEND ya cerró el registro. No marca la tarjeta a
   * mano: recarga desde el servidor, para que "completado" en pantalla siempre signifique
   * completado en el servidor. Los puntos son los que otorgó el backend (`puntosOtorgados` de la
   * respuesta de `/complete`), nunca un número calculado acá.
   */
  const handleEvidenciaCompletada = async (puntosOtorgados: number) => {
    const nombre = activeEvidenceHabit?.title ?? 'tu hábito';
    setActiveEvidenceHabit(null);
    await recargarEntrenamiento();
    Alert.alert(
      '¡Evidencia de Verdad Sellada! 🦅',
      puntosOtorgados > 0
        ? `Cumpliste tu palabra en "${nombre}". +${puntosOtorgados} puntos.`
        : `Cumpliste tu palabra en "${nombre}".`
    );
  };


  // Filter habits for selected dimension
  const currentDimensionHabits = selectedDimension
    ? habits.filter(h => h.dimension === selectedDimension.key)
    : [];

  // Cuántos de esos se pueden planificar de verdad: solo los hábitos de catálogo tienen
  // `habitoId`, que es lo que piden `habit-preferences` y `habit-unlocks`. Las rocas de VIDA Y
  // NEGOCIO vienen de otro módulo y no lo traen — por eso ahí el botón grande no aparece, en vez
  // de abrir una hoja vacía.
  const habitosPlanificables = currentDimensionHabits.filter(h => h.habitoId).length;

  // "CUMPLIDOS" cuenta hábitos/roca marcados como hechos (done). La barra de "Evidencias selladas
  // hoy" usa el MISMO criterio que el badge de la lista de dimensiones (ver ahí el porqué, E-118):
  // la prueba entregada en la forma que cada hábito acepta, no solo la fila de `evidencias`. Si no,
  // la lista decía "1/1 EVIDENCIAS" y el detalle "Evidencias selladas hoy 0%" del mismo hábito.
  const completedEvidencesCount = currentDimensionHabits.filter(h => h.done).length;
  const sealedEvidencesCount = currentDimensionHabits.filter(h => h.done || h.hasEvidence).length;
  const dimensionProgress = currentDimensionHabits.length > 0
    ? Math.round((sealedEvidencesCount / currentDimensionHabits.length) * 100)
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="TRAINING" right="dots" />

      <ScrollView
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
        {/* =================================================================== */}
        {/* PROGRAMA SIN ARRANCAR — la misma compuerta que Plan tiene desde D-84.  */}
        {/* Va arriba de las dos vistas porque el motivo no depende de si estás    */}
        {/* mirando el catálogo de dimensiones o el detalle de una.                */}
        {/* =================================================================== */}
        {programaSinArrancar && (
          <View
            style={[styles.avisoSinArrancar, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
            accessibilityLabel="Tu programa todavía no arrancó"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="lock" size={15} color={c.goldInk} />
              <Text style={[t.cardTitle, { color: c.textStrong }]}>
                {arranque.estado === 'PENDIENTE_ELEGIR'
                  ? 'Todavía no elegiste tu Día 1'
                  : 'Tu programa arranca pronto'}
              </Text>
            </View>
            <Text style={[t.body, { color: c.textSoft }]}>
              {arranque.estado === 'PENDIENTE_ELEGIR'
                ? 'Elige en qué día quieres empezar tus 90 días. Hasta entonces no hay evidencia que entregar.'
                : `Empiezas el ${formatearFechaLarga(arranque.fechaInicio)}. Desde el ${formatearFechaLarga(
                    diaAnterior(arranque.fechaInicio),
                  )} vas a poder organizar tus hábitos y entregar evidencia; hasta entonces no hay nada que hacer acá.`}
            </Text>
          </View>
        )}

        {/* ========================================================================= */}
        {/* VISTA 1: CATÁLOGO DE LAS 5 DIMENSIONES PRINCIPALES                        */}
        {/* ========================================================================= */}
        {selectedDimension === null && (
          <View style={{ gap: space.gapLg }}>
            {/* Alineado a la IZQUIERDA (2026-09-14). Antes iba centrado: el par
                "versalitas chicas centradas + subtítulo centrado" es el gesto de plantilla que
                esta pasada viene a quitar, y además obliga al ojo a volver al centro en cada
                línea. El rótulo queda de antetítulo y la frase pasa a tamaño de lectura. */}
            <View style={{ paddingTop: 4, gap: 6 }}>
              <Text style={[t.sectionTitle, { color: c.micro }]}>TU ENTRENAMIENTO INTEGRAL</Text>
              <Text style={[t.body, { color: c.text }]}>Cinco dimensiones. Un sistema.</Text>
            </View>

            {/* Aviso de los domingos. Solo donde puede sonar de verdad. */}
            {recordatorios.HAY_RECORDATORIOS_LOCALES && repasoSemanal !== null && !programaSinArrancar && (
              <View style={[styles.repasoSemanal, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                <Icon name="calendar" size={16} color={c.goldInk} />
                <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
                  <Text style={[t.body, { color: c.textStrong, fontFamily: 'Jost_500Medium' }]}>
                    Arma tu semana los domingos
                  </Text>
                  <Text style={[t.small, { color: c.textSoft }]}>
                    Te avisamos a las 19:00 para revisar a qué hora va cada hábito
                  </Text>
                </View>
                <Switch
                  value={repasoSemanal}
                  onValueChange={valor => void alternarRepasoSemanal(valor)}
                  trackColor={{ false: '#332C20', true: c.gold }}
                  thumbColor={repasoSemanal ? '#1E1B18' : '#888'}
                />
              </View>
            )}

            {/* El habito mas proximo a vencer, ARRIBA de las cinco dimensiones (pedido del dueno,
                2026-09-05). Se dibuja solo si hay alguno vivo con plazo: cuando el dia esta
                cerrado, la tarjeta simplemente no aparece. Tocarla abre ese habito directamente,
                sin obligar a adivinar en que dimension estaba. */}
            {!cargandoBackend && errorBackend === null && (
              <ProximoAVencerCard habits={habits} onAbrir={openEvidenceModal} />
            )}

            {/* Mientras carga o si falla. Antes se dibujaban 17 hábitos inventados, 11 de ellos
                ya marcados como hechos y con evidencia. */}
            {cargandoBackend && (
              <View style={{ gap: 12 }} accessibilityLabel="Cargando tu entrenamiento">
                {[0, 1, 2, 3, 4].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.dimensionCard,
                      { borderColor: c.border, backgroundColor: c.cardBg, opacity: 0.45 },
                    ]}
                  />
                ))}
              </View>
            )}

            {!cargandoBackend && errorBackend !== null && (
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
                <Text style={[t.cardTitle, { color: c.text }]}>
                  No pudimos cargar tu entrenamiento
                </Text>
                <Text style={[t.body, { color: c.textSoft }]}>{errorBackend}</Text>
                {/* Relleno sólido, sin borde: es la única acción de la tarjeta y ya vive DENTRO de
                    un recuadro. Un botón con borde acá era caja dentro de caja. */}
                <Pressable
                  onPress={() => {
                    void recargarEntrenamiento();
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

            <View style={{ gap: 12 }}>
              {!cargandoBackend && errorBackend === null && DIMENSIONES_CONFIG.map(d => {
                const dimHabits = habits.filter(h => h.dimension === d.key);
                // Dice "CUMPLIDOS" y no "EVIDENCIAS" (2026-09-05, pedido del dueño: que se
                // distingan). El número cuenta ítems del día ya dados por hechos — y la mitad
                // de ellos (DESPERTAR, DORMIR, Clase Diaria, Post en Comunidad, Pastilla)
                // NUNCA genera un archivo de evidencia, porque su prueba es la acción misma.
                // Llamarlo "EVIDENCIAS" hacía que EMOCIONES mostrara "0/1" para siempre.
                // "Evidencia" queda reservado para donde sí hay un archivo entregado: el chip
                // VER/SUBIR de cada hábito.
                // "EVIDENCIAS" cuenta los ítems del día cuya prueba YA está entregada, en la forma
                // que cada hábito acepta. Mirar SOLO `hasEvidence` (= una fila en
                // `renaser.evidencias`) dejaba el numerador clavado en 0: en el backend solo tres
                // caminos crean esa fila —la subida genérica de archivo/texto, el Santuario y las
                // rocas—, así que los hábitos cuya prueba ES la acción (DESPERTAR/DORMIR registran
                // la hora, la Clase Diaria el resumen, el Post Diario la publicación, la Pastilla
                // la respuesta) cierran el registro en COMPLETADO sin fila de evidencia. En
                // EMOCIONES, cuyo único hábito es el Post Diario, ese 0 era permanente. El
                // denominador es "todos los hábitos de la dimensión", así que el numerador tiene
                // que poder alcanzarlo (E-118). `||` y no solo `done`: una evidencia subida sobre
                // un registro que después venció sigue siendo una evidencia entregada.
                const evidenceCount = dimHabits.filter(h => h.done || h.hasEvidence).length;

                return (
                  <Pressable
                    key={d.key}
                    onPress={() => {
                      setSelectedDimension(d);
                      setInnerTab('habitos');
                    }}
                    style={[styles.dimensionCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
                  >
                    {/* Disco dorado tenue, sin anillo: el borde de este medallón vivía dentro del
                        borde de la tarjeta. `goldWash` es el token que existe justo para esto
                        (superficie suave), y distingue el disco sin dibujar una segunda caja. */}
                    <View
                      style={[
                        styles.medallion,
                        {
                          width: medallionSize,
                          height: medallionSize,
                          borderRadius: medallionSize / 2,
                          backgroundColor: c.goldWash,
                        },
                      ]}
                    >
                      <Icon name={d.icon} size={rs(20)} color={c.goldInk} strokeWidth={1.1} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.dimensionHeaderRow}>
                        <Text
                          numberOfLines={2}
                          style={{
                            fontFamily: 'Jost_700Bold',
                            color: c.text,
                            letterSpacing: 1,
                            fontSize: 14,
                            flexShrink: 1,
                          }}
                        >
                          {d.title}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            t.micro,
                            { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 10.5, flexShrink: 0 },
                          ]}
                        >
                          {evidenceCount}/{dimHabits.length} CUMPLIDOS
                        </Text>
                      </View>
                      <Text style={[t.small, { color: c.textSoft, marginTop: 4 }]}>
                        {d.sub}
                      </Text>
                    </View>

                    <Icon name="chevron" size={12} color={c.chevron} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* VISTA 2: DETALLE DE LA DIMENSIÓN SELECCIONADA CON EVIDENCIAS FOTOGRÁFICAS  */}
        {/* ========================================================================= */}
        {selectedDimension !== null && (
          <View style={{ gap: space.gapLg }}>
            {/* Top Bar con Botón Volver */}
            <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
              <Pressable
                onPress={() => setSelectedDimension(null)}
                style={styles.backTrainingBtn}
                hitSlop={8}
              >
                <Icon name="arrowLeft" size={16} color={c.goldInk} />
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                  VOLVER A TRAINING
                </Text>
              </Pressable>

              {/* Antes era una píldora con borde y relleno propio, pegada a la barra que ya tiene
                  su línea divisoria: ornamento sobre ornamento para un rótulo que además se repite
                  como título dos centímetros más abajo. Queda el texto solo. */}
              <Text
                numberOfLines={1}
                style={[t.micro, { color: c.textSoft, fontFamily: 'Jost_500Medium', flexShrink: 1 }]}
              >
                DIMENSIÓN · {selectedDimension.title}
              </Text>
            </View>

            {/* Dimension Summary Card */}
            <View style={[styles.dimSummaryCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <View style={styles.dimSummaryHeader}>
                <View style={[styles.dimAvatarMedallion, { backgroundColor: c.goldWash }]}>
                  <Icon name={selectedDimension.icon} size={22} color={c.goldInk} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 22, flexShrink: 1 }]}>
                      {selectedDimension.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', flexShrink: 0 }]}
                    >
                      {completedEvidencesCount}/{currentDimensionHabits.length} CUMPLIDOS
                    </Text>
                  </View>
                  <Text style={[t.small, { color: c.textSoft }]}>
                    {selectedDimension.sub}
                  </Text>
                </View>
              </View>

              {/* Dimension Progress Bar */}
              <View style={{ gap: 6, marginTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={[t.small, { color: c.textSoft }]}>Cumplidos hoy</Text>
                  <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>{dimensionProgress}%</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: c.gold, width: `${dimensionProgress}%` }]} />
                </View>
              </View>
            </View>

            {/* Sub-Tabs: HÁBITOS & EVIDENCIAS vs GUÍAS Y AUDIOS
                La pestaña elegida se distingue por RELLENO SÓLIDO, no por un borde más grueso.
                Antes esto era un control segmentado: una caja con borde que contenía dos botones,
                y el activo agregaba un TERCER borde adentro — tres recuadros anidados para decir
                "estás acá". El relleno lo dice solo, y de lejos, que es lo que hace falta. */}
            <View style={styles.innerTabBar}>
              <Pressable
                onPress={() => setInnerTab('habitos')}
                style={[
                  styles.innerTabBtn,
                  { backgroundColor: innerTab === 'habitos' ? c.gold : 'transparent' },
                ]}
              >
                <Text
                  style={[
                    t.micro,
                    {
                      color: innerTab === 'habitos' ? c.onGold : c.textSoft,
                      fontFamily: innerTab === 'habitos' ? 'Jost_700Bold' : 'Jost_500Medium',
                      textAlign: 'center',
                    },
                  ]}
                >
                  HÁBITOS & EVIDENCIAS ({currentDimensionHabits.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setInnerTab('guias')}
                style={[
                  styles.innerTabBtn,
                  { backgroundColor: innerTab === 'guias' ? c.gold : 'transparent' },
                ]}
              >
                <Text
                  style={[
                    t.micro,
                    {
                      color: innerTab === 'guias' ? c.onGold : c.textSoft,
                      fontFamily: innerTab === 'guias' ? 'Jost_700Bold' : 'Jost_500Medium',
                      textAlign: 'center',
                    },
                  ]}
                >
                  GUÍAS Y AUDIOS
                </Text>
              </Pressable>
            </View>

            {/* =================================================================== */}
            {/* PESTAÑA A: LISTA DE HÁBITOS CON SUBIDA DE EVIDENCIA                 */}
            {/* =================================================================== */}
            {innerTab === 'habitos' && (
              <View style={{ gap: space.gapLg }}>
                {/* =============================================================== */}
                {/* PLANIFICAR LA CATEGORÍA — una sola opción, grande, arriba de     */}
                {/* todo. Antes esto era un botón chico dentro de cada tarjeta, al   */}
                {/* costado de "SUBIR": estorbaba lo único que la tarjeta tiene que  */}
                {/* hacer fácil, que es entregar la evidencia. Acá arriba no compite */}
                {/* con nada, y la hoja permite aplicar a todos o a uno solo.        */}
                {/* Solo aparece si hay algo que planificar: las rocas de VIDA Y      */}
                {/* NEGOCIO no son hábitos de este módulo y no traen `habitoId`.      */}
                {/* =============================================================== */}
                {habitosPlanificables > 0 && !programaSinArrancar && (
                  <Pressable
                    onPress={() => setPlanificarVisible(true)}
                    style={[styles.planificarBigBtn, { backgroundColor: c.goldWash }]}
                  >
                    <View style={[styles.planificarIconBox, { backgroundColor: c.cardBgAlt }]}>
                      <Icon name="clock" size={20} color={c.goldInk} />
                    </View>
                    <View style={{ flex: 1, flexShrink: 1, gap: 4 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>
                        PLANIFICAR {selectedDimension.title}
                      </Text>
                      <Text style={[t.small, { color: c.textSoft }]}>
                        Hora, días y estado de tus {habitosPlanificables}{' '}
                        {habitosPlanificables === 1 ? 'hábito' : 'hábitos'} · a todos o uno por uno
                      </Text>
                    </View>
                    <Icon name="chevron" size={16} color={c.goldInk} />
                  </Pressable>
                )}

                {/* El "AGREGAR HÁBITO" que vivía acá se eliminó (2026-09-07): armaba un objeto en
                    memoria con un id inventado, anunciaba "¡Hábito Creado! 🦅" y desaparecía al
                    recargar — el mismo bug que E-137 corrigió en Plan. Crear un hábito ahora vive
                    en la hoja de Planificar y llama a `POST /api/v1/habits` de verdad. */}
                {/* El rótulo y la lista son UN bloque: entre ellos va aire de lista (12), y el
                    aire grande (`gapLg`) queda para separar este bloque de los de al lado. */}
                <View style={{ gap: 12 }}>
                  <View style={styles.habitsActionRow}>
                    <MicroLabel>Prácticas activas ({currentDimensionHabits.length})</MicroLabel>
                  </View>

                  {/* Sin hábitos en esta dimensión: es un estado legítimo (día 0, plan sin
                      generar), no un hueco que haya que tapar con datos de relleno. */}
                  {currentDimensionHabits.length === 0 && (
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
                      <Text style={[t.cardTitle, { color: c.text }]}>
                        Todavía no hay hábitos en {selectedDimension.title}
                      </Text>
                      <Text style={[t.body, { color: c.textSoft }]}>
                        Cuando tu plan del día se genere, los vas a ver acá con su evidencia.
                      </Text>
                    </View>
                  )}

                  {/* Multiple Habits Card List */}
                  {currentDimensionHabits.map(habit => (
                    <View key={habit.id} style={{ gap: 6 }}>
                    <View
                      style={[
                        styles.habitCard,
                        {
                          borderColor: habit.done ? c.success : c.border,
                          backgroundColor: habit.done ? c.cardBgAlt : c.cardBg,
                        },
                      ]}
                    >
                      {/* Checkbox circular interactivo — deshabilitado sin track de hoy: no hay
                          ningún registro real que marcar (ver `tieneTrackHoy` en HabitItem).
                          Su borde SE QUEDA: es la única forma de ver una casilla vacía. El
                          `hitSlop` lo lleva a zona de toque cómoda sin agrandar el dibujo. */}
                      <Pressable
                        onPress={() => habit.tieneTrackHoy && !programaSinArrancar && toggleHabitState(habit.id)}
                        disabled={!habit.tieneTrackHoy || programaSinArrancar}
                        hitSlop={12}
                        style={[
                          styles.habitCheckCircle,
                          {
                            borderColor: habit.done ? c.success : c.tabInactive,
                            backgroundColor: habit.done ? c.success : 'transparent',
                            opacity: habit.tieneTrackHoy && !programaSinArrancar ? 1 : 0.35,
                          },
                        ]}
                      >
                        {habit.done && <Icon name="check" size={14} color="#FFFFFF" strokeWidth={2.2} />}
                      </Pressable>

                      {/* Habit Info & Tap to open Evidence */}
                      <Pressable
                        onPress={() => habit.tieneTrackHoy && !programaSinArrancar && openEvidenceModal(habit)}
                        style={{ flex: 1, gap: 4 }}
                      >
                        <View style={styles.habitMetaRow}>
                          {/* Sin borde: la etiqueta vivía dentro del borde de la tarjeta, que ya
                              la separa. Queda el lavado dorado, que además va con su texto. */}
                          <View style={[styles.habitTagBadge, { backgroundColor: c.goldWash }]}>
                            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                              {habit.tag}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Icon name="fire" size={12} color={habit.streak > 0 ? c.goldInk : c.chevron} />
                            <Text style={[t.micro, { color: c.textSoft, fontFamily: 'Jost_700Bold' }]}>
                              {habit.streak} DÍAS
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            t.body,
                            {
                              color: habit.done ? c.textStrong : c.text,
                              fontFamily: habit.done ? 'Jost_500Medium' : 'Jost_400Regular',
                              textDecorationLine: habit.done ? 'line-through' : 'none',
                              opacity: habit.done ? 0.85 : 1,
                            },
                          ]}
                        >
                          {tituloVisible({ id: habit.habitoId ?? habit.id, title: habit.title }, renombre.titulos)}
                        </Text>

                        {/* `flexWrap`: a tamaño de lectura, "Durante el día" + "Evidencia
                            Sellada" no entran en una línea en pantallas angostas. */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <Text style={[t.small, { color: c.textSoft }]}>
                            {habit.time || 'Durante el día'}
                          </Text>
                          {habit.hasEvidence && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Icon name="camera" size={13} color={c.success} />
                              <Text style={[t.small, { color: c.success, fontFamily: 'Jost_500Medium' }]}>
                                Evidencia Sellada
                              </Text>
                            </View>
                          )}
                          {!habit.tieneTrackHoy && (
                            <Text style={[t.small, { color: c.textSoft, fontStyle: 'italic' }]}>
                              Aún sin registro de hoy
                            </Text>
                          )}
                        </View>
                      </Pressable>

                      {/* Botón de evidencia, SOLO. El de "PLAN" que lo acompañaba se movió al
                          encabezado de la categoría (2026-09-07): en esta fila angosta competía con
                          lo único que la tarjeta tiene que hacer fácil, que es entregar la prueba.
                          Sin borde y con relleno: era un recuadro dentro del recuadro de la
                          tarjeta. El lavado verde sale ahora de `successWash` en vez del
                          'rgba(78, 159, 118, 0.12)' suelto, que no era ningún color de la paleta. */}
                      <Pressable
                        onPress={() => habit.tieneTrackHoy && !programaSinArrancar && openEvidenceModal(habit)}
                        disabled={!habit.tieneTrackHoy || programaSinArrancar}
                        style={[
                          styles.evidenceBtn,
                          {
                            backgroundColor: habit.hasEvidence ? c.successWash : c.goldWash,
                            opacity: habit.tieneTrackHoy && !programaSinArrancar ? 1 : 0.35,
                          },
                        ]}
                        hitSlop={8}
                      >
                        <Icon name="camera" size={15} color={habit.hasEvidence ? c.success : c.goldInk} />
                        <Text
                          style={[
                            t.micro,
                            {
                              color: habit.hasEvidence ? c.success : c.goldInk,
                              fontFamily: 'Jost_700Bold',
                            },
                          ]}
                        >
                          {habit.hasEvidence ? 'VER' : 'SUBIR'}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Cambiarle el nombre a las dos bebidas (D-127). Fuera de la tarjeta y no
                        adentro: la tarjeta entera ya es un Pressable que abre la evidencia, y un
                        boton dentro de otro boton se traga el toque en nativo aunque en web
                        parezca andar. Se dibuja solo en los dos habitos reemplazables.

                        Opera con `habitoId` (el id del CATALOGO) y nunca con `id`, que aca es el
                        id del track del dia: con ese, el backend responde "Habito no encontrado".
                        Pasó el 2026-09-15 al escribir esto. */}
                    {esRenombrable(habit.systemKey) && habit.habitoId && (
                      <Pressable
                        onPress={() => setHabitoARenombrar(habit)}
                        accessibilityRole="button"
                        accessibilityLabel={`Cambiarle el nombre a ${tituloVisible({ id: habit.habitoId, title: habit.title }, renombre.titulos)}`}
                        hitSlop={8}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          alignSelf: 'flex-start',
                          paddingVertical: 4,
                          paddingHorizontal: 2,
                        }}
                      >
                        <Icon name="spark" size={11} color={c.goldInk} />
                        <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>
                          {renombre.titulos[habit.habitoId] ? 'CAMBIAR O QUITAR EL NOMBRE' : 'PONERLE OTRO NOMBRE'}
                        </Text>
                      </Pressable>
                    )}
                    </View>
                  ))}
                </View>

                {/* Acá vivía "Consistencia de la Dimensión · 37 días consecutivos · 94 %".
                    Se retira el 2026-09-15: las dos cifras estaban escritas a mano en el archivo,
                    iguales para las cinco dimensiones y para cualquier persona. Se veían incluso
                    en una dimensión con CERO hábitos, al lado de su propio "0/0 cumplidos" — que
                    es como lo encontró el dueño. Vuelve cuando exista el dato: hoy nada calcula
                    consistencia por dimensión, y el porcentaje real del día ya está arriba, en
                    "Cumplidos hoy". */}
              </View>
            )}

            {/* =================================================================== */}
            {/* PESTAÑA B: GUÍAS Y AUDIOS DE LA DIMENSIÓN                          */}
            {/* =================================================================== */}
            {innerTab === 'guias' && (
              <View style={{ gap: 12 }}>
                {/*
                  EN DESARROLLO (2026-09-05, decision del dueno del proyecto).

                  Aca habia una maqueta entera presentada como contenido real: una "AUDIO GUIA
                  RECOMENDADA" distinta por dimension, un boton "ESCUCHAR SESION GUIADA" que solo
                  abria un Alert, y una "RUTA DE CLASES" de cinco clases inventadas de las cuales
                  tres decian "Completada" sin que el aprendiz hubiera hecho ninguna. El peor era
                  el tip de MACACO de MENTE: "Hoy registraste frustracion dos veces", una constante
                  igual para todos, presentada como una observacion sobre el dia de la persona.

                  Es el mismo problema que ya se corrigio con INITIAL_HABITS (ver el comentario
                  arriba de DIMENSIONES_CONFIG): datos inventados con estado de "hecho". Por eso no
                  se dejo el render apagado con los textos todavia en el archivo — se borraron los
                  datos, para que nadie los vuelva a colgar de una pantalla.

                  Cuando se implemente de verdad, va la Pastilla Renacer y las audioterapias
                  (`/api/v1/spirit-audio/status`). Falta definir que muestra cada dimension: las
                  audioterapias del backend son de Espiritu, y esta pestana existe en las cinco.
                */}
                <View style={[styles.guideHeroCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <View style={[styles.guideTag, { backgroundColor: c.gold, alignSelf: 'flex-start' }]}>
                    <Text style={[t.micro, { color: '#1E1B18', fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                      EN DESARROLLO
                    </Text>
                  </View>
                  <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16, marginTop: 8 }]}>
                    Guías y audios de {selectedDimension.title}
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 18, marginTop: 6 }]}>
                    Estamos preparando esta sección. Cuando esté lista vas a encontrar acá la
                    Pastilla Renaser y las audioterapias de tu programa.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL: SUBIR EVIDENCIA (FOTO / TEXTO / AUDIO / VIDEO) — camino GENÉRICO   */}
      {/* ========================================================================= */}
      {/*
        Antes esto era una maqueta: el recuadro de "foto" solo hacía
        `setEvidencePhotoUploaded(true)` y "SELLAR" marcaba la tarjeta en memoria — no se elegía
        ningún archivo, no se subía nada y el backend nunca se enteraba. Ahora todo el flujo real
        (elegir/grabar, subir a S3 con URL prefirmada, confirmar la evidencia y completar el
        registro) vive en `features/habits/components/EvidenciaHabitoModal`, para no seguir
        engordando esta pantalla y para no chocar con los flujos ESPECIALES de evidencia que se
        están construyendo en paralelo sobre este mismo archivo.
      */}
      <EvidenciaHabitoModal
        registroId={activeEvidenceHabit?.id ?? null}
        /*
         * VIDA Y NEGOCIO no son hábitos: son las acciones del día que salen del plan semanal, y
         * viven en otras tablas y otros endpoints (`/api/v1/rocks/...`). Antes esto no se notaba
         * porque la dimensión estaba siempre vacía; ahora que se pueden agendar, mandar su id
         * contra `habit-tracks` daría un 404. El modal no conoce rocas a propósito — se le pasa el
         * camino ya armado, y quien compone las dos cosas es esta pantalla.
         */
        sellarPersonalizado={
          activeEvidenceHabit?.dimension === 'VIDA Y NEGOCIO' && activeEvidenceHabit
            ? datos => sellarRocaDiaria(activeEvidenceHabit.id, datos)
            : undefined
        }
        titulo={activeEvidenceHabit?.title ?? ''}
        contexto={
          activeEvidenceHabit
            ? `${activeEvidenceHabit.dimension} · ${activeEvidenceHabit.tag}`
            : undefined
        }
        notaInicial={activeEvidenceHabit?.respuestaTexto ?? activeEvidenceHabit?.note ?? ''}
        onCerrar={() => setActiveEvidenceHabit(null)}
        onCompletado={handleEvidenciaCompletada}
      />

      {/* ========================================================================= */}
      {/* HOJA: PLANIFICAR LA CATEGORÍA                                             */}
      {/* Hora y minutos, días, los hábitos que se marcan y el interruptor          */}
      {/* activo/pausado, en ese orden. Aplica a lo seleccionado: a todos o a uno    */}
      {/* solo. Sin backend nuevo — ver PlanificarDimensionModal.                    */}
      {/* ========================================================================= */}
      <PlanificarDimensionModal
        visible={planificarVisible}
        dimension={selectedDimension?.title ?? ''}
        // Planificar necesita el inventario completo de la dimensión para poder reactivar un
        // hábito pausado que, correctamente, no tiene track en Training hoy.
        habits={planHabits.filter(h => h.dimension === selectedDimension?.key)}
        onCerrar={() => setPlanificarVisible(false)}
        onGuardado={() => {
          setPlanificarVisible(false);
          void recargarEntrenamiento();
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL: PASTILLA RENACER (audio del día + preguntas)                       */}
      {/* ========================================================================= */}
      <PastillaRenacerModal
        visible={pastillaVisible || audioterapiaAbierta !== null}
        userId={user?.id ?? 'anon'}
        /* El MISMO modal sirve a los dos audios (2026-09-22). La Audioterapia pedía exactamente
           este flujo —escuchar y contestar las dos preguntas de D-97— y hasta hoy caía en el
           selector genérico de evidencia, que le pedía una foto para probar que había escuchado
           un audio que la app ni le mostraba. Lo único distinto es de dónde sale el audio y por
           dónde se entrega; la pantalla es la misma. */
        audio={
          audioterapiaAbierta
            ? audioDeLaAudioterapia(
                audioterapiaAbierta.semana,
                audioterapiaAbierta.titulo,
                audioterapiaAbierta.url,
                false
              )
            : diaDePastilla
              ? audioDeLaPastilla(diaDePastilla)
              : null
        }
        cargando={audioterapiaAbierta ? false : espiritu.cargando}
        error={audioterapiaAbierta ? null : espiritu.error}
        enviando={espiritu.enviando}
        errorEnvio={espiritu.errorEnvio}
        onEntregar={texto => {
          if (audioterapiaAbierta) {
            void handleEntregarAudioterapia(texto);
            return;
          }
          if (diaDePastilla) void handleEntregarPastilla(diaDePastilla.day, texto);
        }}
        onCerrar={() => {
          espiritu.limpiarError();
          setPastillaVisible(false);
          setAudioterapiaAbierta(null);
        }}
      />

      {/* MODAL: CLASE DIARIA (leccion del dia + que entendiste)                    */}
      {/* `resumenGuardado` sale de `respuestaTexto` del registro: si el habito ya se cerro, el
          modal se abre en solo lectura mostrando lo que la persona escribio, en vez de volver a
          pedirselo. Es la lectura de "ya no debe salir el modal" que dejo el flujo original. */}
      <ClaseDiariaModal
        visible={claseDiariaVisible}
        clase={claseDiaria.clase}
        cargando={claseDiaria.cargando}
        error={claseDiaria.error}
        resumenGuardado={habitoClaseDiaria?.respuestaTexto ?? null}
        enviando={claseDiaria.enviando}
        errorEnvio={claseDiaria.errorEnvio}
        onEnviar={(leccionId, resumen) => {
          void handleEnviarResumen(leccionId, resumen);
        }}
        onIrALaLeccion={irALaLeccionDelDia}
        onCerrar={cerrarClaseDiaria}
      />

      {/* El mismo modal que abre el aviso del agente, montado tambien aca: el acceso permanente
          al renombre tiene que existir despues de que la persona responde el aviso, que no vuelve
          a aparecer nunca (D-127). */}
      {habitoARenombrar?.habitoId && (
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
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  repasoSemanal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: space.radius,
    paddingHorizontal: space.cardPad,
    paddingVertical: 14,
    minHeight: 56,
  },
  // Aviso de "tu programa todavía no arrancó". Mismo lenguaje visual que el de Plan: recuadro
  // tenue con candado, no una alerta roja — no es un error, es que todavía no es el momento.
  avisoSinArrancar: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    marginBottom: space.gapLg,
    gap: 8,
  },
  // "PLANIFICAR <DIMENSIÓN>": la opción grande del encabezado de la categoría. Alto mínimo 56
  // para que se pulse cómodo con una mano (AGENTS.md §4) y `flexShrink` en el texto para que en
  // pantallas angostas envuelva en vez de empujar el chevrón fuera de la tarjeta (§2).
  // Sin borde: se distingue por RELLENO (`goldWash`), igual que la pestaña activa. Un borde
  // dorado de 1.5 alrededor de un recuadro que ya tenía relleno propio, con otro recuadro con
  // borde adentro, eran tres marcos para una sola acción.
  planificarBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    width: '100%',
    borderRadius: space.radius,
    paddingHorizontal: space.cardPad,
    paddingVertical: 14,
  },
  planificarIconBox: {
    width: 40,
    height: 40,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: ESPACIO_PARA_LANZADOR,
  },
  dimensionCard: {
    flex: 1,
    minHeight: 80,
    borderWidth: 1,
    borderRadius: space.radius,
    paddingHorizontal: space.cardPad,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  medallion: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimensionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    /* `flex-start` y no `center`: si el titulo llega a dos lineas ("VIDA Y NEGOCIO" en
       pantallas estrechas), el contador se queda arriba alineado con la primera, en vez de
       flotar a media altura. El `gap` evita que se toquen al encogerse (AGENTS.md 2). */
    alignItems: 'flex-start',
    gap: 8,
  },
  detailTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backTrainingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  dimSummaryCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  dimSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dimAvatarMedallion: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  // Fila de píldoras pelada: sin marco contenedor ni relleno de "riel". La estructura la dan el
  // espacio y el relleno de la píldora elegida.
  innerTabBar: {
    flexDirection: 'row',
    gap: 8,
  },
  innerTabBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitsActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  habitCard: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  habitTagBadge: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  evidenceBtn: {
    minHeight: 48,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: space.radiusSm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  consistencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    gap: 14,
  },
  guideHeroCard: {
    borderWidth: 1.2,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  guideTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guideTag: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  macacoContextCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  classItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 13.5,
  },
  photoUploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagOptionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sessionTagBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
