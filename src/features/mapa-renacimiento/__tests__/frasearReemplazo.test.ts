import { describe, expect, it } from '@jest/globals';

import { frasearReemplazo } from '../reglas';

const base = { id: 'x', patron: 'celular/redes', conductaActual: 'Me quedo dos horas mirando videos',
  respuestaAlternativa: 'Dejo el celular en la cocina y leo diez páginas' };

/**
 * La plantilla del manual antepone «Cuando », y el campo se pide con el placeholder "Cuándo, dónde
 * o ante qué ocurre" — que invita a empezar la frase con "Cuando". Salía "Cuando Cuando abro el
 * celular en la cama", visible en el resumen del paso 10 del Mapa.
 */
describe('frasearReemplazo', () => {
  it('no repite el "Cuando" que la persona ya escribió', () => {
    const r = frasearReemplazo({ ...base, disparador: 'Cuando abro el celular en la cama' });
    expect(r).toContain('Cuando abro el celular en la cama,');
    expect(r).not.toContain('Cuando Cuando');
  });

  it('lo quita también con tilde y en minúscula', () => {
    expect(frasearReemplazo({ ...base, disparador: 'Cuándo llego cansado' })).toContain('Cuando llego cansado,');
    expect(frasearReemplazo({ ...base, disparador: 'cuando me aburro' })).toContain('Cuando me aburro,');
  });

  it('lo antepone cuando la persona NO lo escribió', () => {
    expect(frasearReemplazo({ ...base, disparador: 'Abro el celular en la cama' }))
      .toContain('Cuando Abro el celular en la cama,');
  });

  it('no se come un "cuando" que está en medio de la frase', () => {
    expect(frasearReemplazo({ ...base, disparador: 'Estoy solo y no sé cuando parar' }))
      .toContain('Cuando Estoy solo y no sé cuando parar,');
  });
});
