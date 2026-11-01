/**
 * Los paneles de rol viven en Yo, no en Hoy (2026-10-31, pedido del dueño: «debe ir dentro de Administración, lo mismo de cada
 * uno, no en Hoy de cada rol; se ve feo»). Hoy es SOLO el programa propio de la persona: sin el control «Mi programa · Mi grupo ·
 * Mis mentores» de la spec 018, sin tarjetas de rol y sin escuchas de avisos de rol.
 *
 * Hoy y Yo son pantallas con decenas de lecturas y de hooks, y montarlas enteras no probaría nada más que sus dobles. El cableado
 * se prueba sobre el código (sin comentarios), como las demás pruebas de estas pantallas; las reglas (quién ve cada fila, cómo se
 * vuelve, qué hace cada aviso) son funciones puras y se prueban aparte en `features/paneles-de-rol`, y las filas de «Mis mentores»
 * montadas en `features/paneles-de-rol/__tests__`.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');

function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
const leer = (ruta: string) => sinComentarios(fs.readFileSync(path.join(RAIZ, ruta), 'utf-8'));

const HOY = leer('screens/HoyScreen.tsx');
const YO = leer('screens/YoScreen.tsx');
const HOOK = leer('features/paneles-de-rol/hooks/usePanelesDeRol.ts');
const PANTALLA = leer('features/paneles-de-rol/screens/PantallaDelPanelDeRol.tsx');

describe('Hoy: solo el programa propio', () => {
  it('no tiene el control de papel ni nada de la spec 018', () => {
    for (const viejo of [
      'ControlDePapelDeHoy',
      'usePapelDeHoy',
      'papelesDeHoy',
      'papelRecordado',
      'MiGrupoEnHoy',
      'MisMentoresEnHoy',
      'ocultoSiNoEsElPrograma',
      'mostrarPrograma',
      'conControl',
    ]) {
      expect({ viejo, esta: HOY.includes(viejo) }).toEqual({ viejo, esta: false });
    }
  });

  it('no tiene tarjetas ni pantallas de rol: ni «Mi grupo», ni Administración, ni tickets, ni el resumen del líder', () => {
    for (const viejo of [
      'TarjetaMentorHoy',
      'TarjetaAdminHoy',
      'TarjetaBandejaHoy',
      'TarjetaMentoresHoy',
      'TarjetaSemaforoGruposHoy',
      'MiCelulaScreen',
      'AlumnoScreen',
      'AdminScreen',
      'BandejaTicketsScreen',
      'LiderMentoresScreen',
      'AprendicesDelLiderScreen',
      'CumplimientoDelLiderScreen',
      'useCelulaQueAcompano',
      'useResumenPorGrupos',
      'useAprendicesDisponibles',
    ]) {
      expect({ viejo, esta: HOY.includes(viejo) }).toEqual({ viejo, esta: false });
    }
  });

  it('ya no atiende avisos de rol: `abrirCajaAprendizId`, `abrirFichaAprendiz` y las rutas del mentor y del semáforo entran por Yo', () => {
    expect(HOY).not.toMatch(/consumirRutaPendiente|alAbrirAviso|abrirCajaAprendizId|abrirFichaAprendiz/);
  });

  it('sigue ofreciendo «Elegir mi Día 1» a quien no hace su programa (personal sin Día 1)', () => {
    expect(HOY).toContain('EntradaAlProgramaPropio');
  });

  it('el fénix sigue recibiendo el color del semáforo de /home', () => {
    expect(HOY).toContain('usePublicarSemaforoDeHoy(resumen?.semaforo, Boolean(resumen), null);');
  });

  it('la frase del día (con su raya dorada) ya no depende de ningún papel', () => {
    expect(HOY).toContain('<TarjetaConfrontacion diaPrograma={diaConocido} fechaDeHoy={fechaDeHoy} />');
    expect(HOY).not.toMatch(/\{mostrarPrograma \?/);
  });
});

describe('Yo: una fila por panel de rol, junto a Administración', () => {
  it('«Mi grupo» y «Mis mentores» son `FilaDeAjuste` de la misma lista, justo después de Administración y antes de la emergencia', () => {
    expect(YO).toMatch(/\{paneles\.filas\.miGrupo \? \(\s*<FilaDeAjuste\s+key="mi-grupo"\s+icono="users"\s+titulo="Mi grupo"/);
    expect(YO).toMatch(/\{paneles\.filas\.misMentores \? \(\s*<FilaDeAjuste\s+key="mis-mentores"\s+icono="award"\s+titulo="Mis mentores"/);
    const admin = YO.indexOf('setEnAdministracion(true)}');
    const miGrupo = YO.indexOf('titulo="Mi grupo"');
    const misMentores = YO.indexOf('titulo="Mis mentores"');
    const emergencia = YO.indexOf('{miEmergencia.visible &&');
    expect(admin).toBeGreaterThan(-1);
    expect(admin).toBeLessThan(miGrupo);
    expect(miGrupo).toBeLessThan(misMentores);
    expect(misMentores).toBeLessThan(emergencia);
  });

  it('tocar una fila abre el panel: «Mi grupo» → `miGrupo` sin enfocar el semáforo, «Mis mentores» → `misMentores`', () => {
    expect(YO).toContain("onPress={() => paneles.ir({ tipo: 'miGrupo', enfocarSemaforo: false })}");
    expect(YO).toContain("onPress={() => paneles.ir({ tipo: 'misMentores' })}");
  });

  it('el panel abierto es una pantalla completa de Yo, como la Caja y Administración', () => {
    expect(YO).toMatch(/if \(paneles\.abierto\) \{\s*return <PantallaDelPanelDeRol paneles=\{paneles\} \/>;\s*\}/);
  });

  it('Administración se abre por donde diga el aviso: la caja de un aprendiz o la ficha, que Yo consume una vez', () => {
    expect(YO).toMatch(/abrirAdministracionEn\(\{ caja: aprendizId \}\)/);
    expect(YO).toMatch(/abrirAdministracionEn\(\{ ficha: \{ id: persona\.id, fullName: persona\.fullName \} \}\)/);
    expect(YO).toContain("limpiarParametros(['abrirCajaAprendizId', 'abrirFichaAprendiz']);");
    // Si la cuenta no administra, el aviso se descarta: no abre nada.
    expect(YO).toMatch(/limpiarParametros\(\['abrirCajaAprendizId', 'abrirFichaAprendiz'\]\);\s*if \(!capacidades\.administrar\) return;/);
  });

  it('«Ver ficha» desde la info de un chat trae a Yo, no a Hoy', () => {
    expect(leer('screens/ComunidadScreen.tsx')).toContain("irAPestana('Yo', { abrirFichaAprendiz:");
  });
});

describe('el hook de los paneles', () => {
  it('pide solo lo que le toca a la cuenta: el grupo si es mentor o guía, el resumen y «Todos los aprendices» si lidera mentores', () => {
    expect(HOOK).toContain('const celula = useCelulaQueAcompano(esMentor);');
    expect(HOOK).toContain('const semaforoGrupos = useResumenPorGrupos(esLider);');
    expect(HOOK).toContain('const aprendicesDisponibles = useAprendicesDisponibles(esLider && esDisponible(CLAVES.lider));');
  });

  it('«Hábitos de todos» (spec 029) se pregunta solo al líder, con la misma puerta que «Todos los aprendices»', () => {
    expect(HOOK).toContain('const habitosDisponibles = useHabitosDeTodosDisponibles(esLider && esDisponible(CLAVES.lider));');
    // Si la cuenta deja de ser líder, su pantalla no queda abierta.
    expect(HOOK).toContain("'todos', 'habitosDeTodos', 'cumplimiento'");
  });

  it('las filas salen de la regla pura con las entradas de Soporte TI de siempre', () => {
    expect(HOOK).toMatch(
      /filasDeRolEnYo\(\{\s*esMentor,\s*rol: user\?\.role,\s*fallo: celula\.fallo,\s*hayVista: celula\.vista !== null,\s*miGrupoDisponible: esDisponible\(CLAVES\.mentorMiGrupo\),\s*liderDisponible: esDisponible\(CLAVES\.lider\),\s*ticketsDisponible: esDisponible\(CLAVES\.tickets\),\s*semaforoDisponible: esDisponible\(CLAVES\.semaforo\),/,
    );
  });

  it('volver sube un nivel por vez y se queda en Yo cuando no hay más', () => {
    expect(HOOK).toContain('const volver = useCallback(() => setVista(actual => vistaDeRegreso(actual)), []);');
  });

  it('un aviso se toma de los parámetros una sola vez: se limpia la ruta para que volver atrás no lo reabra', () => {
    expect(HOOK).toMatch(/limpiarParametros\(PARAMETROS_DE_AVISO_DE_ROL\);\s*if \(nuevo\) setPendiente\(nuevo\);/);
  });

  it('el resumen general del sábado le abre a Administración su semáforo si la cuenta administra', () => {
    expect(HOOK).toContain("if (que.hacer === 'abrirAdministracion') abrirElSemaforoDeAdministracion();");
  });
});

describe('la pantalla del panel', () => {
  it('«Mi grupo» abre `MiCelulaScreen` con la cabecera «‹ Mi grupo»; «Mis mentores», la suya con «‹ Mis mentores»', () => {
    expect(PANTALLA).toMatch(/<MiCelulaScreen\s+rotuloDeVolver="Mi grupo"/);
    expect(PANTALLA).toMatch(/<MisMentoresEnYo/);
    expect(leer('features/paneles-de-rol/screens/MisMentoresEnYo.tsx')).toContain('titulo="Mis mentores"');
  });

  it('todo lo que cuelga de ellos vuelve con `volver` (un nivel por vez)', () => {
    expect(PANTALLA).toContain('onSalir={volver}');
    expect(PANTALLA).toContain('<AlumnoScreen alumno={vista.alumno} grupoId={celula.vista?.celula.id ?? null} onVolver={volver} />');
    expect(PANTALLA).toContain('<BandejaTicketsScreen onVolver={volver} />');
    expect(PANTALLA).toContain('<LiderMentoresScreen onSalir={volver} />');
    expect(PANTALLA).toContain('<AprendicesDelLiderScreen onSalir={volver} />');
    expect(PANTALLA).toMatch(/<CumplimientoDelLiderScreen[^>]*onSalir=\{volver\}/);
  });

  it('una fila de grupo abre la pantalla del líder DIRECTO en ese grupo', () => {
    expect(PANTALLA).toMatch(/ir\(\{ tipo: 'cumplimiento', grupo: \{ grupoId: grupo\.grupoId, nombre: grupo\.grupoNombre\?\.trim\(\) \|\| 'Grupo sin nombre', inicio \} \}\)/);
    expect(PANTALLA).toContain('grupoInicial={vista.grupo ?? undefined}');
  });

  it('«Todos los aprendices» solo se ofrece con un 200 del servidor (`=== true`: ni pendiente ni caído)', () => {
    expect(PANTALLA).toContain('verTodos={paneles.aprendicesDisponibles === true}');
  });

  it('«Hábitos de todos» (spec 029) solo se ofrece con un 200 del servidor y vuelve a «Mis mentores»', () => {
    expect(PANTALLA).toContain('verHabitos={paneles.habitosDisponibles === true}');
    expect(PANTALLA).toContain("onAbrirHabitos={() => ir({ tipo: 'habitosDeTodos' })}");
    expect(PANTALLA).toContain('<HabitosDeTodosScreen grupos={semaforoGrupos.datos?.grupos ?? []} onSalir={volver} />');
  });

  it('«Mi grupo» y «Mis mentores» mantienen las entradas de Soporte TI de siempre', () => {
    expect(PANTALLA).toContain('verGrupos={esDisponible(CLAVES.semaforo)}');
    expect(PANTALLA).toContain('verConsultas={esDisponible(CLAVES.tickets)}');
    expect(PANTALLA).toContain('verMentores={esDisponible(CLAVES.lider)}');
  });
});

describe('MiCelulaScreen: el rótulo de volver', () => {
  const celula = leer('features/mentor/screens/MiCelulaScreen.tsx');
  it("recibe `rotuloDeVolver` (por defecto «Volver») para decir «Mi grupo» cuando se llega desde Yo", () => {
    expect(celula).toContain("rotuloDeVolver = 'Volver'");
    expect(celula).toContain('{rotuloDeVolver}');
  });
});
