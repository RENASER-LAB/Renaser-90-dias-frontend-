import { useEffect, useRef, useState } from 'react';

import { getTokenSesion, notificarSesionVencida } from '../../../services/http/apiClient';
import { rutaDeLaTarjetaDeMuestra } from '../api/bienvenidaApi';
import { nombreParaLaMuestra } from '../utils/bienvenida';
import { traerTarjetaDeMuestra, type EntornoDeLaTarjeta } from '../utils/tarjetaDeMuestra';

/** Cuánto se espera después de la última letra del nombre de ejemplo antes de pedir la tarjeta. */
const DEMORA_AL_ESCRIBIR_MS = 600;

/**
 * La tarjeta vigente con el nombre de ejemplo, lista para un `Image` (backend D-210).
 *
 * - La primera se pide enseguida; al escribir el nombre, un momento después de la última letra, para
 *   no dibujar una tarjeta por letra.
 * - `version` se incrementa cuando cambia la portada (usar una nueva o volver a la original): la ruta
 *   es la misma y el servidor la manda con `no-store`, así que hay que volver a pedirla.
 * - Mientras llega la nueva queda la anterior, sin parpadeo. El object URL de web se libera cuando se
 *   reemplaza y al salir de la pantalla.
 */
export function useTarjetaDeMuestra(nombre: string, version: number, entorno: EntornoDeLaTarjeta) {
  const [uri, setUri] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // `undefined` = todavía no se pidió ninguna: la primera va sin demora.
  const nombrePedido = useRef<string | undefined>(undefined);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    // Solo se espera si cambió el nombre (se está escribiendo); una portada nueva se pide enseguida.
    const cambioElNombre = nombrePedido.current !== undefined && nombrePedido.current !== nombre;
    const demora = cambioElNombre ? DEMORA_AL_ESCRIBIR_MS : 0;
    nombrePedido.current = nombre;
    const temporizador = setTimeout(() => {
      void traerTarjetaDeMuestra(rutaDeLaTarjetaDeMuestra(nombreParaLaMuestra(nombre)), getTokenSesion(), entorno).then(
        resultado => {
          if (!vigente) {
            if (resultado.ok) entorno.liberar(resultado.uri);
            return;
          }
          if (resultado.ok) {
            setUri(resultado.uri);
            setError(null);
          } else {
            if (resultado.status === 401) notificarSesionVencida();
            setError(resultado.mensaje);
          }
          setCargando(false);
        },
      );
    }, demora);
    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [nombre, version, entorno]);

  // Al reemplazarse (y al salir), se libera la anterior: en web es un object URL que ocupa memoria.
  useEffect(() => {
    return () => {
      if (uri) entorno.liberar(uri);
    };
  }, [uri, entorno]);

  return { uri, cargando, error };
}
