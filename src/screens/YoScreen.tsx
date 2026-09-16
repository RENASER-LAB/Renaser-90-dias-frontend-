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
import { space } from '../theme/tokens';
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
  FASES_EN_ORDEN,
  type ClaveDeFase,
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
  { id: 'l1', title: 'FUNDADOR SOMÁTICO', icon: 'award', desc: 'Completar la Fase 1 — El Espejo: los días 1 al 7 sin fallar.' },
  { id: 'l2', title: 'RACHA DE FUEGO (30 DÍAS)', icon: 'fire', desc: '30 amaneceres consecutivos subiendo evidencia.' },
  { id: 'l3', title: 'MAESTRO DEL FOCO', icon: 'zap', desc: '50 bloques de trabajo profundo en modo avión.' },
  { id: 'l4', title: 'REY SOMÁTICO (90 DÍAS)', icon: 'trophy', desc: 'Graduación oficial del programa: los 90 días.' },
];

/**
 * Lo editorial de cada fase: el ícono, el color, la frase y qué se hace.
 *
 * **El nombre, el número y el rango de días NO están acá a propósito** — salen de
 * `FASES_EN_ORDEN` (`features/home/hooks/useResumenHome`), que es la única definición de fase de
 * la app. Antes esta pantalla tenía su propia lista, con otros nombres y **sólo tres fases**, y
 * por eso terminó contradiciendo a Plan: eran dos listas que nadie obligaba a coincidir. Ahora,
 * si se renombra una fase, esta pantalla se entera sola.
 *
 * El contenido sale de `RENASER, PROGRAMA Y FASES.docx` (objetivo psicológico, enemigo, hábitos y
 * rituales de cada fase), no de una redacción propia: la frase entre comillas es el mensaje de
 * intervención o la pregunta de reflexión que el documento asigna a esa fase.
 */
const CONTENIDO_DEL_METODO: Record<
  ClaveDeFase,
  { icon: IconName; color: string; quote: string; summary: string; bullets: string[] }
> = {
  PHASE_1_REBIRTH: {
    icon: 'eye',
    color: '#90CAF9',
    quote: 'Esta semana no buscas cambiarte. Buscas verte.',
    summary: 'Observar la mente sin intervenir: bajar el ruido mental y el cortisol, y restaurar el sistema dopaminérgico.',
    bullets: [
      'Ayuno intermitente: última comida 6pm, primera 10am',
      'Agua tibia con limón y jugo verde al despertar',
      'Ritual Tierra-Agua-Fuego, tres veces al día',
      'Un día completo de ayuno digital',
    ],
  },
  PHASE_2_DEVELOPMENT: {
    icon: 'diamond',
    color: '#CE93D8',
    quote: 'Reconócelo, corrígelo, continúa. El creador asume, la víctima se culpa.',
    summary: 'Exponer a la víctima interna y despertar al creador: entender la raíz del sabotaje y consolidar el dominio mental.',
    bullets: [
      'Tres ciclos de Intoxicación Consciente y Desintoxicación Absoluta',
      'Mantra: no miedo, no culpa, no vergüenza',
      'Sueño con alarmas y celular en modo concentración',
      '¿De qué me quejé? ¿A quién culpé? ¿Qué patrón se repitió?',
    ],
  },
  PHASE_3_ALCHEMIST_WARRIOR: {
    icon: 'heart',
    color: '#A5D6A7',
    quote: '¿Estoy haciendo esto por obligación o porque amo mi vida?',
    summary: 'Transformar la disciplina exigida en gozo, e iniciar la autoterapia desde el amor.',
    bullets: [
      'Los mismos hábitos, ahora desde la intención',
      'Decretos y mantras: del ayuno, del cierre nocturno, del gozo',
      'Baile y movimiento libre',
      'Domingo sagrado: descanso absoluto, sin culpa',
    ],
  },
  PHASE_4_ASCENSION: {
    icon: 'target',
    color: '#FFE082',
    quote: 'No eres menos capaz. Simplemente te has distraído.',
    summary: 'Producir en cuatro horas lo que otros producen en diez: tres misiones de alto impacto al día.',
    bullets: [
      'Tres bloques profundos de 90 minutos',
      'Protocolo antidistractores: el celular fuera de alcance',
      'Planificación nocturna del día siguiente',
      'Regla 80/20: ¿cuál fue el 20% que generó resultados?',
    ],
  },
};

const METODO_FASES = FASES_EN_ORDEN.map(fase => ({
  phase: `FASE ${fase.numero}`,
  title: fase.nombre,
  rango: fase.rango,
  ...CONTENIDO_DEL_METODO[fase.clave],
}));

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
  '5. No abandonar el grupo ni huir cuando aparezca la incomodidad.',
  '6. Cuidar mi cuerpo como el templo que es.',
  '7. Sanar mis heridas en lugar de defenderlas.',
  '8. Cobrar lo que valgo y dejar de subvalorarme.',
  '9. Decir la verdad aunque tiemble la voz.',
  '10. Llegar al Día 90 transformado, no entretenido.',
];

export default function YoScreen() {
  /* `mode` y `toggle` son los MISMOS que usa el botón de luna/sol de `ScreenHeader`: la fila
     "Modo oscuro" de Preferencias es otra puerta al mismo interruptor, no un mecanismo aparte. */
  const { c, t, mode, toggle } = useTheme();
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
            {/* El disco perdió su contorno dorado — estaba dentro del borde de la tarjeta. Ahora
                la forma la da el lavado dorado, que se ve en claro y en oscuro; el `cardBgAlt`
                que tenía antes es blanco puro y sin la línea habría desaparecido en modo claro. */}
            <View style={[styles.avatar, { backgroundColor: c.goldWash }]}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.avatarImage} accessibilityLabel="Foto de perfil" />
              ) : (
                <Text style={[styles.avatarInitials, { color: c.goldInk }]}>{profileInitials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>{profileName}</Text>
              <Text style={[t.small, { color: c.micro, marginTop: 3 }]}>{profileEmail}</Text>
            </View>
            {/* Sobraba un emoji de engranaje al lado del chevron: dos señales para decir lo
                mismo, y la de la izquierda no es parte de la paleta. Queda el chevron. */}
            <Icon name="chevron" size={12} color={c.chevron} />
          </Pressable>

          {/* TU EVOLUCIÓN */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[t.micro, { color: c.textSoft }]}>TU EVOLUCIÓN</Text>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                {rotuloDeFase(resumen?.fase)?.toUpperCase() || 'PROGRAMA ACTIVO'}
              </Text>
            </View>
            {/* Mismo tratamiento que en Hoy: el día del programa es el dato del bloque, no una
                micro-etiqueta. A 10.5 px competía con el rótulo de arriba; a 15 con cifras
                tabulares se lee y no se corre de lugar al pasar del día 9 al 10. */}
            <Text style={[t.cardTitle, styles.cifras, { color: c.textStrong, fontSize: 15, marginTop: 4 }]}>
              DÍA {resumen?.diaPrograma ?? 1} DE {DIAS_DEL_PROGRAMA}
            </Text>
            <Svg width="100%" height={78} viewBox="0 0 320 78" style={{ marginTop: 14 }}>
              <Path d={evoPath} stroke={c.gold} strokeWidth={1.5} strokeLinecap="round" fill="none" />
              {EVOLUCION.map(([x, y]) => <Circle key={x} cx={x} cy={y} r={2.8} fill={c.gold} />)}
            </Svg>
          </View>

          {/* STATS REALES CALCULADOS POR EL BACKEND
              Eran tres cajas con borde y fondo, una dorada y dos grises sin motivo. Ahora son tres
              columnas de texto sobre el fondo de la pantalla, separadas por líneas de pelo — el
              mismo tratamiento que recibieron las métricas de Hoy, para que las dos pestañas
              muestren los mismos números de la misma forma. Las cifras pasan a `t.metric`, que
              trae ancho de dígito fijo: antes, al subir de 99 a 100 puntos, la columna se corría. */}
          <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: space.gap }}>
            {/* Coherencia */}
            <View style={styles.statBloque}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>COHERENCIA</Text>
              <View style={styles.statCifra}>
                <Text style={[t.metric, { color: c.goldInk }]}>
                  {/* Sin acciones planificadas no hay coherencia: un guion, no un 100 (D-128). */}
                  {resumen?.coherencia == null ? '—' : Math.round(resumen.coherencia)}
                </Text>
                <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 15, color: c.goldInk }}>%</Text>
              </View>
            </View>

            <View style={[styles.statSeparador, { backgroundColor: c.divider }]} />

            {/* Puntos Liga */}
            <View style={styles.statBloque}>
              <Text style={[t.micro, { color: c.micro, fontFamily: 'Jost_700Bold' }]}>PUNTOS LIGA</Text>
              <View style={styles.statCifra}>
                <Text style={[t.metric, { color: c.textStrong }]}>{resumen?.puntosLiga ?? 100}</Text>
              </View>
            </View>

            <View style={[styles.statSeparador, { backgroundColor: c.divider }]} />

            {/* Racha */}
            <View style={styles.statBloque}>
              <Text style={[t.micro, { color: c.micro, fontFamily: 'Jost_700Bold' }]}>RACHA DÍAS</Text>
              <View style={styles.statCifra}>
                <Text style={[t.metric, { color: c.textStrong }]}>{resumen?.rachaActual ?? 0}</Text>
                <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 15, color: c.micro }}>d</Text>
              </View>
            </View>
          </View>

          {/* EVIDENCIA */}
          <View>
            <MicroLabel>Evidencia</MicroLabel>
            {/* Antes: tres cajas "FOTO" fijas y un "+6" escrito a mano, que daban a entender
                nueve evidencias a cualquiera. Ahora sale del mismo listado real que la
                sub-pantalla, y cuando no hay ninguna se dice, no se rellena. */}
            {cargandoEvidencias ? (
              <Text style={[t.body, { color: c.textSoft, marginTop: 12 }]}>
                Cargando tus evidencias…
              </Text>
            ) : evidencias.length === 0 ? (
              <Pressable
                onPress={() => setActiveView('evidencias')}
                accessibilityRole="button"
                accessibilityLabel="Ver tus evidencias"
                style={[styles.rowCard, { borderColor: c.border, backgroundColor: c.cardBg, marginTop: 12 }]}
              >
                <Icon name="camera" size={18} color={c.chevron} />
                {/* Era 12.5: es el texto principal de la fila, no una etiqueta de ayuda. */}
                <Text style={[t.body, { color: c.textSoft, flex: 1 }]}>
                  {errorEvidencias ? 'No se pudieron cargar tus evidencias.' : 'Todavía no subiste evidencias.'}
                </Text>
                <Icon name="chevron" size={12} color={c.chevron} />
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', gap: space.gap, marginTop: 12 }}>
                {evidencias.slice(0, 3).map(ev => (
                  <Pressable
                    key={ev.id}
                    onPress={() => setActiveView('evidencias')}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver evidencia del ${fechaDeEvidencia(ev.subidaEn ?? ev.timestampExif)}`}
                    style={{ flex: 1 }}
                  >
                    {/* El borde se queda: estas miniaturas se tocan. Lo que se fue es el
                        `borderRadius: 10` suelto — ahora sale del token de radio interno. */}
                    <View
                      style={[
                        styles.more,
                        { height: moreSize, borderColor: c.border, backgroundColor: c.cardBg },
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
                    <Text style={[t.body, { color: c.textSoft }]}>+{evidencias.length - 3}</Text>
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
              <MicroLabel>Reflexión diaria</MicroLabel>
              <Text style={[t.body, { color: c.text, marginTop: 6 }]}>¿Qué aprendí hoy sobre mí?</Text>
            </View>
            <Icon name="chevron" size={12} color={c.chevron} />
          </Pressable>

          {/* PATRONES */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <MicroLabel>Patrones</MicroLabel>
            <Svg width="100%" height={52} viewBox="0 0 320 52" style={{ marginTop: 10 }}>
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
              <MicroLabel>Identidad</MicroLabel>
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
                <MicroLabel>Administración</MicroLabel>
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
            {/* Estos dos botones tenían la etiqueta a 10.5 px con `letterSpacing` 1.6 y 1.8: el
                tamaño de una micro-etiqueta estirado para parecer importante, que es justo el
                gesto que AGENTS.md §4 desaconseja. Ahora son 13 px (rango de etiqueta legible) y
                el espaciado baja a 1, suficiente para versalitas. */}
            <Text style={[t.small, { color: c.textStrong, letterSpacing: 1, fontFamily: 'Jost_500Medium' }]}>
              MI FICHA INICIAL & PACTO
            </Text>
          </Pressable>

          {/* Logout */}
          <Pressable
            onPress={logout}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            style={[styles.logoutBtn, { borderColor: c.border, backgroundColor: c.cardBg }]}
          >
            <Icon name="logout" size={16} color={c.textSoft} />
            <Text style={[t.small, { color: c.textSoft, letterSpacing: 1 }]}>
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                PERFIL & AJUSTES
              </Text>
            </View>
          </View>

          {/* Banner de Usuario — ya no es un banner: era una tarjeta con borde dorado de 1.5 que
              adentro tenía otro disco con borde dorado, dos rectángulos para presentar a una
              persona. Ahora es una fila sobre el fondo de la pantalla; lo que la separa de lo que
              sigue es el aire, no un contorno. El disco pasó a `goldWash` porque sin la línea, con
              el `#292215` que tenía escrito a mano, quedaba una mancha marrón en modo claro. */}
          <View style={styles.profileBanner}>
            <View style={[styles.avatarLg, { backgroundColor: c.goldWash }]}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.avatarImageLarge} accessibilityLabel="Foto de perfil" />
              ) : (
                <Text style={{ color: c.goldInk, fontSize: 18, fontFamily: 'Jost_700Bold' }}>{profileInitials}</Text>
              )}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>{profileName}</Text>
              {/* Eran dos líneas de 11 px: el correo y la fase de alguien no son micro-etiquetas,
                  son los datos del encabezado. A 13 se leen sin acercar el teléfono. */}
              <Text style={[t.small, { color: c.goldInk }]}>{profileEmail}</Text>
              <Text style={[t.small, { color: c.textSoft }]}>
                Día {resumen?.diaPrograma ?? 1} · {rotuloDeFase(resumen?.fase) ?? 'Alumno Activo'}
              </Text>
            </View>
          </View>

          <View style={{ gap: space.gapLg, paddingBottom: 28 }}>
            {/* FASE 1: DATOS PERSONALES & PERFIL */}
            <View style={{ gap: 10 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                FASE 1: DATOS PERSONALES & PERFIL
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('editar_perfil')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="user" size={16} color={c.goldInk} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>Editar Perfil</Text>
                      <Text style={[t.small, { color: c.textSoft }]}>Nombre, foto, teléfono y contraseña</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('info_perfil')}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="doc" size={16} color={c.goldInk} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>Información de Perfil</Text>
                      <Text style={[t.small, { color: c.textSoft }]}>Ubicación, redes y biografía somática</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>
              </View>
            </View>

            {/* FASE 2: HISTORIAL, EVIDENCIAS & ONBOARDING */}
            <View style={{ gap: 10 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                FASE 2: HISTORIAL, EVIDENCIAS & ONBOARDING
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('onboarding')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="stack" size={16} color={c.goldInk} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>Mi Onboarding (5 Etapas)</Text>
                      <Text style={[t.small, { color: c.textSoft }]}>El Pacto firmado, cuestionario y las 90 variables</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('evidencias')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="camera" size={16} color={c.goldInk} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>Registro de Evidencias</Text>
                      <Text style={[t.small, { color: c.textSoft }]}>37 fotos subidas y verificadas por tu mentor</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('logros')}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="award" size={16} color={c.goldInk} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>Logros e Insignias</Text>
                      <Text style={[t.small, { color: c.textSoft }]}>Medallas y trofeos de tus 90 días</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>
              </View>
            </View>

            {/* FASE 3: HERRAMIENTAS SOMÁTICAS */}
            <View style={{ gap: 10 }}>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="spark" size={16} color={c.goldInk} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>El Método Renaser</Text>
                      <Text style={[t.small, { color: c.textSoft }]}>3 fases para comprenderte y sostener tu transformación</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                <Pressable
                  onPress={() => setActiveView('video_activacion')}
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="play" size={16} color={c.goldInk} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>Repetir Activación Inicial</Text>
                      <Text style={[t.small, { color: c.textSoft }]}>Video de bienvenida y manifiesto de Macaco</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>
              </View>
            </View>

            {/* FASE 4: PREFERENCIAS & SISTEMA */}
            <View style={{ gap: 10 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
                FASE 4: PREFERENCIAS & SISTEMA
              </Text>
              <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Pressable
                  onPress={() => setActiveView('notificaciones')}
                  style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="bell" size={16} color={c.goldInk} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>Notificaciones & Alarmas</Text>
                      <Text style={[t.small, { color: c.textSoft }]}>Recordatorio 05:00 AM y grupo</Text>
                    </View>
                  </View>
                  <Icon name="chevron" size={12} color={c.goldInk} />
                </Pressable>

                {/* Es un `View` y no un `Pressable` como sus dos vecinas —y como las tres filas con
                    Switch de la sub-vista de Notificaciones—: envolver un Switch en un Pressable
                    hace que tocar el propio interruptor dispare las dos cosas y el modo se cambie
                    dos veces, volviendo a donde estaba. El área táctil es el Switch. */}
                <View style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    {/* El ícono acompaña al estado (sol = ahora está claro), al revés que el del
                        botón de la cabecera, que muestra la ACCIÓN (luna = "pasar a oscuro").
                        Acá quien dice qué va a pasar es el Switch; el ícono solo ilustra la fila,
                        y si mostrara la acción contradiría al interruptor de al lado. */}
                    <Icon name={mode === 'dark' ? 'moon' : 'sun'} size={16} color={c.goldInk} />
                    <View style={{ flex: 1 }}>
                      <Text style={[t.cardTitle, { color: c.textStrong }]}>Modo oscuro</Text>
                      <Text style={[t.small, { color: c.textSoft }]}>Descansa la vista de noche</Text>
                    </View>
                  </View>
                  <Switch
                    value={mode === 'dark'}
                    onValueChange={toggle}
                    /* Etiqueta fija y no una del tipo "Activar modo oscuro": el lector de pantalla
                       ya anuncia solo si un Switch está activado o desactivado, así que una
                       etiqueta con la acción se leería "activar modo oscuro, activado". */
                    accessibilityLabel="Modo oscuro"
                    trackColor={{ false: '#332C20', true: c.gold }}
                    thumbColor={mode === 'dark' ? '#1E1B18' : '#888'}
                  />
                </View>

                <Pressable
                  onPress={logout}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sesión"
                  style={styles.menuOptionRow}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Icon name="logout" size={16} color={c.goldInk} />
                    <Text style={[t.cardTitle, { color: c.danger }]}>Cerrar Sesión</Text>
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                MI ONBOARDING
              </Text>
            </View>
          </View>

          {/* Alineado a la izquierda. El par "título centrado + párrafo centrado" obliga al ojo a
              volver al centro en cada línea y es el gesto de plantilla que esta pasada viene a
              quitar. Y el párrafo estaba a 11 px: es texto de lectura, va en `t.body` (15/22). */}
          <View style={{ gap: 8 }}>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 20, lineHeight: 27 }]}>
              Tu proceso completo
            </Text>
            <Text style={[t.body, { color: c.textSoft }]}>
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

          {/* Barra de Progreso — el riel pasó de `cardBg` con borde a `divider` sin borde: en modo
              claro `cardBg` (#FDFCFA) es casi el fondo de la pantalla, así que el único que
              dibujaba la barra era el contorno. Ahora la dibuja el color, como en `metodoProgressTrack`. */}
          <View style={{ gap: 8 }}>
            <View style={[styles.progressBarBg, { backgroundColor: c.divider }]}>
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
            {/* Era 10 px y centrado: por debajo del mínimo de micro-etiqueta y desalineado
                respecto del inicio de la barra que describe. */}
            <Text style={[t.small, styles.cifras, { color: c.textSoft }]}>
              {etapasOnboarding.completadas} de {ONBOARDING_STAGES.length} etapas completadas
            </Text>
          </View>

          {/* 2 Etapas */}
          <View style={{ gap: space.gap, paddingBottom: 28 }}>
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
                    <Text style={[t.cardTitle, { color: enProgreso ? c.goldInk : c.textStrong }]}>
                      {stage.title}
                    </Text>
                    <Text style={[t.small, { color: c.textSoft }]}>
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                PARTE 01
              </Text>
            </View>
          </View>

          {/* Encabezado alineado a la izquierda y sin el contorno del disco, que vivía justo
              encima del borde del documento. "Léelo despacio" es una instrucción que se lee, no
              una micro-etiqueta: pasa de 10.5 a 15. */}
          <View style={{ gap: 10 }}>
            <View style={[styles.iconShieldCircle, { backgroundColor: c.goldWash }]}>
              <Icon name="doc" size={20} color={c.goldInk} />
            </View>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 20, lineHeight: 27 }]}>
              Pacto de Renacimiento
            </Text>
            <Text style={[t.body, { color: c.textSoft }]}>
              Léelo despacio. Léelo en voz alta si puedes.
            </Text>
          </View>

          {/* Manifiesto y Cláusulas
              El contorno dorado de esta tarjeta es el ÚNICO que se conserva en el archivo, y a
              propósito: acá el borde es el canto de un documento que se firma, no un adorno para
              destacar una tarjeta (baja de 1.5 a 1).
              El cambio de fondo es el importante: el manifiesto estaba a 11 px y las diez
              cláusulas a 10.5. AGENTS.md §4 dice, con todas las letras, que las cláusulas van
              entre 14 y 15.5 — se le estaba pidiendo a alguien de 40–60 años que leyera y firmara
              un compromiso en letra de nota al pie. Todo pasa a `t.body` (15/22). */}
          <View style={[styles.pactoDocumentCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 12 }}>
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.goldInk, fontSize: 16, fontStyle: 'italic' }}>
                Pacto de Renacimiento
              </Text>
              <Text style={[t.micro, { color: c.textSoft, letterSpacing: 1.4, marginTop: 4 }]}>
                ACTO FUNDACIONAL
              </Text>
            </View>

            <Text style={[t.body, { color: c.text }]}>
              Yo, <Text style={{ color: c.goldInk, fontFamily: 'Jost_700Bold' }}>{profileName}</Text>, en pleno uso de mi consciencia, declaro este pacto conmigo mismo en presencia del sistema RENASER y de la versión más alta de mí.
            </Text>

            <Text style={[t.body, { color: c.text }]}>
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.textStrong }}>Renuncio a la mediocridad.</Text> Renuncio al desdén con que he tratado mi cuerpo, mi mente, mis emociones y mi tiempo.
            </Text>

            <View style={{ gap: 10, marginVertical: 4 }}>
              {PACTO_CLAUSULAS.map(clause => (
                <Text key={clause} style={[t.body, { color: c.textSoft }]}>
                  {clause}
                </Text>
              ))}
            </View>

            <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 12 }]}>
              Si lo cumplo, gano una identidad nueva. Si lo abandono, pierdo la versión de mí que ya estaba esperando del otro lado.
            </Text>
          </View>

          {/* Firma Digital con el Dedo — el recuadro exterior perdió su borde: adentro vive el
              lienzo punteado, que es la afordancia de verdad. Eran dos rectángulos concéntricos
              para pedir una sola firma. */}
          <View style={styles.signatureBox}>
            <Text style={{ fontFamily: 'Jost_700Bold', color: c.goldInk, fontSize: 15, fontStyle: 'italic' }}>
              — Firma con tu dedo —
            </Text>
            <View style={[styles.signatureCanvas, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.goldInk, fontSize: 22, fontStyle: 'italic' }}>
                {profileName}
              </Text>
              <Text style={[t.micro, { color: c.textSoft, position: 'absolute', bottom: 6 }]}>
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
            style={{ width: '100%', marginBottom: 28 }}
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                EVIDENCIAS
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>Tus Evidencias Somáticas</Text>
              {/* Decia "37 fotos subidas · 100% verificadas", escrito a mano, a cualquiera.
                  Era 10.5: es la línea que resume el conteo, texto de ayuda (12–13.5), no micro. */}
              <Text style={[t.small, { color: c.textSoft }]}>
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
              {/* Botón real: pasó de 25 px de alto con etiqueta de 10.5 a 48 px con texto de 13. */}
              <Text style={[t.small, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>+ Subir Foto</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.gap, paddingBottom: 28 }}>
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
                  {/* El cuadro del ícono pasa a lavado dorado: dentro de una tarjeta que ya tiene
                      borde, `cardBgAlt` es blanco puro en modo claro y no se distinguía de nada. */}
                  <View style={[styles.evidenceImgBox, { backgroundColor: c.goldWash }]}>
                    <Icon name={iconoDeTipo(ev.tipo)} size={26} color={c.goldInk} />
                  </View>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]} numberOfLines={2}>
                    {ev.contenidoTexto?.trim() || ETIQUETA_TIPO_EVIDENCIA[ev.tipo] || 'Evidencia'}
                  </Text>
                  <Text style={[t.small, styles.cifras, { color: c.goldInk }]}>
                    {fechaDeEvidencia(ev.subidaEn ?? ev.timestampExif)}
                  </Text>
                  {/* Era una píldora con borde propio dentro de una tarjeta con borde. El estado
                      ya lo dice el color del texto; la caja sólo agregaba una línea más. */}
                  <Text style={[t.micro, { color: colorEstado, fontFamily: 'Jost_700Bold', marginTop: 4 }]}>
                    {ETIQUETA_ESTADO_EVIDENCIA[ev.estadoValidacion] ?? ev.estadoValidacion}
                  </Text>
                </View>
              );
            })}

            {/* Los tres estados se dicen distinto porque no significan lo mismo: todavia no se
                sabe, no se pudo preguntar, o se pregunto y no hay ninguna. */}
            {/* Los tres estados van alineados a la izquierda, como el resto del texto de lectura
                de la pantalla, y en `t.body`: eran 13 y 12.5 px centrados. */}
            {cargandoEvidencias && (
              <Text style={[t.body, { color: c.textSoft, width: '100%', paddingVertical: 20 }]}>
                Cargando tus evidencias…
              </Text>
            )}
            {!cargandoEvidencias && errorEvidencias && (
              <View style={{ width: '100%', paddingVertical: 20, alignItems: 'flex-start', gap: 12 }}>
                <Text style={[t.body, { color: c.danger }]}>
                  {errorEvidencias}
                </Text>
                <GoldButton label="REINTENTAR" variant="outline" onPress={recargarEvidencias} />
              </View>
            )}
            {!cargandoEvidencias && !errorEvidencias && evidencias.length === 0 && (
              <View style={{ width: '100%', paddingVertical: 24, alignItems: 'flex-start', gap: 8 }}>
                <Icon name="camera" size={26} color={c.chevron} />
                <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 4 }]}>
                  Todavía no subiste evidencias
                </Text>
                <Text style={[t.body, { color: c.textSoft }]}>
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                LOGROS
              </Text>
            </View>
          </View>

          <View style={{ gap: space.gap, paddingBottom: 28 }}>
            {/* Sin endpoint de logros no se puede decir cuales estan conseguidos, asi que no se
                marca ninguno: se listan como metas del programa. */}
            <Text style={[t.body, { color: c.textSoft }]}>
              Estas son las metas del programa. Tu avance aparecerá aquí cuando el registro de
              logros esté disponible.
            </Text>
            {/* El disco del ícono perdió su borde —vivía dentro del borde de la tarjeta— y la
                descripción subió de 10.5 a 15: es la frase que explica en qué consiste la meta,
                o sea texto de lectura, no un pie de foto. */}
            {LOGROS_DEL_PROGRAMA.map(logro => (
              <View
                key={logro.id}
                style={[styles.logroCard, { borderColor: c.border, backgroundColor: c.cardBg }]}
              >
                <View style={[styles.logroIconCircle, { backgroundColor: c.goldWash }]}>
                  <Icon name={logro.icon} size={20} color={c.goldInk} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>
                    {logro.title}
                  </Text>
                  <Text style={[t.body, { color: c.textSoft }]}>
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                EDITAR PERFIL
              </Text>
            </View>
          </View>

          {/* El avatar sigue centrado a propósito: es una imagen, no texto de lectura. Lo que se
              fue es su contorno dorado y el `#292215` escrito a mano, que en modo claro dibujaba
              un círculo marrón sobre el fondo crema. */}
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.avatarLg, { backgroundColor: c.goldWash, width: 70, height: 70, borderRadius: 35 }]}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.avatarImageLarge} accessibilityLabel="Foto de perfil" />
              ) : (
                <Text style={{ color: c.goldInk, fontSize: 24, fontFamily: 'Jost_700Bold' }}>{profileInitials}</Text>
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
              style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 }}
            >
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>{subiendoAvatar ? 'Subiendo…' : 'Cambiar Foto 📷'}</Text>
            </Pressable>
          </View>

          {/* Las etiquetas de campo pasan de 10.5 a 13: son lo que le dice a alguien qué escribir
              en cada casilla, no una marca al margen. */}
          <View style={{ gap: space.gap }}>
            <View style={{ gap: 6 }}>
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>NOMBRE COMPLETO:</Text>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>CORREO ELECTRÓNICO:</Text>
              <TextInput
                value={profileEmail}
                keyboardType="email-address"
                editable={false}
                placeholder="Correo de la cuenta"
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>TELÉFONO / WHATSAPP:</Text>
              <TextInput
                value={profilePhone}
                keyboardType="phone-pad"
                editable={false}
                placeholder="No registrado en tu cuenta"
                placeholderTextColor={c.micro}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
              <Text style={[t.small, { color: c.micro }]}>El teléfono se habilitará cuando exista en el perfil del servidor.</Text>
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
            style={{ width: '100%', marginBottom: 28 }}
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                INFORMACIÓN
              </Text>
            </View>
          </View>

          <View style={{ gap: space.gap }}>
            <View style={{ gap: 6 }}>
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>BIOGRAFÍA SOMÁTICA:</Text>
              <TextInput
                value={profileBio}
                onChangeText={setProfileBio}
                multiline
                style={[styles.modalInputText, { minHeight: 70, borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>DEPARTAMENTO / ÁREA:</Text>
              <TextInput
                value={profileDepartment}
                onChangeText={setProfileDepartment}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>INSTAGRAM:</Text>
              <TextInput
                value={profileInstagram}
                editable={false}
                placeholder="No registrado en tu cuenta"
                placeholderTextColor={c.micro}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
              <Text style={[t.small, { color: c.micro }]}>Instagram se habilitará cuando exista en el perfil del servidor.</Text>
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
            style={{ width: '100%', marginBottom: 28 }}
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
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
                {/* Portada del método, alineada a la izquierda. El título estaba hecho con
                    `t.sectionTitle` estirado a 24 px, o sea versalitas de rótulo con `letterSpacing`
                    positivo usadas como titular — exactamente lo que AGENTS.md §4 desaconseja desde
                    que existen los tokens de display. Ahora usa `t.screenTitle` (la serif, con
                    tracking negativo) y la bajada usa `t.body` sin retoques. El orbe perdió su
                    contorno; el color de la fase lo sigue dando el ícono y el lavado. */}
                <View style={styles.metodoHero}>
                  <View style={[styles.metodoOrb, { backgroundColor: c.cardBgAlt }]}>
                    <Icon name="spark" size={24} color={fase.color} />
                  </View>
                  <Text style={[t.screenTitle, { color: c.textStrong }]}>El Método Renaser</Text>
                  <Text style={[t.body, styles.metodoHeroSubtitle, { color: c.textSoft }]}>{`${METODO_FASES.length} fases en ${DIAS_DEL_PROGRAMA} días: verte sin filtros, desarmar el sabotaje, elegir desde el gozo y ejecutar.`}</Text>
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
                    {/* Sin borde: estaba dentro del borde de colores de la tarjeta de fase. */}
                    <View style={[styles.metodoPhaseIcon, { backgroundColor: c.cardBgAlt }]}>
                      <Icon name={fase.icon} size={23} color={fase.color} />
                    </View>
                    <View style={styles.metodoPhaseHeading}>
                      <Text style={[t.micro, { color: fase.color, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>{`${fase.phase} · ${fase.rango.toUpperCase()}`}</Text>
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
                  <Text style={[t.cardTitle, { color: metodoFase === METODO_FASES.length - 1 ? c.micro : fase.color, fontSize: 15 }]}>
                    {metodoFase === METODO_FASES.length - 1 ? 'Método completo' : 'Explorar siguiente fase'}
                  </Text>
                  {metodoFase < METODO_FASES.length - 1 && <Icon name="arrow" size={16} color={fase.color} />}
                </Pressable>

                {/* Era `t.micro` forzado a 12 y centrado: una frase se lee, no se rotula. */}
                <Text style={[t.small, { color: c.micro }]}>Lee una fase en 20 segundos y vuelve cuando quieras.</Text>
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                ACTIVACIÓN
              </Text>
            </View>
          </View>

          {/* Esta vista reusa `pactoDocumentCard`, pero acá el contorno dorado no es el canto de
              un documento sino énfasis decorativo: pasa a `c.border`. La cita pasa de 11 a 15 px. */}
          <View style={[styles.pactoDocumentCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
            <View style={[styles.evidenceImgBox, { height: 160, backgroundColor: c.placeholderA }]}>
              <Text style={{ fontSize: 44 }}>▶</Text>
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', marginTop: 8 }]}>
                Reproducir Manifiesto Macaco (12:45 min)
              </Text>
            </View>
            <Text style={[t.cardTitle, { color: c.textStrong }]}>
              Bienvenida Oficial al Renacimiento Somático
            </Text>
            <Text style={[t.body, { color: c.textSoft }]}>
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
            <View style={[styles.categoryPillBadge, { backgroundColor: c.goldWash }]}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                NOTIFICACIONES
              </Text>
            </View>
          </View>

          <View style={[styles.groupedBox, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <View style={[styles.menuOptionRow, { borderBottomColor: c.divider }]}>
              <View style={{ flex: 1 }}>
                <Text style={[t.cardTitle, { color: c.textStrong }]}>Alarma 05:00 AM</Text>
                <Text style={[t.small, { color: c.textSoft }]}>Aviso para despertar y luz solar</Text>
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
                <Text style={[t.cardTitle, { color: c.textStrong }]}>Avisos de Grupo Fénix</Text>
                <Text style={[t.small, { color: c.textSoft }]}>Mensajes y victorias de tu tribu</Text>
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
                <Text style={[t.cardTitle, { color: c.textStrong }]}>Masterclasses en Vivo</Text>
                <Text style={[t.small, { color: c.textSoft }]}>Alertas 1h antes de cada sesión</Text>
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

/**
 * Pasada de limpieza visual del 2026-09-14, la misma que ya se hizo en Hoy, Plan y Training.
 *
 * **Qué borde sobrevive y cuál no.** La regla que se aplicó en todo el archivo: un `borderWidth`
 * se queda sólo si el elemento es un **contenedor externo** (se apoya en el fondo de la pantalla)
 * o una **afordancia** (algo que se toca: un campo, un botón, una fila pulsable). Todo borde que
 * vivía DENTRO de otro borde se fue — los discos de avatar, los círculos de ícono, la píldora de
 * estado de una evidencia. Ahí la forma la da un fondo lavado, no una línea.
 *
 * **Por qué, cuando se quita un borde, a veces cambia el fondo.** En modo claro `bg` (#FCFBF9) y
 * `cardBg` (#FDFCFA) son prácticamente el mismo color: lo que dibuja una tarjeta es su BORDE, no
 * su fondo. Así que un disco al que se le quita la línea y se le deja `cardBg` desaparece. Por eso
 * los que perdieron el borde pasaron a `goldWash`/`divider`, que sí se ven en los dos modos — es
 * el mismo movimiento que se hizo en Hoy con `eventIconBox` y `wallAvatar`.
 *
 * **Radios.** Contenedor `space.radius` (20), interno `space.radiusSm` (12). Antes había once
 * valores distintos entre 6 y 25 sin criterio.
 *
 * **Alturas.** Todo lo pulsable llega a 48 px (AGENTS.md §4). Había botones de 25 px de alto.
 */
const styles = StyleSheet.create({
  /* `gapLg` entre bloques: el espacio es lo que ahora separa las secciones, así que los
     `marginTop` sueltos que tenía cada hijo (12, 14, 16, 10…) se fueron de acá y del JSX. Con
     ellos puestos el gap se sumaba dos veces. */
  content: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    paddingBottom: ESPACIO_PARA_LANZADOR,
    gap: space.gapLg,
  },
  /** Cifras que cambian en pantalla: ancho de dígito fijo para que nada salte (AGENTS.md §4). */
  cifras: { fontVariant: ['tabular-nums'] },
  metodoContent: { gap: space.gap, paddingBottom: 34 },
  /* Alineado a la izquierda: el título del método y su bajada son texto de lectura. */
  metodoHero: { gap: 8 },
  metodoOrb: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  metodoHeroSubtitle: { maxWidth: 420 },
  metodoPhaseCard: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, gap: 13, minHeight: 330 },
  metodoPhaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metodoPhaseIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  metodoPhaseHeading: { flex: 1, gap: 3 },
  metodoPhaseTitle: { fontSize: 19, lineHeight: 25 },
  metodoQuote: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  metodoSummary: { fontSize: 15, lineHeight: 22 },
  metodoBullets: { gap: 10, paddingTop: 2 },
  metodoBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metodoBulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  metodoBulletText: { flex: 1, fontSize: 15, lineHeight: 22 },
  metodoProgressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  metodoProgressFill: { height: '100%', borderRadius: 3 },
  /** Era 10 px, por debajo del mínimo de micro-etiqueta (10.5). Alineado al final de la barra. */
  metodoProgressLabel: { fontSize: 11, letterSpacing: 1.2, textAlign: 'right' },
  metodoNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  metodoNavButton: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  metodoNavButtonDisabled: { opacity: 0.4 },
  metodoDots: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  metodoDot: { width: 8, height: 8, borderRadius: 4 },
  metodoDotActive: { width: 24, borderRadius: 5 },
  metodoNextButton: { minHeight: 48, borderWidth: 1, borderRadius: space.radiusSm, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  metodoNextButtonDisabled: { opacity: 0.65 },
  /* Fila pulsable: el borde se queda porque dice "esto se toca". */
  userCard: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarLg: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 22 },
  avatarImageLarge: { width: '100%', height: '100%', borderRadius: 35 },
  avatarInitials: { fontSize: 15, fontFamily: 'Jost_700Bold' },
  /* Era una tarjeta con borde dorado de 1.5 que contenía otro disco con borde: dos rectángulos
     para presentar a una persona. Ahora es una fila de encabezado sobre el fondo de la pantalla,
     igual que la barra de estado de Hoy. */
  profileBanner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  /* Las tres cifras (coherencia, puntos, racha) eran tres cajas con borde. Ahora son tres
     columnas de texto separadas por UNA línea de pelo: el único borde que queda es el que de
     verdad hace falta, porque sin él las cifras se leerían como una sola frase. */
  statBloque: { flex: 1 },
  statCifra: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 6 },
  statSeparador: { width: 1, alignSelf: 'stretch' },
  more: { borderRadius: space.radiusSm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowCard: { borderWidth: 1, borderRadius: space.radius, minHeight: 48, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  onboardingBtn: { borderWidth: 1, borderRadius: space.radiusSm, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoutBtn: { borderWidth: 1, borderRadius: space.radiusSm, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  detailTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1 },
  /** 48 px: es el "volver" de todas las sub-vistas y era el pulsable más chico del archivo. */
  backBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingRight: 8 },
  /* Sin borde: es un rótulo, no un control. El lavado dorado alcanza para separarlo del fondo. */
  categoryPillBadge: { borderRadius: space.radiusSm, paddingHorizontal: 10, paddingVertical: 6 },
  groupedBox: { borderWidth: 1, borderRadius: space.radius, overflow: 'hidden' },
  menuOptionRow: { paddingVertical: 14, paddingHorizontal: 16, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1 },
  /* Una barra de 6 px de alto no necesita contorno; el contraste lo da el color del riel. */
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  stageCard: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stageCheckCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconShieldCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  /* El único contorno dorado que se conserva en el archivo, y a propósito: acá el borde ES el
     contenido —es el canto de un documento que se firma—, no un adorno para destacar la tarjeta.
     En la vista de video, que reusa este estilo, el JSX lo pasa a `c.border`. */
  pactoDocumentCard: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, gap: 12 },
  /* Perdió su borde: adentro vive el lienzo de firma, que tiene el suyo (punteado, y ese sí es
     la afordancia). Eran dos recuadros concéntricos para pedir una sola firma. */
  signatureBox: { alignItems: 'center', gap: 10 },
  signatureCanvas: { width: '100%', height: 80, borderRadius: space.radiusSm, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  /** Era de 25 px de alto (paddingVertical 6) con texto de 10.5. Ahora es un botón de verdad. */
  createHabitBtn: { borderRadius: space.radiusSm, paddingHorizontal: 16, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  evidenceCard: { borderWidth: 1, borderRadius: space.radius, padding: 14, gap: 4 },
  evidenceImgBox: { width: '100%', height: 84, borderRadius: space.radiusSm, alignItems: 'center', justifyContent: 'center' },
  logroCard: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, flexDirection: 'row', alignItems: 'center', gap: 14 },
  logroIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  momentSwitchBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  goalCard: { borderWidth: 1.5, borderRadius: 18, padding: 14 },
  /* Campo de formulario: el borde se queda (es afordancia). Lo que cambió es el tamaño — 12 px
     estaba por debajo del mínimo de input de AGENTS.md §4 (14–15.5) — y la altura, que con
     `paddingVertical: 8` daba unos 34 px y ahora llega a 48. */
  modalInputText: { borderWidth: 1, borderRadius: space.radiusSm, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 15 },
});
