import { z } from 'zod';

import { validarRespuesta } from '../../semaforo/api/semaforoSchemas';
import { cifraEscrita } from '../../objetivos/api/planMensualApi';
import { TEXTO_SIN_CIFRA } from '../../objetivos/utils/objetivoDelMesEnPalabras';
import type { ObjetivoPorEje, ObjetivosDeLaPersona } from '../types/objetivosDeLaPersona.types';

/**
 * Los objetivos de una persona para el liderazgo (spec 056, `GET /leadership/people/{p}/objetivos`).
 *
 * Mismo criterio que el resto de las lecturas del líder: `passthrough()` y `.nullish()` en todo, y las reglas que no se rompen en
 * pantalla se aplican al normalizar. Un campo raro se pierde él solo, nunca la sección:
 * - el avance es un porcentaje: se acota a 0–100, y lo que no es un número es «sin cifra» (`null`), nunca 0 % ni 100 %;
 * - un objetivo sin título no se dibuja;
 * - la semana no dice más acciones cumplidas que planificadas.
 */
const objetivoSchema = z
  .object({
    id: z.string().nullish(),
    titulo: z.string().nullish(),
    avance: z.unknown().optional(),
  })
  .passthrough();

/** Lo de cada eje en el mes (`cifra`, `unidad`…) y en la semana (solo `titulo`). Todo opcional: lo que falta no tumba la sección. */
const objetivoPorEjeSchema = z
  .object({
    eje: z.string().nullish(),
    titulo: z.string().nullish(),
    cifra: z.unknown().optional(),
    unidad: z.string().nullish(),
    unidadAdelante: z.boolean().nullish(),
    metaAlcanzada: z.boolean().nullish(),
    motivoSinCifra: z.string().nullish(),
  })
  .passthrough();

const semanaSchema = z
  .object({
    objetivos: z.array(objetivoPorEjeSchema).nullish(),
    titulo: z.string().nullish(),
    planificadas: z.unknown().optional(),
    cumplidas: z.unknown().optional(),
  })
  .passthrough();

const faseSchema = z
  .object({
    numero: z.unknown().optional(),
    primerDia: z.unknown().optional(),
    ultimoDia: z.unknown().optional(),
  })
  .passthrough();

const objetivosSchema = z
  .object({
    duracionDias: z.unknown().optional(),
    fase: faseSchema.nullish(),
    noventaDias: z.array(objetivoSchema).nullish(),
    mes: objetivoSchema.extend({ objetivos: z.array(objetivoPorEjeSchema).nullish() }).nullish(),
    semana: semanaSchema.nullish(),
  })
  .passthrough();

function avanceDe(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.min(100, Math.max(0, valor)) : null;
}

function cuenta(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;
}

function tituloDe(valor: string | null | undefined): string | null {
  const t = valor?.trim();
  return t ? t : null;
}

type PorEjeCrudo = z.infer<typeof objetivoPorEjeSchema>;

/** La frase de un eje: lo que escribió la persona; si no, «Llegar a <cifra>»; si no, por qué no hay cifra. Sin nada de eso, no se dibuja. */
function objetivoPorEje(o: PorEjeCrudo): ObjetivoPorEje | null {
  const eje = o.eje?.trim();
  if (!eje) return null;
  const propio = tituloDe(o.titulo);
  const cifra = typeof o.cifra === 'number' && Number.isFinite(o.cifra) ? `Llegar a ${cifraEscrita(o.cifra, o.unidad ?? '', o.unidadAdelante === true)}` : null;
  // El motivo llega como código (SIN_TIPO, SIN_DATOS…): nunca se muestra crudo. Quien lee es el mentor o el líder, no la persona,
  // así que va el texto neutro de «Planificar mi mes» y no el del motivo, que habla de «tu objetivo».
  const texto = propio ?? cifra ?? (tituloDe(o.motivoSinCifra) ? TEXTO_SIN_CIFRA : null);
  return texto ? { eje, texto, ...(o.metaAlcanzada === true ? { metaAlcanzada: true } : {}) } : null;
}

const porEjes = (lista: PorEjeCrudo[] | null | undefined): ObjetivoPorEje[] => (lista ?? []).flatMap(o => objetivoPorEje(o) ?? []);

/** Valida y normaliza la respuesta; lanza «Respuesta inesperada…» si ni siquiera es un objeto. */
export function leerObjetivosDeLaPersona(crudo: unknown, origen: string): ObjetivosDeLaPersona {
  const datos = validarRespuesta(objetivosSchema, crudo, origen);

  const noventaDias = (datos.noventaDias ?? []).flatMap((o, i) => {
    const titulo = tituloDe(o.titulo);
    return titulo ? [{ id: o.id?.trim() || `objetivo-${i}`, titulo, avance: avanceDe(o.avance) }] : [];
  });

  /* Spec 057: el mes y la semana traen un objetivo por eje en `objetivos`; con ellos aunque falte el título (se dibujan igual). */
  const ejesDelMes = porEjes(datos.mes?.objetivos);
  const tituloDelMes = datos.mes ? tituloDe(datos.mes.titulo) : null;
  const mes =
    datos.mes && (tituloDelMes || ejesDelMes.length > 0)
      ? { titulo: tituloDelMes ?? 'Este mes', avance: avanceDe(datos.mes.avance), ...(ejesDelMes.length > 0 ? { objetivos: ejesDelMes } : {}) }
      : null;

  const ejesDeLaSemana = porEjes(datos.semana?.objetivos);
  const tituloDeLaSemana = datos.semana ? tituloDe(datos.semana.titulo) : null;
  const planificadas = datos.semana ? cuenta(datos.semana.planificadas) : 0;
  const semana =
    datos.semana && (tituloDeLaSemana || ejesDeLaSemana.length > 0)
      ? {
          titulo: tituloDeLaSemana ?? 'Esta semana',
          planificadas,
          cumplidas: Math.min(cuenta(datos.semana.cumplidas), planificadas),
          ...(ejesDeLaSemana.length > 0 ? { objetivos: ejesDeLaSemana } : {}),
        }
      : null;

  /* Spec 057 FR-001: el plazo y la fase son aditivos. Sin plazo válido no se escribe «Objetivo de N días»; una fase incompleta no se dibuja. */
  const duracionDias = cuenta(datos.duracionDias) > 0 ? cuenta(datos.duracionDias) : null;
  const numero = datos.fase ? cuenta(datos.fase.numero) : 0;
  const primerDia = datos.fase ? cuenta(datos.fase.primerDia) : 0;
  const ultimoDia = datos.fase ? cuenta(datos.fase.ultimoDia) : 0;
  const fase = numero > 0 && primerDia > 0 && ultimoDia >= primerDia ? { numero, primerDia, ultimoDia } : null;

  return { duracionDias, fase, noventaDias, mes, semana };
}
