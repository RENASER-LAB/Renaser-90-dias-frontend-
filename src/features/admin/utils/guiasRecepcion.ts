import type { RolDeStaff } from '../api/adminApi';
import type { GrupoResumenApi, GuiasRecepcionApi, UsuarioStaffApi } from '../api/adminSchemas';
import { comparable } from './filtrarCandidatos';
import { etiquetaDeEstadoDeCuenta } from './staff';

/**
 * «Guías del grupo inicial» (pedido del dueño del 2026-10-01, backend D-242).
 *
 * El guía **no es un rol**: es una designación por cohorte sobre su grupo de bienvenida
 * (`PUT /admin/cohorts/{id}/reception/guides`), que le abre ese grupo, sus aprendices y su chat.
 * Por eso el dueño no lo encontraba al cambiar de rol. Lo que hay que decidir para mostrarlo va
 * acá, puro y probado.
 */

/** Una fila de la pantalla: nombre arriba, rol (y estado si no es el normal) abajo. */
export type FilaDeGuia = { id: string; nombre: string; detalle: string };

/** Quiénes se ofrecen para agregar: el staff, en este orden (el Líder de Mentores primero). */
export const ROLES_CANDIDATOS_A_GUIA: readonly RolDeStaff[] = ['MENTOR_LEAD', 'MENTOR', 'ADMIN', 'ALCHEMIST'];

const ETIQUETA_DE_ROL: Record<string, string> = {
  TRAINEE: 'Aprendiz',
  MENTOR: 'Mentor',
  MENTOR_LEAD: 'Líder de mentores',
  ADMIN: 'Administrador',
  ALCHEMIST: 'Alquimista',
};

/** Un rol desconocido se muestra crudo: mejor eso que inventarle un nombre. */
function etiquetaDeRol(rol: string | null | undefined): string {
  if (!rol) return 'Cuenta no encontrada';
  return ETIQUETA_DE_ROL[rol] ?? rol;
}

function detalle(rol: string | null | undefined, estado: string | null | undefined): string {
  const aviso = etiquetaDeEstadoDeCuenta(estado);
  return aviso ? `${etiquetaDeRol(rol)} · ${aviso}` : etiquetaDeRol(rol);
}

/** Los guías tal como los devuelve el GET, listos para pintar. */
export function filasDeGuias(respuesta: GuiasRecepcionApi): FilaDeGuia[] {
  return respuesta.guides.map(g => ({
    id: g.userId,
    nombre: g.fullName?.trim() ? g.fullName.trim() : 'Sin nombre',
    detalle: detalle(g.role, g.status),
  }));
}

/**
 * A quién se puede agregar: cuentas **activas** del staff que todavía no son guías, filtradas por
 * nombre o correo (sin tildes). Solo activas porque el backend rechaza el reemplazo entero si una
 * cuenta no lo está: ofrecer una suspendida sería ofrecer un error.
 */
export function candidatosAGuia(
  staff: readonly UsuarioStaffApi[],
  idsDeGuias: Iterable<string>,
  busqueda: string,
): FilaDeGuia[] {
  const yaSon = new Set(idsDeGuias);
  const buscado = comparable(busqueda);
  const vistos = new Set<string>();
  const orden = (rol: string) => {
    const i = ROLES_CANDIDATOS_A_GUIA.indexOf(rol as RolDeStaff);
    return i === -1 ? ROLES_CANDIDATOS_A_GUIA.length : i;
  };
  return staff
    .filter(u => (u.status ?? '').toUpperCase() === 'ACTIVE' && !yaSon.has(u.id))
    .filter(u => {
      if (vistos.has(u.id)) return false;
      vistos.add(u.id);
      return true;
    })
    .filter(u => !buscado || comparable(`${u.fullName ?? ''} ${u.email ?? ''}`).includes(buscado))
    .sort((a, b) => orden(a.role) - orden(b.role) || (a.fullName ?? '').localeCompare(b.fullName ?? ''))
    .map(u => ({
      id: u.id,
      nombre: u.fullName?.trim() ? u.fullName.trim() : 'Sin nombre',
      detalle: etiquetaDeRol(u.role),
    }));
}

/** Los grupos de bienvenida de la cohorte que todavía sirven (los cerrados no). */
export function gruposDeBienvenida(grupos: readonly GrupoResumenApi[]): GrupoResumenApi[] {
  return grupos.filter(g => g.type === 'RECEPCION' && g.status !== 'CERRADO');
}

/**
 * Qué grupo de bienvenida mostrar. Manda el que la cohorte ya tiene designado (es donde están los
 * guías de hoy); si no hay, el primero abierto; si tampoco, ninguno y la pantalla lo dice.
 */
export function grupoInicialAMostrar(
  designado: string | null,
  abiertos: readonly GrupoResumenApi[],
): string | null {
  if (designado) return designado;
  return abiertos[0]?.id ?? null;
}

/** La lista que se manda al PUT al agregar a alguien (sin repetirlo). */
export function guiasConUnoMas(ids: readonly string[], nuevo: string): string[] {
  return ids.includes(nuevo) ? [...ids] : [...ids, nuevo];
}

/** La lista que se manda al PUT al quitar a alguien. */
export function guiasSinUno(ids: readonly string[], quitado: string): string[] {
  return ids.filter(id => id !== quitado);
}
