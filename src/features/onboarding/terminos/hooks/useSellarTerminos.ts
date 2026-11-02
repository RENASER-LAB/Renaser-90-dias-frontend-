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
  | { tipo: 'cambiaron'; mensaje?: string };

/**
 * Sella la aceptación de los términos (spec 027): la respuesta, la firma dibujada y la constancia de QUÉ versión leyó. Es el mismo camino que ya seguía la
 * pantalla de Términos del onboarding —y que ahora comparte la aceptación de una versión nueva—: ni la respuesta, ni la firma, ni la constancia pueden fallar en
 * silencio, porque es un compromiso legal (decisión del 2026-09-03). Nunca lanza: el desenlace dice qué pasó.
 */
export function useSellarTerminos() {
  const { guardarCapitulo, guardarFirma, aceptarTerminos } = usePersistenciaOnboarding();

  return useCallback(
    async (datos: {
      capturarFirma: () => Promise<string | null | undefined>;
      trazos: string | null;
      versionId: string | null;
      /** Spec 039: el inicio de su programa que vio en «Mi aceptación» (`AAAA-MM-DD`); `null` si no había. */
      inicioVisto?: string | null;
      /** Spec 039: la huella del cronograma que vio y aceptó al firmar; `null` si no firmó ninguno. */
      huellaDelCronograma?: string | null;
    }): Promise<ResultadoDeSellar> => {
      const respuesta = await guardarCapitulo(mapearTerminos(true));
      if (respuesta.pendientes > 0) return { tipo: 'respuesta' };
      const png = await datos.capturarFirma();
      if (!png || !datos.trazos) return { tipo: 'firma-no-capturada' };
      const firma = await guardarFirma({ flow: 'terminos', questionKey: PREGUNTA_FIRMA_TERMINOS.clave, pngBase64: png, trazosOriginales: datos.trazos });
      if (!firma.ok) return { tipo: 'firma' };
      const constancia = await aceptarTerminos(datos.versionId, { inicioVisto: datos.inicioVisto ?? null, huellaDelCronograma: datos.huellaDelCronograma ?? null });
      if (!constancia.ok) return constancia.cambiaron ? { tipo: 'cambiaron', mensaje: constancia.mensaje } : { tipo: 'constancia' };
      return { tipo: 'ok' };
    },
    [guardarCapitulo, guardarFirma, aceptarTerminos],
  );
}

/**
 * Lo que cambió mientras leía, con las palabras del servidor cuando son las suyas (spec 039): «Los términos cambiaron mientras leías…», «Pasó la medianoche y tus
 * fechas cambiaron…» o «Tu cronograma cambió mientras leías…». Un texto que no habla de un cambio no se muestra tal cual: se usa el de siempre.
 */
export function mensajeDeLoQueCambio(mensajeDelServidor: string | undefined): string {
  const texto = mensajeDelServidor?.trim() ?? '';
  return /cambi/i.test(texto) ? texto : 'Los términos cambiaron mientras leías: léelos de nuevo.';
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
      return { titulo: 'Algo cambió mientras leías', mensaje: mensajeDeLoQueCambio(resultado.mensaje) };
    case 'constancia':
      return { titulo: 'No se pudo guardar', mensaje: 'No pudimos dejar constancia de tu aceptación. Revisa tu conexión e inténtalo de nuevo.' };
  }
}
