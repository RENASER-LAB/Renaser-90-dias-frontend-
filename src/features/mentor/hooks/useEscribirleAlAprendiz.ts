import { useCallback, useRef, useState } from 'react';

import { Alert } from '../../../components/Alerta';
import { irAPestana } from '../../../navigation/navegacionRef';
import { mensajeDeError } from '../../../services/http/apiClient';
import { abrirConversacionDirecta } from '../../chat/api/chatApi';

/**
 * Abre —o crea— el 1 a 1 con el aprendiz y lleva hasta él, sin enviar nada. Lo usan el ícono de chat (este hook) y el botón
 * «Escribirle» del aviso de rojo (spec 057 FR-035, `rutaDeAviso.ts`): un solo camino. Devuelve `false` si la navegación todavía no
 * estaba lista (la conversación quedó creada); lanza lo que lance el servidor.
 */
export async function abrirElChatConElAprendiz(aprendizId: string, nombre: string | null): Promise<boolean> {
  const conversacion = await abrirConversacionDirecta(aprendizId);
  return irAPestana('Comunidad', { abrirChatConversacionId: conversacion.id, abrirChatTitulo: nombre?.trim() || undefined });
}

/**
 * El ícono de chat de «Mi grupo» y de la ficha (spec 055 FR-007): abre —o crea— el 1 a 1 con el aprendiz y lleva hasta él,
 * SIN enviar nada (escribirle es decisión del mentor, no un efecto de tocar un ícono). Es idempotente en el servidor.
 *
 * **Un toque, un pedido** (AGENTS.md, familias de errores): mientras uno viaja, otro toque no hace nada; el ícono queda apagado
 * con `escribiendoId`. Se guarda en un `ref` además del estado, porque dos toques en el mismo cuadro ven el mismo estado viejo.
 * Si el servidor responde con un motivo, se muestra; si no hay red, se dice.
 */
export function useEscribirleAlAprendiz() {
  const enCurso = useRef<string | null>(null);
  const [escribiendoId, setEscribiendoId] = useState<string | null>(null);

  const escribirle = useCallback(async (aprendizId: string, nombre: string | null) => {
    if (enCurso.current) return;
    enCurso.current = aprendizId;
    setEscribiendoId(aprendizId);
    try {
      const navego = await abrirElChatConElAprendiz(aprendizId, nombre);
      if (!navego) {
        /* La conversación SÍ quedó creada: callarse dejaría al mentor creyendo que el ícono no hizo nada. */
        Alert.alert(
          'Conversación lista',
          `Tu chat con ${nombre?.trim() || 'este aprendiz'} está en Comunidad → Miembros. No se envió ningún mensaje.`,
        );
      }
    } catch (e) {
      Alert.alert('No se pudo abrir el chat', mensajeDeError(e, 'Revisa tu conexión e inténtalo de nuevo.'));
    } finally {
      enCurso.current = null;
      setEscribiendoId(null);
    }
  }, []);

  return { escribiendoId, escribirle };
}
