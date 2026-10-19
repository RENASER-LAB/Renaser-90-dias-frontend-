import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { STICKERS_DEL_SEMAFORO, stickerDelSemaforo } from '../stickersDelSemaforo';

/**
 * Los 15 stickers del búho del mensaje del semáforo (spec 006). El servidor manda el NOMBRE y la app lo
 * busca en `STICKERS_DEL_SEMAFORO`: si el catálogo del servidor usa uno que falta, la tarjeta pierde el
 * búho sin avisar. Esta prueba lo frena de los dos lados.
 */

/** Los nombres del contrato `home-semaforo-mensaje` (backend, spec 006). */
const NOMBRES_DEL_CONTRATO = [
  'dorado-orgulloso',
  'dorado-celebrando',
  'dorado-guino',
  'dorado-sereno',
  'dorado-trofeo',
  'azul-animando',
  'azul-pensativo',
  'azul-reloj',
  'azul-firme',
  'azul-decepcionado',
  'azul-ofrece-ala',
  'azul-despertando',
  'azul-entrenando',
  'azul-vs-macaco',
  'azul-sorprendido',
];

const CARPETA = path.resolve(__dirname, '../../../../../assets/stickers/semaforo');
const SUFIJO_DEL_CATALOGO = 'specs/006-mensaje-semaforo-y-podio/data/mensajes-semaforo.json';

/**
 * El catálogo vive en el repo del backend. Se busca donde suele estar en una máquina de desarrollo
 * (variable de entorno, repo hermano o su worktree de la spec); sin él, esa parte de la prueba se salta y
 * las demás siguen contando: el CI del frontend solo no tiene por qué tener el otro repo.
 */
function rutaDelCatalogo(): string | null {
  const raiz = path.resolve(__dirname, '../../../../..');
  const candidatas = [
    process.env.RENASER_CATALOGO_SEMAFORO,
    path.resolve(raiz, '../Renaser-90-dias-backend', SUFIJO_DEL_CATALOGO),
    path.resolve(raiz, '../../../../Renaser-90-dias-backend', SUFIJO_DEL_CATALOGO),
    path.resolve(raiz, '../../../../Renaser-90-dias-backend/.claude/worktrees/006-semaforo-podio', SUFIJO_DEL_CATALOGO),
  ];
  return candidatas.find((ruta): ruta is string => Boolean(ruta) && fs.existsSync(ruta as string)) ?? null;
}

describe('los stickers del semáforo', () => {
  it('el mapa tiene exactamente los 15 del contrato, ni uno más', () => {
    expect(Object.keys(STICKERS_DEL_SEMAFORO).sort()).toEqual([...NOMBRES_DEL_CONTRATO].sort());
  });

  it.each(NOMBRES_DEL_CONTRATO)('«%s» tiene su .webp en assets/stickers/semaforo y pesa 90 KB o menos', nombre => {
    const archivo = path.join(CARPETA, `${nombre}.webp`);
    expect(fs.existsSync(archivo)).toBe(true);
    expect(fs.statSync(archivo).size).toBeLessThanOrEqual(90 * 1024);
  });

  it('no sobra ningún archivo en la carpeta', () => {
    expect(fs.readdirSync(CARPETA).sort()).toEqual(NOMBRES_DEL_CONTRATO.map(n => `${n}.webp`).sort());
  });

  it('cada nombre resuelve a una imagen; null, vacío o un nombre desconocido, a nada', () => {
    for (const nombre of NOMBRES_DEL_CONTRATO) expect(stickerDelSemaforo(nombre)).not.toBeNull();
    expect(stickerDelSemaforo(null)).toBeNull();
    expect(stickerDelSemaforo(undefined)).toBeNull();
    expect(stickerDelSemaforo('')).toBeNull();
    expect(stickerDelSemaforo('violeta-bailando')).toBeNull();
    /* Un nombre heredado de `Object.prototype` no es un sticker. */
    expect(stickerDelSemaforo('toString')).toBeNull();
    expect(stickerDelSemaforo('constructor')).toBeNull();
  });

  const catalogo = rutaDelCatalogo();
  const conCatalogo = catalogo ? it : it.skip;

  conCatalogo('todo sticker que usa el catálogo del servidor (115 mensajes) está en el mapa y en assets', () => {
    const mensajes = JSON.parse(fs.readFileSync(catalogo as string, 'utf8')) as Array<{ id: string; sticker: string }>;
    expect(mensajes).toHaveLength(115);
    const usados = new Set(mensajes.map(m => m.sticker));
    for (const sticker of usados) {
      expect(stickerDelSemaforo(sticker)).not.toBeNull();
      expect(fs.existsSync(path.join(CARPETA, `${sticker}.webp`))).toBe(true);
    }
  });
});
