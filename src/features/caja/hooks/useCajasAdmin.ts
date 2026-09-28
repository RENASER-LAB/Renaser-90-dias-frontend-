import { useCallback, useEffect, useRef, useState } from 'react';

import { esDeRed, esProhibido } from '../../mentor/api/mentorApi';
import { listarCajas } from '../api/cajaApi';
import type { FilaDeCaja } from '../api/cajaSchemas';

export type FalloDeCaja = 'sin_permiso' | 'sin_red' | 'error';

export function falloDe(error: unknown): FalloDeCaja {
  return esProhibido(error) ? 'sin_permiso' : esDeRed(error) ? 'sin_red' : 'error';
}

export const TAMANO_DE_PAGINA = 30;
/** Cuánto se espera después de la última letra del buscador antes de pedir la lista. */
const DEMORA_AL_BUSCAR_MS = 400;

/**
 * La lista de cajas de una pestaña (estado) y una búsqueda, de a {@link TAMANO_DE_PAGINA}, con los
 * conteos de todas las pestañas. Una respuesta vieja (otra pestaña, otra búsqueda) no pisa a la nueva.
 */
export function useCajasAdmin(estado: string, busqueda: string) {
  const [filas, setFilas] = useState<FilaDeCaja[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [conteos, setConteos] = useState<Record<string, number> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloDeCaja | null>(null);
  const pagina = useRef(0);
  const pedido = useRef(0);

  const cargar = useCallback(
    async (siguiente: boolean) => {
      const este = ++pedido.current;
      const page = siguiente ? pagina.current + 1 : 0;
      setCargando(true);
      setFallo(null);
      try {
        const lista = await listarCajas({ estado, q: busqueda, page, size: TAMANO_DE_PAGINA });
        if (este !== pedido.current) return;
        pagina.current = page;
        setFilas(prev => (siguiente ? [...prev, ...lista.items] : lista.items));
        setTotal(lista.total ?? null);
        if (lista.conteos) setConteos(lista.conteos);
      } catch (error) {
        if (este === pedido.current) setFallo(falloDe(error));
      } finally {
        if (este === pedido.current) setCargando(false);
      }
    },
    [estado, busqueda],
  );

  // Al cambiar de pestaña no quedan a la vista las personas de la anterior mientras llega la nueva.
  useEffect(() => {
    setFilas([]);
    setTotal(null);
  }, [estado]);

  useEffect(() => {
    const temporizador = setTimeout(() => void cargar(false), busqueda ? DEMORA_AL_BUSCAR_MS : 0);
    return () => clearTimeout(temporizador);
  }, [cargar, busqueda]);

  const hayMas = total !== null ? filas.length < total : false;

  return {
    filas,
    total,
    conteos,
    cargando,
    fallo,
    hayMas,
    recargar: () => void cargar(false),
    cargarMas: () => void cargar(true),
  };
}
