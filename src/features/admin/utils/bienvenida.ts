import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { fechaEnZona, horaEnZona, ZONA_POR_DEFECTO } from '../../eventos/utils/zonaHoraria';
import type { PortadaDeBienvenidaApi, TextoDeBienvenidaApi, UltimoCambioApi } from '../api/bienvenidaSchemas';
import { fechaCorta } from './fechas';

/**
 * La lógica de la pantalla «Bienvenida» de Administración (backend D-210, 27/09), sin React: qué se
 * muestra de cada mensaje y de la portada, la vista previa con un nombre de ejemplo y la misma
 * revisión que hace el servidor antes de guardar un texto. La pantalla solo pinta lo que sale de acá.
 *
 * La revisión local no reemplaza a la del servidor: la adelanta, para que «Guardar» no se pueda tocar
 * con un texto que el servidor va a rechazar y el motivo se lea mientras se escribe.
 */

export const NOMBRE_DE_EJEMPLO = 'María';
/** El mentor de ejemplo de la vista previa del mensaje del grupo. Fijo: la pantalla lo aclara. */
export const MENTOR_DE_EJEMPLO = 'Carlos';
/** Hasta cuántas letras se escribe el nombre de ejemplo (el servidor acepta hasta 40). */
export const LARGO_DEL_NOMBRE_DE_EJEMPLO = 40;

export const MARCADOR_NOMBRE = '{nombre}';
export const MARCADOR_MENTOR = '{mentor}';

/** Lo que dice la app ante un 403: solo esos dos roles pueden cambiar la bienvenida. */
export const SIN_PERMISO = 'Solo Administración y Alquimista pueden cambiar la bienvenida.';
export const SIN_ALMACENAMIENTO =
  'Este servidor no tiene dónde guardar imágenes, así que la portada no se puede cambiar desde acá.';
export const AVISO_APAGADA =
  'Las bienvenidas automáticas están apagadas: lo que cambies acá se va a usar cuando se prendan.';

/**
 * Un marcador es cualquier `{...}` sin llaves ni saltos de línea adentro, de hasta 40 caracteres: la
 * misma expresión que usa el servidor (`\{[^{}\n]{0,40}\}`). Así «{nombre}», «{Nombre}» y «{nombr}»
 * cuentan como marcadores, y los dos últimos se rechazan igual que en el servidor.
 */
const MARCADOR = /\{[^{}\n]{0,40}\}/g;

type Pieza = { titulo: string; detalle: string };

const PIEZAS: Record<string, Pieza> = {
  SOPORTE_CON_LA_TARJETA: {
    titulo: 'Mensaje que acompaña la tarjeta',
    detalle: 'Llega al chat de soporte junto con la tarjeta.',
  },
  SOPORTE_FORMAL: {
    titulo: 'Mensaje formal de bienvenida',
    detalle: 'Llega al chat de soporte después de la tarjeta.',
  },
  GRUPO: {
    titulo: 'Mensaje al entrar a su grupo',
    detalle: 'Llega al chat del grupo cuando la persona se suma.',
  },
};

/** Título y explicación de cada mensaje. Una clave nueva del servidor se muestra igual, sin romper. */
export function piezaDelTexto(clave: string): Pieza {
  return PIEZAS[clave] ?? { titulo: 'Mensaje de bienvenida', detalle: '' };
}

/** Qué va en el lugar de cada marcador, dicho para quien escribe el mensaje. */
function queVaEn(marcador: string): string {
  if (marcador === MARCADOR_NOMBRE) return 'el nombre de la persona';
  if (marcador === MARCADOR_MENTOR) return 'el nombre de su mentor';
  return 'un dato que pone el sistema';
}

/**
 * La ayuda bajo el editor: «Escribe {nombre} donde va el nombre de la persona» y, en el del grupo,
 * «y {mentor} donde va el de su mentor».
 */
export function ayudaDeMarcadores(marcadores: readonly string[]): string {
  const partes = marcadores.map((m, i) => {
    if (i === 0) return `Escribe ${m} donde va ${queVaEn(m)}`;
    return m === MARCADOR_MENTOR ? `${m} donde va el de su mentor` : `${m} donde va ${queVaEn(m)}`;
  });
  if (partes.length === 0) return '';
  if (partes.length === 1) return `${partes[0]}.`;
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}.`;
}

/**
 * El largo como lo cuenta el servidor: caracteres de verdad (un emoji es uno) sobre el texto sin
 * espacios en los bordes. `texto.length` contaría el 🌿 como dos.
 */
export function largoDelTexto(texto: string): number {
  return Array.from(texto.trim()).length;
}

/** Los marcadores que aparecen en el texto, en orden y sin repetir. */
export function marcadoresDelTexto(texto: string): string[] {
  return [...new Set(texto.match(MARCADOR) ?? [])];
}

/** Los marcadores que el mensaje necesita y todavía no tiene: son los botones «Agregar …». */
export function marcadoresQueFaltan(texto: string, marcadores: readonly string[]): string[] {
  return marcadores.filter(m => !texto.includes(m));
}

export type RevisionDelTexto = { ok: true; texto: string } | { ok: false; error: string };

/**
 * La misma revisión que el servidor antes de guardar: no vacío, hasta `largoMaximo` caracteres, sin
 * marcadores que no se reemplazan y con todos los que el mensaje necesita. Devuelve el texto ya sin
 * espacios en los bordes, que es lo que se compara y se guarda.
 */
export function revisarTexto(texto: string, marcadores: readonly string[], largoMaximo: number): RevisionDelTexto {
  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: 'El mensaje no puede quedar vacío.' };
  const largo = largoDelTexto(limpio);
  if (largo > largoMaximo) {
    return { ok: false, error: `El mensaje tiene ${largo} caracteres: el máximo es ${largoMaximo}.` };
  }
  const desconocido = marcadoresDelTexto(limpio).find(m => !marcadores.includes(m));
  if (desconocido) return { ok: false, error: textoDeMarcadorDesconocido(desconocido, marcadores) };
  const falta = marcadoresQueFaltan(limpio, marcadores)[0];
  if (falta) return { ok: false, error: `Falta ${falta}: es donde va ${queVaEn(falta)}.` };
  return { ok: true, texto: limpio };
}

/** «{Nombre} no se puede usar en este mensaje. ¿Quisiste escribir {nombre}?» */
function textoDeMarcadorDesconocido(marcador: string, validos: readonly string[]): string {
  const parecido = validos.find(v => v.toLowerCase() === marcador.toLowerCase());
  if (parecido) return `${marcador} no se puede usar en este mensaje. ¿Quisiste escribir ${parecido}?`;
  if (validos.length === 0) return `${marcador} no se puede usar en este mensaje.`;
  const lista =
    validos.length === 1 ? `acá solo va ${validos[0]}` : `acá solo van ${validos.slice(0, -1).join(', ')} y ${validos[validos.length - 1]}`;
  return `${marcador} no se puede usar en este mensaje: ${lista}.`;
}

/**
 * Pone un marcador donde está el cursor (o reemplaza lo seleccionado). Sin selección conocida, lo
 * agrega al final separado por un espacio. Devuelve también dónde queda el cursor.
 */
export function insertarMarcador(
  texto: string,
  marcador: string,
  seleccion?: { start: number; end: number } | null,
): { texto: string; cursor: number } {
  if (seleccion && seleccion.start >= 0 && seleccion.start <= seleccion.end && seleccion.end <= texto.length) {
    const nuevo = texto.slice(0, seleccion.start) + marcador + texto.slice(seleccion.end);
    return { texto: nuevo, cursor: seleccion.start + marcador.length };
  }
  const base = texto.replace(/\s+$/, '');
  const nuevo = base ? `${base} ${marcador}` : marcador;
  return { texto: nuevo, cursor: nuevo.length };
}

/** El nombre de ejemplo como se escribe en el campo: hasta 40 caracteres de verdad. */
export function acotarNombreDeEjemplo(texto: string): string {
  return Array.from(texto).slice(0, LARGO_DEL_NOMBRE_DE_EJEMPLO).join('');
}

/** El nombre con el que se muestran las vistas previas: el de ejemplo, o «María» si quedó vacío. */
export function nombreParaLaMuestra(texto: string): string {
  return texto.trim() || NOMBRE_DE_EJEMPLO;
}

/**
 * El mensaje como lo va a leer la persona: los marcadores reemplazados por el nombre de ejemplo y el
 * mentor de ejemplo, sobre el texto sin espacios en los bordes (lo que guarda el servidor).
 */
export function vistaPrevia(texto: string, nombre: string, mentor: string = MENTOR_DE_EJEMPLO): string {
  return texto.trim().split(MARCADOR_NOMBRE).join(nombre).split(MARCADOR_MENTOR).join(mentor);
}

/**
 * Un mensaje vacío no se manda (así lo decide el servidor con el original del archivo: vacío apaga ese
 * mensaje). La pantalla lo dice en vez de mostrar una burbuja en blanco.
 */
export function seManda(texto: string): boolean {
  return texto.trim().length > 0;
}

export const MENSAJE_APAGADO = 'Este mensaje está vacío, así que hoy no se manda.';

/** «27 de septiembre a las 10:04», en la hora de Lima (la del programa). `null` si no se entiende. */
export function fechaYHoraDelCambio(iso: string | null | undefined): string | null {
  if (!iso || Number.isNaN(Date.parse(iso))) return null;
  return `${fechaCorta(fechaEnZona(iso, ZONA_POR_DEFECTO))} a las ${horaEnZona(iso, ZONA_POR_DEFECTO)}`;
}

/** «Kelin Rojas el 27 de septiembre a las 10:04»; sin nombre (cuenta borrada), «alguien del equipo». */
function quienYCuando(cambio: UltimoCambioApi): string {
  const quien = cambio.por?.trim() || 'alguien del equipo';
  const cuando = fechaYHoraDelCambio(cambio.en);
  return cuando ? `${quien} el ${cuando}` : quien;
}

/** La línea de estado de un mensaje: original, cambiado (por quién y cuándo) o vuelto al original. */
export function estadoDelTexto(texto: Pick<TextoDeBienvenidaApi, 'cambiado' | 'ultimoCambio'>): string {
  const cambio = texto.ultimoCambio ?? null;
  if (texto.cambiado) return cambio ? `Cambiado por ${quienYCuando(cambio)}.` : 'Cambiado por Administración.';
  if (cambio?.volvioAlOriginal) return `Volvió al original: ${quienYCuando(cambio)}.`;
  return 'Texto original';
}

/** La línea de estado de la portada, con el mismo criterio que la de los mensajes. */
export function estadoDeLaPortada(portada: Pick<PortadaDeBienvenidaApi, 'cambiada' | 'ultimoCambio'>): string {
  const cambio = portada.ultimoCambio ?? null;
  if (portada.cambiada) return cambio ? `Cambiada por ${quienYCuando(cambio)}.` : 'Cambiada por Administración.';
  if (cambio?.volvioAlOriginal) return `Volvió a la original: ${quienYCuando(cambio)}.`;
  return 'Es la portada original';
}

/** Qué se ofrece para la portada: cambiarla (si el servidor guarda imágenes) y volver a la original. */
export function accionesDeLaPortada(portada: Pick<PortadaDeBienvenidaApi, 'cambiada' | 'sePuedeCambiar'>): {
  puedeCambiar: boolean;
  puedeVolver: boolean;
  aviso: string | null;
} {
  return {
    puedeCambiar: portada.sePuedeCambiar,
    // Volver a la original no sube nada: se ofrece aunque el servidor no guarde imágenes.
    puedeVolver: portada.cambiada,
    aviso: portada.sePuedeCambiar ? null : SIN_ALMACENAMIENTO,
  };
}

/**
 * ¿Se puede tocar «Guardar»? Solo con un texto que pasa la revisión y que no es el que ya sale: el
 * servidor no anota un cambio que no cambia nada, y la pantalla tampoco lo ofrece.
 */
export function sePuedeGuardar(
  borrador: string,
  vigente: string,
  marcadores: readonly string[],
  largoMaximo: number,
): boolean {
  const revision = revisarTexto(borrador, marcadores, largoMaximo);
  return revision.ok && revision.texto !== vigente.trim();
}

/** Un error de la API en palabras: un 403 siempre dice quién puede; lo demás, el mensaje del servidor. */
export function mensajeDeErrorDeBienvenida(error: unknown, porDefecto: string): string {
  if (error instanceof ApiError && error.esProhibido) return SIN_PERMISO;
  return mensajeDeError(error, porDefecto);
}
