import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FichaInicialScreen } from './FichaInicialScreen';
import { TerminosScreen } from './TerminosScreen';
import { ActivarProgramaScreen } from './ActivarProgramaScreen';
import { useAuth } from '../../auth/context/AuthContext';
import { useTheme } from '../../../theme/ThemeContext';
import { FichaDeIngreso, FichaInicialData } from '../types/onboarding.types';
import { obtenerEstadoDeMiDiagnostico } from '../../diagnostico/api/diagnosticoApi';
import { DiagnosticoDeLaPersonaScreen } from '../../diagnostico/screens/DiagnosticoDeLaPersonaScreen';
import { MiDiagnosticoScreen } from '../../diagnostico/screens/MiDiagnosticoScreen';
import { SignatureData } from '../../../components/SignatureCanvas';
import * as onboardingApi from '../api/onboardingApi';

/**
 * Spec 026 (2026-10-31): quien entra «con diagnóstico» ve el diagnóstico EN LUGAR de la ficha estándar: Diagnóstico → Términos →
 * Elegir tu Día 1. La ficha estándar —la de hoy— no cambia. `mi-diagnostico` es solo el «volver» de Términos para esa persona
 * (lo que respondió, en solo lectura): no hay una ficha a la que volver a editar.
 *
 * Decisión 2026-09-03: el Pacto ("VERDAD", Código I de Renaser — `PactoScreen`) SALE del
 * onboarding inicial hasta una futura actualización del cliente. El flujo pasa a ser
 * Ficha → Términos → Elegir tu Día 1 → Home. `PactoScreen` queda intacta y sin usar (no se borra,
 * vuelve a conectarse acá cuando se retome).
 */
type OnboardingStep = 'ficha' | 'diagnostico' | 'mi-diagnostico' | 'terminos' | 'activar-programa';

export function OnboardingFlow() {
  const { c } = useTheme();
  const { user, completeOnboarding, logout } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('ficha');
  /* Qué ficha le toca (spec 026). Mientras no se sabe, la estándar: es el valor por defecto de siempre. */
  const [ficha, setFicha] = useState<FichaDeIngreso>('ESTANDAR');

  /**
   * Bug encontrado 2026-09-03 (reportado en vivo): este componente arrancaba SIEMPRE en 'ficha',
   * sin importar que `GET /onboarding/state` ya supiera que la persona había terminado Términos —
   * cerrar la app después de firmar Términos y volver a abrirla mandaba de nuevo a la Ficha
   * Inicial completa, aunque nada se hubiera perdido en el backend (mismo motivo que ya resolvía
   * `FichaInicialScreen` capítulo por capítulo, acá faltaba al nivel del flujo entero). Se
   * resuelve preguntando una vez al backend, sin agregar ningún endpoint nuevo:
   * `termsAcceptedAt` ya lo devuelve `GET /onboarding/state`. `ActivarProgramaScreen` ya sabe
   * saltar directo a Home si el programa ya estaba activado, así que alcanza con decidir entre
   * 'ficha' y 'activar-programa' — no hace falta reconstruir el capítulo exacto de Términos.
   */
  const [resolviendoPaso, setResolviendoPaso] = useState(true);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const estado = await onboardingApi.obtenerEstado();
        if (!vigente) return;
        setFicha(estado.ficha);
        if (estado.termsAcceptedAt) {
          setStep('activar-programa');
        } else if (estado.ficha === 'CON_DIAGNOSTICO') {
          /* Con diagnóstico: si ya lo terminó (cerró la app en Términos), sigue Términos; si no, lo retoma donde iba. Si no se
             puede saber (sin red), se abre el diagnóstico: él mismo avisa si ya estaba terminado (409) y deja reintentar. */
          const diagnostico = await obtenerEstadoDeMiDiagnostico().catch(() => null);
          if (!vigente) return;
          setStep(diagnostico?.estado === 'COMPLETADO' ? 'terminos' : 'diagnostico');
        }
      } catch (e) {
        // Sin red o backend caído: se sigue con 'ficha' (el valor por defecto) — es la opción
        // segura, nunca peor que lo que ya pasaba antes de este cambio.
        console.warn('No se pudo consultar el paso de onboarding en el que estabas:', e);
      } finally {
        if (vigente) setResolviendoPaso(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const [participantName, setParticipantName] = useState(user?.name || '');
  const [terminosSignature, setTerminosSignature] = useState<SignatureData | null>(null);
  const [savedFicha, setSavedFicha] = useState<FichaInicialData | null>(null);

  const handleFinishFicha = (fichaData: FichaInicialData) => {
    setSavedFicha(fichaData);
    if (fichaData.identidad.nombre) {
      setParticipantName(fichaData.identidad.nombre);
    }
    setStep('terminos');
  };

  const handleAcceptTerminos = () => {
    setStep('activar-programa');
  };

  const handleProgramaActivado = () => {
    // Completa el onboarding e ingresa directamente al Home (MainTabs)
    completeOnboarding(savedFicha || undefined);
  };

  if (resolviendoPaso) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.goldInk} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  switch (step) {
    case 'ficha':
      return (
        <FichaInicialScreen
          userId={user?.id}
          initialUserName={participantName || user?.name || ''}
          initialUserEmail={user?.email || ''}
          onComplete={handleFinishFicha}
          onBack={logout}
        />
      );
    case 'diagnostico':
      return <DiagnosticoDeLaPersonaScreen onTerminado={() => setStep('terminos')} onSalir={logout} />;
    case 'mi-diagnostico':
      return <MiDiagnosticoScreen onBack={() => setStep('terminos')} />;
    case 'terminos':
      return (
        <TerminosScreen
          savedSignature={terminosSignature}
          onSaveSignature={setTerminosSignature}
          onAccept={handleAcceptTerminos}
          onBack={() => setStep(ficha === 'CON_DIAGNOSTICO' ? 'mi-diagnostico' : 'ficha')}
        />
      );
    case 'activar-programa':
      return <ActivarProgramaScreen onActivated={handleProgramaActivado} />;
  }
}
