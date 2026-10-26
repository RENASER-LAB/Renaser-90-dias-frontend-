import React from 'react';

import { useFuncionalidad } from '../estado/useFuncionalidad';

/**
 * Dibuja lo de adentro solo si la funcionalidad le corresponde a esta sesión (fase 2 de la spec 002, decisión P1 del
 * dueño): lo que está en despliegue y todavía no le tocó, o lo que su rol personalizado no tiene, **no se dibuja**. No
 * es el aviso de mantenimiento (eso es lo apagado): acá no hay nada que avisar, la persona no lo tiene.
 *
 *     <SiEstaDisponible clave={CLAVES.caja}><FilaDeAjuste … /></SiEstaDisponible>
 */
export function SiEstaDisponible({ clave, children }: { clave: string | null | undefined; children: React.ReactNode }) {
  const { disponible } = useFuncionalidad(clave);
  return disponible ? <>{children}</> : null;
}
