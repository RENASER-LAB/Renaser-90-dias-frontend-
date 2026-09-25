import { z } from 'zod';

import type {
  AprendizDelSemaforo,
  ColorSemaforo,
  ConteoDelDia,
  DetalleDelSemaforo,
  DiaDelSemaforo,
  EstadoDiaSemaforo,
  GrupoDelResumen,
  PausaDelSemaforo,
  ResumenPorColor,
  ResumenPorGrupos,
  SemaforoDeHoy,
  SemaforoDelGrupo,
  SemanaCerrada,
  VentanaDelSemaforo,
} from '../types/semaforo.types';

/**
 * Validación y normalización del semáforo (contrato del backend, §4.1 a §4.4).
 *
 * Dos pasos, en este orden:
 *
 * 1. **Validar** con Zod lo que es imprescindible: fechas, `aplica`, la forma de cada día. Si eso
 *    falta, la respuesta no sirve y se dice con un error claro en vez de dibujar a medias.
 * 2. **Normalizar** todo lo demás: `undefined` pasa a `null`, un color o un estado que esta versión
 *    no conoce pasa a "sin datos", y se imponen las dos reglas del contrato que nunca se pueden
 *    romper en pantalla — **sin porcentaje no hay color** (nunca verde por falta de datos) y **un
 *    día que no es `MEDIDO` no tiene porcentaje** (nunca un 0 % inventado).
 *
 * `passthrough()` en todos los objetos y `.nullish()` en los campos que no son imprescindibles: que
 * el backend agregue o todavía no mande un campo no puede tumbar una pantalla. Es la lección de
 * `home/api/__tests__/coherenciaSinAcciones.test.ts`, cuando un `null` legítimo tiró Inicio entera.
 *
 * `validarRespuesta` está duplicada en cada feature a propósito (AGENTS.md: cada feature es dueña
 * de su validación).
 */

// ------------------------------------------------------------------------------------------
// Vocabulario
// ------------------------------------------------------------------------------------------

const COLORES_CON_DATOS = ['VERDE', 'AMARILLO', 'ROJO'] as const;

const ESTADOS_CONOCIDOS: readonly EstadoDiaSemaforo[] = [
  'MEDIDO',
  'SIN_DATOS',
  'PAUSADO',
  'PENDIENTE',
  'FUERA_DEL_PROGRAMA',
];

/** Un color que la app no conoce se lee como `SIN_DATOS`: nunca se afirma un estado que no se entiende. */
export function aColorSemaforo(valor: unknown): ColorSemaforo {
  return (COLORES_CON_DATOS as readonly unknown[]).includes(valor) ? (valor as ColorSemaforo) : 'SIN_DATOS';
}

/** Un estado nuevo del backend se lee como `DESCONOCIDO`: se pinta neutro y no se nombra mal. */
export function aEstadoDelDia(valor: unknown): EstadoDiaSemaforo {
  return (ESTADOS_CONOCIDOS as readonly unknown[]).includes(valor) ? (valor as EstadoDiaSemaforo) : 'DESCONOCIDO';
}

/**
 * Color, palabra y porcentaje de un promedio (la ventana vigente, una semana o el resumen de Hoy),
 * con la regla dura aplicada: **sin número, "Sin datos"**; y un color que no se entiende tampoco
 * lleva número.
 *
 * La palabra del servidor se conserva solo cuando describe lo que se va a pintar. Si el servidor
 * mandara `VERDE`/«Al día» sin porcentaje, la pantalla diría «Sin datos», no «Al día».
 */
export function aLecturaDelPromedio(
  color: unknown,
  etiqueta: string | null | undefined,
  porcentaje: number | null | undefined,
): { color: ColorSemaforo; etiqueta: string | null; porcentaje: number | null } {
  const conocido = aColorSemaforo(color);
  const palabra = etiqueta?.trim() ? etiqueta.trim() : null;
  if (typeof porcentaje !== 'number' || !Number.isFinite(porcentaje) || conocido === 'SIN_DATOS') {
    return { color: 'SIN_DATOS', etiqueta: color === 'SIN_DATOS' ? palabra : null, porcentaje: null };
  }
  return { color: conocido, etiqueta: palabra, porcentaje };
}

// ------------------------------------------------------------------------------------------
// Esquemas del cable
// ------------------------------------------------------------------------------------------

const conteoSchema = z
  .object({
    programados: z.number(),
    cumplidos: z.number(),
  })
  .passthrough();

const diaSchema = z
  .object({
    fecha: z.string(),
    /** String y no enum: un estado nuevo no puede tumbar el detalle (ver `aEstadoDelDia`). */
    estado: z.string(),
    porcentaje: z.number().nullish(),
    color: z.string().nullish(),
    /**
     * La palabra del color de ESE día (aditivo del backend, en todas las respuestas). Se acepta y
     * no se guarda: la palabra de un día sale de su color YA normalizado (`PALABRA_DEL_COLOR`), así
     * un día que acá se lee como "sin datos" nunca queda rotulado «Al día».
     */
    etiqueta: z.string().nullish(),
    /** Los días cortos (`/home`, la tabla de un grupo) no traen conteos: quedan en `null`. */
    habitos: conteoSchema.nullish(),
    objetivos: conteoSchema.nullish(),
  })
  .passthrough();

const ventanaSchema = z
  .object({
    desde: z.string(),
    hasta: z.string(),
    /** `BigDecimal` con un decimal, serializado como número (78.3). */
    porcentaje: z.number().nullish(),
    color: z.string().nullish(),
    etiqueta: z.string().nullish(),
    diasConDatos: z.number().nullish(),
    cerrada: z.boolean().nullish(),
    dias: z.array(diaSchema).nullish(),
  })
  .passthrough();

const semanaSchema = z
  .object({
    desde: z.string(),
    hasta: z.string(),
    porcentaje: z.number().nullish(),
    color: z.string().nullish(),
    etiqueta: z.string().nullish(),
    diasConDatos: z.number().nullish(),
    cerradaEn: z.string().nullish(),
  })
  .passthrough();

const pausaSchema = z
  .object({
    desde: z.string(),
    hasta: z.string(),
  })
  .passthrough();

const detalleSchema = z
  .object({
    aplica: z.boolean(),
    obligatorio: z.boolean().nullish(),
    zona: z.string().nullish(),
    pausa: pausaSchema.nullish(),
    vigente: ventanaSchema.nullish(),
    semanas: z.array(semanaSchema).nullish(),
    calculadoEn: z.string().nullish(),
  })
  .passthrough();

/**
 * Los días del campo `semaforo` de `/home`, con su propio `.catch`: si llegaran mal formados se
 * pierden SOLO las barritas —la tarjeta vuelve a pedirlas a `/me/semaforo`, como antes de que el
 * backend las mandara— y no la tarjeta entera. En desarrollo se avisa, igual que `homeSchemas`.
 */
const diasDeHoyTolerantes = z
  .array(diaSchema)
  .nullish()
  .catch(({ error }) => {
    if (__DEV__) {
      const detalle = error.issues.map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`).join(' | ');
      console.warn(`GET /api/v1/home: "semaforo.dias" no tiene la forma esperada y se ignora — ${detalle}`);
    }
    return null;
  });

/**
 * El campo `semaforo` de `GET /api/v1/home`. Solo `color` es imprescindible; lo demás, si falta, se
 * deja de mostrar. Quien lo incrusta en `/home` lo envuelve además en un `.catch`: un semáforo mal
 * formado esconde la tarjeta, nunca tira Inicio.
 */
export const semaforoDeHoySchema = z
  .object({
    color: z.string(),
    etiqueta: z.string().nullish(),
    porcentaje: z.number().nullish(),
    diasConDatos: z.number().nullish(),
    pausado: z.boolean().nullish(),
    /** Aditivo: los 7 días cortos. Con ellos la tarjeta no necesita una segunda petición. */
    dias: diasDeHoyTolerantes,
  })
  .passthrough();

/**
 * Cuántos hay en cada color. Dentro del objeto las cinco cifras son imprescindibles, como los
 * conteos de un día: una línea de cantidades con un hueco diría algo que el servidor no dijo.
 */
const resumenPorColorSchema = z
  .object({
    verde: z.number(),
    amarillo: z.number(),
    rojo: z.number(),
    sinDatos: z.number(),
    total: z.number(),
  })
  .passthrough();

/** Una fila de la tabla de un grupo (§4.3). */
const aprendizDelGrupoSchema = z
  .object({
    /** Imprescindible: es la clave de la fila y lo que abre su detalle. */
    aprendizId: z.string(),
    nombre: z.string().nullish(),
    avatarUrl: z.string().nullish(),
    porcentaje: z.number().nullish(),
    color: z.string().nullish(),
    etiqueta: z.string().nullish(),
    diasConDatos: z.number().nullish(),
    dias: z.array(diaSchema).nullish(),
  })
  .passthrough();

/**
 * La tabla de un grupo (§4.3), la misma para el mentor y para administración. Las fechas son
 * imprescindibles: sin ellas no se puede decir qué días se miran ni navegar a otra semana.
 */
const grupoSchema = z
  .object({
    grupoId: z.string().nullish(),
    grupoNombre: z.string().nullish(),
    desde: z.string(),
    hasta: z.string(),
    cerrada: z.boolean().nullish(),
    resumen: resumenPorColorSchema.nullish(),
    aprendices: z.array(aprendizDelGrupoSchema).nullish(),
  })
  .passthrough();

/** Una fila del resumen por grupos (§4.4). No tiene dónde traer un aprendiz, y así se queda. */
const grupoDelResumenSchema = z
  .object({
    grupoId: z.string(),
    grupoNombre: z.string().nullish(),
    mentorNombre: z.string().nullish(),
    resumen: resumenPorColorSchema.nullish(),
    /** `BigDecimal` con un decimal, o `null` si ningún aprendiz del grupo tuvo datos. */
    promedio: z.number().nullish(),
  })
  .passthrough();

/** El resumen por grupos (§4.4): líder de mentores, administración y alquimista. */
const resumenPorGruposSchema = z
  .object({
    desde: z.string(),
    hasta: z.string(),
    cerrada: z.boolean().nullish(),
    totales: resumenPorColorSchema.nullish(),
    grupos: z.array(grupoDelResumenSchema).nullish(),
  })
  .passthrough();

export type SemaforoDeHoyCrudo = z.infer<typeof semaforoDeHoySchema>;
type DetalleCrudo = z.infer<typeof detalleSchema>;
type DiaCrudo = z.infer<typeof diaSchema>;
type VentanaCruda = z.infer<typeof ventanaSchema>;
type SemanaCruda = z.infer<typeof semanaSchema>;
type ResumenPorColorCrudo = z.infer<typeof resumenPorColorSchema>;
type AprendizCrudo = z.infer<typeof aprendizDelGrupoSchema>;
export type SemaforoDelGrupoCrudo = z.infer<typeof grupoSchema>;
type GrupoDelResumenCrudo = z.infer<typeof grupoDelResumenSchema>;
export type ResumenPorGruposCrudo = z.infer<typeof resumenPorGruposSchema>;

export const semaforoSchemas = {
  detalle: detalleSchema,
  deHoy: semaforoDeHoySchema,
  grupo: grupoSchema,
  grupos: resumenPorGruposSchema,
};

// ------------------------------------------------------------------------------------------
// Normalización: de lo que llega a lo que se dibuja
// ------------------------------------------------------------------------------------------

function aConteo(crudo: DiaCrudo['habitos']): ConteoDelDia | null {
  return crudo ? { programados: crudo.programados, cumplidos: crudo.cumplidos } : null;
}

/**
 * Un día. Solo un día `MEDIDO`, con porcentaje y con un color que se entiende, conserva su número;
 * cualquier contradicción (MEDIDO sin porcentaje, un color nuevo) se lee como "no sé", no como 0.
 */
export function aDiaDelSemaforo(crudo: DiaCrudo): DiaDelSemaforo {
  const estado = aEstadoDelDia(crudo.estado);
  const base = { fecha: crudo.fecha, habitos: aConteo(crudo.habitos), objetivos: aConteo(crudo.objetivos) };
  const color = aColorSemaforo(crudo.color);
  const porcentaje = crudo.porcentaje;

  if (estado !== 'MEDIDO') {
    return { ...base, estado, porcentaje: null, color: 'SIN_DATOS' };
  }
  if (typeof porcentaje !== 'number' || !Number.isFinite(porcentaje) || color === 'SIN_DATOS') {
    return { ...base, estado: 'DESCONOCIDO', porcentaje: null, color: 'SIN_DATOS' };
  }
  return { ...base, estado, porcentaje, color };
}

/** Por fecha ascendente. `yyyy-MM-dd` ordena bien como texto. El contrato ya lo manda así. */
function porFecha<T>(clave: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => (clave(a) < clave(b) ? -1 : clave(a) > clave(b) ? 1 : 0);
}

function aVentana(crudo: VentanaCruda): VentanaDelSemaforo {
  return {
    desde: crudo.desde,
    hasta: crudo.hasta,
    ...aLecturaDelPromedio(crudo.color, crudo.etiqueta, crudo.porcentaje),
    diasConDatos: crudo.diasConDatos ?? null,
    cerrada: crudo.cerrada ?? false,
    dias: (crudo.dias ?? []).map(aDiaDelSemaforo).sort(porFecha(d => d.fecha)),
  };
}

function aSemanaCerrada(crudo: SemanaCruda): SemanaCerrada {
  return {
    desde: crudo.desde,
    hasta: crudo.hasta,
    ...aLecturaDelPromedio(crudo.color, crudo.etiqueta, crudo.porcentaje),
    diasConDatos: crudo.diasConDatos ?? null,
    cerradaEn: crudo.cerradaEn ?? null,
  };
}

function aPausa(crudo: DetalleCrudo['pausa']): PausaDelSemaforo | null {
  return crudo ? { desde: crudo.desde, hasta: crudo.hasta } : null;
}

/**
 * El detalle completo. Si `aplica` es `false` el resto se vacía, diga lo que diga el cable: el
 * contrato promete `vigente: null`, `semanas: []` y `pausa: null`, y la pantalla no tiene que
 * adivinar cuál de las dos cosas creerle.
 */
export function aDetalleDelSemaforo(crudo: DetalleCrudo): DetalleDelSemaforo {
  const aplica = crudo.aplica;
  return {
    aplica,
    obligatorio: crudo.obligatorio ?? true,
    zona: crudo.zona ?? null,
    pausa: aplica ? aPausa(crudo.pausa) : null,
    vigente: aplica && crudo.vigente ? aVentana(crudo.vigente) : null,
    semanas: aplica ? (crudo.semanas ?? []).map(aSemanaCerrada).sort(porFecha(s => s.hasta)) : [],
    calculadoEn: crudo.calculadoEn ?? null,
  };
}

/**
 * Los días cortos de una lista (`/home`, una fila de la tabla), con la misma normalización que los
 * del detalle —un día que no es `MEDIDO` no tiene porcentaje— y por fecha ascendente.
 */
function aDias(crudos: readonly DiaCrudo[]): DiaDelSemaforo[] {
  return crudos.map(aDiaDelSemaforo).sort(porFecha(d => d.fecha));
}

/**
 * El resumen de `/home`. Misma regla que la ventana: sin número no hay color. `dias` queda en
 * `null` —no en `[]`— cuando no vino: es lo que le dice a Hoy que tiene que pedirlos a `/me/semaforo`.
 */
export function aSemaforoDeHoy(crudo: SemaforoDeHoyCrudo): SemaforoDeHoy {
  return {
    ...aLecturaDelPromedio(crudo.color, crudo.etiqueta, crudo.porcentaje),
    diasConDatos: crudo.diasConDatos ?? null,
    pausado: crudo.pausado ?? false,
    dias: crudo.dias ? aDias(crudo.dias) : null,
  };
}

function aResumenPorColor(crudo: ResumenPorColorCrudo | null | undefined): ResumenPorColor | null {
  if (!crudo) return null;
  return {
    verde: crudo.verde,
    amarillo: crudo.amarillo,
    rojo: crudo.rojo,
    sinDatos: crudo.sinDatos,
    total: crudo.total,
  };
}

/** Una persona de la tabla. Su promedio sigue la regla de siempre: sin número no hay color. */
export function aAprendizDelSemaforo(crudo: AprendizCrudo): AprendizDelSemaforo {
  return {
    aprendizId: crudo.aprendizId,
    nombre: crudo.nombre ?? null,
    avatarUrl: crudo.avatarUrl ?? null,
    ...aLecturaDelPromedio(crudo.color, crudo.etiqueta, crudo.porcentaje),
    diasConDatos: crudo.diasConDatos ?? null,
    dias: aDias(crudo.dias ?? []),
  };
}

/**
 * La tabla de un grupo. **Las filas quedan en el orden del servidor** (rojo, amarillo, sin datos,
 * verde; por nombre dentro de cada color, §4.3): la app no reordena. Si el dueño cambia el criterio,
 * el cambio llega desde el backend a todos, sin reinstalar — la app no se actualiza por aire.
 */
export function aSemaforoDelGrupo(crudo: SemaforoDelGrupoCrudo): SemaforoDelGrupo {
  return {
    grupoId: crudo.grupoId ?? null,
    grupoNombre: crudo.grupoNombre ?? null,
    desde: crudo.desde,
    hasta: crudo.hasta,
    cerrada: crudo.cerrada ?? false,
    resumen: aResumenPorColor(crudo.resumen),
    aprendices: (crudo.aprendices ?? []).map(aAprendizDelSemaforo),
  };
}

function aGrupoDelResumen(crudo: GrupoDelResumenCrudo): GrupoDelResumen {
  return {
    grupoId: crudo.grupoId,
    grupoNombre: crudo.grupoNombre ?? null,
    mentorNombre: crudo.mentorNombre ?? null,
    resumen: aResumenPorColor(crudo.resumen),
    promedio: crudo.promedio ?? null,
  };
}

/**
 * El resumen por grupos. Se copia campo por campo y no con `...crudo` a propósito: si el cable
 * trajera algo de más —un nombre de aprendiz, por un error del servidor—, acá no pasa (RL-07).
 * Los grupos quedan en el orden del servidor; el contrato no fija uno y la app no inventa otro.
 */
export function aResumenPorGrupos(crudo: ResumenPorGruposCrudo): ResumenPorGrupos {
  return {
    desde: crudo.desde,
    hasta: crudo.hasta,
    cerrada: crudo.cerrada ?? false,
    totales: aResumenPorColor(crudo.totales),
    grupos: (crudo.grupos ?? []).map(aGrupoDelResumen),
  };
}

export function validarRespuesta<T>(esquema: z.ZodType<T>, datos: unknown, origen: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .slice(0, 3)
      .map(i => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
      .join(' | ');
    throw new Error(`Respuesta inesperada de ${origen} — ${detalle}`);
  }
  return resultado.data;
}
