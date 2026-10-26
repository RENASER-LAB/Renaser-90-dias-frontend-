import { useCallback, useEffect, useMemo, useRef } from 'react';

import { evaluarDisponibilidad, evaluarFuncionalidad, type FuncionalidadDeLaSesion } from './evaluacion';
import { useEstadoDeFuncionalidades } from './contexto';

/**
 * ¿Está prendida esta funcionalidad para la sesión? (spec 002, contrato §8). `aviso` es el texto que escribió Soporte
 * TI, o `null` (el aviso muestra el genérico). Sin clave —una sección que no tiene interruptor— está prendida.
 *
 * `disponible` (fase 2, decisión P1 del dueño): `false` si a esta sesión todavía no le toca (un despliegue en el que no
 * entró, o algo que su rol personalizado no tiene). Ahí la entrada **no se dibuja**; el aviso de mantenimiento es
 * solo para lo apagado.
 *
 *     const muro = useFuncionalidad('muro');
 *     if (!muro.disponible) return null;
 *     if (!muro.prendida) return <AvisoDeMantenimiento aviso={muro.aviso} />;
 */
export function useFuncionalidad(clave: string | null | undefined): FuncionalidadDeLaSesion {
  const { apagadas, noDisponibles } = useEstadoDeFuncionalidades();
  const { prendida, aviso } = evaluarFuncionalidad(apagadas, clave);
  const disponible = evaluarDisponibilidad(noDisponibles, clave);
  return useMemo(() => ({ prendida, aviso, disponible }), [prendida, aviso, disponible]);
}

/**
 * Para preguntar por varias claves a la vez (la fila de medallones, una lista de filas): devuelve una función que dice
 * si cada clave le corresponde a esta sesión. Cambia solo cuando cambia lo no disponible.
 */
export function useDisponibilidad(): (clave: string | null | undefined) => boolean {
  const { noDisponibles } = useEstadoDeFuncionalidades();
  return useCallback((clave: string | null | undefined) => evaluarDisponibilidad(noDisponibles, clave), [noDisponibles]);
}

/**
 * Llama a `alPrenderse` cuando una funcionalidad que estaba apagada vuelve a prenderse: la pantalla que tenía el aviso
 * vuelve a pedir sus datos (lo que pidió mientras estaba apagada quedó en error). No se llama al montar.
 */
export function useAlVolverAPrenderse(clave: string | null | undefined, alPrenderse: () => void): void {
  const { prendida } = useFuncionalidad(clave);
  const antes = useRef({ clave, prendida });
  const llamar = useRef(alPrenderse);
  llamar.current = alPrenderse;
  useEffect(() => {
    // Cambiar de clave (otra sección) no es «volver a prenderse».
    if (prendida && !antes.current.prendida && antes.current.clave === clave) llamar.current();
    antes.current = { clave, prendida };
  }, [prendida, clave]);
}

/**
 * Llama a `alDejarDeEstar` cuando una funcionalidad que se estaba usando deja de estar disponible para esta sesión
 * (fase 2): la pantalla que la tenía abierta vuelve atrás, sin diálogo. No se llama al montar ni por cambiar de clave.
 */
export function useAlDejarDeEstarDisponible(clave: string | null | undefined, alDejarDeEstar: () => void): void {
  const { disponible } = useFuncionalidad(clave);
  const antes = useRef({ clave, disponible });
  const llamar = useRef(alDejarDeEstar);
  llamar.current = alDejarDeEstar;
  useEffect(() => {
    if (!disponible && antes.current.disponible && antes.current.clave === clave) llamar.current();
    antes.current = { clave, disponible };
  }, [disponible, clave]);
}
