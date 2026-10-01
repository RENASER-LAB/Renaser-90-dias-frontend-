import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * «Guías del grupo inicial» (pedido del dueño del 2026-10-01, backend D-242): el guía no es un rol,
 * así que se asigna en su propia pantalla y «Equipo y roles» lo dice con un acceso directo. Lee el
 * código fuente, como `bienvenidaEnAdministracion.test.ts`.
 *
 * Falla contra el código anterior: no existía la vista `guias` ni el aviso en «Equipo y roles».
 */
const PANTALLAS = path.resolve(__dirname, '..');
const leer = (archivo: string) => fs.readFileSync(path.join(PANTALLAS, archivo), 'utf8');

describe('Guías del grupo inicial en Administración', () => {
  it('AdminScreen tiene la vista y se entra desde Más opciones y desde Equipo y roles', () => {
    const admin = leer('AdminScreen.tsx');
    expect(admin).toMatch(/\{\s*nombre:\s*'guias'\s*\}/);
    expect(admin).toMatch(/case 'guias':\s*return <GuiasRecepcionScreen onVolver=\{volver\} \/>/);
    expect(admin).toMatch(/onAbrirGuias=\{\(\) => entrar\(\{ nombre: 'guias' \}\)\}/g);
    expect(admin.match(/onAbrirGuias=\{\(\) => entrar\(\{ nombre: 'guias' \}\)\}/g)).toHaveLength(2);
  });

  it('Más opciones la ofrece «Desde acá»', () => {
    const mas = leer('MasOpcionesScreen.tsx');
    expect(mas).toMatch(/titulo: 'Guías del grupo inicial'/);
    expect(mas).toMatch(/onPress: onAbrirGuias/);
  });

  it('Equipo y roles aclara que no es un rol y lleva directo', () => {
    const staff = leer('StaffRolesScreen.tsx');
    expect(staff).toMatch(/Guía del grupo inicial no es un rol: se asigna en Administración → Guías del grupo inicial\./);
    expect(staff).toMatch(/onPress=\{onAbrirGuias\}/);
  });

  it('la pantalla lee con el GET, guarda con el PUT de reemplazo y vuelve con el gesto', () => {
    const pantalla = leer('GuiasRecepcionScreen.tsx');
    expect(pantalla).toMatch(/obtenerGuiasDeRecepcion\(/);
    expect(pantalla).toMatch(/reemplazarGuiasDeRecepcion\(cohorteId, grupoId, ids\)/);
    expect(pantalla).toMatch(/useSystemBackHandler\(/);
    expect(pantalla).toMatch(/<CabeceraAdmin titulo="Guías del grupo inicial"/);
  });
});
