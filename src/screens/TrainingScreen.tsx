import React, { useState } from 'react';
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
import { ScreenHeader, MicroLabel } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

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

const INITIAL_HABITS: HabitItem[] = [
  // CUERPO
  { id: 'c1', dimension: 'CUERPO', title: 'Entrenamiento Somático / Isométrico', time: '07:00 AM · 45 min', tag: 'INNEGOCIABLE', streak: 37, done: true, hasEvidence: true, note: '45 min con máxima intensidad somática.' },
  { id: 'c2', dimension: 'CUERPO', title: 'Hidratación Alcalina (1L con electrolitos)', time: 'Al despertar · Mañana', tag: 'SALUD', streak: 37, done: true, hasEvidence: true, note: '1L con sal marina y limón.' },
  { id: 'c3', dimension: 'CUERPO', title: 'Movilidad Articular & Descompresión', time: '13:00 PM · 15 min', tag: 'ENERGÍA', streak: 34, done: true, hasEvidence: true },
  { id: 'c4', dimension: 'CUERPO', title: 'Ventana de Sueño e Higiene Lumínica', time: '22:00 PM · 8 hrs', tag: 'DESCANSO', streak: 29, done: false, hasEvidence: false },

  // MENTE
  { id: 'm1', dimension: 'MENTE', title: 'Bloque de Poder Deep Work (Sin Celular)', time: '09:00 AM · 90 min', tag: 'INNEGOCIABLE', streak: 37, done: true, hasEvidence: true, note: 'Propuesta estratégica terminada.' },
  { id: 'm2', dimension: 'MENTE', title: 'Audio Clase RENASER del Día', time: '12:00 PM · 12 min', tag: 'APRENDIZAJE', streak: 37, done: true, hasEvidence: true },
  { id: 'm3', dimension: 'MENTE', title: 'Bitácora de Auto-Observación y Verdad', time: '21:30 PM · 10 min', tag: 'REGISTRO', streak: 35, done: false, hasEvidence: false },
  { id: 'm4', dimension: 'MENTE', title: 'Lectura Estratégica de Alto Valor', time: '15:00 PM · 20 min', tag: 'ENFOQUE', streak: 28, done: false, hasEvidence: false },

  // EMOCIONES
  { id: 'e1', dimension: 'EMOCIONES', title: 'Respiración Diafragmática de Regulación', time: '11:11 AM · 7 min', tag: 'INNEGOCIABLE', streak: 37, done: true, hasEvidence: true },
  { id: 'e2', dimension: 'EMOCIONES', title: 'Escucha Activa y Presencia en Célula', time: '18:00 PM · 20 min', tag: 'RELACIONES', streak: 31, done: true, hasEvidence: true },
  { id: 'e3', dimension: 'EMOCIONES', title: 'Anclaje de Paz y Cierre Emocional', time: '20:30 PM · 10 min', tag: 'PAZ', streak: 26, done: false, hasEvidence: false },

  // ESPÍRITU
  { id: 's1', dimension: 'ESPÍRITU', title: 'Ritual de Gratitud y Certeza Matutino', time: '06:30 AM · 10 min', tag: 'INNEGOCIABLE', streak: 37, done: true, hasEvidence: true },
  { id: 's2', dimension: 'ESPÍRITU', title: 'Visualización de Victoria del Día 90', time: '12:30 PM · 5 min', tag: 'PROPÓSITO', streak: 37, done: true, hasEvidence: true },
  { id: 's3', dimension: 'ESPÍRITU', title: 'Cierre en Silencio y Desconexión', time: '21:45 PM · 15 min', tag: 'FE', streak: 33, done: false, hasEvidence: false },

  // VIDA Y NEGOCIO
  { id: 'b1', dimension: 'VIDA Y NEGOCIO', title: 'Seguimientos Comerciales y Ventas', time: '10:30 AM · 60 min', tag: 'INNEGOCIABLE', streak: 37, done: true, hasEvidence: true },
  { id: 'b2', dimension: 'VIDA Y NEGOCIO', title: 'Revisión de Métricas Financieras', time: '17:00 PM · 15 min', tag: 'ESTRATEGIA', streak: 30, done: true, hasEvidence: true },
  { id: 'b3', dimension: 'VIDA Y NEGOCIO', title: 'Planificación del Día de Mañana con Verdad', time: '21:00 PM · 15 min', tag: 'HÁBITOS', streak: 37, done: false, hasEvidence: false },
];

export default function TrainingScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet, horizontalPadding } = useResponsive();
  const medallionSize = rs(42);

  // Selected Dimension State
  const [selectedDimension, setSelectedDimension] = useState<DimensionConfig | null>(null);
  const [innerTab, setInnerTab] = useState<'habitos' | 'guias'>('habitos');

  // Habits State
  const [habits, setHabits] = useState<HabitItem[]>(INITIAL_HABITS);

  // Evidence Upload Modal State
  const [activeEvidenceHabit, setActiveEvidenceHabit] = useState<HabitItem | null>(null);
  const [evidencePhotoUploaded, setEvidencePhotoUploaded] = useState(false);
  const [evidenceNote, setEvidenceNote] = useState('');

  // New Custom Habit Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newTag, setNewTag] = useState('INNEGOCIABLE');

  const toggleHabitState = (id: string) => {
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
    setActiveEvidenceHabit(habit);
    setEvidencePhotoUploaded(habit.hasEvidence);
    setEvidenceNote(habit.note || '');
  };

  const handleSealEvidence = () => {
    if (!activeEvidenceHabit) return;

    setHabits(prev =>
      prev.map(h => {
        if (h.id !== activeEvidenceHabit.id) return h;
        return {
          ...h,
          done: true,
          hasEvidence: true,
          note: evidenceNote.trim() || h.note,
          streak: h.done ? h.streak : h.streak + 1,
        };
      })
    );

    Alert.alert(
      '¡Evidencia de Verdad Sellada! 🦅',
      `Has registrado tu prueba fotográfica y cumplido tu palabra en "${activeEvidenceHabit.title}".`
    );
    setActiveEvidenceHabit(null);
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

  const completedEvidencesCount = currentDimensionHabits.filter(h => h.done).length;
  const dimensionProgress = currentDimensionHabits.length > 0
    ? Math.round((completedEvidencesCount / currentDimensionHabits.length) * 100)
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

            <View style={{ gap: 10, paddingVertical: 8 }}>
              {DIMENSIONES_CONFIG.map(d => {
                const dimHabits = habits.filter(h => h.dimension === d.key);
                const doneCount = dimHabits.filter(h => h.done).length;

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
                          {doneCount}/{dimHabits.length} EVIDENCIAS
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
      {/* MODAL: SUBIR EVIDENCIA FOTOGRÁFICA Y REGISTRO DE VERDAD                   */}
      {/* ========================================================================= */}
      <Modal
        visible={activeEvidenceHabit !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveEvidenceHabit(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.cardBg, borderColor: c.gold }]}>
            {activeEvidenceHabit && (
              <View style={{ gap: 12 }}>
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <View style={[styles.sessionTagBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                      {activeEvidenceHabit.dimension} · {activeEvidenceHabit.tag}
                    </Text>
                  </View>
                  <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 17, textAlign: 'center', marginTop: 2 }]}>
                    {activeEvidenceHabit.title}
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
                    {activeEvidenceHabit.time} · Racha: 🔥 {activeEvidenceHabit.streak} días
                  </Text>
                </View>

                {/* Recuadro de Foto de Evidencia */}
                <Pressable
                  onPress={() => setEvidencePhotoUploaded(true)}
                  style={[
                    styles.photoUploadBox,
                    {
                      borderColor: evidencePhotoUploaded ? '#4E9F76' : c.borderStrong,
                      backgroundColor: c.cardBgAlt,
                    },
                  ]}
                >
                  {evidencePhotoUploaded ? (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <Icon name="checkCircle" size={26} color="#4E9F76" />
                      <Text style={[t.micro, { color: '#4E9F76', fontWeight: '700', fontSize: 11 }]}>
                        ✓ FOTO DE EVIDENCIA CARGADA
                      </Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>
                        Sello automático: Día 37 · 07:45 AM
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Icon name="camera" size={24} color={c.gold} />
                      <Text style={[t.micro, { color: c.textStrong, fontWeight: '700', fontSize: 11 }]}>
                        TOCAR PARA TOMAR FOTO O SUBIR
                      </Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>
                        Se estampará sello de fecha: Día 37 · 07:45 AM
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Registro de Verdad */}
                <View style={{ gap: 4 }}>
                  <MicroLabel>REGISTRO DE VERDAD (OPCIONAL)</MicroLabel>
                  <TextInput
                    value={evidenceNote}
                    onChangeText={setEvidenceNote}
                    placeholder="¿Cómo cumpliste tu palabra hoy?"
                    placeholderTextColor={c.tabInactive}
                    style={[styles.modalInput, { color: c.textStrong, borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                  />
                </View>

                <GoldButton
                  label="✓ SELLAR EVIDENCIA Y COMPLETAR"
                  onPress={handleSealEvidence}
                  style={{ marginTop: 4 }}
                />

                <Pressable
                  onPress={() => setActiveEvidenceHabit(null)}
                  style={[styles.closeModalBtn, { borderColor: c.border }]}
                >
                  <Text style={[t.micro, { color: c.textSoft, fontWeight: '700', fontSize: 11, textAlign: 'center' }]}>
                    CANCELAR
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

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