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
    // La cámara y el micrófono siguen.
    expect(texto).toMatch(/accessibilityLabel="Enviar una foto"/);
    expect(texto).toMatch(/accessibilityLabel="Grabar una nota de voz"/);
  });
});
