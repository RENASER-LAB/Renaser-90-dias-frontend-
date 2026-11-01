import type { PreguntaDelDiagnostico } from '../types/diagnostico.types';
import type { PasoDelRecorrido } from './pasosDelRecorrido';
import {
  estaVacia,
  numeroDelTexto,
  respuestaDe,
  type RespuestaEnEdicion,
  type ValoresDelDiagnostico,
} from './respuestasEnEdicion';
import { partirFecha, diasDelMes } from '../../../components/fechaEnRuedas/logicaDeFecha';

/**
 * Qué falta para pasar de un paso (spec 026, FR-008), sin React. Cada pregunta dice, con SU mensaje y en tuteo, qué le falta:
 * la pantalla marca esa pregunta y lleva la vista hasta ella (nada de diálogos genéricos).
 *
 * - Una pregunta obligatoria vacía no deja avanzar. Una opcional vacía sí.
 * - **El consentimiento (CASILLA) siempre se marca**, sea cual sea su `requerida`: el diagnóstico no se termina sin él (FR-012).
 * - **Una cuadrícula con filas a medias no pasa**, aunque sea opcional: o se responde entera o no se toca (FR-005, escenario 6).
 * - Lo que se escribe tiene que ser del tipo de la pregunta: un número, una fecha que existe, no más opciones que el máximo.
 */

export type ErroresDelPaso = Record<number, string>;

/** El mensaje de lo que falta en una pregunta, o `null` si está bien. */
export function mensajeDeLaPregunta(pregunta: PreguntaDelDiagnostico, e: RespuestaEnEdicion): string | null {
  const vacia = estaVacia(pregunta, e);

  switch (pregunta.tipo) {
    case 'CASILLA':
      return e.marcada ? null : 'Marca la casilla para continuar.';

    case 'CUADRICULA': {
      const total = pregunta.opciones.length;
      const respondidas = pregunta.opciones.filter(o => typeof e.filas[o.valor] === 'number').length;
      if (respondidas === total && total > 0) return null;
      if (vacia && !pregunta.requerida) return null;
      return 'Responde todas las filas para continuar.';
    }

    case 'SELECCION_MULTIPLE': {
      if (vacia) return pregunta.requerida ? 'Elige al menos una opción para continuar.' : null;
      const maximo = pregunta.maximoOpciones;
      if (maximo !== null && e.valores.length > maximo) return `Elige como máximo ${maximo}.`;
      return null;
    }

    case 'SELECCION_UNICA':
      return vacia && pregunta.requerida ? 'Elige una opción para continuar.' : null;

    case 'ESCALA': {
      if (vacia) {
        if (!pregunta.requerida) return null;
        return pregunta.escala ? `Elige un número del ${pregunta.escala.min} al ${pregunta.escala.max}.` : 'Elige un número.';
      }
      const escala = pregunta.escala;
      if (escala && e.escala !== null && (e.escala < escala.min || e.escala > escala.max)) {
        return `Elige un número del ${escala.min} al ${escala.max}.`;
      }
      return null;
    }

    case 'NUMERO': {
      if (vacia) return pregunta.requerida ? 'Escribe un número para continuar.' : null;
      return numeroDelTexto(e.texto) === null ? 'Escribe solo números.' : null;
    }

    case 'FECHA': {
      if (vacia) return pregunta.requerida ? 'Elige una fecha para continuar.' : null;
      const fecha = partirFecha(e.texto);
      return fecha && fecha.dia <= diasDelMes(fecha.mes, fecha.anio) ? null : 'Esa fecha no es válida.';
    }

    default: {
      /* TEXTO y AREA_TEXTO. */
      if (vacia) return pregunta.requerida ? 'Escribe tu respuesta para continuar.' : null;
      const maximo = pregunta.largoMaximo;
      if (maximo !== null && e.texto.trim().length > maximo) return `Usa como máximo ${maximo} caracteres.`;
      return null;
    }
  }
}

/** Lo que falta en las preguntas de un paso, por id de pregunta. Vacío = se puede avanzar. */
export function validarPaso(paso: PasoDelRecorrido, valores: ValoresDelDiagnostico): ErroresDelPaso {
  const errores: ErroresDelPaso = {};
  for (const pregunta of paso.preguntas) {
    const mensaje = mensajeDeLaPregunta(pregunta, respuestaDe(valores, pregunta.id));
    if (mensaje) errores[pregunta.id] = mensaje;
  }
  return errores;
}

/** La primera pregunta que falta en TODO el recorrido (por si un borrador restaurado dejó algo atrás), o `null`. */
export function primerPasoConFalta(
  pasos: readonly PasoDelRecorrido[],
  valores: ValoresDelDiagnostico,
): { indice: number; preguntaId: number; mensaje: string } | null {
  for (let indice = 0; indice < pasos.length; indice++) {
    for (const pregunta of pasos[indice].preguntas) {
      const mensaje = mensajeDeLaPregunta(pregunta, respuestaDe(valores, pregunta.id));
      if (mensaje) return { indice, preguntaId: pregunta.id, mensaje };
    }
  }
  return null;
}
