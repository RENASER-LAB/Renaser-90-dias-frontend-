import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { ScreenHeader, MicroLabel } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { useTraining } from '../features/training/hooks/useTraining';
import { ProximoAVencerCard } from '../features/training/components/ProximoAVencerCard';
import { EvidenciaHabitoModal } from '../features/habits/components/EvidenciaHabitoModal';
import { completarRegistro } from '../features/habits/api/evidenciaHabitoApi';
import { mensajeDeError } from '../services/http/apiClient';
import { useAuth } from '../features/auth/context/AuthContext';
import { CLAVE_SISTEMA_PASTILLA_RENACER } from '../features/spirit/api/spiritApi';
import { PastillaRenacerModal } from '../features/spirit/components/PastillaRenacerModal';
import { useEspiritu } from '../features/spirit/hooks/useEspiritu';
import { ClaseDiariaModal } from '../features/academy/components/ClaseDiariaModal';
import { useClaseDiaria } from '../features/academy/hooks/useClaseDiaria';
import type { ClaseDiariaApi } from '../features/academy/types/academy.types';
import { irAPestana } from '../navigation/navegacionRef';
import { borradorEspiritu } from '../features/spirit/storage/borradorEspiritu';

/**
 * Habitos con FLUJO PROPIO: no se cierran con el checkbox ni subiendo un archivo. Se ramifica por
 * `clave_sistema` del catalogo y NUNCA por titulo — el titulo es editable desde el panel admin, y
 * emparejar por texto haria desaparecer la funcion en silencio el dia que alguien lo renombre.
 */
const CLAVE_SISTEMA_CLASE_DIARIA = 'DAILY_CLASS';
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
  note?: string;
  /**
   * Clave FUNCIONAL del hábito de catálogo (`DAILY_CLASS`, `PASTILLA_RENACER`…), `null` en las
   * rocas y en los hábitos personales. Es lo que ya emite `useTraining` y lo único estable para
   * reconocer un hábito puntual: el título lo puede renombrar el propio aprendiz.
   */
  systemKey?: string | null;
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
  recommendedClass: {
    title: string;
    duration: string;
    desc: string;
    macacoTip: string;
  };
}

const DIMENSIONES_CONFIG: DimensionConfig[] = [
  {
    key: 'CUERPO',
    title: 'CUERPO',
    sub: 'Fuerza somática · Movilidad · Energía',
    icon: 'body',
    recommendedClass: {
      title: 'Activación Fascial y Postura de Poder',
      duration: '25 min · Alta Intensidad',
      desc: 'Despierta la máxima tensión isométrica y presencia somática para liderar tu día.',
      macacoTip: 'La energía corporal no se negocia: 15 min de tensión activa cambian tu química mental.',
    },
  },
  {
    key: 'MENTE',
    title: 'MENTE',
    sub: 'Enfoque · Mentalidad · Aprendizaje',
    icon: 'brain',
    recommendedClass: {
      title: 'Clase 08 · Observa sin juzgar',
      duration: '12 min · Audio Guía',
      desc: 'Diferencia hecho, interpretación y reacción antes de intentar cambiarla.',
      macacoTip: 'Hoy registraste frustración dos veces. Escucha pensando: ¿qué hecho ocurrió y qué historia añadiste?',
    },
  },
  {
    key: 'EMOCIONES',
    title: 'EMOCIONES',
    sub: 'Gestión Emocional · Relaciones · Propósito',
    icon: 'heart',
    recommendedClass: {
      title: 'Regulación Nerviosa y Coherencia Cardíaca',
      duration: '15 min · Respiración',
      desc: 'Técnica de anclaje de paz y presencia somática ante momentos de alta presión o reactividad.',
      macacoTip: 'No reprimas la emoción: dale 90 segundos de respiración diafragmática para que se disipe.',
    },
  },
  {
    key: 'ESPÍRITU',
    title: 'ESPÍRITU',
    sub: 'Propósito · Fe · Gratitud',
    icon: 'spark',
    recommendedClass: {
      title: 'Visualización de Victoria y Certeza Interior',
      duration: '10 min · Audio Inmersivo',
      desc: 'Alinea tu mente subconsciente con el propósito innegociable de tu protocolo de 90 días.',
      macacoTip: 'La certeza no nace de los resultados externos, sino de la fidelidad a tu palabra cada día.',
    },
  },
  {
    key: 'VIDA Y NEGOCIO',
    title: 'VIDA Y NEGOCIO',
    sub: 'Hábitos · Entorno · Estilo de Vida · Estrategia',
    icon: 'briefcase',
    recommendedClass: {
      title: 'Arquitectura del Tiempo y Alto Apalancamiento',
      duration: '30 min · Estratégico',
      desc: 'Identificación de tu Única Prioridad de Alto Impacto y eliminación de micro-distracciones.',
      macacoTip: 'Antes de llenar tu agenda, elimina lo que no requiere tu genialidad (Filtro 80/20 Pareto).',
    },
  },
];

// `INITIAL_HABITS` se eliminó: eran 17 hábitos inventados que no existen en el catálogo, y 11 de
// ellos venían con `done: true`, `hasEvidence: true` y `streak: 37` — es decir, la pantalla
// mostraba hábitos ya marcados como hechos y con evidencia que nadie había hecho ni subido.
// `useTraining` ya distingue "todavía no respondió" de "respondió vacío", así que la pantalla
// arranca en [] y dibuja esqueleto / error / estado vacío según corresponda.

export default function TrainingScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet, horizontalPadding } = useResponsive();
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
    loading: cargandoBackend,
    error: errorBackend,
    recargar: recargarEntrenamiento,
  } = useTraining();
  const [habits, setHabits] = useState<HabitItem[]>([]);
  useEffect(() => {
    if (!cargandoBackend && !errorBackend) {
      setHabits(habitsDelBackend);
    }
  }, [cargandoBackend, errorBackend, habitsDelBackend]);

  // Evidence Upload Modal State
  // El estado de la subida en sí (archivo elegido, nota, error, envío en curso) vive dentro de
  // `EvidenciaHabitoModal`. Acá solo queda CUÁL hábito tiene el modal abierto.
  const [activeEvidenceHabit, setActiveEvidenceHabit] = useState<HabitItem | null>(null);

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
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newTag, setNewTag] = useState('INNEGOCIABLE');

  // Interceptar gestos de retroceso en pantalla táctil (Xiaomi / Android / iOS Edge Swipe)
  useSystemBackHandler(() => {
    if (addModalVisible) {
      setAddModalVisible(false);
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
    if (selectedDimension !== null) {
      setSelectedDimension(null);
      return true;
    }
    return false; // Permite el comportamiento por defecto si está en el menú raíz
  }, addModalVisible || pastillaVisible || claseDiariaVisible || activeEvidenceHabit !== null || selectedDimension !== null);

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
    setHabits(prev =>
      prev.map(h => {
        if (h.id !== id) return h;
        const newDone = !h.done;
        return {
          ...h,
          done: newDone,
          hasEvidence: newDone,
          streak: newDone ? h.streak + 1 : Math.max(h.streak - 1, 0),
        };
      })
    );
  };

  const openEvidenceModal = (habit: HabitItem) => {
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
    Alert.alert('Pastilla Renacer registrada 🦅', 'Tu respuesta quedo guardada y el habito, completado.');
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

  const handleCreateHabit = () => {
    if (!newTitle.trim()) {
      Alert.alert('Título requerido', 'Por favor ingresa el nombre de tu nuevo hábito.');
      return;
    }
    if (!selectedDimension) return;

    const newHabit: HabitItem = {
      id: Date.now().toString(),
      dimension: selectedDimension.key,
      title: newTitle.trim(),
      time: newTime.trim() || 'Horario flexible · 15 min',
      tag: newTag,
      streak: 1,
      done: false,
      hasEvidence: false,
    };

    setHabits(prev => [newHabit, ...prev]);
    setNewTitle('');
    setNewTime('');
    setAddModalVisible(false);
    Alert.alert('¡Hábito Creado! 🦅', `"${newHabit.title}" ha sido añadido a tu dimensión ${selectedDimension.title}.`);
  };

  // Filter habits for selected dimension
  const currentDimensionHabits = selectedDimension
    ? habits.filter(h => h.dimension === selectedDimension.key)
    : [];

  // "CUMPLIDOS" cuenta hábitos/roca marcados como hechos (done); la barra de "Evidencias selladas
  // hoy" cuenta los que además tienen evidencia sellada (hasEvidence) — son dos métricas reales
  // distintas, ambas calculables con lo que devuelve el backend.
  const completedEvidencesCount = currentDimensionHabits.filter(h => h.done).length;
  const sealedEvidencesCount = currentDimensionHabits.filter(h => h.hasEvidence).length;
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
            maxWidth: isTablet ? 560 : undefined,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* VISTA 1: CATÁLOGO DE LAS 5 DIMENSIONES PRINCIPALES                        */}
        {/* ========================================================================= */}
        {selectedDimension === null && (
          <View style={{ gap: 14 }}>
            <View style={{ alignItems: 'center', paddingTop: 12 }}>
              <Text style={[t.sectionTitle, { color: c.text }]}>TU ENTRENAMIENTO INTEGRAL</Text>
              <Text style={[t.sectionSub, { color: c.micro, marginTop: 4 }]}>Cinco dimensiones. Un sistema.</Text>
            </View>

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
              <View style={{ gap: 10, paddingVertical: 8 }} accessibilityLabel="Cargando tu entrenamiento">
                {[0, 1, 2, 3, 4].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.dimensionCard,
                      { borderColor: c.border, backgroundColor: c.cardBg, opacity: 0.45, minHeight: 72 },
                    ]}
                  />
                ))}
              </View>
            )}

            {!cargandoBackend && errorBackend !== null && (
              <View
                style={{
                  gap: 10,
                  padding: 18,
                  marginVertical: 8,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#E06A66',
                  backgroundColor: c.cardBg,
                }}
              >
                <Text style={[t.cardTitle, { color: c.text, fontSize: 15 }]}>
                  No pudimos cargar tu entrenamiento
                </Text>
                <Text style={[t.body, { color: c.micro, fontSize: 13.5 }]}>{errorBackend}</Text>
                <Pressable
                  onPress={() => {
                    void recargarEntrenamiento();
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

            <View style={{ gap: 10, paddingVertical: 8 }}>
              {!cargandoBackend && errorBackend === null && DIMENSIONES_CONFIG.map(d => {
                const dimHabits = habits.filter(h => h.dimension === d.key);
                // "EVIDENCIAS" cuenta ítems con evidencia sellada (hasEvidence), no ítems marcados
                // como hechos (done) — pueden divergir con datos reales.
                const evidenceCount = dimHabits.filter(h => h.hasEvidence).length;

                return (
                  <Pressable
                    key={d.key}
                    onPress={() => {
                      setSelectedDimension(d);
                      setInnerTab('habitos');
                    }}
                    style={[styles.dimensionCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
                  >
                    <View
                      style={[
                        styles.medallion,
                        {
                          borderColor: c.gold,
                          width: medallionSize,
                          height: medallionSize,
                          borderRadius: medallionSize / 2,
                          backgroundColor: c.cardBgAlt,
                        },
                      ]}
                    >
                      <Icon name={d.icon} size={rs(20)} color={c.gold} strokeWidth={1.1} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.dimensionHeaderRow}>
                        <Text style={{ fontFamily: 'Jost_700Bold', color: c.text, letterSpacing: 1.5, fontSize: 14 }}>
                          {d.title}
                        </Text>
                        <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                          {evidenceCount}/{dimHabits.length} EVIDENCIAS
                        </Text>
                      </View>
                      <Text style={[t.small, { color: c.micro, marginTop: 2, lineHeight: 16 }]}>
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
          <View style={{ gap: 14 }}>
            {/* Top Bar con Botón Volver */}
            <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
              <Pressable
                onPress={() => setSelectedDimension(null)}
                style={styles.backTrainingBtn}
                hitSlop={8}
              >
                <Icon name="arrowLeft" size={14} color={c.gold} />
                <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                  VOLVER A TRAINING
                </Text>
              </Pressable>

              <View style={[styles.categoryPillBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
                <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                  DIMENSIÓN · {selectedDimension.title}
                </Text>
              </View>
            </View>

            {/* Dimension Summary Card */}
            <View style={[styles.dimSummaryCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <View style={styles.dimSummaryHeader}>
                <View style={[styles.dimAvatarMedallion, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                  <Icon name={selectedDimension.icon} size={22} color={c.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 17 }]}>
                      {selectedDimension.title}
                    </Text>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 11 }]}>
                      {completedEvidencesCount}/{currentDimensionHabits.length} CUMPLIDOS
                    </Text>
                  </View>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 11, marginTop: 1 }]}>
                    {selectedDimension.sub}
                  </Text>
                </View>
              </View>

              {/* Dimension Progress Bar */}
              <View style={{ gap: 4, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Evidencias selladas hoy</Text>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>{dimensionProgress}%</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: c.gold, width: `${dimensionProgress}%` }]} />
                </View>
              </View>
            </View>

            {/* Sub-Tabs: HÁBITOS & EVIDENCIAS vs GUÍAS Y AUDIOS */}
            <View style={[styles.innerTabBar, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Pressable
                onPress={() => setInnerTab('habitos')}
                style={[
                  styles.innerTabBtn,
                  innerTab === 'habitos' && [styles.innerTabBtnActive, { backgroundColor: c.cardBgAlt, borderColor: c.gold }],
                ]}
              >
                <Text
                  style={[
                    t.micro,
                    {
                      color: innerTab === 'habitos' ? c.gold : c.textSoft,
                      fontWeight: innerTab === 'habitos' ? '700' : '500',
                      fontSize: 10.5,
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
                  innerTab === 'guias' && [styles.innerTabBtnActive, { backgroundColor: c.cardBgAlt, borderColor: c.gold }],
                ]}
              >
                <Text
                  style={[
                    t.micro,
                    {
                      color: innerTab === 'guias' ? c.gold : c.textSoft,
                      fontWeight: innerTab === 'guias' ? '700' : '500',
                      fontSize: 10.5,
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
              <View style={{ gap: 10 }}>
                {/* Action bar to add new custom habit */}
                <View style={styles.habitsActionRow}>
                  <MicroLabel>PRÁCTICAS ACTIVAS ({currentDimensionHabits.length})</MicroLabel>
                  <Pressable
                    onPress={() => setAddModalVisible(true)}
                    style={styles.addHabitLink}
                    hitSlop={8}
                  >
                    <Icon name="plus" size={12} color={c.gold} />
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                      AGREGAR HÁBITO
                    </Text>
                  </Pressable>
                </View>

                {/* Sin hábitos en esta dimensión: es un estado legítimo (día 0, plan sin
                    generar), no un hueco que haya que tapar con datos de relleno. */}
                {currentDimensionHabits.length === 0 && (
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
                    <Text style={[t.cardTitle, { color: c.text, fontSize: 15 }]}>
                      Todavía no hay hábitos en {selectedDimension.title}
                    </Text>
                    <Text style={[t.body, { color: c.micro, fontSize: 13.5 }]}>
                      Cuando tu plan del día se genere, los vas a ver acá con su evidencia.
                    </Text>
                  </View>
                )}

                {/* Multiple Habits Card List */}
                {currentDimensionHabits.map(habit => (
                  <View
                    key={habit.id}
                    style={[
                      styles.habitCard,
                      {
                        borderColor: habit.done ? '#4E9F76' : c.border,
                        backgroundColor: habit.done ? c.cardBgAlt : c.cardBg,
                      },
                    ]}
                  >
                    {/* Checkbox circular interactivo */}
                    <Pressable
                      onPress={() => toggleHabitState(habit.id)}
                      style={[
                        styles.habitCheckCircle,
                        {
                          borderColor: habit.done ? '#4E9F76' : c.tabInactive,
                          backgroundColor: habit.done ? '#4E9F76' : 'transparent',
                        },
                      ]}
                    >
                      {habit.done && <Icon name="check" size={13} color="#FFFFFF" strokeWidth={2.2} />}
                    </Pressable>

                    {/* Habit Info & Tap to open Evidence */}
                    <Pressable
                      onPress={() => openEvidenceModal(habit)}
                      style={{ flex: 1, gap: 2 }}
                    >
                      <View style={styles.habitMetaRow}>
                        <View style={[styles.habitTagBadge, { backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }]}>
                          <Text style={[t.micro, { color: c.gold, fontSize: 9, fontWeight: '700' }]}>
                            {habit.tag}
                          </Text>
                        </View>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 10, fontWeight: '700' }]}>
                          🔥 {habit.streak} DÍAS
                        </Text>
                      </View>

                      <Text
                        style={[
                          t.body,
                          {
                            color: habit.done ? c.textStrong : c.text,
                            fontSize: 13.5,
                            fontWeight: habit.done ? '600' : '400',
                            textDecorationLine: habit.done ? 'line-through' : 'none',
                            opacity: habit.done ? 0.85 : 1,
                          },
                        ]}
                      >
                        {habit.title}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
                          {habit.time}
                        </Text>
                        {habit.hasEvidence && (
                          <Text style={[t.micro, { color: '#4E9F76', fontSize: 9.5, fontWeight: '700' }]}>
                            📷 Evidencia Sellada
                          </Text>
                        )}
                      </View>
                    </Pressable>

                    {/* Dedicated Evidence Button */}
                    <Pressable
                      onPress={() => openEvidenceModal(habit)}
                      style={[
                        styles.evidenceBtn,
                        {
                          borderColor: habit.hasEvidence ? '#4E9F76' : c.border,
                          backgroundColor: habit.hasEvidence ? 'rgba(78, 159, 118, 0.12)' : c.cardBgAlt,
                        },
                      ]}
                      hitSlop={8}
                    >
                      <Icon name="camera" size={13} color={habit.hasEvidence ? '#4E9F76' : c.gold} />
                      <Text
                        style={[
                          t.micro,
                          {
                            color: habit.hasEvidence ? '#4E9F76' : c.gold,
                            fontSize: 9,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {habit.hasEvidence ? 'VER' : 'SUBIR'}
                      </Text>
                    </Pressable>
                  </View>
                ))}

                {/* Consistency Banner */}
                <View style={[styles.consistencyBanner, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Icon name="spark" size={16} color={c.gold} />
                  <View style={{ flex: 1 }}>
                    <Text style={[t.body, { color: c.textStrong, fontSize: 12.5, fontWeight: '600' }]}>
                      Consistencia de la Dimensión
                    </Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
                      37 días consecutivos cumpliendo al menos el 70% de tus evidencias
                    </Text>
                  </View>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 13 }]}>94%</Text>
                </View>
              </View>
            )}

            {/* =================================================================== */}
            {/* PESTAÑA B: GUÍAS Y AUDIOS DE LA DIMENSIÓN                          */}
            {/* =================================================================== */}
            {innerTab === 'guias' && (
              <View style={{ gap: 12 }}>
                {/* Featured Class Card */}
                <View style={[styles.guideHeroCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                  <View style={styles.guideTopRow}>
                    <View style={[styles.guideTag, { backgroundColor: c.gold }]}>
                      <Text style={[t.micro, { color: '#1E1B18', fontWeight: '800', fontSize: 9.5 }]}>
                        AUDIO GUÍA RECOMENDADA
                      </Text>
                    </View>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>
                      {selectedDimension.recommendedClass.duration}
                    </Text>
                  </View>

                  <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 16, marginTop: 4 }]}>
                    {selectedDimension.recommendedClass.title}
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 18 }]}>
                    {selectedDimension.recommendedClass.desc}
                  </Text>

                  <GoldButton
                    label="▶ ESCUCHAR SESIÓN GUIADA"
                    onPress={() => Alert.alert('Reproductor de Audio', `Iniciando: ${selectedDimension.recommendedClass.title}`)}
                    style={{ marginTop: 6 }}
                  />
                </View>

                {/* Macaco Context Note */}
                <View style={[styles.macacoContextCard, { borderColor: c.borderStrong, backgroundColor: c.cardBg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>🐒</Text>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>
                      MACACO · ANTES DE ESCUCHAR
                    </Text>
                  </View>
                  <Text style={[t.body, { color: c.text, fontSize: 12.5, lineHeight: 18 }]}>
                    {selectedDimension.recommendedClass.macacoTip}
                  </Text>
                </View>

                {/* Progressive Phase Pathway */}
                <View style={{ gap: 6 }}>
                  <MicroLabel>RUTA DE CLASES (FASE 2 · ACELERACIÓN)</MicroLabel>
                  {[
                    { num: '01', title: 'Fundamentos y Ser Verdad', status: '✓ Completada' },
                    { num: '02', title: 'Qué haces cuando nadie te mira', status: '✓ Completada' },
                    { num: '03', title: 'El observador consciente', status: '✓ Completada' },
                    { num: '04', title: 'Pensamiento ≠ Realidad', status: '▶ Disponible' },
                    { num: '05', title: 'El patrón repetido', status: '🔒 Día 40' },
                  ].map(cls => (
                    <View
                      key={cls.num}
                      style={[styles.classItemRow, { borderColor: c.border, backgroundColor: c.cardBg }]}
                    >
                      <Text style={[t.micro, { color: c.gold, fontWeight: '700', width: 22 }]}>
                        {cls.num}
                      </Text>
                      <Text style={[t.body, { color: c.textStrong, flex: 1, fontSize: 13 }]}>
                        {cls.title}
                      </Text>
                      <Text style={[t.micro, { color: cls.status.includes('✓') ? '#4E9F76' : cls.status.includes('▶') ? c.gold : c.textSoft, fontWeight: '700' }]}>
                        {cls.status}
                      </Text>
                    </View>
                  ))}
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
      {/* MODAL: PASTILLA RENACER (audio del día + preguntas)                       */}
      {/* ========================================================================= */}
      <PastillaRenacerModal
        visible={pastillaVisible}
        userId={user?.id ?? 'anon'}
        dia={diaDePastilla}
        cargando={espiritu.cargando}
        error={espiritu.error}
        enviando={espiritu.enviando}
        errorEnvio={espiritu.errorEnvio}
        onEntregar={(dia, texto) => {
          void handleEntregarPastilla(dia, texto);
        }}
        onCerrar={() => {
          espiritu.limpiarError();
          setPastillaVisible(false);
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

      {/* ========================================================================= */}
      {/* MODAL: AGREGAR NUEVO HÁBITO PERSONALIZADO                                 */}
      {/* ========================================================================= */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.cardBg, borderColor: c.gold }]}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <MicroLabel>NUEVA PRÁCTICA</MicroLabel>
              <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18 }]}>
                Agregar Hábito a {selectedDimension?.title}
              </Text>
            </View>

            <View style={{ gap: 10, marginTop: 10 }}>
              <View style={{ gap: 4 }}>
                <MicroLabel>NOMBRE DEL HÁBITO / PRÁCTICA</MicroLabel>
                <TextInput
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Ej. Caminar 10,000 pasos / Ducha fría"
                  placeholderTextColor={c.tabInactive}
                  style={[styles.modalInput, { color: c.textStrong, borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                />
              </View>

              <View style={{ gap: 4 }}>
                <MicroLabel>HORARIO / FRECUENCIA / TIEMPO</MicroLabel>
                <TextInput
                  value={newTime}
                  onChangeText={setNewTime}
                  placeholder="Ej. 17:00 PM · 20 min"
                  placeholderTextColor={c.tabInactive}
                  style={[styles.modalInput, { color: c.textStrong, borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                />
              </View>

              <View style={{ gap: 4 }}>
                <MicroLabel>ETIQUETA DE PRIORIDAD</MicroLabel>
                <View style={styles.tagPickerRow}>
                  {['INNEGOCIABLE', 'SALUD', 'ENERGÍA', 'APRENDIZAJE', 'ESTRATEGIA'].map(tagOption => (
                    <Pressable
                      key={tagOption}
                      onPress={() => setNewTag(tagOption)}
                      style={[
                        styles.tagOptionBtn,
                        {
                          borderColor: newTag === tagOption ? c.gold : c.border,
                          backgroundColor: newTag === tagOption ? c.cardBgAlt : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          t.micro,
                          {
                            color: newTag === tagOption ? c.gold : c.textSoft,
                            fontWeight: newTag === tagOption ? '700' : '500',
                            fontSize: 9.5,
                          },
                        ]}
                      >
                        {tagOption}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <GoldButton
              label="✓ CREAR HÁBITO EN ESTA DIMENSIÓN"
              onPress={handleCreateHabit}
              style={{ marginTop: 8 }}
            />

            <Pressable
              onPress={() => setAddModalVisible(false)}
              style={[styles.closeModalBtn, { borderColor: c.border }]}
            >
              <Text style={[t.micro, { color: c.textSoft, fontWeight: '700', fontSize: 11, textAlign: 'center' }]}>
                CANCELAR
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  dimensionCard: {
    flex: 1,
    minHeight: 74,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  medallion: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dimensionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  categoryPillBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dimSummaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  dimSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dimAvatarMedallion: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
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
  innerTabBar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  innerTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  innerTabBtnActive: {
    borderWidth: 1,
  },
  habitsActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  addHabitLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  habitCard: {
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitTagBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  evidenceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  consistencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginTop: 4,
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
  closeModalBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
  },
});