import type { DestinoDeAviso, DestinoDelChat } from '../features/mentor/api/avisosApi';

/**
 * Adónde lleva tocar un aviso que abre una pestaña, y cuándo se puede ir (D-218, 2026-09-28).
 *
 * Nació en `AbridorDeEventos` (E-5: el aviso de un evento abre Comunidad → Eventos). Con el
 * recordatorio de un hábito (Training, en su dimensión) y el de una acción de objetivo (Plan →
 * Objetivos) eran tres copias de la misma espera; ahora es una tabla y una sola función.
 *
 * ## Cuándo se va
 *
 * 1. Si es un hábito, una acción, la Caja Renaser (D-219) o un chat (D-221) y hay una capa obligatoria abierta (el Código Renaser, el arranque
 *    guiado o el Pacto, `capasObligatorias.ts`), **no se va**: la ruta queda esperando y se vuelve a
 *    intentar al cerrarse. La capa no se toca. El evento no espera (decisión del dueño del 28/09).
 * 2. Si la pestaña todavía no existe (login, onboarding), tampoco: se reintenta cuando
 *    cambia la navegación.
 * 3. Si no, se consume la ruta y se navega. Consumirla recién ahí es lo que hace que la espera no la
 *    pierda.
 *
 * Las rutas del mentor y del semáforo también pasan por acá desde el 2026-10-31 (antes las atendía Hoy): llevan a Yo, y quien decide
 * si esa cuenta puede abrirlo es Yo (el rol, el padrón del grupo, lo que dice el servidor). No esperan a las capas obligatorias,
 * como antes.
 */

export type TipoQueAbreUnaPestana =
  | 'evento'
  | 'habito'
  | 'objetivo'
  | 'caja'
  | 'miRadar'
  | 'cajaAdmin'
  | 'chat'
  | 'semaforo'
  | 'alumno'
  | 'semaforoGrupo'
  | 'semaforoGrupos'
  | 'ochentaVeinte';

export const TIPOS_QUE_ABREN_UNA_PESTANA: readonly TipoQueAbreUnaPestana[] = [
  'evento',
  'habito',
  'objetivo',
  'caja',
  'miRadar',
  'cajaAdmin',
  'chat',
  // 2026-10-31: los paneles de rol viven en Yo, así que sus avisos también entran por acá (antes los atendía Hoy).
  'semaforo',
  'alumno',
  'semaforoGrupo',
  'semaforoGrupos',
  // Spec 031: el aviso de «tu análisis está listo» abre Plan con la hoja «Tu 80/20».
  'ochentaVeinte',
];

/**
 * La Caja Renaser (D-219, 2026-09-28): la del aprendiz vive en Yo; la del Admin, en Administración.
 *
 * > **Corregido 2026-10-31 (pedido del dueño: «lo de cada rol entra desde Yo, como Administración, no en Hoy»).** Administración, «Mi
 * > grupo» y «Mis mentores» se abren desde la lista de Yo, así que los avisos que abrían esas vistas desde Hoy —la caja del Admin, la
 * > ficha de un alumno, el semáforo del grupo, el resumen por grupos y el semáforo propio del sábado— ahora traen a Yo con un
 * > parámetro que Yo consume una vez.
 */
const PESTANA: Record<TipoQueAbreUnaPestana, string> = {
  evento: 'Comunidad',
  habito: 'Training',
  objetivo: 'Plan',
  caja: 'Yo',
  // Spec 012: el aviso de Mi Radar abre Yo → Mi Radar, con el mismo estilo de parámetro que la Caja.
  miRadar: 'Yo',
  cajaAdmin: 'Yo',
  // D-221 (2026-09-29): el aviso de un mensaje abre esa conversación en Comunidad → Tribu, con el
  // mismo parámetro que ya usa «Escribirle» desde la ficha de un aprendiz.
  chat: 'Comunidad',
  semaforo: 'Yo',
  alumno: 'Yo',
  semaforoGrupo: 'Yo',
  semaforoGrupos: 'Yo',
  ochentaVeinte: 'Plan',
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
    case 'miRadar':
      return { pestana: PESTANA.miRadar, params: { abrirMiRadar: true } };
    case 'cajaAdmin':
      return { pestana: PESTANA.cajaAdmin, params: { abrirCajaAprendizId: destino.aprendizId } };
    case 'chat':
      return {
        pestana: PESTANA.chat,
        // Spec 024: si hubo que cambiar de formación para abrirlo, Comunidad lo dice en una línea (`abrirChatAviso`).
        params: { abrirChatConversacionId: destino.conversacionId, ...(destino.aviso ? { abrirChatAviso: destino.aviso } : {}) },
      };
    case 'semaforo':
      return { pestana: PESTANA.semaforo, params: { abrirSemaforo: true } };
    case 'alumno':
      return { pestana: PESTANA.alumno, params: { abrirAlumno: { grupoId: destino.grupoId, alumnoId: destino.alumnoId } } };
    case 'semaforoGrupo':
      return { pestana: PESTANA.semaforoGrupo, params: { abrirSemaforoDelGrupo: destino.grupoId } };
    case 'semaforoGrupos':
      return { pestana: PESTANA.semaforoGrupos, params: { abrirSemaforoPorGrupos: true } };
    case 'ochentaVeinte':
      return { pestana: PESTANA.ochentaVeinte, params: { abrirOchentaVeinte: destino.periodo } };
  }
}

export interface DependenciasDeApertura {
  hayCapaObligatoriaAbierta: () => boolean;
  pestanaDisponible: (nombre: string) => boolean;
  consumir: (tipo: TipoQueAbreUnaPestana) => Extract<DestinoDeAviso, { tipo: TipoQueAbreUnaPestana }> | null;
  irAPestana: (nombre: string, params: Record<string, unknown>) => boolean;
  /**
   * Spec 024 (FR-032): la formación del chat que abre el aviso. Opcional: sin esto (las pruebas de siempre) el chat se abre como antes.
   * `seguir` lo abre, `descartar` lo suelta sin abrir nada, y `cambiar` pide cambiar de formación primero.
   */
  decidirFormacionDelChat?: (destino: DestinoDelChat) => DecisionDeApertura;
  /** Hace el cambio de formación (activa o elección de la Comunidad). `false` si no se pudo: el aviso se descarta. */
  cambiarDeFormacion?: (decision: Extract<DecisionDeApertura, { accion: 'cambiar' }>) => Promise<boolean>;
  /** Vuelve a dejar esperando el destino, ya con la línea de aviso, cuando el cambio terminó. */
  volverAAnotar?: (destino: DestinoDelChat) => void;
}

/** Lo que `decidirFormacionDelChat` entrega: la decisión de `formaciones/utils/avisoDeFormacion` ya reducida a lo que importa acá. */
export type DecisionDeApertura =
  | { accion: 'seguir' }
  | { accion: 'descartar' }
  | { accion: 'cambiar'; codigo: string; aviso: string; sobre: 'activa' | 'eleccion' };

/** `abierto` si navegó; `esperando` si hay algo que la frena (capa o pestaña); `nada` si no había ruta. */
export type ResultadoDeApertura = 'abierto' | 'esperando' | 'nada';

/**
 * Los que esperan a que se cierre una capa obligatoria. El evento NO (decisión del dueño, 2026-09-28): su
 * aviso abre el evento directo, como desde E-5. Los de la Caja Renaser sí esperan (D-219): nada tapa el
 * Código Renaser ni el Pacto.
 */
/* D-221: el chat también espera. Un mensaje del grupo no puede tapar el Código Renaser ni el Pacto. */
const ESPERAN_A_LAS_CAPAS: ReadonlySet<TipoQueAbreUnaPestana> = new Set(['habito', 'objetivo', 'caja', 'miRadar', 'cajaAdmin', 'chat', 'ochentaVeinte']);
// Los de rol y el semáforo del sábado NO esperan: no esperaban cuando los atendía Hoy.

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
    /* Spec 024: un chat de otra formación. El destino que vuelve de un cambio ya trae su línea de aviso (`aviso`): no se vuelve a decidir. */
    if (destino.tipo === 'chat' && !destino.aviso && deps.decidirFormacionDelChat) {
      const decision = deps.decidirFormacionDelChat(destino);
      if (decision.accion === 'descartar') return 'nada';
      if (decision.accion === 'cambiar') {
        const chat = destino;
        void (deps.cambiarDeFormacion?.(decision) ?? Promise.resolve(false)).then(
          cambio => {
            if (cambio) deps.volverAAnotar?.({ ...chat, aviso: decision.aviso });
          },
          () => undefined,
        );
        return 'esperando';
      }
    }
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
  /** Cambió la navegación: aparecieron las pestañas al salir del login o del onboarding. */
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
