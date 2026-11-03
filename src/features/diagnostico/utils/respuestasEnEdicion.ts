import type { DiagnosticoParaLaPersona, PreguntaDelDiagnostico, RespuestaDelDiagnostico } from '../types/diagnostico.types';

/**
 * Lo que la persona va escribiendo en el diagnóstico, sin React (spec 026). El servidor guarda cada respuesta en cinco columnas
 * (`RespuestaDelDiagnostico`); mientras se escribe es más cómodo tener una sola forma plana, igual para todos los tipos de
 * pregunta, y traducirla al guardar. Aquí está esa traducción en los dos sentidos.
 *
 * Reglas que NO cambian entre una pregunta y otra:
 * - Una respuesta vacía se manda con todos los valores en `null` (el servidor borra la anterior): nunca una cadena vacía.
 * - Lo que ya viene del servidor (`respuestas`) manda sobre la precarga: la precarga solo llena lo que no se ha respondido.
 * - Un texto con solo espacios es «sin respuesta».
 */

/** Una respuesta mientras se edita: todos los campos existen siempre, y cada tipo usa el suyo. */
export interface RespuestaEnEdicion {
  /** TEXTO, AREA_TEXTO, FECHA (`DD/MM/AAAA`) y la opción de SELECCION_UNICA; en NUMERO, lo que se tecleó. */
  texto: string;
  /** SELECCION_MULTIPLE: los `valor` de las opciones marcadas. */
  valores: string[];
  /** CUADRICULA: el número elegido por cada fila (clave = `valor` de la fila). */
  filas: Record<string, number>;
  /** ESCALA. */
  escala: number | null;
  /** CASILLA (el consentimiento). */
  marcada: boolean;
}

export type ValoresDelDiagnostico = Record<number, RespuestaEnEdicion>;

export const RESPUESTA_VACIA: RespuestaEnEdicion = Object.freeze({
  texto: '',
  valores: [] as string[],
  filas: {} as Record<string, number>,
  escala: null,
  marcada: false,
}) as RespuestaEnEdicion;

export function respuestaDe(valores: ValoresDelDiagnostico, preguntaId: number): RespuestaEnEdicion {
  return valores[preguntaId] ?? RESPUESTA_VACIA;
}

/** El texto de un número tecleado como número: acepta la coma decimal («3,5»). `null` si no es un número. */
export function numeroDelTexto(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '' || !/^-?\d+(\.\d+)?$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** Lo que se acepta teclear en un campo numérico: dígitos, un signo al principio y un solo separador decimal. */
export function limpiarNumeroTecleado(texto: string): string {
  const soloValidos = texto.replace(/[^0-9.,-]/g, '');
  const negativo = soloValidos.startsWith('-');
  const sinSigno = soloValidos.replace(/-/g, '');
  const separador = sinSigno.search(/[.,]/);
  const cuerpo =
    separador === -1 ? sinSigno : sinSigno.slice(0, separador + 1) + sinSigno.slice(separador + 1).replace(/[.,]/g, '');
  return (negativo ? '-' : '') + cuerpo;
}

function leerJson(texto: string | null): unknown {
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/** Lo guardado de una pregunta → lo que se edita. Lo que no se entiende queda vacío en vez de romper. */
export function desdeRespuesta(pregunta: PreguntaDelDiagnostico, r: RespuestaDelDiagnostico): RespuestaEnEdicion {
  switch (pregunta.tipo) {
    case 'NUMERO':
      return { ...RESPUESTA_VACIA, texto: r.valorNumero !== null ? String(r.valorNumero) : (r.valorTexto ?? '') };
    case 'SELECCION_MULTIPLE': {
      const json = leerJson(r.valorJson);
      const valores = Array.isArray(json) ? json.filter((v): v is string => typeof v === 'string') : [];
      return { ...RESPUESTA_VACIA, valores };
    }
    case 'CUADRICULA': {
      const json = leerJson(r.valorJson);
      const filas: Record<string, number> = {};
      if (json && typeof json === 'object' && !Array.isArray(json)) {
        for (const [fila, valor] of Object.entries(json as Record<string, unknown>)) {
          if (typeof valor === 'number' && Number.isFinite(valor)) filas[fila] = valor;
        }
      }
      return { ...RESPUESTA_VACIA, filas };
    }
    case 'ESCALA':
      return { ...RESPUESTA_VACIA, escala: r.valorEscala };
    case 'CASILLA':
      return { ...RESPUESTA_VACIA, marcada: r.valorBooleano === true };
    default:
      return { ...RESPUESTA_VACIA, texto: r.valorTexto ?? '' };
  }
}

/** ¿No hay nada respondido en esta pregunta? */
export function estaVacia(pregunta: PreguntaDelDiagnostico, e: RespuestaEnEdicion): boolean {
  switch (pregunta.tipo) {
    case 'SELECCION_MULTIPLE':
      return e.valores.length === 0;
    case 'CUADRICULA':
      return Object.keys(e.filas).length === 0;
    case 'ESCALA':
      return e.escala === null;
    case 'CASILLA':
      return !e.marcada;
    default:
      return e.texto.trim() === '';
  }
}

const TODOS_NULL = { valorTexto: null, valorNumero: null, valorBooleano: null, valorEscala: null, valorJson: null } as const;

/** Lo que se edita → lo que se guarda. Vacío (o un número que no lo es) = todo `null`, que borra la respuesta anterior. */
export function aRespuesta(pregunta: PreguntaDelDiagnostico, e: RespuestaEnEdicion): RespuestaDelDiagnostico {
  const vacia: RespuestaDelDiagnostico = { preguntaId: pregunta.id, ...TODOS_NULL };
  if (estaVacia(pregunta, e)) return vacia;
  switch (pregunta.tipo) {
    case 'NUMERO': {
      const n = numeroDelTexto(e.texto);
      return n === null ? vacia : { ...vacia, valorNumero: n };
    }
    case 'SELECCION_MULTIPLE': {
      /* En el orden de las opciones, no en el de los toques: la misma elección se guarda igual. */
      const ordenadas = pregunta.opciones.map(o => o.valor).filter(v => e.valores.includes(v));
      const extras = e.valores.filter(v => !ordenadas.includes(v));
      const todas = [...ordenadas, ...extras];
      return todas.length ? { ...vacia, valorJson: JSON.stringify(todas) } : vacia;
    }
    case 'CUADRICULA': {
      const salida: Record<string, number> = {};
      for (const fila of pregunta.opciones) {
        if (typeof e.filas[fila.valor] === 'number') salida[fila.valor] = e.filas[fila.valor];
      }
      return Object.keys(salida).length ? { ...vacia, valorJson: JSON.stringify(salida) } : vacia;
    }
    case 'ESCALA':
      return { ...vacia, valorEscala: e.escala };
    case 'CASILLA':
      return { ...vacia, valorBooleano: true };
    default:
      return { ...vacia, valorTexto: e.texto.trim() };
  }
}

/** Lo que ya consta de la solicitud (el nombre) para confirmarlo; solo entra donde tiene sentido como texto. */
export function aplicarPrecarga(pregunta: PreguntaDelDiagnostico, precarga: string): RespuestaEnEdicion {
  switch (pregunta.tipo) {
    case 'TEXTO':
    case 'AREA_TEXTO':
    case 'NUMERO':
    case 'FECHA':
      return { ...RESPUESTA_VACIA, texto: precarga };
    case 'SELECCION_UNICA':
      return pregunta.opciones.some(o => o.valor === precarga) ? { ...RESPUESTA_VACIA, texto: precarga } : RESPUESTA_VACIA;
    default:
      return RESPUESTA_VACIA;
  }
}

/**
 * Lo que la persona ya tiene al abrir el diagnóstico: sus respuestas guardadas y, donde no hay ninguna, la precarga. Solo
 * trae las preguntas que tienen algo; el resto se lee como vacío con `respuestaDe`.
 */
export function valoresIniciales(datos: DiagnosticoParaLaPersona): ValoresDelDiagnostico {
  const guardadas = new Map(datos.respuestas.map(r => [r.preguntaId, r]));
  const valores: ValoresDelDiagnostico = {};
  for (const seccion of datos.secciones) {
    for (const pregunta of seccion.preguntas) {
      const guardada = guardadas.get(pregunta.id);
      if (guardada) {
        valores[pregunta.id] = desdeRespuesta(pregunta, guardada);
      } else if (pregunta.precarga) {
        valores[pregunta.id] = aplicarPrecarga(pregunta, pregunta.precarga);
      }
    }
  }
  return valores;
}
