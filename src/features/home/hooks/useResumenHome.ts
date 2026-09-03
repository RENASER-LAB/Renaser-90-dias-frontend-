import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerResumenHome } from '../api/homeApi';
import type { ResumenHomeApi } from '../types/home.types';

export const DIAS_DEL_PROGRAMA = 90;

/** Rotulos en espanol de las fases. Los cortes por dia los decide el backend, no la app. */
const ROTULO_FASE: Record<string, string> = {
  PHASE_1_REBIRTH: 'Renacer',
  PHASE_2_DEVELOPMENT: 'Desarrollo',
  PHASE_3_ALCHEMIST_WARRIOR: 'Guerrero Alquimista',
  PHASE_4_ASCENSION: 'Ascensión',
};

/** Una fase que esta app todavia no conoce no rompe nada: se muestra el dia sin rotulo. */
export function rotuloDeFase(fase: string | null | undefined): string | null {
  if (!fase) return null;
  return ROTULO_FASE[fase] ?? null;
}

export type EstadoResumenHome = {
  resumen: ResumenHomeApi | null;
  cargando: boolean;
  /** Texto listo para mostrar. `null` cuando la ultima carga salio bien. */
  error: string | null;
  recargar: () => Promise<void>;
  /** El programa arranco de verdad: hay inscripcion y el reloj ya corre. */
  programaEnMarcha: boolean;
};

/**
 * El resumen del dia para la pantalla de Inicio.
 *
 * Se recarga cada vez que la pestana vuelve al foco: alguien que completa un habito en Plan y
 * vuelve a Hoy tiene que ver el contador actualizado, no el de hace diez minutos.
 *
 * A diferencia de `useProgramaDia`, un fallo NO se traga en silencio. Tragarlo es lo que hacia
 * que la pantalla mostrara datos inventados o vacios sin que nadie se enterara; aca el error se
 * expone para que la pantalla ofrezca reintentar.
 */
export function useResumenHome(): EstadoResumenHome {
  const [resumen, setResumen] = useState<ResumenHomeApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setResumen(await obtenerResumenHome());
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos cargar tu día. Revisá tu conexión.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  return {
    resumen,
    cargando,
    error,
    recargar,
    programaEnMarcha: Boolean(resumen?.inscrito) && (resumen?.diaPrograma ?? 0) > 0,
  };
}
