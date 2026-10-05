/**
 * Los íconos de la barra de pestañas (pedido del dueño, 2026-10-05: «la parte de abajo, íconos que
 * le correspondan»).
 *
 * Contra el código anterior fallan las tres primeras pruebas: la barra dibujaba `sun`, `doc`,
 * `diamond` (fijo en el botón de TRAINING, fuera del mapa), `users` y `user`, y los cinco ya
 * significaban otra cosa dentro de la app. La de los nombres es de no-regresión: el dueño decidió
 * el 2026-09-15 que los cinco nombres se ven siempre, y un cambio de íconos no puede quitarlos.
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Circle, Path, Rect } from 'react-native-svg';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

jest.mock('../../theme/ThemeContext', () => {
  const tokens = jest.requireActual<typeof import('../../theme/tokens')>('../../theme/tokens');
  return {
    useTheme: () => ({ mode: 'light', c: tokens.light, t: tokens.type, space: tokens.space, toggle: () => undefined, setMode: () => undefined }),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}));

import { TabBar } from '../TabBar';
import { GROSOR_TRAZO_PX, Icon, type IconName } from '../Icon';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RUTAS = ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo'];
const NOMBRES = ['HOY', 'PLAN', 'TRAINING', 'COMUNIDAD', 'YO'];

const ESPERADOS: Record<string, IconName> = {
  HOY: 'house',
  PLAN: 'clipboardList',
  TRAINING: 'bicepsFlexed',
  COMUNIDAD: 'usersThree',
  YO: 'circleUser',
};

/**
 * Dibujos que YA significan otra cosa dentro de la app (inventario del 2026-10-05). Ninguno puede
 * ser el de una pestaña: el mismo dibujo con dos sentidos es justo lo que no se entiende.
 */
const YA_SIGNIFICAN_OTRA_COSA: Partial<Record<IconName, string>> = {
  sun: 'el modo claro (Ajustes y onboarding) y el ritual del mediodía',
  sunMedium: 'el ritual de la mañana',
  sunrise: 'Despertar',
  moon: 'el modo oscuro y Dormir',
  doc: 'un recurso de lección, una evidencia de texto y «Reporte del mes»',
  fileText: 'una lección de lectura',
  diamond: 'la fase 2 del programa, Compromiso y Negocio en el onboarding',
  spark: 'Espíritu',
  users: 'la Tribu, el grupo, la célula y Administración',
  user: '«Editar perfil» y los campos de nombre del registro',
  idCard: '«Ver ficha» e «Información»',
  map: 'el Mapa de Renacimiento',
  flag: 'el objetivo principal de 90 días',
  target: 'las acciones',
  activity: 'el eje Cuerpo',
  heartHandshake: 'el eje Relaciones',
  briefcase: 'el eje Negocio',
  calendar: 'Eventos y el calendario',
  calendarRange: '«Tu semana»',
  listChecks: '«Hábitos de hoy» y «Mi onboarding»',
  dumbbell: 'el hábito Entrenar',
  flame: 'la racha',
  zap: 'los puntos',
  trophy: 'el Ranking',
  globe: 'el chat de toda la comunidad',
  messageCircle: '«Escribir» y «Comentar»',
  chat: '«Comentar» y «Escribirle»',
  compass: 'el Código Renaser',
  settings: 'Ajustes',
  gauge: 'Coherencia',
  layoutGrid: 'las tarjetas de Eventos',
};

function dibujar(indice: number): ReactTestRenderer {
  const routes = RUTAS.map(name => ({ key: `${name}-k`, name }));
  const props = {
    state: { index: indice, routes },
    descriptors: Object.fromEntries(routes.map(r => [r.key, { options: {} }])),
    navigation: { navigate: () => undefined },
  } as unknown as React.ComponentProps<typeof TabBar>;
  let raiz!: ReactTestRenderer;
  act(() => {
    raiz = TestRenderer.create(React.createElement(TabBar, props));
  });
  return raiz;
}

/** La pestaña (el `Pressable` con su nombre para el lector de pantalla). */
function pestana(raiz: ReactTestRenderer, nombre: string): ReactTestInstance {
  return raiz.root.findAll(n => n.props.accessibilityRole === 'tab' && n.props.accessibilityLabel === nombre)[0];
}

function iconosDe(nodo: ReactTestInstance): ReactTestInstance[] {
  return nodo.findAll(n => n.type === Icon);
}

const iconoDeLaBarra = (raiz: ReactTestRenderer, nombre: string): IconName => {
  const iconos = iconosDe(pestana(raiz, nombre));
  expect(iconos).toHaveLength(1);
  return iconos[0].props.name as IconName;
};

describe('los íconos de la barra de pestañas', () => {
  it('cada pestaña lleva el suyo, también el botón dorado de TRAINING', () => {
    const raiz = dibujar(0);
    const dibujados = Object.fromEntries(NOMBRES.map(n => [n, iconoDeLaBarra(raiz, n)]));
    expect(dibujados).toEqual(ESPERADOS);
  });

  it('son cinco dibujos distintos', () => {
    const raiz = dibujar(0);
    expect(new Set(NOMBRES.map(n => iconoDeLaBarra(raiz, n))).size).toBe(5);
  });

  it('ninguno es un dibujo que ya significa otra cosa en la app', () => {
    const raiz = dibujar(0);
    const choques = NOMBRES.map(n => iconoDeLaBarra(raiz, n))
      .filter(icono => icono in YA_SIGNIFICAN_OTRA_COSA)
      .map(icono => `${icono}: ${YA_SIGNIFICAN_OTRA_COSA[icono]}`);
    expect(choques).toEqual([]);
  });

  it('ni se usa en ninguna otra parte del código', () => {
    /* La lista de arriba es la de hoy; esta mira el código: si mañana alguien usa la casa o la
       planilla para otra cosa, la prueba avisa. Si el uso nuevo significa lo MISMO que la pestaña
       (p. ej. «Volver al inicio» con la casa), se agrega acá como excepción con su razón. */
    const raiz = dibujar(0);
    const iconos = NOMBRES.map(n => iconoDeLaBarra(raiz, n));
    const src = path.resolve(__dirname, '../..');
    const propios = new Set([path.join(src, 'components', 'Icon.tsx'), path.join(src, 'components', 'TabBar.tsx')]);
    const archivos: string[] = [];
    const recorrer = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const ruta = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== '__tests__') recorrer(ruta);
        } else if (/\.tsx?$/.test(e.name) && !propios.has(ruta)) {
          archivos.push(ruta);
        }
      }
    };
    recorrer(src);
    const usos = archivos.flatMap(f => {
      const texto = fs.readFileSync(f, 'utf8');
      return iconos.filter(i => new RegExp(`['"\`]${i}['"\`]`).test(texto)).map(i => `${i} en ${path.relative(src, f)}`);
    });
    expect(usos).toEqual([]);
  });

  it('los cinco nombres se siguen viendo, esté donde esté uno (decisión del 2026-09-15)', () => {
    for (let indice = 0; indice < RUTAS.length; indice++) {
      const raiz = dibujar(indice);
      const textos = raiz.root.findAll(n => (n.type as unknown) === 'Text').map(n => String(n.props.children));
      expect(textos).toEqual(NOMBRES);
      for (const nombre of NOMBRES) {
        const enLaPestana = pestana(raiz, nombre).findAll(n => (n.type as unknown) === 'Text');
        expect(enLaPestana.map(n => n.props.children)).toEqual([nombre]);
      }
    }
  });

  it('se dibujan con el trazo de toda la app (1,75 px reales)', () => {
    for (const nombre of Object.values(ESPERADOS)) {
      for (const size of [20, 22]) {
        let raiz!: ReactTestRenderer;
        act(() => {
          raiz = TestRenderer.create(React.createElement(Icon, { name: nombre, size, color: '#000' }));
        });
        const conTrazo = [Path, Circle, Rect]
          .flatMap(tipo => raiz.root.findAll(n => n.type === tipo))
          .filter(n => n.props.stroke !== undefined);
        expect(conTrazo.length).toBeGreaterThan(0);
        for (const n of conTrazo) expect((Number(n.props.strokeWidth) * size) / 24).toBeCloseTo(GROSOR_TRAZO_PX, 6);
      }
    }
  });
});
