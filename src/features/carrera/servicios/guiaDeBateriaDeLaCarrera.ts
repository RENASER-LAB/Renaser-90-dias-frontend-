import { AppState, Platform } from 'react-native';

import { lineaDeLaGuia } from '../../alarmas/data/guiasPorMarca';
import { marcaDelTelefono, type MarcaDelTelefono } from '../../alarmas/utils/marcaDelTelefono';
import { almacen } from './almacenamiento';

/**
 * La guía de batería antes de la primera carrera con GPS (spec 042, 2026-11-07).
 *
 * Honor, Huawei, Xiaomi/Redmi/POCO, Oppo/Realme/OnePlus, Vivo/iQOO y Samsung cierran del todo una app que se quita de recientes, y la
 * carrera se pausa; con Renaser en «Sin restricciones» sigue. Se ofrece UNA vez por cuenta en este teléfono, solo en Android y solo en
 * esas marcas (las mismas de `guiasPorMarca`: `marcaDelTelefono` es la única lista). Un fallo del almacenamiento cuenta como «no
 * mostrar»: nunca se estorba una carrera por esto.
 */
export const TITULO_DE_LA_GUIA_DE_LA_CARRERA = 'Para que tu carrera siga con la app cerrada';

export function claveDeLaGuiaDeBateria(cuentaId: string): string {
  return `renaser.carrera.guiaBateria.${cuentaId}`;
}

/** La marca pide la guía si no es `otra` (Pixel, Motorola, etc. no cierran la app al quitarla de recientes). */
export function marcaPideLaGuia(marca: MarcaDelTelefono): boolean {
  return marca !== 'otra';
}

/**
 * ¿Hay que mostrar la guía ahora? Si sí, la deja anotada como mostrada (una sola vez) y devuelve la línea de la marca.
 * Devuelve `null` si no corresponde o si el almacenamiento falla.
 */
export async function guiaDeBateriaPendiente(
  cuentaId: string,
  marca: MarcaDelTelefono = marcaDelTelefono(),
  sistema: string = Platform.OS,
): Promise<string | null> {
  if (sistema !== 'android' || !marcaPideLaGuia(marca)) return null;
  try {
    const a = almacen();
    const clave = claveDeLaGuiaDeBateria(cuentaId);
    if ((await a.getItem(clave)) != null) return null;
    await a.setItem(clave, '1');
    return lineaDeLaGuia(marca);
  } catch {
    return null;
  }
}

/**
 * Espera a que la persona vuelva a la app después de abrir los ajustes. Si la app no llegó a irse a segundo plano (no se abrió nada),
 * sigue pasado un momento para no dejar la carrera colgada.
 */
export function esperarElRegreso(esperaMaximaSinSalirMs = 1500): Promise<void> {
  return new Promise(resolve => {
    let salio = false;
    let listo = false;
    const terminar = () => {
      if (listo) return;
      listo = true;
      clearTimeout(timer);
      sub.remove();
      resolve();
    };
    const sub = AppState.addEventListener('change', estado => {
      if (estado !== 'active') salio = true;
      else if (salio) terminar();
    });
    const timer = setTimeout(() => {
      if (!salio) terminar();
    }, esperaMaximaSinSalirMs);
  });
}
