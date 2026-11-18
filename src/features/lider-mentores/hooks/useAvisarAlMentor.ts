import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert } from '../../../components/Alerta';
import { mensajeDeError } from '../../../services/http/apiClient';
import { avisarAlMentor } from '../api/accionesDelLiderApi';
import { nuevaClaveDeOperacion } from '../utils/personaParaLaFicha';

/**
 * «Avisar a su mentor» (spec 056 FR-019): manda el aviso al servidor, que le escribe en su chat con el líder (con el enlace a la ficha) y le llega al
 * teléfono. **Un toque, un pedido**: mientras uno viaja, otro no sale (un `ref` cubre dos toques en el mismo cuadro). La clave de la operación es la misma
 * en un reintento —el servidor no duplica— y cambia solo cuando el aviso salió. Si falla, se dice el motivo del servidor (`SIN_MENTOR`, 403…) y quien llama
 * conserva lo que escribió (`avisar` devuelve `false`).
 */
export function useAvisarAlMentor(personaId: string) {
  const [enviando, setEnviando] = useState(false);
  const enCurso = useRef(false);
  const vivo = useRef(true);
  const clave = useRef(nuevaClaveDeOperacion('avisar'));

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const avisar = useCallback(
    async (texto: string): Promise<boolean> => {
      if (enCurso.current) return false;
      enCurso.current = true;
      setEnviando(true);
      try {
        await avisarAlMentor(personaId, texto, clave.current);
        clave.current = nuevaClaveDeOperacion('avisar');
        return true;
      } catch (e) {
        Alert.alert('No se pudo avisar', mensajeDeError(e, 'Revisa tu conexión e inténtalo de nuevo. Lo que escribiste sigue aquí.'));
        return false;
      } finally {
        enCurso.current = false;
        if (vivo.current) setEnviando(false);
      }
    },
    [personaId],
  );

  return { enviando, avisar };
}
