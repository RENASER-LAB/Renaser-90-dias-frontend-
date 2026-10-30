import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { Alert } from '../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDES_DE_UNA_PESTANA } from '../navigation/bordesDeUnaPestana';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { useMedicionDePantalla } from '../hooks/useMedicionDePantalla';
import { ScreenHeader } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { tacto } from '../utils/tacto';
import {
  avisoDeEvidenciaEntregada,
  muestraElCumplidoEnLaTarjeta,
} from '../features/training/utils/tarjetaDelHabito';
import { useTraining } from '../features/training/hooks/useTraining';
import { TrainingPorHora } from '../features/training/components/TrainingPorHora';
import { PracticasDeTraining } from '../features/training/components/PracticasDeTraining';
import { DIMENSIONES_CONFIG } from '../features/training/data/dimensiones';
import { PRACTICAS_ABIERTAS, PRACTICAS_CERRADAS, alRetroceder, type EstadoDePracticas } from '../features/training/utils/navegacionDePracticas';
import { EvidenciaHabitoModal } from '../features/habits/components/EvidenciaHabitoModal';
import { RegistroConFotoModal } from '../features/habits/components/RegistroConFotoModal';
import { useRegistroConFoto } from '../features/habits/hooks/useRegistroConFoto';
import { cerrarConRespuestaInmediata } from '../features/habits/celebracion/momentoEnLaTarjeta';
import { estaVencido, seRegistraConFoto } from '../features/training/utils/registroConFotoEnTraining';
import { avisoDeHabitoCerrado, preguntaQueSintio, type MedicionPedida } from '../features/habits/utils/registroConFoto';
import { avisoDeAccionBloqueada, sellarAccionDeTraining } from '../features/objetivos/utils/registroDeAccionConFoto';
import { completarRegistro, confirmarEvidencia } from '../features/habits/api/evidenciaHabitoApi';
import { crearCierreSinRepetir } from '../features/habits/utils/cierreDeRegistro';
import { ejecutarEnRegistroVigente } from '../features/habits/api/registroVigente';
import { mensajeDeError } from '../services/http/apiClient';
import { CLAVE_SISTEMA_PASTILLA_RENACER } from '../features/spirit/api/spiritApi';
import { escucharPropuestaConfirmada } from '../features/renasia/events/avisoPropuestaConfirmada';
import { escucharPostDiarioCerrado } from '../features/habits/events/avisoPostDiarioCerrado';
import { PastillaRenacerModal } from '../features/spirit/components/PastillaRenacerModal';
import { audioDeLaAudioterapia, audioDeLaPastilla } from '../features/spirit/types/audioGuiado';
import { obtenerAudioterapiaSemanal } from '../features/habits/api/audioterapiaApi';
import { useEspiritu } from '../features/spirit/hooks/useEspiritu';
import { ClaseDiariaModal } from '../features/academy/components/ClaseDiariaModal';
import { useClaseDiaria } from '../features/academy/hooks/useClaseDiaria';
import type { ClaseDiariaApi } from '../features/academy/types/academy.types';
import { irAPestana } from '../navigation/navegacionRef';
import { habitoAAbrir } from '../features/training/utils/aperturaDesdeAviso';
import type { DimensionDeTraining } from '../features/training/utils/dimensionDelHabito';
import type { GuiaDelHabito } from '../features/training/utils/guiaDelHabito';
import { useProgramaDia } from '../features/programa/hooks/useProgramaDia';
import { alCumplirElHabito } from '../features/habits/notificaciones/repeticiones';
import {
  diaAnterior,
  formatearFechaLarga,
  useArranqueDelPrograma,
} from '../features/programa/hooks/useArranqueDelPrograma';
import { useProgramaPersonal } from '../features/mentor/hooks/useProgramaPersonal';
import { BotonElegirDiaUno } from '../features/programa/components/BotonElegirDiaUno';
import { InvitacionProgramaPropio } from '../features/programa/components/InvitacionProgramaPropio';
import { AvisoConsultaDiaUno } from '../features/programa/components/AvisoConsultaDiaUno';
import { borradorEspiritu } from '../features/spirit/storage/borradorEspiritu';
import type { DayOfWeek } from './PlanScreen';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';
import { useRenombreLocal } from '../features/habits/hooks/useRenombreDeHabito';
import { tituloVisible } from '../features/habits/utils/renombreDeHabito';
import { useAuth } from '../features/auth/context/AuthContext';
import { useOcultarBarraAlDesplazar } from '../navigation/barraAlDesplazar/BarraInferior';
import { SeccionEnMantenimiento } from '../features/plataforma/components/SeccionEnMantenimiento';
import { SeccionNoDisponible } from '../features/plataforma/components/SeccionNoDisponible';
import { useAlVolverAPrenderse, useFuncionalidad } from '../features/plataforma/estado/useFuncionalidad';
import { CLAVES } from '../features/plataforma/utils/clavesDeLaApp';
import { fechaEnZona, zonaDelTelefono } from '../features/eventos/utils/zonaHoraria';

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
  /**
   * Racha del hábito en días (D-254 del backend, `rachaDias` del track de hoy). `null` = no se sabe
   * —backend anterior, hábito sin track de hoy, o una roca—, y entonces la tarjeta no la muestra.
   */
  streak: number | null;
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
  /**
   * Estado crudo del registro de hoy (`PENDIENTE`, `COMPLETADO`, `EXPIRADO`, `FALLIDO`…). `done`
   * solo dice si es `COMPLETADO`; esto es lo que permite no abrir la cámara para uno vencido.
   * `undefined` en las rocas y en los hábitos sin track de hoy.
   */
  estado?: string;
  /** `YYYY-MM-DD` del registro de hoy: para decir de qué día era uno que ya cerró. */
  fechaEjecucion?: string | null;
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
   * Ícono de línea propio del hábito, resuelto por `iconoDeLineaDeHabito` a partir de `iconKey` y
   * `systemKey` del catálogo (`WATER` → vaso, `WAKE_UP` → amanecer…). Distingue una fila de otra
   * dentro de la misma dimensión, cosa que el icono de categoría no podía: ahí los seis de CUERPO
   * eran el mismo símbolo.
   *
   * > **Cambiado 2026-10-05 (rediseño de Training).** Era el emoji de `mapearPlanHabit` (😴, 💧…), y
   * > Despertar y Dormir salían con el mismo 😴 porque el catálogo les da la misma clave.
   */
  icon?: IconName;
  /**
   * Los mismos 7 días que ya pinta Plan para este hábito (catálogo + pausa aplicada,
   * `PlanHabit.days`) — solo para sembrar la fila decorativa de días en "Planificar", sin
   * recalcular nada acá.
   */
  diasCatalogo?: Record<DayOfWeek, boolean>;
  /** Lo que la persona escribió al completar el registro (`RegistroHabito.respuestaTexto`). */
  respuestaTexto?: string | null;
  /** Instante ISO en que el servidor lo dio por cumplido (`completadoEn` del registro). */
  completadoEn?: string | null;
  /** Puntos que el servidor pagó al cumplirlo (`puntosOtorgados` del registro). */
  puntosOtorgados?: number | null;
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
  /** D-226: el registro pide los km del día (KILÓMETROS DIARIOS), con el total acumulado previo. */
  medicion?: MedicionPedida | null;
  /**
   * Spec 014: la guía que el equipo cargó para este hábito (`guia` del registro de hoy), lista para la hoja del hábito.
   * `null`/ausente = no hay guía y la hoja no muestra esa sección.
   */
  guia?: GuiaDelHabito | null;
}

// `INITIAL_HABITS` se eliminó: eran 17 hábitos inventados que no existen en el catálogo, y 11 de
// ellos venían con `done: true`, `hasEvidence: true` y `streak: 37` — es decir, la pantalla
// mostraba hábitos ya marcados como hechos y con evidencia que nadie había hecho ni subido.
// `useTraining` ya distingue "todavía no respondió" de "respondió vacío", así que la pantalla
// arranca en [] y dibuja esqueleto / error / estado vacío según corresponda.

export default function TrainingScreen() {
  const trainingActivo = useIsFocused();
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  /* Spec 002: el interruptor «Hábitos». Al volver de mantenimiento se relee lo que falló mientras estaba apagado. */
  const habitosPrendidos = useFuncionalidad(CLAVES.habitos);
  const { c, t } = useTheme();
  const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();

  /* Spec 014: «Tus prácticas» (el engranaje) y dónde está la persona adentro. Un solo estado, un solo retroceso. */
  const [practicas, setPracticas] = useState<EstadoDePracticas>(PRACTICAS_CERRADAS);
  /** El día que se mira en la lista (`null` = hoy). Lo necesita la pantalla: en un día anterior no monta ningún registro. */
  const [diaElegido, setDiaElegido] = useState<string | null>(null);

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
    fechaDeHoy,
  } = useTraining(trainingActivo);
  /* Spec 014: los eventos de la semana solo se piden si Eventos está prendido (Soporte TI). */
  const eventosPrendidos = useFuncionalidad(CLAVES.eventos);
  /* Spec 017: «Cierra tu día» cuelga de las acciones del día, que tapa el interruptor `plan`. */
  const planPrendido = useFuncionalidad(CLAVES.plan);
  useAlVolverAPrenderse(CLAVES.habitos, () => void recargarEntrenamiento());
  // Solo en desarrollo: pedidos al montar y tiempo hasta tener datos (V-1, 26/09/2026).
  useMedicionDePantalla('Training', !cargandoBackend);
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
  const {
    diaPrograma,
    fase,
    inscrito,
    loading: cargandoDiaPrograma,
    recargar: recargarDiaPrograma,
  } = useProgramaDia();
  /* D-260: tras «Elegir mi Día 1» se vuelve a preguntar, y el aviso de abajo se va solo. */
  const [versionArranque, setVersionArranque] = useState(0);
  const { user } = useAuth();
  const arranque = useArranqueDelPrograma(!cargandoDiaPrograma && diaPrograma === 0, versionArranque, user?.id);
  const programaSinArrancar =
    arranque.estado === 'PENDIENTE_ELEGIR' || arranque.estado === 'ESPERANDO_INICIO';

  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [planHabits, setPlanHabits] = useState<HabitItem[]>([]);

  /**
   * Entrada desde el aviso de un hábito (D-218, 2026-09-28): la deja `AbridorDeAvisos` con
   * `abrirHabitoId` y `abrirDimension`, cuando ya no hay ninguna capa obligatoria encima. Se consume el
   * parámetro una vez (como `abrirEventoId` en Comunidad) y se guarda el pedido hasta que carguen los hábitos.
   *
   * > Spec 014: antes abría la dimensión del hábito. Las dimensiones ya no se ven afuera: el aviso abre el hábito
   * > mismo, como al tocar su fila (su hoja o su registro), en la lista de hoy.
   */
  const route = useRoute();
  const navigation = useNavigation();
  const [habitoPedido, setHabitoPedido] = useState<{ habitoId: string; dimension: DimensionDeTraining | null } | null>(null);
  useEffect(() => {
    const params = route.params as { abrirHabitoId?: string; abrirDimension?: DimensionDeTraining | null } | undefined;
    if (!params?.abrirHabitoId) return;
    setHabitoPedido({ habitoId: params.abrirHabitoId, dimension: params.abrirDimension ?? null });
    (navigation as unknown as { setParams: (p: Record<string, unknown>) => void })
      .setParams({ abrirHabitoId: undefined, abrirDimension: undefined });
  }, [route.params, navigation]);
  // useLayoutEffect y no useEffect (e2e del 26/09): con useEffect había un cuadro ya sin
  // esqueleto y todavía sin hábitos, y las cinco dimensiones decían «0/0 CUMPLIDOS» hasta un
  // segundo en un teléfono lento — parecía que se había perdido lo del día.
  useLayoutEffect(() => {
    if (!cargandoBackend && !errorBackend) {
      setHabits(habitsDelBackend);
      setPlanHabits(planHabitsDelBackend);
    } else {
      setHabits([]);
      setPlanHabits([]);
    }
  }, [cargandoBackend, errorBackend, habitsDelBackend, planHabitsDelBackend]);

  /** El hábito de hoy que `TrainingPorHora` tiene que abrir (se consume al abrirlo). */
  const [aperturaPedida, setAperturaPedida] = useState<{ registroId: string; vez: number } | null>(null);

  /**
   * Entrada desde Plan (spec 016, 2026-10-29): «Registrar en Training» de «Tus acciones de hoy» trae `abrirAccionId`, el id de
   * la acción de hoy (una `RocaDiariaApi`: es el `id` de su fila). Se abre como al tocar su fila, en cuanto cargan; si ya
   * no está entre las de hoy (se cumplió desde otro teléfono, o cambió el día) Training queda en su lista, sin error.
   */
  const [accionPedida, setAccionPedida] = useState<string | null>(null);
  useEffect(() => {
    const id = (route.params as { abrirAccionId?: string } | undefined)?.abrirAccionId;
    if (!id) return;
    setAccionPedida(id);
    (navigation as unknown as { setParams: (p: Record<string, unknown>) => void }).setParams({ abrirAccionId: undefined });
  }, [route.params, navigation]);
  useEffect(() => {
    if (!accionPedida || cargandoBackend) return;
    // En lo que trajo `useTraining`, no en `habits`: ver el comentario del aviso, abajo (mismo E2E del 29/10).
    if (!errorBackend && habitsDelBackend.some(h => h.id === accionPedida && h.tieneTrackHoy)) {
      setPracticas(PRACTICAS_CERRADAS);
      setAperturaPedida({ registroId: accionPedida, vez: Date.now() });
    }
    setAccionPedida(null);
  }, [accionPedida, habitsDelBackend, cargandoBackend, errorBackend]);
  /* Se busca en lo que trajo `useTraining` y no en `habits`: al volver a Training se relee de cero (spec 002), y en el
     cuadro en que termina de cargar `habits` todavía es la lista vacía (la copia llega en el `useLayoutEffect` de
     arriba). Con `habits` el pedido se descartaba sin abrir nada (E2E del 29/10). */
  useEffect(() => {
    if (!habitoPedido) return;
    const habito = habitoAAbrir(habitoPedido, errorBackend ? [] : habitsDelBackend, cargandoBackend);
    if (habito === 'esperar') return;
    if (habito) {
      setPracticas(PRACTICAS_CERRADAS);
      setAperturaPedida({ registroId: habito.id, vez: Date.now() });
    }
    setHabitoPedido(null);
  }, [habitoPedido, habitsDelBackend, cargandoBackend, errorBackend]);

  /**
   * Refleja en la tarjeta un cierre que el SERVIDOR YA CONFIRMÓ, sin esperar a releer (V-2,
   * 26/09/2026). No es un marcado optimista: se llama solo después de que `/complete` (o el
   * endpoint propio del hábito) respondió bien. El refresco silencioso que va detrás trae los
   * puntos, la racha y el resto del estado verdadero y pisa esto en cuanto llega.
   *
   * > Antes cada cierre esperaba `await recargarEntrenamiento()`: dos rondas de pedidos con el
   * > esqueleto tapando la pantalla (~3 s) antes de ver el check.
   */
  const reflejarCierreConfirmado = (id: string, conEvidencia = false) => {
    setHabits(prev =>
      prev.map(h =>
        h.id === id
          ? { ...h, done: true, estado: 'COMPLETADO', hasEvidence: h.hasEvidence || conEvidencia }
          : h
      )
    );
    void recargarEntrenamiento();
  };

  /**
   * El `/complete` de los cierres directos (Despertar/Dormir y los que no exigen evidencia), UNA vez
   * por registro aunque lo toquen dos: como la tarjeta no se marca hasta que el servidor confirma,
   * el segundo toque la veía pendiente y mandaba otro pedido, que volvía con un 409 mostrado como
   * error (TRN-02, e2e web del 2026-09-27). Ver `cierreDeRegistro.ts`.
   */
  const [cerrarUnaVez] = useState(() => crearCierreSinRepetir(id => completarRegistro(id, null)));

  /*
   * CONFIRMACIONES EN LÍNEA (rediseño de Training, 2026-10-05). Los avisos de éxito dejaron de ser
   * diálogos («¡Evidencia de Verdad Sellada! 🦅», «Pastilla Renaser registrada 🦅»): una línea con ✓
   * junto a lo que se hizo, que se va sola (`ConfirmacionEnLinea`), con el háptico de logro en el
   * mismo instante. Va debajo de la tarjeta del hábito si está a la vista, si no arriba de la lista.
   * Los errores siguen en diálogo. `clave` cambia con cada aviso: la línea empieza de cero.
   */
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string; habitoId: string | null } | null>(null);
  const confirmar = (texto: string, habitoId: string | null) => {
    tacto.logro();
    setConfirmacion({ clave: Date.now(), texto, habitoId });
  };

  // El habito de post diario lo cierra el compositor del Muro, en OTRA pestana (E-117). Sin esto,
  // la persona lee "hábito completado" alla y vuelve a encontrar la tarjeta sin tildar, porque
  // `useTraining` carga una sola vez al montarse. No se marca nada a mano: se recarga del backend,
  // que es la unica fuente de verdad.
  useEffect(() => escucharPostDiarioCerrado(() => void recargarEntrenamiento()), [recargarEntrenamiento]);
  // D-229: SER creó un hábito (o cambió otro) y la persona lo confirmó en el chat: se recarga del backend.
  useEffect(() => escucharPropuestaConfirmada(() => void recargarEntrenamiento()), [recargarEntrenamiento]);

  // Evidence Upload Modal State
  // El estado de la subida en sí (archivo elegido, nota, error, envío en curso) vive dentro de
  // `EvidenciaHabitoModal`. Acá solo queda CUÁL hábito tiene el modal abierto.
  const [activeEvidenceHabit, setActiveEvidenceHabit] = useState<HabitItem | null>(null);
  /**
   * El hábito de la hoja de evidencia, guardado aparte del estado: la hoja se puede cerrar mientras
   * la subida sigue en camino (arrastrándola, 2026-10-05), y la respuesta tiene que seguir sabiendo
   * de qué tarjeta era.
   */
  const habitoDeLaEvidencia = useRef<HabitItem | null>(null);

  /**
   * REGISTRO CON FOTO (pedido del dueño, 2026-09-26): los hábitos que EXIGEN evidencia abren la
   * cámara directo y después preguntan "¿Qué sentiste?". El flujo entero (verificar que el
   * registro siga siendo de hoy, la cámara, subir y cerrar) vive en `useRegistroConFoto`; es el
   * mismo que usan la tarjeta del chat y la del orbe. Los de evidencia opcional no cambian.
   */
  const registroConFoto = useRegistroConFoto({
    onCompletado: async (registroId, resultado) => {
      reflejarCierreConfirmado(registroId, true);
      // Decisión del dueño (2026-10-05): «Evidencia entregada» y los puntos solo si el servidor los dio.
      confirmar(avisoDeEvidenciaEntregada(resultado.puntosOtorgados), registroId);
    },
    // La pantalla quedó abierta de un día para otro: se recargan los registros de hoy.
    onDiaCambiado: () => void recargarEntrenamiento(),
  });
  const { reanudarPendiente } = registroConFoto;
  // Android puede matar la app con la cámara abierta: al volver, se retoma esa foto.
  useEffect(() => {
    void reanudarPendiente();
  }, [reanudarPendiente]);

  /* "Planificar" ya no se ve afuera: vive en «Tus prácticas» (`PracticasDeTraining`, spec 014), que monta la hoja. */

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
  /* D-260: quien no tiene fila en el programa (personal que nunca empezó) veía «No pudimos cargar tu
     entrenamiento» con «Participante no encontrado: <uuid>». Si el servidor dice que puede empezar
     (`canStartProgram`), se le muestra la invitación de Hoy en lugar del error. Solo se pregunta
     cuando `/home` dice que no está inscrito: el aprendiz y quien ya cursa no pagan la llamada. */
  const programaPropio = useProgramaPersonal(!cargandoDiaPrograma && !inscrito, user?.id ?? null);
  const sinProgramaPropio = programaPropio.puedeActivar;
  const comprobandoPrograma = cargandoDiaPrograma || arranque.estado === 'CARGANDO' || programaPropio.cargando;
  const programaSinConfirmar = comprobandoPrograma || arranque.estado === 'ERROR' || programaPropio.error;
  const alActivarProgramaPropio = useCallback(() => {
    setVersionArranque(v => v + 1);
    void recargarDiaPrograma();
    void recargarEntrenamiento();
  }, [recargarDiaPrograma, recargarEntrenamiento]);
  // Renombrar las dos bebidas (D-127). Va ACA y no solo en Plan: la subvista de habitos de Plan
  // no tiene quien la abra --`setActiveSubView('habitos')` no se llama desde ningun lado--, asi
  // que el boton que vivia alla era inalcanzable. Esta lista, en cambio, es la que la persona
  // mira todos los dias. Comprobado en pantalla el 2026-09-15.
  const renombre = useRenombreLocal(user?.id ?? null);
  /* «Cambiar nombre» y «Arma tu semana los domingos» viven en «Tus prácticas» (spec 014). */
  const espiritu = useEspiritu();
  /** ID elegido al abrir: una recarga nunca debe convertir una entrega de ayer en la de hoy. */
  const pastillaSolicitada = useRef<string | null>(null);
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

  // Interceptar gestos de retroceso en pantalla táctil (Xiaomi / Android / iOS Edge Swipe)
  useSystemBackHandler(() => {
    // `RegistroConFotoModal` también cablea el suyo; esto es la misma red de seguridad. `cerrar`
    // no hace nada mientras se está enviando.
    if (registroConFoto.abierto) {
      registroConFoto.cerrar();
      return true;
    }
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
    // «Tus prácticas» (spec 014): la hoja de Planificar, la dimensión y la pantalla suben UN nivel por vez con el
    // gesto lateral (AGENTS.md §6); nunca cierran la app desde una vista hija. La hoja de Planificar es un `Modal`
    // con su propio atrás (la ‹ de sus pasos), así que acá solo llega lo que está por debajo de ella.
    const atrasDePracticas = alRetroceder(practicas);
    if (atrasDePracticas) {
      setPracticas(atrasDePracticas);
      return true;
    }
    return false; // Permite el comportamiento por defecto si está en el menú raíz
  }, registroConFoto.abierto || pastillaVisible || claseDiariaVisible || activeEvidenceHabit !== null || practicas.abierta);

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
   * marca recién con la respuesta del backend (`reflejarCierreConfirmado`) y un refresco
   * silencioso trae el resto, porque el backend es la unica fuente de verdad.
   */
  const handleEnviarResumen = async (leccionId: string, resumen: string) => {
    if (!habitoClaseDiaria) return;
    let enviado: boolean;
    let habitoId: string | undefined;
    let fechaDelHabito: string | undefined;
    try {
      enviado = await ejecutarEnRegistroVigente(habitoClaseDiaria.id, track => {
        habitoId = track.habitoId;
        fechaDelHabito = track.fechaEjecucion;
        return claseDiaria.enviarResumen(leccionId, resumen);
      });
    } catch (error) {
      Alert.alert('No pudimos registrar la clase', mensajeDeError(error, 'Actualiza tus hábitos e inténtalo de nuevo.'));
      return;
    }
    if (!enviado) return;
    // Issue #33: esta clase cierra por su propio endpoint (no emite `habitoCumplido`); sus alarmas de hoy dejan de sonar igual.
    if (user?.id && habitoId) void alCumplirElHabito(user.id, habitoId, { fecha: fechaDelHabito }).catch(() => undefined);
    cerrarClaseDiaria();
    if (habitoClaseDiaria) {
      reflejarCierreConfirmado(habitoClaseDiaria.id);
    } else {
      void recargarEntrenamiento();
    }
    confirmar('Clase diaria completada', habitoClaseDiaria?.id ?? null);
  };

  /** Deep-link a la leccion del dia dentro de Cursos, por el mismo camino que usa Comunidad. */
  const irALaLeccionDelDia = (clase: ClaseDiariaApi) => {
    if (!clase.cursoId || !clase.leccionId) return;
    setClaseDiariaVisible(false);
    irAPestana('Comunidad', { abrirCursoId: clase.cursoId, abrirLeccionId: clase.leccionId });
  };

  /**
   * DESPERTAR / DORMIR: registrar la hora de la accion y nada mas. Sin marcado optimista — la
   * tarjeta se marca cuando el backend confirma y un refresco silencioso trae el resto; el
   * backend es ademas quien calcula los puntos con
   * la hora real del servidor (no la del telefono).
   *
   * Ya cumplido, no se vuelve a pedir: tocar la tarjeta o «VER» de un Despertar hecho llegaba acá y
   * terminaba en el mismo 409 que el doble toque (TRN-02).
   */
  const registrarSoloHora = async (habit: HabitItem) => {
    // Ya cumplido: nada que registrar. Lo que quedó se lee en la hoja del hábito (spec 014).
    if (habit.done) return;
    try {
      // El check responde ya, en el mismo toque (2026-10-07); la tarjeta se marca recién con la respuesta.
      const resultado = await cerrarConRespuestaInmediata(habit.id, () => cerrarUnaVez(habit.id));
      // `en-curso` = el primer toque todavía está en camino, y es el que marca la tarjeta.
      if (resultado === 'en-curso') return;
      tacto.logro(); // como en `completarHabitoSimple` (2026-10-07): el logro, una vez, con el check
      reflejarCierreConfirmado(habit.id);
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
    // Uno ya cumplido no se vuelve a cerrar. Lo que registró se lee en la hoja del hábito (spec 014); la Pastilla y
    // la Clase diaria conservan su ventana de solo lectura (`openEvidenceModal`).
    if (habit?.done) {
      if (!muestraElCumplidoEnLaTarjeta(habit)) openEvidenceModal(habit);
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
   * Cierra un hábito que no exige evidencia. Sin marcado optimista: la tarjeta se marca cuando el
   * backend confirma y un refresco silencioso trae el resto — el backend es además quien calcula
   * los puntos con la hora del servidor.
   *
   * > **Corregido 2026-09-07.** Acá antes había un `setHabits` y nada más: el check tachaba el
   * > hábito en el estado de React, sin llamar a nadie, y al recargar la pantalla volvía sin
   * > marcar. La interacción principal de Training no guardaba nada.
   */
  const completarHabitoSimple = async (habit: HabitItem) => {
    try {
      // El check se llena a medias y respira mientras el servidor confirma; si falla, vuelve atrás (2026-10-07).
      const resultado = await cerrarConRespuestaInmediata(habit.id, () => cerrarUnaVez(habit.id));
      // Mismo doble toque que Despertar (TRN-02): el segundo no sale ni avisa un error falso.
      if (resultado === 'en-curso') return;
      // El háptico de logro en el mismo instante en que el check se llena (2026-10-07): este cierre era el único
      // de Training sin él (los demás lo tienen por `confirmar`). Uno por cierre: el doble toque no llega acá.
      tacto.logro();
      reflejarCierreConfirmado(habit.id);
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
      reflejarCierreConfirmado(abierta.registroId, true);
      confirmar('Audioterapia registrada', abierta.registroId);
    } catch (e) {
      Alert.alert('No se pudo registrar', mensajeDeError(e, 'Intenta de nuevo en un momento.'));
    }
  };

  /** Mientras se lee la lista de hoy para el aviso de Pareto, un segundo toque no abre un segundo aviso. */
  const comprobandoAccion = useRef(false);

  const openEvidenceModal = (habit: HabitItem) => {
    // Ya cumplido: su estado se lee en la hoja del hábito (spec 014; antes, en la tarjeta). Va PRIMERO, antes
    // de las ramas por clave: la Audioterapia volvía a abrir su formulario y el post diario el Muro,
    // para algo ya entregado. La Pastilla y la Clase diaria siguen abriendo su ventana de solo lectura.
    if (muestraElCumplidoEnLaTarjeta(habit)) return;
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
      pastillaSolicitada.current = habit.id;
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
    // Ya cumplido: no se abre nada que suba y vuelva a cerrar. Antes abría el modal genérico y "sellar" subía el
    // archivo y terminaba en un `/complete` que el backend rechaza porque el registro ya estaba cerrado
    // (2026-09-26). Lo que escribió se lee en la hoja del hábito (spec 014).
    if (habit.done) return;
    // D-259: su día ya cerró (EXPIRADO) o su sesión se rompió (FALLIDO). Va antes de elegir el camino para que
    // valga también en web y en el modal genérico, que antes abrían igual y terminaban en el 409 del servidor.
    if (estaVencido(habit.estado)) {
      const aviso = avisoDeHabitoCerrado(habit.estado, habit.fechaEjecucion);
      Alert.alert(aviso.titulo, aviso.mensaje);
      return;
    }
    if (seRegistraConFoto(habit, Platform.OS === 'web')) {
      void registroConFoto.iniciar(
        {
          registroId: habit.id,
          titulo: tituloVisible({ id: habit.habitoId ?? habit.id, title: habit.title }, renombre.titulos),
          conPregunta: preguntaQueSintio(habit.systemKey),
          medicion: habit.medicion ?? null,
        },
        habit.hasEvidence
      );
      return;
    }
    // Una acción de los objetivos (VIDA Y NEGOCIO): en cada eje primero va la verde. Se avisa ANTES de abrir el registro,
    // con el mismo texto del registro con foto del acompañante; antes se abría y el servidor rechazaba con su código.
    // Si la lista de hoy no se puede leer se abre como siempre: el servidor sigue decidiendo.
    if (habit.dimension === 'VIDA Y NEGOCIO') {
      if (comprobandoAccion.current) return;
      comprobandoAccion.current = true;
      void avisoDeAccionBloqueada(habit.id)
        .then(aviso => {
          if (aviso) {
            Alert.alert(aviso.titulo, aviso.mensaje);
            return;
          }
          habitoDeLaEvidencia.current = habit;
          setActiveEvidenceHabit(habit);
        })
        .finally(() => {
          comprobandoAccion.current = false;
        });
      return;
    }
    habitoDeLaEvidencia.current = habit;
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
    const registroId = pastillaSolicitada.current;
    if (!registroId) return;
    let enviado: boolean;
    let habitoId: string | undefined;
    let fechaDelHabito: string | undefined;
    try {
      enviado = await ejecutarEnRegistroVigente(registroId, track => {
        habitoId = track.habitoId;
        fechaDelHabito = track.fechaEjecucion;
        return espiritu.entregar(dia, texto);
      });
    } catch (error) {
      Alert.alert('No pudimos registrar la Pastilla', mensajeDeError(error, 'Actualiza tus hábitos e inténtalo de nuevo.'));
      return;
    }
    if (!enviado) return;
    // Issue #33: la Pastilla cierra por su propio endpoint (no emite `habitoCumplido`); sus alarmas de hoy dejan de sonar igual.
    if (user?.id && habitoId) void alCumplirElHabito(user.id, habitoId, { fecha: fechaDelHabito }).catch(() => undefined);
    // El borrador ya no representa nada: la respuesta esta en el servidor.
    if (user?.id) {
      await borradorEspiritu.borrar(user.id, dia);
    }
    setPastillaVisible(false);
    // Mantiene el ID elegido al abrir; el endpoint de Espíritu no devuelve el ID del hábito.
    const trackPastilla = habits.find(h => h.id === registroId);
    if (trackPastilla) {
      reflejarCierreConfirmado(trackPastilla.id);
    } else {
      void recargarEntrenamiento();
    }
    void espiritu.recargar();
    confirmar('Pastilla Renaser registrada', trackPastilla?.id ?? null);
  };

  /**
   * Lo llama `EvidenciaHabitoModal` cuando el BACKEND ya cerró el registro. No marca la tarjeta a
   * mano: recarga desde el servidor, para que "completado" en pantalla siempre signifique
   * completado en el servidor. Los puntos son los que otorgó el backend (`puntosOtorgados` de la
   * respuesta de `/complete`), nunca un número calculado acá.
   */
  const handleEvidenciaCompletada = async (puntosOtorgados: number) => {
    const cerrado = habitoDeLaEvidencia.current;
    habitoDeLaEvidencia.current = null;
    setActiveEvidenceHabit(null);
    if (cerrado) {
      reflejarCierreConfirmado(cerrado.id, true);
    } else {
      void recargarEntrenamiento();
    }
    // Decisión del dueño (2026-10-05): «Evidencia entregada» y los puntos solo si el servidor los dio.
    confirmar(avisoDeEvidenciaEntregada(puntosOtorgados), cerrado?.id ?? null);
  };


  /** El contenido de la pantalla: el mismo relleno y ancho en la lista de hoy y en «Tus prácticas». */
  const estiloDelContenido: StyleProp<ViewStyle> = [
    styles.content,
    {
      paddingHorizontal: horizontalPadding,
      maxWidth: contentMaxWidth,
      alignSelf: isTablet ? 'center' : 'stretch',
      width: isTablet ? '100%' : undefined,
    },
  ];
  /** Hoy según el servidor; el del teléfono solo con un backend que todavía no manda el snapshot del día. */
  const hoyIso = fechaDeHoy ?? fechaEnZona(Date.now(), zonaDelTelefono());
  /**
   * Regla del dueño (spec 014): en un día anterior NO se monta ningún componente de registro —ni la cámara, ni la
   * Pastilla, ni la Clase, ni la hoja de evidencia—, y la persona «nunca debería llegar» a subir algo. El servidor ya
   * rechaza esos registros con 409 (D-259); la app no tiene que llegar ahí.
   */
  const viendoUnDiaAnterior = diaElegido !== null && diaElegido < hoyIso;
  /* Al pasar a otro día (o a medianoche) vuelve a hoy, y ningún registro queda abierto de un día para otro. */
  useEffect(() => {
    setDiaElegido(null);
  }, [hoyIso]);
  /* El día del programa y la fase salen de `/home` y solo se leían al montar: al cambiar el día con la app abierta quedaban
     del día anterior («Día 7 de 90» siendo el 8, y el Día 1 corrido). Se relee cuando cambia el día de hoy. */
  const hoyDelDiaDelPrograma = useRef(hoyIso);
  useEffect(() => {
    if (hoyDelDiaDelPrograma.current === hoyIso) return;
    hoyDelDiaDelPrograma.current = hoyIso;
    void recargarDiaPrograma();
  }, [hoyIso, recargarDiaPrograma]);
  const alElegirDia = useCallback((iso: string | null) => {
    setDiaElegido(iso);
    if (iso !== null && iso < hoyIso) {
      setPastillaVisible(false);
      setClaseDiariaVisible(false);
      setActiveEvidenceHabit(null);
      setAudioterapiaAbierta(null);
      registroConFoto.cerrar();
    }
  }, [hoyIso, registroConFoto]);
  const estadoDeLaLista: 'cargando' | 'error' | 'listo' = cargandoBackend ? 'cargando' : errorBackend !== null ? 'error' : 'listo';
  /** «Tus prácticas» no ofrece nada que planificar antes de que el programa arranque. */
  const practicasDeshabilitadas = programaSinArrancar || programaSinConfirmar || sinProgramaPropio;

  /* Spec 002, fase 2: si «Hábitos» todavía no le toca a esta cuenta (despliegue, rol personalizado), la pestaña queda
     con un texto neutro, sin el ícono de mantenimiento: no está en arreglo, todavía no lo tiene. */
  if (!habitosPrendidos.disponible) {
    return (
      <SafeAreaView edges={BORDES_DE_UNA_PESTANA} style={{ flex: 1, backgroundColor: c.bg }}>
        <ScreenHeader title="TRAINING" />
        <SeccionNoDisponible
          {...barraAlDesplazar}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: isTablet ? 'center' : 'stretch', width: isTablet ? '100%' : undefined },
          ]}
        />
      </SafeAreaView>
    );
  }

  /* Spec 002: con «Hábitos» apagado por Soporte TI, el aviso de mantenimiento ocupa la pestaña (la cabecera queda). */
  if (!habitosPrendidos.prendida) {
    return (
      <SafeAreaView edges={BORDES_DE_UNA_PESTANA} style={{ flex: 1, backgroundColor: c.bg }}>
        <ScreenHeader title="TRAINING" />
        <SeccionEnMantenimiento
          {...barraAlDesplazar}
          aviso={habitosPrendidos.aviso}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: isTablet ? 'center' : 'stretch', width: isTablet ? '100%' : undefined },
          ]}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={BORDES_DE_UNA_PESTANA} style={{ flex: 1, backgroundColor: c.bg }}>
      {practicas.abierta ? (
        /* «Tus prácticas» (el engranaje, spec 014): pantalla completa, solo para planificar. Ninguna fila registra. */
        <PracticasDeTraining
          estado={practicas}
          onEstado={setPracticas}
          habits={habits}
          planHabits={planHabits}
          cargando={cargandoBackend}
          error={errorBackend}
          onReintentar={() => void recargarEntrenamiento(true)}
          deshabilitada={practicasDeshabilitadas}
          sinLista={programaSinConfirmar || sinProgramaPropio}
          userId={user?.id}
          renombre={renombre}
          onGuardado={texto => {
            void recargarEntrenamiento();
            // El hábito recién creado: se confirma en línea (2026-10-05).
            if (texto) confirmar(texto, null);
          }}
          confirmacion={confirmacion}
          onConfirmacionTerminada={() => setConfirmacion(null)}
          scrollProps={barraAlDesplazar}
          estiloDelContenido={estiloDelContenido}
        />
      ) : (
        <>
          {/* El engranaje a la derecha (24 en una caja de 44 con `hitSlop`): «Tus prácticas», para planificar. */}
          <ScreenHeader
            title="TRAINING"
            right="settings"
            onPressRight={() => setPracticas(PRACTICAS_ABIERTAS)}
            etiquetaRight="Tus prácticas: planificar"
          />

          <ScrollView {...barraAlDesplazar} contentContainerStyle={estiloDelContenido} showsVerticalScrollIndicator={false}>
            {arranque.estado === 'ERROR' || programaPropio.error ? (
              <AvisoConsultaDiaUno mensaje={arranque.estado === 'ERROR' ? arranque.mensaje : undefined} reintentar={() => {
                setVersionArranque(v => v + 1);
                programaPropio.recargar();
                void recargarDiaPrograma();
                void recargarEntrenamiento();
              }} />
            ) : null}
            {/* PROGRAMA SIN ARRANCAR — la misma compuerta que Plan tiene desde D-84. */}
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
                {/* D-260: el aviso pedía elegir y no había dónde. Abre el selector del onboarding. */}
                {arranque.estado === 'PENDIENTE_ELEGIR' ? (
                  <View style={{ marginTop: 4 }}>
                    <BotonElegirDiaUno onActivado={alActivarProgramaPropio} />
                  </View>
                ) : null}
              </View>
            )}

            {/* Sin programa propio (D-260): la invitación de Hoy, no el error técnico. */}
            {sinProgramaPropio ? (
              <InvitacionProgramaPropio programa={programaPropio} onActivado={alActivarProgramaPropio} />
            ) : null}

            {/* Training por hora (spec 014): el día, la semana y una sola lista por hora. Mientras se comprueba el
                programa, el mismo esqueleto de siempre; sin programa propio o sin confirmar, no hay lista. */}
            {comprobandoPrograma && !sinProgramaPropio ? (
              <View accessibilityLabel="Cargando tu entrenamiento" style={{ gap: 12 }}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={[styles.esqueleto, { borderColor: c.border, backgroundColor: c.cardBg }]} />
                ))}
              </View>
            ) : !programaSinConfirmar && !sinProgramaPropio && !programaSinArrancar ? (
              <TrainingPorHora
                activa={trainingActivo}
                estado={estadoDeLaLista}
                mensajeDeError={errorBackend}
                onReintentar={() => void recargarEntrenamiento(true)}
                cuentaId={user?.id ?? 'anon'}
                habits={habits}
                planHabits={planHabits}
                hoyIso={hoyIso}
                diaElegido={diaElegido}
                onElegirDia={alElegirDia}
                diaPrograma={cargandoDiaPrograma ? null : diaPrograma}
                fase={fase}
                titulos={renombre.titulos}
                eventosPrendidos={eventosPrendidos.prendida}
                cierrePrendido={planPrendido.prendida && planPrendido.disponible}
                confirmacion={confirmacion}
                onConfirmacionTerminada={() => setConfirmacion(null)}
                aperturaPedida={aperturaPedida}
                onAperturaAtendida={() => setAperturaPedida(null)}
                onRegistrar={openEvidenceModal}
                onMarcar={habit => toggleHabitState(habit.id)}
                onAbrirEvento={eventoId => irAPestana('Comunidad', { abrirEventoId: eventoId })}
              />
            ) : null}
          </ScrollView>
        </>
      )}

      {/* Los cuatro registros (evidencia genérica, cámara con «¿Qué sentiste?», Pastilla/Audioterapia y Clase diaria) se
          montan SOLO fuera de un día anterior (regla del dueño, spec 014): ahí no existe forma de subir nada. */}
      {!viendoUnDiaAnterior ? (
        <>
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
                ? datos => sellarAccionDeTraining(activeEvidenceHabit.id, datos)
                : undefined
            }
            titulo={activeEvidenceHabit?.title ?? ''}
            medicion={activeEvidenceHabit?.medicion ?? null}
            contexto={
              activeEvidenceHabit
                ? `${DIMENSIONES_CONFIG.find(d => d.key === activeEvidenceHabit.dimension)?.nombre ?? activeEvidenceHabit.dimension} · ${activeEvidenceHabit.tag}`
                : undefined
            }
            notaInicial={activeEvidenceHabit?.respuestaTexto ?? activeEvidenceHabit?.note ?? ''}
            onCerrar={() => setActiveEvidenceHabit(null)}
            onCompletado={handleEvidenciaCompletada}
          />

          {/* REGISTRO CON FOTO: la foto arriba y "¿Qué sentiste?" abajo (hábitos que exigen evidencia). */}
          <RegistroConFotoModal {...registroConFoto.modal} />

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
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Aviso de "tu programa todavía no arrancó". Mismo lenguaje visual que el de Plan: recuadro
  // tenue con candado, no una alerta roja — no es un error, es que todavía no es el momento.
  avisoSinArrancar: {
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
    marginBottom: space.gapLg,
    gap: 8,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: ESPACIO_PARA_LANZADOR,
  },
  // El esqueleto mientras se comprueba el programa: filas apagadas, no datos de relleno.
  esqueleto: {
    minHeight: 66,
    borderWidth: 1,
    borderRadius: space.radius,
    opacity: 0.45,
  },
});
