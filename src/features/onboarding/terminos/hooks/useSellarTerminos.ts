import { useCallback } from 'react';

import { mapearTerminos, PREGUNTA_FIRMA_TERMINOS } from '../../data/mapaPreguntas';
import { usePersistenciaOnboarding } from '../../hooks/usePersistenciaOnboarding';

/** Cómo terminó sellar la aceptación: quedó, o en cuál paso se quedó (para decírselo a la persona sin avanzar). */
export type ResultadoDeSellar =
  | { tipo: 'ok' }
  | { tipo: 'respuesta' }
  | { tipo: 'firma-no-capturada' }
  | { tipo: 'firma' }
  | { tipo: 'constancia' }
  | { tipo: 'cambiaron' };

/**
 * Sella la aceptación de los términos (spec 027): la respuesta, la firma dibujada y la constancia de QUÉ versión leyó. Es el mismo camino que ya seguía la
 * pantalla de Términos del onboarding —y que ahora comparte la aceptación de una versión nueva—: ni la respuesta, ni la firma, ni la constancia pueden fallar en
 * silencio, porque es un compromiso legal (decisión del 2026-09-03). Nunca lanza: el desenlace dice qué pasó.
 */
export function useSellarTerminos() {
  const { guardarCapitulo, guardarFirma, aceptarTerminos } = usePersistenciaOnboarding();

  return useCallback(
    async (datos: { capturarFirma: () => Promise<string | null | undefined>; trazos: string | null; versionId: string | null }): Promise<ResultadoDeSellar> => {
      const respuesta = await guardarCapitulo(mapearTerminos(true));
      if (respuesta.pendientes > 0) return { tipo: 'respuesta' };
      const png = await datos.capturarFirma();
      if (!png || !datos.trazos) return { tipo: 'firma-no-capturada' };
      const firma = await guardarFirma({ flow: 'terminos', questionKey: PREGUNTA_FIRMA_TERMINOS.clave, pngBase64: png, trazosOriginales: datos.trazos });
      if (!firma.ok) return { tipo: 'firma' };
      const constancia = await aceptarTerminos(datos.versionId);
      if (!constancia.ok) return { tipo: constancia.cambiaron ? 'cambiaron' : 'constancia' };
      return { tipo: 'ok' };
    },
    [guardarCapitulo, guardarFirma, aceptarTerminos],
  );
}

/** El aviso de cada desenlace que no es «quedó»: título y mensaje, con las palabras de siempre de la pantalla de Términos. */
export function avisoDeSellar(resultado: Exclude<ResultadoDeSellar, { tipo: 'ok' }>): { titulo: string; mensaje: string } {
  switch (resultado.tipo) {
    case 'respuesta':
      return { titulo: 'No se pudo guardar', mensaje: 'No pudimos registrar tu aceptación. Revisa tu conexión e inténtalo de nuevo.' };
    case 'firma-no-capturada':
      return { titulo: 'No se pudo capturar la firma', mensaje: 'Vuelve a dibujar tu firma e inténtalo de nuevo.' };
    case 'firma':
      return { titulo: 'No se pudo guardar tu firma', mensaje: 'No pudimos respaldar tu firma en el almacenamiento. Revisa tu conexión e inténtalo de nuevo.' };
    case 'cambiaron':
      return { titulo: 'Los términos cambiaron', mensaje: 'Los términos cambiaron mientras leías: léelos de nuevo.' };
    case 'constancia':
      return { titulo: 'No se pudo guardar', mensaje: 'No pudimos dejar constancia de tu aceptación. Revisa tu conexión e inténtalo de nuevo.' };
  }
}
