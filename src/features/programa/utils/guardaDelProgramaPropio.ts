import { escucharDiaUnoElegido } from '../events/avisoDiaUnoElegido';

/**
 * Issue #203 (misma familia que #197/#200): el personal (mentor, guía, líder…) que NO activó su programa recibe un 403 del servidor en
 * cada lectura de rocas, Radar (`/radar/latest`) y Pastilla (`/spirit-audio/status`): ~35 en 8 minutos al abrir Hoy, Plan y Entrenar,
 * y tapan los errores de verdad en el log. La pantalla ya dice «Todavía no empezaste tu programa»; el pedido sobraba.
 *
 * Son más de quince lecturas repartidas en hooks y componentes de tres tabs, así que la regla vive en UN lugar —`apiFetch`— y no en
 * cada hook: antes de pedir una de esas rutas, si la cuenta es del personal se pregunta una vez (`GET /onboarding/activate-program`)
 * si activó su programa; con `activated: false` el pedido no sale y se rechaza aquí con el mismo 403 que daría el servidor.
 *
 * Solo se corta cuando se SABE (`activated === false`). El aprendiz nunca pregunta ni espera. Si la pregunta falla (sin red, 404 de quien
 * no tiene fila) se deja pasar el pedido como siempre: no saber no es un motivo para esconder datos. Mi Radar (`/radar/mi-radar`) NO está
 * en la lista: la spec 019 usa su 403 `PROGRAMA_NO_ACTIVADO` para que Yo ofrezca «Empezar mañana».
 */
export const CODIGO_PROGRAMA_NO_ACTIVADO_LOCAL = 'PROGRAMA_NO_ACTIVADO';
export const MENSAJE_PROGRAMA_NO_ACTIVADO = 'Solo un aprendiz opera sus propias rocas';

const RUTAS_EXACTAS = new Set(['/api/v1/radar/latest', '/api/v1/spirit-audio/status']);
/** Solo el personal que se SABE personal: ante un rol que esta lista no nombra (otro idioma, uno nuevo) se pide como siempre. */
const ROLES_DEL_PERSONAL: ReadonlySet<string> = new Set(['MENTOR', 'TRAINEE_GUIDE', 'MENTOR_LEAD', 'ADMIN', 'ALCHEMIST']);
const PREFIJO_ROCAS = '/api/v1/rocks/';

/** ¿Esta lectura la rechaza el servidor con un 403 al personal sin programa activado? */
export function esLecturaDelProgramaPropio(ruta: string): boolean {
  const sinConsulta = ruta.split('?')[0].replace(/\/+$/, '');
  return RUTAS_EXACTAS.has(sinConsulta) || sinConsulta.startsWith(PREFIJO_ROCAS);
}

export type DecisionDeLaGuarda = 'pedir' | 'sin-activar';

let cuentaId: string | null = null;
let rolDeLaCuenta: string | null = null;
/** Lo que se supo de la cuenta actual: `null` = no se sabe todavía. */
let activado: boolean | null = null;
let enVuelo: Promise<boolean | null> | null = null;
let generacion = 0;

/** Quién es la cuenta de la sesión. Cambiar de cuenta u de rol olvida lo que se sabía. */
export function fijarCuentaDeLaGuarda(id: string | null, rol: string | null): void {
  if (id === cuentaId && rol === rolDeLaCuenta) return;
  cuentaId = id;
  rolDeLaCuenta = rol;
  olvidarLoQueSabe();
}

/** Para después de activar el programa (o de cambiar de sesión): la próxima lectura vuelve a preguntar. */
export function olvidarLoQueSabe(): void {
  generacion += 1;
  activado = null;
  enVuelo = null;
}

escucharDiaUnoElegido(olvidarLoQueSabe);

/**
 * Decide si una lectura del programa propio sale o se corta. `preguntar` devuelve si la cuenta activó su programa; lo pone `apiFetch`.
 * Un aprendiz (o un rol que no es del personal) pasa sin preguntar nada.
 */
export async function decidirLecturaDelProgramaPropio(preguntar: () => Promise<boolean>): Promise<DecisionDeLaGuarda> {
  if (!rolDeLaCuenta || !ROLES_DEL_PERSONAL.has(rolDeLaCuenta.toUpperCase())) return 'pedir';
  if (activado === null) {
    if (!enVuelo) {
      const mia = generacion;
      const consulta: Promise<boolean | null> = preguntar().then(
        valor => valor,
        () => null,
      );
      enVuelo = consulta;
      void consulta.then(valor => {
        if (generacion !== mia) return;
        enVuelo = null;
        if (valor !== null) activado = valor;
      });
    }
    const valor = await enVuelo;
    return valor === false ? 'sin-activar' : 'pedir';
  }
  return activado ? 'pedir' : 'sin-activar';
}
