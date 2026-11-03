import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

/**
 * «Tu 80/20» en las tres fichas de quien acompaña (spec 031, 031-2 A): cada una monta la sección DESPUÉS de «Cierres del día», con una
 * función de carga estable por persona (un `useMemo`) y por SU puerta —la del mentor, la del liderazgo con grupo o sin él—. Nada para la
 * propia persona fuera de Plan. Las rutas y el comportamiento de la sección se prueban aparte (`ochentaVeinteApi`, `ochentaVeinteDeLaFicha`).
 */

const RAIZ = path.resolve(__dirname, '../../..');
const leer = (relativa: string) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');

const FICHAS: ReadonlyArray<{ nombre: string; archivo: string; api: string }> = [
  { nombre: 'mentor o guía (AlumnoScreen)', archivo: 'features/mentor/screens/AlumnoScreen.tsx', api: 'obtenerOchentaVeinteDeUnAlumno(' },
  { nombre: 'líder (PersonaDelLiderScreen)', archivo: 'features/lider-mentores/screens/PersonaDelLiderScreen.tsx', api: 'obtenerOchentaVeinteDeUnaPersona(' },
  { nombre: 'Administración y Alquimista (FichaAprendizScreen)', archivo: 'features/admin/screens/FichaAprendizScreen.tsx', api: 'obtenerOchentaVeinteDeUnaPersona(' },
];

describe.each(FICHAS)('la ficha de $nombre', ({ archivo, api }) => {
  const fuente = leer(archivo);

  it('monta «Tu 80/20» debajo de «Cierres del día»', () => {
    const cierres = fuente.indexOf('<CierresDelDia');
    const ochentaVeinte = fuente.indexOf('<OchentaVeinteDeLaFicha');
    expect(cierres).toBeGreaterThan(-1);
    expect(ochentaVeinte).toBeGreaterThan(cierres);
  });

  it('lee por su puerta, con una función estable por persona', () => {
    expect(fuente).toContain(api);
    expect(fuente).toMatch(/const cargarOchentaVeinte = useMemo</);
  });
});

describe('la propia persona', () => {
  it('lo ve en Plan y no en Yo, Hoy, Training ni Comunidad', () => {
    for (const archivo of ['screens/YoScreen.tsx', 'screens/HoyScreen.tsx', 'screens/TrainingScreen.tsx', 'screens/ComunidadScreen.tsx']) {
      const ruta = path.join(RAIZ, archivo);
      if (!fs.existsSync(ruta)) continue;
      expect(fs.readFileSync(ruta, 'utf8')).not.toContain('OchentaVeinteDeLaFicha');
    }
  });

  it('el nombre de la sección no sale a ningún registro: el texto de la IA es de datos personales', () => {
    const carpeta = path.join(RAIZ, 'features/ochenta-veinte');
    const archivos: string[] = [];
    const recorrer = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === '__tests__') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) recorrer(p);
        else archivos.push(p);
      }
    };
    recorrer(carpeta);
    for (const archivo of archivos) {
      expect(fs.readFileSync(archivo, 'utf8')).not.toMatch(/console\.(log|warn|error|info|debug)/);
    }
  });
});
