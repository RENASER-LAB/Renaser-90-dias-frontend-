import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * «Fichas» (spec 026) está enchufada en Administración y se abre desde «Más opciones». Lee el código fuente, como las de Bienvenida,
 * Imágenes de las fases y Hábitos del programa. Además vigila las reglas de lectura de toda la carpeta: letra de 16 o más, tuteo de Perú y
 * ningún emoji como ícono.
 */
const RAIZ = path.resolve(__dirname, '..', '..');
const leer = (ruta: string) => fs.readFileSync(path.join(RAIZ, ruta), 'utf8');

function archivos(carpeta: string): string[] {
  const salida: string[] = [];
  for (const e of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__') salida.push(...archivos(ruta));
    } else if (/\.tsx?$/.test(e.name)) {
      salida.push(ruta);
    }
  }
  return salida;
}

const MIS_ARCHIVOS = archivos(path.join(RAIZ, 'diagnostico-admin'));

describe('Fichas en Administración', () => {
  it('AdminScreen tiene la vista y Más opciones la abre', () => {
    const admin = leer('admin/screens/AdminScreen.tsx');
    expect(admin).toMatch(/\{\s*nombre:\s*'fichas'\s*\}/);
    expect(admin).toMatch(/<FichasAdminScreen onBack=\{volver\} \/>/);
    expect(admin).toMatch(/onAbrirFichas=\{\(\) => entrar\(\{ nombre: 'fichas' \}\)\}/);
  });

  it('Más opciones la ofrece con la disponibilidad de las personas (Soporte TI)', () => {
    const mas = leer('admin/screens/MasOpcionesScreen.tsx');
    expect(mas).toMatch(/titulo: 'Fichas'/);
    expect(mas).toMatch(/onPress: onAbrirFichas,\s*clave: CLAVES\.adminPersonas/);
    expect(leer('admin/screens/AdminInicioScreen.tsx')).not.toMatch(/titulo: 'Fichas'/);
  });

  it('la ficha de la persona en Administración muestra su ficha de ingreso, debajo de la formación', () => {
    const ficha = leer('admin/screens/FichaAprendizScreen.tsx');
    expect(ficha).toMatch(/<FichaDeIngresoDeLaPersona personaId=\{aprendiz\.id\} nombre=\{nombre\} alCambiar=\{setAvisoFinal\} \/>/);
    expect(ficha.indexOf('<FormacionDeLaPersona')).toBeLessThan(ficha.indexOf('<FichaDeIngresoDeLaPersona'));
  });

  it('las pantallas atienden el gesto atrás del sistema, una por nivel', () => {
    expect(leer('diagnostico-admin/screens/FichasAdminScreen.tsx')).toMatch(/useSystemBackHandler\(alVolver, vista === 'lista'\)/);
    expect(leer('diagnostico-admin/screens/DiagnosticoEditorScreen.tsx')).toMatch(/useSystemBackHandler/);
    expect(leer('diagnostico-admin/screens/AsignarDiagnosticoVariasScreen.tsx')).toMatch(/useSystemBackHandler/);
  });

  it('la carpeta revisa que hay archivos de verdad', () => {
    expect(MIS_ARCHIVOS.length).toBeGreaterThan(10);
  });

  it('ninguna letra de menos de 16 px', () => {
    const malos: string[] = [];
    for (const archivo of MIS_ARCHIVOS.filter(a => a.endsWith('.tsx'))) {
      const texto = fs.readFileSync(archivo, 'utf8');
      for (const m of texto.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)) {
        if (Number(m[1]) < 16) malos.push(`${path.relative(RAIZ, archivo)}: fontSize ${m[1]}`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('los estilos chicos del tema siempre pisan el tamaño (t.body mide 15, t.small 13)', () => {
    const malos: string[] = [];
    for (const archivo of MIS_ARCHIVOS.filter(a => a.endsWith('.tsx'))) {
      const texto = fs.readFileSync(archivo, 'utf8');
      for (const m of texto.matchAll(/\bt\.(micro|small|body|tab|sectionTitle|sectionSub)\b/g)) {
        const desde = m.index ?? 0;
        const cierre = texto.indexOf(']', desde);
        const tramo = cierre === -1 ? '' : texto.slice(desde, cierre);
        if (!/fontSize\s*:/.test(tramo)) malos.push(`${path.relative(RAIZ, archivo)}: t.${m[1]} sin fontSize`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('tuteo de Perú: ningún voseo en los textos', () => {
    const voseo = /\b(podés|tenés|querés|elegí|escribí|marcá|tocá|apretá|ponele|decime|fijate|mirá|hacé|sabés)\b/i;
    const malos = MIS_ARCHIVOS.filter(a => voseo.test(fs.readFileSync(a, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
    expect(malos.map(a => path.relative(RAIZ, a))).toEqual([]);
  });

  it('no usa emojis como íconos ni el MicroLabel en mayúsculas', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    const malos = MIS_ARCHIVOS.filter(a => {
      const sinComentarios = fs.readFileSync(a, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      // «✓» (U+2713) del chip marcado es texto, no un emoji: se permite.
      return emoji.test(sinComentarios.replace(/[✓✕−]/g, '')) || /MicroLabel/.test(sinComentarios);
    });
    expect(malos.map(a => path.relative(RAIZ, a))).toEqual([]);
  });

  it('el nombre de una fuente no se escribe fuera de theme/fuentes', () => {
    const malos = MIS_ARCHIVOS.filter(a => /Inter_\d|fontFamily:\s*['"`]/.test(fs.readFileSync(a, 'utf8')));
    expect(malos).toEqual([]);
  });
});
