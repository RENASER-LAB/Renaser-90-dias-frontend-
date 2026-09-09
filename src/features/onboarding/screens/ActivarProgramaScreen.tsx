import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { Icon } from '../../../components/Icon';
import { GoldButton } from '../../../components/GoldButton';
import * as onboardingApi from '../api/onboardingApi';
import { mensajeDeError } from '../../../services/http/apiClient';

/**
 * Último paso del onboarding, entre Términos y el Home: elegir el Día 1 del programa. (El Pacto —
 * "VERDAD", Código I — salió del onboarding inicial el 2026-09-03, hasta una futura actualización
 * del cliente; ver el comentario en `OnboardingFlow.tsx`.)
 *
 * El backend (`ParticipacionPrograma.activarPrograma`, `GET/POST /onboarding/activate-program`)
 * ya existía y estaba probado, pero ninguna pantalla lo llamaba — `OnboardingFlow` pasaba directo
 * de Términos a `completeOnboarding`. Sin esto la persona nunca elegía fecha, así que
 * `diaPrograma` quedaba en 0 (programa nunca activado) para siempre.
 *
 * Las fechas ofrecidas son siempre mañana/+2/+3 en SU zona horaria — nunca hoy (ver el javadoc del
 * backend: firmar de tarde y elegir "hoy" dejaría un Día 1 de pocas horas). Es justo la ventana
 * para "programar sus hábitos" antes de que arranque la cuenta de los 90 días.
 */

interface ActivarProgramaScreenProps {
  onActivated: () => void;
}

const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * El backend manda `yyyy-MM-dd` (`LocalDate`, sin hora). `new Date(iso)` lo interpreta como
 * medianoche UTC y en husos horarios negativos (América) puede mostrar el día ANTERIOR — por eso
 * se arma la fecha local a mano, componente por componente, en vez de parsear el string directo.
 */
function fechaLocalDesdeIso(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function formatearFecha(iso: string): string {
  const fecha = fechaLocalDesdeIso(iso);
  return `${NOMBRES_DIA[fecha.getDay()]} ${fecha.getDate()} de ${NOMBRES_MES[fecha.getMonth()]}`;
}

export function ActivarProgramaScreen({ onActivated }: ActivarProgramaScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { isSmall, isTablet, contentMaxWidth, horizontalPadding } = useResponsive();

  const [cargando, setCargando] = useState(true);
  const [fechas, setFechas] = useState<string[]>([]);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No hay a dónde volver desde acá: Términos ya quedó firmado y guardado. Tragarse el gesto de
  // retroceso evita que la persona salga a mitad de elegir su fecha de inicio.
  useSystemBackHandler(() => true, true);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const estado = await onboardingApi.consultarActivacionPrograma();
        if (!vigente) return;
        if (estado.activated) {
          // Ya estaba activado (ej. la persona cerró la app a mitad de este paso y volvió): no
          // hay nada que elegir, seguir directo al Home.
          onActivated();
          return;
        }
        setFechas(estado.validStartDates);
        setSeleccionada(estado.validStartDates[0] ?? null);
      } catch (e) {
        if (!vigente) return;
        setError(mensajeDeError(e, 'No pudimos cargar las fechas disponibles. Revisa tu conexión.'));
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [onActivated]);

  const handleConfirmar = async () => {
    if (!seleccionada || confirmando) return;
    setConfirmando(true);
    setError(null);
    try {
      await onboardingApi.activarPrograma({ startDate: seleccionada });
      onActivated();
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos activar tu programa. Revisa tu conexión e intentá de nuevo.'));
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
        <View />
        <Pressable
          hitSlop={10}
          onPress={toggle}
          accessibilityRole="button"
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name={mode === 'light' ? 'moon' : 'sun'} size={15} color={c.goldInk} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isSmall ? 16 : isTablet ? 32 : 20,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={[styles.goldLogoBadge, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <Icon name="calendar" size={24} color={c.goldInk} />
          </View>
        </View>

        <View style={styles.headerBlock}>
          <Text style={[t.micro, { color: c.textSoft, fontSize: 11, letterSpacing: 1.5, textAlign: 'center' }]}>
            UN ÚLTIMO PASO
          </Text>
          <Text style={[t.screenTitle, { color: c.goldInk, fontSize: 22, fontFamily: 'Jost_700Bold', letterSpacing: 0.5, marginTop: 4, textAlign: 'center' }]}>
            ELEGÍ TU DÍA 1
          </Text>
          <View style={[styles.goldDivider, { backgroundColor: c.gold }]} />
          <Text style={[t.body, { color: c.textSoft, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12 }]}>
            Tu programa de 90 días arranca el día que elijas. Nunca puede ser hoy: así tienes tiempo
            de programar tus hábitos antes de que empiece a correr la cuenta.
          </Text>
        </View>

        {cargando ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={c.goldInk} />
          </View>
        ) : (
          <View style={styles.dateOptionsGroup}>
            {fechas.map(fecha => {
              const activa = seleccionada === fecha;
              return (
                <Pressable
                  key={fecha}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: seleccionada === fecha }}
                  onPress={() => setSeleccionada(fecha)}
                  style={[
                    styles.dateCard,
                    {
                      borderColor: activa ? c.gold : c.borderStrong,
                      backgroundColor: activa ? c.cardBgAlt : c.cardBg,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: activa ? c.gold : c.tabInactive,
                        backgroundColor: activa ? c.gold : 'transparent',
                      },
                    ]}
                  >
                    {activa && <View style={[styles.radioInnerDot, { backgroundColor: c.onGold }]} />}
                  </View>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 15, fontFamily: 'Jost_500Medium', textTransform: 'capitalize' }]}>
                    {formatearFecha(fecha)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {error ? (
          <View style={[styles.alertBox, { backgroundColor: 'rgba(217, 83, 79, 0.08)', borderColor: 'rgba(217, 83, 79, 0.25)' }]}>
            <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{error}</Text>
          </View>
        ) : null}

        <GoldButton
          label="CONFIRMAR MI DÍA 1"
          onPress={handleConfirmar}
          disabled={!seleccionada || cargando}
          loading={confirmando}
          icon="check"
          style={{ marginTop: 8, width: '100%' }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
  },
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
    alignItems: 'center',
  },
  logoSection: {
    paddingTop: 10,
    alignItems: 'center',
  },
  goldLogoBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    width: '100%',
  },
  goldDivider: {
    width: 44,
    height: 1.5,
    marginTop: 8,
    borderRadius: 1,
  },
  loadingBox: {
    width: '100%',
    paddingVertical: 24,
    alignItems: 'center',
  },
  dateOptionsGroup: {
    gap: 10,
    width: '100%',
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* El punto era blanco sobre el relleno dorado del circulo: 2.95:1 en modo claro, y en el
     elemento mas pequeno de la pantalla (7px). `onGold` es la tinta pensada para ir encima del
     dorado, la misma que usa el boton principal. */
  radioInnerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  alertBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
