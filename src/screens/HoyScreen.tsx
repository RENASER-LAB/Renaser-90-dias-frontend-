import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useAuth } from '../context/AuthContext';
import { Card, MicroLabel, ScreenHeader } from '../components/ui';
import { Icon } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

interface PracticaItem {
  id: string;
  title: string;
  category: 'FÍSICA' | 'MENTAL' | 'ESPIRITUAL';
  duration: string;
  completed: boolean;
}

export default function HoyScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet } = useResponsive();
  const { user } = useAuth();

  // Streak & Gong state
  const [gongStruck, setGongStruck] = useState(false);
  const [streakCount, setStreakCount] = useState(37);

  // Energy & Focus check-in state
  const [energyLevel, setEnergyLevel] = useState<'alta' | 'media' | 'baja'>('alta');
  const [focusState, setFocusState] = useState<'laser' | 'fluido' | 'disperso'>('laser');

  // 3 Daily Non-Negotiables
  const [practicas, setPracticas] = useState<PracticaItem[]>([
    {
      id: '1',
      title: 'Entrenamiento Somático & Respiración Diafragmática',
      category: 'FÍSICA',
      duration: '45 min',
      completed: true,
    },
    {
      id: '2',
      title: 'Bloque de Poder Deep Work (Estrategia y Ventas)',
      category: 'MENTAL',
      duration: '90 min',
      completed: true,
    },
    {
      id: '3',
      title: 'Conexión con Célula de Honor & Registro de Evidencia',
      category: 'ESPIRITUAL',
      duration: '15 min',
      completed: false,
    },
  ]);

  const togglePractica = (id: string) => {
    setPracticas(prev =>
      prev.map(p => (p.id === id ? { ...p, completed: !p.completed } : p))
    );
  };

  const handleStrikeGong = () => {
    if (gongStruck) {
      Alert.alert('Gong del Día', 'Tu victoria de hoy ya fue sellada con honor 🦅');
      return;
    }
    setGongStruck(true);
    setStreakCount(prev => prev + 1);
    Alert.alert(
      '¡GONG DE VICTORIA SELLADO! 🦅',
      'Has honrado tu compromiso de hoy. Tu racha aumentó a ' + (streakCount + 1) + ' días.'
    );
  };

  const completedCount = practicas.filter(p => p.completed).length;
  const progressPercent = Math.round((completedCount / practicas.length) * 100);

  const ringSizes = [rs(220), rs(176), rs(132), rs(88)];
  const ringColors = [c.ring1, c.ring2, c.ring3, c.ring2];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="HOY" right="bell" />

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
        {/* Header Greeting & Racha Badge */}
        <View style={styles.topGreetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[t.micro, { color: c.gold, letterSpacing: 1.5, fontWeight: '700' }]}>
              DÍA 37 DE 90 · FASE II (ACELERACIÓN)
            </Text>
            <Text style={[t.screenTitle, { color: c.textStrong, marginTop: 4, fontSize: 20 }]}>
              Buenos días, {user?.name?.split(' ')[0] || 'Guerrero'}
            </Text>
          </View>

          {/* Racha Pill */}
          <View style={[styles.streakBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <Icon name="fire" size={16} color={c.gold} />
            <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 13 }]}>
              {streakCount} DÍAS
            </Text>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* WIDGET DEL GONG DE VICTORIA DIARIO                                       */}
        {/* ========================================================================= */}
        <Pressable
          onPress={handleStrikeGong}
          style={[
            styles.gongHeroCard,
            {
              backgroundColor: c.cardBg,
              borderColor: gongStruck ? c.gold : c.borderStrong,
            },
          ]}
        >
          <View style={[styles.ringContainer, { minHeight: rs(200) }]}>
            {ringSizes.map((size, index) => (
              <View
                key={size}
                style={[
                  styles.ring,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderColor: gongStruck ? c.gold : ringColors[index],
                    opacity: gongStruck ? 0.7 : 0.4,
                  },
                ]}
              />
            ))}

            <View
              style={[
                styles.gongMedallion,
                {
                  borderColor: c.gold,
                  backgroundColor: gongStruck ? c.cardBgAlt : c.cardBg,
                  transform: [{ scale: gongStruck ? 1.08 : 1 }],
                },
              ]}
            >
              <Icon
                name={gongStruck ? 'trophy' : 'volume'}
                size={rs(26)}
                color={c.gold}
              />
            </View>
          </View>

          <View style={styles.gongTextContainer}>
            <MicroLabel>
              {gongStruck ? 'VICTORIA DE HOY SELLADA' : 'HAZ SONAR TU GONG'}
            </MicroLabel>
            <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18, marginTop: 4 }]}>
              {gongStruck ? '¡Día 37 Sellado con Honor! 🦅' : 'Toca para Sellar tu Compromiso de Hoy'}
            </Text>
            <Text style={[t.micro, { color: c.textSoft, marginTop: 4, letterSpacing: 1 }]}>
              {gongStruck ? 'Racha inquebrantable de 90 días activa' : 'Una sola acción define el rumbo de tu día'}
            </Text>
          </View>
        </Pressable>

        {/* ========================================================================= */}
        {/* CHECK-IN DE ENERGÍA Y ESTADO SOMÁTICO                                    */}
        {/* ========================================================================= */}
        <Card style={{ gap: 12 }}>
          <View style={styles.cardHeaderRow}>
            <View>
              <MicroLabel>CHECK-IN SOMÁTICO</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 2 }]}>
                Tu Nivel de Energía Actual
              </Text>
            </View>
            <Icon name="spark" size={16} color={c.gold} />
          </View>

          {/* Selector de Energía */}
          <View style={styles.energySelectorRow}>
            {(
              [
                { id: 'alta', label: '⚡ ALTA (100%)', desc: 'Listo para conquistar' },
                { id: 'media', label: '🌊 MEDIA (75%)', desc: 'Enfoque sostenido' },
                { id: 'baja', label: '🪨 BAJA (50%)', desc: 'Recalibración' },
              ] as const
            ).map(opt => (
              <Pressable
                key={opt.id}
                onPress={() => setEnergyLevel(opt.id)}
                style={[
                  styles.energyBtn,
                  {
                    borderColor: energyLevel === opt.id ? c.gold : c.border,
                    backgroundColor: energyLevel === opt.id ? c.cardBgAlt : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    t.micro,
                    {
                      color: energyLevel === opt.id ? c.gold : c.textSoft,
                      fontWeight: energyLevel === opt.id ? '700' : '500',
                      fontSize: 11,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* ========================================================================= */}
        {/* LAS 3 PRÁCTICAS DIARIAS NO NEGOCIABLES                                    */}
        {/* ========================================================================= */}
        <Card style={{ gap: 14 }}>
          <View style={styles.cardHeaderRow}>
            <View>
              <MicroLabel>MIS 3 NO NEGOCIABLES</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 2 }]}>
                Prácticas Diarias de Poder
              </Text>
            </View>

            {/* Progress Badge */}
            <View style={[styles.progressBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                {completedCount}/3 ({progressPercent}%)
              </Text>
            </View>
          </View>

          {/* Progress Bar Line */}
          <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: c.gold,
                  width: `${progressPercent}%`,
                },
              ]}
            />
          </View>

          {/* Lista de Prácticas */}
          <View style={{ gap: 10 }}>
            {practicas.map(item => (
              <Pressable
                key={item.id}
                onPress={() => togglePractica(item.id)}
                style={[
                  styles.practicaRow,
                  {
                    borderColor: item.completed ? c.gold : c.border,
                    backgroundColor: item.completed ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                {/* Check Circle */}
                <View
                  style={[
                    styles.practicaCheckCircle,
                    {
                      borderColor: item.completed ? c.gold : c.tabInactive,
                      backgroundColor: item.completed ? c.gold : 'transparent',
                    },
                  ]}
                >
                  {item.completed && <Icon name="check" size={13} color="#1E1B18" strokeWidth={2} />}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[
                      t.body,
                      {
                        color: item.completed ? c.textStrong : c.text,
                        fontSize: 14,
                        fontWeight: item.completed ? '600' : '400',
                        textDecorationLine: item.completed ? 'line-through' : 'none',
                        opacity: item.completed ? 0.9 : 1,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <View style={styles.practicaMetaRow}>
                    <Text style={[t.micro, { color: c.gold, fontSize: 10, fontWeight: '700' }]}>
                      {item.category}
                    </Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>· {item.duration}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* ========================================================================= */}
        {/* RUTINAS Y BLOQUES DE PODER                                                */}
        {/* ========================================================================= */}
        <Card style={{ gap: 12 }}>
          <MicroLabel>ARQUITECTURA DE ENFOQUE</MicroLabel>
          <Text style={[t.cardTitle, { color: c.textStrong }]}>
            Tus Bloques de Alto Rendimiento
          </Text>

          <View style={{ gap: 8 }}>
            {[
              {
                time: '06:00 - 07:00 AM',
                title: 'Rutina Matutina Somática',
                desc: 'Hidratación alcalina, movilidad y visualización de victoria',
                icon: 'sun' as const,
              },
              {
                time: '09:00 - 11:30 AM',
                title: 'Bloque de Poder Deep Work',
                desc: 'Máxima palanca de negocio sin interrupciones ni redes',
                icon: 'zap' as const,
              },
              {
                time: '09:00 - 10:00 PM',
                title: 'Rutina Nocturna y Desconexión',
                desc: 'Revisión de horarios con verdad y apagado de pantallas',
                icon: 'moon' as const,
              },
            ].map(b => (
              <View
                key={b.title}
                style={[
                  styles.routineBlock,
                  { borderColor: c.border, backgroundColor: c.cardBgAlt },
                ]}
              >
                <View style={[styles.routineIconBadge, { borderColor: c.borderStrong }]}>
                  <Icon name={b.icon} size={15} color={c.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.micro, { color: c.gold, fontSize: 10.5, fontWeight: '700' }]}>
                    {b.time}
                  </Text>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 13.5, fontWeight: '600', marginTop: 1 }]}>
                    {b.title}
                  </Text>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 11.5, marginTop: 1 }]}>
                    {b.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* ========================================================================= */}
        {/* CÓDIGO DE VERDAD DEL DÍA                                                 */}
        {/* ========================================================================= */}
        <View style={[styles.codeCard, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
          <Icon name="diamond" size={18} color={c.gold} />
          <View style={{ flex: 1, gap: 4 }}>
            <MicroLabel>CÓDIGO I DE RENASER · VERDAD</MicroLabel>
            <Text style={[t.body, { color: c.textStrong, fontStyle: 'italic', fontSize: 13.5, lineHeight: 20 }]}>
              "No programes lo que quisieras cumplir. Programa únicamente aquello que verdaderamente estás dispuesto a sostener."
            </Text>
          </View>
        </View>
      </ScrollView>
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
  topGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  gongHeroCard: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  gongMedallion: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gongTextContainer: {
    alignItems: 'center',
    textAlign: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  energySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  energyBtn: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  practicaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  practicaCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practicaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routineBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  routineIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
});