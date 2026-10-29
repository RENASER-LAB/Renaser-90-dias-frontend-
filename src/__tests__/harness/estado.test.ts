import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * El estado del proyecto que lee cada sesión al empezar (2026-10-29): `PROGRESO.md` y `funcionalidades.json`.
 *
 * Los dos sirven solo si dicen la verdad y se pueden leer de un vistazo:
 *
 * - **Nada pasa a «pasando» sin evidencia que se pueda revisar** (un PR, un archivo o un enlace). Es la «puerta» de
 *   learn-harness-engineering: el agente que da algo por terminado porque el código «se ve bien» es el error que más
 *   se repite. Lo que está en master sin evidencia registrada se queda en «sin_verificar».
 * - Cada estado y cada valor de publicación es uno de la leyenda del propio archivo: un estado inventado no lo
 *   entiende la sesión siguiente.
 * - Una funcionalidad «en_curso» dice en qué rama, para que otra sesión no la empiece de nuevo.
 * - `PROGRESO.md` no pasa de 150 líneas: es el estado de hoy, no una bitácora (la historia queda en git).
 */

const RAIZ = path.resolve(__dirname, '..', '..', '..');

type Funcionalidad = {
  id: string;
  estado: string;
  rama?: string;
  evidencia: string[];
  publicacion: { backend: string; app: string };
};

const lista = JSON.parse(fs.readFileSync(path.join(RAIZ, 'funcionalidades.json'), 'utf8')) as {
  leyenda: Record<string, string>;
  leyenda_publicacion: { backend: Record<string, string>; app: Record<string, string> };
  funcionalidades: Funcionalidad[];
};

const REVISABLE = /#\d+|\.(md|ya?ml|json|ts|tsx)\b|https?:\/\//;

describe('funcionalidades.json', () => {
  it('no repite ids', () => {
    const ids = lista.funcionalidades.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usa solo los estados y valores de publicación de su leyenda', () => {
    for (const f of lista.funcionalidades) {
      expect({ id: f.id, estado: Object.keys(lista.leyenda).includes(f.estado) }).toEqual({ id: f.id, estado: true });
      expect(Object.keys(lista.leyenda_publicacion.backend)).toContain(f.publicacion.backend);
      expect(Object.keys(lista.leyenda_publicacion.app)).toContain(f.publicacion.app);
    }
  });

  it('nada está «pasando» sin evidencia que se pueda revisar', () => {
    for (const f of lista.funcionalidades.filter((x) => x.estado === 'pasando')) {
      expect({ id: f.id, conEvidencia: f.evidencia.length > 0 }).toEqual({ id: f.id, conEvidencia: true });
      for (const e of f.evidencia) expect({ id: f.id, evidencia: e, revisable: REVISABLE.test(e) }).toMatchObject({ revisable: true });
    }
  });

  it('lo que está «en_curso» dice en qué rama', () => {
    for (const f of lista.funcionalidades.filter((x) => x.estado === 'en_curso')) {
      expect({ id: f.id, rama: Boolean(f.rama?.trim()) }).toEqual({ id: f.id, rama: true });
    }
  });
});

describe('PROGRESO.md', () => {
  it('no pasa de 150 líneas', () => {
    const progreso = fs.readFileSync(path.join(RAIZ, 'PROGRESO.md'), 'utf8');
    expect(progreso.split('\n').length).toBeLessThanOrEqual(150);
  });
});
