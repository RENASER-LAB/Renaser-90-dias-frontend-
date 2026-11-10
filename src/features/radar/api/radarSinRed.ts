import { escriturasEsperando } from '../../sinRed/escrituraSinRed';
import { registrarAjusteDeLectura } from '../../sinRed/lecturasGuardadas';
import { PREGUNTAS_RADAR, PREGUNTA_ENERGIA } from '../config/configRadar';
import type { CheckInRadarApi, HistorialRadarApi, MiRadarApi, PedidoDeMiRadarApi, RegistroRadarApi, UltimoRadarApi } from '../types/radar.types';

/**
 * Spec 048, fase 3 (FR-019, D13, D14, P4, P5, P8): el Código Renaser y Mi Radar sin señal.
 *
 * - **El Código Renaser se responde y se encola** (también el innegociable de los días 1 a 7: P8, vuelve a abrirse solo sin señal).
 *   La hora queda respondida al instante: el ajuste de lectura sobre `/radar/latest` y la historia dice que respondiste a la hora
 *   real en que lo hiciste, hasta que la cola lo mande.
 * - Si al llegar esa hora ya tenía registro en el servidor, gana el del servidor y el aviso muestra lo que escribiste (P4). Si ya no
 *   corresponde (Mi Radar apagado o sin esa hora, desde el día 8), no se aplica y el aviso trae el texto (P5).
 * - Mi Radar: lo pedido se ve al instante (el encendido y los días tocados) y el servidor decide al llegar.
 */
export const RUTA_DEL_RADAR = '/api/v1/radar';
export const RUTA_DE_MI_RADAR = '/api/v1/radar/mi-radar';
export const RUTA_DEL_ULTIMO_RADAR = '/api/v1/radar/latest';
export const RUTA_DE_LA_HISTORIA_DEL_RADAR = '/api/v1/radar/history';

export function etiquetaDelCodigo(instante: Date): string {
  return `Código Renaser de las ${String(instante.getHours()).padStart(2, '0')}:00`;
}

/** Lo que la persona escribió, con las preguntas, para el aviso si no se aplica (P4, P5). */
export function resumenDelCodigo(checkIn: CheckInRadarApi): string {
  const lineas = PREGUNTAS_RADAR.map(p => `${p.titulo} ${String(checkIn[p.campo as keyof CheckInRadarApi] ?? '').trim()}`);
  lineas.push(`${PREGUNTA_ENERGIA} ${checkIn.energyLevel}`);
  return lineas.join('\n');
}

/** El registro como se vería si el servidor ya lo hubiera guardado: a la hora real, con un id que no es del servidor. */
export function registroEnEspera(checkIn: CheckInRadarApi, idCliente: string, hechoEn: string): RegistroRadarApi {
  return { ...checkIn, id: `pendiente:${idCliente}`, createdAt: hechoEn, horaPrevista: new Date(hechoEn).getHours() };
}

/** Mi Radar con lo pedido: el encendido y los días tocados. Las horas las calcula el servidor al llegar. */
export function miRadarConLoPedido(config: MiRadarApi, pedido: PedidoDeMiRadarApi): MiRadarApi {
  const cambios = new Map((pedido.dias ?? []).map(d => [d.dia, d]));
  return {
    ...config,
    encendido: pedido.encendido,
    dias: config.dias.map(d => {
      const c = cambios.get(d.dia);
      if (!c) return d;
      return {
        ...d,
        ...(c.modo ? { modo: c.modo } : {}),
        ...(c.veces !== undefined ? { veces: c.veces } : {}),
        ...(c.sinRadar !== undefined ? { sinRadar: c.sinRadar } : {}),
      };
    }),
  };
}

async function codigosEnEspera(): Promise<RegistroRadarApi[]> {
  return (await escriturasEsperando('radar'))
    .filter(e => e.metodo === 'POST' && e.ruta === RUTA_DEL_RADAR)
    .map(e => registroEnEspera(e.cuerpo as CheckInRadarApi, e.idCliente, e.hechoEn));
}

registrarAjusteDeLectura(async (ruta, datos) => {
  const limpia = ruta.split('?')[0];
  if (limpia === RUTA_DEL_ULTIMO_RADAR) {
    const esperando = await codigosEnEspera();
    if (esperando.length === 0) return datos;
    const ultimo = esperando[esperando.length - 1].createdAt;
    const actual = (datos as UltimoRadarApi | null)?.createdAt ?? null;
    return { ...(datos as object), createdAt: actual && new Date(actual) > new Date(ultimo) ? actual : ultimo };
  }
  if (limpia === RUTA_DE_LA_HISTORIA_DEL_RADAR && !ruta.includes('?')) {
    const esperando = await codigosEnEspera();
    const h = datos as HistorialRadarApi | null;
    if (esperando.length === 0 || !h || !Array.isArray(h.entries)) return datos;
    return { ...h, entries: [...esperando.reverse(), ...h.entries] };
  }
  if (limpia === RUTA_DE_MI_RADAR) {
    const h = datos as MiRadarApi | null;
    if (!h || !Array.isArray(h.dias)) return datos;
    let actual = h;
    for (const e of await escriturasEsperando('radar')) {
      if (e.metodo === 'PUT' && e.ruta === RUTA_DE_MI_RADAR) actual = miRadarConLoPedido(actual, e.cuerpo as PedidoDeMiRadarApi);
    }
    return actual;
  }
  return datos;
});
