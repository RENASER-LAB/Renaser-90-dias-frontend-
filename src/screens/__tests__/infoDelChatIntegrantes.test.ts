import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * D-222 (2026-09-29): la lista de integrantes de la info del chat sale de `/participants` para TODO chat
 * (no solo el grupo) y todo rol. `ComunidadScreen` es demasiado grande para montarla en una prueba, así que
 * el cableado se verifica sobre su fuente, como hacen otras pruebas del repo.
 */
const pantalla = readFileSync(join(__dirname, '..', 'ComunidadScreen.tsx'), 'utf8');
const info = pantalla.slice(pantalla.indexOf('<InfoDelChat'));

describe('el cableado de los integrantes en ComunidadScreen', () => {
  it('la lista sale del servidor por conversación y ya no de /me/cells', () => {
    expect(pantalla).toContain('useParticipantesDelChat(conversacionDeLaInfo');
    expect(pantalla).toContain('integrantesDelChat({');
    expect(pantalla).not.toContain('useIntegrantesDelGrupo(groupInfoVisible');
    expect(pantalla).not.toContain('integrantesDeLaInfo(');
  });

  it('todo chat menos el 1 a 1 lleva la sección, no solo el de tipo grupo', () => {
    expect(info).toContain("activeChat.type === 'direct'");
    expect(info).not.toContain("activeChat.type === 'celula'\n              ? { filas: filasDeLaInfo");
    expect(pantalla).toContain("activeChat.type !== 'direct' ? activeChat.id : null");
  });

  it('el Admin/Alquimista abre la ficha de administración desde «Ver ficha»', () => {
    expect(pantalla).toContain("irAPestana('Hoy', { abrirFichaAprendiz:");
  });
});
