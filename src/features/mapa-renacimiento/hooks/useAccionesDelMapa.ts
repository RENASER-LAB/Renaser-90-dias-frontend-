import { useEffect, useState } from 'react';

import type { EjeObjetivo } from '../../objetivos/types/objetivos.types';
import { consultarMapa } from '../api/mapaApi';
import { EJE_POR_AREA, type Area } from '../tipos';

/** Lo que la persona escribió en el Mapa, agrupado por el eje al que sirve. */
export type AccionesPorEje = Record<EjeObjetivo, string[]>;

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

function agruparPorEje(acciones: { area: string; text: string }[]): AccionesPorEje {
  const porEje: AccionesPorEje = { CUERPO: [], TRABAJO: [], RELACIONES: [] };
  for (const accion of acciones) {
    const eje = EJE_POR_AREA[accion.area as Area];
    const texto = accion.text?.trim();
    if (eje && texto) porEje[eje].push(texto);
  }
  return porEje;
}
