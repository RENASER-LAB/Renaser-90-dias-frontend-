import * as habitsApi from '../habits/api/habitsApi';
import type { PreferenciaHabitoApi } from '../habits/types/habits.types';
import {
  ajustarRecordatoriosAlServidor,
  completarCambiosDiferidos,
  HAY_RECORDATORIOS_LOCALES,
  recordatoriosPorHabito,
} from '../habits/notificaciones/recordatoriosDeHabito';
import { fotoDeLasAlarmasAlAbrir } from './alarmasVivas';
import { confirmarAlarmasAlServidor, type ResultadoDeConfirmacion } from './confirmacionDeAlarmas';
import { agruparAvisosQueCoinciden } from './avisosJuntos';
import { ponerLasAlarmasDeHabitosEnSuCanal } from './cambioDeSonido';
import { agregarRutaALasAlarmasDeHabitos, rearmarAlarmasProgramadas, tocaRearmar } from './rearmarAlarmas';

/**
 * Al abrir la app y al volver a primer plano (como mucho cada 10 min), deja las alarmas de este
 * teléfono como tienen que estar y recién ahí se lo confirma al servidor (D-217, 2026-09-28). En orden:
 *
 * 1. **Rearmar** las ya programadas (Android): las de antes del permiso de alarmas exactas quedan
 *    exactas, y las que el sistema borró al detener la app vuelven (`rearmarAlarmas.ts`).
 * 2. **Cambios de hora con fecha** que ya pueden pasar a ser la diaria (`completarCambiosDiferidos`).
 * 3. **Lo que dice el servidor** (`GET /habit-preferences`): arma lo que falta (teléfono nuevo,
 *    reinstalación), cancela lo que se apagó y ajusta lo que cambió en otro dispositivo.
 * 4. **La ruta** en las alarmas de hábitos de antes de D-218, para que tocarlas abra Training.
 *    4 bis (E-641): las alarmas de hábitos que siguen en un canal de antes, que no vibra, pasan al canal `-vib`
 *    (`ponerLasAlarmasDeHabitosEnSuCanal`), con la misma hora y el mismo identificador.
 * 5. **Confirmar** al servidor: con esto el push de inicio deja de ir también a este teléfono.
 *
 * El paso 3 también deja al día cómo suena cada hábito (spec 009) y RENUEVA la ventana de 7 días de las repeticiones
 * de «Repetir si no la atiendo» (`habits/notificaciones/repeticiones.ts`): sin esa renovación, que corre cada vez que
 * la app se abre, las repeticiones se acabarían a la semana.
 *
 * **Paso 0 (spec 007, FR-020):** antes de rearmar se toma la foto de «¿siguen vivas las alarmas?»
 * (`alarmasVivas.ts`). Rearmar las vuelve a poner y el sistema ya no dejaría ver que el teléfono las había
 * borrado; `AvisoDeAlarmasBorradas` usa esa foto, no una lectura posterior.
 *
 * Un paso que falla no impide los demás, salvo la confirmación: si no se pudo leer lo que el servidor
 * sabe (paso 3), no se confirma — mejor un aviso de más que uno de menos.
 */
export interface DependenciasDePuestaAlDia {
  /**
   * Toma la lectura de «¿siguen vivas las alarmas?» (spec 007, FR-020). Va ANTES de rearmar: rearmar vuelve a poner
   * las alarmas y el sistema siempre diría que están. Idempotente: solo la primera del proceso toma la foto.
   * Opcional para las pruebas de antes.
   */
  fotoDeLasAlarmas?: () => void;
  rearmar: (ahoraMs: number) => Promise<number | null>;
  completarDiferidos: (userId: string, ahora: Date) => Promise<number>;
  preferencias: () => Promise<PreferenciaHabitoApi[]>;
  armarQueFaltan: (userId: string, preferencias: PreferenciaHabitoApi[]) => Promise<number>;
  agregarRutas: (userId: string, ahoraMs: number) => Promise<number>;
  confirmar: () => Promise<ResultadoDeConfirmacion>;
  /** E-410: los avisos que coinciden suenan una sola vez. Opcional para las pruebas de antes. */
  agrupar?: (userId: string, ahoraMs: number) => Promise<number>;
  /**
   * E-641: pasa al canal que vibra las alarmas de hábitos que siguen en un canal de antes. Va ANTES de agrupar (que
   * ordena los avisos con los canales ya nuevos). Opcional para las pruebas de antes.
   */
  canales?: (userId: string, ahoraMs: number) => Promise<number>;
}

export interface ResultadoDePuestaAlDia {
  rearmadas: number | null;
  convertidas: number;
  armadas: number | null;
  conRuta: number;
  confirmacion: ResultadoDeConfirmacion | 'sin_lectura_del_servidor';
}

const porDefecto: DependenciasDePuestaAlDia = {
  fotoDeLasAlarmas: () => {
    void fotoDeLasAlarmasAlAbrir();
  },
  rearmar: ahoraMs => rearmarAlarmasProgramadas(ahoraMs),
  completarDiferidos: (userId, ahora) => completarCambiosDiferidos(userId, ahora),
  preferencias: () => habitsApi.obtenerPreferencias(),
  armarQueFaltan: (userId, preferencias) => ajustarRecordatoriosAlServidor(userId, preferencias),
  agregarRutas: async (userId, ahoraMs) => agregarRutaALasAlarmasDeHabitos(await recordatoriosPorHabito(userId), ahoraMs),
  confirmar: () => confirmarAlarmasAlServidor(),
  agrupar: (userId, ahoraMs) => agruparAvisosQueCoinciden(userId, ahoraMs),
  canales: (userId, ahoraMs) => ponerLasAlarmasDeHabitosEnSuCanal(userId, ahoraMs),
};

let ultima: number | null = null;
/** Termina cuando la corrida en curso termina; `null` si no hay ninguna. Ver {@link esperarLaPuestaAlDia}. */
let corridaEnCurso: Promise<void> | null = null;
let terminarCorrida: (() => void) | null = null;
/** Con quién corrió la última vez: al entrar alguien (o cambiar de cuenta) se corre ya, sin intervalo. */
let ultimoUsuario: string | null = null;
let corriendo = false;
let otraVuelta: { userId: string | null; deps: DependenciasDePuestaAlDia } | null = null;

/** Solo para las pruebas. */
export function olvidarUltimaPuestaAlDia(): void {
  ultima = null;
  ultimoUsuario = null;
  corriendo = false;
  otraVuelta = null;
  terminarCorrida?.();
  corridaEnCurso = null;
  terminarCorrida = null;
}

/**
 * Espera a que termine la puesta al día que está corriendo, si hay una (spec 007, historia 2). Quien quiere
 * decir «ya volvimos a poner tus alarmas» (`AvisoDeAlarmasBorradas`) llama a `ponerAlDiaLasAlarmas`, pero
 * si `RearmadorDeAlarmas` ya arrancó una, esa llamada vuelve de inmediato sin haber esperado nada. Sin
 * corrida en curso, vuelve al instante. Si al terminar una arranca otra (la de la cuenta que entró mientras
 * corría la del arranque sin sesión), espera también a esa. No lanza: una corrida que falla también termina.
 */
export async function esperarLaPuestaAlDia(): Promise<void> {
  // En bucle: al terminar la corrida del arranque sin sesión puede arrancar la de la cuenta que entró.
  while (corridaEnCurso) await corridaEnCurso;
}

/** `null` si no correspondía correr (sin alarmas locales, intervalo mínimo, o ya había una en curso). */
export async function ponerAlDiaLasAlarmas(
  userId: string | null,
  ahoraMs: number = Date.now(),
  deps: DependenciasDePuestaAlDia = porDefecto,
): Promise<ResultadoDePuestaAlDia | null> {
  if (!HAY_RECORDATORIOS_LOCALES) return null;
  // Antes de cualquier otra cosa, y también cuando luego no corresponde correr: es barato y solo la primera cuenta.
  try {
    deps.fotoDeLasAlarmas?.();
  } catch {
    // La foto es un refuerzo: si falla, la puesta al día sigue como siempre.
  }
  if (corriendo) {
    // Entró alguien mientras corría la vuelta sin sesión del arranque: se corre al terminar esa.
    if (userId !== ultimoUsuario) otraVuelta = { userId, deps };
    return null;
  }
  if (userId === ultimoUsuario && !tocaRearmar(ultima, ahoraMs)) return null;
  corriendo = true;
  ultima = ahoraMs;
  ultimoUsuario = userId;
  corridaEnCurso = new Promise<void>(resolver => {
    terminarCorrida = resolver;
  });
  try {
    const rearmadas = await deps.rearmar(ahoraMs).catch(() => null);
    if (!userId) {
      return { rearmadas, convertidas: 0, armadas: null, conRuta: 0, confirmacion: 'sin_token' };
    }
    const convertidas = await deps.completarDiferidos(userId, new Date(ahoraMs)).catch(() => 0);
    const armadas = await deps.preferencias()
      .then(preferencias => deps.armarQueFaltan(userId, preferencias))
      .catch(() => null);
    const conRuta = await deps.agregarRutas(userId, ahoraMs).catch(() => 0);
    // 4 bis (E-641). Las alarmas de hábitos que seguían en un canal de antes (sin vibración) pasan al que vibra.
    await deps.canales?.(userId, ahoraMs).catch(() => 0);
    // 4 ter. Los que coinciden a la misma hora: suena uno que nombra a todos (E-410).
    await deps.agrupar?.(userId, ahoraMs).catch(() => 0);
    const confirmacion = armadas === null ? 'sin_lectura_del_servidor' : await deps.confirmar();
    return { rearmadas, convertidas, armadas, conRuta, confirmacion };
  } finally {
    corriendo = false;
    terminarCorrida?.();
    terminarCorrida = null;
    corridaEnCurso = null;
    const siguiente = otraVuelta;
    otraVuelta = null;
    if (siguiente) void ponerAlDiaLasAlarmas(siguiente.userId, Date.now(), siguiente.deps).catch(() => {});
  }
}
