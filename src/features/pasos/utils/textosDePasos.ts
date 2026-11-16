import { Platform } from 'react-native';

import { formatoKm } from '../../habits/utils/formatoKm';
import { PREFIJO_DE_LA_FUENTE_DE_APPLE } from './fuentesDeSalud';

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
      'Tu mentor y la tabla de kilómetros ven tu total de km.',
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
    /** Un botón para abrir la app de salud desde aquí; solo en iPhone (Apple no dice si el permiso se negó, ver `textosDePasosPara`). */
    abrir: null as string | null,
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

/** Todos los textos, con cada frase ancha (`string`) para que la versión de iPhone pueda decir otra cosa con la misma forma. */
type Ancho<T> = T extends string ? string : T extends readonly (infer U)[] ? readonly Ancho<U>[] : T extends null ? string | null : { [K in keyof T]: Ancho<T[K]> };
export type TextosDePasos = Ancho<typeof TEXTOS_DE_PASOS>;

/**
 * Los textos en iPhone (spec 037, D-362, FR-022): el mismo flujo y los mismos botones, con «Salud» donde en Android dice «Health Connect».
 * Apple no dice si la persona negó la lectura, así que «Todavía no vemos pasos hoy» le pide revisar el permiso en Salud y le ofrece abrirla.
 */
export const TEXTOS_DE_PASOS_EN_IPHONE: TextosDePasos = {
  ...TEXTOS_DE_PASOS,
  abrirHealthConnect: 'Abrir Salud',
  conectar: {
    ...TEXTOS_DE_PASOS.conectar,
    subtitulo: 'Con la app Salud, de Apple.',
    lineas: [
      'Tu iPhone o tu Apple Watch cuentan los pasos.',
      'Renaser solo lee pasos y distancia.',
      'Tu mentor y la tabla de kilómetros ven tu total de km.',
    ],
  },
  sinSoporte: { ...TEXTOS_DE_PASOS.sinSoporte, texto: 'Los pasos automáticos necesitan la app Salud de Apple.' },
  sinPermiso: { ...TEXTOS_DE_PASOS.sinPermiso, texto: 'Quitaste el permiso en Salud.' },
  sinDatos: {
    ...TEXTOS_DE_PASOS.sinDatos,
    texto: 'Lleva tu iPhone contigo o revisa que tu Apple Watch sincronice. Si no diste permiso, actívalo en Salud.',
    abrir: 'Abrir Salud',
  },
  hoja: { ...TEXTOS_DE_PASOS.hoja, unaSolaVez: 'Contamos una sola vez lo que miden tu iPhone y tu Apple Watch.' },
};

/** Los textos de la plataforma (`Platform.OS`): iPhone con Salud; Android y la web, los de Health Connect. */
export function textosDePasosPara(plataforma: string): TextosDePasos {
  return plataforma === 'ios' ? TEXTOS_DE_PASOS_EN_IPHONE : TEXTOS_DE_PASOS;
}

/** Los de este teléfono. Va en el cuerpo de los componentes, no al importar el archivo. */
export const textosDeEstaPlataforma = (): TextosDePasos => textosDePasosPara(Platform.OS);

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
  // Spec 037 FR-023: el servidor guarda la medición de iPhone como HEALTH_CONNECT; la fuente que manda la app lleva «Salud · ».
  if (origen === 'HEALTH_CONNECT' && fuente?.startsWith(PREFIJO_DE_LA_FUENTE_DE_APPLE)) return `${kmConUnidad(km)} · ${fuente}`;
  if (origen === 'HEALTH_CONNECT') return [kmConUnidad(km), 'Health Connect', fuente].filter(Boolean).join(' · ');
  // Spec 042: los km del día salieron de una carrera con GPS.
  if (origen === 'GPS') return kmConUnidad(km) + ' · Carrera con GPS';
  return `${kmConUnidad(km)}${origen === 'MANUAL' ? ' · Captura' : ''}`;
}
