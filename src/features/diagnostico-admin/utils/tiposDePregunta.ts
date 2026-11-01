import type { DestinoDeLaPregunta, TipoDePregunta } from '../../diagnostico/types/diagnostico.types';
import { CODIGOS_DE_FORMACION } from '../../formaciones/types/formaciones.types';
import { nombreCortoDeFormacion } from '../../formaciones/utils/nombreDeFormacion';

/**
 * Los nombres en español de lo que Administración elige al armar una pregunta (spec 026): el tipo, a qué alimenta y en qué formaciones
 * se muestra. Las mismas palabras de la plantilla de importación (contrato §5), para que quien arma la ficha en una hoja de cálculo y
 * quien la arma en la app hablen igual.
 */

export const TIPOS_EN_ORDEN: ReadonlyArray<{ valor: TipoDePregunta; etiqueta: string; detalle: string }> = [
  { valor: 'TEXTO', etiqueta: 'Texto corto', detalle: 'Una línea: un nombre, una ciudad.' },
  { valor: 'AREA_TEXTO', etiqueta: 'Párrafo', detalle: 'Una respuesta larga, con varias líneas.' },
  { valor: 'NUMERO', etiqueta: 'Número', detalle: 'Una cifra: edad, peso, ingresos.' },
  { valor: 'SELECCION_UNICA', etiqueta: 'Opción única', detalle: 'Elige una sola entre varias.' },
  { valor: 'SELECCION_MULTIPLE', etiqueta: 'Casillas', detalle: 'Puede marcar varias, con un máximo si quieres.' },
  { valor: 'ESCALA', etiqueta: 'Escala', detalle: 'Un número en una escala, por ejemplo de 1 a 5.' },
  { valor: 'CUADRICULA', etiqueta: 'Cuadrícula de escala', detalle: 'Varias filas, cada una con la misma escala.' },
  { valor: 'FECHA', etiqueta: 'Fecha', detalle: 'Día, mes y año.' },
  { valor: 'CASILLA', etiqueta: 'Consentimiento', detalle: 'Una declaración que la persona acepta con una casilla.' },
];

export function etiquetaDelTipo(tipo: TipoDePregunta): string {
  return TIPOS_EN_ORDEN.find(t => t.valor === tipo)?.etiqueta ?? tipo;
}

/** El tipo trae opciones que se escriben: única y casillas (opciones), cuadrícula (filas) y consentimiento (el texto de la casilla). */
export function tipoPideOpciones(tipo: TipoDePregunta): boolean {
  return tipo === 'SELECCION_UNICA' || tipo === 'SELECCION_MULTIPLE' || tipo === 'CUADRICULA';
}

/** El consentimiento lleva UNA opción: su etiqueta es el texto de la casilla, y la ayuda es la declaración. */
export function esConsentimiento(tipo: TipoDePregunta): boolean {
  return tipo === 'CASILLA';
}

export function tipoPideEscala(tipo: TipoDePregunta): boolean {
  return tipo === 'ESCALA' || tipo === 'CUADRICULA';
}

export function tipoAdmiteMaximo(tipo: TipoDePregunta): boolean {
  return tipo === 'SELECCION_MULTIPLE';
}

/** En la cuadrícula las opciones son las filas. */
export function nombreDeLasOpciones(tipo: TipoDePregunta): { plural: string; singular: string; agregar: string } {
  return tipo === 'CUADRICULA'
    ? { plural: 'Filas', singular: 'Fila', agregar: 'Añadir fila' }
    : { plural: 'Opciones', singular: 'Opción', agregar: 'Añadir opción' };
}

/** Cuántas opciones pide como mínimo: una opción única con una sola opción no pregunta nada. */
export function minimoDeOpciones(tipo: TipoDePregunta): number {
  if (tipo === 'CUADRICULA') return 1;
  if (tipo === 'SELECCION_UNICA' || tipo === 'SELECCION_MULTIPLE') return 2;
  return 0;
}

// ── A qué alimenta ──────────────────────────────────────────────────────────

export const DESTINOS_EN_ORDEN: ReadonlyArray<{ valor: DestinoDeLaPregunta; etiqueta: string; detalle: string }> = [
  { valor: 'OBJETIVO_CUERPO', etiqueta: 'Objetivo de Cuerpo', detalle: 'Su respuesta se prepara como su objetivo de Cuerpo en Plan.' },
  { valor: 'OBJETIVO_NEGOCIO', etiqueta: 'Objetivo de Negocio', detalle: 'Su respuesta se prepara como su objetivo de Negocio en Plan.' },
  { valor: 'OBJETIVO_RELACIONES', etiqueta: 'Objetivo de Relaciones', detalle: 'Su respuesta se prepara como su objetivo de Relaciones en Plan.' },
  { valor: 'PRIORIDAD_PRINCIPAL', etiqueta: 'Prioridad principal', detalle: 'El eje que elige va primero en Plan.' },
  { valor: 'PRIMERA_ACCION', etiqueta: 'Primera acción', detalle: 'Se le sugiere al agendar su primera acción.' },
  { valor: 'TRATO_DE_LA_PERSONA', etiqueta: 'Trato de la persona', detalle: 'Cómo le habla SER: en masculino, femenino o neutro.' },
];

export function etiquetaDelDestino(destino: DestinoDeLaPregunta): string {
  return DESTINOS_EN_ORDEN.find(d => d.valor === destino)?.etiqueta ?? destino;
}

export function esObjetivo(destino: DestinoDeLaPregunta | null): boolean {
  return destino === 'OBJETIVO_CUERPO' || destino === 'OBJETIVO_NEGOCIO' || destino === 'OBJETIVO_RELACIONES';
}

/** Con qué tipos de pregunta puede alimentar cada destino (contrato §5; la primera acción es texto libre). */
export function tiposDelDestino(destino: DestinoDeLaPregunta): readonly TipoDePregunta[] {
  switch (destino) {
    case 'OBJETIVO_CUERPO':
    case 'OBJETIVO_NEGOCIO':
    case 'OBJETIVO_RELACIONES':
    case 'PRIMERA_ACCION':
      return ['AREA_TEXTO', 'TEXTO'];
    case 'PRIORIDAD_PRINCIPAL':
    case 'TRATO_DE_LA_PERSONA':
      return ['SELECCION_UNICA'];
  }
}

export function destinoCuadraConElTipo(destino: DestinoDeLaPregunta, tipo: TipoDePregunta): boolean {
  return tiposDelDestino(destino).includes(tipo);
}

/** Los destinos cuyas opciones llevan un CÓDIGO (la prioridad y el trato): cada opción dice a cuál corresponde. */
export function codigosDelDestino(destino: DestinoDeLaPregunta | null): ReadonlyArray<{ codigo: string; etiqueta: string }> {
  if (destino === 'PRIORIDAD_PRINCIPAL') {
    return [
      { codigo: 'CUERPO', etiqueta: 'Cuerpo' },
      { codigo: 'TRABAJO', etiqueta: 'Negocio' },
      { codigo: 'RELACIONES', etiqueta: 'Relaciones' },
    ];
  }
  if (destino === 'TRATO_DE_LA_PERSONA') {
    return [
      { codigo: 'MASCULINO', etiqueta: 'Masculino' },
      { codigo: 'FEMENINO', etiqueta: 'Femenino' },
      { codigo: 'NEUTRO', etiqueta: 'Neutro' },
    ];
  }
  return [];
}

export function destinoLlevaCodigos(destino: DestinoDeLaPregunta | null): boolean {
  return codigosDelDestino(destino).length > 0;
}

/** La etiqueta de un código, p. ej. `TRABAJO` → «Negocio». */
export function etiquetaDelCodigo(destino: DestinoDeLaPregunta | null, codigo: string): string {
  return codigosDelDestino(destino).find(c => c.codigo === codigo)?.etiqueta ?? codigo;
}

// ── Formaciones ─────────────────────────────────────────────────────────────

export const FORMACIONES_ELEGIBLES: ReadonlyArray<{ codigo: string; etiqueta: string }> = CODIGOS_DE_FORMACION.map(codigo => ({
  codigo,
  etiqueta: nombreCortoDeFormacion(codigo),
}));

/** «Todas las formaciones» o «Solo Diplomado y Certificación». */
export function textoDeFormaciones(formaciones: string[] | null): string {
  if (!formaciones || formaciones.length === 0) return 'Todas las formaciones';
  const nombres = formaciones.map(nombreCortoDeFormacion);
  return `Solo ${unir(nombres)}`;
}

/** «A, B y C». */
export function unir(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}
