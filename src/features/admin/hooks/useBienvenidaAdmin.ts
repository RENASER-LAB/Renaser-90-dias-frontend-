import { useCallback, useEffect, useRef, useState } from 'react';

import { FORMACION_POR_DEFECTO, type CodigoDeFormacion } from '../../formaciones/types/formaciones.types';
import { esDeRed, esProhibido } from '../../mentor/api/mentorApi';
import { leerBienvenida } from '../api/bienvenidaApi';
import type { BienvenidaApi } from '../api/bienvenidaSchemas';

export type FalloBienvenida = 'sin_permiso' | 'sin_red' | 'error';

/** Lo último que llegó, con la formación de la que es: al cambiar de formación nunca se ve la bienvenida de la anterior. */
type Leida = { formacion: CodigoDeFormacion; bienvenida: BienvenidaApi };

/**
 * La bienvenida editable de UNA formación tal como la tiene el servidor (backend D-210, spec 035): los tres mensajes y la portada, con quién
 * los cambió. Las operaciones que cambian algo devuelven la bienvenida entera, y `actualizar` la pone en su lugar sin volver a pedirla.
 *
 * Al cambiar de formación se pide la nueva y, mientras llega, NO se muestra la anterior (`bienvenida` es `null`): lo de una formación jamás
 * se ve bajo el nombre de otra. Una respuesta que llega tarde, de una formación que ya no es la elegida, se descarta.
 */
export function useBienvenidaAdmin(formacion: CodigoDeFormacion = FORMACION_POR_DEFECTO) {
  const [leida, setLeida] = useState<Leida | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloBienvenida | null>(null);
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    const numero = ++pedido.current;
    setCargando(true);
    setFallo(null);
    try {
      const bienvenida = await leerBienvenida(formacion);
      if (numero === pedido.current) setLeida({ formacion, bienvenida });
    } catch (e) {
      if (numero === pedido.current) setFallo(esProhibido(e) ? 'sin_permiso' : esDeRed(e) ? 'sin_red' : 'error');
    } finally {
      if (numero === pedido.current) setCargando(false);
    }
  }, [formacion]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const actualizar = useCallback(
    (nueva: BienvenidaApi) => {
      setLeida({ formacion, bienvenida: nueva });
      setFallo(null);
    },
    [formacion],
  );

  return {
    bienvenida: leida?.formacion === formacion ? leida.bienvenida : null,
    cargando,
    fallo,
    recargar: cargar,
    actualizar,
  };
}
