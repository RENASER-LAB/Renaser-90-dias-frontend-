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

/**
 * La trama en bytes UTF-8, para mandarla como frame BINARIO y no como texto.
 *
 * ## Por qué (bug del 2026-09-26: el chat en vivo nunca funcionó en el teléfono)
 *
 * React Native cruza al código nativo los `string` de un TurboModule como cadenas de C, que
 * terminan en el primer NUL: en Android `JavaTurboModule.cpp` hace
 * `env->NewStringUTF(arg.utf8(rt).c_str())` y en iOS `RCTTurboModule.mm` hace
 * `[NSString stringWithUTF8String:value.utf8(runtime).c_str()]`. `WebSocket.send(texto)` pasa por
 * ahí, así que cada trama STOMP salía **sin su NUL final**. Spring (`StompDecoder`) espera ese NUL
 * para dar la trama por completa: el CONNECT quedaba a medias para siempre, el servidor nunca
 * contestaba CONNECTED, la app nunca mandaba el SUBSCRIBE, y ningún mensaje ajeno llegaba en vivo
 * —con el socket abierto y el `GET /ws 101` en el registro, que es lo que lo hacía parecer sano—.
 * Las estadísticas del broker lo decían: una sesión abierta y `processed CONNECT(0)`.
 *
 * `send(ArrayBuffer)` va por `sendBinary` en base64, que no tiene NUL que cortar, y Spring acepta
 * STOMP en frames binarios igual que en texto. Codificado a mano porque React Native no trae
 * `TextEncoder` (ver el encabezado de este archivo).
 */
export function tramaEnBytes(texto: string): Uint8Array {
  const bytes: number[] = [];
  for (const caracter of texto) {
    const punto = caracter.codePointAt(0) ?? 0;
    if (punto < 0x80) {
      bytes.push(punto);
    } else if (punto < 0x800) {
      bytes.push(0xc0 | (punto >> 6), 0x80 | (punto & 0x3f));
    } else if (punto < 0x10000) {
      bytes.push(0xe0 | (punto >> 12), 0x80 | ((punto >> 6) & 0x3f), 0x80 | (punto & 0x3f));
    } else {
      bytes.push(
        0xf0 | (punto >> 18),
        0x80 | ((punto >> 12) & 0x3f),
        0x80 | ((punto >> 6) & 0x3f),
        0x80 | (punto & 0x3f)
      );
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * Lo que llega por un `onmessage`, con su NUL final repuesto si el puente de React Native se lo
 * comió al subir (el mismo corte de {@link tramaEnBytes}, en la otra dirección; es el
 * `appendMissingNULLonIncoming` que documenta `@stomp/stompjs` para React Native).
 *
 * Solo se completa lo que no trae ningún NUL y no es un latido: Spring manda cada trama en UN
 * mensaje del WebSocket, nunca partida, así que un mensaje con contenido y sin NUL solo puede ser
 * una trama a la que le cortaron el final. Si el NUL llegó, no se toca nada.
 */
export function completarFinDeTrama(datos: string): string {
  if (datos.includes(FIN_DE_TRAMA)) return datos;
  if (datos.replace(/[\r\n]/g, '').length === 0) return datos;
  return datos + FIN_DE_TRAMA;
}

/**
 * Los latidos acordados (STOMP 1.2 §Heart-beating), a partir de la cabecera `heart-beat` del
 * CONNECTED (`"sx,sy"`) y de lo que la app ofreció en ambos sentidos.
 *
 * - `esperarCadaMs`: cada cuánto va a mandar algo el servidor, o `null` si dijo que nunca.
 * - `enviarCadaMs`: cada cuánto quiere recibir un latido nuestro, o `null` si no quiere.
 *
 * Importaba porque el backend contestaba `heart-beat:0,0` (su broker simple no tenía
 * programador de latidos): con un vigilante de silencio fijo, la app daba por muerta cada
 * conversación callada a los 32 s y reconectaba, perdiendo lo que llegara en el hueco. Desde D-202
 * del backend contesta `heart-beat:10000,10000`; se sigue leyendo la cabecera en vez de suponer un
 * valor, por si la app habla con un backend anterior.
 *
 * > **Corregido 2026-09-27.** Decía «el backend de hoy contesta `heart-beat:0,0`», que dejó de ser
 * > cierto con D-202.
 */
export function latidosNegociados(
  cabecera: string | undefined,
  propioMs: number
): { esperarCadaMs: number | null; enviarCadaMs: number | null } {
  const [sx, sy] = (cabecera ?? '0,0').split(',').map(v => Number.parseInt(v, 10));
  const servidorEnvia = Number.isFinite(sx) && sx > 0;
  const servidorEspera = Number.isFinite(sy) && sy > 0;
  return {
    esperarCadaMs: servidorEnvia ? Math.max(sx, propioMs) : null,
    enviarCadaMs: servidorEspera ? Math.max(sy, propioMs) : null,
  };
}
