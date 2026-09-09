import React, { useCallback, useState } from 'react';
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
import {
  useResumenHome,
  rotuloDeFase,
  DIAS_DEL_PROGRAMA,
} from '../features/home/hooks/useResumenHome';
import { obtenerRocasDeHoy } from '../features/training/api/trainingApi';
import { useUltimaPublicacionMuro } from '../features/community/hooks/useUltimaPublicacionMuro';
import { tiempoRelativo } from '../features/community/utils/tiempoRelativo';
import { FotoMuro } from '../features/community/components/FotoMuro';
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
  const { user } = useAuth();
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
    await Promise.all([recargarResumen(), cargarRocas(), recargarUltimaPublicacion()]);
    setRefreshing(false);
  }, [recargarResumen, cargarRocas, recargarUltimaPublicacion]);

  // Roca Prioritaria de Hoy: Posición 1 (Pareto Verde) o la primera disponible
  const rocaPrioritaria = rocas.find(r => r.posicion === 1) || rocas[0] || null;
  const evidenciasUltimaPublicacion = ultimaPublicacion?.media ?? [];
  const evidenciasVisibles = evidenciasUltimaPublicacion.slice(0, 3);
  const evidenciasRestantes = Math.max(evidenciasUltimaPublicacion.length - evidenciasVisibles.length, 0);

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
  const coherenciaScore = Math.round(resumen?.coherencia ?? 100);
  const puntosLiga = resumen?.puntosLiga ?? 100;
  const rachaActual = resumen?.rachaActual ?? 0;
  const rachaMaxima = resumen?.rachaMaxima ?? 0;

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

          {/* Tarjeta Hábitos de Hoy */}
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
                <Text style={[t.cardTitle, { color: c.text }]}>
                  {resumen?.habitosHoy && resumen.habitosHoy.completados === resumen.habitosHoy.total && resumen.habitosHoy.total > 0
                    ? '¡Todos los hábitos completados!'
                    : 'Lidera tu energía diaria.'}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 12 }]}>
                  {resumen?.habitosHoy
                    ? `${resumen.habitosHoy.completados} de ${resumen.habitosHoy.total} hábitos cumplidos en esta jornada.`
                    : 'Todo lo demás se alinea cuando cumples tu disciplina.'}
                </Text>
              </View>
            </View>
          </Card>

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
                    <View style={styles.insight}>
                      <View style={[styles.wallAvatar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                        <Icon name="user" size={16} color={c.goldInk} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13.5 }]}>
                          {ultimaPublicacion.authorName?.trim() || 'Miembro Renaser'}
                        </Text>
                        <Text style={[t.body, { color: c.textSoft, fontSize: 12, lineHeight: 18 }]}>
                          Subió {evidenciasUltimaPublicacion.length === 1 ? 'una evidencia' : `${evidenciasUltimaPublicacion.length} evidencias`}
                        </Text>
                      </View>
                    </View>
                    {evidenciasUltimaPublicacion.length > 0 && (
                      <View style={styles.wallEvidence}>
                        <MicroLabel>EVIDENCIA</MicroLabel>
                        <View style={[styles.wallEvidenceRow, { height: rs(62) }]}>
                          {evidenciasVisibles.map((media, index) => (
                            <View
                              key={`${media.url}-${index}`}
                              style={[styles.wallEvidenceThumb, { backgroundColor: c.cardBgAlt }]}
                            >
                              <Text style={[t.micro, { color: c.micro, fontSize: 10.5 }]}>FOTO</Text>
                              <FotoMuro
                                url={media.url}
                                mimeType={media.mimeType}
                                radioBorde={9}
                                colorFondo={c.cardBgAlt}
                              />
                            </View>
                          ))}
                          {evidenciasRestantes > 0 && (
                            <View style={[styles.wallEvidenceThumb, styles.wallEvidenceMore, { borderColor: c.border }]}>
                              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]}>+{evidenciasRestantes}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
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
  wallEvidence: {
    marginTop: 12,
    gap: 7,
  },
  wallEvidenceRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  wallEvidenceThumb: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallEvidenceMore: {
    backgroundColor: 'transparent',
  },
});
