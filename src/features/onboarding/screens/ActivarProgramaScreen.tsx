import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { MarcoDePaso } from '../components/MarcoDePaso';
import { tacto } from '../../../utils/tacto';
import * as onboardingApi from '../api/onboardingApi';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { avisarDiaUnoElegido } from '../../programa/events/avisoDiaUnoElegido';
import { useFormacionDeLaSesion } from '../../formaciones/context/FormacionContext';
import { useActivacionAlFirmar } from '../hooks/useActivacionAlFirmar';
import {
  AVISO_COMPROBANDO,
  AVISO_FECHA_CAMBIO,
  AVISO_SIN_RED_AL_ACTIVAR,
  AVISO_SIN_RED_AL_LEER,
  BOTON_ENTENDIDO,
  TEXTO_PREPARANDO,
  TITULO_EMPIEZA_MANANA,
  fechaDelDiaUno,
  lineaDelPlazo,
} from '../utils/textoDelDiaUno';

/**
 * Último paso del onboarding, entre Términos y el Home: «Tu programa empieza mañana» (spec 036, D-309, cambio de gerencia del 2026-11-02).
 * Antes era «Elige tu Día 1», con tres fechas a elegir; ahora **la persona no elige nada**: el servidor pone el Día 1 en mañana, en SU zona
 * horaria, y esta pantalla solo se lo dice y pide el «Entendido» que activa el programa. (El Pacto —"VERDAD", Código I— salió del onboarding
 * inicial el 2026-09-03, hasta una futura actualización del cliente; ver el comentario en `OnboardingFlow.tsx`.)
 *
 * Qué dice, poco a propósito (el dueño pidió poco texto): el título, la fecha («Martes 3 de noviembre»), una línea con el plazo de SU programa
 * («Son tus 90 días.», «Son tus 3 meses.», «Es tu año.») y «Entendido».
 *
 * La fecha **la manda el servidor** (`GET /onboarding/activate-program` → `validStartDates[0]`) y es la que se envía al activar: así, si la
 * persona dejó la pantalla abierta pasada la medianoche, el servidor responde 400 (ya no es «mañana»), la pantalla vuelve a leer, muestra la
 * fecha nueva con un aviso corto y NUNCA se activa con un día distinto al que se vio. Contra un servidor anterior (que ofrece tres fechas) la
 * primera es mañana, así que también funciona. Sin red: el mismo botón «Entendido» reintenta, y si ni se pudo leer la fecha, «Reintentar».
 *
 * **En el onboarding el programa se activa solo** (`activarAlMontar`, ajuste del dueño del 2026-11-02: «después de la ficha inicial ya no le sale qué día
 * escogerá. Firma, y al día siguiente ya es su día número 1»): al llegar a esta pantalla, justo después de firmar los Términos —o al volver a abrir la
 * app con los Términos firmados—, se manda `POST /onboarding/activate-program` sin fecha (el servidor pone mañana y, si ya estaba activado, responde 200)
 * una sola vez. Mientras responde dice «Preparando tu programa…» y no muestra ninguna fecha; con la respuesta, la fecha y el plazo, y «Entendido» solo
 * continúa a la app. Sin red: el mensaje de siempre y «Reintentar». Quien cerró la app sin tocar «Entendido» ya quedó activado. Las demás entradas
 * (el personal desde Hoy, Plan, Yo, Training o Mi Radar, y las cuentas anteriores sin Día 1) siguen necesitando el toque, porque para el personal el
 * programa es opcional: ahí la pantalla es la de arriba (lee la fecha, «Entendido» activa).
 *
 * El backend (`ParticipacionPrograma.activarPrograma`, `GET/POST /onboarding/activate-program`) ya existía y estaba probado, pero ninguna pantalla
 * lo llamaba — `OnboardingFlow` pasaba directo de Términos a `completeOnboarding`. Sin esto la persona nunca activaba el programa, así que
 * `diaPrograma` quedaba en 0 (programa nunca activado) para siempre.
 */

interface ActivarProgramaScreenProps {
  onActivated: () => void;
  /**
   * Activa el programa solo al montarse, sin esperar el toque (spec 036): es el último paso del onboarding, después de firmar los Términos. Sin esto
   * —el personal que se suma desde Hoy, Plan, Yo, Training o Mi Radar— «Entendido» es lo que activa.
   */
  activarAlMontar?: boolean;
  /**
   * Volver sin activar. Solo fuera del onboarding (D-260): el personal abre esta misma pantalla desde «Empezar mañana» en Training, Hoy, Plan,
   * Yo o Mi Radar, y ahí sí tiene a dónde volver. En el onboarding no viene, y la pantalla sigue tragándose el gesto de retroceso como siempre.
   */
  alVolver?: () => void;
}

export function ActivarProgramaScreen({ onActivated, activarAlMontar = false, alVolver }: ActivarProgramaScreenProps) {
  const { c, t } = useTheme();
  /* El plazo que se nombra es el del programa de esta persona (90 días, 3 meses, 1 año), no siempre 90 días. */
  const { formacion } = useFormacionDeLaSesion();

  /* En el onboarding el programa se activa solo: la lectura de la fecha y el toque de «Entendido» de abajo son del otro camino. */
  const sola = useActivacionAlFirmar(activarAlMontar);
  const [cargando, setCargando] = useState(!activarAlMontar);
  /* La fecha de mañana, tal como la manda el servidor (`yyyy-MM-dd`). */
  const [fecha, setFecha] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState(0);

  // En el onboarding no hay a dónde volver desde acá: Términos ya quedó firmado y guardado. Tragarse
  // el gesto de retroceso evita que la persona salga a mitad de este paso. Fuera del onboarding
  // (`alVolver`), atrás cierra la pantalla sin activar nada.
  useSystemBackHandler(() => {
    alVolver?.();
    return true;
  }, true);

  useEffect(() => {
    if (activarAlMontar) return;
    let vigente = true;
    setCargando(true);
    setFecha(null);
    (async () => {
      try {
        const estado = await onboardingApi.consultarActivacionPrograma();
        if (!vigente) return;
        if (estado.activated) {
          // Ya estaba activado (ej. la persona cerró la app a mitad de este paso y volvió): no
          // hay nada que hacer, seguir directo al Home.
          avisarDiaUnoElegido();
          onActivated();
          return;
        }
        // Mañana es la primera (y desde la spec 036 la única); contra un servidor anterior, que ofrecía tres, también es la primera.
        const manana = estado.validStartDates[0] ?? null;
        setFecha(manana);
        if (!manana) setError(AVISO_SIN_RED_AL_LEER);
      } catch (e) {
        if (!vigente) return;
        setError(mensajeDeError(e, AVISO_SIN_RED_AL_LEER));
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [onActivated, consulta, activarAlMontar]);

  /* «Entendido» en el onboarding solo continúa: el programa ya quedó activado. Un doble toque (o un nuevo render) no entra dos veces. */
  const yaSigue = useRef(false);
  const continuar = () => {
    if (yaSigue.current) return;
    yaSigue.current = true;
    onActivated();
  };

  /* Sola y «ya empezó»: la persona activó, cerró la app sin tocar «Entendido» y su Día 1 ya llegó. Sigue directo a la app, sin decir «mañana». */
  useEffect(() => {
    if (sola.fase === 'ya-empezo') continuar();
    // `continuar` solo mira una marca y `onActivated`; lo que importa es el cambio de fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sola.fase]);

  const handleConfirmar = async () => {
    if (!fecha || confirmando) return;
    setConfirmando(true);
    setError(null);
    try {
      await onboardingApi.activarPrograma({ startDate: fecha });
      tacto.logro();
      avisarDiaUnoElegido();
      onActivated();
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 409)) {
        // 400: pasó la medianoche y la fecha que se veía ya no es «mañana». 409: ya estaba activado con otra fecha (otro teléfono).
        // En los dos casos se vuelve a leer: se muestra la fecha nueva, o se entra directo si ya estaba activado.
        setError(e.status === 400 ? AVISO_FECHA_CAMBIO : AVISO_COMPROBANDO);
        setConsulta(v => v + 1);
      } else {
        setError(mensajeDeError(e, AVISO_SIN_RED_AL_ACTIVAR));
      }
    } finally {
      setConfirmando(false);
    }
  };

  /* Lo que se ve, según el camino. Sola (onboarding): la fecha solo existe cuando el servidor respondió. Con toque: la que se leyó. */
  const plazo = lineaDelPlazo(formacion?.duracionDias, formacion?.activa?.codigo);
  const enCarga = activarAlMontar ? sola.fase === 'activando' || sola.fase === 'ya-empezo' : cargando;
  const fechaAMostrar = activarAlMontar ? (sola.fase === 'lista' ? sola.fecha : null) : fecha;
  const avisoAMostrar = activarAlMontar ? (sola.fase === 'error' ? sola.mensaje : null) : error;
  /* Sola y ya activada pero sin fecha (un servidor anterior que no la devolvió): se dice solo el plazo, sin inventar un día. */
  const listaSinFecha = activarAlMontar && sola.fase === 'lista' && !sola.fecha;

  return (
    <MarcoDePaso
      alVolver={alVolver}
      accesibilidadVolver={alVolver ? 'Volver sin empezar' : undefined}
      pie={
        activarAlMontar ? (
          sola.fase === 'error' ? (
            <GoldButton label="Reintentar" onPress={sola.reintentar} />
          ) : (
            <GoldButton label={BOTON_ENTENDIDO} onPress={continuar} disabled={sola.fase !== 'lista'} icon="check" />
          )
        ) : (
          <GoldButton
            label={BOTON_ENTENDIDO}
            onPress={handleConfirmar}
            disabled={!fecha || cargando}
            loading={confirmando}
            icon="check"
          />
        )
      }
    >
      {/* El encabezado va como en el resto del onboarding desde el 2026-10-05 (alineado a la izquierda, sin el medallón con el calendario). */}
      <View style={styles.headerBlock}>
        <Text style={[t.micro, { color: c.micro, textTransform: 'uppercase' }]}>
          {alVolver ? 'Tu programa' : 'Un último paso'}
        </Text>
        <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
          {TITULO_EMPIEZA_MANANA}
        </Text>
      </View>

      {enCarga ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={c.goldInk} />
          {activarAlMontar ? (
            <Text accessibilityLiveRegion="polite" style={[t.body, styles.preparando, { color: c.textSoft }]}>
              {TEXTO_PREPARANDO}
            </Text>
          ) : null}
        </View>
      ) : fechaAMostrar ? (
        <View
          accessible
          accessibilityLabel={`${fechaDelDiaUno(fechaAMostrar)}. ${plazo}`}
          style={[styles.fechaCard, { backgroundColor: c.cardBg, borderColor: c.border }]}
        >
          <View style={[styles.medallon, { backgroundColor: c.goldWash }]}>
            <Icon name="calendarRange" size={TAMANO_ICONO.grande} color={c.goldInk} />
          </View>
          <View style={styles.fechaTextos}>
            <Text style={[t.cardTitle, styles.fecha, { color: c.textStrong }]}>{fechaDelDiaUno(fechaAMostrar)}</Text>
            <Text style={[t.body, { color: c.textSoft }]}>{plazo}</Text>
          </View>
        </View>
      ) : listaSinFecha ? (
        <Text style={[t.body, { color: c.textSoft }]}>{plazo}</Text>
      ) : null}

      {avisoAMostrar ? (
        <View style={[styles.alertBox, { backgroundColor: c.dangerWash, borderColor: c.danger }]}>
          <Text style={[t.small, { color: c.danger, textAlign: 'center' }]}>{avisoAMostrar}</Text>
        </View>
      ) : null}
      {!activarAlMontar && error && !cargando && !fecha ? (
        <View style={{ marginTop: 16 }}>
          <GoldButton label="Reintentar" onPress={() => {
            setError(null);
            setConsulta(v => v + 1);
          }} />
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
    gap: 12,
  },
  preparando: { textAlign: 'center' },
  fechaCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 17,
  },
  medallon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  fechaTextos: { flex: 1, flexShrink: 1, gap: 4 },
  fecha: { fontSize: 22, lineHeight: 28 },
  alertBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 16,
  },
});
