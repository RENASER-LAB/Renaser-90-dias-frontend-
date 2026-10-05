import { fechaEnZona, horaEnZona, zonaDelTelefono } from '../../eventos/utils/zonaHoraria';

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Cuándo es el próximo evento, para la tarjeta de Hoy: «Hoy · 20:00» o «mar 6 oct · 20:00».
 *
 * > **Antes (hasta el 2026-10-05):** `toLocaleString('es-ES', { dateStyle: 'short' })` → «5/10/26,
 * > 20:00». Para alguien de 40–60 años «5/10/26» se lee mayo u octubre según de dónde sea, y obliga
 * > a hacer la cuenta para saber si es hoy. Rediseño de Hoy aprobado por el dueño.
 *
 * Se calcula en la zona del teléfono, la misma que usaba el texto anterior (el resumen de `/home`
 * no trae la zona del evento). Los nombres van escritos acá y no con `Intl` en español: Hermes no
 * siempre los trae (lo mismo que `eventos/utils/textosDeFecha`).
 */
export function cuandoEsElEvento(iniciaEn: string, ahora: number = Date.now(), zona: string = zonaDelTelefono()): string {
  const fecha = fechaEnZona(iniciaEn, zona);
  const hora = horaEnZona(iniciaEn, zona);
  if (fecha === fechaEnZona(ahora, zona)) return `Hoy · ${hora}`;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return `${DIAS_CORTOS[diaSemana]} ${dia} ${MESES_CORTOS[mes - 1]} · ${hora}`;
}
