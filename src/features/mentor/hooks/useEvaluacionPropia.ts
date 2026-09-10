import { useCallback, useEffect, useState } from 'react';

import { esNoDisponible, obtenerEvaluacionPropia } from '../api/mentorApi';
import type { EvaluacionPropiaApi } from '../api/mentorSchemas';

/**
 * La nota del mentor en el mes en curso.
 *
 * El mes se arma con el reloj del teléfono, y eso acá SÍ está bien: es "qué mes quiero mirar",
 * una intención del usuario, no una fecha de negocio. Qué días caen dentro de ese mes lo decide
 * el servidor en la zona de la cohorte.
 *
 * Un 404 se trata como "todavía no desplegado" y se apaga la tarjeta en silencio, en vez de
 * mostrarle un error a alguien que no puede hacer nada al respecto.
 */
export function useEvaluacionPropia(activo: boolean) {
  const [evaluacion, setEvaluacion] = useState<EvaluacionPropiaApi | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [disponible, setDisponible] = useState(true);

  const cargar = useCallback(async () => {
    if (!activo) return;
    setCargando(true);
    try {
      const ahora = new Date();
      const mes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
      setEvaluacion(await obtenerEvaluacionPropia(mes));
    } catch (e) {
      setEvaluacion(null);
      if (esNoDisponible(e)) setDisponible(false);
    } finally {
      setCargando(false);
    }
  }, [activo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { evaluacion, cargando, disponible, recargar: cargar };
}
