/**
 * La ficha de un aprendiz dentro de un mensaje de «Avisar a su mentor» (spec 056 FR-019, SC-005).
 *
 * El líder le avisa a un mentor sobre un aprendiz y el servidor entrega el texto en el chat del mentor con el líder, con una última línea
 * `Ficha de <nombre>: /mentor/groups/<grupo>/learners/<persona>` (`AvisoAlMentorService.mensajeConEnlace`): la ruta con la que el mentor abre a SU aprendiz, la misma
 * de los avisos de acompañamiento. En el chat esa línea se veía como texto crudo; la burbuja la muestra como «Abrir la ficha de <nombre>».
 *
 * **Solo esa forma exacta**: la palabra «Ficha de», un nombre, dos puntos y la ruta `/mentor/groups/<uuid>/learners/<uuid>` como ÚLTIMA línea del mensaje. Una ruta en
 * medio del texto, con otros ids o de otra pantalla se queda como texto: el mensaje viene del servidor y un chat es un lugar donde cualquiera puede escribir algo parecido.
 */
export interface FichaEnElMensaje {
  /** El texto del líder, sin la línea de la ficha; vacío si el mensaje era solo la línea. */
  antes: string;
  nombre: string;
  grupoId: string;
  personaId: string;
  /** La ruta tal cual, lista para `anotarRutaDeAviso`. */
  ruta: string;
}

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const ULTIMA_LINEA = new RegExp(`(?:^|\\n)Ficha de ([^\\n]{1,120}?): (/mentor/groups/(${UUID})/learners/(${UUID}))\\s*$`);

export function fichaEnElMensaje(texto: string): FichaEnElMensaje | null {
  const partes = ULTIMA_LINEA.exec(texto);
  if (!partes) return null;
  const nombre = partes[1].trim();
  if (!nombre) return null;
  return { antes: texto.slice(0, partes.index).trimEnd(), nombre, grupoId: partes[3], personaId: partes[4], ruta: partes[2] };
}
