// SOLO tipos; el módulo se carga con `require` dentro de `notificaciones()`. Ver `pushNativo.ts`.
import type * as TipoNotificaciones from 'expo-notifications';

import { destinoDeRuta, type DestinoDeAviso } from '../api/avisosApi';
import { HAY_PUSH_NATIVO } from './pushNativo';

/**
 * Qué hacer cuando alguien toca un aviso de acompañamiento (RF-25).
 *
 * El backend manda la ruta en el payload: `data.route` =
 * `/mentor/groups/{grupoId}/learners/{alumnoId}` (`AvisoDeAcompanamientoEvent.rutaApp()`). El push
 * **no lleva datos personales** —ni nombres, ni métricas—: solo los identificadores necesarios
 * para ir a buscar el detalle. Una bandeja de notificaciones es visible en la pantalla bloqueada.
 *
 * ## Por qué una ruta pendiente y no una navegación directa
 *
 * Las vistas del mentor no son rutas del navegador: son estado dentro de `HoyScreen`
 * (`vistaMentor`), igual que el Mapa. Convertirlas en rutas para esto significaría rehacer la
 * navegación de las cinco pestañas, que AGENTS.md §1 prohíbe tocar. Así que el toque deja una
 * ruta *pendiente* y la pantalla la consume cuando está montada y con sesión.
 *
 * El efecto de fondo es el que hace falta igual: el aviso puede llegar con la app cerrada, con la
 * sesión vencida o después de una rotación. En los tres casos la ruta espera, y quien decide si
 * se abre es el servidor cuando la pantalla pide los datos —un exmentor recibe 403 y ve el
 * mensaje, no el expediente—. La ruta del push nunca es una autorización.
 *
 * ## Dos clases de destino (2026-09-25)
 *
 * Desde el semáforo (D-168) hay un segundo aviso: el del sábado, con ruta `/semaforo`, que le
 * llega a TODA persona medida, no solo al mentor. Los dos destinos comparten este único lugar de
 * espera, pero cada pantalla consume **solo el suyo** (`consumirRutaPendiente(tipo)`): si no, la
 * escucha del mentor se tragaría un `/semaforo` y ese aviso no abriría nada.
 *
 * Después se sumaron los otros dos resúmenes del sábado (contrato §1.2 y §4.5):
 * `/mentor/groups/{g}/semaforo` (`semaforoGrupo`, el mentor) y `/semaforo/grupos`
 * (`semaforoGrupos`, líder de mentores y administración). Misma regla: cuatro clases, un solo
 * lugar de espera, y cada escucha se lleva solo la suya.
 */

let pendiente: DestinoDeAviso | null = null;
const oyentes = new Set<(ruta: DestinoDeAviso) => void>();

/**
 * Deja esperando el destino de la ruta de un aviso y avisa a quien esté escuchando. `false` si la
 * ruta no es de las que esta versión sabe abrir: no se anota nada y el toque solo abre la app.
 */
export function anotarRutaDeAviso(ruta: unknown): boolean {
  const destino = destinoDeRuta(ruta);
  if (!destino) return false;
  pendiente = destino;
  oyentes.forEach(oyente => oyente(destino));
  return true;
}

/**
 * Se suscribe a las aperturas. Entrega de inmediato la que ya estuviera esperando: la pantalla
 * puede montarse *después* del toque —es lo normal en un arranque en frío— y sin esto ese primer
 * aviso se perdería en silencio.
 */
export function alAbrirAviso(oyente: (ruta: DestinoDeAviso) => void): () => void {
  oyentes.add(oyente);
  if (pendiente) oyente(pendiente);
  return () => { oyentes.delete(oyente); };
}

/**
 * La consume quien la atendió. Sin esto, volver atrás reabriría la misma ficha para siempre.
 *
 * Solo si es de la clase que se pide: una ruta de otra clase se deja esperando para su pantalla.
 */
export function consumirRutaPendiente<T extends DestinoDeAviso['tipo']>(
  tipo: T,
): Extract<DestinoDeAviso, { tipo: T }> | null {
  if (!pendiente || pendiente.tipo !== tipo) return null;
  const ruta = pendiente as Extract<DestinoDeAviso, { tipo: T }>;
  pendiente = null;
  return ruta;
}

/**
 * Se descarta lo que quedara esperando. Se llama al cerrar sesión: la ruta la generó un aviso
 * para *esa* persona, y aplicarla después de que entre otra en el mismo teléfono abriría la ficha
 * de un alumno ajeno. El servidor respondería 403, pero el intento no debería ni ocurrir.
 */
export function olvidarRutaPendiente(): void {
  pendiente = null;
}

let modulo: typeof TipoNotificaciones | null = null;

function notificaciones(): typeof TipoNotificaciones | null {
  if (!HAY_PUSH_NATIVO) return null;
  if (modulo === null) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    modulo = require('expo-notifications') as typeof TipoNotificaciones;
  }
  return modulo;
}

/** Ya atendidas, para no reabrir la misma. Ver el comentario del arranque en frío. */
const atendidas = new Set<string>();

function atender(respuesta: TipoNotificaciones.NotificationResponse | null): void {
  if (!respuesta) return;
  const id = respuesta.notification.request.identifier;
  if (atendidas.has(id)) return;
  atendidas.add(id);

  const datos = respuesta.notification.request.content.data as { route?: unknown } | null;
  anotarRutaDeAviso(datos?.route);
}

/**
 * Empieza a escuchar. Cubre los dos caminos, que son distintos:
 *
 * - **App viva** (en primer plano o en segundo): llega por el listener.
 * - **App cerrada**: el toque la abre y el listener todavía no existía cuando ocurrió;
 *   `getLastNotificationResponseAsync()` es la única forma de enterarse.
 *
 * El segundo devuelve la última respuesta aunque ya se haya atendido en un arranque anterior —de
 * ahí el conjunto `atendidas`, que impide que el mismo toque reabra la ficha cada vez que la
 * persona vuelve a abrir la app.
 */
export function escucharAperturaDeAviso(): () => void {
  const N = notificaciones();
  if (!N) return () => {};

  const suscripcion = N.addNotificationResponseReceivedListener(atender);
  void N.getLastNotificationResponseAsync().then(atender).catch(() => {});
  return () => suscripcion.remove();
}
