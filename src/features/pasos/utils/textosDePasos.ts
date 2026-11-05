import { formatoKm } from '../../habits/utils/formatoKm';

/**
 * Todo lo que la persona lee en los pasos (spec 037). Tuteo, tipo oración y pocas palabras (maqueta aprobada del 2026-11-02).
 * Los números llevan coma decimal y los miles un espacio duro: «5,4 km», «7 120 pasos».
 */

/** Espacio duro: el número y su unidad no se separan al partir el renglón. */
const ESPACIO = ' ';

export function formatoPasos(pasos: number): string {
  const entero = Math.round(pasos);
  return String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACIO);
}

export function kmConUnidad(km: number): string {
  return `${formatoKm(km)}${ESPACIO}km`;
}

export const TEXTOS_DE_PASOS = {
  /** El enlace bajo el nombre del hábito, mientras no están conectados. */
  enlaceParaConectar: 'Cuenta tus pasos solo',
  /** La fila con la meta alcanzada. */
  metaLista: '¡Meta lista!',
  registrar: 'Registrar',
  perdimosTusPasos: 'Perdimos tus pasos',
  sinPasosHoy: 'Todavía no vemos pasos hoy',
  actualizar: 'Actualizar',
  subirCaptura: 'Subir captura',
  desconectar: 'Desconectar',
  abrirHealthConnect: 'Abrir Health Connect',
  cambiarPrioridad: 'Cambiar prioridad',

  /** Hoja para conectar (1.2). */
  conectar: {
    titulo: 'Cuenta tus km solo',
    subtitulo: 'Con Health Connect, de Google.',
    lineas: [
      'Tu teléfono o tu reloj cuentan los pasos.',
      'Renaser solo lee pasos y distancia.',
      'Tu mentor y el ranking ven tu total de km.',
    ] as const,
    boton: 'Conectar',
    ahoraNo: 'Ahora no',
    pie: 'Puedes desconectar cuando quieras',
    politica: 'Política de privacidad',
  },
  /** Conectado (1.4). */
  conectado: {
    titulo: 'Ya contamos tus pasos',
    fuente: 'Fuente de tus pasos',
    listo: 'Listo',
  },
  /** Sin soporte (3.4): Android menor a 14, un teléfono sin Health Connect o el iPhone (web). Se queda la captura. */
  sinSoporte: {
    titulo: 'Sube tu captura',
    texto: 'Los pasos automáticos son solo para Android 14 o más.',
    boton: 'Subir captura',
  },
  sinPermiso: {
    titulo: 'Vuelve a permitir tus pasos',
    texto: 'Quitaste el permiso en Health Connect.',
  },
  sinDatos: {
    titulo: 'Todavía no vemos pasos hoy',
    texto: 'Lleva tu teléfono contigo o revisa que tu reloj sincronice.',
    manuales: 'Los pasos escritos a mano no cuentan.',
  },
  hoja: {
    hoy: 'Hoy',
    fuente: 'Fuente',
    ultimaLectura: 'Última lectura',
    fuentesDeHoy: 'Fuentes de hoy',
    laUsamos: 'La usamos',
    noSeSuma: 'No se suma',
    unaSolaVez: 'Contamos una sola vez: la fuente que pusiste primero en Health Connect.',
  },
  errores: {
    noSePudoRegistrar: 'No pudimos registrar tus km. Intenta de nuevo en un momento.',
    noSePudoConectar: 'No pudimos conectar tus pasos. Intenta de nuevo.',
  },
} as const;

export function textoDeLaMeta(km: number, meta: number): string {
  return `${formatoKm(km)} de ${kmConUnidad(meta)}`;
}

export function textoDeLaMetaLista(km: number): string {
  return `${kmConUnidad(km)} · ${TEXTOS_DE_PASOS.metaLista}`;
}

export function textoDelBotonRegistrar(km: number): string {
  return `Registrar ${kmConUnidad(km)}`;
}

export function textoDeLosPasos(pasos: number | null, aproximado: boolean): string | null {
  if (pasos == null || pasos <= 0) return aproximado ? 'aprox.' : null;
  return `${formatoPasos(pasos)}${ESPACIO}pasos${aproximado ? ' · aprox.' : ''}`;
}

export function textoDelAvisoDeRegistro(km: number): string {
  return `Registramos tus ${kmConUnidad(km)}.`;
}

/** «Hoy contamos desde las 14:05.» */
export function textoDesdeCuando(hora: string): string {
  return `Hoy contamos desde las ${hora}.`;
}

/**
 * Lo que dice la hoja de un hábito ya cumplido sobre los km: «5,4 km · Health Connect · Galaxy Watch» (o «5,4 km · Captura»).
 * `null` si el servidor no mandó el número del día.
 */
export function detalleDeLosKm(
  km: number | null | undefined,
  origen: string | null | undefined,
  fuente: string | null | undefined,
): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (origen === 'HEALTH_CONNECT') return [kmConUnidad(km), 'Health Connect', fuente].filter(Boolean).join(' · ');
  // Spec 042: los km del día salieron de una carrera con GPS.
  if (origen === 'GPS') return kmConUnidad(km) + ' · Carrera con GPS';
  return `${kmConUnidad(km)}${origen === 'MANUAL' ? ' · Captura' : ''}`;
}
