/**
 * Hoy y Plan después de la spec 016 (2026-10-29): «Hábitos de hoy» y el Radar en una sola tarjeta, y «Tus acciones de hoy»
 * por eje en lugar del arco. Se lee el código fuente sin comentarios —estas pantallas montan medio app—; los
 * comportamientos están en las pruebas de cada pieza.
 *
 * Contra el código anterior falla: Hoy dibujaba la tarjeta aparte del Código Renaser antes de las demás y una tarjeta de hábitos
 * propia, y Plan abría con el arco «Día 20 de 90» (`ArcoDelDia`).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const leer = (relativo: string) => sinComentarios(fs.readFileSync(path.join(RAIZ, relativo), 'utf-8'));

describe('Hoy: hábitos y Radar en una tarjeta', () => {
  const HOY = leer('screens/HoyScreen.tsx');

  it('una sola tarjeta con las dos mitades, después de la del diagnóstico pendiente; ya no hay tarjeta aparte del Código Renaser', () => {
    expect(HOY).toMatch(/<TarjetaHabitoYRadar\b/);
    expect(HOY).not.toContain('TarjetaCodigoRenaser');
    expect(HOY.indexOf('<TarjetaHabitoYRadar')).toBeGreaterThan(HOY.indexOf('<TarjetaDelDiagnosticoPendiente'));
    // La tarjeta de hábitos de antes ya no está suelta en la pantalla.
    expect(HOY).not.toMatch(/<MicroLabel>Hábitos de hoy<\/MicroLabel>/);
  });

  it('la mitad de hábitos lleva a Training y la del Radar a Yo → Mi Radar', () => {
    expect(HOY).toMatch(/onAbrirTraining=\{\(\) => \(navigation as any\)\.navigate\('Training'\)\}/);
    expect(HOY).toMatch(/onAbrirMiRadar=\{\(\) => \(navigation as any\)\.navigate\('Yo', \{ abrirMiRadar: true \}\)\}/);
  });

  it('le pasa el día y la inscripción de /home, los mismos que Hoy ya lee', () => {
    expect(HOY).toMatch(/diaPrograma=\{resumen\?\.diaPrograma\}/);
    expect(HOY).toMatch(/inscrito=\{resumen\?\.inscrito\}/);
  });

  it('el formulario de los días 1 a 7 sigue siendo el de RadarContext: Hoy no lo toca', () => {
    const contexto = leer('features/radar/RadarContext.tsx');
    expect(contexto).toContain('abierto');
    expect(HOY).not.toContain('useRadar');
    // La mitad abre ese mismo formulario con `abrir` del contexto; solo desde el día 8 tiene el suyo, que se puede cerrar.
    const hook = leer('features/radar/hooks/useRadarEnHoy.ts');
    expect(hook).toContain('abrirFormularioDeLaSemanaUno: radar.abrir');
    const tarjeta = leer('features/home/components/TarjetaHabitoYRadar.tsx');
    expect(tarjeta).toMatch(/obligatorio=\{false\}/);
  });

  it('las mitades miden 48 o más y responden al dedo con el fondo, sin escalar', () => {
    const tarjeta = leer('features/home/components/TarjetaHabitoYRadar.tsx');
    expect(tarjeta).toMatch(/minHeight: 48/);
    expect(tarjeta).toMatch(/fontScale > 1\.15/);
    expect(tarjeta).not.toContain('Animated');
  });
});

describe('Plan: las acciones de hoy por eje (spec 016) se integraron al formato nuevo de Plan (2026-10-31)', () => {
  const PLAN = leer('screens/PlanScreen.tsx');

  it('ya no está la tarjeta aparte «Tus acciones de hoy · por eje» ni el arco; las acciones del eje salen en «Acciones que mueven la meta»', () => {
    expect(PLAN).not.toContain('ArcoDelDia');
    expect(PLAN).not.toContain('TarjetaAccionesDeHoyPorEje');
    expect(fs.existsSync(path.join(RAIZ, 'features/objetivos/components/TarjetaAccionesDeHoyPorEje.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(RAIZ, 'features/programa/components/ArcoDelDia.tsx'))).toBe(false);
    expect(PLAN).toContain('<PlanDelEje');
  });

  it('Plan solo muestra: tocar una acción de hoy lleva a Training con abrirAccionId (spec 016), y Training lo consume', () => {
    const eje = leer('features/objetivos/components/PlanDelEje.tsx');
    expect(eje).toContain("'Training', { abrirAccionId: accion.id }");
    expect(eje).not.toMatch(/sellarRocaDiaria|completarRegistro|confirmarEvidencia/);
    const training = leer('screens/TrainingScreen.tsx');
    expect(training).toMatch(/abrirAccionId\?: string/);
    expect(training).toMatch(/h\.id === accionPedida && h\.tieneTrackHoy/);
    // E2E del 29/10: al volver a Training se relee de cero y `habits` todavía es la lista vacía en el cuadro en que termina de
    // cargar; con `habits` la acción pedida se descartaba sin abrir. Se busca en lo que trajo `useTraining`.
    expect(training).toMatch(/habitsDelBackend\.some\(h => h\.id === accionPedida/);
    expect(training).not.toMatch(/\bhabits\.some\(h => h\.id === accionPedida/);
    expect(training).toMatch(/habitoAAbrir\(habitoPedido, errorBackend \? \[\] : habitsDelBackend/);
  });
});
