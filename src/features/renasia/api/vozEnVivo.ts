import { API_CONFIG } from '../../../config/apiConfig';

const RUTA = '/api/v1/renasia/voz/en-vivo';

/** `http://…` → `ws://…`, `https://…` → `wss://…` (D-162). */
export function urlDeVozEnVivo(baseUrl: string = API_CONFIG.BASE_URL): string {
  return baseUrl.replace(/^http/, 'ws').replace(/\/+$/, '') + RUTA;
}

/** Los eventos de texto del WebSocket (`docs/arquitectura/PROPUESTA_GEMINI_LIVE.md` §5.ter). */
export type EventoEnVivo =
  | { tipo: 'listo'; segundosRestantes: number }
  | { tipo: 'oido'; texto: string }
  | { tipo: 'dicho'; texto: string }
  | { tipo: 'interrumpido' }
  | { tipo: 'turnoCompleto' }
  | { tipo: 'propuesta'; id: string; resumen: string; venceEn: string }
  | { tipo: 'evidencia'; registroId: string; titulo: string; venceEn: string }
  | { tipo: 'cuotaAgotada' }
  | { tipo: 'error'; valor: string };

/** Un evento desconocido o mal formado se ignora: la app no se actualiza por aire. */
export function leerEventoEnVivo(texto: string): EventoEnVivo | null {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return null;
  }
  const evento = crudo as Record<string, unknown> | null;
  const esTexto = (campo: string) => typeof evento?.[campo] === 'string';
  switch (evento?.tipo) {
    case 'listo':
      return typeof evento.segundosRestantes === 'number'
        ? { tipo: 'listo', segundosRestantes: evento.segundosRestantes }
        : null;
    case 'oido':
    case 'dicho':
      return esTexto('texto') ? { tipo: evento.tipo, texto: evento.texto as string } : null;
    case 'interrumpido':
    case 'turnoCompleto':
    case 'cuotaAgotada':
      return { tipo: evento.tipo };
    case 'propuesta':
      return esTexto('id') && esTexto('resumen') && esTexto('venceEn')
        ? { tipo: 'propuesta', id: evento.id as string, resumen: evento.resumen as string, venceEn: evento.venceEn as string }
        : null;
    case 'evidencia':
      return esTexto('registroId') && esTexto('titulo') && esTexto('venceEn')
        ? {
            tipo: 'evidencia',
            registroId: evento.registroId as string,
            titulo: evento.titulo as string,
            venceEn: evento.venceEn as string,
          }
        : null;
    case 'error':
      return esTexto('valor') ? { tipo: 'error', valor: evento.valor as string } : null;
    default:
      return null;
  }
}
