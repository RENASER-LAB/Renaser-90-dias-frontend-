import { describe, expect, it } from '@jest/globals';

import { motivoDeRechazoDeLaImagen, PESO_MAXIMO_DE_IMAGEN } from '../imagenDeAnimal';
import { estadoDeLaImagen, hayCambiosParaGuardar } from '../animalesDeFase';
import { ejemploDeLaTarjetaDeFase } from '../ejemploDeLaTarjetaDeFase';

const ok = { uri: 'file://a', mimeType: 'image/png', peso: 1000, ancho: 512, alto: 512 };

describe('motivoDeRechazoDeLaImagen', () => {
  it('PNG y WebP dentro de los límites sirven', () => {
    expect(motivoDeRechazoDeLaImagen(ok)).toBeNull();
    expect(motivoDeRechazoDeLaImagen({ ...ok, mimeType: 'image/webp' })).toBeNull();
  });

  it('JPEG no: dice PNG o WebP', () => {
    expect(motivoDeRechazoDeLaImagen({ ...ok, mimeType: 'image/jpeg' })).toBe('La imagen tiene que ser PNG o WebP.');
  });

  it('peso y medidas, con el número en el mensaje', () => {
    expect(motivoDeRechazoDeLaImagen({ ...ok, peso: PESO_MAXIMO_DE_IMAGEN + 1 })).toMatch(/pesa 2,0? MB|pesa 2 MB|máximo es 2 MB/);
    expect(motivoDeRechazoDeLaImagen({ ...ok, ancho: 100 })).toMatch(/muy chica \(100 × 512 px\)/);
    expect(motivoDeRechazoDeLaImagen({ ...ok, alto: 5000 })).toMatch(/demasiado grande/);
  });

  it('si el selector no sabe peso ni medidas, lo decide el servidor', () => {
    expect(motivoDeRechazoDeLaImagen({ uri: 'x', mimeType: 'image/png' })).toBeNull();
  });
});

describe('lo que dice la lista y cuándo se puede guardar', () => {
  it('estado de la imagen', () => {
    expect(estadoDeLaImagen(undefined)).toBe('Imagen por defecto');
    expect(estadoDeLaImagen({ fase: 1, personalizada: true })).toBe('Imagen cambiada');
  });

  it('Guardar solo si hay imagen elegida o el nombre cambió', () => {
    const vigente = { fase: 2, nombre: 'Gorila', personalizada: false };
    expect(hayCambiosParaGuardar(vigente, false, 'Gorila ')).toBe(false);
    expect(hayCambiosParaGuardar(vigente, false, 'Gorila de montaña')).toBe(true);
    expect(hayCambiosParaGuardar(vigente, true, 'Gorila')).toBe(true);
    expect(hayCambiosParaGuardar(undefined, false, '')).toBe(false);
  });
});

describe('ejemploDeLaTarjetaDeFase', () => {
  it('usa un día de la propia fase, con los cortes de la tabla de fases', () => {
    const e = ejemploDeLaTarjetaDeFase(2)!;
    expect(e.diasDeLaFase).toEqual({ dia: 9, total: 27 });
    expect(e.diaDelPrograma).toBe(16);
    expect(ejemploDeLaTarjetaDeFase(9)).toBeNull();
  });
});
