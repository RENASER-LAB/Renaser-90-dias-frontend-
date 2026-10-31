import { tituloEnTipoOracion } from '../../habits/utils/tituloEnTipoOracion';
import type {
  AccionDeLaPersona,
  DiaDeLaPersona,
  ObligacionDeLaPersona,
  ResumenDeLaSemana,
} from '../types/cumplimientoDelLider.types';

/**
 * Cómo se DICE la semana de una persona al líder (spec 005). Funciones puras —ni React ni red— para
 * probar cada texto sin montar una pantalla.
 *
 * Tres reglas que no se negocian:
 *
 * - **El color y la forma nunca van solos** (RL-30, AGENTS.md §4): cada estado tiene su palabra.
 * - **La falta de datos no es incumplimiento**: un día en pausa, antes del Día 1 o sin hábitos se dice con
 *   su motivo, nunca como «no cumplido» (FR-019).
 * - **Lo que no se entiende no se afirma**: un estado nuevo del servidor se lee como «Sin estado».
 *
 * El vocabulario de la entrega es el de la ficha del mentor (`AlumnoScreen`), para que el líder y el mentor
 * lean lo mismo de la misma persona.
 */

/** ¿Hay algo escrito, un archivo o una publicación que respalde el cumplimiento? */
function tieneEvidencia(o: ObligacionDeLaPersona): boolean {
  return o.evidencias.length > 0 || o.respuestaTexto !== null || o.publicacionId !== null;
}

/**
 * La palabra del estado de un hábito. Un hábito cumplido que no exigía evidencia y no tiene nada que ver
 * dice «Cumplido · sin evidencia» (y no ofrece un botón que no abre nada).
 */
export function estadoDeLaObligacionEnPalabras(o: ObligacionDeLaPersona): string {
  switch (o.estado) {
    case 'COMPLETADO': {
      const noExigia = o.entrega === null || o.entrega === 'NO_REQUERIDA';
      return !tieneEvidencia(o) && noExigia ? 'Cumplido · sin evidencia' : 'Cumplido';
    }
    case 'FALLIDO':
      return 'No cumplido';
    case 'EXPIRADO':
      return 'Venció';
    case 'EN_CURSO':
      return 'En curso';
    case 'PENDIENTE':
      return 'Pendiente';
    default:
      return 'Sin estado';
  }
}

/** Qué pasó con la evidencia: la entrega y su revisión son dos hechos, se dicen los dos. `null` si no se exigía. */
export function entregaEnPalabras(o: ObligacionDeLaPersona): string | null {
  if (o.entrega === null || o.entrega === 'NO_REQUERIDA') return null;
  if (o.entrega === 'SIN_ENTREGA') return 'Evidencia sin entregar';
  if (o.publicacionId !== null && o.revision === null) return 'Publicado en el Muro';
  switch (o.revision) {
    case 'VALIDA':
      return 'Evidencia entregada · verificada';
    case 'RECHAZADA':
      return 'Evidencia entregada · rechazada';
    case 'REVISION_MANUAL':
      return 'Evidencia entregada · en revisión';
    default:
      return 'Evidencia entregada · pendiente de revisión';
  }
}

/** Qué botones ofrece un hábito: el que abre las evidencias y las respuestas, y el de la publicación. */
export function queSePuedeAbrir(o: ObligacionDeLaPersona): { evidencia: boolean; publicacion: boolean } {
  return { evidencia: o.evidencias.length > 0 || o.respuestaTexto !== null, publicacion: o.publicacionId !== null };
}

/**
 * Por qué un día no tiene porcentaje, en una frase corta para la cabecera del día. `null` si el día se midió.
 *
 * Ninguna suena a incumplimiento ni a «sin datos»: `EN_CURSO` es hoy (el día corre y el semáforo solo mide los
 * días que cierran) y `FUTURO` es un día que todavía no llega (el servidor ya no lo manda; se lee igual por si acaso).
 */
export function motivoDelDiaEnPalabras(motivo: string | null): string | null {
  switch (motivo) {
    case null:
      return null;
    case 'PAUSADO':
      return 'En pausa';
    case 'CUENTA_SUSPENDIDA':
      return 'Cuenta en pausa';
    case 'NO_ACTIVADO':
      return 'Todavía no empezaba su programa';
    case 'SIN_NADA_PLANIFICADO':
      return 'Nada programado este día';
    case 'PENDIENTE_DE_CALCULO':
      return 'Todavía sin calcular';
    case 'FUERA_DEL_PROGRAMA':
      return 'Fuera del programa';
    case 'EN_CURSO':
      return 'Hoy, todavía sin cerrar';
    case 'FUTURO':
      return 'Este día todavía no llega';
    default:
      return 'Sin hábitos que medir este día';
  }
}

/**
 * Lo que dice un día abierto que no tiene hábitos ni acciones. Hoy y los días que vienen no dicen «no hay nada que
 * medir»: hoy se mide cuando cierra, y el futuro todavía no existe.
 */
export function textoDelDiaVacio(motivo: string | null): string {
  switch (motivo) {
    case 'FUTURO':
      return 'Este día todavía no llega.';
    case 'EN_CURSO':
      return 'Hoy todavía no tiene nada registrado. El día se mide cuando cierra.';
    default: {
      const palabras = motivoDelDiaEnPalabras(motivo);
      return palabras ? `${palabras}. No hay nada que medir este día.` : 'Sin hábitos programados este día.';
    }
  }
}

/** Lo que oye quien no ve la fila: `Ritual de la mañana. Cumplido. Evidencia entregada · verificada.` */
export function dichoDeLaObligacion(o: ObligacionDeLaPersona): string {
  return [tituloEnTipoOracion(o.titulo), estadoDeLaObligacionEnPalabras(o), entregaEnPalabras(o)]
    .filter((parte): parte is string => Boolean(parte))
    .map(parte => `${parte}.`)
    .join(' ');
}

/**
 * La palabra del estado de una acción del día. El contrato manda dos: `COMPLETADA` (solo se completa entregando
 * evidencia) y `PENDIENTE`. Cualquier otro valor no se afirma (`null`): no se inventa un «no cumplida».
 */
export function accionEnPalabras(a: AccionDeLaPersona): string | null {
  switch (a.estado) {
    case 'COMPLETADA':
      return 'Cumplida';
    case 'PENDIENTE':
      return 'Pendiente';
    default:
      return null;
  }
}

/**
 * «1 de 3 hábitos cumplidos»: una cuenta de lo que se ve en el día, sin porcentaje (el % es del servidor
 * y vale para la semana). `null` si el día no tiene hábitos.
 */
export function contadorDelDia(dia: Pick<DiaDeLaPersona, 'obligaciones'>): string | null {
  const total = dia.obligaciones.length;
  if (total === 0) return null;
  const cumplidos = dia.obligaciones.filter(o => o.estado === 'COMPLETADO').length;
  return `${cumplidos} de ${total} ${total === 1 ? 'hábito cumplido' : 'hábitos cumplidos'}`;
}

/**
 * Las palabras de la ficha del mentor sin lo de la evidencia: `30 cumplidos · 2 sin cumplir · 3 pendientes`.
 *
 * > **Corregido 2026-10-29 (spec 018).** Terminaba en `· 12 con evidencia`. Ese dato pasó a la tarjeta «¿Subió evidencias?»
 * > de arriba de la ficha («4 de 12», de los hábitos que la piden): dos cifras de evidencia distintas en la misma pantalla
 * > se leían como una contradicción.
 */
export function resumenDeLaSemanaEnPalabras(r: ResumenDeLaSemana): string {
  return `${r.cumplidas} cumplidos · ${r.sinCumplir} sin cumplir · ${r.pendientes} pendientes`;
}

/** Quién es alguien que no se mide en el semáforo (el mentor y la guía con programa propio). */
export { rolEnPalabras } from '../../semaforo/utils/ayudaDelSemaforo';

export function tipoDeEvidenciaEnPalabras(tipo: string | null): string {
  switch (tipo) {
    case 'FOTO':
      return 'Foto';
    case 'AUDIO':
      return 'Audio';
    case 'VIDEO':
      return 'Video';
    case 'TEXTO':
      return 'Texto';
    default:
      return 'Evidencia';
  }
}

/**
 * Por qué no se pudo abrir una evidencia, dicho al líder. `reintentar` es `false` cuando repetir no sirve:
 * la evidencia ya no está, o la cuenta no puede verla.
 */
export function textoDelFalloDeEvidencia(motivo: 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error'): {
  texto: string;
  reintentar: boolean;
} {
  switch (motivo) {
    case 'no_disponible':
      return { texto: 'Ya no está disponible.', reintentar: false };
    case 'sin_permiso':
      return { texto: 'Tu cuenta no puede abrir esta evidencia.', reintentar: false };
    case 'sin_red':
      return { texto: 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.', reintentar: true };
    default:
      return { texto: 'No pudimos abrir la evidencia. Vuelve a intentarlo.', reintentar: true };
  }
}

/**
 * Por qué no se pudo abrir la publicación del post diario. Se lee en `GET /wall/{id}`, que sirve a su autor, al
 * liderazgo y al mentor o la guía que acompaña HOY al autor: otra cuenta (o un mentor que ya no lo acompaña) recibe
 * 403, que se dice con todas sus letras; una publicación borrada u oculta, 404. Repetir no ayuda en ninguno de los dos.
 */
export function textoDelFalloDeLaPublicacion(motivo: 'no_disponible' | 'sin_permiso' | 'sin_red' | 'error'): {
  texto: string;
  reintentar: boolean;
} {
  switch (motivo) {
    case 'no_disponible':
      return { texto: 'Ya no está disponible.', reintentar: false };
    case 'sin_permiso':
      return {
        texto: 'No puedes ver esta publicación: solo la ven quien la escribió, el liderazgo y quien acompaña hoy a su grupo.',
        reintentar: false,
      };
    case 'sin_red':
      return { texto: 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.', reintentar: true };
    default:
      return { texto: 'No pudimos abrir la publicación. Vuelve a intentarlo.', reintentar: true };
  }
}
