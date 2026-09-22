import {
  TOPE_PESO_POR_MES,
  magnitudDeNegocio,
  magnitudDeSalud,
} from '../../mapa-renacimiento/reglas';
import type { PrioridadYEscala } from '../hooks/usePrioridadPrincipal';
import type { EjeObjetivo } from '../types/objetivos.types';
import type { Magnitud } from './objetivoMensual';
import { cifraDelMes, objetivoDelMes } from './objetivoMensual';

/** Lo mínimo de una Roca Maestra para poder repartirla por mes. */
export interface RocaParaElMes {
  lineaBase: number | null;
  /** La medición REAL de hoy. Es lo que hace que la cuenta se rehaga cada mes. */
  avance: number | null;
  meta: number | null;
  unidad: string | null;
}

/** Qué mide cada eje. Sale de `usePrioridadPrincipal`, que ya lo trae del servidor. */
export type TiposDeMedicion = Pick<
  PrioridadYEscala,
  'saludTipo' | 'saludUnidad' | 'negocioTipo' | 'negocioPeriodo'
>;

/**
 * La cifra de ESTE MES para el objetivo de un eje: dónde hay que estar al cierre del mes.
 *
 * ── Por qué es una función pura y no un hook ──
 *
 * Todo lo que necesita ya está en `PlanScreen`: la Roca Maestra (`useRocasMaestras`) y qué se mide
 * (`usePrioridadPrincipal`, que lo lee del servidor en la misma request que la prioridad). No hace
 * falta pedir nada más, así que esto no es acceso a datos — es aritmética, y se prueba sin montar
 * un componente.
 *
 * > **Corregido el 2026-09-22.** La primera versión era un hook que leía el Mapa del almacén local
 * > (`almacenMapa.leer`). Funcionaba, pero solo en el teléfono donde se había recorrido el Mapa: el
 * > borrador no sobrevive a un reinstalar ni a cambiar de dispositivo, y entonces la cifra
 * > desaparecía aunque la Roca Maestra siguiera en el servidor. `map_health_result_type` y sus
 * > hermanas SÍ se guardan en el servidor desde el 2026-09-14 (ver `respuestasDelMapa.ts`) y ya
 * > viajaban en una lectura que Plan hace igual — solo había que dejar de tirarlas.
 *
 * ── Qué decide `magnitud` ──
 *
 * La Roca Maestra guarda el número, la unidad y la línea base, pero no QUÉ se mide. Sin eso no se
 * distingue "82 kg de peso" —que se reparte, con tope de salud— de un "8/10 de energía", que no.
 * Por eso el tipo viene aparte y `null` significa "todavía no lo eligió": no hay cifra, y no se
 * inventa una.
 */
export function cifraDelMesDeLaRoca(
  eje: EjeObjetivo,
  roca: RocaParaElMes | null | undefined,
  tipos: TiposDeMedicion,
  mes: number | null
): string | null {
  if (!roca || mes === null) return null;

  const magnitud = magnitudDelEje(eje, tipos);
  if (!magnitud) return null;

  const mensual = objetivoDelMes({
    lineaBase: roca.lineaBase,
    valorActual: roca.avance,
    meta: roca.meta,
    mes,
    magnitud,
    topePorMes: topeDelEje(eje, tipos, roca),
  });

  /* Solo la cifra, sin la frase que la explica. `notaDelMes` sabe decir "Te faltan 6 kg y te
     quedan 3 meses: 2 kg este mes", y es correcta, pero esta tarjeta ya tiene encima el objetivo
     de 90 días entero: sumarle un párrafo la vuelve ilegible. Un número y su unidad dicen lo
     mismo en una línea. Y cuando no hay cifra no se muestra nada — ni el motivo. */
  return cifraDelMes(mensual, { unidad: roca.unidad ?? '' });
}

/** Qué clase de magnitud es el objetivo de este eje. `null` = todavía no se eligió qué se mide. */
function magnitudDelEje(eje: EjeObjetivo, tipos: TiposDeMedicion): Magnitud | null {
  if (eje === 'CUERPO') return magnitudDeSalud(tipos.saludTipo, tipos.saludUnidad ?? '');
  if (eje === 'TRABAJO') return magnitudDeNegocio(tipos.negocioTipo, tipos.negocioPeriodo);
  /* Relaciones es siempre un puntaje del 1 al 10, y una percepción no se entrega en cuotas:
     `objetivoDelMes` lo resuelve solo devolviendo `sin_cifra`. */
  return 'escala';
}

/**
 * El tope de cordura, solo donde el mundo impone uno: hoy el peso, 4 % del cuerpo por mes. En
 * porcentaje y no en kilos fijos porque escala con la persona y sobrevive a la unidad, que la
 * escribe el aprendiz y bien puede ser libras. Ver `TOPE_PESO_POR_MES`.
 */
function topeDelEje(eje: EjeObjetivo, tipos: TiposDeMedicion, roca: RocaParaElMes): number | null {
  if (eje !== 'CUERPO' || tipos.saludTipo !== 'peso') return null;
  const referencia = roca.avance ?? roca.lineaBase;
  if (referencia === null || !Number.isFinite(referencia) || referencia === 0) return null;
  return TOPE_PESO_POR_MES * Math.abs(referencia);
}
