import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { alCumplirUnHabito } from '../../habits/eventos/habitoCumplido';
import { obtenerMiSemaforo } from '../api/semaforoApi';
import type { ColorSemaforo } from '../types/semaforo.types';
import { crearAlmacenDelSemaforoVigente, type AlmacenDelSemaforoVigente } from './semaforoVigente';

/**
 * Los roles que tienen semáforo propio (D-168: se mide al aprendiz). Administración, alquimista, mentor y líder de
 * mentores no: para ellos el fénix del botón de SER queda neutral y este almacén no pide nada. Los roles llegan en
 * dos idiomas (ver `esLiderDeMentores`); un rol desconocido o ausente cuenta como «sin semáforo»: ante la duda, sin
 * petición.
 */
const ROLES_CON_SEMAFORO_PROPIO = ['TRAINEE', 'APRENDIZ'] as const;

export function tieneSemaforoPropio(rol: string | null | undefined): boolean {
  const clave = rol?.toUpperCase();
  return Boolean(clave && (ROLES_CON_SEMAFORO_PROPIO as readonly string[]).includes(clave));
}

/** Una semana alcanza: solo se usa el color de la ventana vigente, que no depende de cuántas semanas se pidan. */
async function leerColorVigente(): Promise<ColorSemaforo | null> {
  const detalle = await obtenerMiSemaforo(1);
  return detalle.aplica && detalle.vigente ? detalle.vigente.color : null;
}

/** La única instancia de la app. */
export const semaforoVigente: AlmacenDelSemaforoVigente = crearAlmacenDelSemaforoVigente(leerColorVigente);

/** El color vigente (o `null`): se vuelve a dibujar solo cuando cambia. */
export function useColorDelSemaforoVigente(almacen: AlmacenDelSemaforoVigente = semaforoVigente): ColorSemaforo | null {
  return useSyncExternalStore(almacen.suscribir, almacen.color, almacen.color);
}

/**
 * Mantiene el almacén al día mientras la app está abierta. Se monta UNA vez (en `RenasiaLauncher`, que vive sobre todas
 * las pantallas): habilita las lecturas según el rol, escucha la vuelta al frente y el aviso de hábito cumplido, y
 * olvida el color al cambiar de cuenta.
 */
export function useMantenerSemaforoVigente(
  rol: string | null | undefined,
  usuarioId: string | null | undefined,
  almacen: AlmacenDelSemaforoVigente = semaforoVigente,
): void {
  // Cualquier cuenta con sesión: el personal que hace su programa personal también tiene semáforo (E-576). Quien no
  // tiene recibe `aplica: false` o un error y queda en neutral.
  const habilitado = Boolean(usuarioId);

  useEffect(() => {
    almacen.reiniciar();
  }, [almacen, usuarioId]);

  useEffect(() => {
    almacen.habilitar(habilitado);
    if (!habilitado) return;
    const frente = AppState.addEventListener('change', estado => {
      if (estado === 'active') void almacen.alVolverAlFrente();
    });
    const sinHabito = alCumplirUnHabito(() => void almacen.trasCumplirUnHabito());
    return () => {
      frente.remove();
      sinHabito();
      almacen.habilitar(false);
    };
  }, [almacen, habilitado]);
}

/**
 * Hoy le pasa al almacén lo que YA leyó: el `semaforo` de `/home` y, si se pidió, el `vigente` de `/me/semaforo`. Así la
 * tarjeta de Hoy y el botón de SER muestran el mismo color sin una petición más. Mientras `/home` no llegó (o falló) no
 * se publica nada: se queda el último color conocido.
 */
export function usePublicarSemaforoDeHoy(
  semaforoDeHome: { color: ColorSemaforo } | null | undefined,
  homeCargado: boolean,
  detalle: { aplica: boolean; vigente: { color: ColorSemaforo } | null } | null,
  almacen: AlmacenDelSemaforoVigente = semaforoVigente,
): void {
  const colorDeHome = semaforoDeHome?.color ?? null;
  useEffect(() => {
    if (homeCargado) almacen.publicar(colorDeHome);
  }, [almacen, homeCargado, colorDeHome]);

  const colorDelDetalle = detalle ? (detalle.aplica ? detalle.vigente?.color ?? null : null) : undefined;
  useEffect(() => {
    if (colorDelDetalle !== undefined) almacen.publicar(colorDelDetalle);
  }, [almacen, colorDelDetalle]);
}
