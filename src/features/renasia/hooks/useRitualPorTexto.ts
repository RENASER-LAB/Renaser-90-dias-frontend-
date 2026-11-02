import { useCallback, useState } from 'react';

import type { ResultadoDelRegistro } from '../../habits/utils/registroConFoto';
import type { PedidoDeFotoUI } from '../types/renasia.types';
import { tituloDelPedido } from '../utils/pedidosDeFoto';

/**
 * El registro de un ritual cuando lo pide SER (spec 038, decisión del dueño del 31/10: los rituales se registran ESCRIBIENDO, sin cámara).
 *
 * La tarjeta del acompañante abre la MISMA hoja de Training (`RegistroDeRitualConTexto`: «¿Cómo te sientes después de realizar el
 * ritual?», evidencia de TEXTO y cierre con esa respuesta, que emite `habitoCumplido`), no la cámara. Este hook solo guarda cuál es el
 * ritual abierto y entrega las props de esa hoja; qué hacer con la tarjeta al terminar (marcarla registrada, recargar Hoy) lo decide quien
 * lo monta, como con `useRegistroConFoto`.
 *
 * Monta la hoja DENTRO del mismo lugar que el modal de la foto: en iOS, un modal al lado de otro ya presentado no se muestra.
 */
export function useRitualPorTexto(opciones: {
  /** El servidor cerró el registro. */
  alCompletar: (registroId: string, resultado: ResultadoDelRegistro) => void;
  /** Pasó la medianoche con la hoja abierta: no se mandó nada. */
  alCambiarElDia?: (registroId: string) => void;
}) {
  const { alCompletar, alCambiarElDia } = opciones;
  const [ritual, setRitual] = useState<{ registroId: string; titulo: string; abierto: boolean } | null>(null);

  const abrir = useCallback((pedido: PedidoDeFotoUI) => {
    setRitual({ registroId: pedido.registroId, titulo: tituloDelPedido(pedido), abierto: true });
  }, []);

  const cerrar = useCallback(() => {
    setRitual(previo => (previo ? { ...previo, abierto: false } : previo));
  }, []);

  const modal = {
    visible: ritual?.abierto === true,
    registroId: ritual?.registroId ?? null,
    titulo: ritual?.titulo ?? '',
    alCerrar: cerrar,
    alCompletado: (registroId: string, resultado: ResultadoDelRegistro) => {
      cerrar();
      alCompletar(registroId, resultado);
    },
    alCambiarElDia: () => {
      const registroId = ritual?.registroId;
      cerrar();
      if (registroId) alCambiarElDia?.(registroId);
    },
  };

  return { abrir, modal };
}
