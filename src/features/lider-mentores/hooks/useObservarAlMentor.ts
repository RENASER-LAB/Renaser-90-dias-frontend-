import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert } from '../../../components/Alerta';
import { mensajeDeError } from '../../../services/http/apiClient';
import { registrarObservacion } from '../api/liderMentoresApi';
import type { TipoObservacion } from '../api/liderMentoresSchemas';
import { nuevaClaveDeOperacion } from '../utils/personaParaLaFicha';

/**
 * Reconocer, sugerir o alertar a un mentor (spec 056 FR-025). El servidor guarda la observación y, además, le manda el texto por su chat con el líder y un
 * aviso al teléfono: la app **no** lo reenvía por el chat (`mensajeId` va en `null`). **Un toque, un pedido** (un `ref` cubre dos toques en el mismo cuadro);
 * la clave de la operación es la misma en un reintento y cambia cuando salió. Si falla, el motivo se dice y quien llama conserva lo escrito.
 */
export function useObservarAlMentor(mentorId: string) {
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);
  const vivo = useRef(true);
  const clave = useRef(nuevaClaveDeOperacion('obs'));

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const guardar = useCallback(
    async (tipo: TipoObservacion, texto: string): Promise<boolean> => {
      if (enCurso.current) return false;
      enCurso.current = true;
      setGuardando(true);
      try {
        await registrarObservacion(mentorId, { tipo, texto: texto.trim(), claveOperacion: clave.current, mensajeId: null });
        clave.current = nuevaClaveDeOperacion('obs');
        return true;
      } catch (e) {
        Alert.alert('No se pudo guardar', mensajeDeError(e, 'Revisa tu conexión y vuelve a tocar «Guardar». Lo que escribiste sigue aquí.'));
        return false;
      } finally {
        enCurso.current = false;
        if (vivo.current) setGuardando(false);
      }
    },
    [mentorId],
  );

  return { guardando, guardar };
}
