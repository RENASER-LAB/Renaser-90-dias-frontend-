import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TipoObservacion } from '../api/liderMentoresSchemas';
import { FichaMentorScreen } from './FichaMentorScreen';
import { ObservarScreen } from './ObservarScreen';
import { PadronScreen } from './PadronScreen';
import { PersonaDelLiderScreen } from './PersonaDelLiderScreen';
import { ReporteScreen } from './ReporteScreen';

/** Lo que dice la pantalla si el servidor ya no abre sus días (404): dejó su programa, o el servidor es anterior a la ruta. */
export const AVISO_SI_NO_SE_ABREN_SUS_DIAS = 'Sus días ya no están disponibles para ver.';

type Vista =
  | { tipo: 'padron' }
  | { tipo: 'reporte' }
  | { tipo: 'ficha'; mentorId: string; aviso: string | null }
  /** D-318: los 7 días del mentor (o de la guía) con programa propio; la ficha sigue montada, oculta, debajo. */
  | { tipo: 'dias'; mentorId: string; nombre: string; avatarUrl: string | null; aviso: string | null }
  | { tipo: 'observar'; mentorId: string; nombre: string; observacion: TipoObservacion };

/**
 * «Mis mentores», la gestión del Líder de Mentores (SDD 002; backend D-241). Es estado de Hoy, como la
 * bandeja de tickets y el semáforo por grupos: sin sexta pestaña (RL-28). Cada nivel registra su
 * retroceso del sistema y vuelve al anterior: padrón ← ficha ← observar, padrón ← ficha ← sus días, padrón ← reporte.
 *
 * **Sus días y evidencias (D-318):** desde la ficha de un mentor que hace su propio programa se abre `PersonaDelLiderScreen` por la
 * puerta sin grupo (`/leadership/people/{id}/…`), sin «Avisar a su mentor» (él es el mentor). La ficha queda montada, oculta, como la
 * lista de «Todos los aprendices» bajo la persona: al volver conserva su lugar sin releerse.
 */
export function LiderMentoresScreen({ onSalir }: { onSalir: () => void }) {
  const [vista, setVista] = useState<Vista>({ tipo: 'padron' });
  const alPadron = () => setVista({ tipo: 'padron' });

  switch (vista.tipo) {
    case 'reporte':
      return <ReporteScreen onVolver={alPadron} />;
    case 'ficha':
    case 'dias': {
      const verSusDias = vista.tipo === 'dias';
      return (
        <>
          <View style={verSusDias ? estilos.oculta : estilos.visible}>
            <FichaMentorScreen
              mentorId={vista.mentorId}
              aviso={vista.aviso}
              onVolver={alPadron}
              enSegundoPlano={verSusDias}
              onObservar={(observacion, nombre) => setVista({ tipo: 'observar', mentorId: vista.mentorId, nombre, observacion })}
              onAbrirDias={mentor =>
                setVista({ tipo: 'dias', mentorId: mentor.userId, nombre: mentor.nombre, avatarUrl: mentor.avatarUrl, aviso: vista.aviso })
              }
            />
          </View>
          {vista.tipo === 'dias' ? (
            <PersonaDelLiderScreen
              key={vista.mentorId}
              grupoId={null}
              /* En lugar del grupo: de qué son estos días. «Mentor · No se mide en el semáforo» lo dice el encabezado. */
              grupoNombre="Su propio programa"
              personaId={vista.mentorId}
              nombre={vista.nombre}
              avatarUrl={vista.avatarUrl}
              desdeTodos
              avisarAlMentor={false}
              avisoSiNoSeAbre={AVISO_SI_NO_SE_ABREN_SUS_DIAS}
              onVolver={() => setVista({ tipo: 'ficha', mentorId: vista.mentorId, aviso: vista.aviso })}
            />
          ) : null}
        </>
      );
    }
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

const estilos = StyleSheet.create({
  visible: { flex: 1 },
  oculta: { display: 'none' },
});
