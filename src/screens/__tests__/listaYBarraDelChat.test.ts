import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { conElGlobalPrimero, ordenarPorActividad } from '../../features/chat/utils/formatoChat';

/**
 * Dos pedidos visuales del dueño (29/09) sobre Comunidad → Tribu:
 * 1. En la lista de chats, «Formación Renaser Global» va primero y los demás grupos siguen por el
 *    último mensaje. Lo pidió para el Admin y el Alquimista, que ven todos los grupos; la regla no
 *    depende del rol, así que vale para todos.
 * 2. Fuera el círculo verde con ✓ de la barra de escribir (subir evidencia de un hábito).
 */
const COMUNIDAD = path.resolve(__dirname, '..', 'ComunidadScreen.tsx');

type Conv = { id: string; type: 'global' | 'celula' | 'soporte'; lastMessageAt: string | null };

describe('la lista de grupos de Tribu', () => {
  // Lo que ve un Admin: muchos grupos, y el Global NO es el que tiene el mensaje más reciente.
  const grupos: Conv[] = [
    { id: 'celula-a', type: 'celula', lastMessageAt: '2026-09-29T10:00:00Z' },
    { id: 'global', type: 'global', lastMessageAt: '2026-09-20T10:00:00Z' },
    { id: 'soporte-x', type: 'soporte', lastMessageAt: '2026-09-29T12:00:00Z' },
    { id: 'celula-b', type: 'celula', lastMessageAt: null },
  ];

  it('pone el Global primero y deja el resto por el último mensaje', () => {
    const orden = conElGlobalPrimero(ordenarPorActividad(grupos)).map(c => c.id);
    expect(orden).toEqual(['global', 'soporte-x', 'celula-a', 'celula-b']);
  });

  it('no toca la lista que recibe', () => {
    const copia = [...grupos];
    conElGlobalPrimero(grupos);
    expect(grupos).toEqual(copia);
  });

  it('es lo que usa la pantalla para armar la sección de grupos', () => {
    const texto = fs.readFileSync(COMUNIDAD, 'utf-8');
    expect(texto).toMatch(/const gruposDeFormacion = conElGlobalPrimero\(\s*ordenarPorActividad\(/);
  });
});

describe('la barra de escribir del chat', () => {
  it('ya no tiene el círculo verde con ✓ de subir evidencia', () => {
    const texto = fs.readFileSync(COMUNIDAD, 'utf-8');
    expect(texto).not.toMatch(/<Icon name="checkCircle"/);
    expect(texto).not.toMatch(/accessibilityLabel="Subir evidencia de un hábito"/);
    expect(texto).not.toMatch(/<EvidenciaDesdeChatModal/);
    // La foto y el micrófono siguen (la foto, desde el 2026-10-05, en dos botones: ver abajo).
    expect(texto).toMatch(/accessibilityLabel="Enviar una foto de la galería"/);
    expect(texto).toMatch(/accessibilityLabel="Grabar una nota de voz"/);
  });

  /*
   * Rediseño de Comunidad (pedido del dueño, 2026-10-05). Contra la barra anterior fallan las tres:
   * el botón de stickers era la imagen de un sticker, la cámara abría la ventana «¿De dónde la
   * sacamos?» y, grabando, cortar era enviar sí o sí.
   */
  it('stickers con el ícono smile y la galería y la cámara directas, sin la ventana «¿Cámara o Galería?»', () => {
    const texto = fs.readFileSync(COMUNIDAD, 'utf-8');
    expect(texto).not.toMatch(/STICKERS_RENASER\[0\]\.imagen/);
    expect(texto).toMatch(/<Icon name="smile" size=\{24\}/);
    expect(texto).toMatch(/onPress=\{\(\) => handleAdjuntarFoto\('galeria'\)\}/);
    expect(texto).toMatch(/onPress=\{\(\) => handleAdjuntarFoto\('camara'\)\}/);
    expect(texto).toMatch(/accessibilityLabel="Tomar una foto con la cámara"/);
    expect(texto).not.toMatch(/Alert\.alert\('Enviar una foto'/);
  });

  it('grabando, la papelera descarta la nota sin mandarla, con un golpe háptico y sin alerta', () => {
    const texto = fs.readFileSync(COMUNIDAD, 'utf-8');
    expect(texto).toMatch(/accessibilityLabel="Descartar la nota de voz"/);
    expect(texto).toMatch(/<Icon name="trash" size=\{24\}/);
    const descartar = texto.slice(texto.indexOf('const descartarGrabacion = () => {'));
    const cuerpo = descartar.slice(0, descartar.indexOf('};'));
    expect(cuerpo).toMatch(/tacto\.descartar\(\)/);
    expect(cuerpo).toMatch(/cancelarGrabacion\(\)/);
    expect(cuerpo).not.toMatch(/Alert/);
  });
});
