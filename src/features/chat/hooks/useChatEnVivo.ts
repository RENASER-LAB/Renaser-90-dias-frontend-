import { useEffect, useRef, useState } from 'react';

import { obtenerPresencia } from '../api/chatApi';
import { conexionChat, destinoDeConversacion, HAY_CHAT_EN_VIVO } from '../tiempoReal/conexionStomp';
import { leerEventoDelChat, type EventoMensaje } from '../tiempoReal/eventosDelChat';

/**
 * La conversación abierta, en vivo: quién está conectado y qué mensajes van llegando.
 *
 * ## Las dos fuentes, y por qué hacen falta las dos
 *
 * Una suscripción entrega **cambios**, no el estado actual. Quien abre el chat con la otra
 * persona ya conectada no recibiría nada y la vería apagada hasta que el otro se fuera. Por eso
 * al abrir se pregunta una vez por REST (`GET .../presence`) y a partir de ahí manda el socket.
 *
 * ## Qué hace con los mensajes
 *
 * Avisa que llegó uno (`alLlegarMensaje`), no lo pinta: el payload del empuje es liviano a
 * propósito —no trae la URL firmada de una foto ni el nombre del emisor— y la pantalla ya sabe
 * traer el detalle completo con su paginación. Empujar el payload liviano directo a la lista
 * pintaría burbujas incompletas.
 *
 * Los mensajes PROPIOS se descartan acá: la pantalla ya agregó el suyo al mandarlo, con la
 * respuesta del POST. Sin este filtro, cada mensaje que uno escribe se vería dos veces.
 */
interface OpcionesChatEnVivo {
  /** `null` cuando no hay conversación abierta: entonces no se suscribe a nada. */
  conversacionId: string | null;
  /** El usuario de la sesión, para no reaccionar a los ecos de lo que uno mismo mandó. */
  miUsuarioId: string | null | undefined;
  /** Se llama cuando llega un mensaje de OTRO. La pantalla decide qué recargar. */
  alLlegarMensaje?: (evento: EventoMensaje) => void;
}

export function useChatEnVivo({ conversacionId, miUsuarioId, alLlegarMensaje }: OpcionesChatEnVivo) {
  const [enLinea, setEnLinea] = useState<Set<string>>(new Set());

  /* En una ref y no en las dependencias del efecto: si la pantalla pasa una función nueva en
     cada render —que es lo normal—, ponerla como dependencia volvería a suscribir el socket en
     cada render. */
  const alLlegarMensajeRef = useRef(alLlegarMensaje);
  alLlegarMensajeRef.current = alLlegarMensaje;

  useEffect(() => {
    if (!conversacionId) {
      setEnLinea(new Set());
      return;
    }

    let vigente = true;
    setEnLinea(new Set());

    // 1) Estado inicial por REST. Funciona también en web, donde no hay socket.
    void (async () => {
      try {
        const ids = await obtenerPresencia(conversacionId);
        if (vigente) setEnLinea(new Set(ids));
      } catch {
        // Sin dato no se afirma nada: se queda "nadie en línea", que es la lectura prudente.
      }
    })();

    if (!HAY_CHAT_EN_VIVO) {
      return () => {
        vigente = false;
      };
    }

    // 2) De acá en adelante, los cambios llegan por el socket.
    const cancelar = conexionChat.suscribir(destinoDeConversacion(conversacionId), cuerpo => {
      const evento = leerEventoDelChat(cuerpo);
      if (!evento || !vigente) return;

      if (evento.event === 'PRESENCE') {
        setEnLinea(previo => {
          const siguiente = new Set(previo);
          if (evento.online) siguiente.add(evento.userId);
          else siguiente.delete(evento.userId);
          return siguiente;
        });
        return;
      }

      if (evento.senderId === miUsuarioId) return;
      alLlegarMensajeRef.current?.(evento);
    });

    return () => {
      vigente = false;
      cancelar();
    };
  }, [conversacionId, miUsuarioId]);

  return { enLinea };
}
