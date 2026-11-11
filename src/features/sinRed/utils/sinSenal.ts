import { mensajeDeError } from '../../../services/http/apiClient';

/**
 * Spec 048 (FR-004, FR-005): sin señal se dice «sin señal», no «No se pudo conectar con el servidor» en rojo.
 *
 * Una pantalla que LEE (al abrirse, al volver al foco) y falla sin señal no está rota: la cuenta todavía no tiene esa lectura
 * guardada en el teléfono. Pasaba en Plan (#182): «Esta semana» y «Acciones que mueven la meta» pintaban el error genérico del
 * cliente HTTP. Este es el único lugar que decide esa frase; las pantallas no la copian.
 *
 *  - `mensajeDeCarga` va donde antes iba `mensajeDeError` en un fallo de CARGA de algo que se guarda en el teléfono (Hoy, Plan,
 *    Entrenar…); `mensajeDeCargaEnLinea`, en lo que nunca se guarda y siempre pide conexión (chat, cursos, tribu, administración).
 *  - `<ErrorDeCarga>` lo pinta (sin rojo si es sin señal).
 *  - `useRecargarAlVolverLaSenal` lo vuelve a pedir cuando vuelve la señal.
 *  - `src/__tests__/reglas/sinSenalSeDiceSinSenal.test.ts` frena la copia a mano.
 */
export const TEXTO_SIN_SENAL_AL_CARGAR = 'Todavía no hay nada guardado de esto en este teléfono. Se cargará solo cuando vuelva la señal.';
/** Lo mismo para lo que nunca se guarda en el teléfono (spec 048, FR-005): las mismas palabras de `SoloConConexion`. */
export const TEXTO_SIN_SENAL_EN_LINEA = 'Necesitas conexión para usar esto. Se cargará solo cuando vuelva la señal.';

/**
 * ¿El pedido no tuvo respuesta del servidor (sin señal, backend caído o tiempo agotado)? Es el `status` 0 de `ApiError`. Se mira la forma
 * del error (`esDeRed`) y no `instanceof ApiError`: así no depende de cómo se importe la clase (ni de las pruebas que la reemplazan).
 */
export function esSinSenal(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { esDeRed?: unknown }).esDeRed === true;
}

/** ¿Este texto es el de «sin señal al cargar»? Lo usa `ErrorDeCarga` para no pintarlo como un error. */
export function esTextoSinSenal(mensaje: string | null | undefined): boolean {
  return mensaje === TEXTO_SIN_SENAL_AL_CARGAR || mensaje === TEXTO_SIN_SENAL_EN_LINEA;
}

/**
 * El texto de un fallo al CARGAR. Sin señal dice que todavía no hay nada guardado y que se cargará solo; con cualquier otro
 * error, lo que diría `traducir` (por defecto `mensajeDeError`; Plan usa `mensajeDeObjetivos`).
 */
export function mensajeDeCarga(
  error: unknown,
  porDefecto: string,
  traducir: (error: unknown, porDefecto: string) => string = mensajeDeError,
): string {
  return esSinSenal(error) ? TEXTO_SIN_SENAL_AL_CARGAR : traducir(error, porDefecto);
}

/** Como {@link mensajeDeCarga}, para lo que nunca se guarda en el teléfono: sin señal dice que necesita conexión. */
export function mensajeDeCargaEnLinea(
  error: unknown,
  porDefecto: string,
  traducir: (error: unknown, porDefecto: string) => string = mensajeDeError,
): string {
  return esSinSenal(error) ? TEXTO_SIN_SENAL_EN_LINEA : traducir(error, porDefecto);
}
