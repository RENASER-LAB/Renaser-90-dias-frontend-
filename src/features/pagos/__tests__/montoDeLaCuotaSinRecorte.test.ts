import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const leer = (relativa: string) => fs.readFileSync(path.resolve(__dirname, relativa), 'utf8');
const DATOS = leer('../components/DatosDeLaCuota.tsx');
const FICHA = leer('../components/PagosDeLaPersona.tsx');
const MI_INGRESO = leer('../components/FilaDeCuota.tsx');
/** El código sin sus comentarios: un comentario que explica por qué ya no se usa `adjustsFontSizeToFit` no debe contar como usarlo. */
const sinComentarios = (fuente: string) => fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const lineaDelEstilo = (fuente: string, estilo: string) => fuente.split('\n').find(l => new RegExp(`^\\s*${estilo}:\\s*\\{`).test(l));

/**
 * E2E de las formaciones (01/11/2026, issues #89 y #91; #96). #89: al marcar una cuota como pagada y volver a pendiente, el monto de esa fila se dibujaba cortado
 * («US$ 1 00» en vez de «US$ 1 000»): un `Text` con `numberOfLines={1}` y `adjustsFontSizeToFit` conserva en Android la medida del ancho anterior cuando la
 * fila crece. #91: sin el autoajuste, el monto era lo único que se podía encoger (`flex: 1` / `flexShrink: 1`) y en 360 dp, con calendario, fecha y «Pendiente»,
 * quedaba más angosto que su texto y Android lo partía por la mitad del número («US$ 1 00» y debajo «0»). #96: la salida del #91 —`flexWrap` en la fila—
 * bajaba la pastilla de estado sola a un segundo renglón y dejaba un hueco; ahora el monto va solo en su renglón y fecha + estado en el de arriba.
 * Una cuota la dibuja un solo componente (`DatosDeLaCuota`) en la ficha y en «Mi ingreso»: lo que se vigila aquí es ese archivo.
 */
describe('el monto de una cuota nunca se recorta ni se parte', () => {
  it('la ficha y «Mi ingreso» dibujan la cuota con el mismo componente y ninguna dibuja el monto por su cuenta', () => {
    for (const original of [FICHA, MI_INGRESO]) {
      const fuente = sinComentarios(original);
      expect(fuente).toContain('<DatosDeLaCuota ');
      // Dibujar el monto (`{cuota.monto}`) es de `DatosDeLaCuota`; leerlo para abrir la hoja de edición (`monto: hoja.cuota.monto`) no cuenta.
      expect(fuente).not.toMatch(/\{\s*[\w.?]+\.monto\s*\}/);
      expect(fuente).not.toMatch(/estilos\.monto\b/);
    }
  });

  it('sin `adjustsFontSizeToFit` ni `numberOfLines` en ninguno de los tres archivos', () => {
    for (const original of [DATOS, FICHA, MI_INGRESO]) {
      const fuente = sinComentarios(original);
      expect(fuente).not.toContain('adjustsFontSizeToFit');
      expect(fuente).not.toContain('numberOfLines');
    }
  });

  it('el estilo del monto no se encoge (`flexShrink: 0`) ni se estira para repartirse con otro (`flex: 1`)', () => {
    const linea = lineaDelEstilo(DATOS, 'monto');
    expect(linea).toBeDefined();
    expect(linea).toContain('flexShrink: 0');
    expect(linea).not.toMatch(/flexShrink: [1-9]/);
    expect(linea).not.toMatch(/\bflex: 1\b/);
  });

  it('el monto no se encoge y no hay tamaño automático: el tamaño de letra es fijo y las cifras son tabulares', () => {
    const linea = lineaDelEstilo(DATOS, 'monto');
    expect(linea).toMatch(/fontSize: \d+/);
    expect(linea).toContain("fontVariant: ['tabular-nums']");
  });

  it('el monto lleva un espacio duro entre el símbolo y la cifra y entre los miles (nunca se parte en un espacio)', () => {
    const dinero = leer('../utils/dinero.ts');
    expect(dinero).toContain("const ESPACIO_DURO = '\\u00a0'");
    expect(dinero).toMatch(/`\$\{simbolo\}\$\{ESPACIO_DURO\}\$\{numero\}`/);
  });
});
