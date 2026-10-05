import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Alert } from '../../../components/Alerta';
import { useTheme } from '../../../theme/ThemeContext';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { MarcoDePaso } from '../components/MarcoDePaso';
import { tacto } from '../../../utils/tacto';
import { TERMINOS_CLAUSULAS } from '../data/terminosData';
import { mapearTerminos, PREGUNTA_FIRMA_TERMINOS } from '../data/mapaPreguntas';
import { usePersistenciaOnboarding } from '../hooks/usePersistenciaOnboarding';
import { Icon } from '../../../components/Icon';
import {
  SignatureCanvas,
  SignatureCanvasHandle,
  SignatureData,
  safeParsePaths,
} from '../../../components/SignatureCanvas';
import { Checkbox } from '../../../components/Checkbox';
import { GoldButton } from '../../../components/GoldButton';

interface TerminosScreenProps {
  onAccept: () => void;
  onBack: () => void;
  savedSignature?: SignatureData | null;
  onSaveSignature?: (sig: SignatureData) => void;
}

export function TerminosScreen({
  onAccept,
  onBack,
  savedSignature,
  onSaveSignature,
}: TerminosScreenProps) {
  const { c, t } = useTheme();
  const { guardarCapitulo, avanzarEstado, aceptarHito, guardarFirma } = usePersistenciaOnboarding();
  // Ref al lienzo para poder capturarlo como PNG al confirmar (ver SignatureCanvas.capturarComoPngBase64).
  const signatureRef = useRef<SignatureCanvasHandle>(null);

  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<SignatureData | null>(savedSignature || null);
  const [hasSigned, setHasSigned] = useState<boolean>(Boolean(savedSignature?.data && savedSignature.data.trim().length > 0));
  const [showError, setShowError] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (savedSignature && savedSignature.data && savedSignature.data.trim().length > 0) {
      setSignature(savedSignature);
      setHasSigned(true);
    }
  }, [savedSignature]);

  const handleSignatureChange = (valid: boolean, sigData: SignatureData) => {
    setHasSigned(valid);
    setSignature(valid ? sigData : null);
    if (valid) {
      onSaveSignature?.(sigData);
      if (showError) setShowError(false);
    }
  };

  const handleContinue = async () => {
    if (!accepted) {
      setShowError(true);
      tacto.error();
      Alert.alert(
        'Aceptación requerida',
        'Por favor marca la casilla de lectura y aceptación de los términos y condiciones.'
      );
      return;
    }
    if (!hasSigned) {
      setShowError(true);
      tacto.error();
      Alert.alert(
        'Firma requerida',
        'Por favor dibuja tu firma con el dedo en el recuadro para validar la aceptación legal.'
      );
      return;
    }
    if (signature) {
      onSaveSignature?.(signature);
    }
    if (guardando) return;

    // Decisión 2026-09-03 (reemplaza la de 2026-09-01): ni la respuesta de aceptación ni la firma
    // pueden fallar en silencio acá — es un compromiso legal, así que si no se pudo respaldar, la
    // persona se entera y no avanza creyendo que quedó firmado.
    setGuardando(true);
    try {
      const resultadoRespuesta = await guardarCapitulo(mapearTerminos(accepted));
      if (resultadoRespuesta.pendientes > 0) {
        Alert.alert('No se pudo guardar', 'No pudimos registrar tu aceptación. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }

      // Firma con valor legal: se captura el lienzo ya dibujado como PNG y se sube a S3 con su
      // referencia guardada en la base (ver mapaPreguntas.ts, PREGUNTA_FIRMA_TERMINOS).
      const pngFirma = await signatureRef.current?.capturarComoPngBase64();
      if (!pngFirma || !signature) {
        Alert.alert('No se pudo capturar la firma', 'Vuelve a dibujar tu firma e inténtalo de nuevo.');
        return;
      }
      const resultadoFirma = await guardarFirma({
        flow: 'terminos',
        questionKey: PREGUNTA_FIRMA_TERMINOS.clave,
        pngBase64: pngFirma,
        trazosOriginales: signature.data,
      });
      if (!resultadoFirma.ok) {
        Alert.alert(
          'No se pudo guardar tu firma',
          'No pudimos respaldar tu firma en el almacenamiento. Revisa tu conexión e inténtalo de nuevo.'
        );
        return;
      }

      await aceptarHito('TERMINOS');
      await avanzarEstado({ flow: 'terminos', section: 'aceptacion', step: 0 });

      tacto.logro();
      onAccept();
    } finally {
      setGuardando(false);
    }
  };

  // El gesto/botón atrás de Android vuelve a la Ficha, igual que la flecha de arriba. Antes esta
  // pantalla no lo atendía y el sistema podía cerrar la app (AGENTS.md §6).
  useSystemBackHandler(() => {
    onBack();
    return true;
  }, true);

  return (
    <MarcoDePaso
      alVolver={onBack}
      accesibilidadVolver="Volver a la ficha"
      pie={
        /* Fijo abajo y encendido siempre, como en los otros capítulos: si falta la casilla o la
           firma, al tocarlo se dice cuál («Aceptación requerida» / «Firma requerida») y el recuadro
           de la firma se marca. Antes quedaba apagado hasta tener las dos, sin decir qué faltaba, y
           esas dos alertas nunca llegaban a salir (ONB-02, e2e web del 2026-09-27). */
        <GoldButton label="CONTINUAR" onPress={handleContinue} loading={guardando} icon="arrow" />
      }
    >
      {/* Encabezado: mismos textos; alineado a la izquierda y sin el medallón, como el resto del
          onboarding desde el 2026-10-05. */}
      <View style={styles.header}>
        <Text style={[t.micro, { color: c.micro, textTransform: 'uppercase' }]}>Acuerdo de transformación</Text>
        <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
          Términos y condiciones
        </Text>
        <Text style={[t.body, { color: c.textSoft }]}>
          Lee atentamente las 23 cláusulas y sella tu aceptación
        </Text>
      </View>

      <View style={styles.cuerpo}>
        {/* Legal Clauses Container */}
        <View style={[styles.termsCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <View style={[styles.preambleBox, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
            <Icon name="diamond" size={16} color={c.goldInk} />
            <Text style={[t.body, { color: c.textStrong, fontFamily: 'Jost_500Medium', flex: 1, fontSize: 14, lineHeight: 21 }]}>
              Al inscribirme en el programa Renaser, declaro que lo hago de manera libre y voluntaria, y acepto íntegramente los siguientes términos:
            </Text>
          </View>

          <View style={styles.clausesList}>
            {TERMINOS_CLAUSULAS.map(item => (
              <View key={item.num} style={styles.clauseRow}>
                <View style={[styles.numBadge, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
                  <Text style={[t.micro, { color: c.goldInk, fontSize: 10, fontFamily: 'Jost_700Bold' }]}>
                    {item.num < 10 ? `0${item.num}` : item.num}
                  </Text>
                </View>
                <Text style={[t.body, styles.clauseText, { color: c.text, fontSize: 14, lineHeight: 22 }]}>
                  {item.texto}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Signature Box */}
        <View style={[styles.signatureCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <SignatureCanvas
            ref={signatureRef}
            onSignatureChange={handleSignatureChange}
            label="Firma de aceptación legal (con tu dedo)"
            initialSignature={savedSignature}
            error={showError && !hasSigned ? 'Por favor dibuja tu firma con el dedo para continuar' : null}
          />
        </View>

        {/* Acceptance Checkbox */}
        <Checkbox
          checked={accepted}
          onToggle={val => {
            tacto.seleccion();
            setAccepted(val);
            if (val && showError) setShowError(false);
          }}
          title="He leído y acepto los Términos y Condiciones"
          subtitle="Este es un compromiso legal y ético entre tú y el sistema Renaser."
        />
      </View>
    </MarcoDePaso>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
    marginBottom: 24,
  },
  cuerpo: {
    gap: 14,
  },
  termsCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  preambleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  clausesList: {
    gap: 14,
  },
  clauseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  numBadge: {
    width: 26,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  clauseText: {
    flex: 1,
  },
  signatureCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
});
