import { Platform } from 'react-native';

import { API_CONFIG } from '../../../config/apiConfig';
import { getTokenSesion } from '../../../services/http/apiClient';
import { armarTrama, leerTramas, LATIDO, type TramaStomp } from './protocoloStomp';

/**
 * El socket del chat en vivo: UNO para toda la app, compartido por quien lo necesite.
 *
 * ## Qué es esto y por qué aparece recién ahora
 *
 * El backend tiene el canal armado desde hace tiempo —`/ws` con STOMP y Redis Pub/Sub por
 * detrás, y su propio javadoc dice que se hizo para "reemplazar el polling"— pero **ningún
 * cliente lo abría**: la app conversaba solo por REST, así que un mensaje entrante no aparecía
 * hasta volver a entrar a la conversación, y el indicador "en línea" era un texto fijo.
 *
 * ## Reglas que se respetan acá
 *
 * - **Una sola conexión.** Abrir un socket por pantalla multiplicaría los handshakes y, del lado
 *   del servidor, la cuenta de presencia. Se abre con la primera suscripción y se cierra sola
 *   cuando se va la última.
 * - **El token viaja en la cabecera, no en la URL.** `X-Auth-Token`, el mismo de HTTP. La API de
 *   `WebSocket` de los navegadores no admite cabeceras propias —por eso el backend acepta
 *   además `?token=`— pero la de React Native sí (tercer argumento `options.headers`), y un
 *   token en la barra de direcciones termina en los registros de cualquier proxy.
 * - **Solo en nativo.** En web habría que caer al `?token=` de la URL por lo de arriba, y el
 *   producto es la app. En web todo sigue como estaba: el chat funciona por REST.
 * - **Nunca tumba la app.** Cualquier fallo se traga y se reintenta; lo peor que pasa es que se
 *   vuelve al comportamiento de antes de que esto existiera.
 */

/** En web no se abre socket. Ver el bloque de arriba. */
export const HAY_CHAT_EN_VIVO = Platform.OS !== 'web';

/** Latidos, en milisegundos, negociados con el broker simple de Spring (su valor por omisión). */
const LATIDO_MS = 10_000;

/** Sin nada del servidor por este tiempo, la conexión se da por muerta. Tres latidos perdidos. */
const SILENCIO_MAXIMO_MS = 32_000;

/** Espera antes de reintentar: crece hasta un techo para no martillar un backend caído. */
const REINTENTO_MIN_MS = 1_000;
const REINTENTO_MAX_MS = 30_000;

type Oyente = (cuerpo: string) => void;

interface Suscripcion {
  id: string;
  destino: string;
  oyente: Oyente;
  /** `false` mientras no se le haya mandado el SUBSCRIBE al servidor (socket aún no listo). */
  enviada: boolean;
}

function urlDelSocket(): string {
  return `${API_CONFIG.BASE_URL.replace(/^http/, 'ws')}/ws`;
}

/**
 * El `WebSocket` de React Native acepta un TERCER argumento con cabeceras del handshake
 * (`react-native/Libraries/WebSocket/WebSocket.js`: `constructor(url, protocols, options)`, y
 * de `options` saca `headers`). El tipo global que ve TypeScript es el del DOM, que solo
 * declara dos — de ahí este alias.
 *
 * No es "engañar al compilador para que pase": es describir la API que de verdad existe en la
 * plataforma donde este archivo corre. Y es lo que permite mandar el token por cabecera en vez
 * de pegarlo en la URL, donde lo registraría cualquier proxy del camino.
 */
type WebSocketNativo = new (
  url: string,
  protocolos?: string | string[],
  opciones?: { headers?: Record<string, string> }
) => WebSocket;

class ConexionStomp {
  private socket: WebSocket | null = null;
  private acumulado = '';
  private conectado = false;
  private cerradaAPropósito = false;

  private readonly suscripciones = new Map<string, Suscripcion>();
  private siguienteId = 0;

  private temporizadorLatido: ReturnType<typeof setInterval> | null = null;
  private temporizadorSilencio: ReturnType<typeof setTimeout> | null = null;
  private temporizadorReintento: ReturnType<typeof setTimeout> | null = null;
  private esperaReintento = REINTENTO_MIN_MS;

  /**
   * Escucha un destino. Devuelve la función para dejar de escuchar — llamarla es obligatorio
   * (el hook lo hace al desmontar), porque es lo que termina cerrando el socket.
   */
  suscribir(destino: string, oyente: Oyente): () => void {
    if (!HAY_CHAT_EN_VIVO) return () => {};

    const id = `sub-${this.siguienteId++}`;
    this.suscripciones.set(id, { id, destino, oyente, enviada: false });

    if (this.conectado) {
      this.enviarSuscripcion(id);
    } else {
      this.abrir();
    }

    return () => this.desuscribir(id);
  }

  private desuscribir(id: string): void {
    const suscripcion = this.suscripciones.get(id);
    if (!suscripcion) return;
    this.suscripciones.delete(id);

    if (this.conectado && suscripcion.enviada) {
      this.enviar(armarTrama('UNSUBSCRIBE', { id }));
    }
    if (this.suscripciones.size === 0) {
      this.cerrar();
    }
  }

  private abrir(): void {
    if (this.socket || !HAY_CHAT_EN_VIVO) return;

    const token = getTokenSesion();
    if (!token) return; // Sin sesión no hay socket; se reintenta cuando alguien vuelva a suscribirse.

    this.cerradaAPropósito = false;
    this.acumulado = '';

    try {
      const WebSocketConCabeceras = WebSocket as unknown as WebSocketNativo;
      this.socket = new WebSocketConCabeceras(urlDelSocket(), undefined, {
        headers: { 'X-Auth-Token': token },
      });
    } catch {
      this.programarReintento();
      return;
    }

    this.socket.onopen = () => {
      this.enviar(armarTrama('CONNECT', {
        'accept-version': '1.2',
        host: 'renaser',
        'heart-beat': `${LATIDO_MS},${LATIDO_MS}`,
      }));
    };

    this.socket.onmessage = evento => {
      const datos = typeof evento.data === 'string' ? evento.data : '';
      if (!datos) return;
      this.reiniciarSilencio();

      const { tramas, resto } = leerTramas(this.acumulado + datos);
      this.acumulado = resto;
      for (const trama of tramas) {
        this.procesar(trama);
      }
    };

    this.socket.onerror = () => {
      // Se ignora: `onclose` llega siempre detrás y es el que reintenta. Sin este manejador,
      // React Native imprime el error por consola en cada reconexión.
    };

    this.socket.onclose = () => {
      this.limpiarSocket();
      if (!this.cerradaAPropósito && this.suscripciones.size > 0) {
        this.programarReintento();
      }
    };
  }

  private procesar(trama: TramaStomp): void {
    if (trama.comando === 'CONNECTED') {
      this.conectado = true;
      this.esperaReintento = REINTENTO_MIN_MS;
      this.arrancarLatido();
      this.reiniciarSilencio();
      // Se (re)suscribe TODO lo vivo: tras una reconexión el servidor no recuerda nada.
      for (const id of this.suscripciones.keys()) {
        this.enviarSuscripcion(id);
      }
      return;
    }

    if (trama.comando === 'MESSAGE') {
      const suscripcion = trama.cabeceras.subscription
        ? this.suscripciones.get(trama.cabeceras.subscription)
        : undefined;
      // Se busca por `subscription` y no por destino: dos pantallas pueden mirar lo mismo.
      const destinatarios = suscripcion
        ? [suscripcion]
        : [...this.suscripciones.values()].filter(s => s.destino === trama.cabeceras.destination);
      for (const destinatario of destinatarios) {
        try {
          destinatario.oyente(trama.cuerpo);
        } catch {
          // Un oyente que falla no puede dejar sin entregar a los demás.
        }
      }
      return;
    }

    if (trama.comando === 'ERROR') {
      // El servidor rechazó algo (una suscripción sin permiso, una sesión vencida) y por
      // protocolo cierra a continuación. No se reintenta en bucle contra un rechazo: se deja
      // que `onclose` aplique la espera creciente.
      this.socket?.close();
    }
  }

  private enviarSuscripcion(id: string): void {
    const suscripcion = this.suscripciones.get(id);
    if (!suscripcion) return;
    this.enviar(armarTrama('SUBSCRIBE', { id, destination: suscripcion.destino, ack: 'auto' }));
    suscripcion.enviada = true;
  }

  private enviar(texto: string): void {
    try {
      this.socket?.send(texto);
    } catch {
      // El socket se cerró entre medio; `onclose` ya se encarga.
    }
  }

  private arrancarLatido(): void {
    this.pararLatido();
    this.temporizadorLatido = setInterval(() => this.enviar(LATIDO), LATIDO_MS);
  }

  private pararLatido(): void {
    if (this.temporizadorLatido) clearInterval(this.temporizadorLatido);
    this.temporizadorLatido = null;
  }

  /**
   * Un socket puede quedar "abierto" sobre una red que ya no existe —típico al pasar de wifi a
   * datos— sin que llegue nunca un `onclose`. El silencio es la única señal de que eso pasó.
   */
  private reiniciarSilencio(): void {
    if (this.temporizadorSilencio) clearTimeout(this.temporizadorSilencio);
    this.temporizadorSilencio = setTimeout(() => {
      this.limpiarSocket();
      if (this.suscripciones.size > 0) this.programarReintento();
    }, SILENCIO_MAXIMO_MS);
  }

  private programarReintento(): void {
    if (this.temporizadorReintento) return;
    const espera = this.esperaReintento;
    this.esperaReintento = Math.min(espera * 2, REINTENTO_MAX_MS);
    this.temporizadorReintento = setTimeout(() => {
      this.temporizadorReintento = null;
      if (this.suscripciones.size > 0) this.abrir();
    }, espera);
  }

  private limpiarSocket(): void {
    this.pararLatido();
    if (this.temporizadorSilencio) clearTimeout(this.temporizadorSilencio);
    this.temporizadorSilencio = null;
    this.conectado = false;
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket = null;
    }
    for (const suscripcion of this.suscripciones.values()) {
      suscripcion.enviada = false;
    }
  }

  private cerrar(): void {
    this.cerradaAPropósito = true;
    if (this.temporizadorReintento) clearTimeout(this.temporizadorReintento);
    this.temporizadorReintento = null;
    this.esperaReintento = REINTENTO_MIN_MS;
    const socket = this.socket;
    this.limpiarSocket();
    try {
      socket?.close();
    } catch {
      // Ya estaba cerrado.
    }
  }

  /** Corta todo. La llama el cierre de sesión: el socket lleva el token de quien se fue. */
  cerrarTodo(): void {
    this.suscripciones.clear();
    this.cerrar();
  }
}

export const conexionChat = new ConexionStomp();

/** Destino STOMP de una conversación. Es el único que el servidor autoriza a escuchar. */
export function destinoDeConversacion(conversacionId: string): string {
  return `/topic/conversaciones/${conversacionId}`;
}
