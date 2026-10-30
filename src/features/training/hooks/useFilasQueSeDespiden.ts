import { useEffect, useState } from 'react';

import { alCumplirUnHabito } from '../../habits/eventos/habitoCumplido';
import { MOMENTO_MS } from '../../habits/celebracion/momentoDelHabito';

/**
 * Cuánto se queda una fila recién cumplida en su lugar antes de irse: lo que tarda el check en llenarse y subir su «+N»
 * (`MOMENTO_MS.puntos`), más la espera de una hoja que se cierra (`esperaHoja`) y un respiro. Si se fuera de golpe, la
 * persona cumpliría el hábito y no vería nada: lo que pidió el dueño el 2026-10-07 («no veo nada») sigue valiendo.
 */
export const DEMORA_DE_LA_SALIDA_MS = MOMENTO_MS.esperaHoja + MOMENTO_MS.puntos + 160;

/**
 * Las filas que se acaban de cumplir y todavía se despiden (spec 014). Se enteran por el aviso `habitoCumplido` —el
 * mismo que usan el fénix y las celebraciones—, que emite `completarRegistro` cuando el servidor confirma; no se
 * cambia cómo se emite. Lo que se cierra por otro camino (la Pastilla, la Clase) no tiene check que animar y sale
 * en el acto.
 */
export function useFilasQueSeDespiden(): ReadonlySet<string> {
  const [retenidos, setRetenidos] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const temporizadores = new Set<ReturnType<typeof setTimeout>>();
    const dejarDeEscuchar = alCumplirUnHabito(({ registroId }) => {
      setRetenidos(previos => new Set(previos).add(registroId));
      const temporizador = setTimeout(() => {
        temporizadores.delete(temporizador);
        setRetenidos(previos => {
          const siguientes = new Set(previos);
          siguientes.delete(registroId);
          return siguientes;
        });
      }, DEMORA_DE_LA_SALIDA_MS);
      temporizadores.add(temporizador);
    });
    return () => {
      dejarDeEscuchar();
      temporizadores.forEach(clearTimeout);
    };
  }, []);

  return retenidos;
}
