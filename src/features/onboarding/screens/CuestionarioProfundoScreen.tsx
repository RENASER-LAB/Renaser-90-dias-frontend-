import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Icon, IconName } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { FormField } from '../../../components/FormField';
import { SliderRating } from '../../../components/SliderRating';
import { GoldButton } from '../../../components/GoldButton';

interface CuestionarioProfundoScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

interface DeepFormData {
  energiaGeneral: number;
  energiaManana: number;
  energiaTarde: number;
  actividadDrena: string;
  actividadRecarga: string;
  miedoIntensidad: number;
  miedoQue: string;
  culpaIntensidad: number;
  culpaQue: string;
  verguenzaIntensidad: number;
  verguenzaQue: string;
  nivelAnsiedad: number;
  decisionPostergada: string;
  avisoEstres: string;
  medidaCintura: string;
  medidaCadera: string;
  medidaPecho: string;
  dueloNoResuelto: string;
  conversacionPadres: string;
  yoDia90: string;
  practica1: string;
  practica2: string;
  practica3: string;
}

const BLOQUES: { id: number; title: string; subtitle: string; icon: IconName }[] = [
  { id: 1, title: 'ENERGÍA VITAL', subtitle: 'Bloque 1 · Tu nivel y mapa de energía', icon: 'zap' },
  { id: 2, title: 'LOS 3 GUARDIANES', subtitle: 'Bloque 2 · Miedo, Culpa y Vergüenza', icon: 'lock' },
  { id: 3, title: 'ESTADO MENTAL', subtitle: 'Bloque 3 · Ansiedad y decisiones postergadas', icon: 'brain' },
  { id: 4, title: 'ESTADO SOMÁTICO', subtitle: 'Bloque 4 · Tu cuerpo y medidas base', icon: 'body' },
  { id: 5, title: 'ESTADO EMOCIONAL', subtitle: 'Bloque 5 · Duelos y ciclos abiertos', icon: 'heart' },
  { id: 6, title: 'MANIFESTACIÓN DÍA 90', subtitle: 'Bloque 6 · Tu yo del futuro y 3 prácticas', icon: 'spark' },
];

export function CuestionarioProfundoScreen({ onComplete, onBack }: CuestionarioProfundoScreenProps) {
  const { c, t, mode, toggle } = useTheme();
  const { isTablet } = useResponsive();

  const [currentBlock, setCurrentBlock] = useState(0);
  const [formData, setFormData] = useState<DeepFormData>({
    energiaGeneral: 6,
    energiaManana: 6,
    energiaTarde: 5,
    actividadDrena: '',
    actividadRecarga: '',
    miedoIntensidad: 5,
    miedoQue: '',
    culpaIntensidad: 4,
    culpaQue: '',
    verguenzaIntensidad: 3,
    verguenzaQue: '',
    nivelAnsiedad: 5,
    decisionPostergada: '',
    avisoEstres: '',
    medidaCintura: '',
    medidaCadera: '',
    medidaPecho: '',
    dueloNoResuelto: '',
    conversacionPadres: '',
    yoDia90: '',
    practica1: '',
    practica2: '',
    practica3: '',
  });

  const activeBloque = BLOQUES[currentBlock];
  const isLast = currentBlock === BLOQUES.length - 1;

  const updateField = (key: keyof DeepFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateBloque = (): boolean => {
    if (currentBlock === 0) {
      if (!formData.actividadDrena.trim()) {
        Alert.alert('Respuesta requerida', 'Por favor describe qué actividad te drena más energía.');
        return false;
      }
      if (!formData.actividadRecarga.trim()) {
        Alert.alert('Respuesta requerida', 'Por favor describe qué actividad te recarga el alma.');
        return false;
      }
    } else if (currentBlock === 2) {
      if (!formData.decisionPostergada.trim()) {
        Alert.alert('Respuesta requerida', 'Por favor comparte qué decisión importante llevas postergando.');
        return false;
      }
    } else if (currentBlock === 5) {
      if (!formData.practica1.trim() || !formData.practica2.trim() || !formData.practica3.trim()) {
        Alert.alert('Prácticas requeridas', 'Por favor define tus 3 prácticas no negociables diarias.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateBloque()) return;

    if (isLast) {
      onComplete();
    } else {
      setCurrentBlock(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentBlock > 0) {
      setCurrentBlock(prev => prev - 1);
    } else {
      onBack();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <Pressable
          hitSlop={12}
          onPress={handlePrev}
          style={[styles.backBtn, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
        >
          <Icon name="arrowLeft" size={16} color={c.gold} />
          <Text style={[t.micro, { color: c.text, letterSpacing: 1.2 }]}>
            {currentBlock === 0 ? 'FICHA INICIAL' : 'ANTERIOR'}
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
          { maxWidth: isTablet ? 540 : undefined, alignSelf: isTablet ? 'center' : 'stretch', width: isTablet ? '100%' : undefined }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconMedallion, { borderColor: c.gold, backgroundColor: c.cardBg }]}>
            <Icon name={activeBloque.icon} size={22} color={c.gold} />
          </View>
          <MicroLabel>{activeBloque.subtitle}</MicroLabel>
          <Text style={[t.screenTitle, { color: c.textStrong, marginTop: 4, textAlign: 'center' }]}>
            {activeBloque.title}
          </Text>
        </View>

        {/* Progress Pills */}
        <View style={styles.pillsRow}>
          {BLOQUES.map((b, idx) => (
            <View
              key={b.id}
              style={[
                styles.pill,
                {
                  backgroundColor: idx <= currentBlock ? c.gold : c.cardBgAlt,
                  borderColor: idx === currentBlock ? c.gold : c.border,
                  opacity: idx === currentBlock ? 1 : idx < currentBlock ? 0.7 : 0.35,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 9,
                  color: idx <= currentBlock ? c.onGold : c.tabInactive,
                  fontFamily: 'Jost_700Bold',
                }}
              >
                {b.id}
              </Text>
            </View>
          ))}
        </View>

        {/* Bloques de Preguntas */}
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          {currentBlock === 0 && (
            <View style={{ gap: 16 }}>
              <SliderRating
                label="TU NIVEL DE ENERGÍA VITAL PROMEDIO HOY"
                value={formData.energiaGeneral}
                onChange={val => updateField('energiaGeneral', val)}
                minLabel="Baja (1)"
                maxLabel="Poderosa (10)"
              />
              <SliderRating
                label="ENERGÍA AL DESPERTAR (6-8 AM)"
                value={formData.energiaManana}
                onChange={val => updateField('energiaManana', val)}
              />
              <SliderRating
                label="ENERGÍA EN LA TARDE (4-6 PM)"
                value={formData.energiaTarde}
                onChange={val => updateField('energiaTarde', val)}
              />
              <FormField
                label="¿QUÉ ACTIVIDAD TE DRENA MÁS ENERGÍA?"
                value={formData.actividadDrena}
                onChangeText={val => updateField('actividadDrena', val)}
                placeholder="Lo que más me agota es..."
                multiline
                numberOfLines={2}
              />
              <FormField
                label="¿QUÉ ACTIVIDAD TE RECARGA EL ALMA?"
                value={formData.actividadRecarga}
                onChangeText={val => updateField('actividadRecarga', val)}
                placeholder="Lo que más me devuelve la vitalidad es..."
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {currentBlock === 1 && (
            <View style={{ gap: 16 }}>
              <SliderRating
                label="¿QUÉ TAN PRESENTE ESTÁ EL MIEDO EN TU DÍA?"
                value={formData.miedoIntensidad}
                onChange={val => updateField('miedoIntensidad', val)}
                minLabel="Leve (1)"
                maxLabel="Intenso (10)"
              />
              <FormField
                label="¿DE QUÉ TIENES MÁS MIEDO EN ESTE MOMENTO?"
                value={formData.miedoQue}
                onChangeText={val => updateField('miedoQue', val)}
                placeholder="Mi mayor miedo es..."
                multiline
                numberOfLines={2}
              />
              <SliderRating
                label="¿QUÉ TAN PRESENTE ESTÁ LA CULPA?"
                value={formData.culpaIntensidad}
                onChange={val => updateField('culpaIntensidad', val)}
              />
              <FormField
                label="¿POR QUÉ O CON QUIÉN CARGAS CULPA?"
                value={formData.culpaQue}
                onChangeText={val => updateField('culpaQue', val)}
                placeholder="Siento culpa respecto a..."
                multiline
                numberOfLines={2}
              />
              <SliderRating
                label="¿QUÉ TAN PRESENTE ESTÁ LA VERGÜENZA?"
                value={formData.verguenzaIntensidad}
                onChange={val => updateField('verguenzaIntensidad', val)}
              />
            </View>
          )}

          {currentBlock === 2 && (
            <View style={{ gap: 16 }}>
              <SliderRating
                label="NIVEL DE ANSIEDAD DIARIA"
                value={formData.nivelAnsiedad}
                onChange={val => updateField('nivelAnsiedad', val)}
                minLabel="Tranquilo (1)"
                maxLabel="Muy alta (10)"
              />
              <FormField
                label="DECISIÓN IMPORTANTE QUE LLEVAS POSTERGANDO HACE MESES"
                helperText="Sé honesto/a"
                value={formData.decisionPostergada}
                onChangeText={val => updateField('decisionPostergada', val)}
                placeholder="La decisión que he evitado tomar es..."
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {currentBlock === 3 && (
            <View style={{ gap: 16 }}>
              <FormField
                label="¿CÓMO TE AVISA TU CUERPO CUANDO ESTÁS ESTRESADO/A?"
                helperText="Síntomas y tensión física"
                value={formData.avisoEstres}
                onChangeText={val => updateField('avisoEstres', val)}
                placeholder="Mi cuerpo reacciona en..."
                multiline
                numberOfLines={3}
              />
              <View style={{ gap: 10 }}>
                <MicroLabel>MEDIDAS CORPORALES BASE (CM)</MicroLabel>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="CINTURA"
                      value={formData.medidaCintura}
                      onChangeText={val => updateField('medidaCintura', val)}
                      placeholder="cm"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="CADERA"
                      value={formData.medidaCadera}
                      onChangeText={val => updateField('medidaCadera', val)}
                      placeholder="cm"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="PECHO"
                      value={formData.medidaPecho}
                      onChangeText={val => updateField('medidaPecho', val)}
                      placeholder="cm"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {currentBlock === 4 && (
            <View style={{ gap: 16 }}>
              <FormField
                label="DUELOS O CAPÍTULOS NO RESUELTOS"
                helperText="Relaciones o etapas sin cerrar"
                value={formData.dueloNoResuelto}
                onChangeText={val => updateField('dueloNoResuelto', val)}
                placeholder="Lo que aún no termino de soltar es..."
                multiline
                numberOfLines={3}
              />
              <FormField
                label="CONVERSACIÓN PENDIENTE CON TUS PADRES"
                value={formData.conversacionPadres}
                onChangeText={val => updateField('conversacionPadres', val)}
                placeholder="Lo que nunca les he dicho es..."
                multiline
                numberOfLines={3}
              />
            </View>
          )}

          {currentBlock === 5 && (
            <View style={{ gap: 16 }}>
              <FormField
                label="¿QUÉ TE DIRÁ TU YO DEL DÍA 90?"
                helperText="Tu versión renovada y triunfante"
                value={formData.yoDia90}
                onChangeText={val => updateField('yoDia90', val)}
                placeholder="Frente a ti en el Día 90, te dirá..."
                multiline
                numberOfLines={3}
              />
              <View style={{ gap: 10 }}>
                <MicroLabel>3 PRÁCTICAS NO NEGOCIABLES DIARIAS</MicroLabel>
                <FormField
                  label="PRÁCTICA #1"
                  value={formData.practica1}
                  onChangeText={val => updateField('practica1', val)}
                  placeholder="Ej. 20 min de lectura de alto valor"
                  icon="spark"
                />
                <FormField
                  label="PRÁCTICA #2"
                  value={formData.practica2}
                  onChangeText={val => updateField('practica2', val)}
                  placeholder="Ej. Entrenamiento físico sin excusas"
                  icon="body"
                />
                <FormField
                  label="PRÁCTICA #3"
                  value={formData.practica3}
                  onChangeText={val => updateField('practica3', val)}
                  placeholder="Ej. 1 hora de trabajo profundo en mi negocio"
                  icon="briefcase"
                />
              </View>
            </View>
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionsRow}>
          {currentBlock > 0 && (
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
            label={isLast ? 'FINALIZAR CUESTIONARIO' : 'SIGUIENTE'}
            variant="primary"
            onPress={handleNext}
            icon="arrow"
            style={{ flex: currentBlock > 0 ? 1.5 : 1 }}
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
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 6,
  },
  pill: {
    flex: 1,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
