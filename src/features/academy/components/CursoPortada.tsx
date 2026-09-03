import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Portada de una tarjeta de curso en "Recursos Exclusivos" (`ComunidadScreen.tsx`,
 * `styles.courseCoverHeader`). Antes de este componente esa caja no tenía ningún `<Image>`: solo
 * el degradado `['#2A2417', '#1E1B15', '#141310']` haciendo de portada de relleno.
 *
 * Se monta como fondo absoluto DETRÁS del badge y el título — que siguen siendo hijos normales de
 * `courseCoverHeader` en `ComunidadScreen.tsx`, sin tocar su alto ni su padding — igual que
 * `features/community/components/FotoMuro.tsx` hace con las fotos del Muro. Mismo patrón de
 * caché, no lo reinventa: `cacheKey` sin query string, `cachePolicy="memory-disk"`.
 */

interface CursoPortadaProps {
  /** `MiCursoResponse.portadaFirmada` — `null`/`undefined` en cursos bloqueados (no viene firmada) o sin portada cargada. */
  url: string | null | undefined;
}

/**
 * Los 3 tonos ORIGINALES del degradado de relleno (ya existían antes de esta tarea, sin cambios).
 * Sirven dos veces: opacos, como base de siempre cuando no hay foto; con alfa, como velo sobre la
 * foto cuando sí la hay (ver más abajo).
 */
const TONOS_OPACOS = ['#2A2417', '#1E1B15', '#141310'] as const;

export function CursoPortada({ url }: CursoPortadaProps) {
  const [fallo, setFallo] = useState(false);
  const hayFoto = !!url && !fallo;

  return (
    <>
      {/*
        Base opaca: SIEMPRE montada primero. Si no hay `url`, si falló la carga, o mientras la foto
        todavía no terminó de bajar, esto es lo único visible detrás del badge/título — la tarjeta
        queda "exactamente como hoy" (nunca un ícono roto, nunca un hueco).
      */}
      <LinearGradient colors={TONOS_OPACOS} style={StyleSheet.absoluteFill} />

      {hayFoto && (
        <>
          <Image
            source={{ uri: url as string, cacheKey: cacheKeyEstable(url as string) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover" // llena la caja recortando el sobrante, nunca 'fill' (deformaría la portada)
            transition={150}
            cachePolicy="memory-disk"
            onError={() => setFallo(true)}
          />
          {/*
            Degradado con centro transparente: permite evidenciar con total nitidez y brillo el
            arte y fotografía de la portada en la zona central, manteniendo contraste sutil
            arriba para el badge de categoría y un velo oscuro abajo para la legibilidad del título.
          */}
          <LinearGradient
            colors={['rgba(0,0,0,0.30)', 'transparent', 'rgba(14,13,11,0.85)']}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      )}
    </>
  );
}

/**
 * `portadaFirmada` es una URL prefirmada de S3 (SigV4) que cambia en cada respuesta del backend —
 * cachear por la URL completa haría que el celular vuelva a bajar todas las portadas en cada
 * refresco del catálogo. Misma regla que ya usa `FotoMuro.tsx` (y que el backend ya aplicó del
 * lado servidor para avatares, E-57): en SigV4 todo lo que caduca vive DESPUÉS del `?`; la parte
 * de antes identifica siempre al mismo objeto de S3, así que es la clave de caché estable.
 */
function cacheKeyEstable(url: string): string {
  return url.split('?')[0];
}
