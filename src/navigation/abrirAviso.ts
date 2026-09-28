import type { DestinoDeAviso } from '../features/mentor/api/avisosApi';

/**
 * Adónde lleva tocar un aviso que abre una pestaña, y cuándo se puede ir (D-218, 2026-09-28).
 *
 * Nació en `AbridorDeEventos` (E-5: el aviso de un evento abre Comunidad → Eventos). Con el
 * recordatorio de un hábito (Training, en su dimensión) y el de una acción de objetivo (Plan →
 * Objetivos) eran tres copias de la misma espera; ahora es una tabla y una sola función.
 *
 * ## Cuándo se va
 *
 * 1. Si es un hábito, una acción o la Caja Renaser (D-219) y hay una capa obligatoria abierta (el Código Renaser, el arranque
 *    guiado o el Pacto, `capasObligatorias.ts`), **no se va**: la ruta queda esperando y se vuelve a
 *    intentar al cerrarse. La capa no se toca. El evento no espera (decisión del dueño del 28/09).
 * 2. Si la pestaña todavía no existe (login, onboarding, Mapa del Día 7), tampoco: se reintenta cuando
 *    cambia la navegación.
 * 3. Si no, se consume la ruta y se navega. Consumirla recién ahí es lo que hace que la espera no la
 *    pierda.
 *
 * Las rutas del mentor y del semáforo no pasan por acá: las atienden sus pantallas, como siempre.
 */

export type TipoQueAbreUnaPestana = 'evento' | 'habito' | 'objetivo' | 'caja' | 'cajaAdmin';

export const TIPOS_QUE_ABREN_UNA_PESTANA: readonly TipoQueAbreUnaPestana[] = [
  'evento',
  'habito',
  'objetivo',
  'caja',
  'cajaAdmin',
];

/**
 * La Caja Renaser (D-219, 2026-09-28): la del aprendiz vive en Yo; la del Admin, en Administración,
 * que se abre desde Hoy (es estado de `HoyScreen`, no una ruta del navegador).
 */
const PESTANA: Record<TipoQueAbreUnaPestana, string> = {
  evento: 'Comunidad',
  habito: 'Training',
  objetivo: 'Plan',
  caja: 'Yo',
  cajaAdmin: 'Hoy',
};

/** La pestaña y los parámetros que cada pantalla ya sabe consumir una vez. */
export function pestanaDelDestino(
  destino: Extract<DestinoDeAviso, { tipo: TipoQueAbreUnaPestana }>,
): { pestana: string; params: Record<string, unknown> } {
  switch (destino.tipo) {
    case 'evento':
      return { pestana: PESTANA.evento, params: { abrirEventoId: destino.eventoId } };
    case 'habito':
      return { pestana: PESTANA.habito, params: { abrirHabitoId: destino.habitoId, abrirDimension: destino.dimension } };
    case 'objetivo':
      return { pestana: PESTANA.objetivo, params: { abrirObjetivosFecha: destino.fecha, abrirObjetivosEje: destino.eje } };
    case 'caja':
      return { pestana: PESTANA.caja, params: { abrirCaja: true } };
    case 'cajaAdmin':
      return { pestana: PESTANA.cajaAdmin, params: { abrirCajaAprendizId: destino.aprendizId } };
  }
}

export interface DependenciasDeApertura {
  hayCapaObligatoriaAbierta: () => boolean;
  pestanaDisponible: (nombre: string) => boolean;
  consumir: (tipo: TipoQueAbreUnaPestana) => Extract<DestinoDeAviso, { tipo: TipoQueAbreUnaPestana }> | null;
  irAPestana: (nombre: string, params: Record<string, unknown>) => boolean;
}

/** `abierto` si navegó; `esperando` si hay algo que la frena (capa o pestaña); `nada` si no había ruta. */
export type ResultadoDeApertura = 'abierto' | 'esperando' | 'nada';

/**
 * Los que esperan a que se cierre una capa obligatoria. El evento NO (decisión del dueño, 2026-09-28): su
 * aviso abre el evento directo, como desde E-5. Los de la Caja Renaser sí esperan (D-219): nada tapa el
 * Código Renaser ni el Pacto.
 */
const ESPERAN_A_LAS_CAPAS: ReadonlySet<TipoQueAbreUnaPestana> = new Set(['habito', 'objetivo', 'caja', 'cajaAdmin']);

export function intentarAbrirAvisoPendiente(deps: DependenciasDeApertura): ResultadoDeApertura {
  let esperando = false;
  for (const tipo of TIPOS_QUE_ABREN_UNA_PESTANA) {
    if (ESPERAN_A_LAS_CAPAS.has(tipo) && deps.hayCapaObligatoriaAbierta()) {
      esperando = true;
      continue;
    }
    if (!deps.pestanaDisponible(PESTANA[tipo])) continue;
    const destino = deps.consumir(tipo);
    if (!destino) continue;
    const { pestana, params } = pestanaDelDestino(destino);
    return deps.irAPestana(pestana, params) ? 'abierto' : 'esperando';
  }
  return esperando ? 'esperando' : 'nada';
}

/** De dónde llegan los motivos para volver a intentar. Cada uno devuelve cómo dejar de escuchar. */
export interface FuentesDeApertura {
  /** Llegó un toque sobre un aviso (o ya estaba esperando uno). */
  alAbrirAviso: (oyente: () => void) => () => void;
  /** Se abrió o se cerró una capa obligatoria. */
  alCambiarLasCapas: (oyente: () => void) => () => void;
  /** Cambió la navegación: aparecieron las pestañas al salir del login, del onboarding o del Mapa. */
  alCambiarLaNavegacion: (oyente: () => void) => () => void;
}

/**
 * Intenta ya y cada vez que algo pueda haber destrabado la espera. Es lo que monta `AbridorDeAvisos`;
 * está acá, sin React, para probar la espera entera (capa abierta → se cierra → Training).
 */
export function mantenerAperturaDeAvisos(deps: DependenciasDeApertura, fuentes: FuentesDeApertura): () => void {
  const intentar = () => {
    intentarAbrirAvisoPendiente(deps);
  };
  intentar();
  const soltar = [
    fuentes.alAbrirAviso(intentar),
    fuentes.alCambiarLasCapas(intentar),
    fuentes.alCambiarLaNavegacion(intentar),
  ];
  return () => soltar.forEach(dejar => dejar());
}
