import { useMemo } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useCapacidades } from '../../admin/hooks/useCapacidades';
import { useEsMentor } from '../../mentor/hooks/useEsMentor';
import { useProgramaPersonal } from '../../mentor/hooks/useProgramaPersonal';
import { plazoDelObjetivo } from '../../objetivos/utils/nombreDelObjetivo';
import { entradaAlProgramaPropio } from '../utils/entradaAlProgramaPropio';
import { vistaDeLaFilaDelPrograma, type VistaDeLaFilaDelPrograma } from '../utils/filaDelPrograma';
import { useDiaUnoPorElegir } from './useDiaUnoPorElegir';

/**
 * Todo lo que necesita la fila compacta del programa propio, en un solo hook para Hoy y para Plan (2026-11-01): quién puede tener un
 * programa opcional, si ya eligió su Día 1, y qué dice la fila (`vistaDeLaFilaDelPrograma`, pura).
 *
 * Es lo que `EntradaAlProgramaPropio` hacía dentro de Hoy, sacado a un hook para que Hoy sepa —antes de dibujar— si hay fila: un
 * bloque vacío igual deja sus dos separaciones de 28 y eso era el hueco grande entre la frase y el fénix.
 *
 * Ningún pedido nuevo: las mismas lecturas que ya hacía la tarjeta (`capacidades`, `programa personal`, y `activate-program` solo si
 * está inscrito y en el día 0).
 */
export function useFilaDelProgramaPropio({
  inscrito,
  diaPrograma,
  duracionDias,
  formacion,
}: {
  /** Del resumen de `/home`. */
  inscrito: boolean | undefined;
  diaPrograma: number | undefined;
  duracionDias?: number | null;
  formacion?: string | null;
}) {
  const { user } = useAuth();
  const usuarioId = user?.id ?? null;
  const esMentor = useEsMentor();
  /* Quien puede tener un programa propio opcional lo dice el SERVIDOR (`canStartProgram`), no el rol leído en el teléfono; el mentor, el
     administrador y el alquimista incluidos (ARF-16). El aprendiz no lo tiene: para él no hay nada que ofrecer. */
  const { capacidades, error: errorCapacidades, recargar: recargarCapacidades } = useCapacidades();
  const activo = esMentor || capacidades.administrar || capacidades.puedeIniciarPrograma;
  const programa = useProgramaPersonal(activo, usuarioId);
  const diaUno = useDiaUnoPorElegir(inscrito, diaPrograma, usuarioId);

  const entrada = entradaAlProgramaPropio({ diaUnoPorElegir: diaUno.porElegir, puedeEmpezar: programa.visible });
  const plazo = plazoDelObjetivo(duracionDias, formacion);
  const vista: VistaDeLaFilaDelPrograma | null = useMemo(
    () => vistaDeLaFilaDelPrograma({ entrada, plazo }),
    [entrada, plazo],
  );

  /* No saber no equivale a no tener nada que elegir: si falló alguna lectura se avisa y se ofrece reintentar. Quien tiene la fila sin Día 1
     (`ELEGIR_DIA_UNO`) ya sabe lo que le toca: eso manda sobre un fallo de las otras lecturas, como en la tarjeta de siempre. */
  const hayError = entrada !== 'ELEGIR_DIA_UNO' && (diaUno.error || programa.error || errorCapacidades);
  const reintentar = () => {
    diaUno.reintentar();
    programa.recargar();
    void recargarCapacidades();
  };
  const alElegirDiaUno = () => {
    programa.alEmpezar();
    diaUno.alElegir();
  };

  return {
    vista,
    error: hayError ? { mensaje: diaUno.mensaje, reintentar } : null,
    /** Algo que dibujar: la fila o el aviso de que no se pudo comprobar. */
    visible: Boolean(vista) || hayError,
    alElegirDiaUno,
    /** «Ahora no»: deja de ofrecer la invitación a ESTA cuenta en este teléfono. No borra nada. */
    posponer: programa.posponer,
    /** Para el pull-to-refresh de Hoy. */
    recargarCapacidades,
  };
}
