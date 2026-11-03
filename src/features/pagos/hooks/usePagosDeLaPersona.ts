import { useCallback, useEffect, useRef, useState } from 'react';

import { leerPagosDeLaPersona } from '../api/pagosApi';
import type { PagosEnLaFicha } from '../api/pagosSchemas';

export type LecturaDeLosPagos =
  | { estado: 'cargando' }
  /** 403, 404 o una función apagada: la sección no se dibuja (un servidor anterior, otro rol, o Soporte TI la apagó). */
  | { estado: 'oculta' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'lista'; datos: PagosEnLaFicha };

/**
 * Los pagos de una persona en la ficha de Administración (spec 032): `GET /api/v1/admin/pagos/personas/{id}`, una lectura al abrir la ficha y las que
 * devuelve cada escritura (`aplicar`). Nunca se lee de más: no hay sondeo ni lectura al volver al foco (la ficha es de Administración y se cierra y abre).
 *
 * Mismo criterio que las demás secciones de la ficha (tiempo libre, cierres, diagnóstico): 403 y 404 no dibujan nada; mientras llega la primera lectura
 * tampoco (sin parpadeo); un fallo de red se dice con «Reintentar». Al cambiar de persona no queda a la vista (ni un render) lo de la anterior.
 */
export function usePagosDeLaPersona(personaId: string) {
  const [lectura, setLectura] = useState<LecturaDeLosPagos>({ estado: 'cargando' });
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    const este = ++pedido.current;
    setLectura({ estado: 'cargando' });
    try {
      const datos = await leerPagosDeLaPersona(personaId);
      if (este === pedido.current) setLectura({ estado: 'lista', datos });
    } catch (error) {
      if (este !== pedido.current) return;
      const status = (error as { status?: number } | null)?.status;
      if (status === 403 || status === 404 || status === 503) setLectura({ estado: 'oculta' });
      else setLectura({ estado: 'error', mensaje: 'No se pudieron cargar los pagos. Revisa tu conexión.' });
    }
  }, [personaId]);

  useEffect(() => {
    void cargar();
    return () => {
      pedido.current += 1;
    };
  }, [cargar]);

  /** Una escritura devolvió el pago entero: la ficha queda al día sin volver a pedirlo. */
  const aplicar = useCallback((datos: PagosEnLaFicha) => {
    pedido.current += 1;
    setLectura({ estado: 'lista', datos });
  }, []);

  return { lectura, recargar: cargar, aplicar };
}
