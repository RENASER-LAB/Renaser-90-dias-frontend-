/**
 * La lista de Eventos se relee sin multiplicar pedidos y sin que una respuesta vieja pise una nueva.
 *
 * **El bug (e2e del 26/09).** Un evento creado por el Alquimista mientras el mentor tenía la app
 * abierta no aparecía en Comunidad → Eventos ni al volver a la sección ni deslizando: `useEventos`
 * leía una sola vez, al montar, y ningún cambio de vista ni el foco de la pestaña releían. Contra el
 * código viejo este archivo no compila: `lecturaVigente` no existía, y `vistaPideReleer` es la regla
 * que el código viejo no tenía (volver a la lista no releía nada).
 */
import { describe, expect, it } from '@jest/globals';

import { crearLecturaVigente, vistaPideReleer, type ResultadoDeLectura } from '../lecturaVigente';

/** Un pedido que se resuelve a mano, para ordenar las respuestas como en la red. */
function pedidoManual<T>() {
  const pendientes: Array<{ resolver: (v: T) => void; fallar: (e: unknown) => void }> = [];
  const pedir = () =>
    new Promise<T>((resolver, fallar) => {
      pendientes.push({ resolver, fallar });
    });
  return { pedir, pendientes };
}

describe('relecturas de la lista de Eventos', () => {
  it('dos disparos juntos (montar la sección y ganar el foco) hacen UN solo pedido', async () => {
    const { pedir, pendientes } = pedidoManual<string>();
    const aplicados: ResultadoDeLectura<string>[] = [];
    const lectura = crearLecturaVigente(pedir, r => aplicados.push(r));

    const a = lectura.leer();
    const b = lectura.leer();
    expect(pendientes).toHaveLength(1);
    expect(lectura.ocupada()).toBe(true);

    pendientes[0].resolver('lista');
    await Promise.all([a, b]);
    expect(aplicados).toEqual([{ ok: true, valor: 'lista' }]);
    expect(lectura.ocupada()).toBe(false);
  });

  it('terminada una lectura, el siguiente disparo (volver a la lista, deslizar) sí pide de nuevo', async () => {
    const { pedir, pendientes } = pedidoManual<string>();
    const aplicados: string[] = [];
    const lectura = crearLecturaVigente(pedir, r => r.ok && aplicados.push(r.valor));

    const primera = lectura.leer();
    pendientes[0].resolver('sin el evento nuevo');
    await primera;
    const segunda = lectura.leer();
    expect(pendientes).toHaveLength(2);
    pendientes[1].resolver('con el evento nuevo');
    await segunda;
    expect(aplicados).toEqual(['sin el evento nuevo', 'con el evento nuevo']);
  });

  it('forzar (tras crear un evento) pide otra, y la vieja que llega DESPUÉS no pisa a la nueva', async () => {
    const { pedir, pendientes } = pedidoManual<string>();
    const aplicados: string[] = [];
    const lectura = crearLecturaVigente(pedir, r => r.ok && aplicados.push(r.valor));

    const vieja = lectura.leer();
    const nueva = lectura.leer({ forzar: true });
    expect(pendientes).toHaveLength(2);

    pendientes[1].resolver('nueva');
    await nueva;
    pendientes[0].resolver('vieja');
    await vieja;
    expect(aplicados).toEqual(['nueva']);
  });

  it('invalidar («Voy», cancelar) descarta la lectura en vuelo; la siguiente sale de cero', async () => {
    const { pedir, pendientes } = pedidoManual<string>();
    const aplicados: string[] = [];
    const lectura = crearLecturaVigente(pedir, r => r.ok && aplicados.push(r.valor));

    const enVuelo = lectura.leer();
    lectura.invalidar();
    expect(lectura.ocupada()).toBe(false);
    const despues = lectura.leer();
    expect(pendientes).toHaveLength(2);

    pendientes[0].resolver('asistencia vieja');
    pendientes[1].resolver('asistencia nueva');
    await Promise.all([enVuelo, despues]);
    expect(aplicados).toEqual(['asistencia nueva']);
  });

  it('un fallo llega a aplicar como fallo (la sección decide si conserva lo que había)', async () => {
    const { pedir, pendientes } = pedidoManual<string>();
    const aplicados: ResultadoDeLectura<string>[] = [];
    const lectura = crearLecturaVigente(pedir, r => aplicados.push(r));

    const p = lectura.leer();
    const error = new Error('sin red');
    pendientes[0].fallar(error);
    await p;
    expect(aplicados).toEqual([{ ok: false, error }]);
  });

  it('volver a la lista desde el detalle, la agenda o el formulario relee; lo demás no', () => {
    expect(vistaPideReleer('detalle', 'lista')).toBe(true);
    expect(vistaPideReleer('agenda', 'lista')).toBe(true);
    expect(vistaPideReleer('formulario', 'lista')).toBe(true);
    expect(vistaPideReleer('lista', 'lista')).toBe(false);
    expect(vistaPideReleer('lista', 'detalle')).toBe(false);
    expect(vistaPideReleer('lista', 'agenda')).toBe(false);
    expect(vistaPideReleer('formulario', 'detalle')).toBe(false);
  });
});
