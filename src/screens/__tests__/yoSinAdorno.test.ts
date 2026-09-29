import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * «Nada en Yo puede aparentar algo que no hace» (dueño, 29/09). Se lee el código sin comentarios:
 * el comentario que cuenta qué había antes puede nombrarlo; lo que no puede es volver a mostrarse.
 */
const YO = path.resolve(__dirname, '..', 'YoScreen.tsx');
const codigo = fs
  .readFileSync(YO, 'utf-8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('Yo sin adornos', () => {
  it.each([
    'Abriendo selector de cámara',
    'const EVOLUCION',
    'const PATRONES',
    '<MicroLabel>Patrones</MicroLabel>',
    '<MicroLabel>Reflexión diaria</MicroLabel>',
    '<MicroLabel>Identidad</MicroLabel>',
    'Soy la persona que',
    'Repetir Activación Inicial',
    'El video todavía no está disponible',
    'Logros e Insignias',
    'TELÉFONO / WHATSAPP',
    'INSTAGRAM:',
    "puntosLiga ?? 100",
    "'Alumno Activo'",
    "'PROGRAMA ACTIVO'",
  ])('ya no muestra «%s»', viejo => {
    expect(codigo).not.toContain(viejo);
  });

  it('«+ Subir Foto» elige el hábito y sigue el registro con foto de Training', () => {
    expect(codigo).toMatch(/onPress=\{\(\) => setEligiendoHabitoParaFoto\(true\)\}[\s\S]{0,300}\+ Subir Foto/);
    expect(codigo).toMatch(/<ElegirHabitoParaFotoModal[\s\S]*?onElegir=\{subirFotoDe\}/);
    expect(codigo).toContain('<RegistroConFotoModal {...registroConFoto.modal} />');
    // Al terminar, la lista de evidencias se vuelve a pedir.
    expect(codigo).toMatch(/onCompletado: async[\s\S]{0,120}recargarEvidencias\(\)/);
  });

  it('la curva de «Tu Evolución» sale de los días del semáforo', () => {
    expect(codigo).toContain('curvaDeEvolucion(diasDelSemaforo)');
    expect(codigo).toMatch(/<Path d=\{curva\.trazo\}/);
  });
});
