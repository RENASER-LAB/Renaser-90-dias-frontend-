import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * La pantalla «Bienvenida» (pedido del dueño del 27/09; backend D-210) está enchufada en
 * Administración y se abre desde «Más opciones», sin una sección nueva en la raíz (A-3: sin secciones
 * repetidas). Lee el código fuente: no hay testing-library en el proyecto y montar la pila de
 * Administración entera para esto sería probar React, no la conexión.
 *
 * Falla contra el código anterior: la vista `bienvenida` no existía.
 */

const PANTALLAS = path.resolve(__dirname, '..');
const leer = (archivo: string) => fs.readFileSync(path.join(PANTALLAS, archivo), 'utf8');

describe('la pantalla Bienvenida en Administración', () => {
  it('AdminScreen tiene la vista y la pinta con BienvenidaAdminScreen', () => {
    const admin = leer('AdminScreen.tsx');
    expect(admin).toMatch(/\{\s*nombre:\s*'bienvenida'\s*\}/);
    expect(admin).toMatch(/case 'bienvenida':\s*return <BienvenidaAdminScreen onVolver=\{volver\} \/>/);
    expect(admin).toMatch(/onAbrirBienvenida=\{\(\) => entrar\(\{ nombre: 'bienvenida' \}\)\}/);
  });

  it('Más opciones la ofrece «Desde acá», con su propio botón', () => {
    const mas = leer('MasOpcionesScreen.tsx');
    expect(mas).toMatch(/titulo: 'Bienvenida'/);
    expect(mas).toMatch(/onPress: onAbrirBienvenida/);
  });

  it('la raíz de Administración no suma una sección nueva: solo la nombra en «Más opciones»', () => {
    const inicio = leer('AdminInicioScreen.tsx');
    expect(inicio).not.toMatch(/clave: 'bienvenida'/);
    expect(inicio).toMatch(/titulo: 'Más opciones', detalle: 'Bienvenida,/);
  });

  it('la pantalla vuelve con el gesto del sistema y usa la cabecera de Administración', () => {
    const pantalla = leer('BienvenidaAdminScreen.tsx');
    expect(pantalla).toMatch(/useSystemBackHandler\(/);
    expect(pantalla).toMatch(/<CabeceraAdmin titulo="Bienvenida"/);
  });

  it('la portada se elige con el selector cuadrado de la foto de perfil (sin otro selector)', () => {
    const portada = fs.readFileSync(path.resolve(PANTALLAS, '..', 'components', 'PortadaDeBienvenida.tsx'), 'utf8');
    expect(portada).toMatch(/elegirFotoCuadrada\(\{ lado: LADO_DE_LA_PORTADA/);
    expect(portada).toMatch(/LADO_DE_LA_PORTADA = 1200/);
    expect(portada).not.toMatch(/launchImageLibraryAsync/);
  });
});
