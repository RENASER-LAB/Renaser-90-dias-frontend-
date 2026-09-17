/**
 * STOMP 1.2, la parte que este chat usa: armar y leer tramas de texto.
 *
 * ## Por qué a mano y no `@stomp/stompjs`
 *
 * Esa librería exige `TextEncoder`/`TextDecoder`, y **React Native no los trae**: se comprobó
 * en `react-native/Libraries/Core/setUpGlobals.js`, donde `WebSocket` sí está polirellenado y
 * `TextEncoder` no aparece en ningún lado. Usarla obligaría a sumar además un polyfill, o sea
 * dos dependencias nuevas —con su superficie nativa— justo antes de compilar un APK que va a
 * producción. Lo que hace falta de STOMP acá son cinco verbos y un formato de texto plano; es
 * menos código que la conversación sobre qué polyfill elegir, y se puede probar entero sin
 * abrir un socket.
 *
 * ## El formato
 *
 * ```
 * COMANDO\n
 * cabecera:valor\n
 * \n
 * cuerpo\0
 * ```
 *
 * Entre trama y trama el servidor puede mandar saltos de línea sueltos: son los latidos
 * (`heart-beat`) y no son tramas. Por eso {@link leerTramas} descarta los EOL que encuentre
 * antes de un comando en vez de tratarlos como una trama vacía.
 */

export interface TramaStomp {
  comando: string;
  cabeceras: Record<string, string>;
  cuerpo: string;
}

/** El byte que cierra una trama. No es un salto de línea: es NUL. */
export const FIN_DE_TRAMA = '\u0000';

/** El latido: una línea vacía fuera de toda trama. */
export const LATIDO = '\n';

/**
 * Escapado de cabeceras de STOMP 1.2 (§3.1). Sin esto, un valor con `:` o un salto de línea
 * partiría la cabecera en dos y el servidor leería cualquier cosa.
 */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/:/g, '\\c');
}

function desescapar(texto: string): string {
  let salida = '';
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] !== '\\') {
      salida += texto[i];
      continue;
    }
    const siguiente = texto[++i];
    if (siguiente === 'r') salida += '\r';
    else if (siguiente === 'n') salida += '\n';
    else if (siguiente === 'c') salida += ':';
    else if (siguiente === '\\') salida += '\\';
    // Una secuencia de escape desconocida se descarta, como manda la especificación: mejor
    // perder un carácter raro que cortar la conexión por una cabecera que no entendemos.
  }
  return salida;
}

export function armarTrama(comando: string, cabeceras: Record<string, string> = {}, cuerpo = ''): string {
  const lineas = [comando];
  for (const [clave, valor] of Object.entries(cabeceras)) {
    lineas.push(`${escapar(clave)}:${escapar(valor)}`);
  }
  return `${lineas.join('\n')}\n\n${cuerpo}${FIN_DE_TRAMA}`;
}

/**
 * Parte lo acumulado en tramas completas y devuelve lo que quedó a medias.
 *
 * Un `onmessage` del WebSocket **no** equivale a una trama: pueden llegar varias juntas, o una
 * partida al medio. Por eso quien llama guarda el `resto` y se lo vuelve a pasar la próxima vez;
 * tratar cada mensaje como una trama entera es el error clásico que hace que el chat pierda
 * mensajes cuando llegan dos seguidos.
 */
export function leerTramas(acumulado: string): { tramas: TramaStomp[]; resto: string } {
  const tramas: TramaStomp[] = [];
  let resto = acumulado;

  for (;;) {
    const fin = resto.indexOf(FIN_DE_TRAMA);
    if (fin === -1) break;

    const crudo = resto.slice(0, fin);
    resto = resto.slice(fin + 1);

    // Los latidos viajan pegados a la trama siguiente: se descartan acá.
    const limpio = crudo.replace(/^[\r\n]+/, '');
    if (limpio.length === 0) continue;

    const trama = parsearTrama(limpio);
    if (trama) tramas.push(trama);
  }

  return { tramas, resto };
}

function parsearTrama(crudo: string): TramaStomp | null {
  const corte = crudo.indexOf('\n\n');
  const encabezado = corte === -1 ? crudo : crudo.slice(0, corte);
  const cuerpo = corte === -1 ? '' : crudo.slice(corte + 2);

  const lineas = encabezado.split('\n');
  const comando = lineas.shift()?.trim();
  if (!comando) return null;

  const cabeceras: Record<string, string> = {};
  for (const linea of lineas) {
    const sep = linea.indexOf(':');
    if (sep === -1) continue;
    const clave = desescapar(linea.slice(0, sep));
    const valor = desescapar(linea.slice(sep + 1));
    // La especificación manda quedarse con la PRIMERA aparición de una cabecera repetida.
    if (!(clave in cabeceras)) cabeceras[clave] = valor;
  }

  return { comando, cabeceras, cuerpo };
}
