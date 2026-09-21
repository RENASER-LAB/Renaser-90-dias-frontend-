/**
 * El arreglo del teclado que tapaba la contraseña en "Crear cuenta".
 *
 * Hasta 2026-09-21 el `KeyboardAvoidingView` de la pantalla de acceso tenía `behavior` sólo en
 * iOS, así que en Android no hacía nada y el teclado se comía la mitad de abajo del formulario.
 * Encoger el área no alcanzaba: hace falta además correr la lista hasta el campo enfocado, y esa
 * cuenta es la que fijan estas pruebas.
 */
import { describe, expect, it } from '@jest/globals';

import { MARGEN_BAJO_EL_CAMPO, desplazamientoParaVerElCampo } from '../campoBajoElTeclado';

/**
 * Un teléfono de 800 px de alto con la barra superior de la pantalla ocupando los primeros 100, y
 * un teclado de 320 abajo: a la lista le quedan visibles de 100 a 480.
 */
const AREA_VISIBLE_CON_TECLADO = { y: 100, alto: 380 };

/** Un campo de texto de esta pantalla mide 52 px de alto (`inputWrap`). */
function campoEn(y: number) {
  return { y, alto: 52 };
}

describe('desplazamientoParaVerElCampo', () => {
  it('no mueve nada si el campo ya se ve entero', () => {
    // Correo, arriba del todo: termina en 252, muy lejos del borde del teclado.
    expect(desplazamientoParaVerElCampo(campoEn(200), AREA_VISIBLE_CON_TECLADO, 0)).toBeNull();
  });

  it('sube el formulario lo justo cuando el teclado tapa la contraseña', () => {
    // El campo va de 500 a 552; con el margen pide llegar hasta 572 y sólo hay hasta 480.
    expect(desplazamientoParaVerElCampo(campoEn(500), AREA_VISIBLE_CON_TECLADO, 0)).toBe(92);
  });

  it('el desplazamiento es relativo al que ya tenía la lista', () => {
    // Misma pantalla, pero la persona ya había arrastrado 140 px: el resultado es 140 + 92.
    expect(desplazamientoParaVerElCampo(campoEn(500), AREA_VISIBLE_CON_TECLADO, 140)).toBe(232);
  });

  it('también acomoda al campo que apenas asoma por abajo', () => {
    // Termina en 462: entra, pero pisando el margen. Se corre esos 2 px que faltan.
    expect(desplazamientoParaVerElCampo(campoEn(410), AREA_VISIBLE_CON_TECLADO, 0)).toBe(2);
  });

  it('baja el formulario si el campo quedó arriba del área visible', () => {
    // Pasa al volver de un paso a otro con el teclado abierto: el campo enfocado está más arriba
    // que lo que se ve. Con el campo en 60 y el margen, hay que retroceder 60 px.
    expect(desplazamientoParaVerElCampo(campoEn(60), AREA_VISIBLE_CON_TECLADO, 300)).toBe(240);
  });

  it('nunca pide un desplazamiento negativo', () => {
    // Misma situación que la anterior pero con la lista casi arriba del todo: se clava en 0 en vez
    // de pedir -30, que en iOS rebota y en Android se ignora.
    expect(desplazamientoParaVerElCampo(campoEn(60), AREA_VISIBLE_CON_TECLADO, 30)).toBe(0);
  });

  it('ignora un campo que ya no está montado', () => {
    // React Native mide en cero lo que se desmontó. Sin este corte, cambiar de paso con el teclado
    // arriba mandaba la lista al principio.
    expect(desplazamientoParaVerElCampo({ y: 0, alto: 0 }, AREA_VISIBLE_CON_TECLADO, 300)).toBeNull();
  });

  it('ignora una medición del área visible que todavía no existe', () => {
    expect(desplazamientoParaVerElCampo(campoEn(500), { y: 0, alto: 0 }, 0)).toBeNull();
  });

  it('el margen es el de la constante, no un número suelto en la pantalla', () => {
    expect(MARGEN_BAJO_EL_CAMPO).toBe(20);
    // Sin margen, el mismo campo de la segunda prueba pide 20 px menos.
    expect(desplazamientoParaVerElCampo(campoEn(500), AREA_VISIBLE_CON_TECLADO, 0, 0)).toBe(72);
  });
});
