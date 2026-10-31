/**
 * Hasta cuándo vale el aviso de inicio de un hábito (issue #40, 2026-10-31). Pura: no toca la librería ni el reloj.
 *
 * ## La regla
 *
 * «Un aviso de inicio vale hasta la hora del hábito; después no se muestra.» Es el criterio que el dueño ya aceptó para
 * el servidor (FR-015: es preferible no avisar a avisar algo falso). El hábito se sigue registrando todo su día (D-259);
 * lo que deja de tener sentido es una notificación que dice «Te toca a las 07:00.» a las 08:58.
 *
 * ## Por qué hace falta en el teléfono
 *
 * La alarma local de un hábito se entrega cuando Android la dispara. Con el permiso «Alarmas y recordatorios» es una
 * alarma del usuario (`setAlarmClock`, spec 007) y suena a su hora. Sin el permiso es inexacta (`setAndAllowWhileIdle`) y
 * el sistema puede entregarla mucho después: el rearmado documenta alarmas con `window=+1h` y una medida de `+40m59s`
 * (e2e del 26/10). `expo-notifications` la muestra igual, con el texto fijo, sin mirar qué tan tarde llegó
 * (`ExpoSchedulingDelegate.triggerNotification`), y nada quita de la bandeja el aviso que ya se mostró.
 *
 * ## Cómo se aplica (dos lugares, una regla)
 *
 * - **Al entregarse** (Android, `scripts/arreglar-aviso-tardio.js`): el aviso lleva `data.vigenteMin`, los minutos desde su
 *   hora nominal durante los que sigue siendo verdad (`vigenciaDelAvisoMin`). Si el atraso lo pasa, el teléfono no lo
 *   muestra; la alarma diaria o semanal se vuelve a armar igual para el día siguiente.
 * - **Al abrir la app o volver al frente** (`alarmas/limpiarAvisosVencidos.ts`): se quitan de la bandeja los avisos cuya
 *   hora ya pasó (o cuyo hábito ya se cumplió). Esa limpieza no depende de `data.vigenteMin`: lee el aviso por su texto,
 *   así alcanza también a los que mostró una versión anterior de la app.
 *
 * ## Lo que NO es un aviso de inicio
 *
 * Las repeticiones («Repetir si no la atiendo», spec 009) dicen «Te tocaba a las …» y suenan DESPUÉS de la hora a
 * propósito; los avisos de las acciones de los objetivos y de los eventos llevan otra ruta. Nada de eso se toca.
 */

/**
 * Cuánto pasa de la hora del hábito y el aviso todavía se muestra. No es una concesión al atraso: es la holgura normal
 * de una alarma (el sistema sale de Doze unos segundos antes, o la entrega unos segundos después) para que «a la hora»
 * —antelación 0— no se descarte por llegar a las 07:00:03. SUPUESTO del equipo, a confirmar con el dueño.
 */
export const GRACIA_DEL_AVISO_MIN = 2;

/**
 * Cuánto antes de la hora del hábito se admite que un aviso figure como publicado (reloj del teléfono que se corrige, o
 * un `postTime` redondeado). Solo sirve para ubicar a qué día pertenece un aviso: ver {@link horaDelHabitoDelAviso}.
 */
const HOLGURA_DE_PUBLICACION_MS = 60_000;

/** Los minutos, desde su hora nominal, durante los que un aviso de inicio de `minutosAntes` sigue siendo verdad. */
export function vigenciaDelAvisoMin(minutosAntes: number): number {
  return Math.max(0, Math.round(minutosAntes)) + GRACIA_DEL_AVISO_MIN;
}

/** Lo que se lee de un aviso de inicio ya mostrado. */
export interface AvisoDeInicioLeido {
  /** El hábito, de la ruta del aviso. `null` si la ruta no lo trae. */
  habitoId: string | null;
  /** Con cuánta antelación avisaba (0 = a la hora). */
  minutosAntes: number;
  /** La hora del hábito que dice el cuerpo, `HH:mm`. */
  hora: string;
}

/** Lo mínimo de una notificación (programada o ya en la bandeja) que hace falta para reconocer un aviso de inicio. */
export interface ContenidoDeAviso {
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
}

const CUERPO_DE_INICIO = /^Te toca a las (\d{2}):(\d{2})\.$/;
const TITULO_CON_ANTELACION = /^En (\d+) min: /;
const RUTA_DE_HABITO = /^\/habitos\/([^/?#]+)/;

/**
 * El texto original de un aviso. Un aviso que lleva a un grupo («2 hábitos a las 07:00», E-410) guarda el suyo en
 * `data.avisoOriginal`; sin eso no se podría saber de qué hábito era ni a qué hora.
 */
function textoOriginal(contenido: ContenidoDeAviso): { title: string; body: string } {
  const guardado = contenido.data?.avisoOriginal as { title?: unknown; body?: unknown } | undefined;
  const usar = guardado && typeof guardado === 'object' ? guardado : contenido;
  return {
    title: typeof usar.title === 'string' ? usar.title : '',
    body: typeof usar.body === 'string' ? usar.body : '',
  };
}

/**
 * Reconoce el aviso de inicio de un hábito por su cuerpo («Te toca a las HH:mm.») y su ruta (`/habitos/{id}…`), y lee de
 * él la antelación (el «En N min: » del título) y la hora. `null` si no lo es.
 */
export function leerAvisoDeInicio(contenido: ContenidoDeAviso): AvisoDeInicioLeido | null {
  const ruta = contenido.data?.route;
  if (typeof ruta !== 'string') return null;
  const dueno = RUTA_DE_HABITO.exec(ruta);
  if (!dueno) return null;
  const { title, body } = textoOriginal(contenido);
  const cuerpo = CUERPO_DE_INICIO.exec(body);
  if (!cuerpo) return null;
  const horas = Number(cuerpo[1]);
  const minutos = Number(cuerpo[2]);
  if (horas > 23 || minutos > 59) return null;
  const antes = TITULO_CON_ANTELACION.exec(title);
  let habitoId: string | null = null;
  try {
    habitoId = decodeURIComponent(dueno[1]);
  } catch {
    habitoId = null;
  }
  return { habitoId, minutosAntes: antes ? Number(antes[1]) : 0, hora: `${cuerpo[1]}:${cuerpo[2]}` };
}

/** La fecha local `AAAAMMDD` de un instante. */
export function fechaDelInstante(instanteMs: number): string {
  const d = new Date(instanteMs);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}`;
}

/**
 * El instante de la hora del hábito al que pertenece un aviso publicado en `publicadoMs`: la ÚLTIMA vez que fueron las
 * `hora` cuyo aviso (`minutosAntes` antes) ya podía haberse mostrado. Es la que importa aunque el aviso llegue tarde:
 * uno de 07:00 con 30 min de antelación que se muestra a las 08:58 es el de HOY a las 07:00 —ya vencido—, no el de
 * mañana. Y uno de las 00:10 mostrado a las 23:40 es el de mañana, no el de ayer.
 */
export function horaDelHabitoDelAviso(publicadoMs: number, hora: string, minutosAntes: number): number {
  const [h, m] = hora.split(':').map(Number);
  const publicado = new Date(publicadoMs);
  const ocurrencia = (desplazamientoEnDias: number) =>
    new Date(publicado.getFullYear(), publicado.getMonth(), publicado.getDate() + desplazamientoEnDias, h, m, 0, 0).getTime();
  const pudoMostrarse = (horaMs: number) => horaMs - minutosAntes * 60_000 <= publicadoMs + HOLGURA_DE_PUBLICACION_MS;
  let dia = -1;
  while (pudoMostrarse(ocurrencia(dia + 1))) dia += 1;
  return ocurrencia(dia);
}

/**
 * ¿Ya no vale el aviso? Cuando `ahoraMs` pasó la hora del hábito más la gracia. La hora del hábito se ubica con
 * {@link horaDelHabitoDelAviso}.
 */
export function avisoDeInicioVencido(aviso: AvisoDeInicioLeido, publicadoMs: number, ahoraMs: number): boolean {
  const horaDelHabito = horaDelHabitoDelAviso(publicadoMs, aviso.hora, aviso.minutosAntes);
  return ahoraMs > horaDelHabito + GRACIA_DEL_AVISO_MIN * 60_000;
}
