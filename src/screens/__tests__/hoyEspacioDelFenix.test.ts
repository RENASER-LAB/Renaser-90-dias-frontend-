/**
 * Hoy: la sección del fénix mide lo que ocupa, y el fénix no cambia de tamaño (pedido del dueño, 2026-10-30:
 * «en la parte de arriba mucho espacio, podemos optimizar sin reducir el tamaño»).
 *
 * Antes la sección tenía un alto fijo (`height: heroSize` = 252, o 206 en pantalla baja, por `rs()`) con el contenido
 * centrado y 12 de relleno: sobre ~206 de contenido quedaban entre 23 y 35 px en blanco arriba y otros tantos abajo,
 * encima del aire normal de 28 entre secciones. El mismo `heroSize` daba el diámetro del ave, así que sacarlo a ciegas
 * habría encogido (o agrandado) el fénix en algunas pantallas. Qué se prueba:
 *
 * 1. El diámetro es EXACTAMENTE el de antes en todos los anchos, altos y tipos de pantalla (fórmula anterior copiada
 *    aquí a mano, y valores fijos para los teléfonos de uso común).
 * 2. La sección ya no tiene alto fijo, ni centrado, ni relleno propio, ni recorta (`overflow`): el aro, el brillo y el
 *    halo del fénix se dibujan fuera del área de toque (`ESCALA_DEL_FENIX`) y necesitan salir de ella.
 * 3. El aire entre el rótulo, el ave y el rótulo de la fase es el de siempre (10 o 14): el ave se dibuja 14 px por
 *    fuera de su área de toque y ese aire es el que le deja el sitio.
 * 4. No se reserva el alto de «Terminar»: es una decisión (ver `styles.hero`), y esta prueba avisa si alguien la
 *    revierte sin querer devolviendo un `minHeight`.
 *
 * El layout real (que no salte nada con la voz, el modo oscuro, la letra grande y la web) se mira en el emulador:
 * Jest no mide texto ni Rive.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import {
  DIAMETRO_MAXIMO_DEL_ORBE,
  diametroDelOrbe,
  ladoDeReferenciaDelOrbe,
} from '../../features/home/utils/diametroDelOrbe';

const RAIZ = path.resolve(__dirname, '..', '..');

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const HOY = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/HoyScreen.tsx'), 'utf-8'));

/** El cuerpo de `nombre: { … }` dentro de `StyleSheet.create`, o `null` si no está. */
function estilo(nombre: string): string | null {
  const encontrado = HOY.match(new RegExp(`\\n\\s*${nombre}:\\s*\\{([^}]*)\\}`));
  return encontrado ? encontrado[1] : null;
}

/* La cuenta de `useResponsive()` (theme/responsive.ts), tal cual, para recrear cada teléfono. */
function telefono(width: number, height: number) {
  const scale = Math.min(1.25, Math.max(0.85, width / 375));
  const isSmall = width < 360;
  const isShort = height < 720;
  const isTablet = width >= 768;
  const rs = (size: number) => Math.round(size * scale);
  const horizontalPadding = isSmall ? 14 : isTablet ? 32 : width <= 440 ? 18 : 20;
  const anchoContenido = (isTablet ? Math.min(560, width) : width) - horizontalPadding * 2;
  return { rs, isShort, anchoContenido };
}

/** La fórmula de `HoyScreen` antes del cambio: `heroSize` y el diámetro que salía de él. */
function diametroAnterior(width: number, height: number): number {
  const { rs, isShort, anchoContenido } = telefono(width, height);
  const heroSize = Math.min(anchoContenido, rs(isShort ? 206 : 252));
  return Math.min(140, Math.round(heroSize * 0.58));
}

const ANCHOS = [280, 320, 340, 360, 375, 393, 411, 430, 480, 600, 767, 768, 820, 1024];
const ALTOS = [480, 568, 640, 667, 719, 720, 760, 800, 915, 1024];

describe('Hoy · el fénix no cambia de tamaño', () => {
  it('el diámetro es el de antes en todos los anchos y altos', () => {
    for (const width of ANCHOS) {
      for (const height of ALTOS) {
        const { rs, isShort, anchoContenido } = telefono(width, height);
        expect(diametroDelOrbe(anchoContenido, rs, isShort)).toBe(diametroAnterior(width, height));
      }
    }
  });

  it('los teléfonos de uso común siguen con el mismo fénix', () => {
    const comun = (width: number, height: number) => {
      const { rs, isShort, anchoContenido } = telefono(width, height);
      return diametroDelOrbe(anchoContenido, rs, isShort);
    };
    // Estándar y Xiaomi (360–440 de ancho, altos de verdad): el máximo.
    expect(comun(360, 800)).toBe(140);
    expect(comun(375, 812)).toBe(140);
    expect(comun(393, 851)).toBe(140);
    expect(comun(411, 915)).toBe(140);
    expect(comun(430, 932)).toBe(140);
    // Tablet: el mismo máximo.
    expect(comun(820, 1180)).toBe(140);
    // Pantalla baja o angosta: más chico que 140, como ya era (no se agranda por haber ganado sitio).
    expect(comun(375, 667)).toBe(119);
    expect(comun(320, 568)).toBe(102);
    expect(comun(320, 800)).toBe(125);
  });

  it('nunca pasa del máximo ni del ancho disponible', () => {
    for (const width of ANCHOS) {
      for (const height of ALTOS) {
        const { rs, isShort, anchoContenido } = telefono(width, height);
        const diametro = diametroDelOrbe(anchoContenido, rs, isShort);
        expect(diametro).toBeLessThanOrEqual(DIAMETRO_MAXIMO_DEL_ORBE);
        expect(diametro).toBeLessThanOrEqual(ladoDeReferenciaDelOrbe(anchoContenido, rs, isShort));
        expect(diametro).toBeGreaterThan(0);
      }
    }
  });
});

describe('Hoy · la sección del fénix mide lo que ocupa', () => {
  const hero = estilo('hero');
  const centro = estilo('heroCenter');

  it('`hero` existe y no fija alto, no centra, no rellena ni recorta', () => {
    expect(hero).not.toBeNull();
    expect(hero).not.toMatch(/\b(height|minHeight|maxHeight)\s*:/);
    expect(hero).not.toMatch(/justifyContent/);
    expect(hero).not.toMatch(/padding(Vertical|Top|Bottom)?\s*:/);
    expect(hero).not.toMatch(/overflow/);
    expect(centro).not.toMatch(/\b(height|minHeight|maxHeight)\s*:/);
    expect(centro).not.toMatch(/overflow/);
  });

  it('la vista no recibe un alto por afuera y ya no existe `heroSize`', () => {
    expect(HOY).toContain('<View style={styles.hero}>');
    expect(HOY).not.toMatch(/styles\.hero\s*,\s*\{/);
    expect(HOY).not.toMatch(/\bheroSize\b/);
  });

  it('el fénix recibe el diámetro de siempre', () => {
    expect(HOY).toMatch(/const diametroDelFenix = diametroDelOrbe\(anchoContenido, rs, isShort\);/);
    expect(HOY).toMatch(/diametro=\{diametroDelFenix\}/);
  });

  it('el aire entre rótulo, ave y rótulo de la fase es el de siempre', () => {
    // Arriba del ave y arriba del rótulo de la fase: 14 (10 en pantalla baja). El ave se dibuja 14 px fuera de su área
    // de toque (ESCALA_DEL_FENIX 1,2 sobre 140) y esos px son los que le dejan sitio sin pisar el texto.
    const aire = HOY.match(/marginTop:\s*isShort\s*\?\s*10\s*:\s*14/g) ?? [];
    expect(aire.length).toBe(2);
    const orbe = fs.readFileSync(path.join(RAIZ, 'features/renasia/components/OrbeAcompanante.tsx'), 'utf-8');
    expect(orbe).toMatch(/const ESCALA_DEL_FENIX = 1\.2;/);
  });

  it('con la voz abierta «Terminar» sigue debajo del rótulo de la fase y sin reservar su alto', () => {
    expect(HOY).toMatch(/muestraTerminar\(voz\.fase, voz\.terminar\)\s*\?\s*\(\s*<BotonTerminarConversacion/);
    // Si algún día se reserva, que sea una decisión nueva y no un descuido.
    expect(HOY).not.toMatch(/reservaDeTerminar|ALTO_DE_TERMINAR/);
  });

  it('el rótulo de la fase deja casi todo el ancho para que no salte de una a dos líneas con letra grande', () => {
    expect(HOY).toMatch(/textAlign:\s*'center',\s*paddingHorizontal:\s*8\s*\}/);
  });
});
