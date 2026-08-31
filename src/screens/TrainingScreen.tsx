import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Card, MicroLabel, ScreenHeader } from '../components/ui';
import { Icon, IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

interface TrainingSession {
  id: string;
  title: string;
  category: 'FUERZA' | 'RESPIRACIÓN' | 'CARDIO' | 'MENTE' | 'NEGOCIO';
  duration: string;
  level: string;
  icon: IconName;
  completed: boolean;
  steps: string[];
}

const CATEGORIAS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'TODAS' },
  { id: 'FUERZA', label: 'FUERZA SOMÁTICA' },
  { id: 'RESPIRACIÓN', label: 'RESPIRACIÓN & MOVILIDAD' },
  { id: 'CARDIO', label: 'CARDIO HIIT' },
  { id: 'MENTE', label: 'MENTALIDAD' },
  { id: 'NEGOCIO', label: 'VIDA & NEGOCIO' },
];

export default function TrainingScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet } = useResponsive();

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);

  // Timer state inside training modal
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const [sessions, setSessions] = useState<TrainingSession[]>([
    {
      id: '1',
      title: 'Fuerza Isométrica y Postura de Poder',
      category: 'FUERZA',
      duration: '35 min',
      level: 'Avanzado',
      icon: 'dumbbell',
      completed: true,
      steps: [
        'Activación diafragmática de 3 tiempos (5 min)',
        'Sentadilla isométrica contra la pared con tensión (4 series de 45s)',
        'Plancha frontal activa con respiración de combate (4 series de 60s)',
        'Flexiones lentas 4-2-1 con retención isométrica (4 series de 10 reps)',
        'Anclaje somático de victoria y respiración restaurativa (5 min)',
      ],
    },
    {
      id: '2',
      title: 'Desbloqueo Fascial y Movilidad Articular',
      category: 'RESPIRACIÓN',
      duration: '20 min',
      level: 'Todos los niveles',
      icon: 'body',
      completed: true,
      steps: [
        'Descompresión de columna en posición de niño (3 min)',
        'Apertura de caderas 90/90 y movilidad de tobillos (6 min)',
        'Rotaciones torácicas con inhalación diafragmática profunda (5 min)',
        'Estiramiento somático de psoas y flexores de cadera (6 min)',
      ],
    },
    {
      id: '3',
      title: 'Protocolo Tabata Cardio HIIT Somático',
      category: 'CARDIO',
      duration: '25 min',
      level: 'Alta Intensidad',
      icon: 'fire',
      completed: false,
      steps: [
        'Calentamiento dinámico con saltos y movilidad (4 min)',
        'Tabata 1: Burpees explosivos y Mountain Climbers (4 min)',
        'Tabata 2: Sentadillas con salto y High Knees (4 min)',
        'Tabata 3: Shadow Boxing con respiración explosiva (4 min)',
        'Vuelta a la calma y enfriamiento somático (5 min)',
      ],
    },
    {
      id: '4',
      title: 'Respiración de Poder y Visualización de Victoria',
      category: 'MENTE',
      duration: '15 min',
      level: 'Mentalidad',
      icon: 'brain',
      completed: false,
      steps: [
        'Ciclo de 30 respiraciones profundas diafragmáticas (Ronda 1)',
        'Retención con pulmones vacíos de 60 segundos',
        'Inhalación de recuperación y anclaje de certeza (Ronda 2 y 3)',
        'Visualización guiada de la victoria de tus 90 días (5 min)',
      ],
    },
    {
      id: '5',
      title: 'Arquitectura del Tiempo y Enfoque de Negocio',
      category: 'NEGOCIO',
      duration: '30 min',
      level: 'Estratégico',
      icon: 'briefcase',
      completed: false,
      steps: [
        'Identificación de tu Única Prioridad de Alto Apalancamiento',
        'Eliminación de micro-distracciones y modo avión',
        'Ejecución del Bloque de Poder sin interrupción de 90 min',
        'Revisión y rendición de cuentas en tu Célula de Verdad',
      ],
    },
  ]);

  // Timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleStartSession = (session: TrainingSession) => {
    setActiveSession(session);
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  const handleCompleteSession = () => {
    if (!activeSession) return;
    setSessions(prev =>
      prev.map(s => (s.id === activeSession.id ? { ...s, completed: true } : s))
    );
    setTimerRunning(false);
    Alert.alert(
      '¡ENTRENAMIENTO COMPLETADO! 🦅',
      `Has completado la sesión "${activeSession.title}" con honor y disciplina.`
    );
    setActiveSession(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredSessions =
    selectedCategory === 'ALL'
      ? sessions
      : sessions.filter(s => s.category === selectedCategory);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="TRAINING" right="dots" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: isTablet ? 600 : undefined,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero Section */}
        <View style={styles.headerBlock}>
          <MicroLabel>SISTEMA DE ENTRENAMIENTO SOMÁTICO</MicroLabel>
          <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 20, marginTop: 2 }]}>
            Potencia Tu Cuerpo y Mente
          </Text>
        </View>

        {/* Featured Daily Workout Card */}
        <View style={[styles.featuredCard, { backgroundColor: c.cardBg, borderColor: c.gold }]}>
          <View style={styles.featuredHeader}>
            <View style={[styles.featuredTag, { backgroundColor: c.gold }]}>
              <Text style={[t.micro, { color: '#1E1B18', fontWeight: '800', fontSize: 10 }]}>
                SESIÓN RECOMENDADA DE HOY
              </Text>
            </View>
            <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>35 MIN</Text>
          </View>

          <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 17, marginTop: 8 }]}>
            Activación Neuromuscular & Fuerza Isométrica
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 4, lineHeight: 18 }]}>
            Despierta la máxima tensión muscular y presencia somática para liderar tu día.
          </Text>

          <GoldButton
            label="INICIAR ENTRENAMIENTO DE HOY ▶"
            onPress={() => handleStartSession(sessions[0])}
            style={{ marginTop: 12 }}
          />
        </View>

        {/* Category Horizontal Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIAS.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={[
                styles.categoryPill,
                {
                  borderColor: selectedCategory === cat.id ? c.gold : c.border,
                  backgroundColor: selectedCategory === cat.id ? c.cardBgAlt : c.cardBg,
                },
              ]}
            >
              <Text
                style={[
                  t.micro,
                  {
                    color: selectedCategory === cat.id ? c.gold : c.textSoft,
                    fontWeight: selectedCategory === cat.id ? '700' : '500',
                    fontSize: 11,
                  },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Catalog of Sessions */}
        <View style={{ gap: 12 }}>
          <View style={styles.catalogHeaderRow}>
            <MicroLabel>CATÁLOGO DE SESIONES ({filteredSessions.length})</MicroLabel>
            <Icon name="filter" size={14} color={c.gold} />
          </View>

          {filteredSessions.map(session => (
            <Pressable
              key={session.id}
              onPress={() => handleStartSession(session)}
              style={[
                styles.sessionCard,
                {
                  borderColor: session.completed ? c.gold : c.border,
                  backgroundColor: session.completed ? c.cardBgAlt : c.cardBg,
                },
              ]}
            >
              <View style={[styles.sessionMedallion, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
                <Icon name={session.icon} size={22} color={c.gold} />
              </View>

              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.sessionMetaRow}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                    {session.category}
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>
                    · {session.duration} · {session.level}
                  </Text>
                </View>

                <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '600' }]}>
                  {session.title}
                </Text>

                <Text
                  style={[
                    t.micro,
                    {
                      color: session.completed ? '#4E9F76' : c.textSoft,
                      fontWeight: '700',
                      fontSize: 10.5,
                      marginTop: 2,
                    },
                  ]}
                >
                  {session.completed ? '✓ COMPLETADO' : '▶ TOCAR PARA INICIAR'}
                </Text>
              </View>

              <Icon name="chevron" size={13} color={c.chevron} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL INTERACTIVO DE SESIÓN EN VIVO CON TEMPORIZADOR Y PASOS             */}
      {/* ========================================================================= */}
      <Modal
        visible={activeSession !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveSession(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.cardBg, borderColor: c.gold }]}>
            {activeSession && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={[styles.modalCategoryBadge, { borderColor: c.gold }]}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                      {activeSession.category} · {activeSession.duration}
                    </Text>
                  </View>
                  <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18, textAlign: 'center', marginTop: 4 }]}>
                    {activeSession.title}
                  </Text>
                </View>

                {/* Big Stopwatch Timer */}
                <View style={[styles.stopwatchCard, { backgroundColor: c.cardBgAlt, borderColor: c.borderStrong }]}>
                  <Text style={[t.micro, { color: c.textSoft, letterSpacing: 2 }]}>TIEMPO TRANSCURRIDO</Text>
                  <Text style={{ fontFamily: 'Jost_700Bold', fontSize: 44, color: c.gold, marginVertical: 4 }}>
                    {formatTimer(timerSeconds)}
                  </Text>

                  {/* Timer Controls */}
                  <View style={styles.timerControlsRow}>
                    <Pressable
                      onPress={() => setTimerRunning(!timerRunning)}
                      style={[styles.timerControlBtn, { backgroundColor: c.gold }]}
                    >
                      <Icon name={timerRunning ? 'pause' : 'play'} size={16} color="#1E1B18" />
                      <Text style={[t.micro, { color: '#1E1B18', fontWeight: '800', fontSize: 11 }]}>
                        {timerRunning ? 'PAUSAR' : 'CONTINUAR'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setTimerRunning(false);
                        setTimerSeconds(0);
                      }}
                      style={[styles.timerControlBtnOutline, { borderColor: c.border }]}
                    >
                      <Text style={[t.micro, { color: c.textSoft, fontWeight: '700', fontSize: 11 }]}>
                        REINICIAR
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Guided Steps */}
                <View style={{ gap: 8 }}>
                  <MicroLabel>PASOS GUIADOS DE LA SESIÓN</MicroLabel>
                  {activeSession.steps.map((step, idx) => (
                    <View
                      key={idx}
                      style={[styles.stepItemRow, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}
                    >
                      <View style={[styles.stepNumberBadge, { borderColor: c.gold }]}>
                        <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10.5 }]}>
                          0{idx + 1}
                        </Text>
                      </View>
                      <Text style={[t.body, { color: c.textStrong, flex: 1, fontSize: 13.5, lineHeight: 19 }]}>
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Complete Button */}
                <GoldButton
                  label="✓ MARCAR SESIÓN COMPLETADA"
                  onPress={handleCompleteSession}
                  style={{ marginTop: 6 }}
                />

                {/* Close Button */}
                <Pressable
                  onPress={() => {
                    setTimerRunning(false);
                    setActiveSession(null);
                  }}
                  style={[styles.closeModalBtn, { borderColor: c.border }]}
                >
                  <Text style={[t.micro, { color: c.textSoft, fontWeight: '700', fontSize: 11, textAlign: 'center' }]}>
                    CERRAR Y PAUSAR SESIÓN
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 36,
    gap: 16,
  },
  headerBlock: {
    gap: 2,
  },
  featuredCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoriesScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  catalogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  sessionMedallion: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 4,
  },
  modalCategoryBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  stopwatchCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  timerControlsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  timerControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timerControlBtnOutline: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  closeModalBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
});