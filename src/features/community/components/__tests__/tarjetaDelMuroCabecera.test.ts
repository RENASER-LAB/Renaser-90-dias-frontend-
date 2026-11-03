/**
 * La cabecera de la tarjeta del Muro (pedido urgente del dueño, 2026-11-03, sesión de Administración con el filtro «Todas»):
 *
 *  1. La tarjeta ya no lleva el chip de formación («Escuela»): el selector de arriba clasifica, y el chip se veía feo.
 *  2. Un nombre largo («Lisette Pierina Camones Aparicio») empujaba la insignia «Día 1» fuera de la tarjeta.
 *  3. Y, por lo mismo, el «…» de moderación (el último de la fila) quedaba fuera de la pantalla: "ya no está como antes".
 *
 * Una prueba de Jest no mide pantalla, así que lo que se fija son las reglas de la fila (qué cede y qué no) y, de punta a
 * punta, que ADMIN y ALCHEMIST ven el «…» junto a la insignia y el aprendiz no.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../../../theme/tokens')>('../../../../theme/tokens');
  return { useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space }) };
});
jest.mock('../FotoMuro', () => ({ FotoMuro: () => null }));

/* Administración leyendo «Todas»: la única lectura en la que antes cada tarjeta dibujaba el chip de su formación. */
jest.mock('../../../formaciones/hooks/useFormacionDeLaComunidad', () => ({
  useFormacionDeLaComunidad: () => ({
    mostrarRotulos: true,
    mostrarSelector: true,
    veTodas: true,
    eleccion: null,
    rotuloDe: (codigo: string) => (codigo === 'ESCUELA' ? 'Escuela' : codigo),
    nombreDe: (codigo: string) => (codigo === 'ESCUELA' ? 'Escuela Renaser' : codigo),
  }),
}));

/* La puerta del «…»: el rol de la sesión y lo que diga el servidor. */
const mockUsuario: { current: { id: string; role: string } | null } = { current: null };
jest.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: mockUsuario.current }) }));
const mockCapacidadesDePrograma = jest.fn<() => Promise<Record<string, unknown> | null>>();
jest.mock('../../../mentor/api/mentorApi', () => ({ capacidadesDePrograma: () => mockCapacidadesDePrograma() }));
jest.mock('../../../programa/events/avisoDiaUnoElegido', () => ({ escucharDiaUnoElegido: () => () => undefined }));

import type { PostItem } from '../../../../screens/ComunidadScreen';
import { usePuedeModerarElMuro } from '../../hooks/usePuedeModerarElMuro';
import { TarjetaPublicacionMuro, type AccionesPublicacion } from '../TarjetaPublicacionMuro';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOMBRE_LARGO = 'Lisette Pierina Camones Aparicio';
const acciones = new Proxy({}, { get: () => jest.fn() }) as unknown as AccionesPublicacion;

const publicacion = (cambios: Partial<PostItem> = {}): PostItem => ({
  id: 'p1',
  author: NOMBRE_LARGO,
  avatar: '👤',
  avatarUrl: null,
  cell: 'Grupo Fénix',
  diaPrograma: 1,
  timeAgo: 'Hace 5 días',
  text: 'Hoy empecé.',
  media: [],
  likes: 0,
  userReaction: null,
  comments: [],
  formacion: 'ESCUELA',
  ...cambios,
});

let raiz: ReactTestRenderer | null = null;

function dibujar(post: PostItem, puedeModerar: boolean): ReactTestRenderer {
  act(() => {
    raiz = TestRenderer.create(
      React.createElement(TarjetaPublicacionMuro, {
        post,
        expandida: false,
        comentariosAbiertos: false,
        destacada: false,
        proporcion: undefined,
        textoComentario: '',
        fotoComentario: null,
        comentariosExpandidos: {},
        confirmacion: null,
        puedeModerar,
        acciones,
      }),
    );
  });
  return raiz!;
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  mockCapacidadesDePrograma.mockReset();
  mockUsuario.current = null;
});

const textosDe = (r: ReactTestRenderer): string[] =>
  r.root
    .findAll(n => (n.type as unknown) === Text)
    .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : String(n.props.children ?? '')));

const estiloPlano = (n: ReactTestInstance): Record<string, unknown> => (StyleSheet.flatten(n.props.style) ?? {}) as Record<string, unknown>;

/**
 * Los ancestros de un nodo que llevan estilo, del más cercano al más lejano. Un `View` del árbol de pruebas aparece dos veces
 * (el componente y su nodo nativo, con el mismo `style`): se cuenta una sola.
 */
function ancestrosConEstilo(n: ReactTestInstance): ReactTestInstance[] {
  const salida: ReactTestInstance[] = [];
  for (let p = n.parent; p; p = p.parent) {
    if (p.props.style && salida[salida.length - 1]?.props.style !== p.props.style) salida.push(p);
  }
  return salida;
}

const textoDelNombre = (r: ReactTestRenderer): ReactTestInstance =>
  r.root.findAll(n => (n.type as unknown) === Text && n.props.children === NOMBRE_LARGO)[0];
const botonModerar = (r: ReactTestRenderer): ReactTestInstance | undefined =>
  r.root.findAll(n => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Opciones de moderación')[0];
const insignia = (r: ReactTestRenderer): ReactTestInstance | undefined =>
  r.root.findAll(n => (n.type as unknown) === Text && Array.isArray(n.props.children) && n.props.children.join('') === 'Día 1')[0];

describe('la tarjeta del Muro ya no lleva el chip de formación', () => {
  it('Administración leyendo «Todas»: ni el texto «Escuela» ni la etiqueta «Formación: …» están en la tarjeta', () => {
    const r = dibujar(publicacion({ formacion: 'ESCUELA' }), true);
    expect(textosDe(r)).not.toContain('Escuela');
    expect(r.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Formación'))).toHaveLength(0);
    // Lo demás de la cabecera sigue: autor, grupo y cuándo, y el día.
    expect(textosDe(r)).toEqual(expect.arrayContaining([NOMBRE_LARGO, 'Grupo Fénix · Hace 5 días', 'Día 1']));
  });

  it('el archivo de la tarjeta no importa ni dibuja el rótulo (se pierde la clasificación por tarjeta; el selector de arriba queda)', () => {
    const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'TarjetaPublicacionMuro.tsx'), 'utf8');
    expect(fuente).not.toContain('RotuloDeFormacion');
  });
});

describe('un nombre largo no saca nada de la tarjeta', () => {
  it('el nombre se parte en hasta dos líneas y su columna cede ancho (flexShrink), no empuja', () => {
    const r = dibujar(publicacion(), true);
    const nombre = textoDelNombre(r);
    expect(nombre).toBeDefined();
    expect(nombre.props.numberOfLines).toBe(2);
    const [columnaDelNombre, grupoDelAutor] = ancestrosConEstilo(nombre);
    expect(estiloPlano(columnaDelNombre)).toEqual(expect.objectContaining({ flexShrink: 1, minWidth: 0 }));
    // El grupo del autor (foto + nombre) ocupa lo que sobra y se puede encoger.
    expect(estiloPlano(grupoDelAutor)).toEqual(expect.objectContaining({ flex: 1, minWidth: 0, flexDirection: 'row' }));
  });

  it('«grupo · hace cuánto» también es de una sola línea: ninguna de las dos líneas puede ensanchar la fila', () => {
    const r = dibujar(publicacion({ cell: 'Grupo Fénix de la Escuela de Verano 2026' }), true);
    const linea = r.root.findAll(n => (n.type as unknown) === Text && [n.props.children].flat().join('').includes('Grupo Fénix de la'))[0];
    expect(linea.props.numberOfLines).toBe(1);
  });

  it('la insignia del día y el «…» van juntos en una mitad que NO se achica ni se sale (flexShrink 0)', () => {
    const r = dibujar(publicacion(), true);
    const dia = insignia(r)!;
    const moderar = botonModerar(r)!;
    expect(dia).toBeDefined();
    expect(moderar).toBeDefined();
    const mitadDerechaDeLaInsignia = ancestrosConEstilo(dia).find(n => estiloPlano(n).flexShrink === 0);
    const mitadDerechaDelBoton = ancestrosConEstilo(moderar).find(n => estiloPlano(n).flexShrink === 0);
    expect(mitadDerechaDeLaInsignia).toBeDefined();
    // Es LA MISMA caja: la insignia y el «…» comparten la mitad derecha de la cabecera.
    expect(mitadDerechaDelBoton).toBe(mitadDerechaDeLaInsignia);
    expect(estiloPlano(mitadDerechaDeLaInsignia!)).toEqual(expect.objectContaining({ flexDirection: 'row', alignItems: 'center' }));
  });

  it('la cabecera es una fila con las dos mitades separadas (el autor a un lado, la insignia y el «…» al otro) y con aire entre ellas', () => {
    const r = dibujar(publicacion(), true);
    const cabecera = ancestrosConEstilo(textoDelNombre(r))[2];
    expect(estiloPlano(cabecera)).toEqual(
      expect.objectContaining({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }),
    );
  });

  it('con un nombre corto la tarjeta se ve igual: el nombre, el grupo, la insignia y el «…»', () => {
    const r = dibujar(publicacion({ author: 'Ana Paz' }), true);
    expect(textosDe(r)).toEqual(expect.arrayContaining(['Ana Paz', 'Día 1']));
    expect(botonModerar(r)).toBeDefined();
  });

  it('sin día no hay insignia y el «…» sigue arriba a la derecha', () => {
    const r = dibujar(publicacion({ diaPrograma: null }), true);
    expect(insignia(r)).toBeUndefined();
    expect(botonModerar(r)).toBeDefined();
  });
});

/* El hook de verdad + la tarjeta de verdad, como los une ComunidadScreen. */
async function veElMenu(rol: string, contexto: Record<string, unknown> | null): Promise<{ boton: boolean; area: unknown; conInsignia: boolean }> {
  mockUsuario.current = { id: 'u1', role: rol };
  mockCapacidadesDePrograma.mockResolvedValue(contexto);
  function Fila() {
    const puedeModerar = usePuedeModerarElMuro();
    return React.createElement(TarjetaPublicacionMuro, {
      post: publicacion(),
      expandida: false,
      comentariosAbiertos: false,
      destacada: false,
      proporcion: undefined,
      textoComentario: '',
      fotoComentario: null,
      comentariosExpandidos: {},
      confirmacion: null,
      puedeModerar,
      acciones,
    });
  }
  await act(async () => {
    raiz = TestRenderer.create(React.createElement(Fila));
  });
  const boton = botonModerar(raiz!);
  return {
    boton: !!boton,
    area: boton ? estiloPlano(boton) : null,
    conInsignia: !!boton && !!insignia(raiz!) && ancestrosConEstilo(boton).find(n => estiloPlano(n).flexShrink === 0) === ancestrosConEstilo(insignia(raiz!)!).find(n => estiloPlano(n).flexShrink === 0),
  };
}

const COMO_ADMINISTRADOR = { programRequired: false, canStartProgram: false, canAccompany: true, canAdminister: true };

describe('el «…» de moderación, de punta a punta (rol + servidor + tarjeta)', () => {
  it.each(['ADMIN', 'ALCHEMIST'])('%s lo ve arriba a la derecha, junto a la insignia del día y con 48 de área táctil', async rol => {
    const visto = await veElMenu(rol, COMO_ADMINISTRADOR);
    expect(visto.boton).toBe(true);
    expect(visto.conInsignia).toBe(true);
    expect(visto.area).toEqual(expect.objectContaining({ width: 48, height: 48 }));
  });

  it.each(['TRAINEE', 'TRAINEE_GUIDE', 'MENTOR', 'MENTOR_LEAD'])('%s no lo ve, aunque el nombre sea larguísimo', async rol => {
    expect((await veElMenu(rol, COMO_ADMINISTRADOR)).boton).toBe(false);
  });

  it('ADMIN sin la capacidad del servidor tampoco lo ve (y un fallo de la consulta no es un permiso)', async () => {
    expect((await veElMenu('ADMIN', { ...COMO_ADMINISTRADOR, canAdminister: false })).boton).toBe(false);
    act(() => raiz?.unmount());
    raiz = null;
    expect((await veElMenu('ADMIN', null)).boton).toBe(false);
  });
});
