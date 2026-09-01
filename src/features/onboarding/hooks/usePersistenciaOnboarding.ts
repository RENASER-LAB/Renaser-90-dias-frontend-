import { useCallback, useRef } from 'react';
import * as onboardingApi from '../api/onboardingApi';
import { AvanzarEstadoInput, GuardarRespuestaInput, HitoOnboarding } from '../types/onboarding.types';

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
 */
export function usePersistenciaOnboarding() {
  // Respuestas que fallaron y todavía no se confirmaron guardadas.
  const pendientesRef = useRef<GuardarRespuestaInput[]>([]);

  /** Manda una tanda de respuestas; las que fallan quedan en `pendientesRef` para el próximo intento. */
  const enviarRespuestas = useCallback(async (respuestas: GuardarRespuestaInput[]) => {
    const aEnviar = [...pendientesRef.current, ...respuestas];
    pendientesRef.current = [];
    if (aEnviar.length === 0) {
      return { guardadas: 0, pendientes: 0 };
    }

    const resultados = await Promise.allSettled(aEnviar.map(r => onboardingApi.guardarRespuesta(r)));

    resultados.forEach((resultado, i) => {
      if (resultado.status === 'rejected') {
        console.warn(
          `No se pudo guardar la respuesta de onboarding (questionId=${aEnviar[i].questionId}), se reintentará más tarde:`,
          resultado.reason
        );
        pendientesRef.current.push(aEnviar[i]);
      }
    });

    return { guardadas: aEnviar.length - pendientesRef.current.length, pendientes: pendientesRef.current.length };
  }, []);

  /** Guarda las respuestas de un capítulo recién completado. Nunca lanza. */
  const guardarCapitulo = useCallback(
    async (respuestas: GuardarRespuestaInput[]) => {
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
   * Sube una firma (capturada como PNG por `SignatureCanvas.capturarComoPng`) a S3 y guarda la
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
      questionId: number;
      questionKey: string;
      /** URI local (file://…) del PNG ya capturado — ver `SignatureCanvasHandle.capturarComoPng`. */
      pngUri: string;
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
        await onboardingApi.subirArchivoOnboardingAS3(urlSubida.uploadUrl, params.pngUri, 'image/png');

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
        const resultado = await enviarRespuestas([{ questionId: params.questionId, mediaId: media.id }]);
        if (resultado.pendientes > 0) {
          console.warn(
            `La firma "${params.questionKey}" se subió a S3 pero la respuesta con el mediaId quedó pendiente de reintento.`
          );
          return { ok: false };
        }

        return { ok: true, mediaId: media.id };
      } catch {
        // No se loguea el error crudo acá: en el paso "subir-a-s3" podría traer la URL prefirmada
        // en el mensaje (CLAUDE.md: "Nunca loguees... la URL prefirmada"). Con el nombre del paso
        // alcanza para diagnosticar sin exponer nada sensible.
        console.warn(`No se pudo guardar la firma "${params.questionKey}" (falló en el paso "${paso}").`);
        return { ok: false };
      }
    },
    [enviarRespuestas]
  );

  return { guardarCapitulo, reintentarPendientes, avanzarEstado, aceptarHito, guardarFirma };
}
