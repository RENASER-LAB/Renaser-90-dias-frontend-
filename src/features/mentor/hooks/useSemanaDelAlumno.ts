import { useCallback, useEffect, useMemo, useState } from 'react';

import { esDeRed, esNoDisponible, esProhibido, obtenerSemanaDeAlumno } from '../api/mentorApi';
import type { SemanaAlumnoApi } from '../api/mentorSchemas';
import type { FalloCelula } from './useCelulaQueAcompano';

/**
 * La semana de un aprendiz, con navegación entre semanas.
 *
 * La primera carga va sin fecha: el servidor decide cuál es "la semana en curso" en la zona
 * del alumno. Recién cuando el mentor navega se manda un `weekStart` explícito, calculado
 * a partir del que el servidor devolvió — nunca a partir del reloj del teléfono, que puede
 * estar en otro huso y correr la semana un día.
 */
export function useSemanaDelAlumno(grupoId: string | null, alumnoId: string | null) {
  const [semana, setSemana] = useState<SemanaAlumnoApi | null>(null);
  const [inicio, setInicio] = useState<string | undefined>(undefined);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloCelula | null>(null);

  const cargar = useCallback(async () => {
    if (!grupoId || !alumnoId) return;
    setCargando(true);
    setFallo(null);
    try {
      setSemana(await obtenerSemanaDeAlumno(grupoId, alumnoId, inicio));
    } catch (e) {
      setSemana(null);
      setFallo(
        esNoDisponible(e) ? 'no_disponible'
        : esProhibido(e) ? 'sin_permiso'
        : esDeRed(e) ? 'sin_red'
        : 'error',
      );
    } finally {
      setCargando(false);
    }
  }, [grupoId, alumnoId, inicio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Mueve la ventana siete días desde la que el servidor confirmó, no desde `Date.now()`. */
  const desplazar = useCallback(
    (semanas: number) => {
      if (!semana) return;
      const base = new Date(`${semana.inicioDeSemana}T00:00:00Z`);
      base.setUTCDate(base.getUTCDate() + semanas * 7);
      setInicio(base.toISOString().slice(0, 10));
    },
    [semana],
  );

  /* Días con algo que mostrar, para que el selector no ofrezca siete casillas cuando solo
     tres tienen contenido. Si no hay ninguno, se conservan los siete: un selector vacío
     confundiría más que uno completo. */
  const diasConContenido = useMemo(() => {
    if (!semana) return [];
    const conAlgo = semana.dias.filter(d => d.obligaciones.length > 0);
    return conAlgo.length > 0 ? conAlgo : semana.dias;
  }, [semana]);

  return { semana, diasConContenido, cargando, fallo, desplazar, recargar: cargar };
}
