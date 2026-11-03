import { describe, expect, it } from '@jest/globals';

import { verLasMarcas } from '../textos';

/** E2E de las formaciones (01/11/2026): la tarjeta «Portada» del editor mostraba «Diagnóstico inicial · {formacion}» con la marca sin reemplazar. */
describe('las marcas de la plantilla se leen en las tarjetas del editor', () => {
  it('{formacion} y {duracion} se escriben entre corchetes, todas las veces que salgan', () => {
    expect(verLasMarcas('Diagnóstico inicial · {formacion}')).toBe('Diagnóstico inicial · [formación]');
    expect(verLasMarcas('¿A qué número quieres llegar en {duracion}? ({duracion})')).toBe('¿A qué número quieres llegar en [duración]? ([duración])');
    expect(verLasMarcas('{formacion} · {duracion}')).toBe('[formación] · [duración]');
  });

  it('un texto sin marcas queda igual', () => {
    expect(verLasMarcas('Conociéndote')).toBe('Conociéndote');
    expect(verLasMarcas('')).toBe('');
  });

  it('una llave que no es de las dos marcas no se toca', () => {
    expect(verLasMarcas('Pon {otra} cosa')).toBe('Pon {otra} cosa');
  });
});
