import { useEffect, useMemo, useRef } from 'react';

import { evaluarFuncionalidad, type EstadoDeUnaFuncionalidad } from './evaluacion';
import { useEstadoDeFuncionalidades } from './FuncionalidadesProvider';

/**
 * ¿Está prendida esta funcionalidad para la sesión? (spec 002, contrato §8). `aviso` es el texto que escribió Soporte
 * TI, o `null` (el aviso muestra el genérico). Sin clave —una sección que no tiene interruptor— está prendida.
 *
 *     const muro = useFuncionalidad('muro');
 *     if (!muro.prendida) return <AvisoDeMantenimiento aviso={muro.aviso} />;
 */
export function useFuncionalidad(clave: string | null | undefined): EstadoDeUnaFuncionalidad {
  const { apagadas } = useEstadoDeFuncionalidades();
  const { prendida, aviso } = evaluarFuncionalidad(apagadas, clave);
  return useMemo(() => ({ prendida, aviso }), [prendida, aviso]);
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
