import * as habitsApi from '../habits/api/habitsApi';
import type { PreferenciaHabitoApi } from '../habits/types/habits.types';
import {
  ajustarRecordatoriosAlServidor,
  completarCambiosDiferidos,
  HAY_RECORDATORIOS_LOCALES,
  recordatoriosPorHabito,
} from '../habits/notificaciones/recordatoriosDeHabito';
import { confirmarAlarmasAlServidor, type ResultadoDeConfirmacion } from './confirmacionDeAlarmas';
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
 * 5. **Confirmar** al servidor: con esto el push de inicio deja de ir también a este teléfono.
 *
 * Un paso que falla no impide los demás, salvo la confirmación: si no se pudo leer lo que el servidor
 * sabe (paso 3), no se confirma — mejor un aviso de más que uno de menos.
 */
export interface DependenciasDePuestaAlDia {
  rearmar: (ahoraMs: number) => Promise<number | null>;
  completarDiferidos: (userId: string, ahora: Date) => Promise<number>;
  preferencias: () => Promise<PreferenciaHabitoApi[]>;
  armarQueFaltan: (userId: string, preferencias: PreferenciaHabitoApi[]) => Promise<number>;
  agregarRutas: (userId: string, ahoraMs: number) => Promise<number>;
  confirmar: () => Promise<ResultadoDeConfirmacion>;
}

export interface ResultadoDePuestaAlDia {
  rearmadas: number | null;
  convertidas: number;
  armadas: number | null;
  conRuta: number;
  confirmacion: ResultadoDeConfirmacion | 'sin_lectura_del_servidor';
}

const porDefecto: DependenciasDePuestaAlDia = {
  rearmar: ahoraMs => rearmarAlarmasProgramadas(ahoraMs),
  completarDiferidos: (userId, ahora) => completarCambiosDiferidos(userId, ahora),
  preferencias: () => habitsApi.obtenerPreferencias(),
  armarQueFaltan: (userId, preferencias) => ajustarRecordatoriosAlServidor(userId, preferencias),
  agregarRutas: async (userId, ahoraMs) => agregarRutaALasAlarmasDeHabitos(await recordatoriosPorHabito(userId), ahoraMs),
  confirmar: () => confirmarAlarmasAlServidor(),
};

let ultima: number | null = null;
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
}

/** `null` si no correspondía correr (sin alarmas locales, intervalo mínimo, o ya había una en curso). */
export async function ponerAlDiaLasAlarmas(
  userId: string | null,
  ahoraMs: number = Date.now(),
  deps: DependenciasDePuestaAlDia = porDefecto,
): Promise<ResultadoDePuestaAlDia | null> {
  if (!HAY_RECORDATORIOS_LOCALES) return null;
  if (corriendo) {
    // Entró alguien mientras corría la vuelta sin sesión del arranque: se corre al terminar esa.
    if (userId !== ultimoUsuario) otraVuelta = { userId, deps };
    return null;
  }
  if (userId === ultimoUsuario && !tocaRearmar(ultima, ahoraMs)) return null;
  corriendo = true;
  ultima = ahoraMs;
  ultimoUsuario = userId;
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
    const confirmacion = armadas === null ? 'sin_lectura_del_servidor' : await deps.confirmar();
    return { rearmadas, convertidas, armadas, conRuta, confirmacion };
  } finally {
    corriendo = false;
    const siguiente = otraVuelta;
    otraVuelta = null;
    if (siguiente) void ponerAlDiaLasAlarmas(siguiente.userId, Date.now(), siguiente.deps).catch(() => {});
  }
}
