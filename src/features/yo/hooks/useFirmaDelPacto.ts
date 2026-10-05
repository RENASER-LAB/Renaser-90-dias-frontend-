import { useEffect, useState } from 'react';

import { obtenerFirmaDelPacto } from '../../onboarding/api/onboardingApi';
import { fuenteDeLaFirma, type FuenteDeLaFirma } from '../utils/firmaDelPacto';

/**
 * Pide la imagen de la firma del Pacto de quien mira (D-253) al montarse: cada vez que se abre el Pacto
 * ya firmado, una URL nueva de 15 minutos (la imagen en sí sale de la caché de disco, ver
 * `fuenteDeLaFirma`).
 *
 * Nunca falla hacia afuera: un 404 (no hay firma guardada), un 403, la falta de red o un backend anterior
 * a D-253 (sin la ruta) dejan `null`, y el Pacto se ve como antes, con «Firmado el …» y nada más. No hay
 * mensaje de error: no es algo que la persona pidió, y la fecha de la firma ya está a la vista.
 */
export function useFirmaDelPacto(): FuenteDeLaFirma | null {
  const [fuente, setFuente] = useState<FuenteDeLaFirma | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerFirmaDelPacto()
      .then(firma => {
        if (vigente) setFuente(fuenteDeLaFirma(firma.url));
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  return fuente;
}
