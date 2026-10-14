/**
 * La consola Soporte TI desbloqueada (spec 002, plan §D6): el token de `POST /soporte-ti/desbloqueo` vive SOLO en
 * memoria —nunca en el teléfono— y se manda en `X-Consola-Token`. Se da por vencido a los 15 min sin usar la consola
 * (cada pedido que sale bien lo renueva). Quien manda es el servidor: si responde 423, se olvida igual.
 */
export const MINUTOS_DE_LA_CONSOLA = 15;
const DURACION_MS = MINUTOS_DE_LA_CONSOLA * 60_000;

let token: string | null = null;
let venceEnMs = 0;

/** El reloj, para las pruebas. */
let ahora: () => number = () => Date.now();
export function usarRelojDePrueba(reloj: (() => number) | null): void {
  ahora = reloj ?? (() => Date.now());
}

export function abrirConsola(nuevoToken: string, venceEn?: string | null): void {
  token = nuevoToken;
  const delServidor = venceEn ? Date.parse(venceEn) : NaN;
  venceEnMs = Number.isFinite(delServidor) && delServidor > ahora() ? delServidor : ahora() + DURACION_MS;
}

/** El token si la consola sigue abierta; `null` si nunca se abrió o ya pasaron los 15 min sin uso. */
export function tokenDeConsola(): string | null {
  if (token && ahora() < venceEnMs) return token;
  token = null;
  return null;
}

/** Un pedido salió bien: la consola está en uso, cuenta otros 15 min desde ahora. */
export function renovarConsola(): void {
  if (token) venceEnMs = Math.max(venceEnMs, ahora() + DURACION_MS);
}

export function consolaAbierta(): boolean {
  return tokenDeConsola() !== null;
}

export function cerrarConsola(): void {
  token = null;
  venceEnMs = 0;
}
