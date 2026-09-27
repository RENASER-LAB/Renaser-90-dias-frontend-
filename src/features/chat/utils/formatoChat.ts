/**
 * Las reglas de forma del chat estilo WhatsApp (pedido del dueño, 2026-09-26): cómo se dice la
 * hora de un mensaje, qué separador de día le toca, qué se lee en la vista previa de la lista y
 * en qué orden van las conversaciones.
 *
 * Todo puro y sin React: recibe `ahora` en vez de leer el reloj, para que las pruebas no dependan
 * del día en que se corran. Las fechas se leen en la zona del TELÉFONO (los `get*` locales de
 * `Date`): es la hora que la persona tiene en la mano, igual que en WhatsApp.
 */

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function leerFecha(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function dos(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Medianoche local del día de `fecha`, para contar días de calendario y no bloques de 24 h. */
function inicioDelDia(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

/** Cuántos días de calendario separan `fecha` de `ahora` (0 = hoy, 1 = ayer). */
function diasAtras(fecha: Date, ahora: Date): number {
  return Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / 86_400_000);
}

/** «21:04» — la hora de un mensaje, en 24 h como WhatsApp en español. */
export function horaCorta(iso: string | null | undefined): string {
  const fecha = leerFecha(iso);
  return fecha ? `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}` : '';
}

/**
 * La hora a la derecha de una fila de la lista: «21:04» si fue hoy, «Ayer», el día de la semana
 * («lun») dentro de la última semana, y la fecha («25/09», o «25/09/25» de otro año) si es más
 * vieja. Sin fecha, vacío: una fila sin mensajes no muestra hora.
 */
export function horaDeLaLista(iso: string | null | undefined, ahora: Date): string {
  const fecha = leerFecha(iso);
  if (!fecha) return '';
  const dias = diasAtras(fecha, ahora);
  if (dias <= 0) return horaCorta(iso);
  if (dias === 1) return 'Ayer';
  if (dias < 7) return DIAS_CORTOS[fecha.getDay()];
  const base = `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}`;
  return fecha.getFullYear() === ahora.getFullYear() ? base : `${base}/${dos(fecha.getFullYear() % 100)}`;
}

/** El separador de día dentro de una conversación: «Hoy», «Ayer», «25 de septiembre». */
export function etiquetaDeDia(iso: string | null | undefined, ahora: Date): string {
  const fecha = leerFecha(iso);
  if (!fecha) return '';
  const dias = diasAtras(fecha, ahora);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  const base = `${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
  return fecha.getFullYear() === ahora.getFullYear() ? base : `${base} de ${fecha.getFullYear()}`;
}

/** Los tipos de mensaje que distingue la vista previa. Mismo vocabulario que `ChatMessageType`. */
export type TipoDeVistaPrevia = 'text' | 'audio' | 'image_grid' | 'video';

/**
 * Lo que se lee bajo el nombre en la lista: el texto, «📷 Foto», «🎤 Audio» o «🎥 Video», con
 * «Tú: » delante si lo mandó la persona. Una foto con texto dice «📷 texto», como WhatsApp.
 *
 * Los emojis son de Unicode 6.0 (2010): se ven en cualquier Android que corra la app.
 */
export function vistaPreviaDelMensaje(ultimo: {
  tipo: TipoDeVistaPrevia;
  texto: string | null | undefined;
  esMio: boolean;
} | null): string {
  if (!ultimo) return 'Todavía no hay mensajes';
  const texto = ultimo.texto?.trim() ?? '';
  let cuerpo: string;
  if (ultimo.tipo === 'image_grid') cuerpo = texto ? `📷 ${texto}` : '📷 Foto';
  else if (ultimo.tipo === 'audio') cuerpo = '🎤 Audio';
  else if (ultimo.tipo === 'video') cuerpo = texto ? `🎥 ${texto}` : '🎥 Video';
  else cuerpo = texto;
  return ultimo.esMio ? `Tú: ${cuerpo}` : cuerpo;
}

/**
 * Las conversaciones más activas primero, como WhatsApp: por la fecha del último mensaje, y si no
 * hay ninguno, por la de creación. Las que no traen ninguna de las dos van al final, en el orden
 * en que llegaron. No modifica la lista que recibe.
 */
export function ordenarPorActividad<T extends { lastMessageAt?: string | null; createdAt?: string | null }>(
  conversaciones: readonly T[]
): T[] {
  const marca = (conversacion: T) =>
    leerFecha(conversacion.lastMessageAt)?.getTime() ?? leerFecha(conversacion.createdAt)?.getTime() ?? null;
  return conversaciones
    .map((conversacion, indice) => ({ conversacion, indice, cuando: marca(conversacion) }))
    .sort((a, b) => {
      if (a.cuando === null && b.cuando === null) return a.indice - b.indice;
      if (a.cuando === null) return 1;
      if (b.cuando === null) return -1;
      return b.cuando - a.cuando || a.indice - b.indice;
    })
    .map(x => x.conversacion);
}

/** Lo mínimo de un mensaje que hace falta para agruparlo. */
export type MensajeAgrupable = {
  id: string;
  isMe: boolean;
  sender: string;
  senderId?: string;
  createdAt?: string;
};

export type ElementoDelChat<M extends MensajeAgrupable> =
  | { tipo: 'dia'; clave: string; etiqueta: string }
  | {
      tipo: 'mensaje';
      clave: string;
      mensaje: M;
      /** Primero de una tanda del mismo remitente: lleva la cola y, en grupos, el nombre. */
      primeroDeLaTanda: boolean;
      /** Último de la tanda: debajo va más aire antes del siguiente remitente. */
      ultimoDeLaTanda: boolean;
    };

/**
 * Más de este intervalo entre dos mensajes del mismo remitente corta la tanda: tras diez minutos
 * de silencio, lo que sigue ya es otra conversación y vuelve a llevar nombre y cola.
 */
export const PAUSA_QUE_CORTA_LA_TANDA_MS = 10 * 60 * 1000;

function remitenteDe(mensaje: MensajeAgrupable): string {
  if (mensaje.isMe) return '__yo__';
  return mensaje.senderId ?? `nombre:${mensaje.sender}`;
}

/**
 * La lista que pinta la conversación: separadores de día entre los mensajes y cada mensaje marcado
 * como primero o último de su tanda (mensajes seguidos del mismo remitente, el mismo día y sin una
 * pausa larga). Recibe los mensajes del más viejo al más nuevo, que es como los deja el hook.
 *
 * Un mensaje sin fecha no abre día nuevo: se queda en el del anterior.
 */
export function agruparMensajes<M extends MensajeAgrupable>(mensajes: readonly M[], ahora: Date): ElementoDelChat<M>[] {
  const elementos: ElementoDelChat<M>[] = [];
  let diaActual: number | null = null;
  let anterior: M | null = null;
  let indiceAnterior = -1;

  mensajes.forEach(mensaje => {
    const fecha = leerFecha(mensaje.createdAt);
    const dia = fecha ? inicioDelDia(fecha) : diaActual;
    const cambioDeDia = dia !== null && dia !== diaActual;
    if (cambioDeDia) {
      elementos.push({ tipo: 'dia', clave: `dia-${dia}`, etiqueta: etiquetaDeDia(mensaje.createdAt, ahora) });
      diaActual = dia;
    }

    const fechaAnterior = anterior ? leerFecha(anterior.createdAt) : null;
    const pausaLarga =
      !!fecha && !!fechaAnterior && fecha.getTime() - fechaAnterior.getTime() > PAUSA_QUE_CORTA_LA_TANDA_MS;
    const sigueLaTanda = !!anterior && !cambioDeDia && !pausaLarga && remitenteDe(anterior) === remitenteDe(mensaje);

    if (!sigueLaTanda && indiceAnterior >= 0) {
      const previo = elementos[indiceAnterior];
      if (previo.tipo === 'mensaje') previo.ultimoDeLaTanda = true;
    }
    elementos.push({
      tipo: 'mensaje',
      clave: mensaje.id,
      mensaje,
      primeroDeLaTanda: !sigueLaTanda,
      ultimoDeLaTanda: false,
    });
    indiceAnterior = elementos.length - 1;
    anterior = mensaje;
  });

  const ultimo = elementos[indiceAnterior];
  if (ultimo && ultimo.tipo === 'mensaje') ultimo.ultimoDeLaTanda = true;
  return elementos;
}

/*
 * Colores para el nombre del remitente en los grupos. Tonos tierra que conversan con el dorado
 * de Renaser (nada del verde de WhatsApp) y que pasan AA sobre la burbuja clara (#FFFFFF) o sobre
 * la oscura (#201F1C) respectivamente.
 */
const COLORES_CLAROS = ['#8A5A12', '#9C3D2E', '#5B6B1F', '#2F5E73', '#7A3E6B', '#6B4E2E', '#8C4A1C', '#3F5B45'];
const COLORES_OSCUROS = ['#E0B868', '#F0957F', '#C4D17A', '#8EC3DB', '#DDA0CF', '#D7B48C', '#F2A86B', '#9FD1AE'];

/** El color de una persona en los chats de grupo: siempre el mismo para el mismo remitente. */
export function colorDeRemitente(clave: string, oscuro: boolean): string {
  let hash = 0;
  for (let i = 0; i < clave.length; i++) {
    hash = (hash * 31 + clave.charCodeAt(i)) | 0;
  }
  const paleta = oscuro ? COLORES_OSCUROS : COLORES_CLAROS;
  return paleta[Math.abs(hash) % paleta.length];
}

/**
 * La línea bajo el nombre en la cabecera de una conversación: «Grupo · 3 integrantes» en un grupo
 * (sin cifra mientras no se sabe cuántos son: nunca se inventa), y en el resto el subtítulo que ya
 * trae la conversación («Aprendiz · 1 a 1», «Soporte · Equipo Renaser»).
 */
export function subtituloDeLaCabecera(params: {
  tipo: 'celula' | 'direct' | 'global' | 'soporte';
  integrantes: number | null;
  subtitulo: string;
}): string {
  if (params.tipo !== 'celula') return params.subtitulo;
  if (params.integrantes === null) return 'Grupo · toca para ver quiénes son';
  return `Grupo · ${params.integrantes} ${params.integrantes === 1 ? 'integrante' : 'integrantes'}`;
}
