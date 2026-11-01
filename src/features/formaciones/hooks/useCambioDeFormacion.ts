import { useCallback, useEffect, useRef, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import { useFormacionDeLaSesion } from '../context/FormacionContext';

/**
 * Elegir la formación en la que trabaja el personal (spec 022). Compartido por la hoja de Yo y por la pregunta de la primera vez:
 * vibra con el «tic» al tocar y con el logro al quedar elegida, y dice el error del servidor si no se pudo. Cambiar la activa vuelve
 * a armar todas las vistas (ver `llaveDeLasVistas`), así que esto puede desmontarse mientras responde: no escribe estado después.
 */
export function useCambioDeFormacion(alElegir?: () => void) {
  const { formacion, elegir } = useFormacionDeLaSesion();
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const montado = useRef(true);
  useEffect(() => () => { montado.current = false; }, []);

  const cambiar = useCallback(
    async (codigo: string) => {
      if (enCurso !== null) return;
      setError(null);
      setEnCurso(codigo);
      tacto.seleccion();
      try {
        await elegir(codigo);
        tacto.logro();
        alElegir?.();
      } catch (e) {
        if (montado.current) setError(mensajeDeError(e, 'No pudimos cambiar de formación. Inténtalo de nuevo.'));
      } finally {
        if (montado.current) setEnCurso(null);
      }
    },
    [alElegir, elegir, enCurso],
  );

  return { formacion, enCurso, error, cambiar, limpiarError: () => setError(null) };
}
