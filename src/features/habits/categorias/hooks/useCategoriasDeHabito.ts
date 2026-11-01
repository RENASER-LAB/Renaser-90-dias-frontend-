import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { useAuth } from '../../../auth/context/AuthContext';
import { useFormacionDeLaSesion } from '../../../formaciones/context/FormacionContext';
import { codigoActivo } from '../../../formaciones/utils/vistaDeFormacion';
import { leerCategoriasDeMiFormacion } from '../api/categoriasApi';
import {
  empezarLecturaDeCategorias,
  ESTADO_SIN_LECTURA,
  leerEstadoDeCategorias,
  reiniciarEstadoDeCategorias,
  suscribirEstadoDeCategorias,
  terminarLecturaDeCategorias,
  type EstadoDeCategorias,
} from '../estado/estadoDeCategorias';

/**
 * Las categorías de hábito de la formación de la sesión (spec 023). UNA lectura por cuenta y formación, compartida por todos los que
 * llaman a este hook: el primero que llega la pide y los demás se enteran por el almacén (`estadoDeCategorias`). Cambiar de cuenta o de
 * formación activa empieza una lectura nueva sin dejar a la vista nada de la anterior.
 *
 * Sin respuesta (404 de un backend anterior, sin red) valen las cuatro de la Escuela y la pantalla sigue; un fallo de red no se guarda como
 * definitivo: `recargar` o la próxima vez que se monte lo vuelve a pedir.
 */

/** La lectura en vuelo, por clave: dos pantallas que se montan juntas comparten el pedido. */
let enVuelo: { clave: string; promesa: Promise<void> } | null = null;

async function leer(clave: string): Promise<void> {
  try {
    const lectura = await leerCategoriasDeMiFormacion();
    terminarLecturaDeCategorias(clave, lectura);
  } catch {
    terminarLecturaDeCategorias(clave, null);
    reintentable = clave;
  }
}

/** La clave cuya lectura falló por red: la siguiente llamada la vuelve a pedir. */
let reintentable: string | null = null;

function asegurarLectura(clave: string, forzar = false): void {
  const estado = leerEstadoDeCategorias();
  if (!forzar && estado.clave === clave && reintentable !== clave && (estado.listo || enVuelo?.clave === clave)) return;
  if (enVuelo?.clave === clave && !forzar) return;
  reintentable = null;
  empezarLecturaDeCategorias(clave);
  const promesa = leer(clave).finally(() => {
    if (enVuelo?.promesa === promesa) enVuelo = null;
  });
  enVuelo = { clave, promesa };
}

export type CategoriasDeHabito = EstadoDeCategorias & { recargar: () => void };

export function useCategoriasDeHabito(): CategoriasDeHabito {
  const { user, isAuthenticated } = useAuth();
  const { formacion } = useFormacionDeLaSesion();
  const cuenta = isAuthenticated && user ? user.id : null;
  const clave = cuenta ? `${cuenta}|${codigoActivo(formacion) ?? ''}` : null;
  const estado = useSyncExternalStore(suscribirEstadoDeCategorias, leerEstadoDeCategorias, leerEstadoDeCategorias);

  useEffect(() => {
    if (clave) asegurarLectura(clave);
    else if (leerEstadoDeCategorias().clave !== null) reiniciarEstadoDeCategorias();
  }, [clave]);

  const recargar = useCallback(() => {
    if (clave) asegurarLectura(clave, true);
  }, [clave]);

  /* Entre el render y el efecto el almacén puede ser de OTRA cuenta o formación: no se entregan sus categorías ni por un cuadro. */
  const esDeEstaLectura = estado.clave === clave;
  return useMemo(
    () => ({ ...(esDeEstaLectura ? estado : ESTADO_SIN_LECTURA), recargar }),
    [esDeEstaLectura, estado, recargar],
  );
}

/** Solo para las pruebas: olvida lecturas en vuelo. */
export function olvidarLecturasDeCategorias(): void {
  enVuelo = null;
  reintentable = null;
  reiniciarEstadoDeCategorias();
}
