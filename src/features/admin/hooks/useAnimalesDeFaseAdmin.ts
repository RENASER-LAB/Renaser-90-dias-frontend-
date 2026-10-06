import { useCallback, useEffect, useState } from 'react';

import { esDeRed, esProhibido } from '../../mentor/api/mentorApi';
import { leerAnimalesDeFase, type AnimalDeFaseApi } from '../../yo/api/animalesDeFaseApi';

export type FalloDeAnimales = 'sin_permiso' | 'sin_red' | 'error';

/** Las cuatro fases tal como las tiene el servidor; `actualizar` pone en su lugar lo que devuelve cada cambio. */
export function useAnimalesDeFaseAdmin(activo = true) {
  const [animales, setAnimales] = useState<AnimalDeFaseApi[] | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [fallo, setFallo] = useState<FalloDeAnimales | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setAnimales(await leerAnimalesDeFase());
    } catch (e) {
      setFallo(esProhibido(e) ? 'sin_permiso' : esDeRed(e) ? 'sin_red' : 'error');
    } finally {
      setCargando(false);
    }
  }, []);

  /* Solo se pide cuando la pantalla se abre: Administración monta el hook siempre, y no hace falta una
     lectura por cada vez que alguien entra a otra sección. */
  useEffect(() => {
    if (activo) void cargar();
  }, [activo, cargar]);

  const actualizar = useCallback((nuevos: AnimalDeFaseApi[]) => {
    setAnimales(nuevos);
    setFallo(null);
  }, []);

  return { animales, cargando, fallo, recargar: cargar, actualizar };
}
