import { ApiError, apiFetch } from '../../services/http/apiClient';
import { cabecerasDe } from './cabecerasSinRed';
import {
  agregarEnvio,
  alTerminarUnEnvio,
  cuentaDeLaSesion,
  leerCola,
  procesarCola,
  registrarManejador,
  type EnvioSinRed,
} from './colaSinRed';
import { horaReal, type HoraReal } from './horaReal';

/**
 * Spec 048, fase 3 (FR-019, D13, D14): UNA escritura genérica para Plan, Cierra tu día, Código Renaser y planificar hábitos.
 *
 * Casi todo lo de la fase es una llamada REST sin pasos intermedios, así que no hay un tipo de envío por pantalla: hay uno, `escritura`
 * (`{ area, etiqueta, metodo, ruta, cuerpo, resumen }`), y `escribirOEncolar` lo usan todas las áreas.
 *
 * - **Con señal** el pedido sale como siempre, sin cabeceras: el servidor responde lo de hoy.
 * - **Sin señal** (`esDeRed`) se guarda en la cola de la cuenta con la hora real y devuelve la RESPUESTA OPTIMISTA que arma el área
 *   (lo que se vería si el servidor hubiera contestado): la pantalla sigue como si hubiera salido.
 * - **El orden se respeta**: si ya hay escrituras esperando, la nueva se pone detrás (aunque haya señal) y se manda enseguida, para que
 *   no llegue antes que lo anterior. El servidor decide los choques por la hora lógica (`X-Hecho-En`), no por la de llegada.
 * - Al salir de la cola lleva las tres cabeceras de `cabecerasSinRed.ts`. Si el servidor no lo aplicó (409 con `codigo`), la cola lo da
 *   por terminado y anota el aviso (`avisosDeLoNoAplicado`).
 */
export type AreaSinRed = 'cierre' | 'radar' | 'plan' | 'habitos';
export type MetodoDeEscritura = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface EscrituraSinRed {
  area: AreaSinRed;
  /** Lo que se dice en un aviso si no se aplica: «Tu cierre del día», «Código Renaser de las 10:00». */
  etiqueta: string;
  metodo: MetodoDeEscritura;
  ruta: string;
  cuerpo?: unknown;
  /** Lo que la persona escribió, para mostrarlo en el aviso y que pueda volver a hacerlo (P4, P5, P7). */
  resumen?: string | null;
  /** Lo que el ajuste de lectura necesita para dibujar la escritura mientras espera. NO viaja al servidor. */
  contexto?: unknown;
  timeoutMs?: number;
}

export interface AjusteDeEscritura<T> {
  /** Valida la respuesta del servidor cuando hubo señal. */
  validar: (respuesta: unknown) => T;
  /** La respuesta que se ve mientras la escritura espera en la cola. */
  optimista: (envio: EnvioSinRed) => T | Promise<T>;
  /** Las reglas de la app antes de encolar (ventanas, día, campos): si no se cumplen, lanza el mismo error que con señal. */
  antesDeEncolar?: (hora: HoraReal) => void | Promise<void>;
}

/** Los tipos de envío que se ordenan entre sí: lo de la fase 3. */
const TIPOS_DE_LA_FASE = new Set(['escritura', 'completarAccion']);

export async function hayEscriturasEsperando(cuentaId: string): Promise<boolean> {
  return (await leerCola(cuentaId)).some(e => TIPOS_DE_LA_FASE.has(e.tipo));
}

export async function escribirOEncolar<T>(escritura: EscrituraSinRed, ajuste: AjusteDeEscritura<T>): Promise<T> {
  const cuenta = cuentaDeLaSesion();
  const detras = cuenta ? await hayEscriturasEsperando(cuenta) : false;
  if (!detras) {
    try {
      const respuesta = await apiFetch<unknown>(escritura.ruta, {
        method: escritura.metodo,
        ...(escritura.cuerpo !== undefined ? { body: escritura.cuerpo } : {}),
        ...(escritura.timeoutMs ? { timeoutMs: escritura.timeoutMs } : {}),
      });
      return ajuste.validar(respuesta);
    } catch (error) {
      // Solo «sin respuesta» se guarda; un 4xx/5xx del servidor se dice como siempre. Sin cuenta no hay dónde guardarlo.
      if (!(error instanceof ApiError && error.esDeRed) || !cuenta) throw error;
    }
  }
  if (!cuenta) throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  const hora = horaReal();
  await ajuste.antesDeEncolar?.(hora);
  const envio = await agregarEnvio(cuenta, 'escritura', { ...escritura }, hora);
  // Con señal pero detrás de otra escritura: sale ya, en orden. Sin señal, la cola lo intenta cuando vuelva.
  if (detras) void procesarCola(cuenta, Date.now(), { adelantar: true }).catch(() => undefined);
  return ajuste.optimista(envio);
}

/** Cómo manda la cola una escritura: el mismo pedido, ahora con las tres cabeceras de lo hecho sin señal. */
registrarManejador('escritura', async envio => {
  const d = envio.datos as unknown as EscrituraSinRed;
  await apiFetch<unknown>(d.ruta, {
    method: d.metodo,
    ...(d.cuerpo !== undefined ? { body: d.cuerpo } : {}),
    cabeceras: cabecerasDe(envio),
    ...(d.timeoutMs ? { timeoutMs: d.timeoutMs } : {}),
  });
});

/** Las escrituras de un área que esperan en la cola, en el orden en que se hicieron (para los ajustes de lectura). */
export async function escriturasEsperando(area: AreaSinRed, cuentaId: string | null = cuentaDeLaSesion()): Promise<Array<EscrituraSinRed & { idCliente: string; hechoEn: string }>> {
  if (!cuentaId) return [];
  return (await leerCola(cuentaId))
    .filter(e => e.tipo === 'escritura' && (e.datos as unknown as EscrituraSinRed).area === area)
    .map(e => ({ ...(e.datos as unknown as EscrituraSinRed), idCliente: e.idCliente, hechoEn: e.hechoEn }));
}

/**
 * Cuando algo de un área sale de la cola (llegó o no se aplicó), las pantallas que lo leen lo vuelven a pedir y lo guardado queda al
 * día, aunque la señal se vaya otra vez. Devuelve cómo darse de baja (cleanup de `useEffect`).
 */
export function alTerminarEnvioDe(area: AreaSinRed, oyente: () => void): () => void {
  return alTerminarUnEnvio(envio => {
    const d = envio.datos as { area?: unknown };
    const delArea = envio.tipo === 'completarAccion' ? area === 'plan' : envio.tipo === 'escritura' && d.area === area;
    if (delArea) oyente();
  });
}
