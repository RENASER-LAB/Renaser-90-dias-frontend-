import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { mensajeDeError } from '../../../services/http/apiClient';
import { escucharPostPublicado } from '../../sparkie/events/avisoPrimerPost';
import * as wallApi from '../api/wallApi';
import type { WallPost } from '../types/community.types';

/**
 * Cuánto vale una lectura antes de que volver a Hoy la repida.
 *
 * > **Antes (hasta el 26/09/2026, velocidad V-1..V-4):** cada vez que Hoy recibía el foco se
 * > pedía la página entera de `GET /api/v1/wall` —con todas sus fotos firmadas— para mostrar UNA
 * > publicación. Ir y volver entre pestañas la repedía cada vez, compitiendo con los pedidos de la
 * > pestaña a la que se iba. El backend no acepta `limit`, así que no se puede pedir menos: se
 * > pide menos seguido.
 */
export const VIGENCIA_ULTIMA_PUBLICACION_MS = 2 * 60 * 1000;

/**
 * La última lectura, compartida por todas las instancias del hook (Hoy se monta una vez, pero un
 * remontaje —cambio de cuenta, recarga en desarrollo— no tiene por qué volver a pedir).
 */
let ultimaLectura: { publicacion: WallPost | null; leidaEn: number } | null = null;

/** Deja vencida la lectura guardada: la próxima vez que Hoy tome el foco, se vuelve a pedir. */
export function invalidarUltimaPublicacionMuro(): void {
  ultimaLectura = null;
}

/** Si una lectura hecha en `leidaEn` todavía sirve en `ahora`. Pura, para probarla sin montar. */
export function lecturaVigente(leidaEn: number | null, ahora: number): boolean {
  return leidaEn !== null && ahora - leidaEn < VIGENCIA_ULTIMA_PUBLICACION_MS;
}

/**
 * Evidencia más reciente del Muro para las superficies resumidas, como Hoy.
 *
 * El backend ya devuelve el feed más nuevo primero, así que no se inventa un orden ni se
 * duplica la consulta en la pantalla. Al recibir el foco se relee **solo si la lectura anterior
 * tiene más de `VIGENCIA_ULTIMA_PUBLICACION_MS`**, o si la persona acaba de publicar (el aviso
 * `avisarPostPublicado` la invalida). `recargar` —el pull-to-refresh— siempre va al servidor.
 */
export function useUltimaPublicacionMuro() {
  const [publicacion, setPublicacion] = useState<WallPost | null>(ultimaLectura?.publicacion ?? null);
  const [cargando, setCargando] = useState(ultimaLectura === null);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const pagina = await wallApi.obtenerFeedMuro();
      // Hoy solo debe destacar evidencias. Una publicación de texto sin media no ocupa esta
      // tarjeta ni desplaza la última prueba que la persona puede abrir y revisar.
      const ultima = pagina.posts.find(post => post.media.length > 0) ?? null;
      ultimaLectura = { publicacion: ultima, leidaEn: Date.now() };
      setPublicacion(ultima);
    } catch (e) {
      setPublicacion(null);
      setError(mensajeDeError(e, 'No pudimos cargar la última evidencia del Muro.'));
    } finally {
      setCargando(false);
    }
  }, []);

  // Una publicación propia recién confirmada puede ser justo la que Hoy tiene que mostrar.
  useEffect(() => escucharPostPublicado(invalidarUltimaPublicacionMuro), []);

  useFocusEffect(
    useCallback(() => {
      if (ultimaLectura && lecturaVigente(ultimaLectura.leidaEn, Date.now())) {
        setPublicacion(ultimaLectura.publicacion);
        setCargando(false);
        return;
      }
      void recargar();
    }, [recargar])
  );

  return { publicacion, cargando, error, recargar };
}
