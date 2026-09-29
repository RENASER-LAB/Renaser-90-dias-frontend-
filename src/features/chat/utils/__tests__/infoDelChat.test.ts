/**
 * La info del chat al estilo WhatsApp (pedido del dueño, 2026-09-27): qué dice bajo el nombre, en
 * qué orden va la gente y que la cifra sea la misma que la de la cabecera del chat.
 */
import { describe, expect, it } from '@jest/globals';

import type { WireParticipante } from '../../types/chat.types';
import { integrantesDelChatDeGrupo, subtituloDeLaCabecera } from '../formatoChat';
import {
  cifraDeIntegrantes,
  cifraDelChat,
  integrantesDelChat,
  integrantesDeLaInfo,
  puedeCambiarLaFotoDelGrupo,
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

  it('un servidor anterior (sin rutas de tarjeta ni id del mentor) deja todo como estaba', () => {
    expect(filas.map(f => f.fotoPath)).toEqual([null, null, null, null]);
    expect(filas[0].esYo).toBe(false);
  });
});

describe('integrantesDeLaInfo con la tarjeta de cada uno y el id del mentor (D-206)', () => {
  const RUTA = (id: string) => `/api/v1/chat/conversations/g-1/miembros/${id}/foto`;
  const mentor = {
    id: 'u-ricardo',
    nombre: 'Ricardo Palomino',
    avatarUrl: 'https://s3/avatares/ricardo.jpg',
    fotoPath: RUTA('u-ricardo'),
  };
  const miembros: MiembroDelGrupo[] = [
    { ...miembro('u-e2e-1', 'E2E Libre 01'), photoPath: RUTA('u-e2e-1') },
    { ...miembro('u-e2e-2', 'E2E Libre 02'), photoPath: RUTA('u-e2e-2') },
  ];

  it('cada fila lleva la ruta de su tarjeta, el mentor incluido (la captura del dueño: «RP», «EL», «EL»)', () => {
    const filas = integrantesDeLaInfo({ mentor, miembros, yoId: 'u-e2e-1' });

    expect(filas.map(f => f.fotoPath)).toEqual([RUTA('u-ricardo'), RUTA('u-e2e-1'), RUTA('u-e2e-2')]);
  });

  it('el mentor que mira su propio grupo se ve como «Tú», no como «Ricardo Palomino»', () => {
    const filas = integrantesDeLaInfo({ mentor, miembros, yoId: 'u-ricardo' });

    expect(filas[0]).toMatchObject({ clave: 'mentor', nombre: 'Tú', nombreCompleto: 'Ricardo Palomino', esYo: true });
    expect(filas.slice(1).map(f => f.nombre)).toEqual(['E2E Libre 01', 'E2E Libre 02']);
  });

  it('para un aprendiz, el mentor sigue con su nombre y con su id de usuario', () => {
    const filas = integrantesDeLaInfo({ mentor, miembros, yoId: 'u-e2e-1' });

    expect(filas[0]).toMatchObject({ nombre: 'Ricardo Palomino', esYo: false, usuarioId: 'u-ricardo' });
  });

  it('sin id del mentor no se adivina quién es: nunca «Tú»', () => {
    const filas = integrantesDeLaInfo({ mentor: { ...mentor, id: null }, miembros, yoId: 'u-ricardo' });

    expect(filas[0]).toMatchObject({ nombre: 'Ricardo Palomino', esYo: false, usuarioId: null });
  });

  it('una ruta en blanco no es una tarjeta', () => {
    const filas = integrantesDeLaInfo({
      mentor: { ...mentor, fotoPath: '  ' },
      miembros: [{ ...miembro('u-e2e-1', 'E2E Libre 01'), photoPath: '' }],
    });

    expect(filas.map(f => f.fotoPath)).toEqual([null, null]);
  });
});

describe('integrantesDeLaInfo: escribirle al mentor y ver la ficha (D-207)', () => {
  const mentor = { id: 'u-ricardo', nombre: 'Ricardo Palomino', avatarUrl: null, fotoPath: null };
  const miembros: MiembroDelGrupo[] = [miembro('u-ana', 'Ana Pérez'), miembro('u-beto', 'Beto Díaz')];

  it('el aprendiz le escribe a su mentor desde la info: la fila del mentor abre su 1 a 1', () => {
    const filas = integrantesDeLaInfo({ mentor, miembros: [miembro('u-ana', 'Ana Pérez', true)], yoId: 'u-ana' });

    expect(filas[0]).toMatchObject({ clave: 'mentor', usuarioId: 'u-ricardo', abreChat: true, abreFicha: false });
  });

  it('el mentor de ESTE grupo ve «Ver ficha» en cada aprendiz, y el 1 a 1 se queda', () => {
    const filas = integrantesDeLaInfo({ mentor, miembros, yoId: 'u-ricardo' });

    expect(filas.map(f => [f.nombre, f.abreChat, f.abreFicha])).toEqual([
      ['Tú', false, false],
      ['Ana Pérez', true, true],
      ['Beto Díaz', true, true],
    ]);
  });

  it('un aprendiz no ve «Ver ficha» de nadie: no se inventa un permiso', () => {
    const filas = integrantesDeLaInfo({ mentor, miembros: [miembro('u-ana', 'Ana Pérez', true), miembro('u-beto', 'Beto Díaz')], yoId: 'u-ana' });

    expect(filas.some(f => f.abreFicha)).toBe(false);
  });

  it('sin el id del mentor, ni 1 a 1 con él ni fichas: no se adivina quién es', () => {
    const filas = integrantesDeLaInfo({ mentor: { ...mentor, id: undefined }, miembros, yoId: 'u-ricardo' });

    expect(filas[0].abreChat).toBe(false);
    expect(filas.some(f => f.abreFicha)).toBe(false);
  });
});

describe('puedeCambiarLaFotoDelGrupo (D-212: «Admin y el mentor de ese grupo», y el Alquimista)', () => {
  it('el ADMIN y el Alquimista, en cualquier grupo; el mentor, en el suyo', () => {
    expect(puedeCambiarLaFotoDelGrupo({ mentorId: 'u-ricardo', yoId: 'u-kelin', miRol: 'ADMIN' })).toBe(true);
    // Decisión del dueño en la página de decisiones (2026-09-27): el Alquimista también («sí»).
    expect(puedeCambiarLaFotoDelGrupo({ mentorId: 'u-ricardo', yoId: 'u-alq', miRol: 'ALCHEMIST' })).toBe(true);
    expect(puedeCambiarLaFotoDelGrupo({ mentorId: 'u-ricardo', yoId: 'u-ricardo', miRol: 'MENTOR' })).toBe(true);
  });

  it('nadie más: un aprendiz, el mentor de otro grupo, un líder de mentores que no es el mentor', () => {
    expect(puedeCambiarLaFotoDelGrupo({ mentorId: 'u-ricardo', yoId: 'u-ana', miRol: 'TRAINEE' })).toBe(false);
    expect(puedeCambiarLaFotoDelGrupo({ mentorId: 'u-ricardo', yoId: 'u-otro', miRol: 'MENTOR' })).toBe(false);
    expect(puedeCambiarLaFotoDelGrupo({ mentorId: 'u-ricardo', yoId: 'u-lider', miRol: 'MENTOR_LEAD' })).toBe(false);
  });

  it('sin el id del mentor no se adivina quién es', () => {
    expect(puedeCambiarLaFotoDelGrupo({ mentorId: null, yoId: 'u-ricardo', miRol: 'MENTOR' })).toBe(false);
    expect(puedeCambiarLaFotoDelGrupo({ mentorId: ' ', yoId: ' ', miRol: 'MENTOR' })).toBe(false);
  });
});


/**
 * D-222 (pedido del dueño, 29/09: «debe de salir para todos»). La lista sale de `/participants` y sirve a
 * todo rol y a todo tipo de chat: el Admin que abre un grupo, la comunidad y el soporte.
 */
describe('integrantesDelChat: la lista de cualquier chat, para cualquier rol', () => {
  const persona = (userId: string, nombre: string, rol: string, esUnoMismo = false): WireParticipante => ({
    userId,
    nombre,
    rol,
    esUnoMismo,
  });
  const grupo = [
    persona('u-ricardo', 'Ricardo Palomino', 'MENTOR'),
    persona('u-kelin', 'Kelin Rojas', 'ADMIN'),
    persona('u-ana', 'Ana Pérez', 'APRENDIZ', true),
    persona('u-beto', 'Beto Díaz', 'APRENDIZ'),
  ];

  it('el Admin que abre la info de un grupo ve a todos, con su marca y sin reordenar lo que manda el servidor', () => {
    const filas = integrantesDelChat({
      participantes: [
        persona('u-kelin', 'Kelin Rojas', 'ADMIN', true),
        ...grupo.filter(p => p.userId !== 'u-kelin').map(p => ({ ...p, esUnoMismo: false })),
      ],
      tipo: 'celula',
      miRol: 'ADMIN',
    });

    expect(filas.map(f => [f.nombre, f.rol])).toEqual([
      ['Tú', 'Admin'],
      ['Ricardo Palomino', 'Mentor'],
      ['Ana Pérez', 'Aprendiz'],
      ['Beto Díaz', 'Aprendiz'],
    ]);
    expect(filas.map(f => f.abreFicha)).toEqual([false, false, true, true]);
  });

  it('la marca de cada rol: Mentor, Aprendiz, Admin y Alquimista', () => {
    const filas = integrantesDelChat({
      participantes: [
        persona('1', 'A', 'MENTOR'),
        persona('2', 'B', 'APRENDIZ'),
        persona('3', 'C', 'ADMIN'),
        persona('4', 'D', 'ALQUIMISTA'),
      ],
      tipo: 'global',
    });

    expect(filas.map(f => f.rol)).toEqual(['Mentor', 'Aprendiz', 'Admin', 'Alquimista']);
  });

  it('la comunidad: el aprendiz ve a todos y le puede escribir a cada uno, pero no ve fichas', () => {
    const filas = integrantesDelChat({
      participantes: [persona('u-ana', 'Ana Pérez', 'APRENDIZ', true), persona('u-beto', 'Beto Díaz', 'APRENDIZ')],
      tipo: 'global',
      miRol: 'TRAINEE',
    });

    expect(filas.map(f => [f.nombre, f.abreChat, f.abreFicha])).toEqual([
      ['Tú', false, false],
      ['Beto Díaz', true, false],
    ]);
  });

  it('el mentor de ESTE grupo ve «Ver ficha» en sus aprendices (su fila es MENTOR); en la comunidad, no', () => {
    const delGrupo = integrantesDelChat({
      participantes: [persona('u-ricardo', 'Ricardo Palomino', 'MENTOR', true), persona('u-ana', 'Ana Pérez', 'APRENDIZ')],
      tipo: 'celula',
      miRol: 'MENTOR',
    });
    const enLaComunidad = integrantesDelChat({
      participantes: [persona('u-ricardo', 'Ricardo Palomino', 'MENTOR', true), persona('u-ana', 'Ana Pérez', 'APRENDIZ')],
      tipo: 'global',
      miRol: 'MENTOR',
    });

    expect(delGrupo.map(f => f.abreFicha)).toEqual([false, true]);
    expect(enLaComunidad.some(f => f.abreFicha)).toBe(false);
  });

  it('el Admin ve la ficha de los aprendices también en la comunidad y en el soporte', () => {
    for (const tipo of ['global', 'soporte'] as const) {
      const filas = integrantesDelChat({
        participantes: [persona('u-ana', 'Ana Pérez', 'APRENDIZ'), persona('u-zoe', 'Zoe', 'ALQUIMISTA', true)],
        tipo,
        miRol: 'ALCHEMIST',
      });
      expect(filas.map(f => f.abreFicha)).toEqual([true, false]);
    }
  });

  it('la tarjeta de cada uno y su foto subida llegan a la fila; en blanco, no es nada', () => {
    const filas = integrantesDelChat({
      participantes: [
        { ...persona('1', 'Ana', 'APRENDIZ'), fotoPath: '/api/v1/chat/conversations/c/miembros/1/foto', avatarUrl: null },
        { ...persona('2', 'Beto', 'APRENDIZ'), fotoPath: '  ', avatarUrl: 'https://s3/beto.jpg' },
      ],
      tipo: 'soporte',
    });

    expect(filas.map(f => f.fotoPath)).toEqual(['/api/v1/chat/conversations/c/miembros/1/foto', null]);
    expect(filas.map(f => f.avatarUrl)).toEqual([null, 'https://s3/beto.jpg']);
  });

  it('un rol que la app no conoce se muestra igual: nunca se esconde a alguien', () => {
    const filas = integrantesDelChat({ participantes: [persona('1', 'Uno', 'GUIA')], tipo: 'celula' });

    expect(filas[0].rol).toBe('Guia');
  });
});

describe('cifraDelChat (D-222)', () => {
  it('manda el total del servidor de ESA conversación', () => {
    expect(cifraDelChat(5, { memberCount: 3, mentorName: 'Ricardo' })).toBe(5);
    expect(cifraDelChat(240, null)).toBe(240);
  });

  it('sin total todavía, un grupo cae a la cifra de la cabecera; lo demás, sin inventar', () => {
    expect(cifraDelChat(null, { memberCount: 3, mentorName: 'Ricardo' })).toBe(4);
    expect(cifraDelChat(null, null)).toBeNull();
  });
});
