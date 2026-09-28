import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Dónde está enchufada la Caja Renaser (D-219): Administración → «Caja Renaser», el chip en las dos
 * fichas, la fila de Yo y la apertura desde el aviso del Admin en Hoy. Lee el código fuente, como
 * `bienvenidaEnAdministracion.test.ts`: montar la pila entera sería probar React, no la conexión.
 *
 * Falla contra el código anterior: nada de esto existía.
 */

const SRC = path.resolve(__dirname, '..', '..', '..', '..');
const leer = (relativo: string) => fs.readFileSync(path.join(SRC, relativo), 'utf8');

describe('la Caja Renaser en la app', () => {
  it('Administración la ofrece en «Más» y apila lista → detalle → contenido', () => {
    expect(leer('features/admin/screens/AdminInicioScreen.tsx')).toMatch(/clave: 'caja', titulo: 'Caja Renaser'/);
    const admin = leer('features/admin/screens/AdminScreen.tsx');
    expect(admin).toMatch(/case 'caja':\s*return \(\s*<CajaListaScreen/);
    expect(admin).toMatch(/case 'caja-detalle':/);
    expect(admin).toMatch(/case 'caja-contenido':/);
    expect(admin).toMatch(/else if \(seccion === 'caja'\) entrar\(\{ nombre: 'caja' \}\)/);
  });

  it('el chip está en la ficha del Admin (abre la caja) y en la del mentor (solo muestra)', () => {
    const ficha = leer('features/admin/screens/FichaAprendizScreen.tsx');
    expect(ficha).toMatch(/<ChipDeCaja\s+origen=\{\{ quien: 'admin'/);
    expect(ficha).toMatch(/onAbrirCaja\(aprendiz\.id\)/);
    const alumno = leer('features/mentor/screens/AlumnoScreen.tsx');
    expect(alumno).toMatch(/<ChipDeCaja origen=\{\{ quien: 'mentor', aprendizId: alumno\.participanteId \}\}/);
  });

  it('Yo muestra la fila solo si hay algo que mostrar, y abre la caja desde el aviso', () => {
    const yo = leer('screens/YoScreen.tsx');
    expect(yo).toMatch(/miCaja\.visible && miCaja\.caja \? \(/);
    expect(yo).toMatch(/<MicroLabel>Tu Caja Renaser<\/MicroLabel>/);
    expect(yo).toMatch(/params\?\.abrirCaja/);
    expect(yo).toMatch(/<MiCajaScreen caja=\{miCaja\.caja\}/);
  });

  it('Hoy abre Administración en la caja del aviso solo si la cuenta administra', () => {
    const hoy = leer('screens/HoyScreen.tsx');
    expect(hoy).toMatch(/abrirCajaAprendizId/);
    expect(hoy).toMatch(/if \(!capacidades\.administrar\) return;\s*setEnSemaforo\(false\);\s*setAdminAbreEn\(\{ caja: aprendizId \}\)/);
  });
});
