/**
 * D-255 del backend (06/10, pedido del dueño): «Me dijeron que quites a Sparkie, porque los usuarios
 * se confunden, y que SER haga lo mismo». En la app ya no hay Sparkie: el botón del curso abre a SER
 * con el curso de contexto, y la pregunta viaja con `courseId` y `scope` aunque el agente sea SER.
 *
 * Contra el código anterior falla: el botón decía «Pregúntale a Sparkie» y abría `COURSE_TUTOR`, y
 * `armarCuerpo` solo mandaba el curso y el ámbito con `COURSE_TUTOR`.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('../../../config/apiConfig', () => ({ API_CONFIG: { BASE_URL: 'http://api' } }));
jest.mock('../../../services/http/apiClient', () => ({
  getTokenSesion: () => 'token',
  notificarSesionVencida: jest.fn(),
}));

import { fetch as expoFetch } from 'expo/fetch';
import { enviarMensajeRenasia } from '../api/renasiaStream';

const RAIZ = path.resolve(__dirname, '../../..');

function archivosFuente(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entrada => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return entrada.name === '__tests__' ? [] : archivosFuente(ruta);
    return /\.(ts|tsx)$/.test(entrada.name) ? [ruta] : [];
  });
}

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('sin Sparkie en la app (D-255)', () => {
  // «Sparkie» suelto: `SparkieOverlay` y la carpeta `features/sparkie` son el arranque guiado, que ya
  // se presenta como SER (nombre técnico, D-102); no son el tutor de cursos y nadie los ve escritos.
  it('ningún código de la app nombra a Sparkie ni pide el tutor de cursos', () => {
    const conSparkie = archivosFuente(RAIZ).flatMap(archivo =>
      sinComentarios(fs.readFileSync(archivo, 'utf8'))
        .split('\n')
        .filter(linea => /\bSparkie\b|COURSE_TUTOR|NOMBRE_TUTOR_CURSOS/.test(linea))
        .map(linea => `${path.relative(RAIZ, archivo)}: ${linea.trim()}`)
    );
    expect(conSparkie).toEqual([]);
  });

  it('el botón del curso abre a SER, con su nombre y su orbe', () => {
    const boton = sinComentarios(fs.readFileSync(path.join(RAIZ, 'features/renasia/components/ChatDelCurso.tsx'), 'utf8'));
    expect(boton).toMatch(/agent="COMPANION"/);
    expect(boton).toMatch(/Pregúntale a \{NOMBRE_ACOMPANANTE\}/);
    expect(boton).toMatch(/<OrbeQuieto size=\{36\}/);
  });
});

describe('SER abierto desde un curso manda el curso y el ámbito', () => {
  const fetchFalso = expoFetch as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>;

  beforeEach(() => {
    fetchFalso.mockReset();
    // Un 500 corta el envío apenas sale el pedido: acá solo importa el cuerpo que se mandó.
    fetchFalso.mockResolvedValue({ ok: false, status: 500, text: async () => 'no' });
  });

  async function cuerpoEnviado(opciones: Parameters<typeof enviarMensajeRenasia>[1]) {
    await expect(enviarMensajeRenasia('¿cómo se hace el ritual?', opciones, { onTexto: () => {}, onFin: () => {} }))
      .rejects.toThrow();
    const init = fetchFalso.mock.calls[0][1] as { body: string };
    return JSON.parse(init.body);
  }

  it('con curso y ámbito, viajan aunque el agente sea SER', async () => {
    expect(
      await cuerpoEnviado({ agent: 'COMPANION', courseId: 'curso-1', scope: 'el curso "Fase II"' })
    ).toEqual({
      question: '¿cómo se hace el ritual?',
      agent: 'COMPANION',
      courseId: 'curso-1',
      scope: 'el curso "Fase II"',
    });
  });

  it('desde el flotante, sin curso, no manda nada de más', async () => {
    expect(await cuerpoEnviado({ agent: 'COMPANION' })).toEqual({
      question: '¿cómo se hace el ritual?',
      agent: 'COMPANION',
    });
  });
});
