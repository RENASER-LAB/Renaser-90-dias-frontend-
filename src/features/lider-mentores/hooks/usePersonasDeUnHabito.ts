import { useCallback, useEffect, useRef, useState } from 'react';

import { falloDeLectura } from '../../semaforo/api/semaforoApi';
import type { FalloSemaforo } from '../../semaforo/hooks/useMiSemaforo';
import { obtenerPersonasDeUnHabito } from '../api/habitosDeTodosApi';
import type { FiltrosDeLosHabitos, PersonaEnUnHabito } from '../types/habitosDeTodos.types';
import { sumarPersonas } from '../utils/habitosDeTodos';
import { ESPERA_DE_LA_BUSQUEDA_MS } from './useAprendicesDelLider';

/**
 * Las personas de UN hábito en un día (spec 029): la lista de a 30 con búsqueda en el servidor. Se monta una vez por hábito abierto
 * (quien la monta le pone `key`), así que el día y los filtros no cambian mientras vive.
 *
 * - **Primera página al montarse** y cada vez que cambia el texto aplicado (300 ms después de la última tecla).
 * - **Cada lectura toma un turno y solo la última escribe**: una respuesta de un texto viejo, o de una página pedida antes de cambiar
 *   el texto, nunca se mezcla con la de ahora.
 * - **`pedirMas`** sigue con la página siguiente; no hace nada si no hay más o ya hay un pedido en vuelo. Si falla, lo ya leído se
 *   queda y `falloAlPedirMas` lo dice. Nadie se repite entre páginas.
 * - **Un fallo de la primera página** deja la lista vacía y dice por qué; un 404 es «ese hábito ya no está disponible».
 * - **La búsqueda y lo leído viven acá**: al volver de la ficha de una persona la lista sigue donde estaba, sin releerse.
 */
export function usePersonasDeUnHabito(habitoId: string, filtros: FiltrosDeLosHabitos) {
  const [personas, setPersonas] = useState<PersonaEnUnHabito[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [fallo, setFallo] = useState<FalloSemaforo | null>(null);
  const [detalleDelFallo, setDetalleDelFallo] = useState<string | null>(null);
  const [falloAlPedirMas, setFalloAlPedirMas] = useState(false);
  const [texto, setTexto] = useState('');
  const [textoAplicado, setTextoAplicado] = useState('');

  const turno = useRef(0);
  const enVuelo = useRef(false);
  const vigente = useRef({ pagina, hayMas, textoAplicado, habitoId, filtros });
  vigente.current = { pagina, hayMas, textoAplicado, habitoId, filtros };

  const pedirPrimera = useCallback(async (buscado: string) => {
    const mio = ++turno.current;
    enVuelo.current = true;
    setCargando(true);
    setCargandoMas(false);
    setFalloAlPedirMas(false);
    try {
      const { habitoId: id, filtros: f } = vigente.current;
      const lectura = await obtenerPersonasDeUnHabito(id, f, { q: buscado, pagina: 0 });
      if (mio !== turno.current) return;
      setPersonas(sumarPersonas([], lectura.personas));
      setPagina(lectura.pagina);
      setHayMas(lectura.hayMas);
      setTotal(lectura.total);
      setFallo(null);
      setDetalleDelFallo(null);
    } catch (e) {
      if (mio !== turno.current) return;
      setPersonas([]);
      setHayMas(false);
      setFallo(falloDeLectura(e));
      setDetalleDelFallo(e instanceof Error ? e.message : null);
    } finally {
      if (mio === turno.current) {
        enVuelo.current = false;
        setCargando(false);
      }
    }
  }, []);

  const pedirMas = useCallback(async () => {
    const { pagina: actual, hayMas: quedan, textoAplicado: buscado, habitoId: id, filtros: f } = vigente.current;
    if (!quedan || enVuelo.current) return;
    const mio = turno.current;
    enVuelo.current = true;
    setCargandoMas(true);
    setFalloAlPedirMas(false);
    try {
      const lectura = await obtenerPersonasDeUnHabito(id, f, { q: buscado, pagina: actual + 1 });
      if (mio !== turno.current) return;
      setPersonas(previas => sumarPersonas(previas, lectura.personas));
      setPagina(lectura.pagina);
      setHayMas(lectura.hayMas);
      setTotal(lectura.total);
    } catch {
      if (mio === turno.current) setFalloAlPedirMas(true);
    } finally {
      if (mio === turno.current) {
        enVuelo.current = false;
        setCargandoMas(false);
      }
    }
  }, []);

  const recargar = useCallback(() => pedirPrimera(vigente.current.textoAplicado), [pedirPrimera]);

  useEffect(() => {
    const id = setTimeout(() => setTextoAplicado(texto.trim()), ESPERA_DE_LA_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [texto]);

  useEffect(() => {
    void pedirPrimera(textoAplicado);
    return () => {
      turno.current++;
    };
  }, [textoAplicado, pedirPrimera]);

  return {
    personas,
    total,
    hayMas,
    cargando,
    cargandoMas,
    fallo,
    detalleDelFallo,
    falloAlPedirMas,
    texto,
    buscando: textoAplicado !== '',
    setTexto,
    pedirMas,
    recargar,
  };
}
