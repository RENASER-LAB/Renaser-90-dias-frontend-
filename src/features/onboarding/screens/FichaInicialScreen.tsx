import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Alert } from '../../../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { FichaInicialData } from '../types/onboarding.types';
import { CHAPTERS_CONFIG, INITIAL_FICHA_DATA } from '../data/chaptersConfig';
import { mapearIdentidad, mapearSalud, mapearConsentimiento, reconstruirFichaDesdeRespuestas } from '../data/mapaPreguntas';
import { usePersistenciaOnboarding } from '../hooks/usePersistenciaOnboarding';
import * as onboardingApi from '../api/onboardingApi';
import { almacenamientoLocal } from '../../../services/storage/almacenamientoLocal';
import { OnboardingStepBar } from '../components/OnboardingStepBar';
import { ChapterIdentidad } from '../components/ChapterIdentidad';
import { ChapterSalud } from '../components/ChapterSalud';
import { ChapterConsentimiento } from '../components/ChapterConsentimiento';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { GoldButton } from '../../../components/GoldButton';

/** Clave de sección del catálogo (`renaser.secciones_onboarding`, flujo `ficha_inicial`) por capítulo. */
const SECCION_POR_CAPITULO = ['identidad_operativa', 'cuerpo', 'compromiso_y_cierre'] as const;

/** Cuánto esperar sin nuevos cambios antes de escribir el borrador a disco (evita golpear AsyncStorage en cada tecla). */
const DEBOUNCE_BORRADOR_MS = 800;

interface FichaInicialScreenProps {
  userId?: string;
  initialUserName?: string;
  initialUserEmail?: string;
  onComplete: (data: FichaInicialData) => void;
  onBack: () => void;
}

function fichaInicialConDatosDeSesion(initialUserName: string, initialUserEmail: string): FichaInicialData {
  return {
    ...INITIAL_FICHA_DATA,
    identidad: {
      ...INITIAL_FICHA_DATA.identidad,
      nombre: initialUserName || INITIAL_FICHA_DATA.identidad.nombre,
      email: initialUserEmail || INITIAL_FICHA_DATA.identidad.email,
    },
  };
}

export function FichaInicialScreen({
  userId,
  initialUserName = '',
  initialUserEmail = '',
  onComplete,
  onBack,
}: FichaInicialScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { isSmall, isTablet } = useResponsive();
  const { guardarCapitulo, avanzarEstado } = usePersistenciaOnboarding();

  const [currentChapter, setCurrentChapter] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState<FichaInicialData>(() =>
    fichaInicialConDatosDeSesion(initialUserName, initialUserEmail)
  );

  /**
   * Restaura el progreso al entrar a la pantalla, para que apagar el teléfono o cerrar la app a
   * mitad del formulario no obligue a rellenarlo de nuevo (pedido explícito, 2026-09-03):
   *
   * 1. Borrador local (AsyncStorage) — cubre lo que todavía NO se mandó al backend (nada se manda
   *    hasta tocar "Siguiente"). Es la fuente más reciente posible: se autoguarda con cada cambio.
   * 2. Si no hay borrador local, lo ya guardado en el backend (`GET /onboarding/answers`) — cubre
   *    los capítulos que sí se llegaron a mandar en una sesión anterior, aunque el borrador local
   *    se haya perdido (datos borrados de la app, otro dispositivo, etc.). Sin cambios de backend:
   *    ambos endpoints ya existían.
   *
   * `cargandoBorrador` evita dos cosas: mostrar el formulario vacío por un instante antes de que
   * la restauración termine, y que el efecto de autoguardado (más abajo) pise el borrador leído
   * con el estado inicial todavía sin restaurar.
   */
  const [cargandoBorrador, setCargandoBorrador] = useState(true);

  useEffect(() => {
    let vigente = true;
    (async () => {
      if (!userId) {
        setCargandoBorrador(false);
        return;
      }
      const borrador = await almacenamientoLocal.leerBorradorFicha(userId);
      if (!vigente) return;
      if (borrador) {
        setFormData(borrador.formData);
        setCurrentChapter(borrador.currentChapter);
        setCargandoBorrador(false);
        return;
      }
      try {
        const respuestas = await onboardingApi.obtenerRespuestas('ficha_inicial');
        if (!vigente) return;
        setFormData(prev => reconstruirFichaDesdeRespuestas(respuestas, prev));
      } catch (e) {
        // Sin borrador local y sin poder consultar el backend (sin red, primera vez): se sigue
        // con el formulario vacío/con los datos de sesión — no hay nada más de dónde recuperarlo.
        console.warn('No se pudo consultar el progreso previo del onboarding:', e);
      } finally {
        if (vigente) setCargandoBorrador(false);
      }
    })();
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /** Autoguardado debounced: cubre lo que se está tipeando AHORA, antes de tocar "Siguiente". */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!userId || cargandoBorrador) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void almacenamientoLocal.guardarBorradorFicha(userId, formData, currentChapter);
    }, DEBOUNCE_BORRADOR_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId, cargandoBorrador, formData, currentChapter]);

  const activeConfig = CHAPTERS_CONFIG[currentChapter];
  const isLastChapter = currentChapter === CHAPTERS_CONFIG.length - 1;

  const validateChapter = (): boolean => {
    if (currentChapter === 0) {
      if (formData.identidad.nombre.trim().length < 3) {
        Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre completo en la Identidad.');
        return false;
      }
      if (!formData.identidad.sexo) {
        Alert.alert('Sexo requerido', 'Por favor selecciona una opción de sexo.');
        return false;
      }
      if (formData.identidad.numeroDocumento.trim().length < 4) {
        Alert.alert('Documento requerido', 'Por favor ingresa tu número de documento de identidad.');
        return false;
      }
      if (!formData.identidad.fechaNacimiento.trim()) {
        Alert.alert('Fecha requerida', 'Por favor selecciona tu fecha de nacimiento.');
        return false;
      }
      if (formData.identidad.whatsapp.trim().length < 6) {
        Alert.alert('WhatsApp requerido', 'Por favor ingresa tu número de WhatsApp para contacto con tu mentor.');
        return false;
      }
    } else if (currentChapter === 1) {
      const horas = parseFloat(formData.salud.horasSueno);
      if (isNaN(horas) || horas < 0 || horas > 24 || !formData.salud.horasSueno.trim()) {
        Alert.alert('Horas de sueño requeridas', 'Por favor ingresa tus horas promedio de sueño (entre 0 y 24).');
        return false;
      }
      if (formData.salud.tomaMedicacionRegular) {
        if (!formData.salud.especificacionMedicacion?.trim()) {
          Alert.alert('Medicación requerida', 'Por favor especifica tu medicación y el motivo de la toma.');
          return false;
        }
      }
    } else if (currentChapter === 2) {
      if (!formData.consentimiento.autorizaUsoDatos && !formData.consentimiento.compromiso90Dias) {
        Alert.alert(
          'Compromiso requerido',
          'Por favor marca la casilla de autorización de datos y compromiso a los 90 días para continuar.'
        );
        return false;
      }
    }
    return true;
  };

  /** Respuestas del capítulo activo, ya traducidas a lo que espera `POST /onboarding/answers`. */
  const respuestasDelCapitulo = (chapter: number) => {
    if (chapter === 0) return mapearIdentidad(formData.identidad);
    if (chapter === 1) return mapearSalud(formData.salud);
    return mapearConsentimiento(formData.consentimiento);
  };

  const handleNext = async () => {
    if (!validateChapter()) return;
    if (guardando) return;

    // Guardar de verdad, capítulo por capítulo: si la persona abandona después de este punto, lo
    // que ya llenó no se pierde. Decisión 2026-09-03: a diferencia del resto de
    // `usePersistenciaOnboarding` (que reintenta en silencio), ACÁ si el guardado falla NO se
    // avanza de capítulo — evita que la persona crea que su respuesta quedó guardada cuando en
    // realidad sigue pendiente de reintento.
    setGuardando(true);
    try {
      const resultado = await guardarCapitulo(respuestasDelCapitulo(currentChapter));
      if (resultado.pendientes > 0) {
        Alert.alert(
          'No se pudo guardar',
          'No pudimos guardar tus respuestas de este capítulo. Revisa tu conexión e intentá de nuevo.'
        );
        return;
      }

      const porcentaje = Math.round(((currentChapter + 1) / CHAPTERS_CONFIG.length) * 100);
      await avanzarEstado({
        flow: 'ficha_inicial',
        section: SECCION_POR_CAPITULO[currentChapter],
        step: currentChapter,
        flowProgress: JSON.stringify({ chapter: currentChapter, totalChapters: CHAPTERS_CONFIG.length, porcentaje }),
      });

      if (isLastChapter) {
        // Los 3 capítulos ya están guardados en el backend a esta altura — el borrador local ya
        // no protege nada y solo podría resucitar datos viejos si esta cuenta vuelve a onboarding
        // (no debería pasar, pero es una fila huérfana que no cuesta nada limpiar).
        if (userId) void almacenamientoLocal.borrarBorradorFicha(userId);
        onComplete(formData);
      } else {
        setCurrentChapter(prev => prev + 1);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handlePrev = () => {
    if (currentChapter > 0) {
      setCurrentChapter(prev => prev - 1);
    } else {
      onBack();
    }
  };

  // Interceptar gestos de retroceso en pantalla táctil (Xiaomi / Android / iOS)
  useSystemBackHandler(() => {
    handlePrev();
    return true;
  }, true);

  if (cargandoBorrador) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.gold} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { paddingHorizontal: isSmall ? 14 : isTablet ? 32 : 18 }]}>
        <Pressable
          hitSlop={12}
          onPress={handlePrev}
          style={[styles.backBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name="arrowLeft" size={16} color={c.gold} />
          <Text style={[t.micro, { color: c.text, letterSpacing: 1.2, fontSize: 11, fontWeight: '700' }]}>
            {currentChapter === 0 ? 'SALIR' : 'ANTERIOR'}
          </Text>
        </Pressable>

        <Pressable
          hitSlop={10}
          onPress={toggle}
          accessibilityRole="button"
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name={mode === 'light' ? 'moon' : 'sun'} size={15} color={c.gold} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: isSmall ? 14 : isTablet ? 32 : 18,
            maxWidth: isTablet ? 560 : undefined,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Chapter Header */}
        <View style={styles.header}>
          <View style={[styles.iconMedallion, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <Icon name={activeConfig.icon} size={22} color={c.gold} />
          </View>
          <MicroLabel>{activeConfig.subtitle}</MicroLabel>
          <Text style={[t.screenTitle, { color: c.textStrong, marginTop: 4, textAlign: 'center' }]}>
            {activeConfig.title}
          </Text>
        </View>

        {/* Step Progress Bar */}
        <OnboardingStepBar currentStep={currentChapter} totalSteps={CHAPTERS_CONFIG.length} />

        {/* Modular Chapter Form Box */}
        <View style={[styles.formCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          {currentChapter === 0 && (
            <ChapterIdentidad
              data={formData.identidad}
              onChange={identidad => setFormData({ ...formData, identidad })}
            />
          )}

          {currentChapter === 1 && (
            <ChapterSalud
              data={formData.salud}
              onChange={salud => setFormData({ ...formData, salud })}
            />
          )}

          {currentChapter === 2 && (
            <ChapterConsentimiento
              data={formData.consentimiento}
              onChange={consentimiento => setFormData({ ...formData, consentimiento })}
            />
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionsRow}>
          {currentChapter > 0 && (
            <GoldButton
              label="ANTERIOR"
              variant="secondary"
              onPress={handlePrev}
              icon="arrowLeft"
              iconPosition="left"
              style={{ flex: 1 }}
            />
          )}

          <GoldButton
            label={isLastChapter ? 'CONTINUAR A TÉRMINOS' : 'SIGUIENTE'}
            variant="primary"
            onPress={handleNext}
            loading={guardando}
            icon="arrow"
            style={{ flex: currentChapter > 0 ? 1.5 : 1 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
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
    paddingBottom: 36,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
  },
  iconMedallion: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
