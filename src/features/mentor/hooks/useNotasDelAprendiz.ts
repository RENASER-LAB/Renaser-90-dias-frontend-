import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import {
  corregirNotaDelAprendiz,
  crearNotaDelAprendiz,
  obtenerNotasDelAprendiz,
  type NotaDelMentor,
  type OrigenDeLasNotas,
} from '../api/mentorApi';

/** Lo que dice la hoja cuando no hay conexión al guardar: el texto NO se pierde, sigue en el campo. */
export const SIN_RED_AL_GUARDAR = 'No se guardó la nota porque no hay conexión. Tu texto sigue aquí: inténtalo de nuevo.';

/**
 * Las notas privadas de un aprendiz (spec 055 FR-023 a FR-027) para su acompañante, el líder o Administración.
 *
 * - La lista se lee al abrir la ficha (`origen`), no al abrir la hoja: el lápiz lleva un puntito si hay al menos una nota.
 * - **Un toque, un pedido**: mientras una nota se guarda, otro toque no hace nada (`guardando`; un `ref` cubre los dos toques en el
 *   mismo cuadro). Lo que se muestra es lo que el servidor confirmó: la nota guardada entra arriba con su fecha y su autor.
 * - Si falla, el motivo del servidor se dice tal cual (`NO_ACOMPANA`, `YA_NO_SE_PUEDE_CORREGIR`…); sin red, lo propio; y quien llama
 *   conserva el texto (`guardar` y `corregir` devuelven `false`).
 * - `origen` `null` = nada que preguntar (la ficha sin grupo).
 */
export function useNotasDelAprendiz(origen: OrigenDeLasNotas | null) {
  const [notas, setNotas] = useState<NotaDelMentor[]>([]);
  const [cargando, setCargando] = useState(origen !== null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);
  const enCurso = useRef(false);
  const turno = useRef(0);
  const clave = origen ? JSON.stringify(origen) : null;

  const cargar = useCallback(async () => {
    if (!origen) return;
    const mio = ++turno.current;
    setCargando(true);
    try {
      const lista = await obtenerNotasDelAprendiz(origen);
      if (mio !== turno.current) return;
      setNotas(lista);
      setFallo(null);
    } catch (e) {
      if (mio !== turno.current) return;
      setFallo(mensajeDeError(e, 'No se pudieron cargar las notas.'));
    } finally {
      if (mio === turno.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  useEffect(() => {
    setNotas([]);
    void cargar();
    return () => {
      turno.current++;
    };
  }, [cargar]);

  const trabajar = useCallback(async (hacer: () => Promise<NotaDelMentor>, alTerminar: (n: NotaDelMentor) => void): Promise<boolean> => {
    if (enCurso.current) return false;
    enCurso.current = true;
    setGuardando(true);
    setFalloAlGuardar(null);
    try {
      alTerminar(await hacer());
      return true;
    } catch (e) {
      setFalloAlGuardar(e instanceof ApiError && e.status === 0 ? SIN_RED_AL_GUARDAR : mensajeDeError(e, 'No se pudo guardar la nota.'));
      return false;
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  }, []);

  const guardar = useCallback(
    (texto: string) => {
      if (origen?.quien !== 'mentor') return Promise.resolve(false);
      return trabajar(() => crearNotaDelAprendiz(origen.grupoId, origen.aprendizId, texto.trim()), nueva => setNotas(previas => [nueva, ...previas]));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clave, trabajar],
  );

  const corregir = useCallback(
    (notaId: string, texto: string) => {
      if (origen?.quien !== 'mentor') return Promise.resolve(false);
      return trabajar(
        () => corregirNotaDelAprendiz(origen.grupoId, origen.aprendizId, notaId, texto.trim()),
        corregida => setNotas(previas => previas.map(n => (n.id === corregida.id ? corregida : n))),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clave, trabajar],
  );

  return { notas, hayNotas: notas.length > 0, cargando, fallo, guardando, falloAlGuardar, limpiarFalloAlGuardar: () => setFalloAlGuardar(null), guardar, corregir, recargar: cargar };
}
