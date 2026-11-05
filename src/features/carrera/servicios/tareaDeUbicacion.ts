import { Platform } from 'react-native';

import type { PuntoGps } from '../types/carrera.types';
import { cargarCarrera, carreraActual, recibirPuntos, resumenParaLaNotificacion } from './carreraEnVivo';
import { ponerCentroDelMapa } from './centroDelMapa';
import { leerCarreraEnCurso } from './almacenCarrera';
import { mostrarNotificacionDeCarrera, quitarNotificacionDeCarrera } from './notificacionDeCarrera';
import { laCarreraYaEmpezo } from '../utils/notificacionUnica';
import { TEXTOS_DE_LA_NOTIFICACION } from '../utils/textosDeLaCarrera';

/**
 * El GPS de la carrera en un servicio en primer plano (FR-011, FR-030): `expo-location` con `foregroundService`, iniciado con la
 * app visible. Así NO hace falta el permiso de ubicación en segundo plano (`ACCESS_BACKGROUND_LOCATION`): lo confirma el código
 * del módulo (`startLocationUpdatesAsync`, «a user-initiated foreground service with notification does NOT require the background
 * location permission»). La revisión de Play queda en la declaración del servicio de tipo ubicación, sin la de segundo plano.
 *
 * La tarea se DEFINE al cargar la app (`definirTareaDeLaCarrera`, desde `index.ts`): Android la vuelve a llamar aunque la pantalla
 * de la carrera no esté montada. Si el proceso arrancó sin la carrera en memoria (Android lo mató y el servicio siguió), la carga
 * del teléfono antes de aplicar los puntos.
 *
 * Solo Android (FR-001). En la web y en las pruebas, todo esto no hace nada.
 */

export const TAREA_GPS_DE_LA_CARRERA = 'renaser-carrera-gps';

type ModuloUbicacion = typeof import('expo-location');
type ModuloTareas = typeof import('expo-task-manager');

function cargar(): { Location: ModuloUbicacion; TaskManager: ModuloTareas } | null {
  if (Platform.OS !== 'android') return null;
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const Location = require('expo-location') as ModuloUbicacion;
    const TaskManager = require('expo-task-manager') as ModuloTareas;
    /* eslint-enable @typescript-eslint/no-require-imports */
    return { Location, TaskManager };
  } catch {
    return null;
  }
}

/** Lo que llega de `expo-location` a la tarea, reducido a lo que usa el motor. */
export function puntosDeLaUbicacion(
  locations: ReadonlyArray<{ timestamp: number; coords: { latitude: number; longitude: number; accuracy: number | null; altitude: number | null; speed: number | null } }>,
): PuntoGps[] {
  return locations
    .filter(l => Number.isFinite(l.coords.latitude) && Number.isFinite(l.coords.longitude))
    .map(l => ({
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      t: l.timestamp,
      precision: l.coords.accuracy ?? null,
      altitud: l.coords.altitude ?? null,
      velocidad: l.coords.speed ?? null,
    }));
}

let definida = false;

/** Define la tarea del GPS. Se llama UNA vez al cargar la app; nunca lanza. */
export function definirTareaDeLaCarrera(): void {
  if (definida) return;
  const m = cargar();
  if (!m) return;
  definida = true;
  try {
    m.TaskManager.defineTask(TAREA_GPS_DE_LA_CARRERA, async ({ data, error }) => {
      if (error || !data) return;
      const { locations } = data as { locations?: Parameters<typeof puntosDeLaUbicacion>[0] };
      if (!locations || locations.length === 0) return;
      if (!carreraActual()) {
        const guardada = await leerCarreraEnCurso();
        if (!guardada) return;
        // Proceso nuevo sin la pantalla: se carga tal cual; al abrir la app, `cargarCarrera` decide si estuvo muerta.
        await cargarCarrera(guardada.cuentaId);
      }
      const puntos = puntosDeLaUbicacion(locations);
      // Solo para dónde mira el mapa (también en la cuenta 3, 2, 1, cuando el motor descarta el punto por estar en pausa).
      if (puntos.length > 0) ponerCentroDelMapa(puntos[puntos.length - 1], 'gps');
      recibirPuntos(puntos);
      // La notificación única (FR-011) se pone al día también con la app abierta: es la que se ve en la barra.
      const r = resumenParaLaNotificacion();
      const e = carreraActual();
      if (r && e && laCarreraYaEmpezo(e)) void mostrarNotificacionDeCarrera({ ...r, enPausa: e.fase === 'pausa' });
    });
  } catch {
    definida = false;
  }
}

export type ResultadoDelPermiso = 'concedido' | 'denegado' | 'gps-apagado' | 'no-disponible';

/** Pide la ubicación precisa (solo «mientras se usa la app»). Lo llama el toque en «Correr con GPS», nunca solo. */
export async function pedirPermisoDeUbicacion(): Promise<ResultadoDelPermiso> {
  const m = cargar();
  if (!m) return 'no-disponible';
  try {
    if (!(await m.Location.hasServicesEnabledAsync())) return 'gps-apagado';
    const actual = await m.Location.getForegroundPermissionsAsync();
    if (actual.granted) return 'concedido';
    const pedido = await m.Location.requestForegroundPermissionsAsync();
    return pedido.granted ? 'concedido' : 'denegado';
  } catch {
    return 'denegado';
  }
}

/**
 * ¿Este proceso arrancó el GPS? Si el proceso murió (Android, el sistema o «forzar detención»), al volver `expo-task-manager`
 * restaura la tarea ANTES de que la app esté al frente y `expo-location` no puede levantar el servicio en primer plano
 * («Foreground location task cannot be started while the app is in the background»): el GPS queda sin servicio y sin su
 * notificación, y moriría al irse a segundo plano. Por eso, la primera vez de cada proceso se detiene y se vuelve a empezar.
 */
let arrancadoEnEsteProceso = false;

/** Arranca el GPS con el servicio en primer plano. Con la app al frente (la regla de Android para empezar un servicio). */
export async function empezarGps(): Promise<boolean> {
  const m = cargar();
  if (!m) return false;
  try {
    if (await m.Location.hasStartedLocationUpdatesAsync(TAREA_GPS_DE_LA_CARRERA)) {
      if (arrancadoEnEsteProceso) return true;
      await m.Location.stopLocationUpdatesAsync(TAREA_GPS_DE_LA_CARRERA);
    }
    await m.Location.startLocationUpdatesAsync(TAREA_GPS_DE_LA_CARRERA, {
      accuracy: m.Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      pausesUpdatesAutomatically: false,
      activityType: m.Location.ActivityType.Fitness,
      foregroundService: {
        notificationTitle: TEXTOS_DE_LA_NOTIFICACION.titulo,
        notificationBody: TEXTOS_DE_LA_NOTIFICACION.cuerpoDelServicio,
        notificationColor: '#B2924F',
        killServiceOnDestroy: false,
      },
    });
    arrancadoEnEsteProceso = true;
    return true;
  } catch {
    return false;
  }
}

export async function detenerGps(): Promise<void> {
  const m = cargar();
  if (!m) return;
  try {
    arrancadoEnEsteProceso = false;
    if (await m.Location.hasStartedLocationUpdatesAsync(TAREA_GPS_DE_LA_CARRERA)) {
      await m.Location.stopLocationUpdatesAsync(TAREA_GPS_DE_LA_CARRERA);
    }
  } catch {
    // Ya estaba detenido.
  }
}

/** El rumbo de la brújula, solo con la pantalla de la carrera a la vista. Devuelve cómo dejar de escuchar. */
export async function escucharRumbo(alCambiar: (grados: number) => void): Promise<() => void> {
  const m = cargar();
  if (!m) return () => undefined;
  try {
    const sub = await m.Location.watchHeadingAsync(h => {
      const g = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      if (Number.isFinite(g)) alCambiar(g);
    });
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}

/**
 * Al cerrar sesión: se apaga el GPS y la notificación fija, para que nada siga corriendo sin sesión. La carrera en curso y la cola
 * quedan guardadas POR CUENTA en el teléfono: nunca salen con la sesión de otra persona y vuelven si la misma persona entra de
 * nuevo (falta el aviso «tienes una carrera sin enviar» antes de cerrar sesión: queda anotado en el informe).
 */
export async function apagarLaCarreraAlSalir(): Promise<void> {
  await detenerGps();
  await quitarNotificacionDeCarrera();
}
