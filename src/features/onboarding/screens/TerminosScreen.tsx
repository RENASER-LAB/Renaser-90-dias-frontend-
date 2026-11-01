import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Alert } from '../../../components/Alerta';
import { useTheme } from '../../../theme/ThemeContext';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { MarcoDePaso } from '../components/MarcoDePaso';
import { tacto } from '../../../utils/tacto';
import { usePersistenciaOnboarding } from '../hooks/usePersistenciaOnboarding';
import { ContenidoDeLosTerminos } from '../terminos/components/ContenidoDeLosTerminos';
import { useMisTerminos } from '../terminos/hooks/useMisTerminos';
import { avisoDeSellar, useSellarTerminos } from '../terminos/hooks/useSellarTerminos';
import { borradorDesde, TERMINOS_DE_LA_APP } from '../terminos/utils/borradorDeTerminos';
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
  const { avanzarEstado } = usePersistenciaOnboarding();
  const sellar = useSellarTerminos();
  /* Spec 027: el texto lo manda el servidor (los términos vigentes de MI formación, editables por Administración). Sin él —un backend anterior, o mientras
     llega— se usa el que la app lleva dentro, que es exactamente el de siempre. */
  const { terminos, recargar } = useMisTerminos();
  const contenido = terminos?.version ? borradorDesde(terminos.version) : TERMINOS_DE_LA_APP;
  const versionId = terminos?.version?.id ?? null;
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
      /* Firma con valor legal: se captura el lienzo ya dibujado como PNG y se sube a S3 con su referencia guardada en la base (ver mapaPreguntas.ts,
         PREGUNTA_FIRMA_TERMINOS). La constancia de QUÉ versión leyó va al final, en la misma llamada del hito (spec 027). */
      const resultado = await sellar({ capturarFirma: async () => signatureRef.current?.capturarComoPngBase64(), trazos: signature?.data ?? null, versionId });
      if (resultado.tipo !== 'ok') {
        if (resultado.tipo === 'cambiaron') await recargar();
        const aviso = avisoDeSellar(resultado);
        Alert.alert(aviso.titulo, aviso.mensaje);
        return;
      }

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
          {contenido.titulo}
        </Text>
        <Text style={[t.body, { color: c.textSoft }]}>
          {`Lee atentamente las ${contenido.clausulas.length} cláusulas y sella tu aceptación`}
        </Text>
      </View>

      <View style={styles.cuerpo}>
        <ContenidoDeLosTerminos introduccion={contenido.introduccion} clausulas={contenido.clausulas} />

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
          title={contenido.textoCasilla}
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
  signatureCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
});
