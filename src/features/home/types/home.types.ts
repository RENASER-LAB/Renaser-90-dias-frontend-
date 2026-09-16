/**
 * Espejo de `ResumenHomeResponse` del backend Java (`GET /api/v1/home`, modulo `points`).
 *
 * Los nombres van en espanol porque asi los publica el backend — el remapeo a ingles que
 * menciona el javadoc de `ConsultarResumenHomeUseCase` es trabajo futuro suyo, no de la app.
 *
 * Cuatro campos son anulables A PROPOSITO: el backend documenta que `habitosHoy`, `rocasHoy`,
 * `proximoEvento` y `notificacionesNoLeidas` vienen `null` cuando ESE widget no se pudo
 * componer, sin que falle la respuesta entera. La pantalla tiene que saber no dibujar la
 * tarjeta correspondiente en vez de mostrar un cero que no es cierto.
 */

/** Fase del programa. Los literales son los del backend; el rotulo en espanol se arma aparte. */
export type FaseProgramaApi =
  | 'PHASE_1_REBIRTH'
  | 'PHASE_2_DEVELOPMENT'
  | 'PHASE_3_ALCHEMIST_WARRIOR'
  | 'PHASE_4_ASCENSION';

export type ConteoHoyApi = {
  completados: number;
  total: number;
};

export type ProximoEventoApi = {
  eventoId: string;
  titulo: string;
  /** ISO-8601 con zona (Instant de Java). */
  iniciaEn: string;
};

export type ResumenHomeApi = {
  puntosLiga: number;
  /** `null` cuando no planifico acciones en la semana: no hay porcentaje que mostrar (D-128). */
  coherencia: number | null;
  rachaActual: number;
  rachaMaxima: number;
  /** 0 a 90. El 0 es legitimo: eligio fecha de inicio pero el programa no arranco. */
  diaPrograma: number;
  inscrito: boolean;
  /** Puede ser un valor que esta app todavia no conoce; por eso se tipa ancho. */
  fase: FaseProgramaApi | string | null;
  habitosHoy: ConteoHoyApi | null;
  rocasHoy: ConteoHoyApi | null;
  proximoEvento: ProximoEventoApi | null;
  notificacionesNoLeidas: number | null;
  /**
   * Datos que el backend declara que NO pudo componer, y por que. No es un error: es el
   * contrato diciendo explicitamente que no invento el valor. La app no dibuja eso.
   */
  bloqueos: string[];
};
