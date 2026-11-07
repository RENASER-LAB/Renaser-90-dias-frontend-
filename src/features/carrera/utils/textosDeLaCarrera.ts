import type { PreferenciasDeLaCarrera, RespuestaDeLaCarrera } from '../types/carrera.types';
import { formatoKm, formatoRitmo } from './ritmoYCalorias';

/**
 * Los textos de la carrera con GPS (spec 042), en un solo lugar: tipo oración, tuteo de Perú y coma decimal.
 */

export const TEXTOS_DE_LA_CARRERA = {
  entrada: 'Correr con GPS',
  entradaEnCurso: 'Carrera en curso · Volver',
  /** El botón de la derecha de la fila (pedido del dueño del 2026-11-05): corto, para no apretar el nombre. */
  botonDeLaFila: 'Correr',
  botonDeLaFilaEnCurso: 'Volver',
  empezarYa: 'Empezar ya',
  cancelar: 'Cancelar',
  aCorrer: '¡A correr!',
  duracion: 'Duración',
  distancia: 'Distancia',
  ritmo: 'Ritmo',
  calorias: 'Calorías',
  deslizaParaPausar: 'Desliza para pausar',
  pausarAccesible: 'Pausar la carrera',
  enPausa: 'En pausa',
  pausaAutomatica: 'En pausa automática · sigue al moverte',
  guardada: 'Tu carrera queda guardada, aunque cierres la app',
  verTramos: 'Ver mis tramos',
  verEstadisticas: 'Ver estadísticas',
  vozYSonidos: 'Voz y sonidos',
  bloquearPantalla: 'Bloquear la pantalla',
  seguir: 'Seguir',
  terminar: 'Terminar',
  descartar: 'Descartar esta carrera',
  descartarTitulo: '¿Descartar esta carrera?',
  descartarMensaje: 'Se borra de tu teléfono y no se guarda en ningún lado.',
  descartarSi: 'Descartar',
  terminaste: '¡Carrera terminada!',
  muyCorta: 'Muy corta para guardarla',
  muyCortaDetalle: 'Una carrera se guarda desde 100 m y 1 minuto. Puedes seguir corriendo o descartarla.',
  compartir: 'Compartir en el Muro',
  porRevisar: 'Quedó marcada «por revisar»: tu mentor la ve con esa marca.',
  listo: 'Listo',
  sinPermisoUbicacion: 'Para contar tus km con el GPS necesitamos tu ubicación mientras corres. Sin ella, puedes subir tu captura como siempre.',
  sinGpsActivo: 'Activa la ubicación de tu teléfono para empezar la carrera.',
  retomar: 'Tienes una carrera sin terminar',
  mapaSinClave: 'El mapa todavía no está disponible. Tu carrera se cuenta igual.',
  pestanas: { mapa: 'Mapa', estadisticas: 'Estadísticas', tramos: 'Tramos', voz: 'Voz' },
} as const;

export const TEXTOS_DE_LA_NOTIFICACION = {
  titulo: 'Carrera en curso',
  /** Notificación dorada (2026-11-07): «Corriendo · 2,45 km» / «En pausa · 2,45 km». */
  corriendo: 'Corriendo',
  pausa: 'En pausa',
  cuerpoDelServicio: 'Renaser registra tu recorrido',
  enPausa: 'Carrera en pausa',
  pausar: 'Pausar',
  seguir: 'Seguir',
  abrir: 'Abrir',
} as const;

/** «3,25 km · 00:21:04 · 6:29 min/km» (la notificación fija, FR-011). */
export function lineaDeLaNotificacion(metros: number, duracion: string, ritmoSeg: number | null): string {
  return `${formatoKm(metros)} km · ${duracion} · ${formatoRitmo(ritmoSeg)} min/km`;
}

/** Título de la notificación dorada: «Corriendo · 2,45 km» o «En pausa · 2,45 km». */
export function tituloDeLaNotificacion(metros: number, enPausa: boolean): string {
  return `${enPausa ? TEXTOS_DE_LA_NOTIFICACION.pausa : TEXTOS_DE_LA_NOTIFICACION.corriendo} · ${formatoKm(metros)} km`;
}

/**
 * Texto de la notificación dorada. Corriendo, el tiempo lo lleva el cronómetro del sistema (sube solo, segundo a segundo) y el
 * texto es solo el ritmo; en pausa el cronómetro se apaga y el tiempo va fijo en el texto.
 */
export function cuerpoDeLaNotificacion(duracion: string, ritmoSeg: number | null, enPausa: boolean): string {
  const ritmo = `Ritmo ${formatoRitmo(ritmoSeg)} min/km`;
  return enPausa ? `${duracion} · ${ritmo}` : ritmo;
}

/** La chapita del mapa: «Km 3 · 0,47 en 2:44». */
export function chapaDelKm(metros: number, segundosDelKmEnCurso: number): string {
  const km = Math.floor(metros / 1000) + 1;
  const parcial = ((metros % 1000) / 1000).toFixed(2).replace('.', ',');
  const min = Math.floor(segundosDelKmEnCurso / 60);
  const seg = Math.floor(segundosDelKmEnCurso % 60);
  return `Km ${km} · ${parcial} en ${min}:${String(seg).padStart(2, '0')}`;
}

export type EstadoDelEnvio =
  | { tipo: 'enviando'; km: string }
  | { tipo: 'en-cola'; km: string }
  | { tipo: 'bloqueada'; motivo: string }
  | { tipo: 'respondida'; respuesta: RespuestaDeLaCarrera }
  | { tipo: 'ya-registrada' };

/** La línea del hábito en «Terminaste» (FR-018). `conHabito` = la formación tiene el hábito de km. */
export function lineaDelEnvio(estado: EstadoDelEnvio, conHabito: boolean): string {
  switch (estado.tipo) {
    case 'enviando':
      return conHabito ? `Registrando ${estado.km} km en tu hábito…` : 'Guardando tu carrera…';
    case 'en-cola':
      return 'Guardada en tu teléfono, se enviará al tener señal';
    case 'bloqueada':
      return `No pudimos guardar tu carrera: ${estado.motivo}`;
    case 'ya-registrada':
      return 'Esta carrera ya estaba guardada.';
    case 'respondida': {
      const r = estado.respuesta;
      // El mismo formato que la tarjeta de «Terminaste» («0,40»): dos decimales, coma (formatoKm).
      const km = formatoKm(Math.round(r.kilometros * 1000));
      switch (r.habito?.resultado) {
        case 'CERRADO':
        case 'ACTUALIZADO':
        case 'SIN_CAMBIO':
          return `Registramos ${km} km en tu hábito`;
        case 'YA_CON_CAPTURA':
          return 'Tu carrera quedó guardada. Hoy ya registraste este hábito con tu captura.';
        case 'DIA_CERRADO':
          return 'Tu carrera quedó guardada. Su día ya cerró, así que no entra a tu hábito.';
        case 'SIN_HABITO':
          return 'Tu carrera quedó guardada.';
        case 'NO_CUENTA':
          return r.motivoNoCuenta
            ? `Tu carrera quedó guardada, pero no entra a tu hábito: ${r.motivoNoCuenta.replace(/\.$/, '')}.`
            : 'Tu carrera quedó guardada, pero no entra a tu hábito: la velocidad o la distancia no se registran solas.';
        default:
          return 'Tu carrera quedó guardada.';
      }
    }
  }
}

/** Lo que dice la voz en un aviso (FR-010), según lo que la persona eligió. */
export function fraseDelAviso(
  prefs: PreferenciasDeLaCarrera,
  datos: { metros: number; activoMs: number; ritmoSeg: number | null; ritmoUltimoKmSeg: number | null },
): string {
  const partes: string[] = [];
  if (prefs.dice.distancia) partes.push(`${formatoKm(datos.metros).replace(',00', '')} kilómetros`);
  if (prefs.dice.tiempo) {
    const min = Math.floor(datos.activoMs / 60_000);
    const h = Math.floor(min / 60);
    partes.push(h > 0 ? `${h} hora${h > 1 ? 's' : ''} ${min % 60} minutos` : `${min} minuto${min === 1 ? '' : 's'}`);
  }
  if (prefs.dice.ritmo && datos.ritmoSeg != null) partes.push(`ritmo ${dichoDelRitmo(datos.ritmoSeg)}`);
  if (prefs.dice.ritmoUltimoKm && datos.ritmoUltimoKmSeg != null) partes.push(`último kilómetro ${dichoDelRitmo(datos.ritmoUltimoKmSeg)}`);
  return partes.join('. ');
}

function dichoDelRitmo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.round(seg % 60);
  return `${m} minutos ${s} segundos por kilómetro`;
}

/** ¿Toca un aviso de voz entre la lectura anterior y la de ahora? Cada km completo, o cada 5 min de tiempo activo. */
export function tocaAviso(
  prefs: PreferenciasDeLaCarrera,
  antes: { metros: number; activoMs: number },
  ahora: { metros: number; activoMs: number },
): boolean {
  if (prefs.avisos === 'km') return Math.floor(ahora.metros / 1000) > Math.floor(antes.metros / 1000);
  if (prefs.avisos === '5min') return Math.floor(ahora.activoMs / 300_000) > Math.floor(antes.activoMs / 300_000);
  return false;
}
