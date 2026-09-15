import { useCallback, useEffect, useState } from 'react';

import { esDeRed, esNoDisponible, esProhibido, obtenerHabitosDeAlumno } from '../api/mentorApi';
import type { HabitosAlumnoApi } from '../api/mentorSchemas';
import type { FalloCelula } from './useCelulaQueAcompano';

/**
 * Cómo tiene armado su plan de hábitos un aprendiz, para que el mentor lo vea sin pedírselo.
 *
 * Mismo manejo de fallos que `useSemanaDelAlumno`, y por el mismo motivo: los cuatro casos se
 * arreglan de forma distinta, así que la sección los dice distinto —o no se dibuja— en vez de
 * colapsarlos en un error rojo. Mientras el endpoint no esté desplegado esto devuelve
 * `no_disponible`, que para la pantalla significa "no muestres nada", no "algo salió mal".
 *
 * No hay paginación: son los hábitos de una persona, una lectura y se acabó.
 */
export function useHabitosDelAlumno(grupoId: string | null, alumnoId: string | null) {
  const [habitos, setHabitos] = useState<HabitosAlumnoApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloCelula | null>(null);

  const cargar = useCallback(async () => {
    /* Sin grupo no hay a quién preguntarle. Se apaga el "cargando" en vez de dejarlo colgado:
       una sección que dice "Cargando…" para siempre miente sobre algo que nunca va a llegar. */
    if (!grupoId || !alumnoId) {
      setHabitos(null);
      setCargando(false);
      return;
    }
    setCargando(true);
    setFallo(null);
    try {
      setHabitos(await obtenerHabitosDeAlumno(grupoId, alumnoId));
    } catch (e) {
      setHabitos(null);
      setFallo(
        esNoDisponible(e) ? 'no_disponible'
        : esProhibido(e) ? 'sin_permiso'
        : esDeRed(e) ? 'sin_red'
        : 'error',
      );
    } finally {
      setCargando(false);
    }
  }, [grupoId, alumnoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { habitos, cargando, fallo, recargar: cargar };
}
