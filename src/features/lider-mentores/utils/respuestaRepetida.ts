/**
 * Si «Lo que escribió» ya se leyó arriba como una evidencia de texto (E-629 (b)).
 *
 * Al entregar un texto la app lo manda dos veces: como evidencia de tipo TEXTO y como `respuestaTexto` del registro
 * (`EvidenciaHabitoModal`). La hoja del líder mostraba las dos y el mismo párrafo salía repetido. Se compara lo que se
 * leyó, sin espacios en los bordes: si es lo mismo se muestra una sola vez; si dice otra cosa (la foto con «¿Qué
 * sentiste?», un resumen distinto) se muestran las dos.
 */
export function respuestaYaLeidaComoEvidencia(respuestaTexto: string | null | undefined, textosLeidos: string[]): boolean {
  const respuesta = respuestaTexto?.trim();
  if (!respuesta) return false;
  return textosLeidos.some(texto => texto.trim() === respuesta);
}
