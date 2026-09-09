import type { AlumnoCelula, AlumnoConEstado, MotivoSeguimiento } from './types/mentor.types';

/**
 * Quién necesita seguimiento, y por qué.
 *
 * Funciones puras a propósito, separadas de las pantallas: el criterio de "este aprendiz
 * necesita que su mentor le escriba" es una regla de producto que se va a afinar con el uso.
 * Teniéndola aquí, cambiarla es tocar una constante o una condición, no perseguir lógica
 * repartida entre una lista, un contador y un resumen que después se contradicen entre sí.
 *
 * Ninguna regla inventa datos. Cuando el servidor manda `null` —porque todavía no calcula esa
 * semana, o porque el aprendiz no arrancó— eso NO cuenta como incumplimiento: un `null` es
 * "no se sabe", y marcar a alguien en rojo por un dato que falta es peor que no marcarlo.
 */

/** Días sin registrar nada a partir de los cuales el mentor debería enterarse. */
export const DIAS_SIN_ACTIVIDAD_ALERTA = 3;

/** Días completos entre `iso` y ahora. `null` si no hay fecha o no se puede leer. */
export function diasDesde(iso: string | null, ahora: Date = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = ahora.getTime() - d.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / 86_400_000);
}

/** 0..1 de hábitos cumplidos sobre programados. `null` si el servidor no manda la semana. */
export function cumplimientoDe(alumno: AlumnoCelula): number | null {
  const { habitosProgramados: prog, habitosCumplidos: hechos } = alumno;
  if (prog === null || hechos === null) return null;
  // Sin hábitos programados no hay nada que cumplir; 0/0 no es 0 %, es "no aplica".
  if (prog <= 0) return null;
  return Math.max(0, Math.min(1, hechos / prog));
}

/**
 * Los motivos por los que un alumno pide atención, del más urgente al menos.
 *
 * El orden importa: es el que decide qué cápsula se lee primero en su fila.
 */
export function motivosDe(alumno: AlumnoCelula, ahora: Date = new Date()): MotivoSeguimiento[] {
  const motivos: MotivoSeguimiento[] = [];

  const dias = diasDesde(alumno.ultimaActividadEn, ahora);
  if (dias !== null && dias >= DIAS_SIN_ACTIVIDAD_ALERTA) {
    motivos.push({ clase: 'sin_actividad', dias });
  }

  const { habitosProgramados: prog, habitosCumplidos: hechos } = alumno;
  if (prog !== null && hechos !== null && prog > hechos) {
    motivos.push({ clase: 'habitos_pendientes', cantidad: prog - hechos });
  }

  if (alumno.evidenciasPendientes !== null && alumno.evidenciasPendientes > 0) {
    motivos.push({ clase: 'evidencias_pendientes', cantidad: alumno.evidenciasPendientes });
  }

  return motivos;
}

export function conEstado(alumno: AlumnoCelula, ahora: Date = new Date()): AlumnoConEstado {
  const motivos = motivosDe(alumno, ahora);
  return {
    ...alumno,
    motivos,
    requiereSeguimiento: motivos.length > 0,
    cumplimiento: cumplimientoDe(alumno),
  };
}

/**
 * La lista partida en dos, que es la decisión de diseño central de la pantalla.
 *
 * Un mentor con diez aprendices no quiere leer diez filas cada mañana para encontrar los dos
 * que se quedaron atrás. Dentro de cada mitad se ordena por urgencia y, a igualdad, por
 * nombre, para que la lista no baile entre recargas.
 */
export function repartirAlumnos(alumnos: AlumnoCelula[], ahora: Date = new Date()) {
  const todos = alumnos.map(a => conEstado(a, ahora));
  const porUrgencia = (a: AlumnoConEstado, b: AlumnoConEstado) => {
    if (b.motivos.length !== a.motivos.length) return b.motivos.length - a.motivos.length;
    const da = diasDesde(a.ultimaActividadEn, ahora) ?? -1;
    const db = diasDesde(b.ultimaActividadEn, ahora) ?? -1;
    if (db !== da) return db - da;
    return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es');
  };
  const porNombre = (a: AlumnoConEstado, b: AlumnoConEstado) =>
    (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es');

  return {
    requierenSeguimiento: todos.filter(a => a.requiereSeguimiento).sort(porUrgencia),
    alDia: todos.filter(a => !a.requiereSeguimiento).sort(porNombre),
    todos,
  };
}

/**
 * Las cifras de cabecera.
 *
 * `cumplimiento` sale de sumar hábitos, no de promediar porcentajes: promediar da el mismo peso
 * a quien tenía dos hábitos que a quien tenía diez. Y devuelve `null` —no 0— cuando ningún
 * alumno tiene semana calculada, para que la pantalla pueda decir "—" en vez de mentir con 0 %.
 */
export function resumenDe(alumnos: AlumnoConEstado[]) {
  const conSemana = alumnos.filter(a => a.habitosProgramados !== null && a.habitosCumplidos !== null);
  const programados = conSemana.reduce((s, a) => s + (a.habitosProgramados ?? 0), 0);
  const cumplidos = conSemana.reduce((s, a) => s + (a.habitosCumplidos ?? 0), 0);
  const evidencias = alumnos.reduce((s, a) => s + (a.evidenciasPendientes ?? 0), 0);

  return {
    total: alumnos.length,
    requierenSeguimiento: alumnos.filter(a => a.requiereSeguimiento).length,
    alDia: alumnos.filter(a => !a.requiereSeguimiento).length,
    cumplimiento: programados > 0 ? cumplidos / programados : null,
    evidenciasPendientes: alumnos.some(a => a.evidenciasPendientes !== null) ? evidencias : null,
  };
}

/** Texto corto para la cápsula de una fila. Sin emojis: el color no es el único portador. */
export function etiquetaDeMotivo(motivo: MotivoSeguimiento): string {
  switch (motivo.clase) {
    case 'sin_actividad':
      return motivo.dias === 1 ? '1 día sin actividad' : `${motivo.dias} días sin actividad`;
    case 'habitos_pendientes':
      return motivo.cantidad === 1 ? '1 hábito pendiente' : `${motivo.cantidad} hábitos pendientes`;
    case 'evidencias_pendientes':
      return motivo.cantidad === 1 ? '1 evidencia por revisar' : `${motivo.cantidad} evidencias por revisar`;
  }
}
