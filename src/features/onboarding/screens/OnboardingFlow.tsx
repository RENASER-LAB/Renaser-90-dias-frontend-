import React, { useState } from 'react';
import { FichaInicialScreen } from './FichaInicialScreen';
import { TerminosScreen } from './TerminosScreen';
import { PactoScreen } from './PactoScreen';
import { useAuth } from '../../auth/context/AuthContext';
import { FichaInicialData } from '../types/onboarding.types';
import { SignatureData } from '../../../components/SignatureCanvas';

type OnboardingStep = 'ficha' | 'terminos' | 'pacto';

export function OnboardingFlow() {
  const { user, completeOnboarding, logout } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('ficha');
  const [participantName, setParticipantName] = useState(user?.name || '');
  const [terminosSignature, setTerminosSignature] = useState<SignatureData | null>(null);
  const [codigoVerdadSignature, setCodigoVerdadSignature] = useState<SignatureData | null>(null);
  const [savedFicha, setSavedFicha] = useState<FichaInicialData | null>(null);

  const handleFinishFicha = (fichaData: FichaInicialData) => {
    setSavedFicha(fichaData);
    if (fichaData.identidad.nombre) {
      setParticipantName(fichaData.identidad.nombre);
    }
    setStep('terminos');
  };

  const handleAcceptTerminos = () => {
    setStep('pacto');
  };

  const handleAcceptPacto = (name: string, sig: SignatureData) => {
    setParticipantName(name);
    setCodigoVerdadSignature(sig);
    // Completa el onboarding e ingresa directamente al Home (MainTabs)
    completeOnboarding(savedFicha || undefined);
  };

  switch (step) {
    case 'ficha':
      return (
        <FichaInicialScreen
          initialUserName={participantName || user?.name || ''}
          initialUserEmail={user?.email || ''}
          onComplete={handleFinishFicha}
          onBack={logout}
        />
      );
    case 'terminos':
      return (
        <TerminosScreen
          savedSignature={terminosSignature}
          onSaveSignature={setTerminosSignature}
          onAccept={handleAcceptTerminos}
          onBack={() => setStep('ficha')}
        />
      );
    case 'pacto':
      return (
        <PactoScreen
          initialName={participantName || user?.name || ''}
          savedSignature={codigoVerdadSignature}
          onAccept={handleAcceptPacto}
          onBack={() => setStep('terminos')}
        />
      );
  }
}
