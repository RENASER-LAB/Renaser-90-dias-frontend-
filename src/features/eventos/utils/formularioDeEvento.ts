import type { Evento, ReglaDeAviso } from '../types/eventos.types';
import { esLinkSeguro, tipoDeUbicacionDelLink } from './linkDelEvento';
import { fechaEnZona, horaEnZona, instanteEnZona, zonaDelTelefono } from './zonaHoraria';

/**
 * El formulario mínimo para crear o editar un evento (E-6) y su traducción al cuerpo que espera
 * `POST/PUT /api/v1/calendar/events` (`EventoRequest` del backend).
 *
 * Los topes son los del agregado `Evento` del backend (título 30, descripción 300, ubicación 600):
 * se avisan acá, con palabras, en vez de dejar que el servidor responda un 400 en inglés.
 *
 * El backend exige que la ubicación sea coherente con su tipo: Meet/Zoom/enlace llevan URL, una
 * dirección lleva texto, y la llamada interna o el webinar no llevan nada. La app pide **un link o un
 * lugar**; el tipo sale solo del link (Meet → `MEET`, Zoom → `ZOOM`, Drive y el resto → `LINK`).
 */

export const MAX_TITULO = 30;
export const MAX_DESCRIPCION = 300;
export const MAX_UBICACION = 600;

/** Los tipos que ofrece el formulario, con su nombre en palabras simples. Mismo orden siempre. */
export const TIPOS_DE_EVENTO: ReadonlyArray<{ clave: string; nombre: string }> = [
  { clave: 'SESION_ESPECIAL', nombre: 'Sesión especial' },
  { clave: 'MENTORIA_ALQUIMISTA', nombre: 'Mentoría del Alquimista' },
  { clave: 'ESPONTANEO', nombre: 'Encuentro espontáneo' },
  { clave: 'SEMANA_MANIFESTACION', nombre: 'Semana de Manifestación' },
];

export const DURACIONES_MINUTOS: readonly number[] = [30, 60, 90, 120];

export interface FormularioDeEvento {
  titulo: string;
  descripcion: string;
  /** `YYYY-MM-DD`, en la zona del evento. */
  fecha: string;
  /** `HH:mm`, en la zona del evento. */
  hora: string;
  duracionMinutos: number;
  /** El link de Meet, Zoom o Drive, pegado tal cual. */
  link: string;
  /** Si no hay link: dónde es (una dirección). */
  lugar: string;
  tipoEvento: string;
  notificarAlCrear: boolean;
  zona: string;
}

export function formularioVacio(ahoraMs: number, zona: string = zonaDelTelefono()): FormularioDeEvento {
  // Mañana a las 19:00: una hora típica de clase, y nunca en el pasado.
  const manana = fechaEnZona(ahoraMs + 24 * 60 * 60 * 1000, zona);
  return {
    titulo: '',
    descripcion: '',
    fecha: manana,
    hora: '19:00',
    duracionMinutos: 60,
    link: '',
    lugar: '',
    tipoEvento: 'SESION_ESPECIAL',
    notificarAlCrear: true,
    zona,
  };
}

/**
 * Qué eventos se pueden editar desde la app. El formulario reenvía el evento COMPLETO (el backend no
 * tiene PATCH), y la respuesta no trae el detalle de la repetición ni el nivel/curso/grupo de la
 * audiencia: editarlos acá los borraría en silencio. Esos se cancelan, pero no se editan.
 */
export function sePuedeEditarEnLaApp(evento: Evento): boolean {
  if (evento.recurrente) return false;
  return evento.audiencia === null || evento.audiencia === 'ALL_MEMBERS' || evento.audiencia === 'ROLES';
}

export function formularioDesdeEvento(evento: Evento): FormularioDeEvento {
  const zona = evento.zona ?? zonaDelTelefono();
  const esDireccion = evento.tipoUbicacion === 'ADDRESS';
  return {
    titulo: evento.titulo,
    descripcion: evento.descripcion ?? '',
    fecha: fechaEnZona(evento.iniciaEn, zona),
    hora: horaEnZona(evento.iniciaEn, zona),
    duracionMinutos: evento.duracionMinutos ?? 60,
    link: esDireccion ? '' : evento.valorUbicacion ?? '',
    lugar: esDireccion ? evento.valorUbicacion ?? '' : '',
    tipoEvento: evento.tipoEvento ?? 'SESION_ESPECIAL',
    notificarAlCrear: evento.notificarAlCrear,
    zona,
  };
}

function aReglaDelCable(r: ReglaDeAviso): { kind: string; value: number | string } {
  if (r.tipo === 'minutosAntes') return { kind: 'minutesBefore', value: r.minutos };
  if (r.tipo === 'diasAntes') return { kind: 'daysBefore', value: r.dias };
  return { kind: 'timeOfDay', value: r.hora };
}

export type ResultadoDelFormulario =
  | { ok: true; cuerpo: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Valida y arma el cuerpo. `original` es el evento que se edita: de ahí salen lo que el formulario
 * no muestra y no se puede perder (audiencia, roles, avisos propios, tipo de ubicación sin valor).
 */
export function armarCuerpo(
  form: FormularioDeEvento,
  ahoraMs: number,
  original?: Evento | null,
): ResultadoDelFormulario {
  const titulo = form.titulo.trim();
  if (!titulo) return { ok: false, error: 'Escribe el nombre del evento.' };
  if (titulo.length > MAX_TITULO) return { ok: false, error: `El nombre puede tener hasta ${MAX_TITULO} letras.` };
  const descripcion = form.descripcion.trim();
  if (descripcion.length > MAX_DESCRIPCION) {
    return { ok: false, error: `La descripción puede tener hasta ${MAX_DESCRIPCION} letras.` };
  }

  const inicio = instanteEnZona(form.fecha, form.hora, form.zona);
  if (inicio === null) return { ok: false, error: 'Revisa la fecha y la hora.' };
  if (inicio <= ahoraMs) return { ok: false, error: 'La fecha y la hora tienen que ser más adelante que ahora.' };

  const link = form.link.trim();
  const lugar = form.lugar.trim();
  let ubicacion: { locationType: string; locationValue: string | null };
  if (link) {
    if (!esLinkSeguro(link)) return { ok: false, error: 'El link tiene que empezar con https://' };
    if (link.length > MAX_UBICACION) return { ok: false, error: 'El link es demasiado largo.' };
    ubicacion = { locationType: tipoDeUbicacionDelLink(link), locationValue: link };
  } else if (lugar) {
    if (lugar.length > MAX_UBICACION) return { ok: false, error: 'El lugar es demasiado largo.' };
    ubicacion = { locationType: 'ADDRESS', locationValue: lugar };
  } else if (original && (original.tipoUbicacion === 'INTERNAL_CALL' || original.tipoUbicacion === 'WEBINAR')) {
    ubicacion = { locationType: original.tipoUbicacion, locationValue: null };
  } else {
    return { ok: false, error: 'Pega el link de la reunión (Meet, Zoom o Drive) o escribe el lugar.' };
  }

  const cuerpo: Record<string, unknown> = {
    title: titulo,
    // El tipo no cambia al editar (el backend lo trata como inmutable): se reenvía el que tenía.
    eventType: original?.tipoEvento ?? form.tipoEvento,
    description: descripcion || null,
    startsAt: new Date(inicio).toISOString(),
    durationMinutes: form.duracionMinutos,
    timezone: form.zona,
    ...ubicacion,
    audienceType: original?.audiencia ?? 'ALL_MEMBERS',
    targetRoles: original?.audiencia === 'ROLES' ? original.rolesDestino : [],
    notifyOnCreate: form.notificarAlCrear,
  };
  // Sin `reminderRules` el backend usa los avisos por defecto del tipo. Si el evento tenía avisos
  // propios, se reenvían: omitirlos al editar los borraría.
  if (original?.reglasDeAviso && original.reglasDeAviso.length > 0) {
    cuerpo.reminderRules = original.reglasDeAviso.map(aReglaDelCable);
  }
  return { ok: true, cuerpo };
}
