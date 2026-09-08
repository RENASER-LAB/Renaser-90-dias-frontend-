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

export default function HoyScreen() {
  const { c, t, mode } = useTheme();
  const isDark = mode === 'dark';
  const { rs, isShort, isTablet, horizontalPadding } = useResponsive();
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

  const ringDiameters = isShort ? [220, 180, 140, 100] : [306, 258, 210, 162];
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
  // Mapa de Renacimiento (Día 7). Aparece desde el Día 7 y se queda hasta activarse: quien se
  // salte ese día no lo pierde. En builds de desarrollo se muestra siempre, marcado como vista
  // previa, para poder probarlo sin esperar una semana de programa — en producción no.
  // Interruptor de salida a producción: en desarrollo siempre; en un build de producción SOLO si
  // EXPO_PUBLIC_MAPA_DIA7=on (variable de Vercel/EAS, inlined al compilar). Así mergear la rama
  // no expone el flujo a las cohortes en curso mientras no exista su backend
  // (docs/MAPA_RENACIMIENTO_DIA7.md §4): encenderlo es un acto deliberado, no un efecto del merge.
  const MAPA_DIA7_HABILITADO = __DEV__ || process.env.EXPO_PUBLIC_MAPA_DIA7 === 'on';
  const esVistaPreviaMapa = __DEV__ && diaNumero < 7;
  const mostrarMapa = MAPA_DIA7_HABILITADO && !!user && (diaNumero >= 7 || __DEV__);
  const tituloMapa = estadoMapa === 'activo'
    ? 'Tu mapa está activo'
    : estadoMapa === 'en_progreso' || estadoMapa === 'listo_para_revision' ? 'Continúa tu mapa' : 'Diseña tu mapa';
  const detalleMapa = estadoMapa === 'activo'
    ? 'Tus objetivos, acciones y protocolo de retorno para los 83 días.'
    : 'Convierte lo aprendido en un plan claro para los próximos 83 días. 15–20 min.';
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
            maxWidth: isTablet ? 560 : undefined,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || cargandoResumen}
            onRefresh={recargarTodo}
            tintColor={c.gold}
            colors={[c.gold]}
          />
        }
      >
        {/* ========================================================================= */}
        {/* 1. BARRA DE ESTADO DEL PROGRAMA & PUNTOS                                  */}
        {/* ========================================================================= */}
        <View style={[styles.programStatusBar, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <View style={{ flex: 1 }}>
            <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1 }]}>
              {faseNombre}
            </Text>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13.5, marginTop: 2 }]}>
              DÍA {diaConocido ?? '—'} DE {DIAS_DEL_PROGRAMA}
            </Text>
          </View>

          <View style={[styles.metricPill, { borderColor: c.gold, backgroundColor: isDark ? 'rgba(212,160,23,0.12)' : 'rgba(212,160,23,0.08)' }]}>
            <Text style={{ fontSize: 12 }}>⚡</Text>
            <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 11 }]}>
              {puntosLiga} PTS
            </Text>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 2. MÉTRICAS CLAVE REALES: COHERENCIA Y RACHA                              */}
        {/* ========================================================================= */}
        <View style={styles.metricsRow}>
          {/* Tarjeta Coherencia Real */}
          <View style={[styles.metricCard, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5, fontWeight: '700' }]}>
                COHERENCIA
              </Text>
              <Text style={{ fontSize: 13 }}>🎯</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
              <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 26, color: c.gold }}>
                {coherenciaScore}
              </Text>
              <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 13, color: c.gold }}>%</Text>
            </View>
            <Text style={[t.micro, { color: c.micro, fontSize: 9, marginTop: 2 }]}>
              {coherenciaScore >= 80 ? 'Nivel de excelencia' : 'Consistencia del día'}
            </Text>
          </View>

          {/* Tarjeta Racha Real */}
          <View style={[styles.metricCard, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 9.5, fontWeight: '700' }]}>
                RACHA ACTUAL
              </Text>
              <Text style={{ fontSize: 13 }}>🔥</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 26, color: c.textStrong }}>
                {rachaActual}
              </Text>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>DÍAS</Text>
            </View>
            <Text style={[t.micro, { color: c.micro, fontSize: 9, marginTop: 2 }]}>
              Récord histórico: {rachaMaxima} d
            </Text>
          </View>
        </View>

        {errorResumen && (
          <View style={[styles.errorBox, { borderColor: '#E06A66', backgroundColor: isDark ? 'rgba(224,106,102,0.1)' : 'rgba(224,106,102,0.05)' }]}>
            <Text style={[t.micro, { color: '#E06A66', textAlign: 'center' }]}>
              {errorResumen}
            </Text>
          </View>
        )}

        {/* ========================================================================= */}
        {/* 3. HERO: CÍRCULOS CONCÉNTRICOS & TU ÚNICO FOCO (ROCA PRIORITARIA DE HOY)  */}
        {/* ========================================================================= */}
        <View style={[styles.hero, { minHeight: isShort ? rs(220) : rs(290) }]}>
          {ringDiameters.map((d, i) => {
            const size = rs(d);
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
            <View
              style={[
                styles.focoBadgePill,
                {
                  borderColor: c.gold,
                  backgroundColor: isDark ? 'rgba(212,160,23,0.15)' : 'rgba(212,160,23,0.08)',
                },
              ]}
            >
              <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 2, fontSize: 9 }]}>
                {rocaPrioritaria ? 'PRIORIDAD #1 · FOCO DEL DÍA' : 'TU ÚNICO FOCO'}
              </Text>
            </View>

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
                      borderColor: rocaPrioritaria.completada ? '#4CAF50' : c.gold,
                      backgroundColor: rocaPrioritaria.completada ? 'rgba(76,175,80,0.15)' : 'rgba(212,160,23,0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      t.micro,
                      {
                        color: rocaPrioritaria.completada ? '#4CAF50' : c.gold,
                        fontWeight: '800',
                        fontSize: 9.5,
                      },
                    ]}
                  >
                    {rocaPrioritaria.completada ? '✓ ROCA COMPLETADA' : '⏳ EN PROCESO'}
                  </Text>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => (navigation as any).navigate('Plan')}
                style={{ marginTop: 6 }}
                hitSlop={8}
              >
                <Text style={[t.micro, { color: c.gold, textAlign: 'center', fontWeight: '600' }]}>
                  Define tu Roca Verde en Plan ➜
                </Text>
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
        <View style={{ gap: 12, paddingBottom: 24 }}>
          {/* Tarjeta Mapa de Renacimiento (Día 7) */}
          {mostrarMapa ? (
            <Pressable onPress={abrirMapa} accessibilityRole="button">
              <Card style={{ borderColor: c.gold }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <MicroLabel>DÍA 7 · MAPA DE RENACIMIENTO</MicroLabel>
                  {esVistaPreviaMapa ? <Text style={[t.micro, { color: c.textSoft }]}>VISTA PREVIA</Text> : null}
                </View>
                <View style={styles.insight}>
                  <Icon name="spark" size={19} color={c.gold} />
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
              <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>
                {resumen?.habitosHoy ? `${resumen.habitosHoy.completados}/${resumen.habitosHoy.total}` : 'Al día'}
              </Text>
            </View>
            <View style={styles.insight}>
              <Icon name="sun" size={19} color={c.gold} />
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
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>
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
                      <Text style={[t.micro, { color: c.gold, fontWeight: '700' }]}>
                        {tiempoRelativo(ultimaPublicacion.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.insight}>
                      <View style={[styles.wallAvatar, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                        <Text style={{ fontSize: 16 }}>👤</Text>
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
                              <Text style={[t.micro, { color: c.micro, fontSize: 9 }]}>FOTO</Text>
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
                <View style={[styles.eventIconBox, { borderColor: c.gold, backgroundColor: isDark ? 'rgba(212,160,23,0.12)' : 'rgba(212,160,23,0.08)' }]}>
                  <Text style={{ fontSize: 16 }}>📅</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 13 }]}>
                    {resumen.proximoEvento.titulo}
                  </Text>
                  <Text style={[t.micro, { color: c.gold, fontSize: 10, marginTop: 2 }]}>
                    {new Date(resumen.proximoEvento.iniciaEn).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
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
  focoBadgePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
