import { useEffect, useState } from 'react';

import type { EjeObjetivo } from '../../objetivos/types/objetivos.types';
import { cifraDelMes, notaDelMes } from '../../objetivos/utils/objetivoMensual';
import { almacenMapa } from '../almacen';
import { formatoDelObjetivo, objetivoMensualDelMapa } from '../reglas';
import { areaDelEje, objetivoDe } from '../tipos';

/** Lo que la pantalla necesita pintar, ya resuelto: una cifra opcional y una línea que siempre está. */
export interface CifraDelMes {
  /** `"79.7 kg"`, `"S/ 10 000 mensuales"`. `null` cuando este objetivo no admite cifra. */
  cifra: string | null;
  /** Siempre hay: cuando no hay cifra, explica por qué. */
  nota: string;
}

/**
 * La cifra de ESTE MES para el eje abierto en Plan: dónde hay que estar al cierre del mes.
 *
 * ── Por qué existe este hook y no se calcula en la pantalla ──
 *
 * El cálculo ({@code objetivoMensualDelMapa}) necesita el `Objetivo` del **Mapa de Renacimiento**,
 * que es el único que sabe el `area` y el `tipoResultado`. `PlanScreen` trabaja con Rocas Maestras
 * (`meta`, `avance`, `lineaBase`, `unidad`), y con eso NO alcanza: es justamente `area === 'salud'`
 * + `tipoResultado === 'peso'` lo que activa el tope del 4 % por mes. Sin ese tope, un objetivo de
 * peso arrastrado dos meses mostraría "baja 20 kg este mes", que es el número que el dueño pidió
 * expresamente que no se muestre. Deducirlo de `unidad === 'kg'` era adivinar; leer el Mapa es
 * saber.
 *
 * ── Por qué el almacén local y no el servidor ──
 *
 * El Mapa vive en AsyncStorage (`almacenMapa`): es donde lo escribe el flujo que lo arma. El
 * servidor solo guarda que está completo (`stageCompleted`), no los objetivos con su forma. Mismo
 * criterio que {@code useEstadoMapa}, que también lee el almacén primero.
 *
 * ── Qué devuelve ──
 *
 * `null` mientras carga, si no hay usuario, si no hay Mapa todavía, o si el día del programa aún no
 * se conoce. Un `null` acá significa "no hay nada que mostrar", y la pantalla no pinta la fila —
 * nunca un cero ni un "—" inventado. Cuando sí hay Mapa, devuelve el resultado tal cual, incluido
 * `estado: 'sin_cifra'`: esa también es una respuesta y la pantalla la explica con su motivo, en
 * vez de callarse.
 *
 * @param valorActual la medición REAL de hoy (el `avance` de la Roca Maestra). Es lo que hace que
 *                    la cifra se rehaga cada mes en vez de quedarse con los tercios del primer día.
 */
export function useObjetivoMensualDelEje(
  userId: string | null,
  eje: EjeObjetivo,
  valorActual: number | null,
  mes: number | null
): CifraDelMes | null {
  const [resultado, setResultado] = useState<CifraDelMes | null>(null);

  useEffect(() => {
    if (!userId || mes === null) {
      setResultado(null);
      return;
    }
    let vigente = true;
    (async () => {
      const mapa = await almacenMapa.leer(userId);
      if (!vigente) return;
      if (!mapa) {
        setResultado(null);
        return;
      }
      const area = areaDelEje(eje);
      if (!area) {
        setResultado(null);
        return;
      }
      const objetivo = objetivoDe(mapa, area);
      const mensual = objetivoMensualDelMapa(objetivo, { valorActual, mes });
      const formato = formatoDelObjetivo(objetivo);
      setResultado({ cifra: cifraDelMes(mensual, formato), nota: notaDelMes(mensual, formato) });
    })();
    return () => {
      vigente = false;
    };
  }, [userId, eje, valorActual, mes]);

  return resultado;
}
