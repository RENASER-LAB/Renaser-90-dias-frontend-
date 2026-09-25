import type { FalloSemaforo } from '../hooks/useMiSemaforo';
import type { DetalleDelSemaforo, DiaDelSemaforo, SemaforoDeHoy } from '../types/semaforo.types';
import type { PosicionSemanal } from './semanasDelSemaforo';

/**
 * Cuándo se muestra cada entrada al semáforo y qué abre cada aviso. Funciones puras, fuera de las
 * pantallas, por dos motivos: Hoy es pestaña protegida y lo que se le agrega tiene que poder
 * probarse sin montarla, y estas condiciones son las que, si se equivocan, dejan una tarjeta vacía
 * o una pantalla a la que no se puede llegar.
 */

// ------------------------------------------------------------------------------------------
// La tarjeta del semáforo propio en Hoy
// ------------------------------------------------------------------------------------------

/**
 * Las barritas de la tarjeta de Hoy: las que ya trae `/home` si el backend las manda (una sola
 * petición); si no, las del detalle (`/me/semaforo`), como antes. `null` = todavía no hay barras:
 * la tarjeta se muestra sin ellas.
 */
export function diasParaLaTarjeta(
  semaforoDeHoy: SemaforoDeHoy | null | undefined,
  detalle: DetalleDelSemaforo | null,
): readonly DiaDelSemaforo[] | null {
  return semaforoDeHoy?.dias ?? detalle?.vigente?.dias ?? null;
}

/**
 * Si Hoy tiene que pedir `/me/semaforo`. Con el detalle abierto, siempre (los desgloses y las
 * semanas solo vienen ahí). Con la tarjeta sola, únicamente si la persona se mide y `/home` no trajo
 * los días: si los trajo, la segunda petición no aporta nada a la tarjeta.
 */
export function hayQuePedirMiSemaforo(semaforoDeHoy: SemaforoDeHoy | null | undefined, detalleAbierto: boolean): boolean {
  if (detalleAbierto) return true;
  return Boolean(semaforoDeHoy) && !semaforoDeHoy?.dias;
}

// ------------------------------------------------------------------------------------------
// Secciones y entradas que dependen de una lectura del servidor
// ------------------------------------------------------------------------------------------

/**
 * Si una sección del semáforo metida en otra pantalla (el grupo del mentor) desaparece: cuando el
 * servidor dice que la ruta no existe (404) o que quien mira no puede verla (403) **en la ventana
 * vigente**. Si eso pasa mirando una semana vieja, la sección se queda —con el aviso— para poder
 * volver; si no, esconderla dejaría a la persona sin las flechas.
 */
export function seOcultaLaSeccion(lectura: { posicion: PosicionSemanal; fallo: FalloSemaforo | null }): boolean {
  return (
    lectura.posicion.modo === 'vigente' && (lectura.fallo === 'no_disponible' || lectura.fallo === 'sin_permiso')
  );
}

/**
 * La tarjeta del líder de mentores en Hoy: solo cuando el servidor ya respondió que el resumen
 * existe (o falló por algo pasajero, que se reintenta adentro). Mientras la primera lectura no
 * llegó no se muestra, para no dibujar una entrada que un 404 va a borrar enseguida; y con 404 o
 * 403 no aparece — el resto de Hoy queda como estaba.
 */
export function entradaDelResumenVisible(lectura: {
  posicion: PosicionSemanal;
  datos: unknown;
  fallo: FalloSemaforo | null;
}): boolean {
  if (seOcultaLaSeccion(lectura)) return false;
  return !(lectura.posicion.modo === 'vigente' && lectura.datos === null && lectura.fallo === null);
}

// ------------------------------------------------------------------------------------------
// Qué abre cada aviso
// ------------------------------------------------------------------------------------------

/**
 * `/semaforo/grupos` (§4.5): el líder de mentores abre su resumen; administración y alquimista, la
 * vista de Administración. `esperar` mientras no se sabe si la cuenta administra (la capacidad llega
 * del servidor); `nadie` si no le corresponde a esta cuenta — entonces la ruta se deja sin atender,
 * igual que una ruta de alumno para quien no es mentor.
 */
export function quienAbreElResumenPorGrupos(params: {
  esLider: boolean;
  administrar: boolean;
  cargandoCapacidades: boolean;
}): 'lider' | 'administracion' | 'esperar' | 'nadie' {
  if (params.esLider) return 'lider';
  if (params.administrar) return 'administracion';
  return params.cargandoCapacidades ? 'esperar' : 'nadie';
}

/**
 * `/mentor/groups/{g}/semaforo` (§4.5): si el aviso es del grupo que el mentor acompaña, se abre su
 * grupo con la sección del semáforo a la vista. Si es de otro —un aviso viejo, de un grupo que ya
 * rotó—, se abre el grupo y nada más: esa tabla ya no es de este mentor. Mismo criterio que el
 * aviso de un alumno que ya no está en el padrón.
 */
export function comoAbrirElSemaforoDelGrupo(grupoDelAviso: string, grupoQueAcompana: string): 'seccion' | 'grupo' {
  return grupoDelAviso === grupoQueAcompana ? 'seccion' : 'grupo';
}
