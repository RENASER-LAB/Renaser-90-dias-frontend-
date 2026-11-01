/**
 * Hoy sin el Mapa y con el diagnóstico (spec 026). La pantalla monta medio app (voz, semáforo, navegación), así que se lee el
 * código fuente sin comentarios y se comprueba cómo está cableado; qué dice cada estado de la tarjeta de acciones lo prueban
 * `vistaDeLaAccionDeHoy` y `tarjetaAccionDeHoy`, y el hook de los objetivos `useObjetivosDeNoventaDias`.
 *
 * Contra el código anterior falla: Hoy dibujaba «Mapa de renacimiento» (con `abrirMapa`) y la tarjeta de acciones decía
 * «Haz tu Mapa de Renacimiento» sin acciones.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const HOY = sinComentarios(fs.readFileSync(path.join(RAIZ, 'screens/HoyScreen.tsx'), 'utf-8'));

describe('Hoy ya no tiene nada del Mapa', () => {
  it('ni el contexto, ni su estado, ni su tarjeta, ni su texto', () => {
    expect(HOY).not.toMatch(/mapa-renacimiento|useMapaRenacimientoAbierto|useLecturaDelEstadoDelMapa|mapaHabilitado|abrirMapa/);
    expect(HOY).not.toMatch(/mostrarTarjetaDelMapa|tituloMapa|detalleMapa|MAPA_DIA7_HABILITADO/);
    expect(HOY).not.toContain('Mapa de renacimiento');
    expect(HOY).not.toContain('de este Mapa nacen tus objetivos');
  });
});

describe('Hoy: la tarjeta de acciones y los objetivos', () => {
  it('lee los objetivos de 90 días una vez por foco y se los pasa a `vistaDeLaAccionDeHoy`', () => {
    expect(HOY).toMatch(/const \{ objetivos: objetivosDeNoventaDias, recargar: recargarObjetivos \} = useObjetivosDeNoventaDias\(\);/);
    expect(HOY).toMatch(/vistaDeLaAccionDeHoy\(\{\s*rocas: accionesDeHoy,\s*objetivos: objetivosDeNoventaDias,/);
  });

  it('«Escribir mi objetivo» y «Confirmar» llevan a Plan; «Agendar en Plan» también', () => {
    expect(HOY).toMatch(/alIrAPlan=\{\(\) => \(navigation as any\)\.navigate\('Plan'\)\}/);
    expect(HOY).toMatch(/alAgendar=\{\(\) => \(navigation as any\)\.navigate\('Plan'\)\}/);
  });

  it('deslizar para recargar también relee los objetivos', () => {
    expect(HOY).toMatch(/recargarAcciones\(\),\s*recargarObjetivos\(\),/);
  });
});

describe('Hoy: el diagnóstico pendiente', () => {
  it('su tarjeta va debajo del programa propio y antes de «Hábitos de hoy» y el Radar, y al tocarla abre el recorrido', () => {
    expect(HOY).toMatch(/<TarjetaDelDiagnosticoPendiente alAbrir=\{\(\) => setDiagnosticoAbierto\(true\)\} \/>/);
    expect(HOY.indexOf('<TarjetaDelDiagnosticoPendiente')).toBeGreaterThan(HOY.indexOf('<EntradaAlProgramaPropio'));
    expect(HOY.indexOf('<TarjetaDelDiagnosticoPendiente')).toBeLessThan(HOY.indexOf('<TarjetaHabitoYRadar'));
  });

  it('abierto, el recorrido reemplaza a Hoy como un estado más (después de todos los hooks), sin dejar dos scrolls', () => {
    const inicio = HOY.indexOf('if (diagnosticoAbierto) {');
    expect(inicio).toBeGreaterThan(HOY.indexOf('const tocarOrbe'));
    expect(inicio).toBeLessThan(HOY.indexOf('<ScreenHeader title="HOY" />'));
    const bloque = HOY.slice(inicio, HOY.indexOf('return (\n    <SafeAreaView', inicio));
    expect(bloque).toMatch(/<CompletarDiagnosticoScreen/);
    expect(bloque).toMatch(/onBack=\{\(\) => setDiagnosticoAbierto\(false\)\}/);
    expect(bloque).not.toContain('<ScrollView');
  });

  it('al terminar, Hoy cierra el recorrido y relee el resumen, las acciones y los objetivos (que nacieron del diagnóstico)', () => {
    const bloque = HOY.slice(HOY.indexOf('onTerminado={() => {'), HOY.indexOf('/>', HOY.indexOf('onTerminado={() => {')));
    expect(bloque).toContain('setDiagnosticoAbierto(false);');
    for (const relectura of ['recargarResumen()', 'recargarAcciones()', 'recargarObjetivos()']) expect(bloque).toContain(relectura);
  });

  it('el estado de Hoy no registra un atrás propio que se adelante al de los pasos del recorrido', () => {
    expect(HOY).not.toMatch(/useSystemBackHandler\([^)]*diagnostico/i);
  });
});
