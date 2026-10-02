import { ApiError } from '../../../services/http/apiClient';
import type { MiEmergencia } from '../api/emergenciaSchemas';

/**
 * «Tuve una emergencia» (pedido del dueño del 02/10, backend D-244). Todo lo que decide algo vive acá,
 * sin React, para probarlo sin pantalla.
 *
 * El aprendiz elige un día entre 1 y el que vive hoy (89 como mucho: el 90 no se fija a mano) y cuenta en
 * pocas palabras qué pasó. Pedirlo no mueve nada: le llega a soporte, que lo revisa y le escribe.
 */

/** El mismo tope que el motivo de un ajuste de día: quien atiende puede pasarlo entero. */
export const LARGO_MAXIMO = 280;
export const PRIMER_DIA = 1;

/** El acceso en Yo: solo si ya empezó (hay a qué día volver) o si ya tiene un pedido abierto. */
export function mostrarAccesoDeEmergencia(mia: MiEmergencia | null): boolean {
  if (!mia) return false;
  return mia.diaMaximo >= PRIMER_DIA || !!mia.abierta;
}

/** El día dentro de 1..máximo. El selector arranca en el día de hoy y no sale del rango. */
export function acotarDiaPedido(dia: number, diaMaximo: number): number {
  const maximo = Math.max(PRIMER_DIA, diaMaximo);
  if (!Number.isFinite(dia)) return maximo;
  return Math.min(maximo, Math.max(PRIMER_DIA, Math.trunc(dia)));
}

export type ResultadoDelPedido =
  | { ok: true; cuerpo: { queOcurrio: string; diaPedido: number } }
  | { ok: false; error: string };

/** Revisa lo elegido y, si está bien, arma el cuerpo EXACTO del POST. */
export function validarPedido(entrada: { queOcurrio: string; diaPedido: number; diaMaximo: number }): ResultadoDelPedido {
  const texto = entrada.queOcurrio.trim();
  if (!texto) return { ok: false, error: 'Cuéntanos en pocas palabras qué pasó.' };
  if (texto.length > LARGO_MAXIMO) return { ok: false, error: `Escríbelo en ${LARGO_MAXIMO} caracteres o menos.` };
  const { diaPedido, diaMaximo } = entrada;
  if (!Number.isInteger(diaPedido) || diaPedido < PRIMER_DIA || diaPedido > diaMaximo) {
    return { ok: false, error: `Elige un día entre ${PRIMER_DIA} y ${diaMaximo}.` };
  }
  return { ok: true, cuerpo: { queOcurrio: texto, diaPedido } };
}

/** La pregunta de la confirmación. */
export function preguntaDelPedido(diaPedido: number): string {
  return `¿Pedir volver al día ${diaPedido}?`;
}

export function detalleDelPedido(diaActual: number): string {
  return `Hoy estás en el día ${diaActual}. Soporte lo revisa y te escribe por el chat.`;
}

/** El texto de cada error del POST, para una persona. Un 409 trae el motivo del servidor. */
export function mensajeDelErrorDelPedido(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.esDeRed) return 'Sin conexión. Tu pedido no se envió; vuelve a intentar en un momento.';
    if ((error.status === 409 || error.status === 400) && error.message) return error.message;
    if (error.status === 403) return 'Tu cuenta no puede enviar este pedido. Escríbele a soporte por el chat.';
    if (error.esNoAutenticado) return 'Tu sesión venció. Vuelve a entrar.';
  }
  return 'No se pudo enviar. Vuelve a intentar en un momento.';
}

/** El motivo con el que se abre «Cambiar día del programa» desde el chat: entra en los 280 del ajuste. */
export function motivoDelAjuste(queOcurrio: string): string {
  const motivo = `Emergencia: ${queOcurrio.trim()}`;
  return motivo.length > LARGO_MAXIMO ? `${motivo.slice(0, LARGO_MAXIMO - 1)}…` : motivo;
}

/** El renglón del aviso en el chat de soporte, para quien atiende. */
export function resumenParaSoporte(e: { diaPedido: number; diaActual: number }): string {
  return `Pide volver al día ${e.diaPedido} (hoy está en el día ${e.diaActual}).`;
}

/**
 * Si en este chat hay que preguntar por un pedido de emergencia: solo un soporte, con su aprendiz conocido
 * (un backend anterior a D-244 no lo manda) y para quien lo atiende (ADMIN o ALCHEMIST, los mismos que el
 * servidor deja leerlo). El aprendiz no ve el aviso en su propio chat: ya ve el mensaje.
 */
export function debeBuscarEmergenciaEnElChat(chat: {
  tipo: string;
  aprendizDelSoporte?: string | null;
  miRol: string | null | undefined;
}): boolean {
  const rol = chat.miRol?.toUpperCase();
  return chat.tipo === 'soporte' && !!chat.aprendizDelSoporte && (rol === 'ADMIN' || rol === 'ALCHEMIST');
}
