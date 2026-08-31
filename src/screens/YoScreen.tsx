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
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useAuth } from '../context/AuthContext';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, ScreenHeader, Placeholder } from '../components/ui';
import { Icon } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';

// =========================================================================
// DATOS ESTÁTICOS
// =========================================================================
const EVOLUCION = [
  [6, 66], [38, 58], [70, 62], [102, 46], [134, 50],
  [166, 34], [198, 38], [230, 24], [262, 26], [294, 12], [314, 8],
];

const PATRONES = [[6, 34], [90, 30], [174, 34], [258, 20], [314, 18]];

const STATS = [
  { k: 'DISCIPLINA', v: '87' },
  { k: 'ENFOQUE', v: '92' },
  { k: 'ENERGÍA', v: '81' },
];

const EVIDENCIAS_DATA = [
  { id: 'ev1', title: 'Protocolo 05:00 AM', time: '05:04 AM · Hoy', icon: '☀️', desc: 'Luz solar directa y respiración diafragmática', verified: true },
  { id: 'ev2', title: 'Hidratación Somática', time: '06:15 AM · Hoy', icon: '💧', desc: '1L de agua alcalina con sal marina', verified: true },
  { id: 'ev3', title: 'Bloque Deep Work 90m', time: '08:30 AM · Ayer', icon: '⚡', desc: '90m modo avión sin interrupciones', verified: true },
  { id: 'ev4', title: 'Cierre Somático', time: '21:30 PM · Ayer', icon: '🛌', desc: '0 pantallas y temperatura fresca', verified: true },
];

const LOGROS_DATA = [
  { id: 'l1', title: 'FUNDADOR SOMÁTICO', icon: '🥇', desc: 'Completaste con éxito la Fase 1: Días 1 al 30 sin fallar.', unlocked: true },
  { id: 'l2', title: 'RACHA DE FUEGO (30 DÍAS)', icon: '🔥', desc: '30 amaneceres consecutivos subiendo evidencia.', unlocked: true },
  { id: 'l3', title: 'MAESTRO DEL FOCO', icon: '⚡', desc: '50 bloques de Deep Work completados en modo avión.', unlocked: true },
  { id: 'l4', title: 'REY SOMÁTICO (90 DÍAS)', icon: '👑', desc: 'Graduación oficial del programa. Llevas 37 de 90 días.', unlocked: false, progress: '41%' },
];

const ONBOARDING_STAGES = [
  { id: 'st1', num: 1, title: 'El Pacto', desc: 'Completada · toca para revisar', completed: true },
  { id: 'st2', num: 2, title: 'Cuestionario Profundo', desc: 'Completada · toca para revisar', completed: true },
  { id: 'st3', num: 3, title: 'Las 90 Variables', desc: 'Completada · toca para revisar', completed: true },
  { id: 'st4', num: 4, title: 'Diseño de Destino', desc: 'Hacia dónde vas y en quién te conviertes', active: true },
  { id: 'st5', num: 5, title: 'Cierre de tu primera fase', desc: 'El sello final de tu onboarding', locked: true },
];

const PACTO_CLAUSULAS = [
  '1. Cumplir mis 3 Objetivos diarios sin negociarlos conmigo.',
  '2. Subir las evidencias que el sistema me exija.',
  '3. Aceptar la disciplina como camino, no como castigo.',
  '4. Hablarme con respeto, especialmente cuando falle.',
  '5. No abandonar la célula ni huir cuando aparezca la incomodidad.',
  '6. Cuidar mi cuerpo como el templo que es.',
  '7. Sanar mis heridas en lugar de defenderlas.',
  '8. Cobrar lo que valgo y dejar de subvalorarme.',
  '9. Decir la verdad aunque tiemble la voz.',
  '10. Llegar al Día 90 transformado, no entretenido.',
];

export default function YoScreen() {
  const { c, t } = useTheme();
  const { rs, isTablet, horizontalPadding } = useResponsive();
  const { user, logout } = useAuth();
  const moreSize = rs(56);
  const evoPath = 'M' + EVOLUCION.map(p => p[0] + ' ' + p[1]).join(' L');

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN Y SUB-MÓDULOS
  // =========================================================================
  const [activeView, setActiveView] = useState<
    'main' | 'hub' | 'editar_perfil' | 'evidencias' | 'logros' | 'onboarding' | 'pacto' | 'espejo' | 'metodo' | 'notificaciones'
  >('main');

  // Formulario Editar Perfil
  const [profileName, setProfileName] = useState(user?.name || 'Sebastián Arango');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'sebastian@renaser.com');
  const [profilePhone, setProfilePhone] = useState('+57 312 849 2011');
  const [profileCity, setProfileCity] = useState('Medellín, Colombia');

  // Espejo de la sombra
  const [catarsisText, setCatarsisText] = useState('');

  // Notificaciones
  const [notifAlarm, setNotifAlarm] = useState(true);
  const [notifCelula, setNotifCelula] = useState(true);
  const [notifLive, setNotifLive] = useState(true);

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
    if (activeView === 'pacto') {
      setActiveView('onboarding');
      return true;
    }
    if (activeView !== 'main' && activeView !== 'hub') {
      setActiveView('hub');
      return true;
    }
    if (activeView === 'hub') {
      setActiveView('main');
      return true;
    }
    return false;
  }, activeView !== 'main');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="YO" right="dots" />

      {/* ========================================================================= */}
      {/* 1. PANTALLA PRINCIPAL "YO" (TU DISEÑO EXACTO INTACTO)                     */}
      {/* ========================================================================= */}
      {activeView === 'main' && (
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
          {/* User Card Interactiva (Al dar clic abre el Centro de Ajustes) */}
          <Pressable
            onPress={() => setActiveView('hub')}
            style={[styles.userCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
          >
            <View style={[styles.avatar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Icon name="user" size={20} color={c.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>{profileName}</Text>
              <Text style={[t.small, { color: c.micro, marginTop: 2 }]}>{profileEmail}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13, color: c.gold }}>⚙️</Text>
              <Icon name="chevron" size={12} color={c.chevron} />
            </View>
          </Pressable>

          {/* TU EVOLUCIÓN */}
          <View style={{ paddingTop: 14 }}>
            <Text style={[t.micro, { color: c.textSoft }]}>TU EVOLUCIÓN</Text>
            <Text style={[t.micro, { color: c.micro, marginTop: 4 }]}>DÍA 37 DE 90</Text>
            <Svg width="100%" height={78} viewBox="0 0 320 78" style={{ marginTop: 10 }}>
              <Path d={evoPath} stroke={c.gold} strokeWidth={1.5} strokeLinecap="round" fill="none" />
              {EVOLUCION.map(([x, y]) => <Circle key={x} cx={x} cy={y} r={2.8} fill={c.gold} />)}
            </Svg>
          </View>

          {/* STATS */}
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12 }}>
            {STATS.map(s => (
              <View key={s.k} style={[styles.stat, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.micro, { color: c.micro, fontSize: 8 }]}>{s.k}</Text>
                <Text style={{ fontFamily: 'Jost_300Light', fontSize: 24, color: c.textStrong, marginTop: 6 }}>
                  {s.v}<Text style={{ fontSize: 12, color: c.micro }}>%</Text>
                </Text>
              </View>
            ))}
          </View>

          {/* EVIDENCIA */}
          <View style={{ paddingTop: 16 }}>
            <MicroLabel>EVIDENCIA</MicroLabel>
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}>
              {[0, 1, 2].map(i => (
                <Pressable
                  key={i}
                  onPress={() => setActiveView('evidencias')}
                  style={{ flex: 1 }}
                >
                  <Placeholder label="FOTO" style={{ height: moreSize, borderRadius: 10 }} />
                </Pressable>
              ))}
              <Pressable
                onPress={() => setActiveView('evidencias')}
                style={[styles.more, { width: moreSize, height: moreSize, borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <Text style={[t.small, { color: c.textSoft }]}>+6</Text>
              </Pressable>
            </View>
          </View>

          {/* REFLEXIÓN DIARIA */}
          <Pressable
            onPress={() => Alert.alert('Reflexión Diaria', 'Registra tu introspección somática en el diario de hoy.')}
            style={[styles.rowCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
          >
            <View style={{ flex: 1 }}>
              <MicroLabel>REFLEXIÓN DIARIA</MicroLabel>
              <Text style={[t.body, { color: c.text, marginTop: 6 }]}>¿Qué aprendí hoy sobre mí?</Text>
            </View>
            <Icon name="chevron" size={12} color={c.chevron} />
          </Pressable>

          {/* PATRONES */}
          <View style={{ flex: 1, justifyContent: 'center', paddingTop: 14 }}>
            <MicroLabel>PATRONES</MicroLabel>
            <Svg width="100%" height={52} viewBox="0 0 320 52" style={{ marginTop: 6 }}>
              <Path
                d="M6 34 C 34 12, 62 44, 90 30 S 146 8, 174 34 S 230 44, 258 20 S 300 30, 314 18"
                stroke={c.gold} strokeWidth={1.5} strokeLinecap="round" fill="none"
              />
              {PATRONES.map(([x, y]) => <Circle key={x} cx={x} cy={y} r={2.8} fill={c.gold} />)}
            </Svg>
          </View>

          {/* IDENTIDAD */}
          <Pressable
            onPress={() => Alert.alert('Identidad Somática', 'Forjando la versión de ti que ya no negocia con la mediocridad.')}
            style={[styles.rowCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
          >
            <View style={{ flex: 1 }}>
              <MicroLabel>IDENTIDAD</MicroLabel>
              <Text style={[t.body, { color: c.text, marginTop: 6, lineHeight: 21 }]}>
                Soy la persona que…{"\n"}Elijo ser cada día.
              </Text>
            </View>
            <Icon name="chevron" size={12} color={c.chevron} />
          </Pressable>

          {/* BOTÓN: MI FICHA INICIAL & PACTO */}
          <Pressable
            onPress={() => setActiveView('onboarding')}
            style={[styles.onboardingBtn, { borderColor: c.borderStrong, backgroundColor: c.cardBg }]}
          >
            <Icon name="doc" size={16} color={c.gold} />
            <Text style={[t.micro, { color: c.textStrong, letterSpacing: 1.6, fontWeight: '600' }]}>
              MI FICHA INICIAL & PACTO
            </Text>
          </Pressable>

          {/* Logout */}
          <Pressable
            onPress={logout}
            style={[styles.logoutBtn, { borderColor: c.border, backgroundColor: c.cardBg }]}
          >
            <Icon name="logout" size={16} color={c.textSoft} />
            <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1.8 }]}>
              CERRAR SESIÓN
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 2. MENÚ HUB: CENTRO DE AJUSTES & PERFIL                                    */}
      {/* ========================================================================= */}
      {activeView === 'hub' && (
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
            <Pressable onPress={() => setActiveView('main')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A MI ESPACIO
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                PERFIL & AJUSTES
              </Text>
            </View>
          </View>

          {/* Banner de Usuario */}
          <View style={[styles.profileBanner, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <View style={[styles.avatarLg, { borderColor: c.gold, backgroundColor: '#292215' }]}>
              <Text style={{ color: '#E5C689', fontSize: 18, fontWeight: '900' }}>SA</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]}>{profileName}</Text>
              <Text style={[t.micro, { color: c.gold, fontSize: 11 }]}>{profileEmail}</Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5, marginTop: 2 }]}>
                Célula Fénix 07 · Miembro Activo
              </Text>
            </View>
          </View>

          <View style={{ gap: 14, marginTop: 14, paddingBottom: 28 }}>
            {/* 1. DATOS PERSONALES & PERFIL */}
            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                1. DATOS PERSONALES & PERFIL
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('editar_perfil')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>👤</Text>
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Editar Perfil</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Nombre, foto, teléfono y contraseña</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.gold} />
                </Pressable>
              </View>
            </View>

            {/* 2. HISTORIAL & REGISTROS */}
            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                2. HISTORIAL & REGISTROS
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('onboarding')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>🎙️</Text>
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Mi Onboarding (5 Etapas)</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>El Pacto firmado y tus 90 variables</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.gold} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('evidencias')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>📸</Text>
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Registro de Evidencias</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>37 fotos subidas y verificadas por mentor</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.gold} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('logros')}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>🎖️</Text>
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Logros e Insignias</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Medallas y trofeos de tus 90 días</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.gold} />
                </Pressable>
              </View>
            </View>

            {/* 3. HERRAMIENTAS SOMÁTICAS */}
            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                3. HERRAMIENTAS SOMÁTICAS
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('espejo')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>🪞</Text>
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Espejo de la Sombra</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Catarsis privada + Informe semanal con IA</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.gold} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('metodo')}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>✨</Text>
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>El Método Renaser</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Las 5 dimensiones y principios de vida</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.gold} />
                </Pressable>
              </View>
            </View>

            {/* 4. PREFERENCIAS & SISTEMA */}
            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
                4. PREFERENCIAS & SISTEMA
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('notificaciones')}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>🔔</Text>
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Notificaciones & Alarmas</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Recordatorio 05:00 AM y célula</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.gold} />
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-VISTA: 🎙️ MI ONBOARDING (5 ETAPAS EXACTO A CAPTURAS)               */}
      {/* ========================================================================= */}
      {activeView === 'onboarding' && (
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
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                MI ONBOARDING
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={[t.sectionTitle, { color: c.textStrong, fontSize: 18 }]}>Tu proceso completo</Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 }]}>
              Cinco etapas para poner por escrito quién eras, quién eres y en quién te estás convirtiendo. Cada etapa se guarda al terminarla.
            </Text>
          </View>

          {/* Banner Ventana 24h */}
          <View style={[styles.windowBanner, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
            <Text style={{ fontSize: 18 }}>🕒</Text>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 12 }]}>
                Tu ventana de 24 horas está abierta
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>
                Te quedan 1 h 18 min — cierra a las 6:00 pm y no vuelve a abrirse.
              </Text>
            </View>
          </View>

          {/* Barra de Progreso */}
          <View style={{ gap: 4, marginTop: 12 }}>
            <View style={[styles.progressBarBg, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <View style={[styles.progressBarFill, { width: '60%', backgroundColor: c.gold }]} />
            </View>
            <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', fontSize: 10 }]}>
              3 de 5 etapas completadas
            </Text>
          </View>

          {/* 5 Etapas */}
          <View style={{ gap: 8, marginTop: 12, paddingBottom: 28 }}>
            {ONBOARDING_STAGES.map(stage => {
              return (
                <Pressable
                  key={stage.id}
                  onPress={() => {
                    if (stage.id === 'st1') {
                      setActiveView('pacto');
                    } else if (stage.completed) {
                      Alert.alert(stage.title, 'Etapa completada con éxito.');
                    } else if (stage.active) {
                      Alert.alert(stage.title, 'Continuando etapa activa...');
                    }
                  }}
                  style={[
                    styles.stageCard,
                    {
                      borderColor: stage.active ? c.gold : c.border,
                      backgroundColor: stage.active ? c.cardBgAlt : c.cardBg,
                      opacity: stage.locked ? 0.5 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={[
                        styles.stageCheckCircle,
                        {
                          backgroundColor: stage.completed
                            ? '#173429'
                            : stage.active
                            ? c.gold
                            : '#2A2620',
                        },
                      ]}
                    >
                      {stage.completed ? (
                        <Text style={{ color: '#70d2a0', fontWeight: 'bold', fontSize: 11 }}>✓</Text>
                      ) : stage.active ? (
                        <Text style={{ color: '#1E1B18', fontWeight: 'bold', fontSize: 11 }}>{stage.num}</Text>
                      ) : (
                        <Text style={{ color: '#888', fontSize: 10 }}>🔒</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: stage.active ? c.gold : c.textStrong, fontSize: 13 }]}>
                        {stage.title}
                      </Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>
                        {stage.desc}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={stage.active ? c.gold : c.textSoft} />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-VISTA: 📜 DOCUMENTO DEL PACTO DE RENACIMIENTO                     */}
      {/* ========================================================================= */}
      {activeView === 'pacto' && (
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
            <Pressable onPress={() => setActiveView('onboarding')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A ETAPAS
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                PARTE 01
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <View style={[styles.iconShieldCircle, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={{ fontSize: 20 }}>📜</Text>
            </View>
            <Text style={[t.sectionTitle, { color: c.textStrong, fontSize: 17, marginTop: 8 }]}>
              Pacto de Renacimiento
            </Text>
            <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 2 }]}>
              Léelo despacio. Léelo en voz alta si puedes.
            </Text>
          </View>

          {/* Manifiesto y Cláusulas */}
          <View style={[styles.pactoDocumentCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <View style={{ alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 8 }}>
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.gold, fontSize: 14, fontStyle: 'italic' }}>
                Pacto de Renacimiento
              </Text>
              <Text style={[t.micro, { color: c.textSoft, letterSpacing: 2, fontSize: 9 }]}>
                — ACTO FUNDACIONAL —
              </Text>
            </View>

            <Text style={[t.body, { color: c.text, fontSize: 11, lineHeight: 17 }]}>
              Yo, <Text style={{ color: c.gold, fontWeight: 'bold' }}>{profileName}</Text>, en pleno uso de mi consciencia, declaro este pacto conmigo mismo en presencia del sistema RENASER y de la versión más alta de mí.
            </Text>

            <Text style={[t.body, { color: c.text, fontSize: 11, lineHeight: 17 }]}>
              <Text style={{ fontWeight: 'bold', color: c.textStrong }}>Renuncio a la mediocridad.</Text> Renuncio al desdén con que he tratado mi cuerpo, mi mente, mis emociones y mi tiempo.
            </Text>

            <View style={{ gap: 4, marginVertical: 4 }}>
              {PACTO_CLAUSULAS.map(clause => (
                <Text key={clause} style={[t.body, { color: c.textSoft, fontSize: 10.5, lineHeight: 15 }]}>
                  {clause}
                </Text>
              ))}
            </View>

            <Text style={[t.body, { color: c.gold, fontWeight: '700', fontSize: 10.5, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 8 }]}>
              Si lo cumplo, gano una identidad nueva. Si lo abandono, pierdo la versión de mí que ya estaba esperando del otro lado.
            </Text>
          </View>

          {/* Firma Digital con el Dedo */}
          <View style={[styles.signatureBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Text style={{ fontFamily: 'Jost_700Bold', color: c.gold, fontSize: 12, fontStyle: 'italic' }}>
              — Firma con tu dedo —
            </Text>
            <View style={[styles.signatureCanvas, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.gold, fontSize: 22, fontStyle: 'italic' }}>
                {profileName}
              </Text>
              <Text style={[t.micro, { color: c.textSoft, position: 'absolute', bottom: 4, fontSize: 8.5 }]}>
                FIRMA DIGITAL REGISTRADA & SELLADA
              </Text>
            </View>
          </View>

          <GoldButton
            label="✓ SELLAR MI COMPROMISO →"
            onPress={() => {
              Alert.alert('¡Pacto Sellado! 🦅', 'Tu compromiso de 90 días está activo y respaldado en tu expediente.');
              setActiveView('onboarding');
            }}
            style={{ width: '100%', marginTop: 12, marginBottom: 28 }}
          />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-VISTA: 📸 REGISTRO DE EVIDENCIAS                                   */}
      {/* ========================================================================= */}
      {activeView === 'evidencias' && (
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
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                EVIDENCIAS
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <View>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>Tus Evidencias Somáticas</Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>37 fotos subidas · 100% verificadas</Text>
            </View>
            <Pressable
              onPress={() => Alert.alert('Subir Evidencia', 'Abriendo selector de cámara para subir evidencia fotográfica...')}
              style={[styles.createHabitBtn, { backgroundColor: c.gold }]}
            >
              <Text style={{ color: '#1E1B18', fontWeight: '800', fontSize: 10.5 }}>+ Subir Foto</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingBottom: 28 }}>
            {EVIDENCIAS_DATA.map(ev => (
              <View
                key={ev.id}
                style={[
                  styles.evidenceCard,
                  {
                    borderColor: c.border,
                    backgroundColor: c.cardBg,
                    width: isTablet ? '31%' : '47.5%',
                  },
                ]}
              >
                <View style={[styles.evidenceImgBox, { backgroundColor: c.cardBgAlt }]}>
                  <Text style={{ fontSize: 28 }}>{ev.icon}</Text>
                </View>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 12, marginTop: 4 }]}>
                  {ev.title}
                </Text>
                <Text style={[t.micro, { color: c.gold, fontSize: 9.5, fontWeight: '700' }]}>
                  {ev.time}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 9.5, marginTop: 2 }]} numberOfLines={2}>
                  {ev.desc}
                </Text>
                <View style={[styles.tagPill, { borderColor: '#70d2a0', backgroundColor: '#173429', marginTop: 4, alignSelf: 'flex-start' }]}>
                  <Text style={[t.micro, { color: '#70d2a0', fontSize: 8.5, fontWeight: '800' }]}>
                    ✓ VERIFICADO
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 6. SUB-VISTA: 🎖️ LOGROS E INSIGNIAS                                       */}
      {/* ========================================================================= */}
      {activeView === 'logros' && (
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
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                LOGROS
              </Text>
            </View>
          </View>

          <View style={{ gap: 10, marginTop: 14, paddingBottom: 28 }}>
            {LOGROS_DATA.map(logro => (
              <View
                key={logro.id}
                style={[
                  styles.logroCard,
                  {
                    borderColor: logro.unlocked ? c.gold : c.border,
                    backgroundColor: logro.unlocked ? c.cardBgAlt : c.cardBg,
                    opacity: logro.unlocked ? 1 : 0.7,
                  },
                ]}
              >
                <View style={[styles.logroIconCircle, { borderColor: logro.unlocked ? c.gold : c.border, backgroundColor: logro.unlocked ? c.gold : c.cardBg }]}>
                  <Text style={{ fontSize: 22 }}>{logro.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[t.cardTitle, { color: logro.unlocked ? c.gold : c.textStrong, fontSize: 12.5 }]}>
                      {logro.title}
                    </Text>
                    <Text style={[t.micro, { color: logro.unlocked ? '#70d2a0' : c.textSoft, fontSize: 8.5, fontWeight: '800' }]}>
                      {logro.unlocked ? 'DESBLOQUEADO' : logro.progress || 'EN CURSO'}
                    </Text>
                  </View>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 10.5, marginTop: 2 }]}>
                    {logro.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 7. SUB-VISTA: 🪞 ESPEJO DE LA SOMBRA (CON IA)                             */}
      {/* ========================================================================= */}
      {activeView === 'espejo' && (
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
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                ESPEJO DE LA SOMBRA
              </Text>
            </View>
          </View>

          <View style={[styles.windowBanner, { borderColor: c.border, backgroundColor: c.cardBgAlt, marginTop: 10 }]}>
            <Text style={{ fontSize: 18 }}>🔒</Text>
            <Text style={[t.micro, { color: c.textSoft, flex: 1, fontSize: 10.5 }]}>
              Espacio privado y confidencial cifrado. Solo tú y el informe IA tienen acceso.
            </Text>
          </View>

          {/* Formulario Catarsis */}
          <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg, padding: 14, gap: 10, marginTop: 10 }]}>
            <Text style={[t.cardTitle, { color: c.gold, fontSize: 13 }]}>
              DESAHOGO SOMÁTICO DE HOY:
            </Text>
            <TextInput
              value={catarsisText}
              onChangeText={setCatarsisText}
              placeholder="Escribe o graba lo que estás sintiendo hoy sin filtros ni juicios..."
              placeholderTextColor={c.textSoft}
              multiline
              style={[styles.modalInputText, { minHeight: 90, borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Pressable
                onPress={() => Alert.alert('Grabando...', 'Audio somático de 60s en curso...')}
                style={[styles.momentSwitchBtn, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
              >
                <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>🎙️ Grabar Audio</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert('Catarsis Liberada 🕊️', 'Tu registro ha sido procesado por el modelo de IA Somática.');
                  setCatarsisText('');
                }}
                style={[styles.createHabitBtn, { backgroundColor: c.gold }]}
              >
                <Text style={{ color: '#1E1B18', fontWeight: '800', fontSize: 11 }}>Liberar 🕊️</Text>
              </Pressable>
            </View>
          </View>

          {/* Informe Semanal IA */}
          <View style={[styles.goalCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt, marginTop: 12, paddingBottom: 28 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '800' }]}>✨ INFORME SEMANAL IA (SEM 06):</Text>
              <Text style={[t.micro, { color: '#70d2a0', fontWeight: '800', fontSize: 9 }]}>GENERADO HOY</Text>
            </View>
            <Text style={[t.body, { color: c.text, fontSize: 11, lineHeight: 17, marginTop: 6 }]}>
              "Sebastián: Detectamos una reducción del 60% en la ansiedad nocturna gracias al protocolo de desconexión. Mantén el foco en delegar tareas operativas de ventas."
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 8. SUB-VISTA: 👤 EDITAR PERFIL                                            */}
      {/* ========================================================================= */}
      {activeView === 'editar_perfil' && (
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
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                EDITAR PERFIL
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <View style={[styles.avatarLg, { borderColor: c.gold, backgroundColor: '#292215', width: 70, height: 70, borderRadius: 35 }]}>
              <Text style={{ color: '#E5C689', fontSize: 24, fontWeight: '900' }}>SA</Text>
            </View>
            <Pressable onPress={() => Alert.alert('Cambiar Foto', 'Selecciona una foto desde tu galería.')} style={{ marginTop: 6 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>Cambiar Foto 📷</Text>
            </Pressable>
          </View>

          <View style={{ gap: 12, marginTop: 14 }}>
            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>NOMBRE COMPLETO:</Text>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>CORREO ELECTRÓNICO:</Text>
              <TextInput
                value={profileEmail}
                onChangeText={setProfileEmail}
                keyboardType="email-address"
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>TELÉFONO / WHATSAPP:</Text>
              <TextInput
                value={profilePhone}
                onChangeText={setProfilePhone}
                keyboardType="phone-pad"
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>CIUDAD / PAÍS:</Text>
              <TextInput
                value={profileCity}
                onChangeText={setProfileCity}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>
          </View>

          <GoldButton
            label="✓ GUARDAR CAMBIOS"
            onPress={() => {
              Alert.alert('¡Perfil Guardado! 🦅', 'Tus datos han sido actualizados con éxito.');
              setActiveView('hub');
            }}
            style={{ width: '100%', marginTop: 16, marginBottom: 28 }}
          />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 9. SUB-VISTA: ✨ EL MÉTODO RENASER                                        */}
      {/* ========================================================================= */}
      {activeView === 'metodo' && (
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
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                EL MÉTODO
              </Text>
            </View>
          </View>

          <View style={{ gap: 10, marginTop: 14, paddingBottom: 28 }}>
            <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg, padding: 14, gap: 6 }]}>
              <Text style={[t.cardTitle, { color: '#90CAF9', fontSize: 13 }]}>1. CUERPO: BIOLOGÍA & HORMONAS</Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 11, lineHeight: 16 }]}>
                Hackeo del ritmo circadiano, desinflamación fascial con tensión isométrica y nutrición celular sin picos de cortisol.
              </Text>
            </View>

            <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg, padding: 14, gap: 6 }]}>
              <Text style={[t.cardTitle, { color: '#CE93D8', fontSize: 13 }]}>2. MENTE: FOCO & DEEP WORK</Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 11, lineHeight: 16 }]}>
                Eliminación de la fatiga por decisión y bloques ininterrumpidos de 90 minutos de máximo enfoque comercial.
              </Text>
            </View>

            <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg, padding: 14, gap: 6 }]}>
              <Text style={[t.cardTitle, { color: '#FFE082', fontSize: 13 }]}>3. NEGOCIO: LIBERTAD FINANCIERA</Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 11, lineHeight: 16 }]}>
                Estrategia 80/20, ofertas de alto valor y escala de liderazgo sin quemarse biológicamente.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 10. SUB-VISTA: 🔔 NOTIFICACIONES                                          */}
      {/* ========================================================================= */}
      {activeView === 'notificaciones' && (
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
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.gold} />
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 9.5 }]}>
                NOTIFICACIONES
              </Text>
            </View>
          </View>

          <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg, marginTop: 14 }]}>
            <View style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Alarma 05:00 AM</Text>
                <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Aviso para despertar y luz solar</Text>
              </View>
              <Switch
                value={notifAlarm}
                onValueChange={setNotifAlarm}
                trackColor={{ false: '#332C20', true: c.gold }}
                thumbColor={notifAlarm ? '#1E1B18' : '#888'}
              />
            </View>

            <View style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Avisos de Célula Fénix</Text>
                <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Mensajes y victorias de tu tribu</Text>
              </View>
              <Switch
                value={notifCelula}
                onValueChange={setNotifCelula}
                trackColor={{ false: '#332C20', true: c.gold }}
                thumbColor={notifCelula ? '#1E1B18' : '#888'}
              />
            </View>

            <View style={styles.menuOptionRow}>
              <View style={{ flex: 1 }}>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Masterclasses en Vivo</Text>
                <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5 }]}>Alertas 1h antes de cada sesión</Text>
              </View>
              <Switch
                value={notifLive}
                onValueChange={setNotifLive}
                trackColor={{ false: '#332C20', true: c.gold }}
                thumbColor={notifLive ? '#1E1B18' : '#888'}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 28 },
  userCard: { marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarLg: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  profileBanner: { marginTop: 12, borderWidth: 1.5, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  more: { borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowCard: { marginTop: 14, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  onboardingBtn: { marginTop: 16, borderWidth: 1, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoutBtn: { marginTop: 10, marginBottom: 12, borderWidth: 1, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  detailTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, marginTop: 4 },
  backBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryPillBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  groupedBox: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  menuOptionRow: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  windowBanner: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  progressBarBg: { height: 6, borderRadius: 3, borderWidth: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  stageCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stageCheckCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconShieldCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pactoDocumentCard: { borderWidth: 1.5, borderRadius: 20, padding: 14, gap: 10, marginTop: 12 },
  signatureBox: { borderWidth: 1, borderRadius: 18, padding: 12, alignItems: 'center', gap: 8, marginTop: 12 },
  signatureCanvas: { width: '100%', height: 90, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  createHabitBtn: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  evidenceCard: { borderWidth: 1, borderRadius: 16, padding: 10, gap: 2 },
  evidenceImgBox: { width: '100%', height: 75, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tagPill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  logroCard: { borderWidth: 1.5, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  logroIconCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  momentSwitchBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  goalCard: { borderWidth: 1.5, borderRadius: 18, padding: 14 },
  modalInputText: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12 },
});