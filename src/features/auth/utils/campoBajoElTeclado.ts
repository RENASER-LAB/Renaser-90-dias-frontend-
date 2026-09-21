/**
 * Cuánto hay que desplazar el formulario para que el campo enfocado no quede debajo del teclado.
 *
 * **Por qué existe este archivo.** Encoger el área de scroll cuando sube el teclado
 * (`KeyboardAvoidingView`) devuelve el campo al *alcance* de la persona, pero no a su *vista*: el
 * contenido no se mueve solo, así que la contraseña sigue estando abajo del pliegue y hay que
 * arrastrar con el dedo mientras se escribe. El scroll nativo hacia el hijo enfocado tampoco
 * alcanza, porque Android lo resuelve en el momento del foco — cuando el teclado todavía no subió
 * y el campo se ve perfecto — y no vuelve a mirarlo cuando el área se achica un instante después.
 *
 * La cuenta vive acá, separada de la pantalla, por lo mismo que `cercaDelFinal`: es la única
 * aritmética de todo el arreglo y probarla son seis casos, contra montar un formulario con un
 * teclado falso. La pantalla se queda con lo que no se puede probar sin dispositivo (medir).
 */

/** Una franja horizontal cualquiera, en las coordenadas que devuelve `measureInWindow`. */
export interface FranjaVertical {
  /** Borde de arriba. */
  y: number;
  alto: number;
}

/**
 * Aire que se deja debajo del campo, para que no quede lamiendo el borde del teclado.
 *
 * Son 20 px y no 0 porque debajo de varios campos de esta pantalla hay algo que importa y que
 * forma parte del campo aunque no esté dentro del recuadro: el aviso de "ese correo ya tiene una
 * cuenta", el contador de caracteres mínimos. Dejar el campo justo al ras del teclado los esconde.
 */
export const MARGEN_BAJO_EL_CAMPO = 20;

/**
 * El desplazamiento al que hay que llevar la lista para que `campo` entre entero en `areaVisible`,
 * o `null` si ya se ve y no hay que tocar nada.
 *
 * Todo se mide en coordenadas de pantalla, las dos cosas con la misma regla, y el resultado es un
 * *delta* aplicado al desplazamiento actual. Eso es a propósito: así la cuenta no necesita saber
 * dónde empieza la lista, cuánto mide la barra de arriba, ni si el `KeyboardAvoidingView` compensó
 * de más o de menos. Si el área visible que se le pasa es la real, el campo queda adentro.
 *
 * @param campo Dónde está el campo enfocado ahora mismo.
 * @param areaVisible La parte de la lista que NO tapa el teclado.
 * @param desplazamientoActual `contentOffset.y` de la lista en este momento.
 * @param margen Aire a dejar arriba y abajo del campo.
 */
export function desplazamientoParaVerElCampo(
  campo: FranjaVertical,
  areaVisible: FranjaVertical,
  desplazamientoActual: number,
  margen: number = MARGEN_BAJO_EL_CAMPO,
): number | null {
  /* Un campo de alto 0 es un campo que ya no está en pantalla: React Native mide en cero los nodos
     que se desmontaron. Pasa al cambiar de paso (del formulario al código de seis dígitos) con el
     teclado todavía arriba, y sin este corte la cuenta lo leería como "está pegado al borde de
     arriba" y mandaría la lista al principio de golpe. */
  if (campo.alto <= 0 || areaVisible.alto <= 0) return null;

  const sobraAbajo = campo.y + campo.alto + margen - (areaVisible.y + areaVisible.alto);
  const faltaArriba = areaVisible.y - (campo.y - margen);

  /* El borde de abajo manda cuando los dos se pasan, que es el caso de un campo más alto que lo
     que deja libre el teclado: ahí lo que hay que ver es el renglón donde está el cursor. */
  let delta = 0;
  if (sobraAbajo > 0) delta = sobraAbajo;
  else if (faltaArriba > 0) delta = -faltaArriba;

  // Medio píxel de diferencia no es un movimiento, es un parpadeo.
  if (Math.abs(delta) < 1) return null;

  const destino = Math.max(0, desplazamientoActual + delta);
  return Math.abs(destino - desplazamientoActual) < 1 ? null : destino;
}
