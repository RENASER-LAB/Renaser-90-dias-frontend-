import { useEffect, useState } from 'react';

import type { EjeObjetivo } from '../../objetivos/types/objetivos.types';
import { DIAS_DEL_PLAN, INDICE_DE_HOY } from '../../habits/utils/semanaDelPlan';
import { consultarMapa } from '../api/mapaApi';
import { EJE_POR_AREA, type Area } from '../tipos';

/**
 * Una acción motora del Mapa, con el ritmo que la persona le puso.
 *
 * @param dias en ISO: 1 = lunes … 7 = domingo. Es lo que hace que el planificador del día sepa
 *   **qué toca hoy** sin preguntarlo, igual que Training sabe qué hábitos van hoy.
 */
export interface AccionDelMapa {
  texto: string;
  dias: number[];
  frecuenciaSemanal: number;
}

/** Lo que la persona escribió en el Mapa, agrupado por el eje al que sirve. */
export type AccionesPorEje = Record<EjeObjetivo, AccionDelMapa[]>;

const VACIO: AccionesPorEje = { CUERPO: [], TRABAJO: [], RELACIONES: [] };

/**
 * Las acciones motoras del Mapa (V06), listas para prellenar el plan de la semana.
 *
 * ── Por qué existe ──
 *
 * El asistente semanal pedía inventar **nueve** acciones críticas desde cero —tres por eje— cuando
 * la persona ya había escrito las suyas el día 7, y con más cuidado: ahí declaró el texto, cuántas
 * veces por semana y con qué evidencia las iba a demostrar. Volver a pedirlas en blanco es pedirle
 * que se acuerde de lo que ya dijo, y la respuesta típica a eso es escribir cualquier cosa para
 * pasar de pantalla.
 *
 * ── Por qué no hay endpoint nuevo ──
 *
 * `GET /api/v1/mapa-renacimiento` ya devuelve `actions` con su área y su texto, y `consultarMapa()`
 * ya lo llama. Lo único que faltaba era tipar esa parte del esquema (venía como `passthrough`
 * porque hasta hoy no la leía nadie) y traducir `area` → eje con `EJE_POR_AREA`, la tabla que ya
 * hace esa traducción para el resto del Mapa.
 *
 * Sin red o sin Mapa recorrido devuelve las tres listas vacías: el asistente abre como siempre, con
 * los campos en blanco. No poder prellenar no es un error que valga la pena mostrar.
 */
export function useAccionesDelMapa(activo: boolean): AccionesPorEje {
  const [acciones, setAcciones] = useState<AccionesPorEje>(VACIO);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    (async () => {
      try {
        const mapa = await consultarMapa();
        if (vigente) setAcciones(agruparPorEje(mapa.actions));
      } catch {
        // Se queda vacío: el asistente sigue siendo usable a mano.
      }
    })();
    return () => {
      vigente = false;
    };
  }, [activo]);

  return acciones;
}

function agruparPorEje(
  acciones: { area: string; text: string; days: number[]; weeklyFrequency: number }[]
): AccionesPorEje {
  const porEje: AccionesPorEje = { CUERPO: [], TRABAJO: [], RELACIONES: [] };
  for (const accion of acciones) {
    const eje = EJE_POR_AREA[accion.area as Area];
    const texto = accion.text?.trim();
    if (eje && texto) {
      porEje[eje].push({ texto, dias: accion.days ?? [], frecuenciaSemanal: accion.weeklyFrequency });
    }
  }
  return porEje;
}

/**
 * `[1,3,5]` → `"LUN · MIÉ · VIE"`. Vacío cuando la persona no eligió días.
 *
 * Usa `DIAS_DEL_PLAN`, las mismas etiquetas con las que Training dibuja sus pestañas: los días son
 * los mismos y tienen que llamarse igual en las dos pantallas.
 */
export function diasEscritos(dias: number[]): string {
  return dias
    .filter(d => d >= 1 && d <= DIAS_DEL_PLAN.length)
    .sort((a, b) => a - b)
    .map(d => DIAS_DEL_PLAN[d - 1])
    .join(' · ');
}

/**
 * ¿Esta acción toca hoy?
 *
 * **Reusa `INDICE_DE_HOY` de `semanaDelPlan`, que es de donde Training saca su día.** La primera
 * versión de esta función calculaba el día por su cuenta (`getDay() === 0 ? 7 : getDay()`), o sea
 * una segunda definición de "qué día es hoy" en la misma app — exactamente el problema que este
 * mismo día se cerró dos veces con las cifras del plan. El javadoc de `semanaDelPlan` ya lo
 * anticipaba: *"el día que otro módulo tenga que hablar de días con el servidor, la traducción ya
 * existe y es una sola"*.
 *
 * `INDICE_DE_HOY` va de 0 (lunes) a 6; los días del Mapa vienen en ISO, de 1 a 7. De ahí el +1.
 */
export function tocaHoy(accion: AccionDelMapa): boolean {
  return accion.dias.includes(INDICE_DE_HOY + 1);
}
