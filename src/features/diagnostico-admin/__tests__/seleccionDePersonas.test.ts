import { describe, expect, it } from '@jest/globals';

import {
  alternarPersona,
  alternarTodas,
  cuantas,
  idsDe,
  nombreDe,
  textoDeConfirmarElLote,
  textoDeLaSeleccion,
  todasMarcadas,
} from '../utils/seleccionDePersonas';

const ANA = { id: 'u1', fullName: 'Ana Pérez' };
const LUIS = { id: 'u2', fullName: '  Luis Rojas ' };
const SIN_NOMBRE = { id: 'u3', fullName: null };

describe('la selección de personas para asignar en lote', () => {
  it('marca y desmarca de a una, guardando el nombre', () => {
    const una = alternarPersona({}, ANA);
    expect(una).toEqual({ u1: 'Ana Pérez' });
    const dos = alternarPersona(una, LUIS);
    expect(idsDe(dos)).toEqual(['u1', 'u2']);
    expect(dos.u2).toBe('Luis Rojas');
    expect(alternarPersona(dos, ANA)).toEqual({ u2: 'Luis Rojas' });
    expect(cuantas(dos)).toBe(2);
  });

  it('una persona sin nombre se llama «Persona sin nombre»', () => {
    expect(nombreDe(SIN_NOMBRE)).toBe('Persona sin nombre');
  });

  it('marcar todas las de la lista no toca lo marcado fuera de ella; si ya estaban todas, las desmarca', () => {
    const afuera = { zz: 'Otra' };
    const todas = alternarTodas(afuera, [ANA, LUIS]);
    expect(idsDe(todas).sort()).toEqual(['u1', 'u2', 'zz']);
    expect(todasMarcadas(todas, [ANA, LUIS])).toBe(true);
    expect(alternarTodas(todas, [ANA, LUIS])).toEqual({ zz: 'Otra' });
    // Con alguna sola marcada, «todas» completa la lista.
    expect(idsDe(alternarTodas({ u1: 'Ana Pérez' }, [ANA, LUIS])).sort()).toEqual(['u1', 'u2']);
  });

  it('con la lista vacía no hay «todas marcadas»', () => {
    expect(todasMarcadas({}, [])).toBe(false);
  });

  it('el contador y la confirmación hablan en plural y singular', () => {
    expect(textoDeLaSeleccion(0)).toBe('Marca a las personas que quieres incluir');
    expect(textoDeLaSeleccion(1)).toBe('1 persona marcada');
    expect(textoDeLaSeleccion(5)).toBe('5 personas marcadas');
    expect(textoDeConfirmarElLote(1).titulo).toBe('¿Asignar el diagnóstico a 1 persona?');
    expect(textoDeConfirmarElLote(12).titulo).toBe('¿Asignar el diagnóstico a 12 personas?');
    expect(textoDeConfirmarElLote(12).mensaje).toContain('Completa tu diagnóstico');
  });
});
