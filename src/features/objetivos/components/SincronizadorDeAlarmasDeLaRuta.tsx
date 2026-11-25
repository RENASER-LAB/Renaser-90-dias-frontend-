import { useAlarmasAlDiaConLasAcciones } from '../hooks/useAlarmasAlDiaConLasAcciones';
import type { RocaDiariaApi } from '../types/objetivos.types';

/** No dibuja nada: mantiene al día las alarmas de las acciones mientras la fila «Recordatorios de tus acciones» no está montada (spec 058). */
export function SincronizadorDeAlarmasDeLaRuta({ userId, rocas }: { userId: string; rocas?: RocaDiariaApi[] }) {
  useAlarmasAlDiaConLasAcciones(userId, rocas);
  return null;
}
