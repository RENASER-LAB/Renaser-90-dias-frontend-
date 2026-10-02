import { describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

/**
 * La página pública `/eliminar-cuenta` (D-243, la que pide Google Play): HTML estático en
 * `public/eliminar-cuenta/index.html`, servido por `vercel.json` antes del rewrite a la app.
 *
 * Se carga el HTML real en jsdom y se corre su JavaScript con un `fetch` falso: lo que se prueba es
 * exactamente lo que se publica.
 */

const RAIZ = path.join(__dirname, '../../../..');
const HTML = fs.readFileSync(path.join(RAIZ, 'public/eliminar-cuenta/index.html'), 'utf8');

type Respuesta = { status: number; cuerpo?: unknown };
type Llamada = { url: string; cuerpo: unknown };

async function abrir(url: string, respuestas: Respuesta[] = []) {
  const llamadas: Llamada[] = [];
  const cola = [...respuestas];
  const dom = new JSDOM(HTML, {
    url,
    runScripts: 'dangerously',
    beforeParse(window) {
      (window as unknown as { fetch: unknown }).fetch = jest.fn(async (u: string, init?: { body?: string }) => {
        llamadas.push({ url: u, cuerpo: init?.body ? JSON.parse(init.body) : undefined });
        const r = cola.shift() ?? { status: 202 };
        return {
          status: r.status,
          ok: r.status >= 200 && r.status < 300,
          json: async () => r.cuerpo,
        };
      });
    },
  });
  const doc = dom.window.document;
  // El script arranca con DOMContentLoaded, que jsdom dispara después de construir el documento.
  if (doc.readyState === 'loading') {
    await new Promise(r => doc.addEventListener('DOMContentLoaded', r));
  }
  const $ = (id: string) => doc.getElementById(id) as HTMLElement & { value: string; disabled: boolean; hidden: boolean };
  const escribir = (id: string, valor: string) => {
    $(id).value = valor;
    $(id).dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  const enviar = (id: string) => $(id).dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  const tocar = (id: string) => $(id).dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  return { dom, doc, $, escribir, enviar, tocar, llamadas };
}

const esperar = () => new Promise(r => setTimeout(r, 0));

describe('sin JavaScript', () => {
  it('el HTML ya dice cómo eliminarla, qué se borra y en qué plazo', () => {
    const sinScripts = new JSDOM(HTML).window.document; // jsdom no corre scripts por defecto
    const texto = sinScripts.body.textContent ?? '';
    expect(texto).toContain('Eliminar tu cuenta de Renaser 90 días');
    expect(texto).toContain('Yo → Eliminar mi cuenta');
    expect(texto).toMatch(/se cierra al instante/i);
    expect(texto).toContain('Durante 30 días');
    expect(texto).toMatch(/se borran para siempre/);
    for (const dato of ['perfil', 'progreso', 'hábitos', 'evidencias', 'fotos', 'audios', 'mensajes', 'publicaciones']) {
      expect(texto).toContain(dato);
    }
    expect(sinScripts.querySelector('noscript')?.textContent).toContain('activa JavaScript');
    expect((sinScripts.getElementById('formulario') as HTMLElement).hidden).toBe(true);
  });

  it('vercel.json la sirve antes del rewrite a la app', () => {
    const vercel = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8')) as { rewrites: { source: string; destination: string }[] };
    const i = vercel.rewrites.findIndex(r => r.source === '/eliminar-cuenta');
    expect(vercel.rewrites[i].destination).toBe('/eliminar-cuenta/index.html');
    expect(i).toBeLessThan(vercel.rewrites.findIndex(r => r.source === '/(.*)'));
  });
});

describe('la API', () => {
  const base = async (url: string) =>
    ((await abrir(url)).dom.window as unknown as { RenaserEliminarCuenta: { baseDeLaApi: (l: Location) => string } }).RenaserEliminarCuenta.baseDeLaApi(
      new URL(url) as unknown as Location,
    );

  it('es la de producción, y solo en localhost/127.0.0.1 se puede cambiar con ?api=', async () => {
    expect(await base('https://renaser-90-dias-frontend-livid.vercel.app/eliminar-cuenta')).toBe('https://djbooeq09skac.cloudfront.net');
    expect(await base('https://renaser-90-dias-frontend-livid.vercel.app/eliminar-cuenta?api=https://malo.example')).toBe(
      'https://djbooeq09skac.cloudfront.net',
    );
    expect(await base('https://localhost.malo.example/eliminar-cuenta?api=https://malo.example')).toBe('https://djbooeq09skac.cloudfront.net');
    expect(await base('http://localhost:8081/eliminar-cuenta?api=http://localhost:8099/')).toBe('http://localhost:8099');
    expect(await base('http://127.0.0.1:8081/eliminar-cuenta?api=http://127.0.0.1:8099')).toBe('http://127.0.0.1:8099');
    expect(await base('http://localhost:8081/eliminar-cuenta?api=javascript:alert(1)')).toBe('https://djbooeq09skac.cloudfront.net');
  });
});

describe('el formulario', () => {
  const URL_PAGINA = 'https://renaser-90-dias-frontend-livid.vercel.app/eliminar-cuenta';

  it('con JavaScript se muestra', async () => {
    expect((await abrir(URL_PAGINA)).$('formulario').hidden).toBe(false);
  });

  it('el mismo mensaje exista o no el correo', async () => {
    for (const status of [202, 404]) {
      const p = await abrir(URL_PAGINA, [{ status }]);
      p.escribir('correo', ' ana@correo.com ');
      p.enviar('paso-correo');
      await esperar();
      expect(p.llamadas[0]).toEqual({
        url: 'https://djbooeq09skac.cloudfront.net/api/v1/account-deletion/request-code',
        cuerpo: { email: 'ana@correo.com' },
      });
      expect(p.$('mensaje-correo').textContent).toBe('Si hay una cuenta con ese correo, te llegó un código.');
      expect(p.$('paso-codigo').hidden).toBe(false);
    }
  });

  it('429 al pedir el código', async () => {
    const p = await abrir(URL_PAGINA, [{ status: 429 }]);
    p.escribir('correo', 'ana@correo.com');
    p.enviar('paso-correo');
    await esperar();
    expect(p.$('mensaje-correo').textContent).toBe('Demasiados intentos, prueba más tarde.');
    expect(p.$('paso-codigo').hidden).toBe(true);
  });

  it('un correo sin forma no se envía', async () => {
    const p = await abrir(URL_PAGINA);
    p.escribir('correo', 'ana@');
    p.enviar('paso-correo');
    await esperar();
    expect(p.llamadas).toHaveLength(0);
  });

  it('código → confirmación → cerrada, con la fecha del borrado', async () => {
    const p = await abrir(URL_PAGINA, [
      { status: 202 },
      { status: 200, cuerpo: { cerradaEn: '2026-10-02T15:00:00Z', seBorraEl: '2026-11-01T15:00:00Z', diasDeGracia: 30 } },
    ]);
    p.escribir('correo', 'ana@correo.com');
    p.enviar('paso-correo');
    await esperar();

    p.escribir('codigo', '12a34');
    expect(p.$('codigo').value).toBe('1234');
    expect(p.$('eliminar').disabled).toBe(true);
    p.escribir('codigo', '123456');
    expect(p.$('eliminar').disabled).toBe(false);

    p.enviar('paso-codigo');
    expect(p.$('confirmacion').hidden).toBe(false);
    expect(p.llamadas).toHaveLength(1);

    p.tocar('confirmar');
    await esperar();
    await esperar();
    expect(p.llamadas[1]).toEqual({
      url: 'https://djbooeq09skac.cloudfront.net/api/v1/account-deletion/confirm',
      cuerpo: { email: 'ana@correo.com', codigo: '123456' },
    });
    expect(p.$('final').hidden).toBe(false);
    expect(p.$('texto-final').textContent).toContain('Se borrará el 1 de noviembre de 2026.');
  });

  it.each([
    [400, 'Código incorrecto o vencido.'],
    [429, 'Demasiados intentos, prueba más tarde.'],
  ])('confirmar con %s', async (status, mensaje) => {
    const p = await abrir(URL_PAGINA, [{ status: 202 }, { status }]);
    p.escribir('correo', 'ana@correo.com');
    p.enviar('paso-correo');
    await esperar();
    p.escribir('codigo', '123456');
    p.enviar('paso-codigo');
    p.tocar('confirmar');
    await esperar();
    expect(p.$('mensaje-codigo').textContent).toBe(mensaje);
    expect(p.$('final').hidden).toBe(true);
  });

  it('cancelar la confirmación no envía nada', async () => {
    const p = await abrir(URL_PAGINA, [{ status: 202 }]);
    p.escribir('correo', 'ana@correo.com');
    p.enviar('paso-correo');
    await esperar();
    p.escribir('codigo', '123456');
    p.enviar('paso-codigo');
    p.tocar('cancelar');
    expect(p.$('confirmacion').hidden).toBe(true);
    expect(p.llamadas).toHaveLength(1);
  });
});
