import type { ColorSemaforo, GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import { aprendicesEnPalabras, formatearPorcentaje, palabraDelSemaforo, PALABRA_SIN_ACTIVIDAD } from '../../semaforo/utils/lecturaDelSemaforo';

/**
 * Cómo se DICEN las filas de «Mi grupo» y «Mis mentores» (spec 018). Puras, para probarlas sin montar Hoy.
 *
 * Dos reglas: el color nunca va solo (siempre lo acompaña su palabra para quien no lo ve, RL-30) y la falta de datos
 * no es un cero (sin número, «—» a la vista y «sin actividad para medir» al lector de pantalla).
 */

/** `78.3 %`, o `—` si no hay número: nunca un 0 % por falta de datos. */
export function porcentajeDeLaFila(porcentaje: number | null): string {
  return porcentaje === null ? '—' : formatearPorcentaje(porcentaje);
}

/** Lo que oye quien no ve el punto de color: su palabra y su número, o que todavía no hay actividad. */
export function estadoDeLaFilaEnPalabras(porcentaje: number | null, color: ColorSemaforo, etiqueta?: string | null): string {
  if (porcentaje === null) return PALABRA_SIN_ACTIVIDAD;
  return `${palabraDelSemaforo(color, etiqueta)}, ${formatearPorcentaje(porcentaje)}`;
}

/** La línea gris de un grupo del resultado: su mentor, o que no lo tiene (lo que el líder tiene que atender). */
export function mentorDelGrupoEnPalabras(grupo: Pick<GrupoDelResumen, 'mentorNombre' | 'sinMentor'>): string | null {
  if (grupo.mentorNombre?.trim()) return grupo.mentorNombre.trim();
  return grupo.sinMentor ? 'Sin mentor asignado' : null;
}

/** Lo que dice la fila de un grupo para el lector de pantalla, con a dónde lleva si se abre. */
export function dichoDelGrupo(grupo: GrupoDelResumen, seAbre: boolean): string {
  const nombre = grupo.grupoNombre?.trim() || 'Grupo sin nombre';
  const mentor = mentorDelGrupoEnPalabras(grupo);
  const partes = [
    nombre,
    mentor === null ? null : grupo.sinMentor && !grupo.mentorNombre ? mentor : `Mentor: ${mentor}`,
    estadoDeLaFilaEnPalabras(grupo.promedio, grupo.colorDelPromedio ?? 'SIN_DATOS', grupo.etiquetaDelPromedio),
  ];
  return `${partes.filter(Boolean).join('. ')}.${seAbre ? ' Ver a sus personas.' : ''}`;
}

/**
 * `2 sin responder`, `1 sin responder`, `Nada sin responder`. `hayMas` = la bandeja trae más páginas de las que se leyeron
 * (30 por página): entonces la cuenta es «al menos», y si no hay ninguna en la primera no se afirma que no hay.
 * Sin lectura (`null`), sin cifra: no se inventa un 0.
 */
export function consultasSinResponderEnPalabras(sinResponder: number | null, hayMas: boolean): string | null {
  if (sinResponder === null) return null;
  if (sinResponder === 0) return hayMas ? null : 'Nada sin responder';
  return `${sinResponder}${hayMas ? '+' : ''} sin responder`;
}

/** `Grupo Octubre · 6 aprendices`: el rótulo de la lista de «Mi grupo». */
export function rotuloDelGrupo(nombre: string | null | undefined, aprendices: number): string {
  return `${nombre?.trim() || 'Tu grupo'} · ${aprendicesEnPalabras(aprendices)}`;
}
