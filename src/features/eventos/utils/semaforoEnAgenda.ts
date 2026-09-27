import type { FalloSemaforo } from '../../semaforo/hooks/useMiSemaforo';
import type { ColorSemaforo, DetalleDelSemaforo } from '../../semaforo/types/semaforo.types';
import { fechaDeBarra, hoyDeLaPersona, palabraDelSemaforo, sumarDias } from '../../semaforo/utils/lecturaDelSemaforo';

/**
 * El semáforo arriba de «Mi agenda» (decisión del dueño, 2026-09-26). Función pura: la pantalla solo
 * pinta.
 *
 * - La línea de arriba es el semáforo VIGENTE de `GET /api/v1/me/semaforo`, con su color y su palabra
 *   tal cual los muestra la tarjeta de Hoy (mismos colores, umbrales y palabras: los decide el
 *   servidor, la app no recalcula nada).
 * - Los puntitos son los días YA VIVIDOS de la semana en curso (sábado → ayer), con el color que el
 *   servidor le dio a cada uno. Hoy y los días que vienen NO llevan color: el semáforo mide días
 *   vividos y acá no se predice nada.
 *
 * Cualquier fallo (404 de un backend viejo, 403, sin red), quien no se mide (`aplica=false`: mentor
 * sin programa, administración) o una ventana sin datos → `null`, y la agenda queda como estaba. Sin
 * mensaje de error: la agenda no es el lugar para explicar el semáforo.
 */

export interface DiaVividoEnAgenda {
  fecha: string;
  /** `Sáb`, `Dom`, … */
  rotulo: string;
  color: ColorSemaforo;
}

export interface SemaforoEnAgenda {
  color: ColorSemaforo;
  palabra: string;
  /** Del sábado a ayer, del más viejo al más nuevo. Vacío un sábado (todavía no se vivió ninguno). */
  diasVividos: DiaVividoEnAgenda[];
}

const SABADO = 6;

/** Cuántos días pasaron desde el sábado que abrió la semana de `hoy` (0 si hoy es sábado). */
function diasDesdeElSabado(hoy: string): number {
  const d = new Date(`${hoy}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return 0;
  return (d.getUTCDay() - SABADO + 7) % 7;
}

export function semaforoParaLaAgenda(
  detalle: DetalleDelSemaforo | null,
  fallo: FalloSemaforo | null,
  ahora: Date = new Date(),
): SemaforoEnAgenda | null {
  if (fallo || !detalle || !detalle.aplica) return null;
  const vigente = detalle.vigente;
  if (!vigente || vigente.color === 'SIN_DATOS') return null;

  const hoy = hoyDeLaPersona(detalle, ahora);
  const sabado = sumarDias(hoy, -diasDesdeElSabado(hoy));
  const diasVividos = vigente.dias
    .filter(d => d.fecha >= sabado && d.fecha < hoy)
    .map(d => ({ fecha: d.fecha, rotulo: fechaDeBarra(d.fecha).dia, color: d.color }));

  return { color: vigente.color, palabra: palabraDelSemaforo(vigente.color, vigente.etiqueta), diasVividos };
}
