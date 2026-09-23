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
import { space } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { Card, MicroLabel, ScreenHeader, GoldCircle } from '../components/ui';
import { Icon } from '../components/Icon';
import { Aparicion } from '../components/Aparicion';
import { useEsMentor } from '../features/mentor/hooks/useEsMentor';
import { useCelulaQueAcompano } from '../features/mentor/hooks/useCelulaQueAcompano';
import { useProgramaPersonal } from '../features/mentor/hooks/useProgramaPersonal';
import { TarjetaMentorHoy } from '../features/mentor/components/TarjetaMentorHoy';
import { entradaAlGrupoVisible, esLiderDeMentores } from '../features/mentor/utils/entradaAlGrupo';
import { TarjetaBandejaHoy } from '../features/tickets/components/TarjetaBandejaHoy';
import { BandejaTicketsScreen } from '../features/tickets/screens/BandejaTicketsScreen';
import { alAbrirAviso, consumirRutaPendiente } from '../features/mentor/notificaciones/rutaDeAviso';
import { AdminScreen } from '../features/admin/screens/AdminScreen';
import { TarjetaAdminHoy } from '../features/admin/components/TarjetaAdminHoy';
import { TarjetaConfrontacion } from '../features/confrontacion/components/TarjetaConfrontacion';
import { ParticulaDeRitmo } from '../features/home/components/ParticulaDeRitmo';
import { ritmoDelDia } from '../features/home/utils/ritmoDelDia';
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
import { OrbeAcompanante } from '../features/renasia/components/OrbeAcompanante';
import { RenasiaPanel } from '../features/renasia/screens/RenasiaPanel';
import { useConversacionPorVoz, type FaseDeVoz } from '../features/renasia/hooks/useConversacionPorVoz';

/** Lo que se lee debajo del orbe: la fase dicha con texto, para quien no ve la animación. */
function rotuloDelOrbe(fase: FaseDeVoz, disponible: boolean): string {
  if (!disponible) return 'Toca para escribirle';
  switch (fase) {
    case 'escuchando':
      return 'Te escucho… toca de nuevo para terminar';
    case 'pensando':
      return 'Pensando…';
    case 'hablando':
      return 'Toca para que se calle';
    default:
      return 'Toca y háblame';
  }
}

export default function HoyScreen() {
  const { c, t } = useTheme();
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
  /* La bandeja de tickets: la unica pantalla propia del LIDER DE MENTORES. Se monta como estado
     de Hoy, igual que Administracion y que las vistas del mentor — no como un tab nuevo. */
  const esLider = esLiderDeMentores(user?.role);
  const [enBandejaTickets, setEnBandejaTickets] = useState(false);
  // El orbe del centro (2026-09-23): conversación por voz con el acompañante, y su chat para
  // confirmar propuestas o leer la respuesta completa.
  const voz = useConversacionPorVoz();
  const [chatDelOrbeAbierto, setChatDelOrbeAbierto] = useState(false);
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
  /* El ritmo del día: lo que decide si la partícula del hero viaja, va lento o se detiene.
     Se calcula con lo ÚNICO que hoy se mueve de verdad —hábitos y roca cumplidos— y no con
     coherencia ni racha, que el backend no calcula (`ritmoDelDia` lo explica con la evidencia).
     La regla vive afuera, en una función pura y probada; acá solo se le pasan los datos. */
  const ritmo = ritmoDelDia({
    habitosCompletados: resumen?.habitosHoy?.completados ?? 0,
    habitosTotal: resumen?.habitosHoy?.total ?? 0,
    rocaCompletada: rocaPrioritaria ? rocaPrioritaria.completada : null,
  });
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

  // `null` = todavía no planificó ninguna acción diaria esta semana, y eso NO es un 100 (D-128).
  // Hasta el 2026-09-15 acá había `?? 100`: con el backend caído, sin datos, o sin haber hecho
  // nada, la pantalla decía "100 % · Nivel de excelencia". Ahora dice "—".
  const coherenciaScore =
    resumen?.coherencia === null || resumen?.coherencia === undefined
      ? null
      : Math.round(resumen.coherencia);
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
  /* Misma forma que Administracion: pantalla completa, y el retroceso del sistema la cierra
     (la registra ella con su `useSystemBackHandler`). */
  if (enBandejaTickets && esLider) {
    return <BandejaTicketsScreen onVolver={() => setEnBandejaTickets(false)} />;
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
        {/* Era una tarjeta con borde que contenía otra caja con borde (la píldora de puntos):
            dos rectángulos anidados para decir dos datos. Ahora es una línea de encabezado
            —fase arriba, día debajo, puntos al margen— sin borde ni fondo propios. Lo que la
            separa de lo que sigue es el espacio, no un contorno. */}
        <View style={styles.programStatusBar}>
          <View style={{ flex: 1 }}>
            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
              {faseNombre}
            </Text>
            <Text style={[t.cardTitle, styles.cifras, { color: c.textStrong, fontSize: 15, marginTop: 3 }]}>
              DÍA {diaConocido ?? '—'} DE {DIAS_DEL_PROGRAMA}
            </Text>
          </View>

          <View style={[styles.metricPill, { backgroundColor: c.goldWash }]}>
            <Icon name="zap" size={12} color={c.goldInk} />
            <Text style={[t.micro, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
              {puntosLiga} PTS
            </Text>
          </View>
        </View>

        {/* La frase de confrontación del día. Va acá —pegada a "DÍA n DE 90" y ANTES de las
            métricas— porque la guía del cliente es explícita sobre para qué sirve: revelar, no
            informar. Debajo de los números ya sería un dato más. */}
        <TarjetaConfrontacion diaPrograma={diaConocido} />

        {/* ========================================================================= */}
        {/* 2. MÉTRICAS CLAVE REALES: COHERENCIA Y RACHA                              */}
        {/* ========================================================================= */}
        </Aparicion>

        <Aparicion retardo={70}>
        {/* Eran dos tarjetas con borde y fondo, una dorada y la otra gris sin motivo. Ahora son
            dos columnas de texto sobre el fondo de la pantalla, separadas por UNA línea de pelo:
            el único borde que queda es el que de verdad hace falta, porque sin él las dos cifras
            se leerían como una sola frase. El icono ya no se va al margen derecho — acompaña al
            rótulo, y todo el bloque se lee de izquierda a derecha. */}
        <View style={styles.metricsRow}>
          {/* Coherencia real */}
          <View style={styles.metricBloque}>
            <View style={styles.metricEncabezado}>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
                COHERENCIA
              </Text>
              <Icon name="target" size={14} color={c.goldInk} />
            </View>
            <View style={styles.metricCifra}>
              <Text style={[t.metric, { color: c.goldInk }]}>
                {coherenciaScore ?? '—'}
              </Text>
              {coherenciaScore !== null && (
                <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 15, color: c.goldInk }}>%</Text>
              )}
            </View>
            <Text style={[t.small, { color: c.micro, fontSize: 12, marginTop: 4 }]}>
              {coherenciaScore === null
                ? 'Planifica tu semana para verla'
                : coherenciaScore >= 80
                  ? 'Nivel de excelencia'
                  : 'Consistencia del día'}
            </Text>
          </View>

          <View style={[styles.metricSeparador, { backgroundColor: c.divider }]} />

          {/* Racha real */}
          <View style={styles.metricBloque}>
            <View style={styles.metricEncabezado}>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
                RACHA ACTUAL
              </Text>
              <Icon name="fire" size={14} color={rachaActual > 0 ? c.goldInk : c.chevron} />
            </View>
            <View style={styles.metricCifra}>
              <Text style={[t.metric, { color: c.textStrong }]}>
                {rachaActual}
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>DÍAS</Text>
            </View>
            <Text style={[t.small, { color: c.micro, fontSize: 12, marginTop: 4 }]}>
              Récord histórico: {rachaMaxima} d
            </Text>
          </View>
        </View>

        {errorResumen && (
          <View style={[styles.errorBox, { backgroundColor: c.dangerWash, borderLeftColor: c.danger }]}>
            <Text style={[t.small, { color: c.danger }]}>
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
          {/* La partícula orbita sobre el anillo exterior: es el único radio donde no se cruza
              con el texto del centro en un teléfono chico. */}
          <ParticulaDeRitmo ritmo={ritmo.ritmo} diametro={ringDiameters[0]} />
          {/* El centro del hero es el acompañante por voz (pedido del dueño, 2026-09-23). Antes
              decía "TU ÚNICO FOCO / AHORA" (o la roca prioritaria del día) y llevaba a Plan; ese
              dato se le pregunta ahora al propio acompañante ("¿cuál es mi foco de hoy?"), que lo
              lee con consultar_rocas. Tocar el orbe: escucha, piensa y responde en voz alta. */}
          <View style={styles.heroCenter}>
            <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_500Medium', fontSize: 10.5, textAlign: 'center' }]}>
              TU ACOMPAÑANTE
            </Text>
            <View style={{ marginTop: isShort ? 10 : 14 }}>
              <OrbeAcompanante
                fase={voz.fase}
                diametro={Math.min(140, Math.round(heroSize * 0.58))}
                onTocar={voz.disponible ? voz.tocar : () => setChatDelOrbeAbierto(true)}
              />
            </View>
            <Text
              numberOfLines={2}
              style={[t.small, { color: c.textSoft, marginTop: isShort ? 10 : 14, textAlign: 'center', paddingHorizontal: 24 }]}
            >
              {rotuloDelOrbe(voz.fase, voz.disponible)}
            </Text>
          </View>
        </View>

        {voz.loQueDijiste || voz.respuesta || voz.error ? (
          <View style={[styles.conversacionVoz, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {voz.loQueDijiste ? (
              <Text style={[t.small, { color: c.textSoft }]} numberOfLines={2}>
                Tú: {voz.loQueDijiste}
              </Text>
            ) : null}
            {voz.respuesta ? (
              <Text style={[t.body, { color: c.text, fontSize: rs(14.5), lineHeight: rs(21) }]} numberOfLines={6}>
                {voz.respuesta.replace(/[*_#`]+/g, '')}
              </Text>
            ) : null}
            {voz.error ? <Text style={[t.small, { color: c.danger }]}>{voz.error}</Text> : null}
            {voz.propuestas > 0 ? (
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>
                Tienes {voz.propuestas === 1 ? 'una propuesta' : `${voz.propuestas} propuestas`} para confirmar en el chat.
              </Text>
            ) : null}
            <Pressable
              onPress={() => setChatDelOrbeAbierto(true)}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.definirRocaEnlace, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>Ver en el chat</Text>
              <Icon name="arrow" size={12} color={c.goldInk} />
            </Pressable>
          </View>
        ) : null}
        <RenasiaPanel agent="COMPANION" visible={chatDelOrbeAbierto} onClose={() => setChatDelOrbeAbierto(false)} />

        {/* ========================================================================= */}
        {/* 4. TARJETAS DE PROGRESO Y CONTADORES REALES DEL DÍA                       */}
        {/* ========================================================================= */}
        </Aparicion>

        <Aparicion retardo={210} style={{ paddingBottom: 24 }}>
        <View style={{ gap: space.gap }}>
          {/* Solo para ADMIN/ALQUIMISTA. El resto de Hoy no cambia para nadie. */}
          {capacidades.administrar ? <TarjetaAdminHoy onAbrir={() => setEnAdministracion(true)} /> : null}

          {/* Solo para quien acompana una celula. El resto de Hoy no cambia.

              La condicion vive en `entradaAlGrupoVisible` y no aca: un LIDER DE MENTORES contaba
              como mentor, pero el backend no le deja tener grupo asignado, asi que esta tarjeta
              le decia para siempre que no tiene aprendices. Para todos los demas roles la
              funcion devuelve exactamente lo que devolvia `esMentor`. */}
          {entradaAlGrupoVisible({ esMentor, rol: user?.role, fallo: celula.fallo }) ? (
            <TarjetaMentorHoy
              onAbrir={() => setVistaMentor('celula')}
              vista={celula.vista}
              cargando={celula.cargando}
              fallo={celula.fallo}
            />
          ) : null}

          {/* Solo para el LIDER DE MENTORES: es su unica pantalla propia, y el permiso
              `VIEW_ALL_MENTOR_TICKETS` ya lo tiene. Ningun otro rol ve esta tarjeta — los
              administradores tienen su propia entrada, y para el resto esta condicion es falsa,
              asi que Hoy no cambia para nadie mas. */}
          {esLider ? <TarjetaBandejaHoy onAbrir={() => setEnBandejaTickets(true)} /> : null}

          {/*
            Invitación secundaria, no un bloqueo. Acompañar no exige cursar (D-07), así que esto
            es una oferta: quien dice "Ahora no" sigue trabajando igual y no pierde ningún dato —
            posponer no llama a nada, y menos al DELETE, que borraría la participación entera.
          */}
          {programaPersonal.visible ? (
            <Card>
              <MicroLabel>Tu programa</MicroLabel>
              <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 8 }]}>
                Hacer mi programa de 90 días
              </Text>
              {/* Era `fontSize: 13`, por debajo del mínimo de párrafo de AGENTS.md §4 (14–15.5).
                  Se usa `t.body` tal cual: 15/22, que es lo que el token ya define. */}
              <Text style={[t.body, { color: c.textSoft, marginTop: 8 }]}>
                Puedes recorrerlo tú también: tus hábitos, tus objetivos y tu Mapa, con tu propio
                día. No cambia nada de lo que ves como acompañante.
              </Text>
              {programaPersonal.error ? (
                <Text style={[t.small, { color: c.danger, marginTop: 10 }]}>
                  {programaPersonal.error}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
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
                  <Text style={[t.body, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>
                    {programaPersonal.activando ? 'Activando…' : 'Empezar'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void programaPersonal.posponer()}
                  accessibilityRole="button"
                  accessibilityLabel="Ahora no. No se borra nada."
                  style={[estilosPrograma.secundario, { borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textSoft }]}>Ahora no</Text>
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
              {/* Sin el `borderColor: c.gold`: subrayar una tarjeta con un contorno dorado es
                  destacar por adorno. Esta tarjeta ya destaca por lo que dice y por el círculo
                  dorado que lleva dentro; el contorno sólo la desalineaba del resto. */}
              <Card>
                {/* Ya no dice "DÍA 7": está disponible desde el Día 0. El badge de VISTA PREVIA
                    se fue con él — existía para marcar que en desarrollo se veía antes de tiempo,
                    y ahora no hay "antes de tiempo". */}
                <MicroLabel>Mapa de renacimiento</MicroLabel>
                <View style={styles.insight}>
                  <Icon name="spark" size={19} color={c.goldInk} />
                  <View style={{ gap: 5, flex: 1 }}>
                    <Text style={[t.cardTitle, { color: c.text }]}>{tituloMapa}</Text>
                    <Text style={[t.small, { color: c.textSoft }]}>{detalleMapa}</Text>
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
              <View style={styles.encabezadoTarjeta}>
                <MicroLabel>Hábitos de hoy</MicroLabel>
                <Text style={[t.micro, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                  {resumen?.habitosHoy ? `${resumen.habitosHoy.completados}/${resumen.habitosHoy.total}` : 'Al día'}
                </Text>
              </View>
              <View style={styles.insight}>
                <Icon name="sun" size={19} color={c.goldInk} />
                <View style={{ gap: 5, flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.text }]} numberOfLines={2}>
                    {tituloHabitoAhora}
                  </Text>
                  <Text style={[t.small, { color: c.textSoft }]}>
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
                <View style={styles.encabezadoTarjeta}>
                  <MicroLabel>Acciones y objetivos</MicroLabel>
                  <Text style={[t.micro, styles.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                    {resumen?.rocasHoy ? `${resumen.rocasHoy.completados}/${resumen.rocasHoy.total}` : 'Pareto 80/20'}
                  </Text>
                </View>
                {/* Era 13.5: el mismo papel que el título de las otras tarjetas, dos puntos y
                    medio más chico. Ahora todas usan `t.cardTitle` sin retoque. */}
                <Text style={[t.cardTitle, { color: c.text, marginTop: 12 }]}>
                  {resumen?.rocasHoy && resumen.rocasHoy.completados > 0
                    ? `${resumen.rocasHoy.completados} de ${resumen.rocasHoy.total} acciones selladas hoy.`
                    : 'Prioridad #1 del día'}
                </Text>
                <Text style={[t.small, { color: c.textSoft, marginTop: 5 }]}>
                  {rocaPrioritaria
                    ? `Foco: "${rocaPrioritaria.titulo}"`
                    : 'Define tu objetivo en Plan para sostener la dirección.'}
                </Text>
              </View>
              <Icon name="chevron" size={14} color={c.chevron} />
            </Pressable>
          </Card>

          {/* Última evidencia real del Muro: se omiten publicaciones de texto sin evidencia. */}
          {(ultimaPublicacion || cargandoUltimaPublicacion) && (
            /* Sin contorno dorado, por lo mismo que la tarjeta del Mapa: dos tarjetas con borde
               de color y cinco sin él no es jerarquía, es ruido. */
            <Card>
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
                      <MicroLabel>Última evidencia del muro</MicroLabel>
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
                      {/* El avatar llevaba borde dorado DENTRO de una tarjeta que ya tiene borde:
                          un círculo con contorno pegado a un rectángulo con contorno. Ahora es un
                          disco lleno de lavado dorado, sin línea. */}
                      <View style={[styles.wallAvatar, { backgroundColor: c.goldWash }]}>
                        <Icon name="user" size={16} color={c.goldInk} />
                      </View>
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={1}>
                          {ultimaPublicacion.authorName?.trim() || 'Miembro Renaser'}
                        </Text>
                        {ultimaPublicacion.text?.trim() ? (
                          <Text
                            style={[t.body, { color: c.text }]}
                            numberOfLines={3}
                          >
                            {ultimaPublicacion.text.trim()}
                          </Text>
                        ) : (
                          <Text style={[t.small, { color: c.textSoft }]}>
                            Compartió una evidencia sin texto.
                          </Text>
                        )}
                        {evidenciasUltimaPublicacion.length > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <Icon name="camera" size={12} color={c.goldInk} />
                            <Text style={[t.micro, { color: c.goldInk, fontSize: 11, fontFamily: 'Jost_500Medium' }]}>
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
                  <MicroLabel>Cargando actividad del muro...</MicroLabel>
                </View>
              )}
            </Card>
          )}

          {/* Próximo Evento / Mentoría (si el backend lo devuelve) */}
          {resumen?.proximoEvento && (
            <Card>
              <MicroLabel>Próximo evento</MicroLabel>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                {/* Mismo caso que el avatar del muro: el borde dorado de este cuadradito estaba
                    dentro del borde de la tarjeta. Queda el disco lavado, sin línea. */}
                <View style={[styles.eventIconBox, { backgroundColor: c.goldWash }]}>
                  <Icon name="calendar" size={16} color={c.goldInk} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong }]}>
                    {resumen.proximoEvento.titulo}
                  </Text>
                  {/* Era 10 px, por debajo del mínimo de micro-etiqueta (10.5) y encima con
                      cifras que cambian. A 12 con cifras tabulares se lee y no baila. */}
                  <Text style={[t.small, styles.cifras, { color: c.goldInk, fontSize: 12, marginTop: 3 }]}>
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
  /* `gapLg` y no `gap` entre los cuatro bloques de la pantalla (encabezado, métricas, hero,
     tarjetas). Con 12 px todo se leía como una lista continua; con 28 cada bloque se reconoce
     solo, que es lo que antes intentaban hacer los bordes. */
  content: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    paddingBottom: ESPACIO_PARA_LANZADOR,
    gap: space.gapLg,
  },
  /** Cifras que cambian en pantalla: ancho de dígito fijo para que nada salte (AGENTS.md §4). */
  cifras: {
    fontVariant: ['tabular-nums'],
  },
  programStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metricPill: {
    borderRadius: space.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.gap,
  },
  metricBloque: {
    flex: 1,
  },
  metricEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metricCifra: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 6,
  },
  /** El único borde que sobrevive en este bloque, y sólo porque separa dos cifras contiguas. */
  metricSeparador: {
    width: 1,
    alignSelf: 'stretch',
  },
  /* Regla lateral en vez de recuadro completo: el mismo gesto que usa la frase del día, y no
     mete otra caja con borde en una pantalla que acaba de perder tres. */
  errorBox: {
    borderLeftWidth: 2,
    borderRadius: space.radiusSm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: space.gap,
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
  conversacionVoz: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  heroCenter: {
    alignItems: 'center',
  },
  /** 48 px, como todo lo pulsable (AGENTS.md §4). Estaba en 44. */
  definirRocaEnlace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: space.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 12,
  },
  /** Rótulo de la tarjeta y su contador. El aire hacia el contenido lo pone `insight`. */
  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  insight: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginTop: 14,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  wallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallLoadingRow: {
    minHeight: 48,
    justifyContent: 'center',
  },
});

/**
 * Botones de la invitación al programa personal. 48 px: pulsables con una sola mano.
 *
 * El borde de `secundario` **se conserva a propósito**, aunque viva dentro de una tarjeta que ya
 * tiene el suyo: es un control, no decoración. Sin contorno, "Ahora no" queda como texto suelto
 * al lado de un botón relleno, y para alguien de 40–60 deja de parecer pulsable. La regla de esta
 * pasada es quitar los bordes que sólo adornan, no los que dicen "esto se toca".
 */
const estilosPrograma = StyleSheet.create({
  principal: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: space.radiusSm,
  },
  secundario: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: space.radiusSm,
    borderWidth: 1,
  },
});
