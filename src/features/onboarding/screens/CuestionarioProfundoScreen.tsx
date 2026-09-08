import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Alert } from '../../../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { FormField } from '../../../components/FormField';
import { SliderRating } from '../../../components/SliderRating';
import { GoldButton } from '../../../components/GoldButton';
import {
  BLOQUES_CUESTIONARIO_PROFUNDO,
  CAMPOS_OBLIGATORIOS,
  CuestionarioProfundoData,
  DATOS_INICIALES_CUESTIONARIO_PROFUNDO,
  TOTAL_BLOQUES,
  metaFacturacionEsValida,
  porcentajeDelBloque,
} from '../data/bloquesCuestionarioProfundo';
import {
  mapearBloqueCuestionarioProfundo,
  reconstruirCuestionarioProfundoDesdeRespuestas,
} from '../data/mapaPreguntas';
import { usePersistenciaOnboarding } from '../hooks/usePersistenciaOnboarding';
import * as onboardingApi from '../api/onboardingApi';

/**
 * Etapa 2 del onboarding — **Cuestionario Profundo**, 8 bloques.
 *
 * Se llega desde el perfil: YO -> MI ONBOARDING -> "Tu proceso completo" -> etapa 2.
 *
 * ── Qué cambió el 2026-09-05 (leer si esta pantalla te resulta distinta a como la recordabas) ──
 *
 * La versión anterior de este archivo tenía 6 bloques (Energía Vital, Guardianes, Estado Mental,
 * Estado Somático, Estado Emocional, Manifestación), **no guardaba nada** (todo vivía en
 * `useState` y `onComplete()` no persistía) y además **no estaba enchufada a ninguna navegación**:
 * el componente no se importaba desde ningún lado. Se reemplazó por los 8 bloques que confirmó el
 * dueño del proyecto, ahora sí guardando contra el backend bloque por bloque.
 *
 * Los 3 bloques que se fueron (Somático, Emocional, Manifestación) siguen existiendo como
 * secciones y preguntas en el catálogo de la base; simplemente ya no forman parte de esta etapa.
 * No se borró nada de la base.
 *
 * ── Guardado ──
 *
 * Incremental, un `POST /onboarding/answers` por respuesta al tocar "Continuar" (vía
 * `usePersistenciaOnboarding.guardarCapitulo`). Si el guardado no se confirma NO se avanza de
 * bloque: es la misma decisión ya tomada en `FichaInicialScreen` — dejar avanzar mostraría un
 * progreso que en el servidor no existe. Cada respuesta es un upsert por (usuario, pregunta), así
 * que reintentar nunca duplica.
 */
interface CuestionarioProfundoScreenProps {
  /** Se llama al terminar el bloque 8, ya con todo guardado. */
  onComplete: () => void;
  /** Se llama con "Anterior" desde el bloque 1. */
  onBack: () => void;
}

export function CuestionarioProfundoScreen({ onComplete, onBack }: CuestionarioProfundoScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { isTablet } = useResponsive();
  const { guardarCapitulo, avanzarEstado } = usePersistenciaOnboarding();

  const [indiceBloque, setIndiceBloque] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [hidratando, setHidratando] = useState(true);
  const [formData, setFormData] = useState<CuestionarioProfundoData>(DATOS_INICIALES_CUESTIONARIO_PROFUNDO);

  const bloque = BLOQUES_CUESTIONARIO_PROFUNDO[indiceBloque];
  const esUltimo = indiceBloque === TOTAL_BLOQUES - 1;
  const porcentaje = porcentajeDelBloque(bloque.numero);

  /**
   * Rehidratación: los 8 bloques abarcan DOS flujos del catálogo, así que hacen falta las dos
   * consultas (ver `data/bloquesCuestionarioProfundo.ts`). Si falla, se sigue con el formulario
   * vacío — nunca se bloquea a la persona por no poder leer lo previo.
   */
  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const [ficha, profundo] = await Promise.all([
          onboardingApi.obtenerRespuestas('ficha_inicial'),
          onboardingApi.obtenerRespuestas('cuestionario_profundo'),
        ]);
        if (!vigente) return;
        setFormData(prev => reconstruirCuestionarioProfundoDesdeRespuestas([ficha, profundo], prev));
      } catch (error) {
        console.warn('No se pudieron cargar tus respuestas previas del Cuestionario Profundo:', error);
      } finally {
        if (vigente) setHidratando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  useSystemBackHandler(() => {
    irAlBloqueAnterior();
    return true;
  });

  const actualizar = <K extends keyof CuestionarioProfundoData>(
    campo: K,
    valor: CuestionarioProfundoData[K]
  ) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };

  /** Devuelve el aviso del primer campo obligatorio vacío del bloque activo, o `null` si está completo. */
  const primerFaltante = (): string | null => {
    for (const { campo, aviso } of CAMPOS_OBLIGATORIOS[bloque.numero] ?? []) {
      const valor = formData[campo];
      if (typeof valor === 'string' && !valor.trim()) return aviso;
      // Un slider sin tocar vale `null`, no 0: se le pide igual que a un campo de texto vacío.
      if (valor === null) return aviso;
    }
    // La meta de facturación es la única pregunta NUMERO: si no se puede parsear, el mapeo la
    // descartaría y una respuesta obligatoria nunca llegaría a la base.
    if (bloque.numero === 4 && !metaFacturacionEsValida(formData.metaFacturacion)) {
      return 'La meta de facturación tiene que ser un número específico (sin rangos ni texto).';
    }
    return null;
  };

  const irAlBloqueAnterior = () => {
    if (indiceBloque > 0) {
      setIndiceBloque(prev => prev - 1);
    } else {
      onBack();
    }
  };

  const continuar = async () => {
    if (guardando) return;
    const faltante = primerFaltante();
    if (faltante) {
      Alert.alert('Falta responder', faltante);
      return;
    }

    setGuardando(true);
    try {
      const resultado = await guardarCapitulo(mapearBloqueCuestionarioProfundo(bloque.numero, formData));
      if (resultado.pendientes > 0) {
        Alert.alert(
          'No se pudo guardar',
          'No pudimos guardar las respuestas de este bloque. Revisa tu conexión e intentá de nuevo.'
        );
        return;
      }

      await avanzarEstado({
        flow: bloque.flujo,
        section: bloque.seccion,
        step: indiceBloque,
        flowProgress: JSON.stringify({ bloque: bloque.numero, totalBloques: TOTAL_BLOQUES, porcentaje }),
      });

      if (esUltimo) {
        onComplete();
      } else {
        setIndiceBloque(prev => prev + 1);
      }
    } finally {
      setGuardando(false);
    }
  };

  if (hidratando) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
        <View style={styles.centrado}>
          <ActivityIndicator color={c.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      <View style={styles.topBar}>
        <Pressable
          hitSlop={12}
          onPress={irAlBloqueAnterior}
          accessibilityRole="button"
          style={[styles.backBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name="arrowLeft" size={16} color={c.gold} />
          <Text style={[t.micro, { color: c.text, letterSpacing: 1.2 }]}>
            {indiceBloque === 0 ? 'SALIR' : 'ANTERIOR'}
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
            maxWidth: isTablet ? 540 : undefined,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.iconMedallion, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <Icon name={bloque.icono} size={22} color={c.gold} />
          </View>
          <Text style={[t.screenTitle, { color: c.textStrong, marginTop: 4, textAlign: 'center' }]}>
            Cuestionario Profundo
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 12, marginTop: 4, textAlign: 'center' }]}>
            Bloque {bloque.numero} de {TOTAL_BLOQUES}: {bloque.titulo}
          </Text>
        </View>

        {/* Progreso */}
        <View style={{ gap: 6 }}>
          <View style={[styles.progressBg, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <View style={[styles.progressFill, { width: `${porcentaje}%`, backgroundColor: c.gold }]} />
          </View>
          <Text style={[t.micro, { color: c.textSoft, textAlign: 'right', fontSize: 11, fontWeight: '600' }]}>
            {porcentaje}% completado
          </Text>
        </View>

        {bloque.encabezado && (
          <Text style={[t.body, { color: c.textSoft, fontSize: 12, fontStyle: 'italic', textAlign: 'center' }]}>
            {bloque.encabezado}
          </Text>
        )}

        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          {/* ── Bloque 1: Cuerpo ─────────────────────────────────────────────────────────── */}
          {bloque.numero === 1 && (
            <View style={styles.campos}>
              <FormField
                label="OBJETIVO SMART DE CUERPO A 90 DÍAS *"
                helperText="Debe incluir: qué exactamente, cuánto, para cuándo."
                value={formData.objetivoSmartCuerpo}
                onChangeText={v => actualizar('objetivoSmartCuerpo', v)}
                multiline
                numberOfLines={4}
              />
            </View>
          )}

          {/* ── Bloque 2: Mente y Patrones ───────────────────────────────────────────────── */}
          {bloque.numero === 2 && (
            <View style={styles.campos}>
              <FormField
                label="CUANDO FALLAS, ¿QUÉ TE DICE TU CRÍTICO INTERNO? *"
                helperText="La frase exacta. Sin filtros."
                placeholder="Cuando fallo, una voz dentro de mí me dice…"
                value={formData.criticoInterno}
                onChangeText={v => actualizar('criticoInterno', v)}
                multiline
                numberOfLines={3}
              />
              <FormField
                label="TU CREENCIA LIMITANTE #1 — LA QUE CARGAS HACE AÑOS *"
                placeholder="Hace años creo que…"
                value={formData.creenciaLimitante}
                onChangeText={v => actualizar('creenciaLimitante', v)}
                multiline
                numberOfLines={3}
              />
              <FormField
                label="¿CÓMO TE DEFINES HOY, EN UNA SOLA FRASE? *"
                placeholder="Hoy soy…"
                value={formData.definicionHoy}
                onChangeText={v => actualizar('definicionHoy', v)}
              />
            </View>
          )}

          {/* ── Bloque 3: Alma, Heridas y Vínculos ───────────────────────────────────────── */}
          {bloque.numero === 3 && (
            <View style={styles.campos}>
              <FormField
                label="FRASE DE TU PADRE O MADRE QUE AÚN HOY TE MARCA *"
                placeholder="Mi padre/madre solía decirme…"
                value={formData.fraseParental}
                onChangeText={v => actualizar('fraseParental', v)}
              />
              <SliderRating
                label="TU VÍNCULO HOY CON TU PADRE (1-10)"
                value={formData.vinculoPadre}
                onChange={v => actualizar('vinculoPadre', v)}
              />
              <SliderRating
                label="TU VÍNCULO HOY CON TU MADRE (1-10)"
                value={formData.vinculoMadre}
                onChange={v => actualizar('vinculoMadre', v)}
              />
              <FormField
                label="FRASE SOBRE EL DINERO EN TU INFANCIA *"
                placeholder="En mi casa siempre se decía sobre el dinero…"
                value={formData.fraseDineroInfancia}
                onChangeText={v => actualizar('fraseDineroInfancia', v)}
              />
              <SliderRating
                label="¿SIENTES QUE MERECES GANAR MUCHO DINERO? (1-10)"
                value={formData.mereceDinero}
                onChange={v => actualizar('mereceDinero', v)}
              />
              <FormField
                label="¿POR QUÉ?"
                placeholder="Explica brevemente…"
                value={formData.porqueMereceDinero}
                onChangeText={v => actualizar('porqueMereceDinero', v)}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* ── Bloque 4: Negocio y Dinero ───────────────────────────────────────────────── */}
          {bloque.numero === 4 && (
            <View style={styles.campos}>
              <FormField
                label="META DE FACTURACIÓN A 90 DÍAS (USD) *"
                helperText="Número específico, no rango."
                value={formData.metaFacturacion}
                onChangeText={v => actualizar('metaFacturacion', v)}
                keyboardType="numeric"
              />
              <FormField
                label="TU PRODUCTO / SERVICIO ESTRELLA *"
                placeholder="2-3 líneas"
                value={formData.productoEstrella}
                onChangeText={v => actualizar('productoEstrella', v)}
                multiline
                numberOfLines={3}
              />
              <FormField
                label="TU CLIENTE IDEAL *"
                placeholder="2-3 líneas"
                value={formData.clienteIdeal}
                onChangeText={v => actualizar('clienteIdeal', v)}
                multiline
                numberOfLines={3}
              />
              <FormField
                label="TU ENEMIGO PÚBLICO #1 DEL NEGOCIO *"
                helperText="La conducta tuya que más sabotea tu meta."
                placeholder="Lo que más sabotea mi meta es…"
                value={formData.enemigoPublico}
                onChangeText={v => actualizar('enemigoPublico', v)}
                multiline
                numberOfLines={3}
              />
              <FormField
                label="OBJETIVO SMART DE NEGOCIO A 90 DÍAS *"
                helperText="Debe incluir números y fecha."
                placeholder="Mi objetivo concreto de negocio a 90 días es…"
                value={formData.objetivoSmartNegocio}
                onChangeText={v => actualizar('objetivoSmartNegocio', v)}
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {/* ── Bloque 5: Compromiso ─────────────────────────────────────────────────────── */}
          {bloque.numero === 5 && (
            <View style={styles.campos}>
              <FormField
                label="SI LOGRARAS UNA SOLA COSA QUE HAGA DE ESTA FORMACIÓN UN ÉXITO, ¿CUÁL SERÍA? *"
                value={formData.unaSolaCosa}
                onChangeText={v => actualizar('unaSolaCosa', v)}
                multiline
                numberOfLines={4}
              />
              <FormField
                label="BAUTIZO DEL PROCESO *"
                helperText="Ponle nombre a tu reto personal de 90 días."
                placeholder={'Ej: "Operación Soberanía"'}
                value={formData.bautizoProceso}
                onChangeText={v => actualizar('bautizoProceso', v)}
              />
            </View>
          )}

          {/* ── Bloque 6: Energía Vital ──────────────────────────────────────────────────── */}
          {bloque.numero === 6 && (
            <View style={styles.campos}>
              {/*
                Dos líneas, no una ni cuatro. En la base son AREA_TEXTO y la respuesta honesta rara
                vez entra en un renglón ("las reuniones de la tarde y discutir con mi hermano"),
                pero una caja de cuatro líneas frente a una pregunta que se contesta en una frase
                intimida y hace scrollear de más. Dos líneas se ven cómodas para una frase y crecen
                solas si la persona escribe más.
              */}
              <FormField
                label="¿QUÉ ACTIVIDAD TE DRENA MÁS ENERGÍA HOY? *"
                placeholder="Lo que más me deja vací@ es…"
                value={formData.actividadDrena}
                onChangeText={v => actualizar('actividadDrena', v)}
                multiline
                numberOfLines={2}
              />
              <FormField
                label="¿QUÉ ACTIVIDAD TE RECARGA MÁS? *"
                placeholder="Lo que me devuelve el alma es…"
                value={formData.actividadRecarga}
                onChangeText={v => actualizar('actividadRecarga', v)}
                multiline
                numberOfLines={2}
              />
              <FormField
                label="¿CUÁNDO FUE LA ÚLTIMA VEZ QUE TE SENTISTE PLENAMENTE VIV@? *"
                placeholder="Describe el momento. Dónde, con quién, qué hacías…"
                value={formData.ultimaVezVivo}
                onChangeText={v => actualizar('ultimaVezVivo', v)}
                multiline
                numberOfLines={4}
              />
            </View>
          )}

          {/* ── Bloque 7: Los 3 Guardianes ───────────────────────────────────────────────── */}
          {bloque.numero === 7 && (
            <View style={styles.campos}>
              <TarjetaGuardian
                titulo="MIEDO"
                intensidad={formData.miedoIntensidad}
                onIntensidad={v => actualizar('miedoIntensidad', v)}
                detalle={formData.miedoDetalle}
                onDetalle={v => actualizar('miedoDetalle', v)}
                placeholder="¿De qué tienes más miedo en este momento?"
              />
              <TarjetaGuardian
                titulo="CULPA"
                intensidad={formData.culpaIntensidad}
                onIntensidad={v => actualizar('culpaIntensidad', v)}
                detalle={formData.culpaDetalle}
                onDetalle={v => actualizar('culpaDetalle', v)}
                placeholder="¿Por qué cargas culpa? ¿Con quién o por qué?"
              />
              <TarjetaGuardian
                titulo="VERGÜENZA"
                intensidad={formData.verguenzaIntensidad}
                onIntensidad={v => actualizar('verguenzaIntensidad', v)}
                detalle={formData.verguenzaDetalle}
                onDetalle={v => actualizar('verguenzaDetalle', v)}
                placeholder="¿De qué te avergüenzas?"
              />
            </View>
          )}

          {/* ── Bloque 8: Estado Mental Profundo ─────────────────────────────────────────── */}
          {bloque.numero === 8 && (
            <View style={styles.campos}>
              <SliderRating
                label="NIVEL DE ANSIEDAD DIARIA (1-10)"
                value={formData.nivelAnsiedad}
                onChange={v => actualizar('nivelAnsiedad', v)}
                minLabel="Tranquil@ (1)"
                maxLabel="Muy alta (10)"
              />
              <FormField
                label="DECISIÓN IMPORTANTE QUE LLEVAS POSTERGANDO HACE MESES *"
                placeholder="La decisión que llevo postergando es…"
                value={formData.decisionPostergada}
                onChangeText={v => actualizar('decisionPostergada', v)}
                multiline
                numberOfLines={4}
              />
              <FormField
                label="¿POR QUÉ NO LA HAS TOMADO?"
                placeholder="Sé honest@…"
                value={formData.porqueNoLaTomaste}
                onChangeText={v => actualizar('porqueNoLaTomaste', v)}
                multiline
                numberOfLines={3}
              />
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          {indiceBloque > 0 && (
            <GoldButton
              label="ANTERIOR"
              variant="secondary"
              onPress={irAlBloqueAnterior}
              icon="arrowLeft"
              iconPosition="left"
              style={{ flex: 1 }}
            />
          )}
          <GoldButton
            label={
              guardando
                ? 'GUARDANDO…'
                : esUltimo
                ? 'CONTINUAR AL SIGUIENTE MÓDULO'
                : 'CONTINUAR'
            }
            variant="primary"
            onPress={continuar}
            icon="arrow"
            style={{ flex: indiceBloque > 0 ? 1.5 : 1 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Una de las 3 sub-tarjetas del bloque 7. Las tres tienen exactamente la misma forma (un slider de
 * presencia + un textarea propio), así que existen como un componente y no como tres copias: la
 * única diferencia real es el placeholder de la pregunta abierta.
 */
function TarjetaGuardian({
  titulo,
  intensidad,
  onIntensidad,
  detalle,
  onDetalle,
  placeholder,
}: {
  titulo: string;
  intensidad: number | null;
  onIntensidad: (valor: number) => void;
  detalle: string;
  onDetalle: (valor: string) => void;
  placeholder: string;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.guardianCard, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
      <MicroLabel>{titulo}</MicroLabel>
      <SliderRating label="¿QUÉ TAN PRESENTE ESTÁ? (1-10)" value={intensidad} onChange={onIntensidad} />
      <FormField
        label=""
        placeholder={placeholder}
        value={detalle}
        onChangeText={onDetalle}
        multiline
        numberOfLines={3}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 4,
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
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
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
  progressBg: {
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  campos: {
    gap: 16,
  },
  guardianCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
