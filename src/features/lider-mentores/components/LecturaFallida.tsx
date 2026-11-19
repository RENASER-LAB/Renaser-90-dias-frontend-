import React from 'react';

import type { FalloSemaforo } from '../../semaforo/hooks/useMiSemaforo';
import { FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { Linea } from './MarcoDelLider';

/**
 * Por qué no cargó una lectura del líder (spec 056 FR-042). Como `FalloDeLectura`, pero con un 403 dice el motivo que mandó el servidor («Ese grupo no es de
 * tus formaciones») en lugar de un texto genérico: quien no corresponde recibe una negativa con su motivo y la app la muestra.
 */
export function LecturaFallida({ fallo, detalle, que, onReintentar }: { fallo: FalloSemaforo; detalle?: string | null; que: string; onReintentar: () => void }) {
  if (fallo === 'sin_permiso' && detalle && detalle.trim() !== '' && detalle !== 'No se pudo cargar.') return <Linea>{detalle}</Linea>;
  return <FalloDeLectura fallo={fallo} detalle={detalle} que={que} onReintentar={onReintentar} />;
}
