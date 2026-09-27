/**
 * La info del chat al estilo WhatsApp (pedido del dueño, 2026-09-27): qué dice bajo el nombre, en
 * qué orden va la gente y que la cifra sea la misma que la de la cabecera del chat.
 */
import { describe, expect, it } from '@jest/globals';

import { integrantesDelChatDeGrupo, subtituloDeLaCabecera } from '../formatoChat';
import {
  cifraDeIntegrantes,
  integrantesDeLaInfo,
  subtituloDeLaInfo,
  tituloDeLaInfo,
  type MiembroDelGrupo,
} from '../infoDelChat';

const miembro = (traineeId: string, fullName: string, isSelf = false): MiembroDelGrupo => ({
  traineeId,
  fullName,
  avatarUrl: null,
  isSelf,
});

describe('tituloDeLaInfo', () => {
  it('como WhatsApp: del grupo, del contacto o del chat', () => {
    expect(tituloDeLaInfo('celula')).toBe('Info. del grupo');
    expect(tituloDeLaInfo('direct')).toBe('Info. del contacto');
    expect(tituloDeLaInfo('soporte')).toBe('Info. del chat');
    expect(tituloDeLaInfo('global')).toBe('Info. del chat');
  });
});

describe('subtituloDeLaInfo', () => {
  it('grupo: «Grupo · N integrantes», o «Grupo» a secas si todavía no se sabe cuántos son', () => {
    expect(subtituloDeLaInfo({ tipo: 'celula', integrantes: 5, subtitulo: 'Chat de tu grupo' })).toBe('Grupo · 5 integrantes');
    expect(subtituloDeLaInfo({ tipo: 'celula', integrantes: 1, subtitulo: 'Chat de tu grupo' })).toBe('Grupo · 1 integrante');
    expect(subtituloDeLaInfo({ tipo: 'celula', integrantes: null, subtitulo: 'Chat de tu grupo' })).toBe('Grupo');
  });

  it('soporte: «Chat de soporte»', () => {
    expect(subtituloDeLaInfo({ tipo: 'soporte', integrantes: null, subtitulo: 'Soporte · Equipo Renaser' })).toBe(
      'Chat de soporte'
    );
  });

  it('1 a 1: el rol del otro; sin saber quién es, lo que ya decía la conversación', () => {
    expect(
      subtituloDeLaInfo({ tipo: 'direct', integrantes: null, rolDelOtro: 'Aprendiz', subtitulo: 'Aprendiz · 1 a 1' })
    ).toBe('Aprendiz');
    expect(
      subtituloDeLaInfo({ tipo: 'direct', integrantes: null, rolDelOtro: null, subtitulo: 'Conversación directa' })
    ).toBe('Conversación directa');
  });

  it('comunidad: el subtítulo de la conversación', () => {
    expect(subtituloDeLaInfo({ tipo: 'global', integrantes: null, subtitulo: 'Comunidad completa RENASER' })).toBe(
      'Comunidad completa RENASER'
    );
  });
});

describe('cifraDeIntegrantes', () => {
  it('es la MISMA de la cabecera del chat: aprendices más el mentor', () => {
    const grupo = { memberCount: 4, mentorName: 'Ricardo Díaz' };
    const cifra = cifraDeIntegrantes(grupo, 0);
    expect(cifra).toBe(integrantesDelChatDeGrupo(grupo));
    expect(cifra).toBe(5);
    // La cabecera y la info dicen la misma frase.
    expect(subtituloDeLaInfo({ tipo: 'celula', integrantes: cifra, subtitulo: '' })).toBe(
      subtituloDeLaCabecera({ tipo: 'celula', integrantes: integrantesDelChatDeGrupo(grupo), subtitulo: '' })
    );
  });

  it('sin el grupo resuelto usa las filas ya cargadas; sin nada, no inventa', () => {
    expect(cifraDeIntegrantes(null, 3)).toBe(3);
    expect(cifraDeIntegrantes(null, 0)).toBeNull();
  });
});

describe('integrantesDeLaInfo', () => {
  const filas = integrantesDeLaInfo({
    mentor: { nombre: 'Ricardo Díaz', avatarUrl: 'https://cdn/ricardo.jpg' },
    miembros: [miembro('u-zoe', 'Zoe Paz'), miembro('u-yo', 'Ana Rojas', true), miembro('u-beto', 'Álvaro Beto')],
  });

  it('el mentor primero, después «Tú» y el resto por nombre', () => {
    expect(filas.map(f => f.nombre)).toEqual(['Ricardo Díaz', 'Tú', 'Álvaro Beto', 'Zoe Paz']);
  });

  it('cada uno con su marca: «Mentor» o «Aprendiz»', () => {
    expect(filas.map(f => f.rol)).toEqual(['Mentor', 'Aprendiz', 'Aprendiz', 'Aprendiz']);
  });

  it('tocar a un compañero abre su 1 a 1; al mentor (sin id) y a uno mismo, no', () => {
    expect(filas.map(f => [f.clave, f.abreChat])).toEqual([
      ['mentor', false],
      ['u-yo', false],
      ['u-beto', true],
      ['u-zoe', true],
    ]);
    expect(filas[0].usuarioId).toBeNull();
    expect(filas[2].usuarioId).toBe('u-beto');
  });

  it('«Tú» conserva el nombre real para las iniciales del avatar', () => {
    expect(filas[1].esYo).toBe(true);
    expect(filas[1].nombreCompleto).toBe('Ana Rojas');
  });

  it('las filas y la cifra coinciden: el mentor entra con el mismo criterio con que se lo cuenta', () => {
    const grupo = { memberCount: 3, mentorName: 'Ricardo Díaz' };
    expect(filas).toHaveLength(cifraDeIntegrantes(grupo, filas.length)!);
  });

  it('sin mentor, la lista empieza por uno mismo', () => {
    const sinMentor = integrantesDeLaInfo({ mentor: { nombre: null, avatarUrl: null }, miembros: [miembro('u-yo', 'Ana', true)] });
    expect(sinMentor.map(f => f.nombre)).toEqual(['Tú']);
    expect(integrantesDeLaInfo({ mentor: null, miembros: [] })).toEqual([]);
  });
});
