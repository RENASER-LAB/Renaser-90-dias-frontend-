/**
 * Comunidad en el emulador Android (Pixel 6, 2026-10-05): lo que en la web no se veía.
 *
 * 1. La barra de escribir flotaba 48 dp por encima del teclado: el `KeyboardAvoidingView` de la
 *    conversación llevaba `keyboardVerticalOffset={insets.top}` y el inset de arriba se contaba dos
 *    veces, porque la `y` que React Native toma de `onLayout` ya lo trae adentro (el padre es el
 *    `SafeAreaView`, que empieza en el borde de la pantalla).
 * 2. «Responder» dejaba el cursor en el campo pero el teclado cerrado: lo enfocaba a los 250 ms,
 *    con la hoja del menú todavía en pantalla. Ahora espera el aviso de la hoja (`alTerminarDeCerrar`,
 *    probado en `components/hojaDesdeAbajo/__tests__/alTerminarDeCerrar.test.ts`).
 * 3. En el detalle de un curso se leía «Ver» en vez de «Ver más» (la segunda palabra se cortaba).
 *
 * Se lee el código fuente sin comentarios, como en `comunidadIconosYTextos.test.ts`: la pantalla
 * tiene ~5000 líneas y monta media app. Contra el código anterior fallan todas menos la de los
 * números medidos, que documenta la cuenta de React Native (pasa con y sin el arreglo).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const COMUNIDAD = sinComentarios(
  fs.readFileSync(path.join(RAIZ, 'screens/ComunidadScreen.tsx'), 'utf-8'),
);

/** La etiqueta de apertura del `KeyboardAvoidingView` de la conversación (fondo del chat). */
function aperturaDelTecladoDelChat(): string {
  const etiquetas = COMUNIDAD.match(/<KeyboardAvoidingView\b[^>]*>/g) ?? [];
  const delChat = etiquetas.filter(e => e.includes('paletaDelChat.fondo'));
  expect(delChat).toHaveLength(1);
  return delChat[0];
}

/**
 * La cuenta de `KeyboardAvoidingView._relativeKeyboardHeight` (React Native 0.86) con
 * `behavior="padding"`: cuánto relleno pone abajo.
 */
function rellenoDeReactNative(vista: { y: number; alto: number }, yTeclado: number, desplazamiento: number) {
  return Math.max(vista.y + vista.alto - (yTeclado - desplazamiento), 0);
}

describe('Chat de Comunidad: la barra de escribir sobre el teclado', () => {
  it('no compensa el inset de arriba: la `y` de la vista ya lo trae', () => {
    const apertura = aperturaDelTecladoDelChat();
    expect(apertura).toContain('behavior="padding"');
    expect(apertura).not.toMatch(/keyboardVerticalOffset=\{[^}]*insets\.top/);
  });

  it('con los números medidos en el Pixel 6, desplazamiento 0 deja la barra justo en el teclado', () => {
    // Medido con `onLayout` y `keyboardDidShow` (dp): la vista empieza en el inset de arriba y
    // termina sobre el inset de abajo (914,29 − 24); el teclado arranca en 577,90.
    const vista = { y: 48.761905670166016, alto: 841.5238037109375 };
    const yTeclado = 577.90478515625;
    const fondoDeLaVista = vista.y + vista.alto;

    const sinDesplazamiento = rellenoDeReactNative(vista, yTeclado, 0);
    expect(fondoDeLaVista - sinDesplazamiento).toBeCloseTo(yTeclado, 3);

    // Lo de antes: el fondo útil quedaba 48,76 dp más arriba que el teclado (el hueco que se veía).
    const conInsetDeArriba = rellenoDeReactNative(vista, yTeclado, vista.y);
    expect(yTeclado - (fondoDeLaVista - conInsetDeArriba)).toBeCloseTo(vista.y, 3);
  });
});

describe('Chat de Comunidad: «Responder» abre el teclado', () => {
  it('enfoca el campo cuando la hoja del menú avisa que se fue, no a un tiempo fijo', () => {
    const responder = COMUNIDAD.slice(COMUNIDAD.indexOf('const responderA'), COMUNIDAD.indexOf('const copiarMensaje'));
    expect(responder).not.toMatch(/setTimeout[\s\S]*focus/);
    expect(responder).toContain('enfocarAlCerrarElMenu.current = true');

    const menu = COMUNIDAD.slice(COMUNIDAD.indexOf('<MenuDelMensaje'), COMUNIDAD.indexOf('/>', COMUNIDAD.indexOf('<MenuDelMensaje')));
    expect(menu).toContain('alTerminarDeCerrar={alTerminarDeCerrarElMenu}');
  });
});

describe('Cursos: «Ver más» / «Ver menos» entero', () => {
  it('la palabra de después de «Ver» no se pierde al ajustar la caja a píxeles enteros', () => {
    // En el detalle del curso se veía «Ver» y un hueco: la caja quedaba una fracción de píxel más
    // angosta que la frase y la segunda palabra se iba a un renglón que no se mostraba.
    const componente = COMUNIDAD.slice(COMUNIDAD.indexOf('function VerMasOMenos'), COMUNIDAD.indexOf('const SIN_MENSAJES'));
    const etiqueta = componente.match(/<Text style=\{\[([^\]]*)\]\}>\{abierto \? 'Ver menos' : 'Ver más'\}<\/Text>/);
    expect(etiqueta).not.toBeNull();
    expect(etiqueta![1]).toMatch(/paddingRight: 1\b/);
  });
});
