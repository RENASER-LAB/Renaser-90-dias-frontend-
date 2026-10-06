/**
 * En toda la app, el interruptor es `Interruptor` (prueba en Android, 2026-10-05).
 *
 * Yo ya lo usaba, pero quedaban cuatro `Switch` de React Native con colores escritos a mano
 * (`trackColor={{ false: '#332C20', … }}`, `thumbColor={… '#1E1B18' : '#888'}`): en oscuro el pulgar
 * encendido (`#1E1B18`) casi desaparecía sobre el riel y el riel apagado (`#332C20`) no se veía sobre
 * la tarjeta. Estaban en «Arma tu semana los domingos» (Training), en las filas de la hoja
 * Planificar, en «Recordarme mis acciones del día» (Hoy/Plan) y en «Avisar a todos al guardarlo»
 * (formulario de eventos). Ahora salen del tema y suenan igual que los de Yo.
 */
import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(__dirname, '..', '..');
const leer = (ruta: string) => readFileSync(join(SRC, ruta), 'utf8');

function archivosDeLaApp(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap(nombre => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return nombre === '__tests__' ? [] : archivosDeLaApp(ruta);
    return /\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
}

/** El código sin comentarios: que un comentario cuente la historia del `Switch` no es un `Switch`. */
const sinComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('los interruptores de la app', () => {
  it('ningún `Switch` del sistema ni colores de interruptor escritos a mano', () => {
    const conSwitch = archivosDeLaApp(SRC)
      .filter(ruta => /<Switch\b|\btrackColor=|\bthumbColor=|ios_backgroundColor=/.test(sinComentarios(readFileSync(ruta, 'utf8'))))
      .map(ruta => relative(SRC, ruta));
    expect(conSwitch).toEqual([]);
  });

  it('cada uno conserva su valor y su acción: solo cambia el control', () => {
    expect(leer('screens/TrainingScreen.tsx')).toMatch(
      /<Interruptor\s+valor=\{repasoSemanal\}\s+onCambiar=\{valor => void alternarRepasoSemanal\(valor\)\}\s+etiqueta="Arma tu semana los domingos"/,
    );
    expect(leer('features/training/components/PlanificarDimensionModal.tsx')).toMatch(
      /<Interruptor\s+valor=\{activo\}\s+deshabilitado=\{enVuelo\.has\(h\.habitoId\)\}\s+onCambiar=\{\(\) => alternarActivo\(h\)\}/,
    );
    expect(leer('features/objetivos/components/RecordatorioDeAcciones.tsx')).toMatch(
      /<Interruptor\s+valor=\{prefs\.diarioActivo\}\s+deshabilitado=\{ocupado\}\s+onCambiar=\{v => void cambiarDiario\(v\)\}\s+etiqueta="Recordarme mis acciones del día"/,
    );
    expect(leer('features/eventos/components/FormularioDelEvento.tsx')).toMatch(
      /<Interruptor\s+valor=\{form\.notificarAlCrear\}\s+onCambiar=\{v => cambiar\('notificarAlCrear', v\)\}\s+etiqueta="Avisar a todos al guardarlo"/,
    );
  });
});
