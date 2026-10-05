import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { GoldButton } from '../../../components/GoldButton';
import { MarcoDePaso } from '../components/MarcoDePaso';
import { OpcionElegible } from '../components/OpcionElegible';
import { tacto } from '../../../utils/tacto';
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

/**
 * «Martes 6 de octubre». Mayúscula sólo al principio: la pantalla usaba `textTransform: 'capitalize'`,
 * que pone mayúscula a CADA palabra y mostraba «Martes 6 De Octubre» (corregido 2026-10-05).
 */
function formatearFecha(iso: string): string {
  const fecha = fechaLocalDesdeIso(iso);
  const texto = `${NOMBRES_DIA[fecha.getDay()]} ${fecha.getDate()} de ${NOMBRES_MES[fecha.getMonth()]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function ActivarProgramaScreen({ onActivated }: ActivarProgramaScreenProps) {
  const { c, t } = useTheme();

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
      tacto.logro();
      onActivated();
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos activar tu programa. Revisa tu conexión e inténtalo de nuevo.'));
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <MarcoDePaso
      pie={
        <GoldButton
          label="CONFIRMAR MI DÍA 1"
          onPress={handleConfirmar}
          disabled={!seleccionada || cargando}
          loading={confirmando}
          icon="check"
        />
      }
    >
      {/* Mismos textos; el encabezado va como en el resto del onboarding desde el 2026-10-05
          (alineado a la izquierda, sin el medallón con el calendario). */}
      <View style={styles.headerBlock}>
        <Text style={[t.micro, { color: c.micro, textTransform: 'uppercase' }]}>Un último paso</Text>
        <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
          Elige tu Día 1
        </Text>
        <Text style={[t.body, { color: c.textSoft }]}>
          Tu programa de 90 días arranca el día que elijas. No puede ser hoy, para que puedas
          planificarte y dejar listos tus hábitos antes de que empiece a correr la cuenta.
        </Text>
      </View>

      {cargando ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={c.goldInk} />
        </View>
      ) : (
        <View accessibilityRole="radiogroup" style={styles.dateOptionsGroup}>
          {fechas.map(fecha => (
            <OpcionElegible
              key={fecha}
              etiqueta={formatearFecha(fecha)}
              elegida={seleccionada === fecha}
              onElegir={() => setSeleccionada(fecha)}
            />
          ))}
        </View>
      )}

      {error ? (
        <View style={[styles.alertBox, { backgroundColor: c.dangerWash, borderColor: c.danger }]}>
          <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{error}</Text>
        </View>
      ) : null}
    </MarcoDePaso>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: 8,
    marginBottom: 24,
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
  alertBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 16,
  },
});
