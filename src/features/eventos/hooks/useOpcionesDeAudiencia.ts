import { useEffect, useState } from 'react';

import { obtenerOpciones } from '../api/audienciaApi';
import { SIN_OPCIONES } from '../api/audienciaSchemas';
import type { OpcionesDeAudiencia } from '../types/audiencia.types';

/**
 * Qué puede elegir esta cuenta al crear un evento (spec 044, FR-029): lo dice el servidor, no una lista de roles en el teléfono. Se pregunta una
 * vez por cuenta y formación. Mientras no se sabe —y si falla, o el servidor es anterior (404)— no se ofrece nada nuevo.
 */
export function useOpcionesDeAudiencia(
  activo: boolean,
  cuenta: string | null,
  formation: string | null,
): { sabido: boolean; opciones: OpcionesDeAudiencia } {
  const [estado, setEstado] = useState<{ sabido: boolean; opciones: OpcionesDeAudiencia }>({ sabido: false, opciones: SIN_OPCIONES });

  useEffect(() => {
    if (!activo || !cuenta) return;
    let vivo = true;
    setEstado({ sabido: false, opciones: SIN_OPCIONES });
    obtenerOpciones(formation)
      .then(opciones => vivo && setEstado({ sabido: true, opciones }))
      .catch(() => vivo && setEstado({ sabido: true, opciones: SIN_OPCIONES }));
    return () => {
      vivo = false;
    };
  }, [activo, cuenta, formation]);

  return estado;
}
