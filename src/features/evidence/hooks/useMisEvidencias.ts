import { useCallback, useEffect, useState } from 'react';

import { listarMisEvidencias } from '../api/evidenceApi';
import type { EvidenciaApi } from '../api/evidenceSchemas';

/**
 * Las evidencias reales del aprendiz para la pestana Yo.
 *
 * Reemplaza a `EVIDENCIAS_DATA`, una lista fija de cuatro entradas inventadas ("Protocolo 05:00
 * AM", "1L de agua alcalina con sal marina") que se mostraban con hora y con `verified: true`
 * junto al rotulo, tambien fijo, "37 fotos subidas · 100% verificadas". A alguien en el dia 2 del
 * programa se le estaba afirmando que tenia 37 fotos verificadas.
 *
 * Los tres estados se distinguen a proposito, porque no significan lo mismo y la pantalla los
 * pinta distinto: `cargando` (todavia no se sabe), `error` (no se pudo preguntar) y lista vacia
 * (se pregunto y no hay ninguna). Ninguno de los tres se rellena con datos de muestra.
 */
export function useMisEvidencias() {
  const [evidencias, setEvidencias] = useState<EvidenciaApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const pagina = await listarMisEvidencias();
      setEvidencias(pagina.evidencias);
    } catch (e) {
      setEvidencias([]);
      setError(e instanceof Error ? e.message : 'No se pudieron cargar tus evidencias.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  /* Cuantas pasaron la validacion. El rotulo de la cabecera sale de aca, no de un numero
     escrito a mano. El valor es `VALIDA`, no `VALIDADA`: es el enum `EstadoValidacion` del
     backend (PENDIENTE | VALIDA | RECHAZADA | REVISION_MANUAL | ANULADA_ADMIN). */
  const verificadas = evidencias.filter(e => e.estadoValidacion === 'VALIDA').length;

  return { evidencias, verificadas, cargando, error, recargar };
}
