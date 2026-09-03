import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '../../../services/http/apiClient';

/**
 * El día de programa real del aprendiz (1 a 90) y su fase, desde `GET /api/v1/home`.
 *
 * Antes esto estaba escrito a mano en `PlanScreen` — el número, el arco del medidor y la fase.
 * Mostraba "DÍA 37" a cualquiera, incluso a alguien que todavía no activó su programa (día 0).
 *
 * `diaPrograma` en 0 es un estado legítimo y esperado: significa que el aprendiz eligió su fecha
 * de inicio pero el programa todavía no arrancó (ver `POST /api/v1/onboarding/activate-program`).
 */

export const DIAS_DEL_PROGRAMA = 90;

type EstadoPrograma = {
  diaPrograma: number;
  fase: string | null;
  inscrito: boolean;
};

export function useProgramaDia() {
  const [estado, setEstado] = useState<EstadoPrograma>({ diaPrograma: 0, fase: null, inscrito: false });
  const [loading, setLoading] = useState(true);

  const recargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ diaPrograma?: number; fase?: string; inscrito?: boolean }>('/api/v1/home');
      setEstado({
        diaPrograma: typeof r?.diaPrograma === 'number' ? r.diaPrograma : 0,
        fase: r?.fase ?? null,
        inscrito: Boolean(r?.inscrito),
      });
    } catch {
      // Sin datos se deja el día en 0: es el estado "todavía no arrancó", que la pantalla ya sabe
      // representar. Nunca inventar un día para que el medidor se vea lleno.
      setEstado({ diaPrograma: 0, fase: null, inscrito: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { ...estado, loading, recargar };
}

/**
 * Punto del arco del medidor para un día dado. El SVG del diseño es una semicircunferencia de
 * radio 100 centrada en (114, 108): el día 1 cae a la izquierda y el 90 a la derecha.
 * Devuelve además el `path` del tramo recorrido, para no tener que dibujarlo a mano.
 */
export function puntoDelMedidor(diaPrograma: number): { x: number; y: number; path: string } {
  const avance = Math.min(Math.max(diaPrograma / DIAS_DEL_PROGRAMA, 0), 1);
  const angulo = Math.PI - avance * Math.PI;
  const x = 114 + 100 * Math.cos(angulo);
  const y = 108 - 100 * Math.sin(angulo);
  // `large-arc` queda en 0 siempre: el recorrido nunca supera media vuelta.
  const path = `M14 108A100 100 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
  return { x, y, path };
}
