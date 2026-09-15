import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { mensajeDeError } from '../../../services/http/apiClient';
import { obtenerResumenHome } from '../api/homeApi';
import type { ResumenHomeApi } from '../types/home.types';

export const DIAS_DEL_PROGRAMA = 90;

/**
 * Las fases del programa, tal como las define el backend.
 *
 * **Son CUATRO, y este archivo es la ÚNICA definición de fase de la app.** Cada una tiene su
 * contrato firmado (`contratos_fase`, modulo `phasecontracts`: Fase I dia 1, Fase II dia 8 con
 * firma el 17, Fase III dia 35, Fase IV dia 65), asi que no son una etiqueta decorativa: hay
 * datos atados.
 *
 * Los cortes por dia los decide el backend (`users.api.FasePrograma`); acá solo se rotulan. El
 * rango se repite para poder mostrarlo, y si el backend moviera un corte habria que actualizarlo —
 * por eso es lo unico que se copia, y no la logica de en que fase cae cada dia.
 *
 * ## Los nombres salen del documento del cliente, y son SOLO texto
 *
 * `RENASER, PROGRAMA Y FASES.docx` §"ESTRUCTURA POR FASES": El Espejo (1–7), El Ciclo Alquímico
 * (8–34), El Maestro Interno (35–64), Sistema de Alto Rendimiento (65–90). Los rangos del
 * documento **coinciden exactamente** con los cortes que ya usaba el backend, así que renombrar
 * no movió una sola regla.
 *
 * > ⚠️ **Nunca tocar las CLAVES** (`PHASE_1_REBIRTH`…): son las que viajan por el cable en
 * > `GET /api/v1/home`. Si una clave cambia acá y el backend sigue mandando la vieja,
 * > `descripcionDeFase` devuelve `null` y la tarjeta de fase **deja de dibujarse en silencio** —
 * > no se cae, simplemente desaparece. Los rótulos son texto; las claves son contrato.
 */
export interface FaseDelPrograma {
  numero: number;
  nombre: string;
  rango: string;
}

/** Las claves del backend, en orden de programa. Sirve para recorrer las fases sin repetir la lista. */
export const CLAVES_DE_FASE = [
  'PHASE_1_REBIRTH',
  'PHASE_2_DEVELOPMENT',
  'PHASE_3_ALCHEMIST_WARRIOR',
  'PHASE_4_ASCENSION',
] as const;

export type ClaveDeFase = (typeof CLAVES_DE_FASE)[number];

const FASES_DEL_PROGRAMA: Record<ClaveDeFase, FaseDelPrograma> = {
  PHASE_1_REBIRTH: { numero: 1, nombre: 'El Espejo', rango: 'Días 1–7' },
  PHASE_2_DEVELOPMENT: { numero: 2, nombre: 'El Ciclo Alquímico', rango: 'Días 8–34' },
  PHASE_3_ALCHEMIST_WARRIOR: { numero: 3, nombre: 'El Maestro Interno', rango: 'Días 35–64' },
  PHASE_4_ASCENSION: { numero: 4, nombre: 'Sistema de Alto Rendimiento', rango: 'Días 65–90' },
};

/**
 * Las cuatro fases en orden, con su clave.
 *
 * **Existe para que no haya una segunda lista de fases en ninguna pantalla.** `YoScreen` tenía la
 * suya —con otros nombres y sólo tres fases— y por eso divergió de Plan durante meses: eran dos
 * listas independientes que nadie obligaba a coincidir. Cualquier pantalla que necesite recorrer
 * las fases lee de acá.
 */
export const FASES_EN_ORDEN: ReadonlyArray<FaseDelPrograma & { clave: ClaveDeFase }> =
  CLAVES_DE_FASE.map(clave => ({ clave, ...FASES_DEL_PROGRAMA[clave] }));

/** Una fase que esta app todavia no conoce no rompe nada: se muestra el dia sin rotulo. */
export function rotuloDeFase(fase: string | null | undefined): string | null {
  return descripcionDeFase(fase)?.nombre ?? null;
}

/**
 * La fase completa —numero, nombre y rango— para mostrarla entera.
 *
 * Devuelve `null` mientras el backend no haya contestado, y tambien ante una fase desconocida: es
 * preferible no dibujar el rotulo que dibujar uno inventado.
 */
export function descripcionDeFase(fase: string | null | undefined): FaseDelPrograma | null {
  if (!fase) return null;
  return FASES_DEL_PROGRAMA[fase as ClaveDeFase] ?? null;
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
      setError(mensajeDeError(e, 'No pudimos cargar tu día. Revisa tu conexión.'));
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
