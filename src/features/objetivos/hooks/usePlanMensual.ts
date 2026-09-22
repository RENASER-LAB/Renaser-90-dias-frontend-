import { useCallback, useEffect, useMemo, useState } from 'react';

import { mensajeDeError } from '../../../services/http/apiClient';
import * as planMensualApi from '../api/planMensualApi';
import type { MesDelPlan, PlanMensualDelEje } from '../api/planMensualApi';
import type { EjeObjetivo } from '../types/objetivos.types';

/**
 * El plan mensual de los tres ejes, traído del servidor y editable.
 *
 * Reemplaza al cálculo que hacía la app (`cifraDelMesDeLaRoca`). El porqué está en la cabecera de
 * `api/planMensualApi.ts`: había dos fórmulas para la misma pregunta, y la app no podía resolverla
 * bien sola porque le faltaba saber **qué** se mide en cada eje.
 *
 * Un fallo al recargar NO vacía lo que ya se había traído: mejor el dato viejo con un aviso que una
 * tarjeta en blanco. Mismo criterio que `useRocasMaestras`.
 */
export function usePlanMensual() {
  const [planes, setPlanes] = useState<PlanMensualDelEje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setPlanes(await planMensualApi.obtenerPlanMensual());
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar tu objetivo de este mes.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const porEje = useMemo(() => {
    const mapa = new Map<EjeObjetivo, PlanMensualDelEje>();
    for (const plan of planes) mapa.set(plan.eje as EjeObjetivo, plan);
    return mapa;
  }, [planes]);

  /** El mes que la persona está transitando en ese eje, que es el que muestra la tarjeta. */
  const mesEnCursoDe = useCallback(
    (eje: EjeObjetivo): MesDelPlan | null =>
      porEje.get(eje)?.meses.find(m => m.enCurso) ?? null,
    [porEje]
  );

  /**
   * Corrige a mano el objetivo de un mes. Desde que se guarda, **manda sobre el cálculo**.
   *
   * Recarga el plan entero en vez de parchear en memoria, y a propósito: tocar un mes puede cambiar
   * lo que el servidor propone para los siguientes, así que quedarse con la respuesta de un solo
   * mes dejaría los otros dos mostrando números viejos.
   */
  const guardarMes = useCallback(
    async (eje: EjeObjetivo, numeroMes: number, cambio: { titulo: string; cifra: number | null; unidad: string }) => {
      setGuardando(true);
      try {
        await planMensualApi.guardarObjetivoDelMes(eje, numeroMes, aCuerpo(cambio));
        await cargar();
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, mensaje: mensajeDeError(e, 'No pudimos guardar el objetivo del mes.') };
      } finally {
        setGuardando(false);
      }
    },
    [cargar]
  );

  return { planes, porEje, mesEnCursoDe, cargando, error, guardando, guardarMes, recargar: cargar };
}

/**
 * `meta`, `avance` y `unidad` viajan los tres o ninguno — media meta da 400 en el servidor.
 *
 * `avance` arranca igual que la meta y no en cero: este tramo no lleva barra de progreso propia
 * (la que se dibuja es la de la Roca Maestra), y mandar cero en un objetivo que baja haría que el
 * servidor lo leyera como "ya retrocedió hasta el fondo".
 */
function aCuerpo(cambio: { titulo: string; cifra: number | null; unidad: string }) {
  const unidad = cambio.unidad.trim();
  if (cambio.cifra === null || !unidad) {
    return { titulo: cambio.titulo };
  }
  return { titulo: cambio.titulo, meta: cambio.cifra, avance: cambio.cifra, unidad };
}
