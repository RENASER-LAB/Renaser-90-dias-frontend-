/**
 * Lo que dice el lector de pantalla en una fila de «¿A quién atiendo hoy?» (Administración):
 * «Api Aprendiz E2E. Con problemas. 7 de 7 días con datos. Grupo Plan E2E. Abrir su ficha.»
 *
 * > **ADM-01 (e2e web del 2026-09-27).** La etiqueta le anteponía siempre «Grupo» al texto de los
 * > grupos, que ya viene en palabras (`textoDeGrupos`: «Grupo Fénix», «Bienvenida», «Sin grupo»…), y
 * > se leía «Grupo Grupo Plan E2E» o «Grupo Sin grupo». Ahora «Grupo» va solo cuando el texto no lo
 * > dice ya. Lo que se ve en la fila no cambia.
 */
export function etiquetaDeLaFilaDeAtencion(fila: {
  nombre: string;
  palabra: string;
  dias: string | null;
  grupoNombre: string | null;
}): string {
  const grupo = fila.grupoNombre?.trim() ?? '';
  const partes = [
    fila.nombre,
    fila.palabra,
    fila.dias,
    grupo && (YA_DICE_GRUPO.test(grupo) ? grupo : `Grupo ${grupo}`),
    'Abrir su ficha',
  ];
  return partes.filter(Boolean).map(p => `${p}.`).join(' ');
}

/** «Grupo Fénix», «Sin grupo», «Bienvenida · Grupo Fénix»: la palabra ya está (también en plural). */
const YA_DICE_GRUPO = /\bgrupos?\b/i;
