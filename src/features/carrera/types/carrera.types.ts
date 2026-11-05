/**
 * Tipos de la carrera con GPS (spec 042). La carrera vive SOLO en el teléfono mientras dura (FR-004): estos tipos son lo que
 * se guarda en el almacenamiento local y lo que la pantalla lee.
 */

/** Un punto tal como llega del GPS (`expo-location`). */
export interface PuntoGps {
  lat: number;
  lng: number;
  /** Instante del punto, en ms. */
  t: number;
  /** Precisión horizontal en metros (radio). `null` = desconocida: se descarta. */
  precision: number | null;
  /** Altitud en metros, si el GPS la dio. */
  altitud?: number | null;
  /** Velocidad que reporta el GPS, en m/s (negativa o `null` = desconocida). */
  velocidad?: number | null;
}

/** Un punto de la ruta ya aceptado y suavizado. */
export interface PuntoDeRuta {
  lat: number;
  lng: number;
  t: number;
}

/** Una muestra para el ritmo actual (últimos 30 s): tiempo activo y distancia en ese momento. */
export interface MuestraDeRitmo {
  activoMs: number;
  distanciaM: number;
}

export type FaseDeLaCarrera = 'corriendo' | 'pausa';

export interface EstadoDeLaCarrera {
  version: 1;
  /** UUID v4 generado al empezar: la clave de idempotencia del único envío (FR-002). */
  carreraId: string;
  cuentaId: string;
  iniciadaEnMs: number;
  fase: FaseDeLaCarrera;
  /** La pausa la puso la pausa automática (FR-010) y no la persona: se sigue sola al moverse. */
  pausaAutomatica: boolean;
  /** Tiempo activo acumulado de los tramos ya cerrados. */
  activoAcumuladoMs: number;
  /** Desde cuándo corre el tramo activo actual (`null` en pausa). */
  desdeMs: number | null;
  /** Último momento en que la app estuvo viva (punto, paso o latido): para tratar como pausa el tiempo muerto (FR-006). */
  ultimoLatidoMs: number;

  distanciaM: number;
  /** Lo rellenado con pasos en huecos cortos sin GPS (FR-035). */
  metrosSinGps: number;
  ruta: PuntoDeRuta[];
  /** Últimos puntos crudos aceptados por precisión y salto, para suavizar (FR-030). */
  ventana: PuntoGps[];
  /** El último crudo aceptado (referencia del filtro de saltos). */
  ultimoCrudo: PuntoGps | null;
  /** Posiciones suavizadas recientes (≈ 10 s), para la velocidad de ventana que decide si la persona está quieta. */
  recientes: PuntoDeRuta[];
  ultimoGpsBuenoMs: number | null;

  pasos: number;
  /** El teléfono da pasos (hay sensor y permiso). Sin pasos, todo se decide con el GPS (FR-036). */
  conPasos: boolean;
  /** Pasos desde el último punto GPS bueno (para rellenar un hueco, FR-035). */
  pasosEnHueco: number;
  ultimoPasoMs: number | null;
  /** Pasos y metros de GPS mientras había pasos: para calibrar la zancada. */
  pasosCalibracion: number;
  metrosCalibracion: number;

  /** Tiempo activo (s) al completar cada km. */
  marcasKm: number[];
  altitudSuavizada: number | null;
  altitudBase: number | null;
  subidaM: number;
  caloriasKcal: number;
  ultimoCalculoCaloriasMs: number;
  /** Distancia al último cálculo de calorías (FR-015: salen de los metros). Opcional: falta en un estado guardado antes. */
  ultimoCalculoCaloriasDistanciaM?: number;
  muestras: MuestraDeRitmo[];
  /** Desde cuándo no hay movimiento (para la pausa automática). */
  quietoDesdeMs: number | null;
  pesoKg: number;
  pausaAutomaticaActiva: boolean;
}

/** Preferencias de voz y sonidos (FR-010). Por cuenta, en el teléfono. */
export interface PreferenciasDeLaCarrera {
  avisos: 'km' | '5min' | 'nunca';
  dice: { distancia: boolean; tiempo: boolean; ritmo: boolean; ritmoUltimoKm: boolean };
  pitidos: boolean;
  pausaAutomatica: boolean;
  pantallaEncendida: boolean;
  /** «Guardar mi ruta» (FR-040, encendido por defecto). */
  guardarRuta: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: PreferenciasDeLaCarrera = {
  avisos: 'km',
  dice: { distancia: true, tiempo: true, ritmo: true, ritmoUltimoKm: true },
  pitidos: true,
  pausaAutomatica: true,
  pantallaEncendida: false,
  guardarRuta: true,
};

/** Un tramo de un km (FR-009). */
export interface Tramo {
  km: number;
  segundos: number;
  /** El último, si no llegó al km completo: `metros` < 1000. */
  parcial: boolean;
  metros: number;
}

/** El cuerpo de `POST /api/v1/carreras` (contracts/api.md §1). */
export interface CuerpoDeLaCarrera {
  carreraId: string;
  iniciadaEn: string;
  terminadaEn: string;
  duracionActivaSeg: number;
  distanciaMetros: number;
  subidaMetros?: number;
  pasos?: number;
  caloriasAprox?: number;
  tramos: Array<{ km: number; segundos: number }>;
  metrosSinGps?: number;
  ruta?: { polyline: string; puntos: number };
  appVersion?: string;
}

export type ResultadoDelHabito = 'CERRADO' | 'ACTUALIZADO' | 'SIN_CAMBIO' | 'YA_CON_CAPTURA' | 'DIA_CERRADO' | 'SIN_HABITO' | 'NO_CUENTA';

export interface RespuestaDeLaCarrera {
  carreraId: string;
  repetida: boolean;
  fecha: string | null;
  kilometros: number;
  cuentaParaElHabito: boolean;
  porRevisar: boolean;
  /** Por qué no cuenta para el hábito (FR-024), en texto que lee la persona; `null` si cuenta. */
  motivoNoCuenta: string | null;
  habito: {
    resultado: ResultadoDelHabito | string;
    registroId: string | null;
    kilometrosDelDia: number | null;
    origenDelDia: string | null;
    puntosOtorgados: number;
  } | null;
}
