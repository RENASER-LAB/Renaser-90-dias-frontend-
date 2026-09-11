import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useResponsive } from '../theme/responsive';
import { Card, MicroLabel, ScreenHeader, GoldCircle } from '../components/ui';
import { Icon } from '../components/Icon';
import { Aparicion } from '../components/Aparicion';
import { useEsMentor } from '../features/mentor/hooks/useEsMentor';
import { useCelulaQueAcompano } from '../features/mentor/hooks/useCelulaQueAcompano';
import { useProgramaPersonal } from '../features/mentor/hooks/useProgramaPersonal';
import { TarjetaMentorHoy } from '../features/mentor/components/TarjetaMentorHoy';
import { alAbrirAviso, consumirRutaPendiente } from '../features/mentor/notificaciones/rutaDeAviso';
import { AdminScreen } from '../features/admin/screens/AdminScreen';
import { TarjetaAdminHoy } from '../features/admin/components/TarjetaAdminHoy';
import { useCapacidades } from '../features/admin/hooks/useCapacidades';
import { MiCelulaScreen } from '../features/mentor/screens/MiCelulaScreen';
import { AlumnoScreen } from '../features/mentor/screens/AlumnoScreen';
import type { AlumnoConEstado } from '../features/mentor/types/mentor.types';
import {
  useResumenHome,
  rotuloDeFase,
  DIAS_DEL_PROGRAMA,
} from '../features/home/hooks/useResumenHome';
import { useHabitoDelMomento } from '../features/habits/hooks/useHabitoDelMomento';
import { useRadar } from '../features/radar/RadarContext';
import { TarjetaCodigoRenaser } from '../features/radar/components/TarjetaCodigoRenaser';
import { obtenerRocasDeHoy } from '../features/training/api/trainingApi';
import { useUltimaPublicacionMuro } from '../features/community/hooks/useUltimaPublicacionMuro';
import { tiempoRelativo } from '../features/community/utils/tiempoRelativo';
import { useAuth } from '../context/AuthContext';
import { useMapaRenacimientoAbierto } from '../features/mapa-renacimiento/MapaRenacimientoContext';
import { useEstadoMapa } from '../features/mapa-renacimiento/hooks/useEstadoMapa';
import type { RocaDiariaApi } from '../features/training/types/training.types';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';

export default function HoyScreen() {
  const { c, t, mode } = useTheme();
  const isDark = mode === 'dark';
  const { rs, isShort, isTablet, horizontalPadding, width, contentMaxWidth } = useResponsive();
  const navigation = useNavigation();

  const { resumen, cargando: cargandoResumen, error: errorResumen, recargar: recargarResumen } = useResumenHome();
  /* El hábito de ESTA hora para la primera tarjeta. Vive acá y no dentro de la tarjeta porque
     `useFocusEffect` tiene que correr con la pantalla montada, y porque el pull-to-refresh de
     Hoy también lo recarga. */
  const { habito: habitoAhora, recargar: recargarHabitoAhora } = useHabitoDelMomento();
  /* Código Renaser. El estado vive en `RadarProvider` (App.tsx) porque el formulario se dibuja
     por encima del navegador: acá sólo se lee para pintar la tarjeta y poder reabrirlo. */
  const radar = useRadar();
  const { user } = useAuth();
  /* Rol Mentor. Se monta DENTRO de Hoy y no como sexta pestaña: AGENTS.md 1 prohibe tocar los
     cinco tabs, y ademas el mentor sigue siendo aprendiz — su propio programa no cambia. */
  const esMentor = useEsMentor();
  /* UNA sola lectura de la celula, repartida a la tarjeta y a la pantalla. Si cada una
     llamara al hook por su cuenta habria dos peticiones y dos verdades. */
  const celula = useCelulaQueAcompano(esMentor);
  /* Quien puede administrar lo dice el SERVIDOR, no el rol leido en el telefono. Un rol nuevo
     manana no dejaria la entrada colgada, y una capacidad falseada abre pantallas vacias: cada
     endpoint vuelve a autorizar (SDD 003, ARF-15). */
  const { capacidades } = useCapacidades();
  /* Ya no `esMentor`: la invitacion al programa propio es para todo el staff, ADMIN y ALQUIMISTA
     incluidos. Atarla a "es mentor" los dejaba fuera de un programa que el backend si les
     permitia iniciar — el bloqueo estaba aca, no en el permiso (ARF-16). */
  const programaPersonal = useProgramaPersonal(
    esMentor || capacidades.administrar || capacidades.puedeIniciarPrograma,
    user?.id ?? null,
  );
  const [enAdministracion, setEnAdministracion] = useState(false);
  const [vistaMentor, setVistaMentor] = useState<'ninguna' | 'celula' | 'alumno'>('ninguna');
  const [alumnoAbierto, setAlumnoAbierto] = useState<AlumnoConEstado | null>(null);

  /* Un aviso tocado desde la bandeja del sistema abre la ficha de ese alumno (RF-25).
     La ruta la deja `rutaDeAviso` y se atiende ACA porque las vistas del mentor son estado de
     esta pantalla, no rutas del navegador (AGENTS.md 1: los cinco tabs no se tocan).

     Se espera al padron antes de abrir. No es una demora evitable: `AlumnoScreen` necesita al
     alumno entero —dia de programa, habitos, evidencias—, y eso llega con el grupo. Mientras
     tanto la ruta queda pendiente; `alAbrirAviso` reentrega lo que ya estuviera esperando, asi
     que un toque con la app cerrada no se pierde por llegar antes que los datos.

     Si el alumno NO esta en el padron, se abre el grupo y nada mas. Un aviso viejo de alguien
     que ya roto no debe llevar a su ficha: sus datos ya no son de este mentor. */
  useEffect(() => {
    if (!esMentor) return;
    const abrir = () => {
      const vista = celula.vista;
      if (!vista) return;
      const ruta = consumirRutaPendiente();
      if (!ruta) return;
      const alumno = vista.todos.find(a => a.participanteId === ruta.alumnoId);
      if (alumno) {
        setAlumnoAbierto(alumno);
        setVistaMentor('alumno');
      } else {
        setVistaMentor('celula');
      }
    };
    abrir();
    return alAbrirAviso(abrir);
  }, [esMentor, celula.vista]);
  const { abrir: abrirMapa, abierto: mapaAbierto } = useMapaRenacimientoAbierto();
  const estadoMapa = useEstadoMapa(user?.id ?? null, mapaAbierto);
  const {
    publicacion: ultimaPublicacion,
    cargando: cargandoUltimaPublicacion,
    recargar: recargarUltimaPublicacion,
  } = useUltimaPublicacionMuro();

  const [rocas, setRocas] = useState<RocaDiariaApi[]>([]);
  const [cargandoRocas, setCargandoRocas] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cargarRocas = useCallback(async () => {
    setCargandoRocas(true);
    try {
      const data = await obtenerRocasDeHoy();
      setRocas(data);
    } catch {
      // Degrada amigablemente si aún no hay rocas planificadas
      setRocas([]);
    } finally {
      setCargandoRocas(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarRocas();
    }, [cargarRocas])
  );

  const recargarTodo = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      recargarResumen(),
      cargarRocas(),
      recargarUltimaPublicacion(),
      recargarHabitoAhora(),
    ]);
    setRefreshing(false);
  }, [recargarResumen, cargarRocas, recargarUltimaPublicacion, recargarHabitoAhora]);

  // Roca Prioritaria de Hoy: Posición 1 (Pareto Verde) o la primera disponible
  const rocaPrioritaria = rocas.find(r => r.posicion === 1) || rocas[0] || null;
  const evidenciasUltimaPublicacion = ultimaPublicacion?.media ?? [];

  /* Los anillos son decorado: se derivan del hueco REAL que queda, no de medidas fijas.
     Antes eran [306, 258, 210, 162] pasados por `rs()`, asi que en pantallas anchas crecian
     por encima de la columna de contenido y en todas se comian mas de un tercio del alto
     visible, dejando las tarjetas utiles (Mapa, Habitos) por debajo del pliegue.
     Ahora el anillo mayor nunca excede el ancho de contenido y el hero mide lo que miden
     los anillos, sin `minHeight` suelto que sobresalga. */
  const anchoContenido = (isTablet ? Math.min(560, width) : width) - horizontalPadding * 2;
  const heroSize = Math.min(anchoContenido, rs(isShort ? 206 : 252));
  const ringDiameters = [heroSize, heroSize * 0.82, heroSize * 0.64, heroSize * 0.46].map(Math.round);
  const ringColors = [c.ring1, c.ring2, c.ring3, c.ring2];

  const faseNombre = rotuloDeFase(resumen?.fase)?.toUpperCase() || 'PROGRAMA ACTIVO';
  /**
   * `null` = todavía no sabemos en qué día está, porque la carga falló o no terminó.
   *
   * > **Corregido 2026-09-07.** Acá había `?? 1`, y con el backend caído la pantalla anunciaba
   * > "DÍA 1 DE 90" a alguien que se acababa de registrar y estaba en el día 0. No es un redondeo
   * > inocente: el número de día es el dato que ordena todo el programa, y rellenarlo con uno
   * > inventado es peor que no mostrarlo. Reportado por el dueño el día que se registró.
   */
  const diaConocido = resumen?.diaPrograma ?? null;
  /** Para los cálculos derivados, que necesitan un número. `0` es el día real de quien recién entra. */
  const diaNumero = diaConocido ?? 0;
  // Mapa de Renacimiento. **Disponible desde el Día 0 y opcional** (decisión del dueño,
  // 2026-09-08). Antes aparecía recién el Día 7; se adelanta por dos razones:
  //
  //   1. En Día 0 se PLANIFICA, no se ejecuta — el mismo criterio ya aplicado a los hábitos
  //      (D-103, E-137). Definir el objetivo de los 90 días es planificar, y quien quiere
  //      hacerlo el primer día no tiene por qué esperar una semana.
  //   2. Al activarlo se escriben las tres Rocas Maestras, que son la llave de TODA la cadena de
  //      Rocas: sin ellas el backend responde `403 ROCKS_LOCKED` y la pestaña Plan queda
  //      bloqueada. Adelantar el Mapa adelanta el desbloqueo del plan.
  //
  // Sigue siendo opcional: nadie queda trabado por no llenarlo.
  //
  // Interruptor de salida a producción: en desarrollo siempre; en un build de producción SOLO si
  // EXPO_PUBLIC_MAPA_DIA7=on (variable de Vercel/EAS, inlined al compilar). Se conserva — encender
  // el flujo sigue siendo un acto deliberado y no un efecto del merge.
  const MAPA_DIA7_HABILITADO = __DEV__ || process.env.EXPO_PUBLIC_MAPA_DIA7 === 'on';
  // Decía "83 días", que era 90 − 7 y valía mientras el Mapa vivía en el Día 7. Desde que arranca
  // en el Día 0 ese número miente: quien lo abre el primer día tiene 90 por delante, no 83.
  const diasQueQuedan = Math.max(1, 90 - diaNumero);
  const mostrarMapa = MAPA_DIA7_HABILITADO && !!user;
  const tituloMapa = estadoMapa === 'activo'
    ? 'Tu mapa está activo'
    : estadoMapa === 'en_progreso' || estadoMapa === 'listo_para_revision' ? 'Continúa tu mapa' : 'Diseña tu mapa';
  const detalleMapa = estadoMapa === 'activo'
    ? `Tus objetivos, acciones y protocolo de retorno para los ${diasQueQuedan} días.`
    : `Convierte lo aprendido en un plan claro para los próximos ${diasQueQuedan} días. 15–20 min.`;
  /* Los dos textos de la primera tarjeta. El estado lo decide `habitoDelMomento`; acá solo se
     redacta. `sin-datos` cae al texto genérico de siempre —Día 0, cuenta recién aprobada, o el
     endpoint falló— porque inventar un hábito sería peor que no decir nada. */
  const tituloHabitoAhora = useMemo(() => {
    if (habitoAhora.titulo) return habitoAhora.titulo;
    if (habitoAhora.estado === 'todo-hecho') return '¡Todos los hábitos completados!';
    return 'Lidera tu energía diaria.';
  }, [habitoAhora]);

  const detalleHabitoAhora = useMemo(() => {
    const quedan = habitoAhora.pendientes === 1 ? 'queda 1 pendiente' : `quedan ${habitoAhora.pendientes} pendientes`;
    if (habitoAhora.estado === 'ahora') {
      return habitoAhora.hora ? `Te toca ahora · ${habitoAhora.hora} · ${quedan}` : `Te toca ahora · ${quedan}`;
    }
    if (habitoAhora.estado === 'proximo') {
      return `Empieza a las ${habitoAhora.hora} · ${quedan}`;
    }
    if (habitoAhora.estado === 'todo-hecho') {
      return resumen?.habitosHoy
        ? `${resumen.habitosHoy.completados} de ${resumen.habitosHoy.total} hábitos cumplidos en esta jornada.`
        : 'No queda nada pendiente en esta jornada.';
    }
    return resumen?.habitosHoy
      ? `${resumen.habitosHoy.completados} de ${resumen.habitosHoy.total} hábitos cumplidos en esta jornada.`
      : 'Todo lo demás se alinea cuando cumples tu disciplina.';
  }, [habitoAhora, resumen]);

  const coherenciaScore = Math.round(resumen?.coherencia ?? 100);
  const puntosLiga = resumen?.puntosLiga ?? 100;
  const rachaActual = resumen?.rachaActual ?? 0;
  const rachaMaxima = resumen?.rachaMaxima ?? 0;

  /* Las vistas del mentor toman la pantalla completa, como el Mapa: son otro contexto de
     trabajo, no una tarjeta mas dentro del dia propio. El retroceso del sistema las cierra
     paso a paso (cada una registra su `useSystemBackHandler`). */
  /* Administracion toma la pantalla completa, como las vistas del mentor y como el Mapa: es otro
     contexto de trabajo, no una tarjeta mas dentro del dia propio. */
  if (enAdministracion && capacidades.administrar) {
    return <AdminScreen onSalir={() => setEnAdministracion(false)} />;
  }
  if (esMentor && vistaMentor === 'alumno' && alumnoAbierto) {
    return (
      <AlumnoScreen
        alumno={alumnoAbierto}
        grupoId={celula.vista?.celula.id ?? null}
        onVolver={() => setVistaMentor('celula')}
      />
    );
  }
  if (esMentor && vistaMentor === 'celula') {
    return (
      <MiCelulaScreen
        onSalir={() => setVistaMentor('ninguna')}
        onAbrirAlumno={alumno => {
          setAlumnoAbierto(alumno);
          setVistaMentor('alumno');
        }}
        vista={celula.vista}
        cargando={celula.cargando}
        fallo={celula.fallo}
        detalle={celula.detalle}
        recargar={celula.recargar}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScreenHeader title="HOY" right="bell" />

      <ScrollView
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing || cargandoResumen}
            onRefresh={recargarTodo}
            tintColor={c.goldInk}
            colors={[c.goldInk]}
          />
        }
      >
        {/* ========================================================================= */}
        {/* 1. BARRA DE ESTADO DEL PROGRAMA & PUNTOS                                  */}
        {/* ========================================================================= */}
        <Aparicion>
        <View style={[styles.programStatusBar, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <View style={{ flex: 1 }}>
            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
              {faseNombre}
            </Text>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13.5, marginTop: 2 }]}>
              DÍA {diaConocido ?? '—'} DE {DIAS_DEL_PROGRAMA}
            </Text>
          </View>

          <View style={[styles.metricPill, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
            <Icon name="zap" size={12} color={c.goldInk} />
            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
              {puntosLiga} PTS
            </Text>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 2. MÉTRICAS CLAVE REALES: COHERENCIA Y RACHA                              */}
        {/* ========================================================================= */}
        </Aparicion>

        <Aparicion retardo={70}>
        <View style={styles.metricsRow}>
          {/* Tarjeta Coherencia Real */}
          <View style={[styles.metricCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
                COHERENCIA
              </Text>
              <Icon name="target" size={14} color={c.goldInk} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
              <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 26, color: c.goldInk }}>
                {coherenciaScore}
              </Text>
              <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 13, color: c.goldInk }}>%</Text>
            </View>
            <Text style={[t.micro, { color: c.micro, fontSize: 10.5, marginTop: 2 }]}>
              {coherenciaScore >= 80 ? 'Nivel de excelencia' : 'Consistencia del día'}
            </Text>
          </View>

          {/* Tarjeta Racha Real */}
          <View style={[styles.metricCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
                RACHA ACTUAL
              </Text>
              <Icon name="fire" size={14} color={rachaActual > 0 ? c.goldInk : c.chevron} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 26, color: c.textStrong }}>
                {rachaActual}
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>DÍAS</Text>
            </View>
            <Text style={[t.micro, { color: c.micro, fontSize: 10.5, marginTop: 2 }]}>
              Récord histórico: {rachaMaxima} d
            </Text>
          </View>
        </View>

        {errorResumen && (
          <View style={[styles.errorBox, { borderColor: c.danger, backgroundColor: isDark ? 'rgba(224,106,102,0.1)' : 'rgba(224,106,102,0.05)' }]}>
            <Text style={[t.micro, { color: c.danger, textAlign: 'center' }]}>
              {errorResumen}
            </Text>
          </View>
        )}

        {/* ========================================================================= */}
        {/* 3. HERO: CÍRCULOS CONCÉNTRICOS & TU ÚNICO FOCO (ROCA PRIORITARIA DE HOY)  */}
        {/* ========================================================================= */}
        </Aparicion>

        <Aparicion retardo={140}>
        <View style={[styles.hero, { height: heroSize }]}>
          {ringDiameters.map((d, i) => {
            const size = d;
            return (
              <View
                key={d}
                style={[
                  styles.ring,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderColor: ringColors[i],
                  },
                ]}
              />
            );
          })}
          <View style={styles.heroCenter}>
            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_500Medium', letterSpacing: 2, fontSize: 10.5, textAlign: 'center' }]}>
              {rocaPrioritaria ? 'PRIORIDAD #1 · FOCO DEL DÍA' : 'TU ÚNICO FOCO'}
            </Text>

            <Text
              numberOfLines={2}
              style={[
                t.hero,
                {
                  color: c.textStrong,
                  marginTop: isShort ? 8 : 12,
                  fontSize: isShort ? (rocaPrioritaria ? 17 : 26) : (rocaPrioritaria ? 19 : 32),
                  textAlign: 'center',
                  paddingHorizontal: 20,
                  lineHeight: isShort ? 22 : 26,
                },
              ]}
            >
              {rocaPrioritaria ? rocaPrioritaria.titulo : 'AHORA'}
            </Text>

            {rocaPrioritaria ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      borderColor: rocaPrioritaria.completada ? c.success : c.gold,
                      backgroundColor: rocaPrioritaria.completada ? 'rgba(76,175,80,0.15)' : c.goldWash,
                    },
                  ]}
                >
                  <Icon
                    name={rocaPrioritaria.completada ? 'check' : 'clock'}
                    size={12}
                    color={rocaPrioritaria.completada ? c.success : c.goldInk}
                  />
                  <Text
                    style={[
                      t.micro,
                      {
                        color: rocaPrioritaria.completada ? c.success : c.goldInk,
                        fontFamily: 'Jost_700Bold',
                        fontSize: 11,
                      },
                    ]}
                  >
                    {rocaPrioritaria.completada ? 'ROCA COMPLETADA' : 'EN PROCESO'}
                  </Text>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => (navigation as any).navigate('Plan')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.definirRocaEnlace, { opacity: pressed ? 0.6 : 1 }]}
                hitSlop={8}
              >
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>
                  Define tu Roca Verde en Plan
                </Text>
                <Icon name="arrow" size={12} color={c.goldInk} />
              </Pressable>
            )}

            <Pressable
              onPress={() => (navigation as any).navigate('Plan')}
              style={{ marginTop: isShort ? 14 : 20 }}
              hitSlop={8}
            >
              <GoldCircle size={isShort ? 44 : 50} icon={rocaPrioritaria?.completada ? 'check' : 'chevron'} />
            </Pressable>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 4. TARJETAS DE PROGRESO Y CONTADORES REALES DEL DÍA                       */}
        {/* ========================================================================= */}
        </Aparicion>

        <Aparicion retardo={210} style={{ gap: 12, paddingBottom: 24 }}>
        <View style={{ gap: 12 }}>
          {/* Solo para ADMIN/ALQUIMISTA. El resto de Hoy no cambia para nadie. */}
          {capacidades.administrar ? <TarjetaAdminHoy onAbrir={() => setEnAdministracion(true)} /> : null}

          {/* Solo para quien acompana una celula. El resto de Hoy no cambia. */}
          {esMentor ? (
            <TarjetaMentorHoy
              onAbrir={() => setVistaMentor('celula')}
              vista={celula.vista}
              cargando={celula.cargando}
              fallo={celula.fallo}
            />
          ) : null}

          {/*
            Invitación secundaria, no un bloqueo. Acompañar no exige cursar (D-07), así que esto
            es una oferta: quien dice "Ahora no" sigue trabajando igual y no pierde ningún dato —
            posponer no llama a nada, y menos al DELETE, que borraría la participación entera.
          */}
          {programaPersonal.visible ? (
            <Card>
              <MicroLabel>TU PROGRAMA</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 6 }]}>
                Hacer mi programa de 90 días
              </Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 6, lineHeight: 19 }]}>
                Podés recorrerlo vos también: tus hábitos, tus objetivos y tu Mapa, con tu propio
                día. No cambia nada de lo que ves como acompañante.
              </Text>
              {programaPersonal.error ? (
                <Text style={[t.body, { color: c.danger, fontSize: 12.5, marginTop: 8 }]}>
                  {programaPersonal.error}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <Pressable
                  onPress={() => void programaPersonal.activar()}
                  disabled={programaPersonal.activando}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: programaPersonal.activando }}
                  style={[
                    estilosPrograma.principal,
                    { backgroundColor: c.gold, opacity: programaPersonal.activando ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[t.body, { color: c.onGold, fontSize: 13.5, fontFamily: 'Jost_700Bold' }]}>
                    {programaPersonal.activando ? 'Activando…' : 'Empezar'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void programaPersonal.posponer()}
                  accessibilityRole="button"
                  accessibilityLabel="Ahora no. No se borra nada."
                  style={[estilosPrograma.secundario, { borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textSoft, fontSize: 13.5 }]}>Ahora no</Text>
                </Pressable>
              </View>
            </Card>
          ) : null}

          {/* Código Renaser. Va PRIMERO durante los días 1-7 y sólo entonces: es lo único de esta
              pantalla con un plazo de una hora, y el día 8 desaparece por completo (mismo corte
              que el traslado fuera del grupo de bienvenida). A partir de ahí la primera tarjeta
              vuelve a ser la de hábitos. */}
          <TarjetaCodigoRenaser
            estado={radar.estado}
            obligatorio={radar.obligatorio}
            minutosParaAbrir={radar.minutosParaAbrir}
            onResponder={radar.abrir}
          />

          {/* Tarjeta Mapa de Renacimiento (Día 7) */}
          {mostrarMapa ? (
            <Pressable onPress={abrirMapa} accessibilityRole="button">
              <Card style={{ borderColor: c.gold }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  {/* Ya no dice "DÍA 7": está disponible desde el Día 0. El badge de VISTA PREVIA
                      se fue con él — existía para marcar que en desarrollo se veía antes de tiempo,
                      y ahora no hay "antes de tiempo". */}
                  <MicroLabel>MAPA DE RENACIMIENTO</MicroLabel>
                </View>
                <View style={styles.insight}>
                  <Icon name="spark" size={19} color={c.goldInk} />
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text style={[t.cardTitle, { color: c.text }]}>{tituloMapa}</Text>
                    <Text style={[t.body, { color: c.textSoft, fontSize: 12 }]}>{detalleMapa}</Text>
                  </View>
                  <GoldCircle size={40} icon="chevron" />
                </View>
              </Card>
            </Pressable>
          ) : null}

          {/* Tarjeta Hábitos de Hoy — EL HÁBITO DE ESTA HORA, no una frase fija.
              Antes decía siempre "Lidera tu energía diaria" con el contador al lado: el contador
              dice cuánto falta, nunca QUÉ toca. Ahora el título es el hábito que la persona tiene
              delante (`useHabitoDelMomento`) y toca lleva a Training, que es donde se opera. */}
          <Pressable
            onPress={() => (navigation as any).navigate('Training')}
            accessibilityRole="button"
            accessibilityLabel={
              habitoAhora.titulo ? `Abrir Training: ${habitoAhora.titulo}` : 'Abrir Training'
            }
          >
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <MicroLabel>HÁBITOS DE HOY</MicroLabel>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                  {resumen?.habitosHoy ? `${resumen.habitosHoy.completados}/${resumen.habitosHoy.total}` : 'Al día'}
                </Text>
              </View>
              <View style={styles.insight}>
                <Icon name="sun" size={19} color={c.goldInk} />
                <View style={{ gap: 4, flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.text }]} numberOfLines={2}>
                    {tituloHabitoAhora}
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 12 }]}>
                    {detalleHabitoAhora}
                  </Text>
                </View>
                <Icon name="chevron" size={14} color={c.chevron} />
              </View>
            </Card>
          </Pressable>

          {/* Tarjeta Rocas y Objetivos */}
          <Card>
            <Pressable
              onPress={() => (navigation as any).navigate('Plan')}
              style={styles.between}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <MicroLabel>ROCAS Y OBJETIVOS</MicroLabel>
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                    {resumen?.rocasHoy ? `${resumen.rocasHoy.completados}/${resumen.rocasHoy.total}` : 'Pareto 80/20'}
                  </Text>
                </View>
                <Text style={[t.cardTitle, { color: c.text, fontSize: 13.5 }]}>
                  {resumen?.rocasHoy && resumen.rocasHoy.completados > 0
                    ? `${resumen.rocasHoy.completados} de ${resumen.rocasHoy.total} rocas selladas hoy.`
                    : 'Prioridad #1 del día'}
                </Text>
                <Text style={[t.body, { color: c.textSoft, marginTop: 4, fontSize: 12, lineHeight: 18 }]}>
                  {rocaPrioritaria
                    ? `Foco: "${rocaPrioritaria.titulo}"`
                    : 'Define tu Roca Verde en Plan para sostener la dirección.'}
                </Text>
              </View>
              <Icon name="chevron" size={14} color={c.chevron} />
            </Pressable>
          </Card>

          {/* Última evidencia real del Muro: se omiten publicaciones de texto sin evidencia. */}
          {(ultimaPublicacion || cargandoUltimaPublicacion) && (
            <Card style={{ borderColor: c.gold }}>
              {ultimaPublicacion ? (
                <Pressable
                  onPress={() =>
                    (navigation as any).navigate('Comunidad', {
                      abrirPublicacionId: ultimaPublicacion.id,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir la última evidencia de ${ultimaPublicacion.authorName || 'la comunidad'}`}
                  style={styles.between}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.wallActivityHeader}>
                      <MicroLabel>ÚLTIMA EVIDENCIA DEL MURO</MicroLabel>
                      <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                        {tiempoRelativo(ultimaPublicacion.createdAt)}
                      </Text>
                    </View>
                    {/* Lo que se lee primero es QUIEN y QUE dijo, no una miniatura. Antes esta
                        tarjeta decia "Subio una evidencia" y debajo abria una rejilla de recuadros
                        con el rotulo FOTO: cuando la imagen no cargaba —que en el Muro pasa— eran
                        tres cajas vacias ocupando media tarjeta, y el texto de la publicacion, que
                        es lo unico que de verdad cuenta algo, no se mostraba en ningun sitio. */}
                    <View style={styles.insight}>
                      <View style={[styles.wallAvatar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                        <Icon name="user" size={16} color={c.goldInk} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13.5 }]} numberOfLines={1}>
                          {ultimaPublicacion.authorName?.trim() || 'Miembro Renaser'}
                        </Text>
                        {ultimaPublicacion.text?.trim() ? (
                          <Text
                            style={[t.body, { color: c.text, fontSize: 13, lineHeight: 19 }]}
                            numberOfLines={3}
                          >
                            {ultimaPublicacion.text.trim()}
                          </Text>
                        ) : (
                          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 18 }]}>
                            Compartió una evidencia sin texto.
                          </Text>
                        )}
                        {evidenciasUltimaPublicacion.length > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                            <Icon name="camera" size={12} color={c.goldInk} />
                            <Text style={[t.micro, { color: c.goldInk, fontSize: 10.5, fontFamily: 'Jost_500Medium' }]}>
                              {evidenciasUltimaPublicacion.length}
                              {evidenciasUltimaPublicacion.length === 1 ? ' evidencia' : ' evidencias'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Icon name="chevron" size={14} color={c.chevron} />
                </Pressable>
              ) : (
                <View style={styles.wallLoadingRow}>
                  <MicroLabel>CARGANDO ACTIVIDAD DEL MURO...</MicroLabel>
                </View>
              )}
            </Card>
          )}

          {/* Próximo Evento / Mentoría (si el backend lo devuelve) */}
          {resumen?.proximoEvento && (
            <Card>
              <MicroLabel>PRÓXIMO EVENTO</MicroLabel>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <View style={[styles.eventIconBox, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
                  <Icon name="calendar" size={16} color={c.goldInk} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>
                    {resumen.proximoEvento.titulo}
                  </Text>
                  <Text style={[t.micro, { color: c.goldInk, fontSize: 10, marginTop: 2 }]}>
                    {new Date(resumen.proximoEvento.iniciaEn).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </View>
        </Aparicion>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: ESPACIO_PARA_LANZADOR,
    gap: 12,
  },
  programStatusBar: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metricPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  heroCenter: {
    alignItems: 'center',
  },
  definirRocaEnlace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  insight: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'flex-start',
    marginTop: 10,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  wallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallLoadingRow: {
    minHeight: 48,
    justifyContent: 'center',
  },
});

/** Botones de la invitación al programa personal. 48 px: pulsables con una sola mano. */
const estilosPrograma = StyleSheet.create({
  principal: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  secundario: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
});
