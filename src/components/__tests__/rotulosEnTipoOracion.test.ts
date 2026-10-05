import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ningún rótulo que se dibuje con `MicroLabel` va escrito en MAYÚSCULAS (2026-10-05).
 *
 * Desde que `MicroLabel` va sin espaciar (decisión del dueño), un rótulo en mayúsculas ya no es una
 * versalita con aire: es un bloque apretado en negrita. Los rótulos van en tipo oración, como pidió
 * el dueño. Contra el código anterior falla: la Ficha Inicial decía «FECHA DE NACIMIENTO»,
 * «OCUPACIÓN / PROFESIÓN ACTUAL» y «NÚMERO DE DNI / CÉDULA», Términos «FIRMA DE ACEPTACIÓN LEGAL (CON
 * TU DEDO)» y el Código Renaser «NIVEL DE ENERGÍA» y «CÓDIGO RENASER · …».
 *
 * Se revisa el texto literal que llega a `MicroLabel`, directo o por los campos que lo usan para su
 * rótulo (`FormField`, `DatePickerField`, `SliderRating`, `SignatureCanvas`, `PhoneCountryInput`,
 * `CampoDelIngreso`) y los `label:` de una configuración dentro del mismo archivo.
 */

const RAIZ = path.resolve(__dirname, '..', '..');

/**
 * Lo que queda fuera, a la vista y con su motivo:
 * - **Código que no usa nadie** (los capítulos viejos de la ficha y el cuestionario profundo: ningún
 *   archivo los importa). Si vuelven a usarse, que se salgan de esta lista y pasen la prueba.
 * - **Administración → grupo**: sus rótulos son también los selectores de las pruebas de punta a punta
 *   (`e2e/admin-alquimista/E03-E07-grupos.spec.ts`, `.maestro/admin-alquimista/E04-crear-grupo.yaml`);
 *   cambiarlos es otro trabajo.
 */
const FUERA = new Set([
  'features/onboarding/components/ChapterAlma.tsx',
  'features/onboarding/components/ChapterCompromiso.tsx',
  'features/onboarding/components/ChapterCuerpo.tsx',
  'features/onboarding/components/ChapterMente.tsx',
  'features/onboarding/components/ChapterNegocio.tsx',
  'features/onboarding/screens/CuestionarioProfundoScreen.tsx',
  'features/admin/screens/GrupoFormScreen.tsx',
]);

const CAMPOS = ['FormField', 'DatePickerField', 'SliderRating', 'SignatureCanvas', 'PhoneCountryInput', 'CampoDelIngreso'];

function archivosTsx(carpeta: string): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    const ruta = path.join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name !== '__tests__') salida.push(...archivosTsx(ruta));
    } else if (entrada.name.endsWith('.tsx')) {
      salida.push(ruta);
    }
  }
  return salida;
}

/** Tres letras o más y ninguna minúscula: «FECHA DE NACIMIENTO», no «DNI» suelto dentro de una frase. */
export function enMayusculas(texto: string): boolean {
  const letras = texto.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  return letras.length >= 3 && letras === letras.toUpperCase();
}

/** Los rótulos literales que este archivo le pasa a `MicroLabel`. */
export function rotulosDe(codigo: string): string[] {
  const rotulos: string[] = [];
  for (const m of codigo.matchAll(/<MicroLabel>([\s\S]*?)<\/MicroLabel>/g)) {
    for (const literal of m[1].matchAll(/'([^']*)'|`([^`]*)`|^\s*([^{}<>\n]+?)\s*$/gm)) {
      rotulos.push((literal[1] ?? literal[2] ?? literal[3] ?? '').replace(/\$\{[^}]*\}/g, ''));
    }
  }
  for (const campo of CAMPOS) {
    for (const m of codigo.matchAll(new RegExp(`<${campo}\\b[^>]*?\\b(?:label|etiqueta)="([^"]*)"`, 'g'))) rotulos.push(m[1]);
  }
  if (CAMPOS.some(campo => codigo.includes(`<${campo}`))) {
    for (const m of codigo.matchAll(/\blabel: '([^']*)'/g)) rotulos.push(m[1]);
  }
  return rotulos.filter(r => r.trim() !== '');
}

describe('los rótulos de MicroLabel, en tipo oración', () => {
  it('el detector distingue un rótulo en mayúsculas de uno en tipo oración', () => {
    expect(enMayusculas('FECHA DE NACIMIENTO')).toBe(true);
    expect(enMayusculas('Número de DNI / cédula')).toBe(false);
    expect(rotulosDe('<FormField\n  label="NIVEL DE ENERGÍA"\n  value={v}\n/>')).toEqual(['NIVEL DE ENERGÍA']);
    expect(rotulosDe("<MicroLabel>\n  {slot ? `CÓDIGO RENASER · ${slot.etiqueta}` : 'CÓDIGO RENASER'}\n</MicroLabel>")).toEqual([
      'CÓDIGO RENASER · ',
      'CÓDIGO RENASER',
    ]);
    expect(rotulosDe('<MicroLabel>Hábitos de hoy</MicroLabel>')).toEqual(['Hábitos de hoy']);
  });

  it('ningún archivo en uso le pasa un rótulo en mayúsculas', () => {
    const problemas: string[] = [];
    for (const archivo of archivosTsx(RAIZ)) {
      const nombre = path.relative(RAIZ, archivo).split(path.sep).join('/');
      if (FUERA.has(nombre)) continue;
      const codigo = fs.readFileSync(archivo, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const rotulo of rotulosDe(codigo)) if (enMayusculas(rotulo)) problemas.push(`${nombre}: «${rotulo}»`);
    }
    expect(problemas).toEqual([]);
  });

  it('lo que queda fuera por no usarse sigue sin usarse', () => {
    const codigo = archivosTsx(RAIZ)
      .filter(a => !FUERA.has(path.relative(RAIZ, a).split(path.sep).join('/')))
      .map(a => fs.readFileSync(a, 'utf-8'))
      .join('\n');
    for (const muerto of ['ChapterAlma', 'ChapterCompromiso', 'ChapterCuerpo', 'ChapterMente', 'ChapterNegocio', 'CuestionarioProfundoScreen']) {
      expect({ muerto, importado: new RegExp(`import[^;]*\\b${muerto}\\b`).test(codigo) }).toEqual({ muerto, importado: false });
    }
  });
});
