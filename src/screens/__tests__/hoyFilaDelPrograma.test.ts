/**
 * Hoy: la frase del día siempre y el programa propio como una fila compacta justo debajo (2026-11-01, pedido del dueño: «recuerda la frase y
 * abajo va ese de los 90 días con menos texto, el tamaño que antes de coherencia y racha, y luego el fénix… que salga pese que no inició su
 * programa»). La pantalla monta medio app, así que se lee el código fuente sin comentarios y se comprueba cómo está cableado; qué dice cada
 * estado lo prueban `filaDelPrograma`, `filaDelProgramaPropio` y `fraseDelDia`.
 *
 * Contra el código anterior falla: la entrada al programa era la tarjeta grande `EntradaAlProgramaPropio`, DEBAJO del fénix, y con una cuenta sin
 * programa entre «Escuela Renaser» y «Tu acompañante» quedaba un hueco vacío.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const HOY = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/HoyScreen.tsx'), 'utf-8'));
const pos = (texto: string) => HOY.indexOf(texto);

describe('Hoy: el orden de arriba abajo', () => {
  it('frase → fila del programa → tarjeta de acciones → fénix → diagnóstico → hábitos y Radar', () => {
    const orden = ['<TarjetaConfrontacion', '<FilaDelProgramaPropio', '<TarjetaAccionDeHoy', '<OrbeAcompanante', '<TarjetaDelDiagnosticoPendiente', '<TarjetaHabitoYRadar'];
    const posiciones = orden.map(pos);
    expect(posiciones.every(p => p > -1)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  it('la tarjeta grande de antes ya no está (Yo la conserva)', () => {
    expect(HOY).not.toContain('EntradaAlProgramaPropio');
    expect(HOY).not.toContain('InvitacionProgramaPropio');
    expect(HOY).not.toContain('useEsMentor');
    expect(HOY).not.toContain('useCapacidades');
    const YO = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/YoScreen.tsx'), 'utf-8'));
    expect(YO).toContain('<EntradaAlProgramaPropio');
  });
});

describe('Hoy: sin hueco vacío antes del fénix', () => {
  it('el bloque de la fila y la acción solo existe si tiene algo que dibujar', () => {
    expect(HOY).toMatch(/\{programaPropio\.visible \|\| hayTarjetaDeAccion \|\| errorResumen \? \(\s*<Aparicion retardo=\{70\}/);
    expect(HOY).toContain('const hayTarjetaDeAccion = Boolean(vistaDeLaAccion && metaDeLaAccion.lista);');
  });

  it('el hook del programa propio vive en Hoy (para saberlo antes de dibujar) y el pull-to-refresh sigue releyendo las capacidades', () => {
    expect(HOY).toMatch(/const programaPropio = useFilaDelProgramaPropio\(\{\s*inscrito: resumen\?\.inscrito,\s*diaPrograma: resumen\?\.diaPrograma,/);
    expect(HOY).toContain('const { recargarCapacidades } = programaPropio;');
    expect(HOY).toMatch(/recargarCapacidades\(\),/);
  });
});

describe('Hoy: la frase del día sale siempre', () => {
  it('recibe la fecha de hoy, pero solo cuando ya se sabe si hay día de programa (sin parpadeo)', () => {
    expect(HOY).toContain('<TarjetaConfrontacion diaPrograma={diaConocido} fechaDeHoy={fechaDeHoy} />');
    expect(HOY).toContain('const fechaDeHoy = resumen || errorResumen ? fechaLocalISO(new Date()) : null;');
  });
});
