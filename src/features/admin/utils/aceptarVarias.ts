import type { PersonaPorAceptar } from './aceptarSolicitud';

/**
 * Aceptar varias solicitudes con una misma elección (spec 025, decisión 025-3 C del dueño). Se hacen UNA POR UNA, en orden: cada una es su
 * propia transacción en el servidor, así que una que falla (ya la había decidido otra persona, por ejemplo) no deshace las demás. Esto resume
 * qué pasó para decirlo con claridad y dejar marcadas solo las que faltan.
 */
export type ResultadoDeAceptarVarias = {
  aceptadas: PersonaPorAceptar[];
  fallidas: Array<{ persona: PersonaPorAceptar; motivo: string }>;
};

export async function aceptarUnaPorUna(
  personas: readonly PersonaPorAceptar[],
  aceptar: (persona: PersonaPorAceptar) => Promise<void>,
  alAvanzar?: (hechas: number, total: number) => void,
): Promise<ResultadoDeAceptarVarias> {
  const resultado: ResultadoDeAceptarVarias = { aceptadas: [], fallidas: [] };
  for (const [indice, persona] of personas.entries()) {
    alAvanzar?.(indice, personas.length);
    try {
      await aceptar(persona);
      resultado.aceptadas.push(persona);
    } catch (e) {
      resultado.fallidas.push({ persona, motivo: e instanceof Error ? e.message : 'No se pudo aceptar.' });
    }
  }
  return resultado;
}

/** Lo que se dice al terminar: todo bien, o cuántas entraron y por qué no entraron las otras. */
export function textoDelResultado(resultado: ResultadoDeAceptarVarias, total: number): string {
  if (resultado.fallidas.length === 0) {
    return total === 1 ? 'Listo.' : `Aceptaste a las ${total} personas.`;
  }
  const primera = resultado.fallidas[0];
  const quienes = resultado.fallidas.map(f => f.persona.nombre).join(', ');
  const hechas = resultado.aceptadas.length;
  const inicio = hechas > 0 ? `Aceptaste a ${hechas} de ${total}. ` : '';
  return resultado.fallidas.length === 1
    ? `${inicio}No se pudo aceptar a ${primera.persona.nombre}: ${primera.motivo}`
    : `${inicio}No se pudo aceptar a ${quienes}. ${primera.motivo}`;
}
