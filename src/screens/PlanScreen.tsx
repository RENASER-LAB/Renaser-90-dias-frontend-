import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, ScreenHeader } from '../components/ui';
import { Icon } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { usePlanHabitos } from '../features/habits/hooks/usePlanHabitos';
import { DIAS_DEL_PROGRAMA, puntoDelMedidor, useProgramaDia } from '../features/programa/hooks/useProgramaDia';
import { HoraPickerModal } from '../features/habits/components/HoraPickerModal';
import * as habitsApi from '../features/habits/api/habitsApi';
import { aMomento } from '../features/habits/api/habitsMappers';

// =========================================================================
// TIPOS: PLAN, HÁBITOS 7 DÍAS Y OBJETIVOS EN 3 NIVELES
// =========================================================================
export type DayOfWeek = 'LUN' | 'MAR' | 'MIÉ' | 'JUE' | 'VIE' | 'SÁB' | 'DOM';
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
  /** `false` = obligatorio: el interruptor de activar/pausar se muestra bloqueado en ON. */
  isOptional: boolean;
  /** false = el aprendiz no puede sacarlo de su plan; el interruptor queda en ON y bloqueado. */
  isDeactivatable: boolean;
}

export interface WeeklyGoalItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface PlanGoals {
  principalTitle: string;
  principalCurrentVal: number;
  principalTargetVal: number;
  principalUnit: string;
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

const INITIAL_GOALS: PlanGoals = {
  principalTitle: 'Facturar $30,000 USD en Contratos High-Ticket',
  principalCurrentVal: 19500,
  principalTargetVal: 30000,
  principalUnit: 'USD',
  weeklyTitle: 'Sprint de Cierre: 3 Propuestas Comerciales & Cero Dolor Lumbar',
  weeklySubtitle: 'Semana del 14 al 20 de Agosto · Foco en Ventas y Estabilidad',
  weeklyItems: [
    { id: 'w1', text: 'Enviar propuesta a Corporación Delta ($8,500 USD)', completed: true },
    { id: 'w2', text: 'Completar 5 sesiones de tensión isométrica lumbar', completed: true },
    { id: 'w3', text: 'Cerrar contrato Grupo Sol ($11,000 USD)', completed: true },
    { id: 'w4', text: 'Auditoría financiera del viernes 18:00', completed: false },
  ],
  dailyTitle: 'Cerrar el Bloque de 90m y sellar la evidencia fotográfica antes de las 12:00',
  dailyCompleted: true,
};

const DAY_OPTIONS: DayOfWeek[] = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
/**
 * Fechas reales de la semana en curso, de lunes a domingo. Antes eran del 14 al 20 escritas a
 * mano: la pantalla mostraba días que no correspondían a la fecha actual.
 */
function fechasDeEstaSemana(): Record<DayOfWeek, string> {
  const hoy = new Date();
  // getDay() devuelve 0 para domingo; acá la semana arranca el lunes, así que el domingo cuenta
  // como el séptimo día y no como el primero.
  const diaDeLaSemana = (hoy.getDay() + 6) % 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diaDeLaSemana);
  const fechas = {} as Record<DayOfWeek, string>;
  DAY_OPTIONS.forEach((dia, indice) => {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + indice);
    fechas[dia] = String(fecha.getDate()).padStart(2, '0');
  });
  return fechas;
}

const DAY_DATES: Record<DayOfWeek, string> = fechasDeEstaSemana();

const ICON_PALETTE = ['☀️', '💧', '⚡', '🏃', '🧘', '📊', '📚', '✍️', '🌙', '👑', '🎯', '🥗'];

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
  // Arranca en el día de hoy, no siempre en lunes: quien abre Plan un miércoles espera ver su
  // miércoles, no tener que buscarlo. El mismo índice marca hasta dónde se puede planificar.
  const indiceDeHoy = (new Date().getDay() + 6) % 7;
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(DAY_OPTIONS[indiceDeHoy]);
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
  const { diaPrograma } = useProgramaDia();
  const medidor = puntoDelMedidor(diaPrograma);
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

  // Formulario Crear Hábito
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('☀️');
  const [newHabitMoment, setNewHabitMoment] = useState<DayMoment>('mañana');
  const [newHabitTime, setNewHabitTime] = useState('06:30 AM');
  const [newHabitDuration, setNewHabitDuration] = useState('30 min');
  const [newHabitDays, setNewHabitDays] = useState<Record<DayOfWeek, boolean>>({
    LUN: true,
    MAR: true,
    MIÉ: true,
    JUE: true,
    VIE: true,
    SÁB: false,
    DOM: false,
  });

  // Formulario Editar Objetivos
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalCurrentVal, setEditGoalCurrentVal] = useState('');
  const [editGoalTargetVal, setEditGoalTargetVal] = useState('');

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
  const toggleHabitDayStatus = (habitId: string) => {
    setHabits(prev =>
      prev.map(h => {
        if (h.id === habitId) {
          return {
            ...h,
            days: {
              ...h.days,
              [selectedDay]: !h.days[selectedDay],
            },
          };
        }
        return h;
      })
    );
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
      await habitsApi.cambiarHorario(habitId, `${nuevaHora}:00`, habito.limitTime);
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

  const handleSaveNewHabit = () => {
    if (!newHabitTitle.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un nombre para tu hábito.');
      return;
    }

    const newHabit: PlanHabit = {
      id: `habit_${Date.now()}`,
      title: newHabitTitle.trim(),
      icon: newHabitIcon,
      tag: 'PERSONALIZADO',
      tagColor: '#FFE29F',
      time: newHabitTime.trim() || '07:00 AM',
      duration: newHabitDuration.trim() || '30 min',
      moment: newHabitMoment,
      desc: 'Práctica personalizada agregada a tu plan semanal.',
      days: newHabitDays,
      // Un hábito personalizado, creado a mano por el aprendiz: nunca es obligatorio del
      // programa ni tiene hora límite que lo venza.
      limitTime: null,
      isOptional: true,
    isDeactivatable: true,
    };

    setHabits(prev => [...prev, newHabit]);
    setNewHabitTitle('');
    setCreateHabitModalVisible(false);
    Alert.alert('¡Hábito Creado! 🦅', 'Se ha programado correctamente en tu plan semanal.');
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
      setEditGoalTitle(goals.principalTitle);
      setEditGoalCurrentVal(goals.principalCurrentVal.toString());
      setEditGoalTargetVal(goals.principalTargetVal.toString());
    } else if (type === 'semanal') {
      setEditGoalTitle(goals.weeklyTitle);
    } else {
      setEditGoalTitle(goals.dailyTitle);
    }
    setEditGoalModalVisible(true);
  };

  const handleSaveGoal = () => {
    if (!editGoalTitle.trim()) {
      Alert.alert('Campo requerido', 'Por favor escribe la declaración de tu objetivo.');
      return;
    }

    if (editingGoalType === 'principal') {
      const cur = parseFloat(editGoalCurrentVal) || goals.principalCurrentVal;
      const tar = parseFloat(editGoalTargetVal) || goals.principalTargetVal;
      setGoals(prev => ({
        ...prev,
        principalTitle: editGoalTitle.trim(),
        principalCurrentVal: cur,
        principalTargetVal: tar,
      }));
    } else if (editingGoalType === 'semanal') {
      setGoals(prev => ({ ...prev, weeklyTitle: editGoalTitle.trim() }));
    } else {
      setGoals(prev => ({ ...prev, dailyTitle: editGoalTitle.trim() }));
    }

    setEditGoalModalVisible(false);
    Alert.alert('¡Objetivo Actualizado! 🎯', 'Los cambios han sido guardados en tu plan.');
  };

  const principalPercent = Math.min(
    100,
    Math.round((goals.principalCurrentVal / (goals.principalTargetVal || 1)) * 100)
  );

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

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
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
          </View>

          {/* Selector de Días Semanales (LUN - DOM) */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
            {DAY_OPTIONS.map((d, indice) => {
              const isSelected = selectedDay === d;
              // Los días ya pasados no se pueden planificar: organizar hábitos de un día que ya
              // terminó no tiene efecto sobre nada. Quedan visibles pero apagados y sin responder
              // al toque, para que la semana se siga leyendo completa.
              const esPasado = indice < indiceDeHoy;
              return (
                <Pressable
                  key={d}
                  disabled={esPasado}
                  onPress={() => setSelectedDay(d)}
                  style={[
                    styles.dayPillBtn,
                    {
                      borderColor: isSelected ? c.gold : c.border,
                      backgroundColor: isSelected ? c.cardBgAlt : c.cardBg,
                      opacity: esPasado ? 0.35 : 1,
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

          {/* LISTA DE HÁBITOS POR MOMENTO DEL DÍA (CON LONG-PRESS PARA MOVER) */}
          <View style={{ gap: 14, marginTop: 16, paddingBottom: 28 }}>
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
              const momentHabits = habits.filter(h => h.moment === momentName);
              const momentLabel = momentName === 'mañana' ? '🌅 MAÑANA' : momentName === 'tarde' ? '☀️ TARDE' : '🌙 NOCHE';

              return (
                <View key={momentName} style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1, fontSize: 10.5 }]}>
                      {momentLabel} ({momentHabits.length})
                    </Text>
                  </View>

                  {momentHabits.map(habit => {
                    const isDayActive = habit.days[selectedDay];
                    // § 2 — solo importa si ya venció HOY: un hábito de mañana o de un día que
                    // todavía no llega no puede estar "vencido".
                    const esHoy = selectedDay === DAY_OPTIONS[indiceDeHoy];
                    const vencido = habitoVencidoHoy(habit, esHoy, nowHHmm);
                    // § 3 — obligatorio: el interruptor se ve siempre encendido y bloqueado.
                    const bloqueadoObligatorio = !habit.isDeactivatable;
                    const switchBloqueado = vencido || bloqueadoObligatorio;
                    const switchValor = bloqueadoObligatorio ? true : isDayActive;

                    let estadoLabel: string;
                    let estadoColor: string;
                    if (vencido) {
                      estadoLabel = 'VENCIDO';
                      estadoColor = c.textSoft;
                    } else if (bloqueadoObligatorio) {
                      estadoLabel = 'OBLIGATORIO';
                      estadoColor = c.gold;
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
                            borderColor: vencido ? c.border : isDayActive ? c.gold : c.border,
                            backgroundColor: c.cardBg,
                            opacity: vencido ? 0.5 : isDayActive ? 1 : 0.6,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={[styles.habitIconBox, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                              <Text style={{ fontSize: 18 }}>{habit.icon}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={[styles.tagPill, { borderColor: c.border, backgroundColor: c.cardBgAlt, alignSelf: 'flex-start' }]}>
                                  <Text style={[t.micro, { color: c.gold, fontSize: 8.5, fontWeight: '800' }]}>
                                    {habit.tag}
                                  </Text>
                                </View>
                                {bloqueadoObligatorio ? <Icon name="lock" size={10} color={c.gold} /> : null}
                              </View>
                              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13, marginTop: 2 }]}>
                                {habit.title}
                              </Text>
                              {/* Horario: selector táctil, ya no texto libre (§1). Bloqueado si venció. */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                <Icon name="clock" size={11} color={vencido ? c.textSoft : c.gold} />
                                <Pressable
                                  disabled={vencido}
                                  onPress={() => abrirSelectorDeHora(habit)}
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
                              </View>
                            </View>
                          </View>

                          {/* Switch Activar/Pausar para el día */}
                          <View style={{ alignItems: 'center', gap: 2 }} onStartShouldSetResponder={() => true}>
                            <Text style={[t.micro, { color: estadoColor, fontSize: 8.5, fontWeight: '800' }]}>
                              {estadoLabel}
                            </Text>
                            <Switch
                              value={switchValor}
                              disabled={switchBloqueado}
                              onValueChange={() => toggleHabitDayStatus(habit.id)}
                              trackColor={{ false: '#332C20', true: c.gold }}
                              thumbColor={switchValor ? '#1E1B18' : '#888'}
                            />
                          </View>
                        </View>

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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>👑</Text>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                    1. OBJETIVO PRINCIPAL (90 DÍAS)
                  </Text>
                </View>
                <Pressable
                  onPress={() => openEditGoalModal('principal')}
                  style={[styles.editGoalBtn, { borderColor: c.gold, backgroundColor: c.cardBg }]}
                >
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✏️ Editar</Text>
                </Pressable>
              </View>

              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13.5, marginTop: 6 }]}>
                {goals.principalTitle}
              </Text>

              <View style={{ gap: 4, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>Avance cuantitativo:</Text>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 11 }]}>
                    {principalPercent}% CUMPLIDO
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                  <View style={[styles.progressBarFill, { width: `${principalPercent}%`, backgroundColor: c.gold }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>
                    Llevas: <Text style={{ color: c.gold, fontWeight: '700' }}>${goals.principalCurrentVal} {goals.principalUnit}</Text>
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>
                    Meta: ${goals.principalTargetVal} {goals.principalUnit}
                  </Text>
                </View>
              </View>
            </View>

            {/* 2. ⚡ OBJETIVO SEMANAL (SPRINT DE 7 DÍAS) */}
            <View style={[styles.goalCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>⚡</Text>
                  <Text style={[t.micro, { color: '#70d2a0', fontWeight: '800', letterSpacing: 1 }]}>
                    2. OBJETIVO SEMANAL (SEM 06)
                  </Text>
                </View>
                <Pressable
                  onPress={() => openEditGoalModal('semanal')}
                  style={[styles.editGoalBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                >
                  <Text style={[t.micro, { color: c.textSoft, fontWeight: '700' }]}>✏️ Editar</Text>
                </Pressable>
              </View>

              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13, marginTop: 4 }]}>
                {goals.weeklyTitle}
              </Text>
              <Text style={[t.micro, { color: c.micro, fontSize: 9.5 }]}>
                {goals.weeklySubtitle}
              </Text>

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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>🎯</Text>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                    3. OBJETIVO DIARIO (HOY · DÍA {diaPrograma})
                  </Text>
                </View>
                <Pressable
                  onPress={() => openEditGoalModal('diario')}
                  style={[styles.editGoalBtn, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
                >
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>✏️ Cambiar</Text>
                </Pressable>
              </View>

              <View style={[styles.dailyGoalBox, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <View style={{ flex: 1 }}>
                  <View style={[styles.tagPill, { borderColor: c.border, backgroundColor: '#173429', alignSelf: 'flex-start' }]}>
                    <Text style={[t.micro, { color: '#70d2a0', fontSize: 8.5, fontWeight: '800' }]}>
                      ROCA INNEGOCIABLE
                    </Text>
                  </View>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13, marginTop: 4 }]}>
                    {goals.dailyTitle}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🌅</Text>
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>BLOQUE DE LA MAÑANA</Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>05:00 AM – 12:00 PM</Text>
                  </View>
                </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>☀️</Text>
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>BLOQUE DE LA TARDE</Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>12:00 PM – 18:00 PM</Text>
                  </View>
                </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>🌙</Text>
                  <View>
                    <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>BLOQUE DE LA NOCHE</Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>18:00 PM – 22:00 PM</Text>
                  </View>
                </View>
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

                {/* 2. Paleta de Iconos */}
                <View style={{ gap: 4 }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>2. ELIGE UN ICONO VISUAL:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {ICON_PALETTE.map(iconItem => (
                      <Pressable
                        key={iconItem}
                        onPress={() => setNewHabitIcon(iconItem)}
                        style={[
                          styles.iconPickBtn,
                          {
                            borderColor: newHabitIcon === iconItem ? c.gold : c.border,
                            backgroundColor: newHabitIcon === iconItem ? c.cardBgAlt : c.cardBg,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 20 }}>{iconItem}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* 3. Momento del Día */}
                <View style={{ gap: 4 }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>3. MOMENTO DEL DÍA:</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['mañana', 'tarde', 'noche'] as DayMoment[]).map(m => (
                      <Pressable
                        key={m}
                        onPress={() => setNewHabitMoment(m)}
                        style={[
                          styles.momentSelectPill,
                          {
                            borderColor: newHabitMoment === m ? c.gold : c.border,
                            backgroundColor: newHabitMoment === m ? c.cardBgAlt : c.cardBg,
                          },
                        ]}
                      >
                        <Text style={[t.micro, { color: newHabitMoment === m ? c.gold : c.textSoft, fontWeight: '800' }]}>
                          {m === 'mañana' ? '🌅 Mañana' : m === 'tarde' ? '☀️ Tarde' : '🌙 Noche'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* 4. Hora y Duración */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>HORA:</Text>
                    <TextInput
                      value={newHabitTime}
                      onChangeText={setNewHabitTime}
                      placeholder="06:30 AM"
                      placeholderTextColor={c.textSoft}
                      style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>DURACIÓN:</Text>
                    <TextInput
                      value={newHabitDuration}
                      onChangeText={setNewHabitDuration}
                      placeholder="30 min"
                      placeholderTextColor={c.textSoft}
                      style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                    />
                  </View>
                </View>

                {/* 5. Días de Repetición */}
                <View style={{ gap: 4 }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>5. DÍAS QUE DESEAS HACERLO:</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {DAY_OPTIONS.map(d => {
                      const isDayOn = newHabitDays[d];
                      return (
                        <Pressable
                          key={d}
                          onPress={() => setNewHabitDays(prev => ({ ...prev, [d]: !prev[d] }))}
                          style={[
                            styles.dayTogglePill,
                            {
                              borderColor: isDayOn ? c.gold : c.border,
                              backgroundColor: isDayOn ? c.gold : c.cardBgAlt,
                            },
                          ]}
                        >
                          <Text style={[t.micro, { color: isDayOn ? '#1E1B18' : c.textSoft, fontWeight: '900', fontSize: 9.5 }]}>
                            {d}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </ScrollView>

            <GoldButton
              label="✓ GUARDAR HÁBITO"
              onPress={handleSaveNewHabit}
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
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[t.micro, { color: c.textSoft }]}>VALOR ACTUAL ($):</Text>
                    <TextInput
                      value={editGoalCurrentVal}
                      onChangeText={setEditGoalCurrentVal}
                      keyboardType="numeric"
                      style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.gold }]}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[t.micro, { color: c.textSoft }]}>META TOTAL ($):</Text>
                    <TextInput
                      value={editGoalTargetVal}
                      onChangeText={setEditGoalTargetVal}
                      keyboardType="numeric"
                      style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
                    />
                  </View>
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
  iconPickBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentSelectPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTogglePill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});