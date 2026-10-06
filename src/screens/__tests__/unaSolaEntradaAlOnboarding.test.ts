import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * «Mi ficha y Pacto» (Yo) y «Mi onboarding» (Ajustes) abrían la misma vista: quedó una sola entrada,
 * la de Ajustes (pedido del dueño del 2026-10-05). Y los rótulos en versales espaciadas que habían
 * quedado en Yo («TU EVOLUCIÓN», «COHERENCIA», «PUNTOS LIGA», «RACHA DÍAS», la fase, «DÍA n DE 90» y
 * los estados de las evidencias) pasaron a tipo oración, en negrita y sin espaciar, como en Hoy.
 *
 * Contra el código anterior falla: la vista principal de Yo tenía la fila `titulo="Mi ficha y Pacto"`
 * con `setActiveView('onboarding')`, y los rótulos estaban escritos en versales con `t.micro`.
 *
 * Se lee el código sin comentarios (como `redisenoDeYo`).
 */
const yo = fs
  .readFileSync(path.resolve(__dirname, '..', 'YoScreen.tsx'), 'utf-8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** El JSX de una vista de Yo: desde `activeView === '<vista>' && (` hasta la siguiente vista. */
function vista(nombre: string): string {
  const desde = yo.indexOf(`activeView === '${nombre}' && (`);
  const hasta = yo.indexOf("activeView === '", desde + 20);
  return yo.slice(desde, hasta === -1 ? undefined : hasta);
}

describe('una sola entrada a «Mi onboarding»', () => {
  it('Yo ya no tiene la fila «Mi ficha y Pacto»', () => {
    expect(yo).not.toContain('Mi ficha y Pacto');
    expect(vista('main')).not.toContain("setActiveView('onboarding')");
  });

  it('se entra solo por Ajustes → Tu proceso → «Mi onboarding»', () => {
    expect(yo.match(/onPress=\{\(\) => setActiveView\('onboarding'\)\}/g)).toHaveLength(1);
    const tuProceso = vista('hub').slice(vista('hub').indexOf('<GrupoDeAjustes titulo="Tu proceso">'));
    expect(tuProceso.slice(0, tuProceso.indexOf('</GrupoDeAjustes>'))).toMatch(
      /titulo="Mi onboarding"\s+detalle="El Pacto y tu Mapa de Renacimiento"\s+onPress=\{\(\) => setActiveView\('onboarding'\)\}/,
    );
  });

  it('y desde ahí se llega a la ficha y al Pacto, y al Mapa', () => {
    const onboarding = vista('onboarding');
    expect(onboarding).toContain("setActiveView('pacto')");
    expect(onboarding).toContain("setActiveView('mapa_renacimiento')");
  });
});

describe('Yo sin versales espaciadas', () => {
  it.each(['TU EVOLUCIÓN', 'COHERENCIA', 'PUNTOS LIGA', 'RACHA DÍAS', 'DÍA {', 'toUpperCase() ??', "'EN REVISIÓN'", "'VERIFICADA'", "'RECHAZADA'"])(
    'ya no dice «%s»',
    viejo => {
      expect(yo).not.toContain(viejo);
    },
  );

  it('los rótulos van en tipo oración, en negrita y sin espaciar (ninguno con `t.micro`)', () => {
    expect(yo).not.toContain('t.micro');
    for (const rotulo of ['Tu evolución', 'Coherencia', 'Puntos de liga', 'Racha']) {
      expect(yo).toMatch(new RegExp(`<Text style=\\{\\[t\\.small, styles\\.rotulo, [^\\]]*\\]\\}>${rotulo}</Text>`));
    }
    expect(yo).toMatch(/rotulo: \{ fontFamily: 'Jost_700Bold', letterSpacing: 0 \}/);
    expect(yo).toContain("Día {resumen?.diaPrograma ?? '—'} de {DIAS_DEL_PROGRAMA}");
    // Cambió el 2026-10-06 (animales por fase): el rótulo de la fase ya no es `rotuloDeFase(...)` suelto,
    // sino «Fase N · nombre» junto al animal, armado con la misma fase del resumen.
    expect(yo).toContain('`Fase ${faseActual.numero} · ${faseActual.nombre}`');
  });

  it('la racha dice «días» como Hoy, y el «%» de coherencia aparece solo con cifra', () => {
    expect(yo).toMatch(/\{resumen\.rachaActual === 1 \? 'día' : 'días'\}/);
    expect(yo).toMatch(/\{resumen\?\.coherencia == null \? null : \(\s*<Text[^>]*>%<\/Text>/);
  });
});
