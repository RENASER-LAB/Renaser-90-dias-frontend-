/**
 * Spec 045 FR-002: dónde está cada pestaña de la barra, medida en la ventana (no con números fijos), para que el recorrido
 * ponga su foco encima. La barra (`TabBar`) registra el botón de cada pestaña; el recorrido pide medirlas.
 */
export type Rectangulo = { x: number; y: number; ancho: number; alto: number };

type Medible = { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null;

const botones = new Map<string, Medible>();
const oyentes = new Set<() => void>();

export function registrarBotonDePestana(nombre: string, boton: Medible): void {
  if (boton) botones.set(nombre, boton);
  else botones.delete(nombre);
}

/** La barra avisa cuando se volvió a acomodar (rotación, letra, teclado). */
export function avisarQueLaBarraSeMovio(): void {
  for (const oyente of [...oyentes]) oyente();
}

export function alMoverseLaBarra(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function medirPestana(nombre: string): Promise<Rectangulo | null> {
  const boton = botones.get(nombre);
  if (!boton?.measureInWindow) return Promise.resolve(null);
  return new Promise(resolver => {
    boton.measureInWindow!((x, y, ancho, alto) => resolver(ancho > 0 && alto > 0 ? { x, y, ancho, alto } : null));
  });
}

/** El círculo del foco: centrado en el botón, con 16 dp de aire y 64 como mínimo. */
export function circuloDelFoco(r: Rectangulo): { cx: number; cy: number; radio: number } {
  const diametro = Math.max(64, Math.max(r.ancho, r.alto) + 16);
  return { cx: r.x + r.ancho / 2, cy: r.y + r.alto / 2, radio: diametro / 2 };
}

export function olvidarBotonesParaPruebas(): void {
  botones.clear();
  oyentes.clear();
}
