import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import type { LecturaDeMiRadar } from '../hooks/useConfigDeMiRadar';
import { mitadDelRadar, type EntradaDeLaMitad } from '../utils/mitadDelRadar';
import { miRadarConHoras, miRadarDePrueba } from './fixturasDeMiRadar';

/**
 * Mi Radar —y su mitad en Hoy— es para TODOS los roles que hacen los 90 días: aprendiz, guía de aprendiz, mentor, líder de
 * mentores, admin y alquimista con su programa propio (decisión del dueño, spec 019). Lo único que depende del rol es
 * `rolesObligados` (los días 1 a 7: el formulario que no se cierra), y eso no cambia.
 *
 * Esta prueba lo deja fijado de dos maneras: la mitad de Hoy desde el día 8 dice lo mismo sea cual sea el rol (el rol solo
 * llega como `obligatorio`, que desde el día 8 no cuenta), y ninguna pieza nueva de la 019 nombra un rol en su código.
 */

const lista = (config: ReturnType<typeof miRadarDePrueba>): LecturaDeMiRadar => ({ estado: 'lista', config });
const entrada = (obligatorio: boolean, miRadar: LecturaDeMiRadar): EntradaDeLaMitad => ({
  diaPrograma: 10,
  inscrito: true,
  estadoDelDia: { tipo: 'apagado', motivo: 'etapa-terminada' },
  obligatorio,
  minutosParaAbrir: 0,
  miRadar,
  registros: [],
  ahora: new Date(2026, 9, 29, 15, 30),
});

describe('la mitad del Radar de Hoy, desde el día 8, no depende del rol', () => {
  const casos: Array<[string, LecturaDeMiRadar]> = [
    ['apagado', lista(miRadarConHoras([], false))],
    ['encendido', lista(miRadarDePrueba(true))],
    ['hoy sin Radar', lista(miRadarDePrueba(true, { 4: { despertar: null } }))],
    ['una hora de Mi Radar pendiente', lista(miRadarConHoras([15]))],
  ];

  it.each(casos)('%s: igual para el que no puede cerrar el formulario (aprendiz) y para el resto de los roles', (_nombre, lectura) => {
    const comoAprendiz = mitadDelRadar(entrada(true, lectura));
    const comoPersonal = mitadDelRadar(entrada(false, lectura));
    expect(comoPersonal).not.toBeNull();
    expect(comoAprendiz).toEqual(comoPersonal);
  });
});

describe('ninguna pieza de la spec 019 nombra un rol', () => {
  const RAIZ = path.resolve(__dirname, '..');
  const ARCHIVOS = [
    'screens/MiRadarScreen.tsx',
    'components/FilaDeVecesPorDia.tsx',
    'components/HoraDeMiRadar.tsx',
    'components/VecesAlDia.tsx',
    'components/SinMiRadar.tsx',
    'utils/vecesDeMiRadar.ts',
    'utils/vistaDeMiRadar.ts',
    'utils/miRadarEnYo.ts',
    'utils/miRadar.ts',
    'utils/mitadDelRadar.ts',
    'hooks/useConfigDeMiRadar.ts',
    'hooks/useMiRadar.ts',
    'notificaciones/recordatoriosDeRadar.ts',
    'api/radarApi.ts',
    'api/radarSchemas.ts',
  ];
  /** El código sin comentarios ni cadenas: lo que decide algo. */
  const codigo = (archivo: string) =>
    fs
      .readFileSync(path.join(RAIZ, archivo), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

  it.each(ARCHIVOS)('%s no filtra por rol', archivo => {
    // `rol="radio"` es el rol de accesibilidad del control segmentado, no un rol de usuario.
    expect(codigo(archivo).replace(/\brol="radio"/g, '')).not.toMatch(/\b(role|rol|rolObligadoAlRadar|rolesObligados|TRAINEE|APRENDIZ|MENTOR|ADMIN|ALCHEMIST|ALQUIMISTA|LIDER)\b/);
  });

  it('la fila de Yo y la tarjeta de Hoy dependen del día y de lo que respondió el servidor, no del rol', () => {
    const yo = fs.readFileSync(path.resolve(RAIZ, '../../screens/YoScreen.tsx'), 'utf8');
    // La decisión de la fila vive en `utils/miRadarEnYo` (que se barre arriba en busca de roles): Yo solo la aplica, sin mirar `user.role`.
    expect(yo).toMatch(/const veMiRadar = veLaFilaDeMiRadar\(lecturaDeMiRadar\.lectura, diaDelPrograma\);/);
    expect(yo).toMatch(/hayQueAveriguarMiRadar\(\{ puedeIniciarPrograma: capacidades\.puedeIniciarPrograma, diaUnoSinElegir \}\)/);
    const tarjeta = fs
      .readFileSync(path.resolve(RAIZ, '../home/components/TarjetaHabitoYRadar.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(tarjeta).not.toMatch(/\b(role|rolesObligados|TRAINEE|MENTOR|ADMIN|ALCHEMIST)\b/);
  });
});
