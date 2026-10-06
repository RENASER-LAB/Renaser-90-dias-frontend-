import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * «Imágenes de las fases» (pedido del dueño del 06/10; backend D-258) está enchufada en Administración y
 * se abre desde «Más opciones». Solo llega quien entra a Administración (ADMIN y ALCHEMIST, por
 * `canAdminister`): no hay otra puerta. Lee el código fuente, como `bienvenidaEnAdministracion.test.ts`.
 * Falla contra el código anterior: las vistas no existían.
 */
const PANTALLAS = path.resolve(__dirname, '..');
const leer = (archivo: string) => fs.readFileSync(path.join(PANTALLAS, archivo), 'utf8');

describe('Imágenes de las fases en Administración', () => {
  it('AdminScreen tiene las dos vistas y la pila las pinta', () => {
    const admin = leer('AdminScreen.tsx');
    expect(admin).toMatch(/\{\s*nombre:\s*'animales-fases'\s*\}/);
    expect(admin).toMatch(/\{\s*nombre:\s*'animal-fase';\s*numero:\s*number\s*\}/);
    expect(admin).toMatch(/case 'animales-fases':/);
    expect(admin).toMatch(/<AnimalDeFaseDetalleScreen numero=\{vista\.numero\}/);
    expect(admin).toMatch(/onAbrirImagenesDeFases=\{\(\) => entrar\(\{ nombre: 'animales-fases' \}\)\}/);
  });

  it('Más opciones la ofrece y la raíz no suma una sección', () => {
    expect(leer('MasOpcionesScreen.tsx')).toMatch(/titulo: 'Imágenes de las fases'/);
    expect(leer('AdminInicioScreen.tsx')).not.toMatch(/Imágenes de las fases/);
  });

  it('solo se pide la lectura cuando se abre la pantalla', () => {
    expect(leer('AdminScreen.tsx')).toMatch(/useAnimalesDeFaseAdmin\(vista\.nombre === 'animales-fases'/);
  });

  it('el detalle usa la MISMA tarjeta que Yo, en claro y en oscuro, y el selector sin recorte', () => {
    const detalle = leer('AnimalDeFaseDetalleScreen.tsx');
    expect(detalle).toMatch(/from '\.\.\/\.\.\/yo\/components\/TarjetaDeFase'/);
    expect(detalle).toMatch(/paleta=\{light\}|paleta=\{paleta\}/);
    expect(detalle).toMatch(/<VistaPrevia etiqueta="Claro" paleta=\{light\}/);
    expect(detalle).toMatch(/<VistaPrevia etiqueta="Oscuro" paleta=\{dark\}/);
    expect(detalle).toMatch(/Restaurar la imagen por defecto/);
    expect(detalle).toMatch(/ConfirmacionEnLinea/);
    expect(leer('../utils/elegirImagenDeAnimal.ts')).toMatch(/allowsEditing: false/);
  });

  it('Yo usa la tarjeta y ya no la fila de cuatro fases', () => {
    const yo = fs.readFileSync(path.resolve(PANTALLAS, '../../../screens/YoScreen.tsx'), 'utf8');
    expect(yo).toMatch(/<TarjetaDeFase/);
    expect(yo).not.toMatch(/FilaDeFases|EmblemaDeFase/);
  });
});
