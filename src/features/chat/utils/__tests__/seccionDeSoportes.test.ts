/**
 * D-249: la sección «Soporte» de Tribu para Admin y Alquimista. Contra el código anterior no existe: los
 * soportes iban mezclados con los grupos en «Formación Renaser», una fila por aprendiz.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import type { ChatConversation } from '../../../../screens/ComunidadScreen';
import {
  agregarPagina,
  cercaDelFinal,
  filaAlDia,
  rotuloDeLaSeccion,
  soportesConNoLeidos,
  tiposDeFormacion,
  veLaSeccionDeSoportes,
} from '../seccionDeSoportes';

const conv = (id: string, type: ChatConversation['type'] = 'soporte', unreadCount = 0) =>
  ({ id, type, unreadCount, lastMessage: '', messages: [] }) as unknown as ChatConversation;

describe('quién ve la sección de soportes', () => {
  it('solo Admin y Alquimista; ellos ya no ven los soportes entre los grupos', () => {
    for (const rol of ['ADMIN', 'ALCHEMIST', 'admin']) {
      expect(veLaSeccionDeSoportes(rol)).toBe(true);
      expect(tiposDeFormacion(rol)).toEqual(['global', 'celula']);
    }
    for (const rol of ['TRAINEE', 'MENTOR', 'MENTOR_LEAD', null, undefined]) {
      expect(veLaSeccionDeSoportes(rol)).toBe(false);
      // El aprendiz sigue viendo su único soporte entre sus grupos, como antes.
      expect(tiposDeFormacion(rol)).toEqual(['global', 'celula', 'soporte']);
    }
  });
});

describe('las páginas', () => {
  it('se suman sin repetir un soporte que subió entre página y página', () => {
    const juntas = agregarPagina([conv('a'), conv('b')], [conv('b'), conv('c'), conv('c')]);
    expect(juntas.map(c => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('se pide la siguiente al acercarse al final, no antes', () => {
    const vista = { layoutMeasurement: { height: 800 }, contentSize: { height: 5000 } };
    expect(cercaDelFinal({ ...vista, contentOffset: { y: 1000 } })).toBe(false);
    expect(cercaDelFinal({ ...vista, contentOffset: { y: 3700 } })).toBe(true);
    expect(cercaDelFinal({ ...vista, contentOffset: { y: 4200 } })).toBe(true);
  });
});

describe('lo que se pinta', () => {
  it('cada fila toma su versión de la lista completa si la tiene (último mensaje y no leídos al día)', () => {
    const vieja = conv('a', 'soporte', 3);
    const alDia = conv('a', 'soporte', 0);
    expect(filaAlDia(vieja, new Map([['a', alDia]]))).toBe(alDia);
    expect(filaAlDia(vieja, new Map())).toBe(vieja);
  });

  it('el contador cuenta soportes con mensajes sin leer, de la lista completa si los trae', () => {
    const lista = [conv('g', 'global', 5), conv('a', 'soporte', 2), conv('b', 'soporte', 0), conv('c', 'soporte', 1)];
    expect(soportesConNoLeidos(lista, 40)).toBe(2);
    expect(soportesConNoLeidos([conv('g', 'global', 5)], 7)).toBe(7);
    expect(soportesConNoLeidos([], null)).toBe(0);
  });

  it('el rótulo dice cuántos hay', () => {
    expect(rotuloDeLaSeccion(312)).toBe('Soporte · 312');
    expect(rotuloDeLaSeccion(null)).toBe('Soporte');
  });
});

describe('la pantalla', () => {
  const texto = fs.readFileSync(path.resolve(__dirname, '../../../../screens/ComunidadScreen.tsx'), 'utf-8');

  it('arma «Formación Renaser» con los tipos del rol', () => {
    expect(texto).toMatch(/const TIPOS_DE_FORMACION = tiposDeFormacion\(user\?\.role\);/);
  });

  it('la lista de Tribu sigue con la barra y el encabezado que se esconden, y suma el pedir más', () => {
    expect(texto).toMatch(/\{\.\.\.barraAlDesplazar\}\s*onScroll=\{alDesplazarTribu\}/);
    expect(texto).toMatch(/const alDesplazarTribu = [^]*?barraAlDesplazar\.onScroll\(evento\);[^]*?soportes\.pedirMas\(\)/);
  });

  it('la sección va después de los directos', () => {
    expect(texto.indexOf('<SeccionDeSoportes')).toBeGreaterThan(texto.indexOf('{directos.map(conv =>'));
  });
});
