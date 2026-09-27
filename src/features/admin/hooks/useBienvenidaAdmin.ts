import { useCallback, useEffect, useState } from 'react';

import { esDeRed, esProhibido } from '../../mentor/api/mentorApi';
import { leerBienvenida } from '../api/bienvenidaApi';
import type { BienvenidaApi } from '../api/bienvenidaSchemas';

export type FalloBienvenida = 'sin_permiso' | 'sin_red' | 'error';

/**
 * La bienvenida editable tal como la tiene el servidor (backend D-210): los tres mensajes y la
 * portada, con quién los cambió. Las operaciones que cambian algo devuelven la bienvenida entera, y
 * `actualizar` la pone en su lugar sin volver a pedirla.
 */
export function useBienvenidaAdmin() {
  const [bienvenida, setBienvenida] = useState<BienvenidaApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloBienvenida | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setBienvenida(await leerBienvenida());
    } catch (e) {
      setFallo(esProhibido(e) ? 'sin_permiso' : esDeRed(e) ? 'sin_red' : 'error');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const actualizar = useCallback((nueva: BienvenidaApi) => {
    setBienvenida(nueva);
    setFallo(null);
  }, []);

  return { bienvenida, cargando, fallo, recargar: cargar, actualizar };
}
