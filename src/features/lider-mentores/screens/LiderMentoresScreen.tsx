import React, { useState } from 'react';

import type { TipoObservacion } from '../api/liderMentoresSchemas';
import { FichaMentorScreen } from './FichaMentorScreen';
import { ObservarScreen } from './ObservarScreen';
import { PadronScreen } from './PadronScreen';
import { ReporteScreen } from './ReporteScreen';

type Vista =
  | { tipo: 'padron' }
  | { tipo: 'reporte' }
  | { tipo: 'ficha'; mentorId: string; aviso: string | null }
  | { tipo: 'observar'; mentorId: string; nombre: string; observacion: TipoObservacion };

/**
 * «Mis mentores», la gestión del Líder de Mentores (SDD 002; backend D-241). Es estado de Hoy, como la
 * bandeja de tickets y el semáforo por grupos: sin sexta pestaña (RL-28). Cada nivel registra su
 * retroceso del sistema y vuelve al anterior: padrón ← ficha ← observar, padrón ← reporte.
 */
export function LiderMentoresScreen({ onSalir }: { onSalir: () => void }) {
  const [vista, setVista] = useState<Vista>({ tipo: 'padron' });
  const alPadron = () => setVista({ tipo: 'padron' });

  switch (vista.tipo) {
    case 'reporte':
      return <ReporteScreen onVolver={alPadron} />;
    case 'ficha':
      return (
        <FichaMentorScreen
          mentorId={vista.mentorId}
          aviso={vista.aviso}
          onVolver={alPadron}
          onObservar={(observacion, nombre) => setVista({ tipo: 'observar', mentorId: vista.mentorId, nombre, observacion })}
        />
      );
    case 'observar':
      return (
        <ObservarScreen
          mentorId={vista.mentorId}
          nombre={vista.nombre}
          tipo={vista.observacion}
          onVolver={() => setVista({ tipo: 'ficha', mentorId: vista.mentorId, aviso: null })}
          onGuardada={aviso => setVista({ tipo: 'ficha', mentorId: vista.mentorId, aviso })}
        />
      );
    default:
      return (
        <PadronScreen
          onVolver={onSalir}
          onAbrirMentor={mentorId => setVista({ tipo: 'ficha', mentorId, aviso: null })}
          onAbrirReporte={() => setVista({ tipo: 'reporte' })}
        />
      );
  }
}
