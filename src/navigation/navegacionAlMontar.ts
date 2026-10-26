import { navegacionRef, irAPestana, pestanaDisponible } from './navegacionRef';
import { tomarPestanaAlMontar, verPestanaAlMontar, type PestanaAlMontar } from './pestanaAlMontar';

/** Cada cuánto se vuelve a mirar si el navegador ya tiene la pestaña pedida. */
export const ESPERA_ENTRE_INTENTOS_MS = 50;
/** Cuánto se espera, como máximo, antes de descartar el pedido (el respaldo de la franja actúa antes, a los 1500 ms). */
export const TOPE_DE_ESPERA_MS = 2000;

export type NavegacionAlMontar =
  /** La pestaña todavía no está en el navegador: se vuelve a mirar en un momento. */
  | { accion: 'esperar' }
  /** Ya se está donde se pidió y no hay parámetros que entregar: se consume el pedido y listo. */
  | { accion: 'nada' }
  /** Hay que ir a la pestaña (con sus parámetros) y consumir el pedido. */
  | { accion: 'navegar'; nombre: string; params?: Record<string, unknown> };

/**
 * Qué hacer con la pestaña pedida cuando se arman las pestañas. React Navigation puede rehidratar el estado que el
 * contenedor ya traía (el mismo `NavigationContainer`, otra instancia del navegador) e ignorar `initialRouteName` y
 * `initialParams`: por eso no basta con declararlos, hay que mirar dónde se quedó el navegador.
 *
 * Se navega si la ruta actual no es la pedida, o si lo pedido trae parámetros (aunque ya se esté en esa pestaña: la
 * pantalla se armó de nuevo y los parámetros iniciales se perdieron; entregarlos otra vez es inofensivo, quien los lee
 * los borra con `setParams`).
 */
export function navegacionAlMontar(
  pedido: PestanaAlMontar | null,
  rutaActual: string | undefined,
  disponible: boolean,
): NavegacionAlMontar {
  if (!pedido) return { accion: 'nada' };
  if (!disponible) return { accion: 'esperar' };
  const traeParams = !!pedido.params && Object.keys(pedido.params).length > 0;
  if (rutaActual === pedido.nombre && !traeParams) return { accion: 'nada' };
  return { accion: 'navegar', nombre: pedido.nombre, params: pedido.params };
}

/** Lo que `atenderPestanaPedida` necesita del mundo, para poder probarla sin navegador. */
export type DependenciasAlMontar = {
  ver: () => PestanaAlMontar | null;
  tomar: () => PestanaAlMontar | null;
  rutaActual: () => string | undefined;
  disponible: (nombre: string) => boolean;
  /** Devuelve `false` si el navegador no estaba listo y no se navegó. */
  navegar: (nombre: string, params?: Record<string, unknown>) => boolean;
};

const DEPENDENCIAS_REALES: DependenciasAlMontar = {
  ver: verPestanaAlMontar,
  tomar: tomarPestanaAlMontar,
  // El cast: sin un `ParamList` tipado, `getCurrentRoute` se reduce a `never` (mismo caso que `irAPestana`).
  rutaActual: () => (navegacionRef.isReady() ? (navegacionRef.getCurrentRoute() as { name: string } | undefined)?.name : undefined),
  disponible: pestanaDisponible,
  navegar: irAPestana,
};

/**
 * Se llama al montarse las pestañas (`useEffect` de `MainTabs`). Si hay una pestaña pedida, espera a que el navegador
 * esté listo y tenga esa pestaña, y entonces CONSUME el pedido y navega si hace falta ({@link navegacionAlMontar}).
 * Devuelve la limpieza: un montaje que se desmonta antes de lograrlo no consume nada, y el pedido sigue para el
 * siguiente. Si pasan {@link TOPE_DE_ESPERA_MS} sin poder, se descarta para que no le caiga a un montaje ajeno.
 */
export function atenderPestanaPedida(deps: DependenciasAlMontar = DEPENDENCIAS_REALES): () => void {
  if (!deps.ver()) return () => undefined;
  let reloj: ReturnType<typeof setTimeout> | undefined;
  let esperado = 0;

  const volverAMirar = () => {
    if (esperado >= TOPE_DE_ESPERA_MS) {
      deps.tomar();
      return;
    }
    esperado += ESPERA_ENTRE_INTENTOS_MS;
    reloj = setTimeout(intentar, ESPERA_ENTRE_INTENTOS_MS);
  };

  const intentar = () => {
    // Si el respaldo de la franja ya lo atendió, no queda nada que hacer.
    const pedido = deps.ver();
    if (!pedido) return;
    const decision = navegacionAlMontar(pedido, deps.rutaActual(), deps.disponible(pedido.nombre));
    if (decision.accion === 'esperar') return volverAMirar();
    if (decision.accion === 'navegar' && !deps.navegar(decision.nombre, decision.params)) return volverAMirar();
    deps.tomar();
  };

  // Un primer intento en el turno siguiente: que el navegador nuevo alcance a registrarse antes de navegar.
  reloj = setTimeout(intentar, 0);
  return () => {
    if (reloj) clearTimeout(reloj);
  };
}
