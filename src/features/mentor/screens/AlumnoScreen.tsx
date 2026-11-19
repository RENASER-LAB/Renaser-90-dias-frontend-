import React, { useMemo } from 'react';

import { BotonDescargarSemana } from '../../lider-mentores/components/BotonDescargarSemana';
import { FichaDePersona } from '../components/FichaDePersona';
import type { OrigenDeLaFicha } from '../utils/lecturasDeLaFicha';
import type { AlumnoConEstado } from '../types/mentor.types';

/**
 * La ficha de un aprendiz para su mentor (spec 055, historia 2): `FichaDePersona` con origen mentor, que lee por las rutas del mentor
 * desde su grupo. Desde la spec 056 el cuerpo vive en `FichaDePersona` y lo comparte con el líder; acá solo queda lo propio del mentor:
 * el botón «Descargar semana» para los aprendices que acompaña hoy (FR-047), que solo se ofrece desde un grupo suyo.
 */
export function AlumnoScreen({
  alumno,
  grupoId,
  onVolver,
  onYaNoAcompana,
  rotuloDeVolver,
}: {
  alumno: AlumnoConEstado;
  grupoId: string | null;
  onVolver: () => void;
  /** El servidor respondió que ya no lo acompaña: quien llama vuelve a la lista (con `motivo` a la vista). Sin esto, se vuelve atrás con un aviso. */
  onYaNoAcompana?: (motivo: string) => void;
  rotuloDeVolver?: string;
}) {
  const origen = useMemo<OrigenDeLaFicha>(() => ({ quien: 'mentor', grupoId }), [grupoId]);
  return (
    <FichaDePersona
      origen={origen}
      alumno={alumno}
      onVolver={onVolver}
      onYaNoAcompana={onYaNoAcompana}
      rotuloDeVolver={rotuloDeVolver}
      pie={grupoId ? ({ semanaHasta }) => <BotonDescargarSemana documento={{ tipo: 'APRENDIZ', personaId: alumno.participanteId }} semanaHasta={semanaHasta} /> : undefined}
    />
  );
}
