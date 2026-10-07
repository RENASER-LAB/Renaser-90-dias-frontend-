import type { MomentoGrande } from '../estado/momentoGrande';
import type { HitoDelFenix } from './hitosDelFenix';

/**
 * Lo que dice y cómo se mueve la pantalla completa de celebración (pedido del dueño, 2026-10-07). Puro, para probarlo
 * sin dibujar; `PantallaDeCelebracion` solo lo ejecuta.
 */

/** Tiempos de la pantalla (ms). */
export const PANTALLA_MS = {
  /** El velo de fondo aparece con un fundido. */
  velo: 220,
  /** Resorte de la entrada del contenido (escala 0.96 → 1 + opacidad). */
  entrada: 450,
  /** Los contadores suben después de que el contenido se posó. */
  esperaContadores: 250,
  contadores: 900,
  /** Salida corta: la persona ya quiere seguir (Emil: la salida, más corta que la entrada). */
  salida: 180,
  /** Se cierra sola si nadie la toca. */
  autocierre: 3800,
} as const;

/** La escala desde la que entra el contenido. Nunca 0: lo físico no aparece de la nada. */
export const ESCALA_DE_ENTRADA = 0.96;
/** Amortiguación del resorte de entrada: se posa con un rebote apenas perceptible. */
export const AMORTIGUACION_DE_ENTRADA = 0.82;

export type TextosDeLaPantalla = {
  titulo: string;
  /** El número grande de las rachas («7»); `null` en las otras. */
  numeroGrande: number | null;
  bajada: string | null;
  /** Los otros hitos que coincidieron hoy, uno por línea. */
  lineas: string[];
  /** Los contadores que suben. Solo con datos del servidor. */
  contadores: Array<{ clave: 'puntos' | 'racha'; valor: number; rotulo: string }>;
  /** Lo que anuncia el lector de pantalla al aparecer. */
  anuncio: string;
};

const LINEA: Record<HitoDelFenix, string> = {
  fase: 'Y entraste en una fase nueva',
  racha30: 'Y llevas 30 días seguidos',
  racha7: 'Y llevas 7 días seguidos',
  todosLosHabitos: 'Y cumpliste todos tus hábitos de hoy',
};

function principal(m: MomentoGrande): Pick<TextosDeLaPantalla, 'titulo' | 'numeroGrande' | 'bajada'> {
  switch (m.principal) {
    case 'fase':
      return m.fase
        ? { titulo: `¡Entraste en la Fase ${m.fase.numero} · ${m.fase.nombre}!`, numeroGrande: null, bajada: `Tu animal: ${m.fase.animal.nombre}` }
        : { titulo: '¡Entraste en una fase nueva!', numeroGrande: null, bajada: null };
    case 'racha30':
      return { titulo: 'días seguidos', numeroGrande: 30, bajada: null };
    case 'racha7':
      return { titulo: 'días seguidos', numeroGrande: 7, bajada: null };
    case 'todosLosHabitos':
      return { titulo: '¡Día completo!', numeroGrande: null, bajada: 'Cumpliste todos tus hábitos de hoy' };
  }
}

function contadores(m: MomentoGrande): TextosDeLaPantalla['contadores'] {
  const lista: TextosDeLaPantalla['contadores'] = [];
  if (m.puntosHoy !== null && m.puntosHoy > 0) lista.push({ clave: 'puntos', valor: m.puntosHoy, rotulo: 'puntos hoy' });
  const esRacha = m.principal === 'racha7' || m.principal === 'racha30';
  if (!esRacha && m.rachaActual !== null && m.rachaActual > 0) {
    lista.push({ clave: 'racha', valor: m.rachaActual, rotulo: m.rachaActual === 1 ? 'día de racha' : 'días de racha' });
  }
  return lista;
}

export function textosDeLaPantalla(m: MomentoGrande): TextosDeLaPantalla {
  const base = principal(m);
  const lineas = m.otros.map(h => LINEA[h]);
  const cuentas = contadores(m);
  const titular = base.numeroGrande === null ? base.titulo : `${base.numeroGrande} ${base.titulo}`;
  const anuncio = [titular, base.bajada, ...lineas, ...cuentas.map(c => `${c.valor} ${c.rotulo}`)].filter(Boolean).join('. ');
  return { ...base, lineas, contadores: cuentas, anuncio };
}

/** Con «reducir movimiento»: fénix quieto en su imagen, solo fundidos, sin partículas y los números ya puestos. */
export type PlanDeLaPantalla = { fenix: 'rive' | 'imagen'; entrada: 'resorte' | 'fundido'; brasas: boolean; contadoresSuben: boolean };

export function planDeLaPantalla(reducido: boolean): PlanDeLaPantalla {
  return reducido
    ? { fenix: 'imagen', entrada: 'fundido', brasas: false, contadoresSuben: false }
    : { fenix: 'rive', entrada: 'resorte', brasas: true, contadoresSuben: true };
}
