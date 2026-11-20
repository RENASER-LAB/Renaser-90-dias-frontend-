import { z } from 'zod';

import { validarRespuesta } from '../../semaforo/api/semaforoSchemas';
import type { ObjetivosDeLaPersona } from '../types/objetivosDeLaPersona.types';

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

const semanaSchema = z
  .object({
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
    mes: objetivoSchema.nullish(),
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

/** Valida y normaliza la respuesta; lanza «Respuesta inesperada…» si ni siquiera es un objeto. */
export function leerObjetivosDeLaPersona(crudo: unknown, origen: string): ObjetivosDeLaPersona {
  const datos = validarRespuesta(objetivosSchema, crudo, origen);

  const noventaDias = (datos.noventaDias ?? []).flatMap((o, i) => {
    const titulo = tituloDe(o.titulo);
    return titulo ? [{ id: o.id?.trim() || `objetivo-${i}`, titulo, avance: avanceDe(o.avance) }] : [];
  });

  const tituloDelMes = datos.mes ? tituloDe(datos.mes.titulo) : null;
  const mes = datos.mes && tituloDelMes ? { titulo: tituloDelMes, avance: avanceDe(datos.mes.avance) } : null;

  const tituloDeLaSemana = datos.semana ? tituloDe(datos.semana.titulo) : null;
  const planificadas = datos.semana ? cuenta(datos.semana.planificadas) : 0;
  const semana =
    datos.semana && tituloDeLaSemana
      ? { titulo: tituloDeLaSemana, planificadas, cumplidas: Math.min(cuenta(datos.semana.cumplidas), planificadas) }
      : null;

  /* Spec 057 FR-001: el plazo y la fase son aditivos. Sin plazo válido no se escribe «Objetivo de N días»; una fase incompleta no se dibuja. */
  const duracionDias = cuenta(datos.duracionDias) > 0 ? cuenta(datos.duracionDias) : null;
  const numero = datos.fase ? cuenta(datos.fase.numero) : 0;
  const primerDia = datos.fase ? cuenta(datos.fase.primerDia) : 0;
  const ultimoDia = datos.fase ? cuenta(datos.fase.ultimoDia) : 0;
  const fase = numero > 0 && primerDia > 0 && ultimoDia >= primerDia ? { numero, primerDia, ultimoDia } : null;

  return { duracionDias, fase, noventaDias, mes, semana };
}
