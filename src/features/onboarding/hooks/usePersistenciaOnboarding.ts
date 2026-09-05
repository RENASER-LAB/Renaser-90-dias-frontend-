import { useCallback, useRef } from 'react';
import * as onboardingApi from '../api/onboardingApi';
import { obtenerCatalogoPreguntas } from '../data/catalogoPreguntas';
import { AvanzarEstadoInput, HitoOnboarding, RespuestaPorClaveInput } from '../types/onboarding.types';

/**
 * Guardado incremental del onboarding: "guardá este capítulo" en vez de guardar todo recién al
 * final (ver CLAUDE.md de la tarea — si la persona abandona en el 80%, con el guardado por
 * capítulo ya quedó lo que llenó; con el guardado final de hoy, no queda nada).
 *
 * Robustez (regla explícita de la tarea): un fallo de red NUNCA bloquea a la persona ni le hace
 * perder lo que escribió.
 * - Cada respuesta es un upsert por (usuario, pregunta) en el backend, así que reintentar es
 *   siempre seguro (nunca duplica).
 * - Si una respuesta falla al mandarse, se guarda en una cola en memoria y se reintenta junto con
 *   el próximo capítulo (o con `reintentarPendientes`), en vez de perderse.
 * - Ninguna función de este hook rechaza (throw): las pantallas pueden `await` sin `try/catch` y
 *   seguir de largo pase lo que pase con la red.
 *
 * Las respuestas entran identificadas por `clave` (no por `id` numérico) y el `id` real se resuelve
 * acá contra el catálogo del backend — ver `data/catalogoPreguntas.ts` para por qué. Una respuesta
 * que no se puede resolver NUNCA se manda con un id adivinado: queda pendiente, que es lo que hace
 * que la pantalla avise en vez de dar por guardado algo que no lo está.
 */
export function usePersistenciaOnboarding() {
  // Respuestas que fallaron y todavía no se confirmaron guardadas.
  const pendientesRef = useRef<RespuestaPorClaveInput[]>([]);

  /** Manda una tanda de respuestas; las que fallan quedan en `pendientesRef` para el próximo intento. */
  const enviarRespuestas = useCallback(async (respuestas: RespuestaPorClaveInput[]) => {
    const aEnviar = [...pendientesRef.current, ...respuestas];
    pendientesRef.current = [];
    if (aEnviar.length === 0) {
      return { guardadas: 0, pendientes: 0 };
    }

    // Sin catálogo no hay ids: se deja TODO pendiente en vez de inventar uno. Es un fallo
    // transitorio típico (sin red al abrir el flujo), y el próximo intento vuelve a pedirlo.
    let catalogo;
    try {
      catalogo = await obtenerCatalogoPreguntas();
    } catch (error) {
      console.warn(
        `No se pudo cargar el catálogo de preguntas del onboarding; quedan ${aEnviar.length} respuesta(s) pendientes de reintento:`,
        error
      );
      pendientesRef.current = aEnviar;
      return { guardadas: 0, pendientes: aEnviar.length };
    }

    // Resolver clave -> id. Una clave que no existe, o cuyo tipo no coincide con el que la app
    // asume, es un desajuste de código contra catálogo: no se manda (guardar bajo la pregunta
    // equivocada es peor que no guardar) y queda pendiente para que la pantalla lo reporte.
    const resueltas: { entrada: RespuestaPorClaveInput; id: number }[] = [];
    const sinResolver: RespuestaPorClaveInput[] = [];
    for (const entrada of aEnviar) {
      const resolucion = catalogo.idDe(entrada.clave, entrada.tipoEsperado);
      if (resolucion.ok) {
        resueltas.push({ entrada, id: resolucion.id });
      } else {
        console.error(`Respuesta de onboarding NO enviada — ${resolucion.motivo}`);
        sinResolver.push(entrada);
      }
    }

    const resultados = await Promise.allSettled(
      resueltas.map(({ entrada, id }) => {
        const { clave: _clave, tipoEsperado: _tipoEsperado, ...valores } = entrada;
        return onboardingApi.guardarRespuesta({ questionId: id, ...valores });
      })
    );

    const fallidas: RespuestaPorClaveInput[] = [];
    resultados.forEach((resultado, i) => {
      if (resultado.status === 'rejected') {
        console.warn(
          `No se pudo guardar la respuesta de onboarding ("${resueltas[i].entrada.clave}"), se reintentará más tarde:`,
          resultado.reason
        );
        fallidas.push(resueltas[i].entrada);
      }
    });

    pendientesRef.current = [...sinResolver, ...fallidas];
    return { guardadas: aEnviar.length - pendientesRef.current.length, pendientes: pendientesRef.current.length };
  }, []);

  /** Guarda las respuestas de un capítulo recién completado. Nunca lanza. */
  const guardarCapitulo = useCallback(
    async (respuestas: RespuestaPorClaveInput[]) => {
      try {
        return await enviarRespuestas(respuestas);
      } catch (error) {
        // Promise.allSettled no debería rechazar nunca, pero por las dudas: no dejar que un error
        // inesperado acá le bloquee el avance a la persona.
        console.warn('Fallo inesperado guardando respuestas de onboarding:', error);
        return { guardadas: 0, pendientes: pendientesRef.current.length };
      }
    },
    [enviarRespuestas]
  );

  /** Reintenta lo que haya quedado pendiente de capítulos anteriores, sin agregar nada nuevo. */
  const reintentarPendientes = useCallback(async () => {
    if (pendientesRef.current.length === 0) return { guardadas: 0, pendientes: 0 };
    return enviarRespuestas([]);
  }, [enviarRespuestas]);

  /** PUT /onboarding/state — mueve el cursor de reanudación. No bloquea ni interrumpe si falla. */
  const avanzarEstado = useCallback(async (input: AvanzarEstadoInput) => {
    try {
      await onboardingApi.avanzarEstado(input);
    } catch (error) {
      console.warn('No se pudo guardar el avance de estado del onboarding:', error);
    }
  }, []);

  /** POST /onboarding/milestones — marca un hito. No bloquea ni interrumpe si falla. */
  const aceptarHito = useCallback(async (milestone: HitoOnboarding) => {
    try {
      await onboardingApi.aceptarHito(milestone);
    } catch (error) {
      console.warn(`No se pudo registrar el hito de onboarding "${milestone}":`, error);
    }
  }, []);

  /**
   * Sube una firma (capturada como PNG por `SignatureCanvas.capturarComoPngBase64`) a S3 y guarda la
   * respuesta correspondiente con su `mediaId` — los 3 pasos de CLAUDE.md ("firmas del
   * onboarding"): `POST /media/upload-url` -> `PUT` a S3 -> `POST /media` -> `POST /answers` con
   * el `mediaId`.
   *
   * Nunca lanza (mismo criterio que el resto del hook): si algo falla, la persona no se entera y
   * no pierde el trazo que ya dibujó — `signature.data` sigue viviendo en el estado de la pantalla
   * vía `onSaveSignature`, tal como hoy. Quien llama decide qué hacer con el resultado; en
   * particular, `PactoScreen` NO debe marcar el hito `PACTO_FIRMADO` si esto devuelve `ok: false`
   * (un pacto marcado como firmado sin la firma real sería peor que uno sin marcar).
   */
  const guardarFirma = useCallback(
    async (params: {
      flow: string;
      /** `clave_pregunta` de la pregunta FIRMA — su `id` lo resuelve `enviarRespuestas`. */
      questionKey: string;
      /** PNG ya capturado, en base64 — ver `SignatureCanvasHandle.capturarComoPngBase64`. */
      pngBase64: string;
      /** JSON de los trazos SVG originales (`SignatureData.data`) — viaja tal cual en `metadata`:
       * es el vector exacto, útil el día que haga falta reproducir la firma en alta resolución o
       * verificar que el PNG no fue alterado (no cuesta nada y el campo ya existe en el backend). */
      trazosOriginales: string;
    }): Promise<{ ok: true; mediaId: number } | { ok: false }> => {
      let paso = 'solicitar-url';
      try {
        const urlSubida = await onboardingApi.solicitarUrlSubidaMediaOnboarding({
          flow: params.flow,
          questionKey: params.questionKey,
          kind: 'FIRMA',
          contentType: 'image/png',
        });

        if (onboardingApi.almacenamientoOnboardingSinConfigurar(urlSubida.uploadUrl)) {
          console.warn(
            `No se pudo guardar la firma "${params.questionKey}": el almacenamiento S3 no está configurado en el backend.`
          );
          return { ok: false };
        }

        paso = 'subir-a-s3';
        await onboardingApi.subirArchivoOnboardingAS3(urlSubida.uploadUrl, params.pngBase64, 'image/png');

        paso = 'registrar-media';
        const media = await onboardingApi.registrarMediaOnboarding({
          flow: params.flow,
          questionKey: params.questionKey,
          kind: 'FIRMA',
          bucket: urlSubida.bucket,
          path: urlSubida.path,
          mime: 'image/png',
          metadata: params.trazosOriginales,
        });

        paso = 'guardar-respuesta';
        const resultado = await enviarRespuestas([
          { clave: params.questionKey, tipoEsperado: 'FIRMA', mediaId: media.id },
        ]);
        if (resultado.pendientes > 0) {
          console.warn(
            `La firma "${params.questionKey}" se subió a S3 pero la respuesta con el mediaId quedó pendiente de reintento.`
          );
          return { ok: false };
        }

        return { ok: true, mediaId: media.id };
      } catch (error) {
        // No se loguea el error CRUDO acá: en el paso "subir-a-s3" podría traer la URL prefirmada
        // en el mensaje (CLAUDE.md: "Nunca loguees... la URL prefirmada"). `error.message` sí es
        // seguro de mostrar: `onboardingApi.subirArchivoOnboardingAS3` arma mensajes propios sin
        // datos sensibles precisamente para poder distinguir acá "no se pudo leer el archivo
        // local" de "S3 rechazó la subida" sin exponer nada.
        const detalle = error instanceof Error ? error.message : String(error);
        console.warn(`No se pudo guardar la firma "${params.questionKey}" (falló en el paso "${paso}"): ${detalle}`);
        return { ok: false };
      }
    },
    [enviarRespuestas]
  );

  return { guardarCapitulo, reintentarPendientes, avanzarEstado, aceptarHito, guardarFirma };
}
