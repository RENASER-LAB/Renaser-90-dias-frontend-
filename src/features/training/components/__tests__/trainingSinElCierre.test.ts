import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { armarListaDelDia, type ItemBase } from '../../utils/listaDelDia';

/**
 * «Cierra tu día» se movió a Plan (spec 033, 2026-10-31): hay UNA sola entrada. Training ya no dibuja la fila, ni «Cerrado» /
 * «Sin cerrar» de los días anteriores, ni deja espacio donde estaba. Lo que SÍ se conserva en Plan (la hoja, las lecturas, el
 * guardado) lo prueban las pruebas de `features/cierre`.
 */

const raiz = path.resolve(__dirname, '../../../..');
const leer = (relativa: string) => fs.readFileSync(path.join(raiz, relativa), 'utf8');

describe('Training ya no tiene «Cierra tu día»', () => {
  const archivos = [
    'features/training/components/TrainingPorHora.tsx',
    'features/training/components/ListaDeHoy.tsx',
    'features/training/components/ListaDeOtroDia.tsx',
    'features/training/utils/listaDelDia.ts',
    'features/training/utils/itemsDelDia.ts',
    'features/training/utils/filaDelDia.ts',
    'features/training/utils/vistaDeOtroDia.ts',
    'screens/TrainingScreen.tsx',
  ];

  it.each(archivos)('%s no importa nada de features/cierre ni habla de un ítem «cierre»', archivo => {
    const codigo = leer(archivo);
    expect(codigo).not.toMatch(/from '[./]*\/?(\.\.\/)*cierre\//);
    expect(codigo).not.toMatch(/features\/cierre/);
    expect(codigo).not.toMatch(/tipo === 'cierre'|'cierre'\s*\|/);
    expect(codigo).not.toMatch(/cierrePrendido|useCierreDeHoy|useCierresAnteriores|HojaDelCierre|FilaDelCierre/);
  });

  it('la fila «Cierra tu día» ya no existe como componente', () => {
    expect(fs.existsSync(path.join(raiz, 'features/cierre/components/FilaDelCierre.tsx'))).toBe(false);
  });

  it('la lista de hoy termina donde terminan los hábitos, acciones y eventos: no entrega ninguna fila aparte al final', () => {
    const items: ItemBase[] = [
      { clave: 'a', tipo: 'habito', hora: '06:00', hecho: false },
      { clave: 'b', tipo: 'accion', hora: '20:30', hecho: true },
      { clave: 'c', tipo: 'evento', hora: '19:00', hecho: false },
    ];
    const lista = armarListaDelDia(items, 10 * 60);
    expect(Object.keys(lista).sort()).toEqual(['atrasados', 'cerrados', 'enCurso', 'hechos', 'marcaDelPrimero', 'primero', 'sinHora']);
  });
});
