/**
 * Cuándo Yo ofrece Mi Radar y cuándo muestra su pantalla (spec 012 y 019). Las decisiones, puras: `YoScreen` solo las aplica.
 *
 * **Quién ve la fila «Mi Radar»:**
 *  - Quien ya lo tiene en marcha: desde el día 8 y con el servidor respondiendo (como siempre).
 *  - **El personal que todavía no eligió su Día 1**, pero SOLO cuando el servidor lo confirmó (403 `PROGRAMA_NO_ACTIVADO`): ahí la
 *    fila dice «Primero elige tu Día 1» y la pantalla le deja elegirlo. Con un backend anterior —que no manda ese motivo— no hay
 *    fila (FR-010). Nada de esto mira el rol: lo dice el servidor.
 *  - Nadie más: el aprendiz y quien ya va por su programa no ven ningún cambio.
 */
import type { LecturaDeMiRadar } from '../hooks/useConfigDeMiRadar';
import { miRadarCorresponde } from './miRadar';

/** Mi Radar anda: desde el día 8 y el servidor lo ofreció (`lista`). */
export function miRadarEnMarcha(lectura: LecturaDeMiRadar, diaPrograma: number | null | undefined): boolean {
  return miRadarCorresponde(diaPrograma) && lectura.estado === 'lista';
}

/** ¿Se dibuja la fila «Mi Radar» en Yo? */
export function veLaFilaDeMiRadar(lectura: LecturaDeMiRadar, diaPrograma: number | null | undefined): boolean {
  return miRadarEnMarcha(lectura, diaPrograma) || lectura.estado === 'sin-programa';
}

/**
 * ¿Hay que preguntarle al servidor por Mi Radar antes del día 8? Solo a quien podría no tener el programa activado: sin fila de
 * programa (`puedeIniciarPrograma`) o con la fila sin Día 1. Al resto —aprendices, quien ya va por su programa— no se les pide nada.
 */
export function hayQueAveriguarMiRadar({
  puedeIniciarPrograma,
  diaUnoSinElegir,
}: {
  puedeIniciarPrograma: boolean;
  diaUnoSinElegir: boolean;
}): boolean {
  return puedeIniciarPrograma || diaUnoSinElegir;
}

interface EstadoDeLaPantalla {
  /** La persona la abrió (con la fila o con un aviso). */
  abierta: boolean;
  lectura: LecturaDeMiRadar;
  /** El día del programa de `GET /home`, o `undefined`/`null` mientras no se sabe. */
  diaPrograma: number | null | undefined;
  /** La abrió desde la fila del personal sin programa: sigue abierta mientras elige su Día 1 y se vuelve a leer. */
  desdeLaFilaSinPrograma: boolean;
}

/**
 * ¿Se dibuja la pantalla estando abierta?
 *
 *  - Con Mi Radar a la vista, o abierta desde la fila del personal sin programa (aunque la lectura esté «cargando» tras elegir el Día 1).
 *  - Al venir de un aviso desde el día 8, cuando el servidor dijo por qué no (suspendida, sin permiso) o no se pudo leer: la pantalla
 *    lo explica en vez de quedar abierta sin dibujarse.
 *  - Mientras se lee (y no viene de la fila), no: espera a saber.
 */
export function seDibujaLaPantallaDeMiRadar({ abierta, lectura, diaPrograma, desdeLaFilaSinPrograma }: EstadoDeLaPantalla): boolean {
  if (!abierta) return false;
  if (desdeLaFilaSinPrograma || veLaFilaDeMiRadar(lectura, diaPrograma)) return true;
  return miRadarCorresponde(diaPrograma) && (lectura.estado === 'bloqueada' || lectura.estado === 'fallo');
}

/**
 * ¿Hay que cerrar la pantalla abierta? Un aviso viejo, o un backend que ya no lo ofrece, no la dejan esperando abierta. Mientras no se
 * sabe el día no se cierra. Si se abrió desde la fila del personal sin programa, antes del día 8 es lo esperado (lo que se muestra es
 * cuándo empieza): solo se cierra si el servidor dice que no lo ofrece.
 */
export function hayQueCerrarLaPantallaDeMiRadar({ abierta, lectura, diaPrograma, desdeLaFilaSinPrograma }: EstadoDeLaPantalla): boolean {
  if (!abierta) return false;
  if (lectura.estado === 'no-disponible') return true;
  const antesDelDia8 = diaPrograma != null && !miRadarCorresponde(diaPrograma);
  return antesDelDia8 && !desdeLaFilaSinPrograma;
}

/** La línea de la fila: el estado de Mi Radar si anda, o lo único que hay que hacer si todavía no. */
export const DETALLE_DE_LA_FILA_SIN_PROGRAMA = 'Primero elige tu Día 1';
