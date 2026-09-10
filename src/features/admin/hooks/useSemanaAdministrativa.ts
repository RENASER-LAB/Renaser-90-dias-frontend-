import { useCallback, useEffect, useMemo, useState } from 'react';

import { esDeRed, esNoDisponible, esProhibido } from '../../mentor/api/mentorApi';
import type { SemanaAlumnoApi } from '../../mentor/api/mentorSchemas';
import { obtenerSemanaAdministrativa } from '../api/adminApi';

export type FalloSemana = 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error';

/**
 * La semana de cualquier aprendiz, para administración.
 *
 * Es el gemelo de `useSemanaDelAlumno` y no una copia por descuido: cambia la ruta y la
 * autorización —acá no hace falta acompañar al alumno—, y no cambia nada más. El `SemanaAlumnoApi`
 * es el mismo tipo a propósito: el administrador y el mentor tienen que ver el mismo día con los
 * mismos estados, o alguna de las dos pantallas estaría mintiendo.
 *
 * La primera carga va SIN fecha: cuál es "la semana en curso" lo decide el servidor en la zona
 * del alumno, que no es la del teléfono de quien mira.
 */
export function useSemanaAdministrativa(aprendizId: string | null) {
  const [semana, setSemana] = useState<SemanaAlumnoApi | null>(null);
  const [inicio, setInicio] = useState<string | undefined>(undefined);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloSemana | null>(null);

  const cargar = useCallback(async () => {
    if (!aprendizId) return;
    setCargando(true);
    setFallo(null);
    try {
      setSemana(await obtenerSemanaAdministrativa(aprendizId, inicio));
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
  }, [aprendizId, inicio]);

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

  /**
   * "Sin datos" es distinto de "no cumplió". Una semana sin una sola obligación puede significar
   * que el padrón de ese período no se generó, no que la persona faltara siete días.
   */
  const sinDatos = useMemo(() => semana?.cobertura === 'SIN_DATOS', [semana]);

  return { semana, sinDatos, cargando, fallo, desplazar, recargar: cargar };
}
