/**
 * Plan y los objetivos «por confirmar» (spec 026): la pantalla monta medio app, así que acá se lee el código fuente sin
 * comentarios y se comprueba cómo está cableado; lo que hace cada pieza (etiqueta, tarjeta, hoja, hook, reglas) se prueba aparte
 * (`objetivosPorConfirmar` en components y utils, `useRocasMaestrasConfirmar`).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const leer = (relativo: string) => fs.readFileSync(path.join(RAIZ, relativo), 'utf-8');
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
const PLAN = sinComentarios(leer('screens/PlanScreen.tsx'));

describe('Plan con objetivos por confirmar', () => {
  it('la tarjeta «Revisa tus objetivos» va arriba del selector de eje y solo mientras haya pendientes', () => {
    expect(PLAN).toMatch(/const pendientes = useMemo\(\(\) => rocasPorConfirmar\(objetivos\.rocas, ejesOrdenados\)/);
    expect(PLAN).toMatch(/\{pendientes\.length > 0 \? <TarjetaRevisaTusObjetivos cantidad=\{pendientes\.length\} alRevisar=\{\(\) => setRevisando\(true\)\} \/> : null\}/);
    expect(PLAN.indexOf('<TarjetaRevisaTusObjetivos')).toBeLessThan(PLAN.indexOf('<ControlSegmentado'));
  });

  it('los «…» de un objetivo por confirmar abren la revisión, no «Anotar avance»', () => {
    expect(PLAN).toMatch(/const abiertaPorConfirmar = estaPorConfirmar\(rocaAbierta\);/);
    expect(PLAN).toMatch(/alAbrirOpciones=\{abiertaPorConfirmar \? \(\) => setRevisando\(true\) : sinAvanceQueAnotar \? undefined : \(\) => openEditGoalModal\(\)\}/);
  });

  it('confirmar manda los objetivos por el hook, cierra la hoja y avisa con la línea de siempre', () => {
    expect(PLAN).toMatch(/const resultado = await objetivos\.confirmar\(items\);/);
    expect(PLAN).toMatch(/setRevisando\(false\);\s*confirmar\('Tus objetivos de 90 días quedaron confirmados\.'\);/);
    expect(PLAN).toMatch(/<HojaConfirmarObjetivos[\s\S]*?alConfirmar=\{confirmarObjetivos\}/);
  });

  it('el atrás del sistema cierra primero la hoja de revisión', () => {
    expect(PLAN).toMatch(/if \(revisando\) \{\s*setRevisando\(false\);\s*return true;\s*\}/);
    expect(PLAN).toMatch(/\}, editGoalModalVisible \|\| revisando\);/);
  });

  it('la hoja solo se dibuja con algo que confirmar (confirmados, desaparece la tarjeta y la hoja)', () => {
    expect(PLAN).toMatch(/visible=\{revisando && pendientes\.length > 0\}/);
  });
});
