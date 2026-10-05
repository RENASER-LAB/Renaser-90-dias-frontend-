import { describe, expect, it } from '@jest/globals';
import {
  CABEZA_EN_LA_IMAGEN,
  COLA_EN_LA_IMAGEN,
  PROPORCION_DE_LA_IMAGEN,
  altoDeLaCabecera,
  conOpacidad,
  corrimientoDeLaImagen,
  curvaDeNivel,
  inicioDelDegradado,
  paradasDelDegradado,
  solapeDelTitulo,
} from '../cabeceraDelIngreso';

/**
 * La cabecera del login (2026-10-05): cuánto mide, qué parte del fénix se ve y cómo se funde con el
 * fondo. Lo que pidió el dueño al verla en el emulador: «que no cubra toda la imagen porque no veo
 * la cola», con un degradado en vez de un corte. Lo que estas pruebas cuidan:
 *
 * - en el login de un teléfono normal se ve el fénix ENTERO: la cabeza bajo la barra de estado y
 *   la cola dentro de la cabecera, todavía poco tapada por el degradado;
 * - en ningún tamaño la cabeza queda debajo de la hora ni hay un hueco arriba de la imagen;
 * - el degradado no tiene bordes (sin banda), y el título se apoya donde el fondo ya tapa la imagen.
 */

/** Opacidad del fondo en la posición `t` (0–1) del degradado, interpolando entre paradas. */
function opacidadEn(t: number): number {
  const { posiciones, opacidades } = paradasDelDegradado();
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const i = posiciones.findIndex(p => p >= t);
  const [p0, p1] = [posiciones[i - 1], posiciones[i]];
  const [o0, o1] = [opacidades[i - 1], opacidades[i]];
  return o0 + ((t - p0) / (p1 - p0)) * (o1 - o0);
}

/** Cuánto tapa el degradado a la altura `y` (dp desde arriba de la cabecera). */
function tapadoEn(y: number, alto: number, inicio: number): number {
  return opacidadEn((y - inicio) / (alto - inicio));
}

const PIXEL_6 = { ancho: 412, altoPantalla: 915, barra: 24 };

describe('altoDeLaCabecera', () => {
  it('ocupa ~54 % de la pantalla en el login y ~30 % en «Solicitar acceso»', () => {
    expect(altoDeLaCabecera(915, 'alta')).toBe(494);
    expect(altoDeLaCabecera(915, 'baja')).toBe(275);
  });

  it('en una pantalla corta se achica para dejarle lugar al formulario', () => {
    expect(altoDeLaCabecera(640, 'alta')).toBe(294);
    expect(altoDeLaCabecera(640, 'baja')).toBe(180);
  });

  it('en una tablet no pasa del tope', () => {
    expect(altoDeLaCabecera(1280, 'alta')).toBe(600);
    expect(altoDeLaCabecera(1280, 'baja')).toBe(340);
  });
});

describe('el fénix en el login (Pixel 6)', () => {
  const { ancho, altoPantalla, barra } = PIXEL_6;
  const alto = altoDeLaCabecera(altoPantalla, 'alta');
  const altoDeLaImagen = ancho * PROPORCION_DE_LA_IMAGEN;
  const corrimiento = corrimientoDeLaImagen({ ancho, alto, margenSuperior: barra, variante: 'alta' });
  const inicio = inicioDelDegradado(alto, 'alta');
  const cabeza = CABEZA_EN_LA_IMAGEN * altoDeLaImagen - corrimiento;
  const finDeLaCola = COLA_EN_LA_IMAGEN * altoDeLaImagen - corrimiento;
  const mitadDeLaCola = ((0.5 + COLA_EN_LA_IMAGEN) / 2) * altoDeLaImagen - corrimiento;

  it('la imagen sube un poco, sin dejar hueco arriba', () => {
    expect(corrimiento).toBeGreaterThan(0);
    expect(corrimiento).toBeLessThan(altoDeLaImagen * 0.1);
  });

  it('la cabeza queda bajo la barra de estado y la cola termina dentro de la cabecera', () => {
    expect(cabeza).toBeGreaterThan(barra + 40);
    expect(finDeLaCola).toBeLessThan(alto);
  });

  it('la cola se ve a través del degradado: a media cola tapa menos de la mitad', () => {
    expect(tapadoEn(mitadDeLaCola, alto, inicio)).toBeLessThan(0.5);
    // …y la cabeza y las alas no tienen ningún velo encima.
    expect(cabeza).toBeLessThan(inicio);
  });

  it('el título se apoya donde el fondo ya tapa ~90 % de la imagen', () => {
    const arribaDelTitulo = alto - solapeDelTitulo('alta');
    expect(tapadoEn(arribaDelTitulo, alto, inicio)).toBeGreaterThan(0.85);
  });
});

describe('corrimientoDeLaImagen en otros tamaños', () => {
  it.each([
    { nombre: 'Pixel 6, «Solicitar acceso»', ancho: 412, alto: 915, variante: 'baja' as const },
    { nombre: 'pantalla corta, login', ancho: 360, alto: 640, variante: 'alta' as const },
    { nombre: 'pantalla corta, alta', ancho: 360, alto: 640, variante: 'baja' as const },
    { nombre: 'tablet, login', ancho: 800, alto: 1280, variante: 'alta' as const },
  ])('$nombre: la cabeza a la vista y sin hueco arriba ni abajo', ({ ancho, alto: altoPantalla, variante }) => {
    const alto = altoDeLaCabecera(altoPantalla, variante);
    const altoDeLaImagen = ancho * PROPORCION_DE_LA_IMAGEN;
    const corrimiento = corrimientoDeLaImagen({ ancho, alto, margenSuperior: 24, variante });
    const cabeza = CABEZA_EN_LA_IMAGEN * altoDeLaImagen - corrimiento;
    expect(corrimiento).toBeGreaterThanOrEqual(0);
    expect(corrimiento + alto).toBeLessThanOrEqual(altoDeLaImagen);
    expect(cabeza).toBeGreaterThan(24 + 40);
    expect(cabeza).toBeLessThan(inicioDelDegradado(alto, variante) + 20);
  });
});

describe('paradasDelDegradado', () => {
  const { posiciones, opacidades } = paradasDelDegradado();

  it('va de transparente a opaco en nueve paradas parejas', () => {
    expect(posiciones).toHaveLength(9);
    expect(posiciones[0]).toBe(0);
    expect(posiciones[8]).toBe(1);
    expect(opacidades[0]).toBe(0);
    expect(opacidades[8]).toBe(1);
    for (let i = 1; i < opacidades.length; i++) expect(opacidades[i]).toBeGreaterThan(opacidades[i - 1]);
  });

  it('no tiene bordes: arranca y llega suave (sin banda donde empieza ni donde termina)', () => {
    const pendiente = (i: number) => (opacidades[i + 1] - opacidades[i]) / (posiciones[i + 1] - posiciones[i]);
    const medio = Math.max(...posiciones.slice(0, -1).map((_, i) => pendiente(i)));
    expect(pendiente(0)).toBeLessThan(medio * 0.15);
    expect(pendiente(7)).toBeLessThan(medio * 0.5);
  });

  it('va «tarde»: la primera mitad tapa poco (ahí está la cola)', () => {
    expect(opacidadEn(0.5)).toBeLessThan(0.35);
  });
});

describe('conOpacidad', () => {
  it('agrega la opacidad como canal alfa', () => {
    expect(conOpacidad('#FCFBF9', 0)).toBe('#FCFBF900');
    expect(conOpacidad('#FCFBF9', 1)).toBe('#FCFBF9FF');
    expect(conOpacidad('#0C0B09', 0.5)).toBe('#0C0B0980');
  });
});

describe('curvaDeNivel', () => {
  it('es una curva cerrada', () => {
    const camino = curvaDeNivel(100, 100, 40, 0.6, 12);
    expect(camino.startsWith('M')).toBe(true);
    expect(camino.endsWith('Z')).toBe(true);
    expect(camino.split('L')).toHaveLength(13);
  });
});
