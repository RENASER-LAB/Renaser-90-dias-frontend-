/**
 * Ningún «90 días» escrito a mano en lo que ve la persona (issue #104, identidad por formación en todo; decisión del dueño del 2026-11-02: «ningún
 * 90 días para el Diplomado ni la Certificación»). El plazo del programa se dice con el de SU formación (`usePlazoDeLaSesion` / `plazoDelObjetivo`:
 * «90 días», «3 meses», «1 año»), o con un texto neutro donde no hay sesión.
 *
 * Esta prueba barre TODO `src/` y `App.tsx` —sin pruebas ni comentarios— y falla si aparece «90 días», «Día 90», «de 90» o «noventa» en el código.
 * Las únicas excepciones, con su porqué, están en `EXCEPCIONES`. Para el onboarding hay además un barrido más fino (`onboarding/__tests__/plazoEnElOnboarding`).
 *
 * Contra el código anterior falla: lo hacían la invitación del personal, el Pacto de Yo, la tarjeta del diagnóstico, los avisos de los objetivos, el
 * semáforo, la clase diaria, la ficha del mentor y el respaldo del podio.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..', '..', '..');

/** Lo único que puede decir «90 días» a mano, y por qué. Cada una es la ÚNICA línea permitida de ese archivo. */
const EXCEPCIONES: Record<string, { patron: RegExp; porque: string }> = {
  'src/features/objetivos/utils/nombreDelObjetivo.ts': {
    patron: /PLAZO_POR_DEFECTO = '90 días'/,
    porque: 'es EL valor por defecto del plazo (la Escuela y la Certificación, y quien no tiene formación conocida); de ahí salen todos los demás textos',
  },
  'src/features/diagnostico/api/diagnosticoSchemas.ts': {
    patron: /\{ dias: 90, texto: '90 días' \}/,
    porque: 'respaldo de un servidor que no manda la duración del diagnóstico (dato de la Escuela); ninguna pantalla dibuja ese texto',
  },
};

const PATRONES: Array<[string, RegExp]> = [
  ['«90 días»', /\b90\s*d[ií]as?\b/i],
  ['«Día 90»', /\bd[ií]a\s*90\b/i],
  ['«de 90» («Día 12 de 90»)', /\bde\s+90\b(?!\s*(?:min|px|%))/],
  ['«noventa»', /\bnoventa\b/i],
];

const sinComentarios = (f: string) =>
  f
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

function archivos(carpeta: string): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== '__tests__' && entrada.name !== 'node_modules') salida.push(...archivos(ruta));
    } else if (/\.tsx?$/.test(entrada.name) && !/\.(test|spec)\.tsx?$/.test(entrada.name)) {
      salida.push(ruta);
    }
  }
  return salida;
}

const CODIGO = [...archivos(path.join(RAIZ, 'src')), path.join(RAIZ, 'App.tsx')]
  .filter(a => fs.existsSync(a))
  .map(a => ({ archivo: path.relative(RAIZ, a).split(path.sep).join('/'), fuente: sinComentarios(fs.readFileSync(a, 'utf8')) }));

describe('ningún «90 días» escrito a mano en lo que ve la persona', () => {
  it('el barrido encuentra el código de la app (si no, no vigila nada)', () => {
    expect(CODIGO.length).toBeGreaterThan(800);
    expect(CODIGO.some(c => c.archivo === 'src/screens/YoScreen.tsx')).toBe(true);
    expect(CODIGO.some(c => c.archivo === 'App.tsx')).toBe(true);
  });

  it.each(CODIGO.map(c => [c.archivo, c.fuente] as const))('%s', (archivo, fuente) => {
    const excepcion = EXCEPCIONES[archivo];
    const lineas = fuente.split('\n').filter(l => !(excepcion && excepcion.patron.test(l)));
    for (const [nombre, patron] of PATRONES) {
      const encontrada = lineas.find(l => patron.test(l));
      expect(encontrada === undefined ? null : `${archivo}: escribe ${nombre} a mano → ${encontrada.trim()}`).toBeNull();
    }
  });

  it('las excepciones existen de verdad y cada una dice por qué (una que ya no se usa se borra de la lista)', () => {
    for (const [archivo, { patron, porque }] of Object.entries(EXCEPCIONES)) {
      const codigo = CODIGO.find(c => c.archivo === archivo);
      expect(codigo).toBeDefined();
      expect(codigo!.fuente.split('\n').some(l => patron.test(l))).toBe(true);
      expect(porque.length).toBeGreaterThan(30);
    }
    expect(Object.keys(EXCEPCIONES)).toHaveLength(2);
  });
});

describe('los textos que antes decían «90 días» dicen el plazo de la formación', () => {
  const leer = (relativa: string) => fs.readFileSync(path.join(RAIZ, relativa), 'utf8');

  it.each([
    'src/features/programa/components/InvitacionProgramaPropio.tsx',
    'src/features/academy/components/ClaseDiariaModal.tsx',
    'src/features/diagnostico/components/TarjetaDelDiagnosticoPendiente.tsx',
    'src/features/semaforo/screens/SemaforoScreen.tsx',
    'src/features/objetivos/hooks/useRocasMaestras.ts',
    'src/features/objetivos/hooks/useRocasSemanales.ts',
    'src/screens/YoScreen.tsx',
  ])('%s toma el plazo de la sesión (usePlazoDeLaSesion)', archivo => {
    expect(sinComentarios(leer(archivo))).toContain('usePlazoDeLaSesion()');
  });
});
