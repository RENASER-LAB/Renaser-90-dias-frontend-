import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Easing,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
} from 'react-native';
import { Alert } from '../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { useAuth } from '../context/AuthContext';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, ScreenHeader, Placeholder } from '../components/ui';
import { AdminScreen } from '../features/admin/screens/AdminScreen';
import { useCapacidades } from '../features/admin/hooks/useCapacidades';
import { Icon, type IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import {
  useResumenHome,
  rotuloDeFase,
  DIAS_DEL_PROGRAMA,
} from '../features/home/hooks/useResumenHome';
import { useEtapasOnboarding } from '../features/onboarding/hooks/useEtapasOnboarding';
import { MapaRenacimientoFlow } from '../features/mapa-renacimiento/MapaRenacimientoFlow';
import { elegirFotoDeGaleria } from '../features/habits/utils/capturarEvidencia';
import * as authApi from '../features/auth/api/authApi';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';
import { useMisEvidencias } from '../features/evidence/hooks/useMisEvidencias';
import { ESTADO_EVIDENCIA, iconoDeTipo } from '../features/evidence/api/evidenceSchemas';

// =========================================================================
// DATOS ESTÁTICOS
// =========================================================================
const EVOLUCION = [
  [6, 66], [38, 58], [70, 62], [102, 46], [134, 50],
  [166, 34], [198, 38], [230, 24], [262, 26], [294, 12], [314, 8],
];

const PATRONES = [[6, 34], [90, 30], [174, 34], [258, 20], [314, 18]];

/* Etiquetas legibles de los enums del backend. Antes las tarjetas decian siempre
   "✓ VERIFICADO" aunque la evidencia estuviera pendiente o rechazada. */
const ETIQUETA_TIPO_EVIDENCIA: Record<string, string> = {
  FOTO: 'Foto', VIDEO: 'Video', AUDIO: 'Audio', TEXTO: 'Texto', CAPTURA: 'Captura',
};

const ETIQUETA_ESTADO_EVIDENCIA: Record<string, string> = {
  PENDIENTE: 'EN REVISIÓN',
  VALIDA: 'VERIFICADA',
  RECHAZADA: 'RECHAZADA',
  REVISION_MANUAL: 'REVISIÓN MANUAL',
  ANULADA_ADMIN: 'ANULADA',
};

/** Fecha corta en la zona del dispositivo. `null` cuando el backend no la trae. */
function fechaDeEvidencia(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Catalogo de metas del programa: lo que se PUEDE conseguir, no lo que el aprendiz consiguio.
 *
 * Antes esto era `LOGROS_DATA` y tres de los cuatro venian con `unlocked: true` fijo, mas un
 * "Llevas 37 de 90 dias" escrito a mano. A alguien en el dia 2 se le afirmaba que habia
 * encadenado 30 amaneceres y 50 bloques de trabajo profundo. No hay endpoint de logros en el
 * backend (existe /api/v1/evidence, no /api/v1/logros), asi que no hay forma de saber cuales
 * consiguio: se muestran todos como metas, sin marcar ninguna, hasta que exista ese dato.
 */
const LOGROS_DEL_PROGRAMA: ReadonlyArray<{ id: string; title: string; icon: IconName; desc: string }> = [
  { id: 'l1', title: 'FUNDADOR SOMÁTICO', icon: 'award', desc: 'Completar la Fase 1: días 1 al 30 sin fallar.' },
  { id: 'l2', title: 'RACHA DE FUEGO (30 DÍAS)', icon: 'fire', desc: '30 amaneceres consecutivos subiendo evidencia.' },
  { id: 'l3', title: 'MAESTRO DEL FOCO', icon: 'zap', desc: '50 bloques de trabajo profundo en modo avión.' },
  { id: 'l4', title: 'REY SOMÁTICO (90 DÍAS)', icon: 'trophy', desc: 'Graduación oficial del programa: los 90 días.' },
];

const METODO_FASES: ReadonlyArray<{
  phase: string;
  title: string;
  icon: IconName;
  color: string;
  quote: string;
  summary: string;
  bullets: string[];
}> = [
  {
    phase: 'FASE 1',
    title: 'Comprender tu mente',
    icon: 'brain',
    color: '#90CAF9',
    quote: 'No puedes transformar lo que no comprendes.',
    summary: 'Reconoce tu mapa mental, emocional y energético para dejar de repetir en automático.',
    bullets: [
      'Identidad, creencias y patrones',
      'Miedos, culpa y vergüenza',
      'Heridas de infancia',
      'Ansiedad y autosabotaje',
    ],
  },
  {
    phase: 'FASE 2',
    title: 'Autoterapia Renaser',
    icon: 'heart',
    color: '#CE93D8',
    quote: 'Aprendes a transformarte a ti mismo.',
    summary: 'Regula tus emociones y cambia el diálogo interno con herramientas que puedes practicar cada día.',
    bullets: [
      'Reprogramación subconsciente',
      'Meditación y respiración',
      'Reencuadre profundo',
      'Sanación emocional',
    ],
  },
  {
    phase: 'FASE 3',
    title: 'Alto rendimiento personal',
    icon: 'zap',
    color: '#FFE082',
    quote: 'Transformarte no basta: debes sostenerlo.',
    summary: 'Convierte claridad en hábitos, foco y resultados sostenibles sin quemarte en el proceso.',
    bullets: [
      'Hábitos desde tu esencia',
      'Rituales de enfoque profundo',
      'Plan de energía y descanso',
      'Libertad financiera con equilibrio',
    ],
  },
];

function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'R';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/**
 * Las 2 etapas actuales: solo el título y el orden son fijos. El estado de cada una lo decide
 * `useEtapasOnboarding` con datos reales — antes estaba escrito acá con `completed: true` en tres
 * de ellas, así que un aprendiz que no había hecho nada veía tres tildes verdes.
 *
 * Hoy solo El Pacto tiene marca en el backend (`pactSignedAt`). El Mapa de Renacimiento reúne
 * el formulario completo de esta fase y se muestra como una única segunda etapa.
 */
const ONBOARDING_STAGES = [
  { id: 'st1', num: 1, title: 'El Pacto', descPendiente: 'Tu acto fundacional' },
  { id: 'st2', num: 2, title: 'Mapa de Renacimiento', descPendiente: 'Tu mapa completo de transformación' },
] as const;

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
  const {
    evidencias,
    verificadas: verificadasEvidencias,
    cargando: cargandoEvidencias,
    error: errorEvidencias,
    recargar: recargarEvidencias,
  } = useMisEvidencias();
  const etapasOnboarding = useEtapasOnboarding();
  const { rs, isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
  const { user, logout, actualizarPerfil, refrescarPerfil } = useAuth();
  const { resumen } = useResumenHome();
  const moreSize = rs(56);
  const evoPath = 'M' + EVOLUCION.map(p => p[0] + ' ' + p[1]).join(' L');

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN DENTRO DE LA TARJETA DEL USUARIO
  // =========================================================================
  const [activeView, setActiveView] = useState<
    'main' | 'hub' | 'editar_perfil' | 'info_perfil' | 'evidencias' | 'logros' | 'onboarding' | 'pacto' | 'mapa_renacimiento' | 'metodo' | 'video_activacion' | 'notificaciones'
  >('main');
  /* Segunda puerta a Administracion, ademas de la de Hoy. Dos entradas y ningun sexto tab: el
     administrador llega desde donde este, y los cinco tabs quedan como estaban (SDD 003, ARF-01). */
  const { capacidades } = useCapacidades();
  const [enAdministracion, setEnAdministracion] = useState(false);
  const [metodoFase, setMetodoFase] = useState(0);
  const metodoAnim = useRef(new Animated.Value(1)).current;

  const cambiarMetodoFase = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(METODO_FASES.length - 1, next));
    if (clamped === metodoFase) return;

    Animated.sequence([
      Animated.timing(metodoAnim, {
        toValue: 0,
        duration: 130,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(metodoAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
    setMetodoFase(clamped);
  }, [metodoAnim, metodoFase]);

  // Formulario Editar Perfil
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const profilePhone = '';
  const [profileDepartment, setProfileDepartment] = useState(user?.department ?? '');
  const [profileBio, setProfileBio] = useState(user?.bio ?? '');
  const profileInstagram = '';
  const [profileAvatar, setProfileAvatar] = useState<string | null>(user?.avatarUrl ?? null);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);

  useEffect(() => {
    setProfileName(user?.name ?? '');
    setProfileEmail(user?.email ?? '');
    setProfileDepartment(user?.department ?? '');
    setProfileBio(user?.bio ?? '');
    setProfileAvatar(user?.avatarUrl ?? null);
  }, [user?.avatarUrl, user?.bio, user?.department, user?.email, user?.name]);

  useEffect(() => {
    void refrescarPerfil().catch(() => undefined);
  }, [refrescarPerfil]);

  const profileInitials = inicialesDe(profileName);

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
    // Con el Mapa de Renacimiento abierto manda SU handler (registrado después): tiene que poder
    // retroceder paso por paso, no salir de la etapa entera de un toque.
  }, activeView !== 'main' && activeView !== 'mapa_renacimiento');

  /**
   * Etapa 2 del onboarding (Mapa de Renacimiento). Se devuelve ANTES del
   * `SafeAreaView` de esta pantalla porque la pantalla trae el suyo propio: anidarlos duplicaría
   * los márgenes de seguridad del sistema.
   */
  if (activeView === 'mapa_renacimiento') {
    return user ? (
      <MapaRenacimientoFlow
        userId={user.id}
        onSalir={() => setActiveView('onboarding')}
      />
    ) : null;
  }

  if (enAdministracion && capacidades.administrar) {
    return <AdminScreen onSalir={() => setEnAdministracion(false)} />;
  }


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="YO" right="dots" />

      {/* ========================================================================= */}
      {/* 1. PANTALLA PRINCIPAL "YO" (DISEÑO ORIGINAL 100% INTACTO)                 */}
      {/* ========================================================================= */}
      {activeView === 'main' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          {/* User Card Interactiva (Al dar clic abre el Centro de Perfil y Ajustes) */}
          <Pressable
            onPress={() => setActiveView('hub')}
            style={[styles.userCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
          >
            <View style={[styles.avatar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.avatarImage} accessibilityLabel="Foto de perfil" />
              ) : (
                <Text style={styles.avatarInitials}>{profileInitials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>{profileName}</Text>
              <Text style={[t.small, { color: c.micro, marginTop: 2 }]}>{profileEmail}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13, color: c.goldInk }}>⚙️</Text>
              <Icon name="chevron" size={12} color={c.chevron} />
            </View>
          </Pressable>

          {/* TU EVOLUCIÓN */}
          <View style={{ paddingTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[t.micro, { color: c.textSoft }]}>TU EVOLUCIÓN</Text>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                {rotuloDeFase(resumen?.fase)?.toUpperCase() || 'PROGRAMA ACTIVO'}
              </Text>
            </View>
            <Text style={[t.micro, { color: c.micro, marginTop: 4 }]}>
              DÍA {resumen?.diaPrograma ?? 1} DE {DIAS_DEL_PROGRAMA}
            </Text>
            <Svg width="100%" height={78} viewBox="0 0 320 78" style={{ marginTop: 10 }}>
              <Path d={evoPath} stroke={c.gold} strokeWidth={1.5} strokeLinecap="round" fill="none" />
              {EVOLUCION.map(([x, y]) => <Circle key={x} cx={x} cy={y} r={2.8} fill={c.gold} />)}
            </Svg>
          </View>

          {/* STATS REALES CALCULADOS POR EL BACKEND */}
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12 }}>
            {/* Coherencia */}
            <View style={[styles.stat, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
              <Text style={[t.micro, { color: c.goldInk, fontSize: 10, fontFamily: 'Jost_700Bold' }]}>COHERENCIA</Text>
              <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 24, color: c.goldInk, marginTop: 6 }}>
                {Math.round(resumen?.coherencia ?? 100)}<Text style={{ fontSize: 12, color: c.goldInk }}>%</Text>
              </Text>
            </View>

            {/* Puntos Liga */}
            <View style={[styles.stat, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Text style={[t.micro, { color: c.micro, fontSize: 10, fontFamily: 'Jost_700Bold' }]}>PUNTOS LIGA</Text>
              <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 24, color: c.textStrong, marginTop: 6 }}>
                {resumen?.puntosLiga ?? 100}
              </Text>
            </View>

            {/* Racha */}
            <View style={[styles.stat, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Text style={[t.micro, { color: c.micro, fontSize: 10, fontFamily: 'Jost_700Bold' }]}>RACHA DÍAS</Text>
              <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 24, color: c.textStrong, marginTop: 6 }}>
                {resumen?.rachaActual ?? 0}<Text style={{ fontSize: 12, color: c.micro }}>d</Text>
              </Text>
            </View>
          </View>

          {/* EVIDENCIA */}
          <View style={{ paddingTop: 16 }}>
            <MicroLabel>EVIDENCIA</MicroLabel>
            {/* Antes: tres cajas "FOTO" fijas y un "+6" escrito a mano, que daban a entender
                nueve evidencias a cualquiera. Ahora sale del mismo listado real que la
                sub-pantalla, y cuando no hay ninguna se dice, no se rellena. */}
            {cargandoEvidencias ? (
              <Text style={[t.small, { color: c.textSoft, fontSize: 12.5, marginTop: 10 }]}>
                Cargando tus evidencias…
              </Text>
            ) : evidencias.length === 0 ? (
              <Pressable
                onPress={() => setActiveView('evidencias')}
                accessibilityRole="button"
                accessibilityLabel="Ver tus evidencias"
                style={[styles.rowCard, { borderColor: c.border, backgroundColor: c.cardBg, marginTop: 10 }]}
              >
                <Icon name="camera" size={18} color={c.chevron} />
                <Text style={[t.small, { color: c.textSoft, fontSize: 12.5, flex: 1 }]}>
                  {errorEvidencias ? 'No se pudieron cargar tus evidencias.' : 'Todavía no subiste evidencias.'}
                </Text>
                <Icon name="chevron" size={12} color={c.chevron} />
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}>
                {evidencias.slice(0, 3).map(ev => (
                  <Pressable
                    key={ev.id}
                    onPress={() => setActiveView('evidencias')}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver evidencia del ${fechaDeEvidencia(ev.subidaEn ?? ev.timestampExif)}`}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={[
                        styles.more,
                        { height: moreSize, borderRadius: 10, borderColor: c.border, backgroundColor: c.cardBg },
                      ]}
                    >
                      <Icon name={iconoDeTipo(ev.tipo)} size={18} color={c.goldInk} />
                    </View>
                  </Pressable>
                ))}
                {evidencias.length > 3 && (
                  <Pressable
                    onPress={() => setActiveView('evidencias')}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver las otras ${evidencias.length - 3} evidencias`}
                    style={[styles.more, { width: moreSize, height: moreSize, borderColor: c.border, backgroundColor: c.cardBg }]}
                  >
                    <Text style={[t.small, { color: c.textSoft }]}>+{evidencias.length - 3}</Text>
                  </Pressable>
                )}
              </View>
            )}
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

          {/* ADMINISTRACIÓN — solo si el servidor dice que esta cuenta puede */}
          {capacidades.administrar ? (
            <Pressable
              onPress={() => setEnAdministracion(true)}
              accessibilityRole="button"
              accessibilityLabel="Abrir Administración"
              style={[styles.rowCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
            >
              <View style={{ flex: 1 }}>
                <MicroLabel>ADMINISTRACIÓN</MicroLabel>
                <Text style={[t.body, { color: c.text, marginTop: 6 }]}>
                  Grupos, personas y solicitudes
                </Text>
              </View>
              <Icon name="chevron" size={12} color={c.chevron} />
            </Pressable>
          ) : null}

          {/* BOTÓN: MI FICHA INICIAL & PACTO */}
          <Pressable
            onPress={() => setActiveView('onboarding')}
            style={[styles.onboardingBtn, { borderColor: c.borderStrong, backgroundColor: c.cardBg }]}
          >
            <Icon name="doc" size={16} color={c.goldInk} />
            <Text style={[t.micro, { color: c.textStrong, letterSpacing: 1.6, fontFamily: 'Jost_500Medium' }]}>
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
      {/* 2. CENTRO DE PERFIL ORGANIZADO EN 4 FASES/CAJONES EJECUTIVOS              */}
      {/* ========================================================================= */}
      {activeView === 'hub' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('main')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A MI ESPACIO
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                PERFIL & AJUSTES
              </Text>
            </View>
          </View>

          {/* Banner de Usuario */}
          <View style={[styles.profileBanner, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <View style={[styles.avatarLg, { borderColor: c.gold, backgroundColor: '#292215' }]}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.avatarImageLarge} accessibilityLabel="Foto de perfil" />
              ) : (
                <Text style={{ color: '#E5C689', fontSize: 18, fontFamily: 'Jost_700Bold' }}>{profileInitials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15 }]}>{profileName}</Text>
              <Text style={[t.micro, { color: c.goldInk, fontSize: 11 }]}>{profileEmail}</Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11, marginTop: 2 }]}>
                Día {resumen?.diaPrograma ?? 1} · {rotuloDeFase(resumen?.fase) ?? 'Alumno Activo'}
              </Text>
            </View>
          </View>

          <View style={{ gap: 14, marginTop: 14, paddingBottom: 28 }}>
            {/* FASE 1: DATOS PERSONALES & PERFIL */}
            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                FASE 1: DATOS PERSONALES & PERFIL
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('editar_perfil')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="user" size={16} color={c.goldInk} />
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Editar Perfil</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>Nombre, foto, teléfono y contraseña</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('info_perfil')}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="doc" size={16} color={c.goldInk} />
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Información de Perfil</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>Ubicación, redes y biografía somática</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>
              </View>
            </View>

            {/* FASE 2: HISTORIAL, EVIDENCIAS & ONBOARDING */}
            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                FASE 2: HISTORIAL, EVIDENCIAS & ONBOARDING
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('onboarding')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="stack" size={16} color={c.goldInk} />
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Mi Onboarding (5 Etapas)</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>El Pacto firmado, cuestionario y las 90 variables</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('evidencias')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="camera" size={16} color={c.goldInk} />
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Registro de Evidencias</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>37 fotos subidas y verificadas por tu mentor</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('logros')}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="award" size={16} color={c.goldInk} />
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Logros e Insignias</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>Medallas y trofeos de tus 90 días</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>
              </View>
            </View>

            {/* FASE 3: HERRAMIENTAS SOMÁTICAS */}
            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                FASE 3: HERRAMIENTAS SOMÁTICAS
              </Text>
              {/* Decisión del cliente (2026-09-04): "Espejo de la Sombra" (catarsis privada +
                  informe semanal con IA) YA NO VA. Se quitaron la entrada del menú y su sub-vista
                  completa, más el estado `catarsisText` y el valor 'espejo' de `activeView`, que
                  quedaban sin uso. El módulo `rag` del backend (InformeEspejoSombra) NO se tocó:
                  esto es solo el acceso desde la app. Recuperable del historial de git si vuelve. */}
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => {
                    setMetodoFase(0);
                    metodoAnim.setValue(1);
                    setActiveView('metodo');
                  }}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="spark" size={16} color={c.goldInk} />
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>El Método Renaser</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>3 fases para comprenderte y sostener tu transformación</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('video_activacion')}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="play" size={16} color={c.goldInk} />
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Repetir Activación Inicial</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>Video de bienvenida y manifiesto de Macaco</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>
              </View>
            </View>

            {/* FASE 4: PREFERENCIAS & SISTEMA */}
            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                FASE 4: PREFERENCIAS & SISTEMA
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('notificaciones')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="bell" size={16} color={c.goldInk} />
                    <View>
                      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Notificaciones & Alarmas</Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>Recordatorio 05:00 AM y célula</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                <Pressable
                  onPress={logout}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="logout" size={16} color={c.goldInk} />
                    <Text style={[t.cardTitle, { color: c.danger, fontSize: 13 }]}>Cerrar Sesión</Text>
                  </View>
                  <Icon name="chevron" size={12} color="#E06A66" />
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-VISTA: 🎙️ MI ONBOARDING (2 ETAPAS)                                */}
      {/* ========================================================================= */}
      {activeView === 'onboarding' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                MI ONBOARDING
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={[t.sectionTitle, { color: c.textStrong, fontSize: 18 }]}>Tu proceso completo</Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 }]}>
              Dos etapas para poner por escrito quién eras, quién eres y en quién te estás convirtiendo. Cada etapa se guarda al terminarla.
            </Text>
          </View>

          {/*
            Acá vivía el banner "Tu ventana de 24 horas está abierta · Te quedan 1 h 18 min —
            cierra a las 6:00 pm". Retirado el 2026-09-05 a pedido del dueño: no había ningún
            reloj detrás. Era texto fijo — decía "1 h 18 min" a cualquier hora del día, para
            siempre, y anunciaba un cierre que nunca ocurría. Vuelve cuando esté definido qué es
            esa ventana y el backend pueda decir cuándo abre y cuándo cierra de verdad.
          */}

          {/* Barra de Progreso */}
          <View style={{ gap: 4, marginTop: 12 }}>
            <View style={[styles.progressBarBg, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              {/* El ancho sale del conteo real. Estaba fijo en 60%, así que la barra decía una
                  cosa y el texto de abajo otra apenas el conteo dejara de ser tres. */}
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.round((etapasOnboarding.completadas / ONBOARDING_STAGES.length) * 100)}%`,
                    backgroundColor: c.gold,
                  },
                ]}
              />
            </View>
            <Text style={[t.micro, { color: c.textSoft, textAlign: 'center', fontSize: 10 }]}>
              {etapasOnboarding.completadas} de {ONBOARDING_STAGES.length} etapas completadas
            </Text>
          </View>

          {/* 2 Etapas */}
          <View style={{ gap: 8, marginTop: 12, paddingBottom: 28 }}>
            {ONBOARDING_STAGES.map(stage => {
              // El estado de cada etapa sale de datos reales, no del array: `pactSignedAt` para
              // el Pacto y `stageCompleted` para el Mapa. La etapa 2 leia el estado del
              // Cuestionario Profundo, que es otro flujo — por eso quien ya habia terminado su
              // mapa seguia viendo "1 de 2 etapas completadas".
              const estado =
                stage.id === 'st1' ? etapasOnboarding.pacto
                : stage.id === 'st2' ? etapasOnboarding.mapaRenacimiento
                : 'pendiente';
              const completada = estado === 'completada';
              const enProgreso = estado === 'en_progreso';
              const descripcion = completada
                ? 'Completada · toca para revisar'
                : enProgreso
                ? 'Empezada · toca para continuar'
                : stage.descPendiente;

              return (
              <Pressable
                key={stage.id}
                onPress={() => {
                  if (stage.id === 'st1') {
                    setActiveView('pacto');
                  } else {
                    // Etapa 2 — el Mapa de Renacimiento contiene el formulario completo y
                    // reanuda automáticamente desde el paso donde la persona quedó.
                    setActiveView('mapa_renacimiento');
                  }
                }}
                style={[
                  styles.stageCard,
                  {
                    borderColor: enProgreso ? c.gold : c.border,
                    backgroundColor: enProgreso ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={[
                      styles.stageCheckCircle,
                      {
                        backgroundColor: completada ? '#173429' : enProgreso ? c.gold : '#2A2620',
                      },
                    ]}
                  >
                    {completada ? (
                      <Text style={{ color: c.success, fontFamily: 'Jost_700Bold', fontSize: 11 }}>✓</Text>
                    ) : (
                      <Text
                        style={{
                          color: enProgreso ? '#1E1B18' : '#888',
                          fontFamily: enProgreso ? 'Jost_700Bold' : 'Jost_400Regular',
                          fontSize: 11,
                        }}
                      >
                        {stage.num}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.cardTitle, { color: enProgreso ? c.goldInk : c.textStrong, fontSize: 13 }]}>
                      {stage.title}
                    </Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
                      {descripcion}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron" size={12} color={enProgreso ? c.goldInk : c.textSoft} />
              </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-VISTA: 📜 EL PACTO DE RENACIMIENTO (CON FIRMA)                     */}
      {/* ========================================================================= */}
      {activeView === 'pacto' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('onboarding')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A ETAPAS
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                PARTE 01
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <View style={[styles.iconShieldCircle, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Icon name="doc" size={20} color={c.goldInk} />
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
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.goldInk, fontSize: 14, fontStyle: 'italic' }}>
                Pacto de Renacimiento
              </Text>
              <Text style={[t.micro, { color: c.textSoft, letterSpacing: 2, fontSize: 10.5 }]}>
                — ACTO FUNDACIONAL —
              </Text>
            </View>

            <Text style={[t.body, { color: c.text, fontSize: 11, lineHeight: 17 }]}>
              Yo, <Text style={{ color: c.goldInk, fontFamily: 'Jost_700Bold' }}>{profileName}</Text>, en pleno uso de mi consciencia, declaro este pacto conmigo mismo en presencia del sistema RENASER y de la versión más alta de mí.
            </Text>

            <Text style={[t.body, { color: c.text, fontSize: 11, lineHeight: 17 }]}>
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.textStrong }}>Renuncio a la mediocridad.</Text> Renuncio al desdén con que he tratado mi cuerpo, mi mente, mis emociones y mi tiempo.
            </Text>

            <View style={{ gap: 4, marginVertical: 4 }}>
              {PACTO_CLAUSULAS.map(clause => (
                <Text key={clause} style={[t.body, { color: c.textSoft, fontSize: 10.5, lineHeight: 15 }]}>
                  {clause}
                </Text>
              ))}
            </View>

            <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 10.5, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 8 }]}>
              Si lo cumplo, gano una identidad nueva. Si lo abandono, pierdo la versión de mí que ya estaba esperando del otro lado.
            </Text>
          </View>

          {/* Firma Digital con el Dedo */}
          <View style={[styles.signatureBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Text style={{ fontFamily: 'Jost_700Bold', color: c.goldInk, fontSize: 12, fontStyle: 'italic' }}>
              — Firma con tu dedo —
            </Text>
            <View style={[styles.signatureCanvas, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.goldInk, fontSize: 22, fontStyle: 'italic' }}>
                {profileName}
              </Text>
              <Text style={[t.micro, { color: c.textSoft, position: 'absolute', bottom: 4, fontSize: 10.5 }]}>
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
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                EVIDENCIAS
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <View>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>Tus Evidencias Somáticas</Text>
              {/* Decia "37 fotos subidas · 100% verificadas", escrito a mano, a cualquiera. */}
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>
                {cargandoEvidencias
                  ? 'Cargando tus evidencias…'
                  : errorEvidencias
                    ? 'No se pudo cargar el conteo'
                    : evidencias.length === 0
                      ? 'Todavía no subiste ninguna'
                      : `${evidencias.length} ${evidencias.length === 1 ? 'evidencia' : 'evidencias'} · ${verificadasEvidencias} verificada${verificadasEvidencias === 1 ? '' : 's'}`}
              </Text>
            </View>
            <Pressable
              onPress={() => Alert.alert('Subir Evidencia', 'Abriendo selector de cámara para subir evidencia fotográfica...')}
              style={[styles.createHabitBtn, { backgroundColor: c.gold }]}
            >
              <Text style={{ color: '#1E1B18', fontFamily: 'Jost_700Bold', fontSize: 10.5 }}>+ Subir Foto</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingBottom: 28 }}>
            {evidencias.map(ev => {
              const validada = ev.estadoValidacion === ESTADO_EVIDENCIA.VALIDA;
              const rechazada = ev.estadoValidacion === ESTADO_EVIDENCIA.RECHAZADA
                || ev.estadoValidacion === ESTADO_EVIDENCIA.ANULADA_ADMIN;
              const colorEstado = validada ? c.success : rechazada ? c.danger : c.goldInk;
              return (
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
                    <Icon name={iconoDeTipo(ev.tipo)} size={26} color={c.goldInk} />
                  </View>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 12, marginTop: 4 }]} numberOfLines={2}>
                    {ev.contenidoTexto?.trim() || ETIQUETA_TIPO_EVIDENCIA[ev.tipo] || 'Evidencia'}
                  </Text>
                  <Text style={[t.micro, { color: c.goldInk, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
                    {fechaDeEvidencia(ev.subidaEn ?? ev.timestampExif)}
                  </Text>
                  <View
                    style={[
                      styles.tagPill,
                      { borderColor: colorEstado, marginTop: 6, alignSelf: 'flex-start' },
                    ]}
                  >
                    <Text style={[t.micro, { color: colorEstado, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}>
                      {ETIQUETA_ESTADO_EVIDENCIA[ev.estadoValidacion] ?? ev.estadoValidacion}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Los tres estados se dicen distinto porque no significan lo mismo: todavia no se
                sabe, no se pudo preguntar, o se pregunto y no hay ninguna. */}
            {cargandoEvidencias && (
              <Text style={[t.body, { color: c.textSoft, fontSize: 13, width: '100%', paddingVertical: 20, textAlign: 'center' }]}>
                Cargando tus evidencias…
              </Text>
            )}
            {!cargandoEvidencias && errorEvidencias && (
              <View style={{ width: '100%', paddingVertical: 20, alignItems: 'center', gap: 10 }}>
                <Text style={[t.body, { color: c.danger, fontSize: 13, textAlign: 'center' }]}>
                  {errorEvidencias}
                </Text>
                <GoldButton label="REINTENTAR" variant="outline" onPress={recargarEvidencias} />
              </View>
            )}
            {!cargandoEvidencias && !errorEvidencias && evidencias.length === 0 && (
              <View style={{ width: '100%', paddingVertical: 24, alignItems: 'center', gap: 6 }}>
                <Icon name="camera" size={26} color={c.chevron} />
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14, marginTop: 4 }]}>
                  Todavía no subiste evidencias
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, textAlign: 'center' }]}>
                  Cada foto que selles queda aquí, con la fecha y su estado de validación.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 6. SUB-VISTA: 🎖️ LOGROS E INSIGNIAS                                       */}
      {/* ========================================================================= */}
      {activeView === 'logros' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                LOGROS
              </Text>
            </View>
          </View>

          <View style={{ gap: 10, marginTop: 14, paddingBottom: 28 }}>
            {/* Sin endpoint de logros no se puede decir cuales estan conseguidos, asi que no se
                marca ninguno: se listan como metas del programa. */}
            <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginBottom: 4 }]}>
              Estas son las metas del programa. Tu avance aparecerá aquí cuando el registro de
              logros esté disponible.
            </Text>
            {LOGROS_DEL_PROGRAMA.map(logro => (
              <View
                key={logro.id}
                style={[styles.logroCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <View style={[styles.logroIconCircle, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Icon name={logro.icon} size={20} color={c.goldInk} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 12.5 }]}>
                    {logro.title}
                  </Text>
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
      {/* 8. SUB-VISTA: 👤 EDITAR PERFIL                                            */}
      {/* ========================================================================= */}
      {activeView === 'editar_perfil' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                EDITAR PERFIL
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 14 }}>
            <View style={[styles.avatarLg, { borderColor: c.gold, backgroundColor: '#292215', width: 70, height: 70, borderRadius: 35 }]}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.avatarImageLarge} accessibilityLabel="Foto de perfil" />
              ) : (
                <Text style={{ color: '#E5C689', fontSize: 24, fontFamily: 'Jost_700Bold' }}>{profileInitials}</Text>
              )}
            </View>
            <Pressable
              disabled={subiendoAvatar}
              onPress={async () => {
                const archivo = await elegirFotoDeGaleria();
                if (!archivo) return;
                setSubiendoAvatar(true);
                try {
                  const subida = await authApi.solicitarUrlAvatar(archivo.mimeType);
                  await authApi.subirAvatarAS3(subida.url, archivo.uri, archivo.mimeType);
                  await authApi.confirmarAvatar(subida.bucket, subida.ruta);
                  await refrescarPerfil();
                  Alert.alert('Foto actualizada', 'Tu foto de perfil ya está guardada en tu cuenta.');
                } catch (error) {
                  Alert.alert('No se pudo actualizar la foto', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
                } finally {
                  setSubiendoAvatar(false);
                }
              }}
              style={{ marginTop: 6 }}
            >
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>{subiendoAvatar ? 'Subiendo…' : 'Cambiar Foto 📷'}</Text>
            </Pressable>
          </View>

          <View style={{ gap: 12, marginTop: 14 }}>
            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>NOMBRE COMPLETO:</Text>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>CORREO ELECTRÓNICO:</Text>
              <TextInput
                value={profileEmail}
                keyboardType="email-address"
                editable={false}
                placeholder="Correo de la cuenta"
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>TELÉFONO / WHATSAPP:</Text>
              <TextInput
                value={profilePhone}
                keyboardType="phone-pad"
                editable={false}
                placeholder="No registrado en tu cuenta"
                placeholderTextColor={c.micro}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
              <Text style={[t.micro, { color: c.micro, fontSize: 10 }]}>El teléfono se habilitará cuando exista en el perfil del servidor.</Text>
            </View>
          </View>

          <GoldButton
            label={guardandoPerfil ? 'GUARDANDO…' : '✓ GUARDAR CAMBIOS'}
            onPress={async () => {
              if (!profileName.trim()) {
                Alert.alert('Falta tu nombre', 'Escribe tu nombre completo para guardar el perfil.');
                return;
              }
              setGuardandoPerfil(true);
              try {
                await actualizarPerfil({
                  fullName: profileName,
                  avatarUrl: profileAvatar,
                  bio: profileBio,
                  department: profileDepartment,
                });
                Alert.alert('Perfil guardado', 'Tus datos reales ya están actualizados en tu cuenta.');
                setActiveView('hub');
              } catch (error) {
                Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
              } finally {
                setGuardandoPerfil(false);
              }
            }}
            disabled={guardandoPerfil}
            style={{ width: '100%', marginTop: 16, marginBottom: 28 }}
          />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 9. SUB-VISTA: 🪪 INFORMACIÓN DE PERFIL                                     */}
      {/* ========================================================================= */}
      {activeView === 'info_perfil' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                INFORMACIÓN
              </Text>
            </View>
          </View>

          <View style={{ gap: 12, marginTop: 14 }}>
            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>BIOGRAFÍA SOMÁTICA:</Text>
              <TextInput
                value={profileBio}
                onChangeText={setProfileBio}
                multiline
                style={[styles.modalInputText, { minHeight: 70, borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>DEPARTAMENTO / ÁREA:</Text>
              <TextInput
                value={profileDepartment}
                onChangeText={setProfileDepartment}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>INSTAGRAM:</Text>
              <TextInput
                value={profileInstagram}
                editable={false}
                placeholder="No registrado en tu cuenta"
                placeholderTextColor={c.micro}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
              <Text style={[t.micro, { color: c.micro, fontSize: 10 }]}>Instagram se habilitará cuando exista en el perfil del servidor.</Text>
            </View>
          </View>

          <GoldButton
            label={guardandoPerfil ? 'GUARDANDO…' : '✓ GUARDAR INFORMACIÓN'}
            onPress={async () => {
              setGuardandoPerfil(true);
              try {
                await actualizarPerfil({
                  fullName: profileName,
                  avatarUrl: profileAvatar,
                  bio: profileBio,
                  department: profileDepartment,
                });
                Alert.alert('Información guardada', 'Tu biografía y departamento ya están actualizados en tu cuenta.');
                setActiveView('hub');
              } catch (error) {
                Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
              } finally {
                setGuardandoPerfil(false);
              }
            }}
            disabled={guardandoPerfil}
            style={{ width: '100%', marginTop: 16, marginBottom: 28 }}
          />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 10. SUB-VISTA: ✨ EL MÉTODO RENASER                                       */}
      {/* ========================================================================= */}
      {activeView === 'metodo' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                EL MÉTODO
              </Text>
            </View>
          </View>

          {(() => {
            const fase = METODO_FASES[metodoFase];
            const rotateY = metodoAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['-8deg', '0deg'],
            });
            const scale = metodoAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.96, 1],
            });
            const opacity = metodoAnim.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0.25, 0.9, 1],
            });

            return (
              <View style={styles.metodoContent}>
                <View style={styles.metodoHero}>
                  <View style={[styles.metodoOrb, { borderColor: fase.color, backgroundColor: c.cardBgAlt }]}>
                    <Icon name="spark" size={24} color={fase.color} />
                  </View>
                  <Text style={[t.sectionTitle, styles.metodoHeroTitle, { color: c.textStrong }]}>El Método Renaser</Text>
                  <Text style={[t.body, styles.metodoHeroSubtitle, { color: c.textSoft }]}>3 fases para comprenderte, transformarte y sostener tu evolución.</Text>
                </View>

                <Animated.View
                  style={[
                    styles.metodoPhaseCard,
                    {
                      borderColor: fase.color,
                      backgroundColor: c.cardBg,
                      opacity,
                      transform: [{ perspective: 900 }, { rotateY }, { scale }],
                    },
                  ]}
                >
                  <View style={styles.metodoPhaseHeader}>
                    <View style={[styles.metodoPhaseIcon, { borderColor: fase.color, backgroundColor: c.cardBgAlt }]}>
                      <Icon name={fase.icon} size={23} color={fase.color} />
                    </View>
                    <View style={styles.metodoPhaseHeading}>
                      <Text style={[t.micro, { color: fase.color, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>{fase.phase}</Text>
                      <Text style={[t.cardTitle, styles.metodoPhaseTitle, { color: c.textStrong }]}>{fase.title}</Text>
                    </View>
                  </View>

                  <Text style={[styles.metodoQuote, { color: fase.color }]}>{`“${fase.quote}”`}</Text>
                  <Text style={[t.body, styles.metodoSummary, { color: c.textSoft }]}>{fase.summary}</Text>

                  <View style={styles.metodoBullets}>
                    {fase.bullets.map((bullet) => (
                      <View key={bullet} style={styles.metodoBulletRow}>
                        <View style={[styles.metodoBulletDot, { backgroundColor: fase.color }]} />
                        <Text style={[t.body, styles.metodoBulletText, { color: c.textSoft }]}>{bullet}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={[styles.metodoProgressTrack, { backgroundColor: c.divider }]}>
                    <View style={[styles.metodoProgressFill, { width: `${((metodoFase + 1) / METODO_FASES.length) * 100}%`, backgroundColor: fase.color }]} />
                  </View>
                  <Text style={[t.micro, styles.metodoProgressLabel, { color: c.micro }]}>FASE {metodoFase + 1} DE {METODO_FASES.length}</Text>
                </Animated.View>

                <View style={styles.metodoNav}>
                  <Pressable
                    accessibilityLabel="Ver fase anterior"
                    disabled={metodoFase === 0}
                    onPress={() => cambiarMetodoFase(metodoFase - 1)}
                    style={[styles.metodoNavButton, { borderColor: c.border, backgroundColor: c.cardBg }, metodoFase === 0 && styles.metodoNavButtonDisabled]}
                  >
                    <View style={{ transform: [{ rotate: '180deg' }] }}>
                      <Icon name="chevron" size={18} color={metodoFase === 0 ? c.micro : c.goldInk} />
                    </View>
                  </Pressable>

                  <View style={styles.metodoDots}>
                    {METODO_FASES.map((item, index) => (
                      <Pressable
                        key={item.phase}
                        accessibilityLabel={`Ir a ${item.phase.toLowerCase()}`}
                        onPress={() => cambiarMetodoFase(index)}
                        style={[styles.metodoDot, { backgroundColor: index === metodoFase ? item.color : c.divider }, index === metodoFase && styles.metodoDotActive]}
                      />
                    ))}
                  </View>

                  <Pressable
                    accessibilityLabel="Ver fase siguiente"
                    disabled={metodoFase === METODO_FASES.length - 1}
                    onPress={() => cambiarMetodoFase(metodoFase + 1)}
                    style={[styles.metodoNavButton, { borderColor: c.gold, backgroundColor: c.cardBgAlt }, metodoFase === METODO_FASES.length - 1 && styles.metodoNavButtonDisabled]}
                  >
                    <Icon name="chevron" size={18} color={metodoFase === METODO_FASES.length - 1 ? c.micro : c.goldInk} />
                  </Pressable>
                </View>

                <Pressable
                  disabled={metodoFase === METODO_FASES.length - 1}
                  onPress={() => cambiarMetodoFase(metodoFase + 1)}
                  style={[styles.metodoNextButton, { borderColor: fase.color, backgroundColor: c.cardBgAlt }, metodoFase === METODO_FASES.length - 1 && styles.metodoNextButtonDisabled]}
                >
                  <Text style={[t.cardTitle, { color: metodoFase === METODO_FASES.length - 1 ? c.micro : fase.color, fontSize: 13 }]}>
                    {metodoFase === METODO_FASES.length - 1 ? 'Método completo' : 'Explorar siguiente fase'}
                  </Text>
                  {metodoFase < METODO_FASES.length - 1 && <Icon name="arrow" size={16} color={fase.color} />}
                </Pressable>

                <Text style={[t.micro, styles.metodoHint, { color: c.micro }]}>Lee una fase en 20 segundos y vuelve cuando quieras.</Text>
              </View>
            );
          })()}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 11. SUB-VISTA: 🎬 REPETIR ACTIVACIÓN (VIDEO MACACO)                       */}
      {/* ========================================================================= */}
      {activeView === 'video_activacion' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                ACTIVACIÓN
              </Text>
            </View>
          </View>

          <View style={[styles.pactoDocumentCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt, marginTop: 14 }]}>
            <View style={[styles.evidenceImgBox, { height: 160, backgroundColor: '#0C0B09', borderRadius: 14 }]}>
              <Text style={{ fontSize: 44 }}>▶</Text>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', marginTop: 8 }]}>
                Reproducir Manifiesto Macaco (12:45 min)
              </Text>
            </View>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13, marginTop: 6 }]}>
              Bienvenida Oficial al Renacimiento Somático
            </Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 11, lineHeight: 16 }]}>
              "No viniste aquí a probar suerte, viniste a forjar la versión de ti que ya no negocia con la mediocridad."
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 12. SUB-VISTA: 🔔 NOTIFICACIONES                                          */}
      {/* ========================================================================= */}
      {activeView === 'notificaciones' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <View style={[styles.detailTopBar, { borderBottomColor: c.divider }]}>
            <Pressable onPress={() => setActiveView('hub')} style={styles.backBtnRow} hitSlop={8}>
              <Icon name="arrowLeft" size={14} color={c.goldInk} />
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                VOLVER A AJUSTES
              </Text>
            </Pressable>
            <View style={[styles.categoryPillBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                NOTIFICACIONES
              </Text>
            </View>
          </View>

          <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg, marginTop: 14 }]}>
            <View style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>Alarma 05:00 AM</Text>
                <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>Aviso para despertar y luz solar</Text>
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
                <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>Mensajes y victorias de tu tribu</Text>
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
                <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>Alertas 1h antes de cada sesión</Text>
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
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: ESPACIO_PARA_LANZADOR },
  metodoContent: { gap: 14, paddingTop: 16, paddingBottom: 34 },
  metodoHero: { alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  metodoOrb: { width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  metodoHeroTitle: { fontSize: 24, textAlign: 'center' },
  metodoHeroSubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 340 },
  metodoPhaseCard: { borderWidth: 1.5, borderRadius: 22, padding: 18, gap: 13, minHeight: 330 },
  metodoPhaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metodoPhaseIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  metodoPhaseHeading: { flex: 1, gap: 3 },
  metodoPhaseTitle: { fontSize: 19, lineHeight: 24 },
  metodoQuote: { fontSize: 15, lineHeight: 21, fontStyle: 'italic' },
  metodoSummary: { fontSize: 14.5, lineHeight: 21 },
  metodoBullets: { gap: 8, paddingTop: 2 },
  metodoBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  metodoBulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  metodoBulletText: { flex: 1, fontSize: 14, lineHeight: 19 },
  metodoProgressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  metodoProgressFill: { height: '100%', borderRadius: 3 },
  metodoProgressLabel: { fontSize: 10, letterSpacing: 1.2, textAlign: 'right' },
  metodoNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  metodoNavButton: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  metodoNavButtonDisabled: { opacity: 0.4 },
  metodoDots: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  metodoDot: { width: 8, height: 8, borderRadius: 4 },
  metodoDotActive: { width: 24, borderRadius: 5 },
  metodoNextButton: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  metodoNextButtonDisabled: { opacity: 0.65 },
  metodoHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  userCard: { marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarLg: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 22 },
  avatarImageLarge: { width: '100%', height: '100%', borderRadius: 35 },
  avatarInitials: { color: '#E5C689', fontSize: 15, fontFamily: 'Jost_700Bold' },
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
  progressBarBg: { height: 6, borderRadius: 3, borderWidth: 1, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  stageCard: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stageCheckCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconShieldCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pactoDocumentCard: { borderWidth: 1.5, borderRadius: 20, padding: 14, gap: 10, marginTop: 12 },
  signatureBox: { borderWidth: 1, borderRadius: 18, padding: 12, alignItems: 'center', gap: 8, marginTop: 12 },
  signatureCanvas: { width: '100%', height: 80, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
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
