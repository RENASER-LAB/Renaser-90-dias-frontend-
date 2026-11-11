import { ApiError } from '../../../services/http/apiClient';
import { fechaLocal } from '../../habits/notificaciones/utils/alarmasPorDia';
import { escriturasEsperando } from '../../sinRed/escrituraSinRed';
import type { HoraReal } from '../../sinRed/horaReal';
import { registrarAjusteDeLectura } from '../../sinRed/lecturasGuardadas';
import { textoCortoDelMotivo, textoCortoDelPlan } from '../data/textosDelCierre';
import type { CierreDelDia, CuerpoDelCierre } from '../types/cierre.types';

/**
 * Spec 048, fase 3 (FR-019, D13, D14, P1, P7): «Cierra tu día» sin señal. «Bitácora» es esto (P1): la nota del día vive en el cierre.
 *
 * - Se guarda con la hora real y el día del cierre (`fecha`): el servidor lo aplica al día de esa hora aunque llegue después de la
 *   medianoche, y si el día ya terminó o cambió algo en su cuenta, gana lo suyo y se avisa (D13).
 * - Queda «cerrado» al instante: la respuesta optimista y el ajuste de lectura sobre `/rocks/day-closure` marcan el día cerrado con lo
 *   elegido hasta que la cola lo mande. El borrador de la hoja se conserva hasta que sale (la hoja solo lo suelta al guardar).
 * - Todo o nada (P7): si al llegar una acción de ese día ya no existe, el servidor no aplica nada y el aviso guarda lo escrito.
 */
export const RUTA_DEL_CIERRE_SIN_RED = '/api/v1/rocks/day-closure';

/** El cierre como se vería si el servidor ya lo hubiera guardado. */
export function cierreConLoElegido(vista: CierreDelDia, cuerpo: CuerpoDelCierre, hechoEn: string): CierreDelDia {
  const porAccion = new Map(cuerpo.acciones.map(a => [a.id, a]));
  return {
    ...vista,
    estado: 'CERRADO',
    cerradoEn: vista.cerradoEn ?? hechoEn,
    nota: cuerpo.nota ?? null,
    acciones: vista.acciones.map(a => {
      const r = porAccion.get(a.id);
      if (a.cumplida || !r) return a;
      return { ...a, cierre: { motivo: r.motivo, manana: r.manana, nota: r.nota ?? null } };
    }),
  };
}

/** Lo que la persona escribió, para el aviso si no se aplica (P7). Sin textos de relleno: solo lo suyo. */
export function resumenDelCierre(cuerpo: CuerpoDelCierre, vista: Pick<CierreDelDia, 'acciones'>): string {
  const lineas: string[] = [];
  if (cuerpo.nota) lineas.push(`Nota del día: ${cuerpo.nota}`);
  for (const r of cuerpo.acciones) {
    const titulo = vista.acciones.find(a => a.id === r.id)?.titulo ?? 'Una acción';
    const partes = [textoCortoDelMotivo(r.motivo), textoCortoDelPlan(r.manana)].filter((p): p is string => Boolean(p));
    lineas.push(`«${titulo}»: ${partes.join(' · ')}${r.nota ? `. ${r.nota}` : ''}`);
  }
  return lineas.join('\n');
}

export function etiquetaDelCierre(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Tu cierre de hoy';
  const [, mes, dia] = fecha.split('-');
  return `Tu cierre del ${Number(dia)}/${Number(mes)}`;
}

/** Las reglas de la app antes de guardar: el cierre es de UN día y no se pasa a otro (la hora real manda, no el reloj del teléfono). */
export function revisarElDiaDelCierre(fecha: string, hora: HoraReal): void {
  if (fechaLocal(hora.instante) > fecha) {
    // El mismo 409 que da el servidor (`esRechazoPorDiaCerrado`): la hoja lo dice como «ese día ya cerró».
    throw new ApiError(409, 'Ese día ya cerró. Tu cierre quedó sin guardar.');
  }
}

/** Mientras el cierre espera en la cola, el día se sigue viendo cerrado aunque la lectura (guardada o del servidor) diga abierto. */
registrarAjusteDeLectura(async (ruta, datos) => {
  if (ruta.split('?')[0] !== RUTA_DEL_CIERRE_SIN_RED || !datos || typeof datos !== 'object') return datos;
  const vista = datos as CierreDelDia;
  if (typeof vista.fecha !== 'string' || !Array.isArray(vista.acciones)) return datos;
  let actual = vista;
  for (const e of await escriturasEsperando('cierre')) {
    const cuerpo = e.cuerpo as CuerpoDelCierre | undefined;
    if (cuerpo?.fecha === actual.fecha) actual = cierreConLoElegido(actual, cuerpo, e.hechoEn);
  }
  return actual;
});
