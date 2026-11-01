import type { CondicionDeLaPregunta, DestinoDeLaPregunta, TipoDePregunta } from '../../diagnostico/types/diagnostico.types';
import type { PreguntaAdmin, PreguntaRequest, SeccionAdmin } from '../types/diagnosticoAdmin.types';
import { condicionEsValida, quienAlimenta, recortarTexto } from './condiciones';
import {
  destinoCuadraConElTipo,
  destinoLlevaCodigos,
  etiquetaDelDestino,
  esConsentimiento,
  FORMACIONES_ELEGIBLES,
  minimoDeOpciones,
  nombreDeLasOpciones,
  tipoAdmiteMaximo,
  tipoPideEscala,
  tipoPideOpciones,
} from './tiposDePregunta';

/**
 * El formulario de una pregunta (el editor de Administración, spec 026): lo que se escribe, qué falta antes de guardar y el cuerpo que
 * viaja (`PreguntaRequest`). Todo puro: el editor solo dibuja y llama.
 */

export const ESCALA_MINIMA_POR_DEFECTO = 1;
export const ESCALA_MAXIMA_POR_DEFECTO = 5;
/** Las escalas de la ficha van de 0 a 10 como mucho (un «del 0 al 10» es la más larga que se usa). */
export const ESCALA_TOPE = 10;

export interface OpcionEnEdicion {
  /** Para la lista de la pantalla; no viaja. */
  id: string;
  /** El `valor` que el servidor ya tiene para esta opción (si la opción ya existía). Cambiar su etiqueta no lo cambia: las respuestas guardadas se leen por `valor`. */
  valorOriginal: string | null;
  etiqueta: string;
  /** Solo en la prioridad y el trato: a qué corresponde esta opción (`CUERPO`, `MASCULINO`…). */
  codigo: string | null;
}

export interface FormularioDePregunta {
  seccionId: number;
  texto: string;
  ayuda: string;
  tipo: TipoDePregunta;
  requerida: boolean;
  opciones: OpcionEnEdicion[];
  maximoOpciones: number | null;
  escalaMin: number;
  escalaMax: number;
  etiquetaMin: string;
  etiquetaMax: string;
  condicion: CondicionDeLaPregunta | null;
  alimenta: DestinoDeLaPregunta | null;
  /** Los códigos de formación marcados; vacío = en todas. */
  formaciones: string[];
  /** Lo que ya consta de la solicitud (el nombre): se conserva tal cual, no se edita. */
  precarga: string | null;
  /** Si las opciones con las que se abrió eran de un destino con códigos (sus `valor` son códigos, no textos de la persona). */
  opcionesConCodigos: boolean;
}

let contador = 0;
export function opcionNueva(etiqueta = ''): OpcionEnEdicion {
  contador += 1;
  return { id: `op-${contador}`, valorOriginal: null, etiqueta, codigo: null };
}

export function formularioNuevo(seccionId: number): FormularioDePregunta {
  return {
    seccionId,
    texto: '',
    ayuda: '',
    tipo: 'TEXTO',
    requerida: false,
    opciones: [],
    maximoOpciones: null,
    escalaMin: ESCALA_MINIMA_POR_DEFECTO,
    escalaMax: ESCALA_MAXIMA_POR_DEFECTO,
    etiquetaMin: '',
    etiquetaMax: '',
    condicion: null,
    alimenta: null,
    formaciones: [],
    precarga: null,
    opcionesConCodigos: false,
  };
}

export function formularioDesde(p: PreguntaAdmin): FormularioDePregunta {
  const conCodigos = destinoLlevaCodigos(p.alimenta);
  return {
    seccionId: p.seccionId,
    texto: p.texto,
    ayuda: p.ayuda ?? '',
    tipo: p.tipo,
    requerida: p.requerida,
    opciones: p.opciones.map(o => ({ ...opcionNueva(o.etiqueta), valorOriginal: o.valor, codigo: conCodigos ? o.valor : null })),
    maximoOpciones: p.maximoOpciones,
    escalaMin: p.escala?.min ?? ESCALA_MINIMA_POR_DEFECTO,
    escalaMax: p.escala?.max ?? ESCALA_MAXIMA_POR_DEFECTO,
    etiquetaMin: p.escala?.etiquetaMin ?? '',
    etiquetaMax: p.escala?.etiquetaMax ?? '',
    condicion: p.seMuestraSi,
    alimenta: p.alimenta,
    formaciones: p.formaciones ?? [],
    precarga: p.precarga,
    opcionesConCodigos: conCodigos,
  };
}

/** ¿Se puede cambiar el tipo? No si es protegida ni si ya tiene respuestas (el servidor responde 409). */
export function motivoParaNoCambiarElTipo(p: PreguntaAdmin | null): string | null {
  if (!p) return null;
  if (p.protegida) return 'Esta pregunta es de las que alimentan Plan o el trato de SER: no cambia de tipo.';
  if (p.respuestas > 0) {
    return p.respuestas === 1
      ? 'Ya la respondió 1 persona: no se puede cambiar su tipo.'
      : `Ya la respondieron ${p.respuestas} personas: no se puede cambiar su tipo.`;
  }
  return null;
}

/** Cambia el tipo y deja el formulario coherente: el destino que ya no cuadra se suelta, y el consentimiento queda con su casilla. */
export function conTipo(form: FormularioDePregunta, tipo: TipoDePregunta): FormularioDePregunta {
  if (tipo === form.tipo) return form;
  const alimenta = form.alimenta && destinoCuadraConElTipo(form.alimenta, tipo) ? form.alimenta : null;
  return {
    ...form,
    tipo,
    alimenta,
    maximoOpciones: tipoAdmiteMaximo(tipo) ? form.maximoOpciones : null,
    opciones: esConsentimiento(tipo) && form.opciones.length === 0 ? [opcionNueva()] : form.opciones,
  };
}

/** Cambia el destino: si ahora lleva códigos, cada opción parte sin código (se elige); si deja de llevarlos, se sueltan. */
export function conDestino(form: FormularioDePregunta, alimenta: DestinoDeLaPregunta | null): FormularioDePregunta {
  if (alimenta === form.alimenta) return form;
  const antes = destinoLlevaCodigos(form.alimenta);
  const ahora = destinoLlevaCodigos(alimenta);
  return {
    ...form,
    alimenta,
    opciones: ahora !== antes ? form.opciones.map(o => ({ ...o, codigo: null })) : form.opciones,
  };
}

/** Marca o desmarca una formación; las tres marcadas equivalen a ninguna (todas). */
export function alternarFormacion(formaciones: readonly string[], codigo: string): string[] {
  const nuevas = formaciones.includes(codigo) ? formaciones.filter(f => f !== codigo) : [...formaciones, codigo];
  return FORMACIONES_ELEGIBLES.map(f => f.codigo).filter(c => nuevas.includes(c));
}

/** El máximo de opciones al apretar «−» o «+»: sin límite ↔ 1…n. */
export function pasarMaximo(actual: number | null, direccion: 1 | -1, cantidadDeOpciones: number): number | null {
  const tope = Math.max(1, cantidadDeOpciones);
  if (direccion === 1) {
    if (actual === null) return Math.min(2, tope);
    return Math.min(actual + 1, tope);
  }
  if (actual === null) return null;
  return actual <= 1 ? null : actual - 1;
}

export function textoDelMaximo(maximo: number | null): string {
  return maximo === null ? 'Sin límite' : `${maximo}`;
}

export interface FaltasDeLaPregunta {
  texto?: string;
  opciones?: string;
  maximo?: string;
  escala?: string;
  condicion?: string;
  alimenta?: string;
  codigos?: string;
}

export interface ContextoDeLaPregunta {
  secciones: readonly SeccionAdmin[];
  /** `null` = pregunta nueva. */
  preguntaId: number | null;
}

function opcionesEscritas(form: FormularioDePregunta): OpcionEnEdicion[] {
  return form.opciones.filter(o => o.etiqueta.trim() !== '');
}

/** Todo lo que falta o está mal antes de guardar, por campo. Vacío = se puede guardar. */
export function faltasDeLaPregunta(form: FormularioDePregunta, ctx: ContextoDeLaPregunta): FaltasDeLaPregunta {
  const faltas: FaltasDeLaPregunta = {};
  if (!form.texto.trim()) faltas.texto = 'Escribe la pregunta.';

  const escritas = opcionesEscritas(form);
  if (esConsentimiento(form.tipo)) {
    if (escritas.length === 0) faltas.opciones = 'Escribe el texto de la casilla.';
  } else if (tipoPideOpciones(form.tipo)) {
    const nombre = nombreDeLasOpciones(form.tipo);
    const minimo = minimoDeOpciones(form.tipo);
    const claves = escritas.map(o => o.etiqueta.trim().toLowerCase());
    if (escritas.length < minimo) {
      faltas.opciones = minimo === 1 ? `Escribe al menos una ${nombre.singular.toLowerCase()}.` : `Escribe al menos ${minimo} ${nombre.plural.toLowerCase()}.`;
    } else if (new Set(claves).size !== claves.length) {
      faltas.opciones = `Hay ${nombre.plural.toLowerCase()} repetidas.`;
    }
  }

  if (tipoAdmiteMaximo(form.tipo) && form.maximoOpciones !== null && form.maximoOpciones > Math.max(escritas.length, 1)) {
    faltas.maximo = `El máximo no puede pasar de ${escritas.length} opciones.`;
  }

  if (tipoPideEscala(form.tipo)) {
    if (!(form.escalaMin < form.escalaMax)) faltas.escala = 'El mínimo de la escala debe ser menor que el máximo.';
    else if (form.escalaMin < 0 || form.escalaMax > ESCALA_TOPE) faltas.escala = `La escala va entre 0 y ${ESCALA_TOPE}.`;
  }

  if (form.condicion && !condicionEsValida(form.condicion, ctx.secciones, ctx.preguntaId, form.seccionId)) {
    faltas.condicion = 'La pregunta de la que depende ya no está antes que esta. Elige otra o quita la condición.';
  }

  if (form.alimenta) {
    if (!destinoCuadraConElTipo(form.alimenta, form.tipo)) {
      faltas.alimenta = `«${etiquetaDelDestino(form.alimenta)}» no se puede alimentar con este tipo de pregunta.`;
    } else {
      const otra = quienAlimenta(form.alimenta, ctx.secciones, ctx.preguntaId);
      if (otra) faltas.alimenta = `Ya lo alimenta «${recortarTexto(otra.texto, 50)}». Cada destino admite una sola pregunta.`;
    }
    if (destinoLlevaCodigos(form.alimenta) && !faltas.alimenta) {
      const sinCodigo = escritas.some(o => !o.codigo);
      const codigos = escritas.map(o => o.codigo).filter((c): c is string => !!c);
      if (escritas.length === 0 || sinCodigo) faltas.codigos = 'Elige a qué corresponde cada opción.';
      else if (new Set(codigos).size !== codigos.length) faltas.codigos = 'Dos opciones no pueden corresponder a lo mismo.';
    }
  }
  return faltas;
}

export function primeraFalta(faltas: FaltasDeLaPregunta): string | null {
  return faltas.texto ?? faltas.opciones ?? faltas.maximo ?? faltas.escala ?? faltas.condicion ?? faltas.alimenta ?? faltas.codigos ?? null;
}

/** El cuerpo que viaja. Solo lleva lo que el tipo usa: las opciones de un campo de texto o la escala de una fecha no se mandan. */
export function cuerpoDesde(form: FormularioDePregunta, original: PreguntaAdmin | null): PreguntaRequest {
  const conCodigos = destinoLlevaCodigos(form.alimenta);
  let opciones: PreguntaRequest['opciones'] = [];
  if (esConsentimiento(form.tipo)) {
    const casilla = opcionesEscritas(form)[0];
    opciones = casilla ? [{ ...(casilla.valorOriginal ? { valor: casilla.valorOriginal } : {}), etiqueta: casilla.etiqueta.trim() }] : [];
  } else if (tipoPideOpciones(form.tipo)) {
    opciones = opcionesEscritas(form).map(o => {
      const etiqueta = o.etiqueta.trim();
      if (conCodigos && o.codigo) return { valor: o.codigo, etiqueta };
      // Una opción que ya existía conserva su valor (las respuestas se leen por él); una nueva, sin valor, se llama como su etiqueta.
      if (!conCodigos && !form.opcionesConCodigos && o.valorOriginal) return { valor: o.valorOriginal, etiqueta };
      return { etiqueta };
    });
  }
  const escritas = opcionesEscritas(form).length;
  const maximo = tipoAdmiteMaximo(form.tipo) && form.maximoOpciones !== null && form.maximoOpciones >= 1 ? Math.min(form.maximoOpciones, Math.max(escritas, 1)) : null;
  const marcadas = form.formaciones.filter(f => FORMACIONES_ELEGIBLES.some(e => e.codigo === f));
  return {
    seccionId: form.seccionId,
    texto: form.texto.trim(),
    ayuda: form.ayuda.trim() ? form.ayuda.trim() : null,
    tipo: form.tipo,
    requerida: form.requerida,
    maximoOpciones: maximo,
    opciones,
    escala: tipoPideEscala(form.tipo)
      ? {
          min: form.escalaMin,
          max: form.escalaMax,
          etiquetaMin: form.etiquetaMin.trim() ? form.etiquetaMin.trim() : null,
          etiquetaMax: form.etiquetaMax.trim() ? form.etiquetaMax.trim() : null,
        }
      : null,
    seMuestraSi: form.condicion,
    alimenta: form.alimenta,
    formaciones: marcadas.length === 0 || marcadas.length === FORMACIONES_ELEGIBLES.length ? null : marcadas,
    precarga: form.precarga === 'NOMBRE_COMPLETO' || original?.precarga === 'NOMBRE_COMPLETO' ? 'NOMBRE_COMPLETO' : null,
  };
}

function firma(form: FormularioDePregunta): string {
  return JSON.stringify([
    form.seccionId,
    form.texto,
    form.ayuda,
    form.tipo,
    form.requerida,
    form.opciones.map(o => [o.etiqueta, o.codigo, o.valorOriginal]),
    form.maximoOpciones,
    form.escalaMin,
    form.escalaMax,
    form.etiquetaMin,
    form.etiquetaMax,
    form.condicion,
    form.alimenta,
    [...form.formaciones].sort(),
  ]);
}

export function hayCambios(actual: FormularioDePregunta, original: FormularioDePregunta): boolean {
  return firma(actual) !== firma(original);
}

/** ¿Dejó de alimentar un objetivo? Entonces la persona ya no lo tendrá preparado y hay que avisar antes de guardar. */
export function dejaDeAlimentarUnObjetivo(original: PreguntaAdmin | null, form: FormularioDePregunta): boolean {
  if (!original?.alimenta) return false;
  const eraObjetivo = original.alimenta === 'OBJETIVO_CUERPO' || original.alimenta === 'OBJETIVO_NEGOCIO' || original.alimenta === 'OBJETIVO_RELACIONES';
  return eraObjetivo && form.alimenta !== original.alimenta;
}

export const AVISO_AL_QUITAR_UN_OBJETIVO = 'Las personas ya no tendrán ese objetivo preparado: lo escribirán en Plan.';
