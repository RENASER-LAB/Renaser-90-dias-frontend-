import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { obtenerPresencia } from '../api/chatApi';
import { cerrarConversacionAbierta, marcarConversacionAbierta } from '../avisos/conversacionAbierta';
import { conexionChat, destinoDeConversacion, HAY_CHAT_EN_VIVO } from '../tiempoReal/conexionStomp';
import { esEcoPropio, leerEventoDelChat, type EventoMensaje } from '../tiempoReal/eventosDelChat';
import { marcaMasReciente } from '../utils/lecturaDelChat';

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
 *
 * ## Qué hace con las lecturas (D-208, 2026-09-27)
 *
 * Devuelve `leidoHasta`: hasta dónde leyeron todos en la conversación abierta, según el último aviso
 * `READ`. La pantalla lo aplica a sus mensajes propios (`utils/lecturaDelChat.conLeidoHasta`) y ahí
 * pasan de ✓ a ✓✓ sin recargar. La marca solo avanza, y se recuerda por conversación mientras la
 * pantalla viva: volver a un chat no la pierde ni hace parpadear un ✓✓ ya visto. Nunca se marca
 * nada como leído desde acá: recargar el historial (que sí marca) por un aviso de lectura haría que
 * dos teléfonos con el chat abierto se avisaran uno al otro sin fin.
 *
 * ## Segundo plano (D-221, 2026-09-29)
 *
 * El servidor NO le manda el push de un mensaje a quien tiene esa conversación suscripta por socket:
 * la da por abierta en pantalla. Por eso, cuando la app pasa a segundo plano, se deja de escuchar
 * (UNSUBSCRIBE; con la última suscripción se cierra el socket) y se borra la marca de «conversación
 * abierta» que usa el aviso en primer plano (`avisos/conversacionAbierta.ts`); si no, con el teléfono
 * bloqueado sobre un chat no llegaría ningún aviso de ese chat. Al volver, se re-suscribe y se vuelve
 * a pedir la presencia.
 */

/** Si con este estado de la app hay que escuchar en vivo: todo menos segundo plano. `inactive` (iOS,
 * el centro de control encima) es un instante y no cuenta como irse. */
export function escuchaEnVivoCon(estado: AppStateStatus): boolean {
  return estado !== 'background';
}
interface OpcionesChatEnVivo {
  /** `null` cuando no hay conversación abierta: entonces no se suscribe a nada. */
  conversacionId: string | null;
  /** El usuario de la sesión, para no reaccionar a los ecos de lo que uno mismo mandó. */
  miUsuarioId: string | null | undefined;
  /** Se llama cuando llega un mensaje de OTRO. La pantalla decide qué recargar. */
  alLlegarMensaje?: (evento: EventoMensaje) => void;
  /** `false` en la comunidad: ahí no hay ✓✓ y un aviso de lectura se ignora (el servidor no lo manda). */
  confirmaLectura?: boolean;
}

export function useChatEnVivo({
  conversacionId,
  miUsuarioId,
  alLlegarMensaje,
  confirmaLectura = true,
}: OpcionesChatEnVivo) {
  const [enLinea, setEnLinea] = useState<Set<string>>(new Set());
  /* Por conversación, y no una sola marca: así la de un chat nunca se aplica a otro durante el
     render en que se cambia de uno a otro, y volver a un chat la encuentra donde estaba. */
  const [leidoHastaPorConversacion, setLeidoHastaPorConversacion] = useState<ReadonlyMap<string, string>>(
    () => new Map()
  );
  const confirmaLecturaRef = useRef(confirmaLectura);
  confirmaLecturaRef.current = confirmaLectura;

  /* En una ref y no en las dependencias del efecto: si la pantalla pasa una función nueva en
     cada render —que es lo normal—, ponerla como dependencia volvería a suscribir el socket en
     cada render. */
  const alLlegarMensajeRef = useRef(alLlegarMensaje);
  alLlegarMensajeRef.current = alLlegarMensaje;

  const [enPrimerPlano, setEnPrimerPlano] = useState(() => escuchaEnVivoCon(AppState.currentState));
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', estado => setEnPrimerPlano(escuchaEnVivoCon(estado)));
    return () => suscripcion.remove();
  }, []);

  useEffect(() => {
    if (!conversacionId || !enPrimerPlano) {
      setEnLinea(new Set());
      return;
    }

    let vigente = true;
    setEnLinea(new Set());
    marcarConversacionAbierta(conversacionId);

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
        cerrarConversacionAbierta(conversacionId);
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

      if (evento.event === 'READ') {
        if (!confirmaLecturaRef.current) return;
        setLeidoHastaPorConversacion(previo => {
          const actual = previo.get(conversacionId) ?? null;
          const nueva = marcaMasReciente(actual, evento.readUpTo);
          if (nueva === actual) return previo;
          const siguiente = new Map(previo);
          siguiente.set(conversacionId, nueva);
          return siguiente;
        });
        return;
      }

      // Un mensaje de sistema a nombre de uno mismo no es un eco: la pantalla no lo agregó.
      if (esEcoPropio(evento, miUsuarioId)) return;
      alLlegarMensajeRef.current?.(evento);
    });

    return () => {
      vigente = false;
      cancelar();
      cerrarConversacionAbierta(conversacionId);
    };
  }, [conversacionId, miUsuarioId, enPrimerPlano]);

  const leidoHasta = conversacionId && confirmaLectura ? leidoHastaPorConversacion.get(conversacionId) ?? null : null;
  return { enLinea, leidoHasta };
}
