import { useCallback, useEffect, useRef, useState } from 'react';

import { falloDeLectura } from '../../semaforo/api/semaforoApi';
import type { FalloSemaforo } from '../../semaforo/hooks/useMiSemaforo';
import { obtenerAprendicesDelLider, TAMANO_DE_LA_PAGINA } from '../api/aprendicesDelLiderApi';
import type { AprendizDeLaLista } from '../types/aprendicesDelLider.types';

/** Desde la última tecla hasta pedirle al servidor (la misma espera que la búsqueda de los chats de soporte). */
export const ESPERA_DE_LA_BUSQUEDA_MS = 300;

/** Suma una página a lo ya leído sin repetir a nadie (si alguien entra o sale entre dos páginas, la frontera se corre). */
export function sumarPagina(previas: AprendizDeLaLista[], nuevas: AprendizDeLaLista[]): AprendizDeLaLista[] {
  const vistos = new Set(previas.map(f => f.personaId));
  return [...previas, ...nuevas.filter(f => !vistos.has(f.personaId))];
}

/**
 * «Todos los aprendices» del líder (2026-10-31): la lista de a 30, con búsqueda en el servidor.
 *
 * - **Primera página al montarse** y cada vez que cambia el texto aplicado. El texto se aplica 300 ms después de la última
 *   tecla; borrarlo vuelve a la lista completa.
 * - **Cada lectura toma un turno y solo la última escribe**: la respuesta de un texto viejo, o de una página pedida antes
 *   de cambiar el texto, nunca se mezcla con la de ahora.
 * - **`pedirMas`** sigue con la página siguiente y no hace nada si no hay más o ya hay un pedido en vuelo. Si falla, las
 *   filas que ya están se quedan y `falloAlPedirMas` lo dice (se reintenta con el mismo `pedirMas`).
 * - **Un fallo de la primera página** deja la lista vacía y dice por qué (`fallo`); `recargar` la vuelve a pedir.
 * - **La búsqueda y lo leído viven acá**, en quien monta la pantalla: al volver de la ficha de una persona la lista sigue
 *   donde estaba, sin releerse.
 */
export function useAprendicesDelLider() {
  const [filas, setFilas] = useState<AprendizDeLaLista[]>([]);
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
  const vigente = useRef({ pagina, hayMas, textoAplicado });
  vigente.current = { pagina, hayMas, textoAplicado };

  const pedirPrimera = useCallback(async (buscado: string) => {
    const mio = ++turno.current;
    enVuelo.current = true;
    setCargando(true);
    setCargandoMas(false);
    setFalloAlPedirMas(false);
    try {
      const lectura = await obtenerAprendicesDelLider({ q: buscado, pagina: 0 });
      if (mio !== turno.current) return;
      setFilas(sumarPagina([], lectura.items));
      setPagina(lectura.pagina);
      setHayMas(lectura.hayMas);
      setTotal(lectura.total);
      setFallo(null);
      setDetalleDelFallo(null);
    } catch (e) {
      if (mio !== turno.current) return;
      setFilas([]);
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
    const { pagina: actual, hayMas: quedan, textoAplicado: buscado } = vigente.current;
    if (!quedan || enVuelo.current) return;
    const mio = turno.current;
    enVuelo.current = true;
    setCargandoMas(true);
    setFalloAlPedirMas(false);
    try {
      const lectura = await obtenerAprendicesDelLider({ q: buscado, pagina: actual + 1 });
      if (mio !== turno.current) return;
      setFilas(previas => sumarPagina(previas, lectura.items));
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

  /* La espera de la búsqueda: solo el último texto, 300 ms después de la última tecla. */
  useEffect(() => {
    const id = setTimeout(() => setTextoAplicado(texto.trim()), ESPERA_DE_LA_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [texto]);

  useEffect(() => {
    void pedirPrimera(textoAplicado);
    return () => {
      /* Lo que llegue después de desmontar, o de cambiar el texto, ya no escribe. */
      turno.current++;
    };
  }, [textoAplicado, pedirPrimera]);

  return {
    filas,
    total,
    hayMas,
    cargando,
    cargandoMas,
    fallo,
    detalleDelFallo,
    falloAlPedirMas,
    texto,
    /** Hay un texto aplicado: la lista vacía dice «Sin resultados», no «todavía no hay». */
    buscando: textoAplicado !== '',
    setTexto,
    pedirMas,
    recargar,
  };
}
