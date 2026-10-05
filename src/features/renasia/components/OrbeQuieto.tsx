import React from 'react';
import Svg, { Circle } from 'react-native-svg';

/**
 * El orbe de SER, quieto y en miniatura: el ícono del botón flotante (2026-10-05, decisión del dueño:
 * «deja el globo de chat y pasa a un ícono propio»).
 *
 * **Por qué el orbe y no el fénix.** Los dos existen en la app, y cada uno ya dice algo:
 * - El **orbe** es la cara de SER. En Hoy, bajo «TU ACOMPAÑANTE», SER es una esfera de puntos dorados
 *   (`OrbeAcompanante` → `OrbeDePuntos`). El botón flotante abre al MISMO acompañante: con el orbe, las
 *   dos entradas se reconocen como la misma persona.
 * - El **fénix** (`assets/imagenes/fenix-renaser.png`) es la foto del PROGRAMA: el chat de la comunidad
 *   y los mensajes que firma «Formación Renaser» (`AvatarDeChat`, `FotoDelPrograma`). En el botón de SER
 *   se leería como «abrir el chat de la comunidad». Además es una foto con fondo claro y un fénix verde
 *   azulado: no toma el color del tema ni se ve sobre el disco dorado.
 *
 * **Por qué quieto y dibujado acá.** El orbe de Hoy es una nube de puntos animada con Skia: montarla en
 * un botón que está en TODAS las pantallas sería un lienzo más dibujando siempre (en el Xiaomi del dueño
 * ya hubo que ponerle tope de cuadros, ver `OrbeDePuntos`), y en la web no carga (E-255). Esto es la
 * misma idea —puntos sobre una esfera, más grandes y opacos los de adelante— en un SVG fijo de
 * `react-native-svg`, que se dibuja una vez y se ve igual en Android, iOS y web.
 *
 * Los puntos salen de una espiral de Fibonacci sobre la esfera (la forma estándar de repartirlos
 * parejos), inclinada para que se vea el volumen. Se dibuja solo la cara de adelante, como en Hoy: los
 * del centro grandes y opacos, los del borde chicos y tenues, y eso solo ya dibuja la esfera. Se
 * probaron cuatro variantes a tamaño real (30 puntos en toda la esfera se leía como manchas sueltas).
 */
const PUNTOS = 90;
const RADIO_ESFERA = 42;
const INCLINACION = 0.35; // radianes alrededor del eje X: deja ver un poco el «polo» de arriba
const RADIO_MIN = 1.4;
const RADIO_MAX = 5;

type Punto = { x: number; y: number; r: number; opacidad: number };

function puntosDelOrbe(): Punto[] {
  const aureo = Math.PI * (3 - Math.sqrt(5));
  const puntos: (Punto & { z: number })[] = [];
  for (let i = 0; i < PUNTOS; i++) {
    const y0 = 1 - (i / (PUNTOS - 1)) * 2;
    const radio = Math.sqrt(1 - y0 * y0);
    const angulo = aureo * i;
    const x0 = Math.cos(angulo) * radio;
    const z0 = Math.sin(angulo) * radio;
    // Inclinación alrededor del eje X.
    const y = y0 * Math.cos(INCLINACION) - z0 * Math.sin(INCLINACION);
    const z = y0 * Math.sin(INCLINACION) + z0 * Math.cos(INCLINACION);
    if (z < 0) continue; // la cara de atrás no se ve
    puntos.push({
      x: 50 + x0 * RADIO_ESFERA,
      y: 50 + y * RADIO_ESFERA,
      z,
      r: RADIO_MIN + z * (RADIO_MAX - RADIO_MIN),
      opacidad: 0.3 + z * 0.7,
    });
  }
  return puntos.sort((a, b) => a.z - b.z).map(({ x, y, r, opacidad }) => ({ x, y, r, opacidad }));
}

/** Se calculan una sola vez: son siempre los mismos. */
const PUNTOS_DEL_ORBE = puntosDelOrbe();

export function OrbeQuieto({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {PUNTOS_DEL_ORBE.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} fillOpacity={p.opacidad} />
      ))}
    </Svg>
  );
}
