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
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Card, MicroLabel, ScreenHeader } from '../components/ui';
import { Icon } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

interface SmartGoal {
  id: string;
  title: string;
  category: string;
  progress: number;
  deadline: string;
}

export default function PlanScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet } = useResponsive();

  const [activeFase, setActiveFase] = useState<number>(2);

  const [smartGoals, setSmartGoals] = useState<SmartGoal[]>([
    {
      id: '1',
      title: 'Alcanzar 12% de grasa corporal y 5km en 22 min',
      category: 'CUERPO',
      progress: 75,
      deadline: 'Día 60',
    },
    {
      id: '2',
      title: 'Lanzar nuevo sistema de ventas y facturar $15,000 USD',
      category: 'NEGOCIO',
      progress: 60,
      deadline: 'Día 75',
    },
    {
      id: '3',
      title: '90 días ininterrumpidos de cumplimiento de horarios con verdad',
      category: 'DISCIPLINA',
      progress: 41,
      deadline: 'Día 90',
    },
  ]);

  const DIMENSIONES = [
    { name: 'Cuerpo & Salud', val: 85, icon: 'body' as const },
    { name: 'Mente & Disciplina', val: 92, icon: 'brain' as const },
    { name: 'Negocio & Finanzas', val: 78, icon: 'briefcase' as const },
    { name: 'Relaciones & Célula', val: 88, icon: 'users' as const },
    { name: 'Propósito & Espíritu', val: 95, icon: 'spark' as const },
  ];

  const DIAS_SEMANA = [
    { dia: 'LUN', num: '25', status: 'done' },
    { dia: 'MAR', num: '26', status: 'done' },
    { dia: 'MIÉ', num: '27', status: 'done' },
    { dia: 'JUE', num: '28', status: 'done' },
    { dia: 'VIE', num: '29', status: 'done' },
    { dia: 'SÁB', num: '30', status: 'done' },
    { dia: 'DOM', num: '31', status: 'today' },
  ];

  const gaugeW = rs(230);
  const gaugeH = rs(115);

  const handleAddGoal = () => {
    Alert.alert(
      'Nueva Meta SMART',
      'Puedes definir una nueva meta no negociable coordinada con tu mentor de célula.'
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="PLAN" right="dots" />

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
        {/* Header Gauge de Progreso 90 Días */}
        <View style={[styles.gaugeHeroCard, { backgroundColor: c.cardBg, borderColor: c.borderStrong }]}>
          <MicroLabel>ARQUITECTURA DE VIDA · 90 DÍAS</MicroLabel>
          <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18, marginTop: 2 }]}>
            Tu Mapa Estratégico
          </Text>

          {/* Svg Gauge Arc */}
          <View style={[styles.gaugeContainer, { height: gaugeH + 10 }]}>
            <Svg width={gaugeW} height={gaugeH} viewBox="0 0 228 115">
              <Path
                d="M14 105a100 100 0 0 1 200 0"
                stroke={c.border}
                strokeWidth={7}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M14 105a100 100 0 0 1 141-93"
                stroke={c.gold}
                strokeWidth={7}
                strokeLinecap="round"
                fill="none"
              />
              <Circle cx={155} cy={12} r={7} fill="#FFFFFF" stroke={c.gold} strokeWidth={2} />
            </Svg>

            <View style={styles.gaugeCenterText}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>DÍA</Text>
              <Text style={{ fontFamily: 'Jost_700Bold', fontSize: 42, color: c.textStrong, lineHeight: 46 }}>
                37
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>DE 90 (41%)</Text>
            </View>

            <Text style={[t.micro, styles.gaugeLeft, { color: c.textSoft }]}>DÍA 01</Text>
            <Text style={[t.micro, styles.gaugeRight, { color: c.gold, fontWeight: '700' }]}>DÍA 90</Text>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* SELECTOR DE LAS 3 FASES DE LOS 90 DÍAS                                   */}
        {/* ========================================================================= */}
        <Card style={{ gap: 12 }}>
          <MicroLabel>FASES DEL PROTOCOLO</MicroLabel>
          <View style={styles.fasesRow}>
            {[
              { id: 1, label: 'FASE 1', name: 'Fundación', days: 'Días 1–30', status: '✓ Completada' },
              { id: 2, label: 'FASE 2', name: 'Aceleración', days: 'Días 31–60', status: '🔥 ACTIVA' },
              { id: 3, label: 'FASE 3', name: 'Expansión', days: 'Días 61–90', status: 'Próxima' },
            ].map(f => (
              <Pressable
                key={f.id}
                onPress={() => setActiveFase(f.id)}
                style={[
                  styles.faseBtn,
                  {
                    borderColor: activeFase === f.id ? c.gold : c.border,
                    backgroundColor: activeFase === f.id ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <Text style={[t.micro, { color: activeFase === f.id ? c.gold : c.textSoft, fontWeight: '700', fontSize: 10 }]}>
                  {f.label}
                </Text>
                <Text style={[t.body, { color: c.textStrong, fontSize: 13, fontWeight: '600', marginTop: 2 }]}>
                  {f.name}
                </Text>
                <Text style={[t.micro, { color: c.textSoft, fontSize: 10, marginTop: 2 }]}>
                  {f.days}
                </Text>
                <Text style={[t.micro, { color: f.id === 2 ? c.gold : '#4E9F76', fontWeight: '700', fontSize: 9.5, marginTop: 4 }]}>
                  {f.status}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* ========================================================================= */}
        {/* TRACKER SEMANAL DE CUMPLIMIENTO                                          */}
        {/* ========================================================================= */}
        <Card style={{ gap: 12 }}>
          <View style={styles.cardHeaderRow}>
            <View>
              <MicroLabel>CONSISTENCIA SEMANAL</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 2 }]}>
                Semana 6 · Racha Imparable
              </Text>
            </View>
            <Icon name="calendar" size={16} color={c.gold} />
          </View>

          <View style={styles.weekRow}>
            {DIAS_SEMANA.map(d => (
              <View
                key={d.dia}
                style={[
                  styles.dayCard,
                  {
                    borderColor: d.status === 'today' ? c.gold : c.border,
                    backgroundColor: d.status === 'today' ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <Text style={[t.micro, { color: d.status === 'today' ? c.gold : c.textSoft, fontSize: 10, fontWeight: '700' }]}>
                  {d.dia}
                </Text>
                <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '700', marginTop: 2 }]}>
                  {d.num}
                </Text>
                <View
                  style={[
                    styles.dayStatusDot,
                    {
                      backgroundColor: d.status === 'today' ? c.gold : '#4E9F76',
                    },
                  ]}
                >
                  <Icon name="check" size={10} color="#1E1B18" strokeWidth={2} />
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* ========================================================================= */}
        {/* RUEDA DEL BALANCE SOMÁTICO                                               */}
        {/* ========================================================================= */}
        <Card style={{ gap: 14 }}>
          <View style={styles.cardHeaderRow}>
            <View>
              <MicroLabel>BALANCE SOMÁTICO</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 2 }]}>
                Las 5 Dimensiones del Ser
              </Text>
            </View>
            <Icon name="spark" size={16} color={c.gold} />
          </View>

          <View style={{ gap: 10 }}>
            {DIMENSIONES.map(d => (
              <View key={d.name} style={styles.dimRow}>
                <View style={[styles.dimIconBadge, { borderColor: c.borderStrong }]}>
                  <Icon name={d.icon} size={15} color={c.gold} />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.dimTextRow}>
                    <Text style={[t.body, { color: c.textStrong, fontSize: 13.5, fontWeight: '600' }]}>
                      {d.name}
                    </Text>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 12 }]}>
                      {d.val}%
                    </Text>
                  </View>

                  <View style={[styles.dimBarBg, { backgroundColor: c.border }]}>
                    <View
                      style={[
                        styles.dimBarFill,
                        {
                          backgroundColor: c.gold,
                          width: `${d.val}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* ========================================================================= */}
        {/* METAS SMART ACTIVAS                                                       */}
        {/* ========================================================================= */}
        <Card style={{ gap: 14 }}>
          <View style={styles.cardHeaderRow}>
            <View>
              <MicroLabel>METAS SMART ACTIVAS</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 2 }]}>
                Objetivos No Negociables
              </Text>
            </View>
            <Icon name="trophy" size={16} color={c.gold} />
          </View>

          <View style={{ gap: 10 }}>
            {smartGoals.map(goal => (
              <View
                key={goal.id}
                style={[styles.goalCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
              >
                <View style={styles.goalTopRow}>
                  <View style={[styles.goalCategoryBadge, { borderColor: c.borderStrong }]}>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 10 }]}>
                      {goal.category}
                    </Text>
                  </View>
                  <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
                    Meta para {goal.deadline}
                  </Text>
                </View>

                <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '600', marginTop: 6 }]}>
                  {goal.title}
                </Text>

                {/* Progress Bar */}
                <View style={{ gap: 4, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>Progreso real</Text>
                    <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 11 }]}>
                      {goal.progress}%
                    </Text>
                  </View>
                  <View style={[styles.goalBarBg, { backgroundColor: c.border }]}>
                    <View
                      style={[
                        styles.goalBarFill,
                        {
                          backgroundColor: c.gold,
                          width: `${goal.progress}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <GoldButton
            label="+ CREAR NUEVA META SMART"
            onPress={handleAddGoal}
            variant="outline"
            style={{ marginTop: 4 }}
          />
        </Card>
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
  gaugeHeroCard: {
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 8,
    width: '100%',
  },
  gaugeCenterText: {
    position: 'absolute',
    top: 32,
    alignItems: 'center',
  },
  gaugeLeft: {
    position: 'absolute',
    left: 12,
    bottom: 4,
  },
  gaugeRight: {
    position: 'absolute',
    right: 12,
    bottom: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fasesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  faseBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayCard: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  dayStatusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dimIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dimBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dimBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalCard: {
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 12,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalCategoryBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  goalBarBg: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
});