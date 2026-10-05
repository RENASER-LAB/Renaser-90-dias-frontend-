import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Keyboard } from 'react-native';
import { Alert } from '../../../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { FichaConsentimientoData, FichaIdentidadData, FichaInicialData, FichaSaludData } from '../types/onboarding.types';
import { CHAPTERS_CONFIG, INITIAL_FICHA_DATA } from '../data/chaptersConfig';
import { mapearIdentidad, mapearSalud, mapearConsentimiento, reconstruirFichaDesdeRespuestas } from '../data/mapaPreguntas';
import {
  AvisoDePaso,
  IdPasoFicha,
  PASOS_FICHA,
  TOTAL_PASOS_FICHA,
  indiceDesdeBorrador,
  rellenoPorCapitulo,
  ubicarPaso,
  validarCapitulo,
  validarPaso,
} from '../data/pasosFicha';
import { usePersistenciaOnboarding } from '../hooks/usePersistenciaOnboarding';
import * as onboardingApi from '../api/onboardingApi';
import { almacenamientoLocal } from '../../../services/storage/almacenamientoLocal';
import { MarcoDePaso, DireccionDePaso } from '../components/MarcoDePaso';
import { BarraDeAvance } from '../components/BarraDeAvance';
import {
  PasoDocumento,
  PasoFamilia,
  PasoNombre,
  PasoPreguntaAbierta,
  PasoSobreTi,
  PasoTrabajo,
  PasoUbicacion,
  PasoWhatsapp,
} from '../components/ChapterIdentidad';
import { PasoDescanso, PasoMedicacion } from '../components/ChapterSalud';
import { ChapterConsentimiento } from '../components/ChapterConsentimiento';
import { GoldButton } from '../../../components/GoldButton';
import { tacto } from '../../../utils/tacto';

/** Clave de sección del catálogo (`renaser.secciones_onboarding`, flujo `ficha_inicial`) por capítulo. */
const SECCION_POR_CAPITULO = ['identidad_operativa', 'cuerpo', 'compromiso_y_cierre'] as const;

/** Cuánto esperar sin nuevos cambios antes de escribir el borrador a disco (evita golpear AsyncStorage en cada tecla). */
const DEBOUNCE_BORRADOR_MS = 800;

/**
 * Los pasos que abren el teclado solos al llegar (su primer control es un campo de texto). Al ir a
 * cualquier OTRO paso se baja el teclado: si no, quedaría abierto tapando las opciones.
 */
const PASOS_CON_TECLADO: ReadonlySet<IdPasoFicha> = new Set<IdPasoFicha>([
  'nombre',
  'trabajo',
  'documento',
  'whatsapp',
  'expectativa',
  'temor',
]);

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

/**
 * Ficha Inicial del onboarding: tres capítulos, mostrados de a UN paso por pantalla (2026-10-05).
 *
 * Hasta el 2026-10-05 cada capítulo era un formulario largo con el botón al final del scroll — el
 * dueño lo vio «como si fuera una web». Ahora cada pantalla pregunta una cosa (o dos o tres que van
 * juntas), el botón queda fijo abajo y sube con el teclado, y una barra fina arriba dice cuánto
 * falta. Ver `data/pasosFicha.ts` para el reparto en pasos y lo que NO cambió: los capítulos siguen
 * siendo la unidad de guardado, con las mismas respuestas, el mismo endpoint y el mismo
 * `avanzarEstado` que antes.
 */
export function FichaInicialScreen({
  userId,
  initialUserName = '',
  initialUserEmail = '',
  onComplete,
  onBack,
}: FichaInicialScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { guardarCapitulo, avanzarEstado } = usePersistenciaOnboarding();

  /** El paso que se ve (índice global 0..11) y hacia dónde se llegó, para que entre del lado correcto. */
  const [navegacion, setNavegacion] = useState<{ indice: number; direccion: DireccionDePaso }>({
    indice: 0,
    direccion: 'adelante',
  });
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState<FichaInicialData>(() =>
    fichaInicialConDatosDeSesion(initialUserName, initialUserEmail)
  );

  /**
   * Restaura el progreso al entrar a la pantalla, para que apagar el teléfono o cerrar la app a
   * mitad del formulario no obligue a rellenarlo de nuevo (pedido explícito, 2026-09-03):
   *
   * 1. Borrador local (AsyncStorage) — cubre lo que todavía NO se mandó al backend (nada se manda
   *    hasta terminar el capítulo). Es la fuente más reciente posible: se autoguarda con cada cambio.
   *    Desde el 2026-10-05 guarda también el paso dentro del capítulo; uno viejo, sin ese dato,
   *    vuelve al primer paso de su capítulo con todo lo escrito cargado.
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
        setNavegacion({
          indice: indiceDesdeBorrador(borrador.currentChapter, borrador.pasoEnCapitulo),
          direccion: 'adelante',
        });
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

  const ubicacion = ubicarPaso(navegacion.indice);
  const { paso, capitulo, pasoEnCapitulo } = ubicacion;

  /** Autoguardado debounced: cubre lo que se está tipeando AHORA, antes de terminar el capítulo. */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!userId || cargandoBorrador) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void almacenamientoLocal.guardarBorradorFicha(userId, formData, capitulo, pasoEnCapitulo);
    }, DEBOUNCE_BORRADOR_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userId, cargandoBorrador, formData, capitulo, pasoEnCapitulo]);

  /* Actualizaciones con la forma funcional de `setFormData`: un cambio que llega tarde (la
     ubicación que detecta el teléfono, por ejemplo) no puede pisar lo que se escribió mientras. */
  const setIdentidad = (identidad: FichaIdentidadData) => setFormData(prev => ({ ...prev, identidad }));
  const setSalud = (salud: FichaSaludData) => setFormData(prev => ({ ...prev, salud }));
  const setConsentimiento = (consentimiento: FichaConsentimientoData) =>
    setFormData(prev => ({ ...prev, consentimiento }));

  const irAPaso = (indice: number, direccion: DireccionDePaso) => {
    if (!PASOS_CON_TECLADO.has(PASOS_FICHA[indice].id)) Keyboard.dismiss();
    setNavegacion({ indice, direccion });
  };

  /** La alerta de siempre (mismos títulos y textos), con su vibración de «falta algo». */
  const avisar = (aviso: AvisoDePaso) => {
    tacto.error();
    Alert.alert(aviso.titulo, aviso.mensaje);
  };

  /** Respuestas de un capítulo, ya traducidas a lo que espera `POST /onboarding/answers`. */
  const respuestasDelCapitulo = (chapter: number) => {
    if (chapter === 0) return mapearIdentidad(formData.identidad);
    if (chapter === 1) return mapearSalud(formData.salud);
    return mapearConsentimiento(formData.consentimiento);
  };

  const handleNext = async () => {
    if (guardando) return;

    const aviso = validarPaso(paso.id, formData);
    if (aviso) {
      avisar(aviso);
      return;
    }

    // Dentro del capítulo, avanzar es sólo mostrar el paso siguiente: nada se manda todavía.
    if (!ubicacion.esUltimoDelCapitulo) {
      irAPaso(navegacion.indice + 1, 'adelante');
      return;
    }

    // Último paso del capítulo: antes de guardar se revisa el capítulo ENTERO, por si un borrador
    // restaurado dejó algo vacío más atrás. Se vuelve a ese paso y se dice qué falta.
    const pendiente = validarCapitulo(capitulo, formData);
    if (pendiente) {
      irAPaso(pendiente.indice, 'atras');
      avisar(pendiente.aviso);
      return;
    }

    // Guardar de verdad, capítulo por capítulo: si la persona abandona después de este punto, lo
    // que ya llenó no se pierde. Decisión 2026-09-03: a diferencia del resto de
    // `usePersistenciaOnboarding` (que reintenta en silencio), ACÁ si el guardado falla NO se
    // avanza de capítulo — evita que la persona crea que su respuesta quedó guardada cuando en
    // realidad sigue pendiente de reintento.
    setGuardando(true);
    try {
      const resultado = await guardarCapitulo(respuestasDelCapitulo(capitulo));
      if (resultado.pendientes > 0) {
        tacto.error();
        Alert.alert(
          'No se pudo guardar',
          'No pudimos guardar tus respuestas de este capítulo. Revisa tu conexión e inténtalo de nuevo.'
        );
        return;
      }

      const porcentaje = Math.round(((capitulo + 1) / CHAPTERS_CONFIG.length) * 100);
      await avanzarEstado({
        flow: 'ficha_inicial',
        section: SECCION_POR_CAPITULO[capitulo],
        step: capitulo,
        flowProgress: JSON.stringify({ chapter: capitulo, totalChapters: CHAPTERS_CONFIG.length, porcentaje }),
      });
      tacto.logro();

      if (ubicacion.esUltimo) {
        // Los 3 capítulos ya están guardados en el backend a esta altura — el borrador local ya
        // no protege nada y solo podría resucitar datos viejos si esta cuenta vuelve a onboarding
        // (no debería pasar, pero es una fila huérfana que no cuesta nada limpiar).
        if (userId) void almacenamientoLocal.borrarBorradorFicha(userId);
        onComplete(formData);
      } else {
        irAPaso(navegacion.indice + 1, 'adelante');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handlePrev = () => {
    if (navegacion.indice > 0) {
      irAPaso(navegacion.indice - 1, 'atras');
    } else {
      onBack();
    }
  };

  // Interceptar gestos de retroceso en pantalla táctil (Xiaomi / Android / iOS): un paso atrás.
  useSystemBackHandler(() => {
    handlePrev();
    return true;
  }, true);

  if (cargandoBorrador) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.goldInk} size="large" />
      </SafeAreaView>
    );
  }

  const tituloCapitulo = CHAPTERS_CONFIG[capitulo].title;

  const contenidoDelPaso = () => {
    const identidad = { data: formData.identidad, onChange: setIdentidad, alEnviar: () => void handleNext() };
    const salud = { data: formData.salud, onChange: setSalud };
    switch (paso.id) {
      case 'nombre':
        return <PasoNombre {...identidad} />;
      case 'sobreTi':
        return <PasoSobreTi {...identidad} />;
      case 'familia':
        return <PasoFamilia {...identidad} />;
      case 'trabajo':
        return <PasoTrabajo {...identidad} />;
      case 'documento':
        return <PasoDocumento {...identidad} />;
      case 'whatsapp':
        return <PasoWhatsapp {...identidad} />;
      case 'ubicacion':
        return <PasoUbicacion {...identidad} />;
      case 'expectativa':
        return (
          <PasoPreguntaAbierta
            valor={formData.identidad.expectativa}
            onCambiar={expectativa => setFormData(prev => ({ ...prev, identidad: { ...prev.identidad, expectativa } }))}
            placeholder="Espero que RENASER y mi mentor me guíen con disciplina en..."
            accesibilidad={paso.titulo}
          />
        );
      case 'temor':
        return (
          <PasoPreguntaAbierta
            valor={formData.identidad.temor}
            onCambiar={temor => setFormData(prev => ({ ...prev, identidad: { ...prev.identidad, temor } }))}
            placeholder="Lo que más temo de este proceso es rendirme cuando..."
            accesibilidad={paso.titulo}
          />
        );
      case 'descanso':
        return <PasoDescanso {...salud} />;
      case 'medicacion':
        return <PasoMedicacion {...salud} />;
      case 'consentimiento':
        return <ChapterConsentimiento data={formData.consentimiento} onChange={setConsentimiento} />;
    }
  };

  return (
    <MarcoDePaso
      alVolver={handlePrev}
      etiquetaVolver={navegacion.indice === 0 ? 'Salir' : undefined}
      accesibilidadVolver={navegacion.indice === 0 ? 'Salir de la ficha inicial' : 'Volver al paso anterior'}
      cabecera={
        <BarraDeAvance
          rellenos={rellenoPorCapitulo(navegacion.indice)}
          descripcion={`Paso ${navegacion.indice + 1} de ${TOTAL_PASOS_FICHA}, ${tituloCapitulo.toLowerCase()}`}
          pasoActual={navegacion.indice + 1}
          totalPasos={TOTAL_PASOS_FICHA}
        />
      }
      claveContenido={paso.id}
      direccion={navegacion.direccion}
      alternarTema={toggle}
      modoTema={mode}
      pie={
        <GoldButton
          label={ubicacion.esUltimo ? 'CONTINUAR A TÉRMINOS' : 'SIGUIENTE'}
          onPress={handleNext}
          loading={guardando}
          icon="arrow"
        />
      }
    >
      <View style={styles.encabezado}>
        {/* El capítulo, chico, arriba del título. Se omite cuando el paso ES el capítulo entero
            (Consentimiento y compromiso): repetir la misma frase dos veces es ruido. */}
        {paso.titulo.toLowerCase() !== tituloCapitulo.toLowerCase() && (
          <Text style={[t.micro, { color: c.micro }]}>{tituloCapitulo}</Text>
        )}
        <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
          {paso.titulo}
        </Text>
        {paso.bajada ? <Text style={[t.body, { color: c.textSoft }]}>{paso.bajada}</Text> : null}
      </View>

      {contenidoDelPaso()}
    </MarcoDePaso>
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
  encabezado: {
    gap: 8,
    marginBottom: 28,
  },
});
