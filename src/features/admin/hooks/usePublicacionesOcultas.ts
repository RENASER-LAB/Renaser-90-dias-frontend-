import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert } from '../../../components/Alerta';
import { mensajeDeError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import * as wallApi from '../../community/api/wallApi';
import { avisarMuroModerado } from '../../community/events/muroModerado';
import type { WallPost } from '../../community/types/community.types';
import {
  AVISO_DEVUELTA,
  AVISO_ELIMINADA,
  BOTON_ELIMINAR,
  MENSAJE_DE_ELIMINAR,
  SIN_PERMISO_PARA_MODERAR,
  TITULO_DE_ELIMINAR,
  clasificarLecturaDeOcultas,
  devolverAlMuro,
  eliminarDeLaCola,
  type FalloDeLecturaDeOcultas,
  type ResultadoDeModeracion,
} from '../../community/utils/moderacionDelMuro';

type Accion = 'devolver' | 'eliminar';

/**
 * «Publicaciones ocultas» (Administración → Más opciones, solo ADMIN y ALCHEMIST; pedido del dueño, 2026-10-31): la cola
 * de lo que se sacó del Muro, de a una página (`GET /wall/hidden`, cursor), con «Devolver al Muro» y «Eliminar para
 * siempre» por publicación.
 *
 * - **Sale de la lista en el acto** apenas el servidor confirma (o responde 404: ya no está ahí); el resto de la app se
 *   entera (`avisarMuroModerado`: el Muro se relee en silencio, así una publicación devuelta aparece sin salir de la app).
 * - **Una fila ocupada** (`ocupadas[id]`) tiene sus dos botones apagados; un toque doble no manda dos pedidos.
 * - **Eliminar pide confirmación** (el `Alert` de la app, botón destructivo).
 * - **Fallos**: un 403 dice «No tienes permiso para moderar el Muro.»; lo demás, el mensaje del servidor en un diálogo.
 *   Leer la cola falla aparte (`fallo`) y se reintenta; traer más no borra lo que ya se ve (`falloAlTraerMas`).
 */
export function usePublicacionesOcultas() {
  const [filas, setFilas] = useState<WallPost[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [fallo, setFallo] = useState<FalloDeLecturaDeOcultas | null>(null);
  const [falloAlTraerMas, setFalloAlTraerMas] = useState(false);
  const [ocupadas, setOcupadas] = useState<Record<string, Accion>>({});
  const [aviso, setAviso] = useState<{ clave: number; texto: string } | null>(null);
  /** Una lectura vieja no pisa a una nueva (reintentar, o salir y volver). */
  const lecturaActual = useRef(0);
  const enCurso = useRef<Set<string>>(new Set());
  const pidiendoMas = useRef(false);

  const cargar = useCallback(async () => {
    const lectura = ++lecturaActual.current;
    setCargando(true);
    setFallo(null);
    setFalloAlTraerMas(false);
    try {
      const pagina = await wallApi.obtenerPublicacionesOcultas();
      if (lectura !== lecturaActual.current) return;
      setFilas(pagina.posts);
      setCursor(pagina.nextCursor);
    } catch (e) {
      if (lectura !== lecturaActual.current) return;
      setFallo(clasificarLecturaDeOcultas(e));
    } finally {
      if (lectura === lecturaActual.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
    return () => {
      lecturaActual.current += 1;
    };
  }, [cargar]);

  const traerMas = useCallback(async () => {
    if (cursor === null || pidiendoMas.current) return;
    pidiendoMas.current = true;
    setCargandoMas(true);
    setFalloAlTraerMas(false);
    const lectura = lecturaActual.current;
    try {
      const pagina = await wallApi.obtenerPublicacionesOcultas(cursor);
      if (lectura !== lecturaActual.current) return;
      setFilas(previas => {
        const yaEstan = new Set((previas ?? []).map(p => p.id));
        return [...(previas ?? []), ...pagina.posts.filter(p => !yaEstan.has(p.id))];
      });
      setCursor(pagina.nextCursor);
    } catch {
      if (lectura === lecturaActual.current) setFalloAlTraerMas(true);
    } finally {
      pidiendoMas.current = false;
      setCargandoMas(false);
    }
  }, [cursor]);

  const terminar = useCallback((resultado: ResultadoDeModeracion, id: string, accion: Accion) => {
    const quitar = () => setFilas(previas => (previas ? previas.filter(p => p.id !== id) : previas));
    switch (resultado.tipo) {
      case 'hecho':
        quitar();
        tacto.logro();
        setAviso({ clave: Date.now(), texto: accion === 'devolver' ? AVISO_DEVUELTA : AVISO_ELIMINADA });
        avisarMuroModerado();
        return;
      case 'ya_no_esta':
        quitar();
        avisarMuroModerado();
        return;
      case 'sin_permiso':
        tacto.error();
        Alert.alert('Moderar el Muro', SIN_PERMISO_PARA_MODERAR);
        return;
      case 'fallo':
        tacto.error();
        Alert.alert(
          accion === 'devolver' ? 'No se pudo devolver' : 'No se pudo eliminar',
          mensajeDeError(
            resultado.error,
            accion === 'devolver'
              ? 'No se pudo devolver la publicación al Muro. Inténtalo de nuevo.'
              : 'No se pudo eliminar la publicación. Inténtalo de nuevo.',
          ),
        );
        return;
    }
  }, []);

  const correr = useCallback(
    async (id: string, accion: Accion, pedido: (id: string) => Promise<ResultadoDeModeracion>) => {
      if (enCurso.current.has(id)) return;
      enCurso.current.add(id);
      setOcupadas(previas => ({ ...previas, [id]: accion }));
      try {
        terminar(await pedido(id), id, accion);
      } finally {
        enCurso.current.delete(id);
        setOcupadas(previas => {
          const { [id]: _quitada, ...resto } = previas;
          return resto;
        });
      }
    },
    [terminar],
  );

  const devolver = useCallback((id: string) => correr(id, 'devolver', devolverAlMuro), [correr]);

  const eliminar = useCallback(
    (id: string) => {
      if (enCurso.current.has(id)) return;
      Alert.alert(TITULO_DE_ELIMINAR, MENSAJE_DE_ELIMINAR, [
        { text: 'Cancelar', style: 'cancel' },
        { text: BOTON_ELIMINAR, style: 'destructive', onPress: () => void correr(id, 'eliminar', eliminarDeLaCola) },
      ]);
    },
    [correr],
  );

  return {
    filas,
    cargando,
    cargandoMas,
    fallo,
    falloAlTraerMas,
    hayMas: cursor !== null,
    ocupadas,
    aviso,
    cerrarAviso: () => setAviso(null),
    recargar: cargar,
    traerMas,
    devolver,
    eliminar,
  };
}
