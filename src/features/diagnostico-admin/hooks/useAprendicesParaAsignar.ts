import { useCallback, useEffect, useRef, useState } from 'react';

import { listarAprendices } from '../../admin/api/adminApi';
import type { AprendizAdminApi } from '../../admin/api/adminSchemas';
import { mensajeDeFallo } from '../../admin/utils/mensajes';

const POR_PAGINA = 20;
/** Lo que se espera tras la última tecla antes de pedir: una pausa natural al escribir. */
export const ESPERA_DE_LA_BUSQUEDA_MS = 350;

/**
 * La lista de personas para asignarles la ficha en lote: la misma búsqueda de «Personas» (al servidor, con un respiro de 350 ms para no
 * pedir por tecla, y con el filtro de formación). Las páginas se acumulan con «Ver más»; una respuesta vieja nunca pisa a una nueva.
 */
export function useAprendicesParaAsignar() {
  const [busqueda, setBusqueda] = useState('');
  const [aplicada, setAplicada] = useState('');
  const [formacion, setFormacion] = useState<string | null>(null);
  const [personas, setPersonas] = useState<AprendizAdminApi[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const turno = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setAplicada(busqueda);
      setPagina(0);
    }, ESPERA_DE_LA_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    setError(null);
    try {
      /* Solo quien ya está dentro: las solicitudes que esperan aprobación no tienen ficha que asignar (spec 026). */
      const respuesta = await listarAprendices({ pagina, tamano: POR_PAGINA, busqueda: aplicada, formacion, soloActivas: true });
      if (mio !== turno.current) return;
      setPersonas(previas => (pagina === 0 ? respuesta.content : [...previas, ...respuesta.content]));
      setTotal(respuesta.total);
    } catch (e) {
      if (mio === turno.current) setError(mensajeDeFallo(e, 'No se pudo cargar la lista de personas.'));
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, [pagina, aplicada, formacion]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiarFormacion = useCallback((codigo: string | null) => {
    setFormacion(codigo);
    setPagina(0);
  }, []);

  return {
    busqueda,
    setBusqueda,
    busquedaAplicada: aplicada,
    formacion,
    cambiarFormacion,
    personas,
    total,
    cargando,
    error,
    hayMas: total !== null && personas.length < total,
    verMas: () => setPagina(p => p + 1),
    recargar: cargar,
  };
}
