/**
 * Hoy de quien tiene más de un papel (spec 018): cómo queda cableado en `HoyScreen`.
 *
 * Hoy es una pantalla con decenas de lecturas y de hooks, y montarla entera no probaría nada más que sus dobles. Lo que
 * importa de su cableado se prueba sobre el código (sin comentarios), como las demás pruebas de Hoy: quién ve el control
 * (la regla pura vive en `papelesDeHoy` y se prueba aparte), que lo del programa propio no se pierde al cambiar de papel,
 * y que las tres tarjetas sueltas del líder ya no están. Las filas de «Mi grupo» y «Mis mentores» se prueban montadas en
 * `features/hoy-por-papel/__tests__`.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');

function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const HOY = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/HoyScreen.tsx'), 'utf-8'));

describe('Hoy por papel: el cableado', () => {
  it('el control existe solo para quien lidera mentores: los papeles salen de `papelesDeHoy` con `esLider`', () => {
    expect(HOY).toMatch(/const papeles = papelesDeHoy\(\{\s*esLider,/);
    expect(HOY).toContain('const { papel: papelLeido, recordado, elegir: elegirPapel } = usePapelDeHoy(user?.id, papeles);');
    expect(HOY).toContain('const conControl = papeles.length > 0;');
  });

  it('«Mi grupo» solo se ofrece si el servidor ya dijo que acompaña un grupo (o falló al decirlo), y con la entrada prendida', () => {
    expect(HOY).toMatch(
      /const tieneGrupoParaElControl =\s*entradaAlGrupoVisible\(\{ esMentor, rol: user\?\.role, fallo: celula\.fallo \}\) &&\s*esDisponible\(CLAVES\.mentorMiGrupo\) &&\s*\(celula\.vista !== null \|\| celula\.fallo !== null\);/,
    );
  });

  it('«Mis mentores» se ofrece con cualquiera de sus tres entradas prendidas (resultado por grupo, consultas, padrón)', () => {
    expect(HOY).toContain(
      'tieneMentores: esDisponible(CLAVES.lider) || esDisponible(CLAVES.tickets) || esDisponible(CLAVES.semaforo)',
    );
  });

  it('quien se quedó en «Mi grupo» espera a que el servidor diga si acompaña uno, en vez de saltar de «Mi programa» al grupo', () => {
    expect(HOY).toMatch(
      /const esperandoAlGrupo =\s*conControl && recordado === 'grupo' && !papeles\.includes\('grupo'\) && celula\.cargando && celula\.vista === null;/,
    );
    expect(HOY).toContain('const papel = esperandoAlGrupo ? null : papelLeido;');
  });

  it('el control se dibuja solo con control y con el papel ya leído, y cambia con `elegirPapel`', () => {
    expect(HOY).toMatch(
      /\{conControl && papel !== null \? \(\s*<View style=\{styles\.controlDePapel\}>\s*<ControlDePapelDeHoy papeles=\{papeles\} valor=\{papel\} onCambiar=\{elegirPapel\} \/>/,
    );
  });

  it('sin control, Hoy es el de siempre: el programa se ve cuando no hay control o cuando el papel es «programa»', () => {
    expect(HOY).toContain("const mostrarPrograma = !conControl || papel === 'programa';");
  });

  it('lo del programa propio se OCULTA pero queda montado (volver es instantáneo y no pierde la conversación del orbe)', () => {
    expect(HOY).toContain('const ocultoSiNoEsElPrograma = mostrarPrograma ? null : styles.oculto;');
    expect(HOY).toMatch(/oculto: \{ display: 'none' \}/);
    // Las métricas, el orbe y las tarjetas del programa.
    expect(HOY.match(/style=\{ocultoSiNoEsElPrograma\}/g)).toHaveLength(2);
    expect(HOY).toContain('<View style={[{ gap: space.gap }, ocultoSiNoEsElPrograma]}>');
    // La frase del día es del programa.
    expect(HOY).toContain('{mostrarPrograma ? <TarjetaConfrontacion diaPrograma={diaConocido} /> : null}');
  });

  it('cada papel pone su lista: «Mi grupo» con `papel === grupo` y «Mis mentores» solo para el líder', () => {
    expect(HOY).toContain("{papel === 'grupo' ? (");
    expect(HOY).toContain('<MiGrupoEnHoy');
    expect(HOY).toContain("{papel === 'mentores' && esLider ? (");
    expect(HOY).toContain('<MisMentoresEnHoy');
  });

  it('con control, el grupo del líder es «Mi grupo» y no además la tarjeta de siempre', () => {
    expect(HOY).toMatch(
      /\{!conControl && entradaAlGrupoVisible\(\{ esMentor, rol: user\?\.role, fallo: celula\.fallo \}\) && esDisponible\(CLAVES\.mentorMiGrupo\) \? \(\s*<TarjetaMentorHoy/,
    );
  });

  it('las tres tarjetas sueltas del líder se fueron: sus pantallas se abren desde las filas de «Mis mentores»', () => {
    for (const vieja of ['TarjetaBandejaHoy', 'TarjetaMentoresHoy', 'TarjetaSemaforoGruposHoy']) {
      expect(HOY).not.toContain(vieja);
      expect(fs.existsSync(path.join(RAIZ, 'features', vieja === 'TarjetaBandejaHoy' ? 'tickets' : vieja === 'TarjetaMentoresHoy' ? 'lider-mentores' : 'semaforo', 'components', `${vieja}.tsx`))).toBe(false);
    }
    expect(HOY).toContain('onAbrirConsultas={() => setEnBandejaTickets(true)}');
    expect(HOY).toContain('onAbrirMentores={() => setEnMisMentores(true)}');
  });

  it('una fila de grupo abre la pantalla del líder DIRECTO en ese grupo; el aviso del sábado sigue abriendo el resumen', () => {
    expect(HOY).toMatch(/setGrupoDeLaFila\(\{ grupoId: grupo\.grupoId, nombre: grupo\.grupoNombre\?\.trim\(\) \|\| 'Grupo sin nombre', inicio \}\);\s*setEnSemaforoGrupos\(true\);/);
    expect(HOY).toContain('grupoInicial={grupoDeLaFila ?? undefined}');
    // El aviso `/semaforo/grupos` no fija ningún grupo: abre el resumen de siempre.
    expect(HOY).toMatch(/if \(quien === 'lider'\) \{\s*setEnBandejaTickets\(false\);\s*setEnSemaforoGrupos\(true\);\s*\}/);
  });

  it('la ficha abierta desde «Mi grupo» vuelve a Hoy; la de la pantalla del grupo o la de un aviso, a esa pantalla', () => {
    expect(HOY).toContain("setVistaMentor(alumnoVieneDeHoy ? 'ninguna' : 'celula');");
    expect(HOY).toMatch(/setAlumnoVieneDeHoy\(true\);\s*setVistaMentor\('alumno'\);/);
    expect(HOY).toMatch(/setAlumnoVieneDeHoy\(false\);\s*setVistaMentor\('alumno'\);/);
  });

  it('deslizar para recargar relee la lista que está a la vista', () => {
    expect(HOY).toContain("if (papel === 'grupo') recargarGrupo();");
    expect(HOY).toContain("if (papel === 'mentores') releerGruposDelLider();");
  });
});
