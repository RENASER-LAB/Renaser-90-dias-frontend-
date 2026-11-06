import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';


/**
 * Preparar la carrera ANTES de tocar «Correr» (spec 042, 2026-11-06: en el teléfono del dueño el mapa todavía tardaba ~3 s en
 * frío). Lo que más pesa en un teléfono real es la primera carga del SDK de Google Maps (`MapsInitializer`, el renderer y su
 * contexto gráfico) y las lecturas de la persona por la red. Así que, en cuanto la fila de «Kilómetros diarios» ofrece correr:
 *
 * 1. **El mapa se calienta**: el anfitrión monta un mapa mínimo, de 1 × 1 y sin nada que tocar (`CalentadorDelMapa`), y lo quita en
 *    cuanto Google Maps avisa que cargó. Pasa **una vez por proceso**: el SDK queda cargado y el mapa de la cuenta 3, 2, 1 ya no
 *    paga ese costo. Espera medio segundo desde que se ve la fila, para no trabar el cambio de pestaña.
 * 2. **La ubicación se adelanta** (`adelantarCentroDelMapa`): el centro guardado y, con el permiso ya dado, la última conocida.
 * 3. **El peso y el sexo se leen ya** (`leerDatosDeLaPersona`, que recuerda y comparte la lectura): al tocar «Correr» están listos y
 *    no frenan la cuenta. Se siguen leyendo antes de la cuenta (FR-004); solo que antes de tiempo.
 *
 * Nada de esto mide ni cambia la carrera.
 */

let quiereCalentar = false;
let calentado = false;
/** La cuenta con sesión, que pone el anfitrión: la fila no conoce la sesión y no tiene por qué. */
let cuentaDeLaSesion: string | null = null;

export function ponerCuentaDeLaCarrera(cuentaId: string | null): void {
  cuentaDeLaSesion = cuentaId;
}
const oyentes = new Set<() => void>();

function avisar(): void {
  for (const o of oyentes) o();
}

/** Pide calentar el mapa. No hace nada si ya se calentó en este proceso o no es Android. */
export function pedirCalentarElMapa(): void {
  if (Platform.OS !== 'android' || calentado || quiereCalentar) return;
  quiereCalentar = true;
  avisar();
}

/** Google Maps ya cargó una vez en este proceso (el calentador o el mapa de la carrera): no hace falta volver a calentar. */
export function marcarMapaCalentado(): void {
  if (calentado) return;
  calentado = true;
  quiereCalentar = false;
  avisar();
}

export function mapaYaCalentado(): boolean {
  return calentado;
}

function suscribir(o: () => void): () => void {
  oyentes.add(o);
  return () => oyentes.delete(o);
}

/** Si el anfitrión tiene que montar el calentador ahora. */
export function useHayQueCalentarElMapa(): boolean {
  return useSyncExternalStore(suscribir, () => quiereCalentar, () => quiereCalentar);
}

/** Lo que se adelanta para la cuenta con sesión: el mapa y los datos de la persona. Nunca lanza. */
export function prepararLaCarreraDeAntemano(): void {
  if (Platform.OS !== 'android') return;
  pedirCalentarElMapa();
  // Cargados al usarse: la fila de Training importa este archivo y sus pruebas no simulan la red ni la ubicación.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { adelantarCentroDelMapa } = require('./centroDelMapa') as typeof import('./centroDelMapa');
  void adelantarCentroDelMapa().catch(() => undefined);
  const cuentaId = cuentaDeLaSesion;
  if (cuentaId) {
    const { leerDatosDeLaPersona } = require('./datosDeLaPersona') as typeof import('./datosDeLaPersona');
    void leerDatosDeLaPersona(cuentaId).catch(() => undefined);
  }
  /* eslint-enable @typescript-eslint/no-require-imports */
}

/** Cuánto se espera, desde que se ve la fila, para no competir con el cambio de pestaña. */
export const ESPERA_ANTES_DE_PREPARAR_MS = 500;

/**
 * Para la fila que ofrece correr: al montarse, y cuando la pantalla terminó de animar, adelanta lo de la carrera.
 * `activo` en falso (con una carrera en curso) no hace nada.
 */
export function usePrepararLaCarrera(activo = true): void {
  useEffect(() => {
    if (!activo || Platform.OS !== 'android') return;
    const id = setTimeout(prepararLaCarreraDeAntemano, ESPERA_ANTES_DE_PREPARAR_MS);
    return () => clearTimeout(id);
  }, [activo]);
}

export function reiniciarCalentamientoParaPruebas(): void {
  cuentaDeLaSesion = null;
  quiereCalentar = false;
  calentado = false;
  avisar();
}
