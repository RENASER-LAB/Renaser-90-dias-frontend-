import { apiFetch } from '../../../services/http/apiClient';
import type { AccionMotora, DiaSemana, ProtocoloReemplazo } from '../tipos';
import { mapaServidorSchema, validarRespuesta, type MapaServidor } from './mapaSchemas';

/**
 * El estado del Mapa de Renacimiento en el SERVIDOR.
 *
 * Hasta ahora el mapa solo existia en `AsyncStorage` del dispositivo. Eso bastaba para reanudar
 * en el paso donde quedo, pero no para saber si la persona ya lo termino: al reinstalar, al
 * cambiar de telefono o al limpiar datos, el mapa volvia a aparecer vacio y se podia recorrer
 * otra vez — y `activar()` volvia a crear las rocas maestras y los habitos, duplicandolos.
 */
export async function consultarMapa(): Promise<MapaServidor> {
  const r = await apiFetch<unknown>('/api/v1/mapa-renacimiento');
  return validarRespuesta(mapaServidorSchema, r, 'GET /api/v1/mapa-renacimiento');
}

/**
 * `POST /api/v1/mapa-renacimiento/completar` — marca la etapa como terminada (204, sin cuerpo).
 *
 * Marca la ETAPA, no activa el mapa: activar crea los habitos y eso ya lo hace `activar()` en el
 * hook contra sus propios endpoints. Este aviso es lo que hace que el "ya esta hecho" sobreviva
 * al dispositivo.
 */
export async function completarEtapaMapa(): Promise<void> {
  await apiFetch<void>('/api/v1/mapa-renacimiento/completar', { method: 'POST' });
}

/* ------------------------------------------------------------------------------------------------
 * Acciones motoras y protocolos de reemplazo
 *
 * Estos dos endpoints existen en el backend desde la V41 y **la app nunca los llamó**: por eso
 * `acciones_mapa`, `dias_accion_mapa` y `protocolos_reemplazo_mapa` estaban vacías en toda la base
 * (verificado el 2026-09-14). El efecto real: el panel del mentor no podía leer los protocolos de
 * nadie, y el Mapa de quien reinstalaba se perdía entero salvo por las tres Rocas.
 * ---------------------------------------------------------------------------------------------- */

/** El día de la semana con la numeración de `java.time.DayOfWeek`, que es la que valida el backend (1..7). */
const ISO_POR_LETRA: Record<DiaSemana, number> = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 7 };

/** Tope del backend (`@Size(max = 6)`). Mandar más da 400 y el mapa no admite más de seis igual. */
const MAXIMO_ACCIONES = 6;

/** Tope del backend (`@Size(max = 3)`). */
const MAXIMO_PROTOCOLOS = 3;

const LARGO_MINIMO_TEXTO_ACCION = 5;
const LARGO_MAXIMO_TEXTO_ACCION = 100;

/**
 * `PUT /api/v1/mapa-renacimiento/acciones` — el sistema de ejecución completo, de una (204).
 *
 * **Se filtra antes de mandar.** El backend valida cada acción con `@NotBlank` y
 * `@Size(min = 5, max = 100)` sobre el texto, y rechaza el lote ENTERO con un 400 si una sola no
 * cumple. Una acción a medio escribir en el borrador local es normal —la persona está en mitad del
 * recorrido— y no debe impedir que se guarden las que sí están listas.
 */
export async function guardarAccionesDelMapa(acciones: AccionMotora[]): Promise<void> {
  const actions = acciones
    .filter(a => {
      const texto = a.texto.trim();
      return (
        texto.length >= LARGO_MINIMO_TEXTO_ACCION &&
        texto.length <= LARGO_MAXIMO_TEXTO_ACCION &&
        a.frecuenciaSemanal >= 1 &&
        a.frecuenciaSemanal <= 7
      );
    })
    .slice(0, MAXIMO_ACCIONES)
    .map(a => ({
      actionId: a.id,
      area: a.area,
      text: a.texto.trim(),
      weeklyFrequency: a.frecuenciaSemanal,
      days: a.dias.map(d => ISO_POR_LETRA[d]),
      moment: a.momento,
      evidence: a.evidencia,
    }));
  if (actions.length === 0) return;
  await apiFetch<void>('/api/v1/mapa-renacimiento/acciones', { method: 'PUT', body: { actions } });
}

/**
 * `PUT /api/v1/mapa-renacimiento/reemplazos` — los protocolos de reemplazo (204).
 *
 * Los cuatro textos son `@NotBlank` del lado del servidor, así que un protocolo incompleto tira el
 * lote entero. Mismo criterio que arriba: se manda lo que está completo y se ignora lo demás.
 */
export async function guardarProtocolosDelMapa(protocolos: ProtocoloReemplazo[]): Promise<void> {
  const protocols = protocolos
    .filter(p => p.patron.trim() && p.disparador.trim() && p.conductaActual.trim() && p.respuestaAlternativa.trim())
    .slice(0, MAXIMO_PROTOCOLOS)
    .map(p => ({
      protocolId: p.id,
      pattern: p.patron.trim(),
      trigger: p.disparador.trim(),
      currentBehavior: p.conductaActual.trim(),
      alternativeResponse: p.respuestaAlternativa.trim(),
    }));
  if (protocols.length === 0) return;
  await apiFetch<void>('/api/v1/mapa-renacimiento/reemplazos', { method: 'PUT', body: { protocols } });
}
