/**
 * Yo sin el Mapa y con «Mi diagnóstico» (spec 026). La pantalla monta medio app, así que se lee el código fuente sin comentarios
 * y se comprueba cómo está cableado; qué dice la fila lo prueba `filaDeMiDiagnostico`.
 *
 * Contra el código anterior falla: «Mi onboarding» tenía la segunda etapa «Mapa de Renacimiento» (con `MapaRenacimientoFlow`) y no
 * había fila del diagnóstico.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const YO = sinComentarios(fs.readFileSync(path.join(__dirname, '..', 'YoScreen.tsx'), 'utf-8'));

describe('Yo ya no tiene el Mapa', () => {
  it('ni su flujo, ni su vista, ni su etapa, ni su estado', () => {
    expect(YO).not.toMatch(/mapa-renacimiento|MapaRenacimientoFlow|mapa_renacimiento|mapaRenacimiento/);
    expect(YO).not.toContain('Mapa de Renacimiento');
    expect(YO).not.toContain("id: 'st2'");
  });

  it('el atrás del sistema de las sub-vistas no excluye una vista del Mapa', () => {
    expect(YO).toMatch(/\}, activeView !== 'main'\);/);
  });

  it('«Mi onboarding» deja una sola etapa y concuerda el plural', () => {
    expect(YO).toContain("{ONBOARDING_STAGES.length === 1 ? 'etapa completada' : 'etapas completadas'}");
  });
});

describe('Yo: la fila «Mi diagnóstico»', () => {
  it('sale de `useEstadoDeMiDiagnostico` y de `filaDeMiDiagnostico`, con la forma de las filas vecinas y su ícono', () => {
    expect(YO).toMatch(/const miDiagnostico = useEstadoDeMiDiagnostico\(\);/);
    expect(YO).toMatch(/const filaDelDiagnostico = filaDeMiDiagnostico\(miDiagnostico\.estado\);/);
    expect(YO).toMatch(/\{filaDelDiagnostico \? \(\s*<FilaDeAjuste\s+key="mi-diagnostico"\s+icono="fileText"/);
  });

  it('va en la lista de Yo, junto a «Tuve una emergencia» y «Mi Radar», no en Ajustes', () => {
    const fila = YO.indexOf('key="mi-diagnostico"');
    expect(fila).toBeGreaterThan(YO.indexOf('key="emergencia"'));
    expect(fila).toBeLessThan(YO.indexOf('key="mi-radar"'));
  });

  it('completado abre su lectura y en curso o pendiente abre el recorrido, ambos a pantalla completa con su «volver»', () => {
    expect(YO).toMatch(/onPress=\{\(\) => setEnDiagnostico\(filaDelDiagnostico\.pantalla\)\}/);
    expect(YO).toMatch(/if \(enDiagnostico === 'ver'\) \{\s*return <MiDiagnosticoScreen onBack=\{\(\) => setEnDiagnostico\(null\)\} \/>;/);
    expect(YO).toMatch(/if \(enDiagnostico === 'completar'\) \{\s*return \(\s*<CompletarDiagnosticoScreen\s+onBack=\{\(\) => setEnDiagnostico\(null\)\}/);
  });

  it('al terminar el recorrido vuelve a Yo y relee el estado de la fila y el resumen', () => {
    const bloque = YO.slice(YO.indexOf('onTerminado={() => {'), YO.indexOf('/>', YO.indexOf('onTerminado={() => {')));
    expect(bloque).toContain('setEnDiagnostico(null);');
    expect(bloque).toContain('miDiagnostico.recargar();');
    expect(bloque).toContain('void recargarResumen();');
  });

  it('el estado se relee cada vez que Yo recupera el foco (pudo terminarse desde Hoy), sin depender de que `recargar` sea estable', () => {
    expect(YO).toMatch(/const recargarMiDiagnostico = useRef\(miDiagnostico\.recargar\);\s*recargarMiDiagnostico\.current = miDiagnostico\.recargar;/);
    expect(YO).toMatch(/useFocusEffect\(\s*useCallback\(\(\) => \{\s*recargarMiDiagnostico\.current\(\);\s*\}, \[\]\),\s*\);/);
  });

  it('las pantallas del recorrido se devuelven ANTES del SafeAreaView de Yo (traen el suyo) y no se suma un atrás propio', () => {
    expect(YO.indexOf("if (enDiagnostico === 'ver')")).toBeLessThan(YO.indexOf('<SafeAreaView edges={BORDES_DE_UNA_PESTANA}'));
    expect(YO).not.toMatch(/useSystemBackHandler\([^)]*enDiagnostico/);
  });
});
