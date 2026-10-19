import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { tacto } from '../../../utils/tacto';
import { compartirImagenDelPodio } from '../utils/compartirImagenDelPodio';
import type { PodioParaCompartir } from '../utils/podioParaCompartir';

/**
 * Cuánto se espera, como mucho, a que el fénix de la tarjeta termine de cargar antes de capturarla igual. Es una
 * imagen local y carga en milisegundos; el tope es solo para que un fallo raro no deje el botón colgado: sin el
 * fénix la tarjeta sigue siendo una imagen válida (el texto, el podio y la lista están).
 */
export const ESPERA_MAXIMA_DEL_FENIX_MS = 1500;

/** Un respiro después de que la imagen avisó que cargó: que el cuadro con el fénix ya esté dibujado. */
const RESPIRO_DE_DIBUJO_MS = 60;

function esperarAlDibujo(): Promise<void> {
  return new Promise(resolver => {
    const cuadro = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f: () => void) => setTimeout(f, 16);
    cuadro(() => cuadro(() => setTimeout(resolver, RESPIRO_DE_DIBUJO_MS)));
  });
}

function avisarQueNoSePudo(detalle: string): void {
  if (__DEV__) console.warn('[podio] no se pudo preparar la imagen:', detalle);
  Alert.alert('No pudimos preparar la imagen', 'Inténtalo de nuevo en un momento.');
}

/**
 * La descarga de la imagen del podio (spec 006 del backend): arma la tarjeta fuera de pantalla, espera a que
 * esté lista, la captura y la entrega (hoja de compartir del teléfono, o un archivo en la web).
 *
 * Cómo trabaja:
 *
 * 1. `compartir(podio)` fija QUÉ se va a dibujar (`enCurso`: una foto fija de las filas del momento en que se tocó
 *    el botón, no las de después: FR-013) y quien usa el hook monta `TarjetaDelPodioParaCompartir` solo mientras
 *    `enCurso` no sea `null`, con `ref={tarjetaRef}` y `onListo={alTarjetaLista}`.
 * 2. Cuando la tarjeta avisa que el fénix cargó (o pasan `ESPERA_MAXIMA_DEL_FENIX_MS`), espera dos cuadros más y
 *    la captura.
 * 3. **Cancelar no es un error**: si la persona cierra la hoja de compartir, la pantalla queda como estaba. Un
 *    fallo real avisa con un diálogo (los errores sí se leen, los éxitos no necesitan uno: la hoja ya lo dice).
 * 4. Una vibración de logro (`tacto.logro`) al terminar bien; nunca la única señal.
 *
 * Un segundo toque mientras se prepara no hace nada (`preparando` también apaga el botón).
 */
export function useCompartirPodio() {
  const [enCurso, setEnCurso] = useState<PodioParaCompartir | null>(null);
  const tarjetaRef = useRef<View>(null);
  const avisoDeListo = useRef<(() => void) | null>(null);
  const ocupado = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  /** La tarjeta lo llama cuando el fénix cargó (o falló). */
  const alTarjetaLista = useCallback(() => {
    avisoDeListo.current?.();
  }, []);

  const compartir = useCallback(async (podio: PodioParaCompartir): Promise<void> => {
    if (ocupado.current) return;
    ocupado.current = true;
    /* La espera se arma ANTES de montar la tarjeta: si el fénix estuviera en memoria y avisara en el mismo
       cuadro del montaje, el aviso no puede perderse. */
    const listo = new Promise<void>(resolver => {
      const tope = setTimeout(resolver, ESPERA_MAXIMA_DEL_FENIX_MS);
      avisoDeListo.current = () => {
        clearTimeout(tope);
        resolver();
      };
    });
    setEnCurso(podio);
    try {
      await listo;
      await esperarAlDibujo();
      const resultado = await compartirImagenDelPodio({ vista: tarjetaRef.current, nombreDelArchivo: podio.nombreDelArchivo });
      if (resultado.ok) {
        tacto.logro();
      } else if (resultado.motivo === 'sin-compartir') {
        Alert.alert('No se puede compartir', 'Este teléfono no deja compartir imágenes desde la app.');
      } else if (resultado.motivo === 'fallo') {
        avisarQueNoSePudo(resultado.detalle);
      }
    } catch (error) {
      /* `compartirImagenDelPodio` no lanza, pero un toque nunca puede terminar en una promesa suelta. */
      avisarQueNoSePudo(error instanceof Error ? error.message : String(error));
    } finally {
      avisoDeListo.current = null;
      ocupado.current = false;
      if (montado.current) setEnCurso(null);
    }
  }, []);

  return { enCurso, preparando: enCurso !== null, tarjetaRef, alTarjetaLista, compartir };
}
