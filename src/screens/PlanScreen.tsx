import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, ScreenHeader } from '../components/ui';
import { Icon } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

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
const INITIAL_HABITS: PlanHabit[] = [
  {
    id: 'h1',
    title: 'Protocolo 05:00 AM & Luz Solar',
    icon: '☀️',
    tag: 'INNEGOCIABLE',
    tagColor: '#FFE29F',
    time: '05:00 AM',
    duration: '45 min',
    moment: 'mañana',
    desc: 'Hackeo de cortisol matutino con luz solar directa en los ojos y cero pantallas.',
    days: { LUN: true, MAR: true, MIÉ: true, JUE: true, VIE: true, SÁB: true, DOM: true },
  },
  {
    id: 'h2',
    title: 'Hidratación Somática & Fascia',
    icon: '💧',
    tag: 'CUERPO',
    tagColor: '#90CAF9',
    time: '06:00 AM',
    duration: '20 min',
    moment: 'mañana',
    desc: '1 litro de agua con sal marina + 15 min de tensión isométrica para la columna.',
    days: { LUN: true, MAR: true, MIÉ: true, JUE: true, VIE: true, SÁB: false, DOM: false },
  },
  {
    id: 'h3',
    title: 'Bloque de Poder Deep Work 90m',
    icon: '⚡',
    tag: 'ENFOQUE PURO',
    tagColor: '#A5D6A7',
    time: '08:30 AM',
    duration: '90 min',
    moment: 'mañana',
    desc: '90 minutos en modo avión dedicados exclusivamente a tu mayor meta comercial.',
    days: { LUN: true, MAR: true, MIÉ: true, JUE: true, VIE: true, SÁB: false, DOM: false },
  },
  {
    id: 'h4',
    title: 'Auditoría 80/20 & Llamadas de Alto Valor',
    icon: '📊',
    tag: 'NEGOCIO',
    tagColor: '#FFE082',
    time: '16:00 PM',
    duration: '60 min',
    moment: 'tarde',
    desc: 'Auditar fugas de tiempo y llamadas con prospectos calificados para cerrar contratos.',
    days: { LUN: true, MAR: true, MIÉ: true, JUE: true, VIE: true, SÁB: false, DOM: false },
  },
  {
    id: 'h5',
    title: 'Cierre Somático & Desconexión Digital',
    icon: '🛌',
    tag: 'SUEÑO',
    tagColor: '#CE93D8',
    time: '21:30 PM',
    duration: '30 min',
    moment: 'noche',
    desc: 'Cero pantallas 60m antes de dormir, respiración diafragmática y temperatura fresca.',
    days: { LUN: true, MAR: true, MIÉ: true, JUE: true, VIE: true, SÁB: true, DOM: true },
  },
];

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
const DAY_DATES: Record<DayOfWeek, string> = {
  LUN: '14',
  MAR: '15',
  MIÉ: '16',
  JUE: '17',
  VIE: '18',
  SÁB: '19',
  DOM: '20',
};

const ICON_PALETTE = ['☀️', '💧', '⚡', '🏃', '🧘', '📊', '📚', '✍️', '🌙', '👑', '🎯', '🥗'];

const FASES = [
  { d: 'DÍAS 1–30', n: 'FUNDACIÓN' },
  { d: 'DÍAS 31–60', n: 'ACELERACIÓN' },
  { d: 'DÍAS 61–90', n: 'EXPANSIÓN' },
];

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
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('LUN');
  const [habits, setHabits] = useState<PlanHabit[]>(INITIAL_HABITS);

  // Estados de Objetivos
  const [goals, setGoals] = useState<PlanGoals>(INITIAL_GOALS);

  // Modales
  const [createHabitModalVisible, setCreateHabitModalVisible] = useState(false);
  const [editGoalModalVisible, setEditGoalModalVisible] = useState(false);
  const [editingGoalType, setEditingGoalType] = useState<'principal' | 'semanal' | 'diario'>('principal');

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
  }, activeSubView !== 'main' || createHabitModalVisible || editGoalModalVisible);

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

  const updateHabitTime = (habitId: string, newTime: string) => {
    setHabits(prev =>
      prev.map(h => (h.id === habitId ? { ...h, time: newTime } : h))
    );
  };

  const cycleHabitMoment = (habitId: string) => {
    setHabits(prev =>
      prev.map(h => {
        if (h.id === habitId) {
          const nextMoment: DayMoment =
            h.moment === 'mañana' ? 'tarde' : h.moment === 'tarde' ? 'noche' : 'mañana';
          return { ...h, moment: nextMoment };
        }
        return h;
      })
    );
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
              <Path d="M14 108a100 100 0 0 1 141-93" stroke={c.chevron} strokeWidth={5} strokeLinecap="round" fill="none" />
              <Circle cx={155} cy={15} r={6} fill={c.gold} />
            </Svg>
            <View style={styles.gaugeCenter}>
              <Text style={[t.micro, { color: c.micro }]}>DÍA</Text>
              <Text style={{ fontFamily: 'Jost_300Light', fontSize: 40, color: c.textStrong }}>37</Text>
              <Text style={[t.small, { color: c.micro }]}>DE 90</Text>
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
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 2 }]}>
                Edita tus horarios y activa los hábitos para el día
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
            {DAY_OPTIONS.map(d => {
              const isSelected = selectedDay === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setSelectedDay(d)}
                  style={[
                    styles.dayPillBtn,
                    {
                      borderColor: isSelected ? c.gold : c.border,
                      backgroundColor: isSelected ? c.cardBgAlt : c.cardBg,
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

          {/* LISTA DE HÁBITOS POR MOMENTO DEL DÍA */}
          <View style={{ gap: 14, marginTop: 16, paddingBottom: 28 }}>
            {(['mañana', 'tarde', 'noche'] as DayMoment[]).map(momentName => {
              const momentHabits = habits.filter(h => h.moment === momentName);
              const momentLabel = momentName === 'mañana' ? '🌅 MAÑANA' : momentName === 'tarde' ? '☀️ TARDE' : '🌙 NOCHE';

              return (
                <View key={momentName} style={{ gap: 8 }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1, fontSize: 10.5 }]}>
                    {momentLabel} ({momentHabits.length})
                  </Text>

                  {momentHabits.map(habit => {
                    const isDayActive = habit.days[selectedDay];

                    return (
                      <View
                        key={habit.id}
                        style={[
                          styles.habitPlanCard,
                          {
                            borderColor: isDayActive ? c.gold : c.border,
                            backgroundColor: c.cardBg,
                            opacity: isDayActive ? 1 : 0.6,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={[styles.habitIconBox, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                              <Text style={{ fontSize: 18 }}>{habit.icon}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={[styles.tagPill, { borderColor: c.border, backgroundColor: c.cardBgAlt, alignSelf: 'flex-start' }]}>
                                <Text style={[t.micro, { color: c.gold, fontSize: 8.5, fontWeight: '800' }]}>
                                  {habit.tag}
                                </Text>
                              </View>
                              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13, marginTop: 2 }]}>
                                {habit.title}
                              </Text>
                              {/* Horario Editable Directamente */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Text style={{ fontSize: 11, color: c.gold, fontWeight: 'bold' }}>⏰</Text>
                                <TextInput
                                  value={habit.time}
                                  onChangeText={val => updateHabitTime(habit.id, val)}
                                  placeholder="05:00 AM"
                                  placeholderTextColor={c.textSoft}
                                  style={[styles.timeInputDirect, { color: c.gold, borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                                />
                                <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>({habit.duration})</Text>
                              </View>
                            </View>
                          </View>

                          {/* Switch Activar/Pausar para el día */}
                          <View style={{ alignItems: 'center', gap: 2 }}>
                            <Text style={[t.micro, { color: isDayActive ? '#70d2a0' : c.textSoft, fontSize: 8.5, fontWeight: '800' }]}>
                              {isDayActive ? 'ACTIVO' : 'PAUSADO'}
                            </Text>
                            <Switch
                              value={isDayActive}
                              onValueChange={() => toggleHabitDayStatus(habit.id)}
                              trackColor={{ false: '#332C20', true: c.gold }}
                              thumbColor={isDayActive ? '#1E1B18' : '#888'}
                            />
                          </View>
                        </View>

                        <Text style={[t.body, { color: c.textSoft, fontSize: 11, marginTop: 6, fontStyle: 'italic' }]}>
                          {habit.desc}
                        </Text>

                        {/* Botón para mover de momento fácilmente */}
                        <View style={[styles.habitFooterRow, { borderTopColor: c.divider }]}>
                          <Pressable
                            onPress={() => cycleHabitMoment(habit.id)}
                            style={[styles.momentSwitchBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                          >
                            <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>
                              Momento: {momentLabel} (Toca para mover) ↻
                            </Text>
                          </Pressable>
                          <Text style={[t.micro, { color: '#70d2a0', fontSize: 9.5, fontWeight: '700' }]}>
                            ✓ Guardado
                          </Text>
                        </View>
                      </View>
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
                    3. OBJETIVO DIARIO (HOY · DÍA 37)
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
  habitFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  momentSwitchBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
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