import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * #235 (2026-11-19, decisión del dueño): la ficha no inventa la ubicación de nadie.
 *
 * `detectUserLocation` daba la ciudad del proveedor de internet como si fuera la de la persona (y la ciudad como distrito) y, si
 * `ipapi.co` no respondía en 2 s, devolvía lugares fijos como si se hubieran detectado: Cayma (Arequipa), Equipetrol, Chapinero,
 * Cuauhtémoc, Malasaña o Brickell (Miami). Ahora solo dice el PAÍS (con su ISO, su bandera y su prefijo): por IP o, si falla, por la
 * zona horaria; y si no se sabe ni el país, devuelve `null` y no se rellena nada.
 *
 * Contra el código de antes estas pruebas fallan: devolvía departamento, ciudad y distrito, y sin red ni zona conocida respondía Perú.
 */

import { LocationService } from '../locationService';

const NOMBRES_INVENTADOS = /Cayma|Equipetrol|Chapinero|Cuauht[ée]moc|Malasa[ñn]a|Brickell|Miami|Santa Cruz de la Sierra|Arequipa/;

const realFetch = globalThis.fetch;
let zonaHoraria = 'America/Lima';

function respuestaDeIp(cuerpo: unknown) {
  globalThis.fetch = jest.fn(async () => ({ ok: true, json: async () => cuerpo })) as unknown as typeof fetch;
}

function sinRed() {
  globalThis.fetch = jest.fn(async () => {
    throw new Error('Network request failed');
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  zonaHoraria = 'America/Lima';
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
    () => ({ resolvedOptions: () => ({ timeZone: zonaHoraria }) }) as unknown as Intl.DateTimeFormat,
  );
});

afterEach(() => {
  globalThis.fetch = realFetch;
  jest.restoreAllMocks();
});

describe('detectUserLocation solo dice el país (#235)', () => {
  it('por IP: país, ISO, bandera y prefijo; nunca la ciudad ni la región del proveedor', async () => {
    respuestaDeIp({ country_code: 'PE', country_name: 'Peru', region: 'Lima', city: 'Lima', country_calling_code: '+51' });

    const lugar = await LocationService.detectUserLocation();

    expect(lugar).toEqual({ pais: 'Perú', codigoPais: '+51', iso: 'PE', flag: '🇵🇪' });
    expect(Object.keys(lugar!).sort()).toEqual(['codigoPais', 'flag', 'iso', 'pais']);
  });

  it('por IP el país sale con el nombre de la lista de la app (en español), no el de ipapi', async () => {
    respuestaDeIp({ country_code: 'ES', country_name: 'Spain', region: 'Madrid', city: 'Madrid' });
    expect(await LocationService.detectUserLocation()).toEqual({ pais: 'España', codigoPais: '+34', iso: 'ES', flag: '🇪🇸' });
  });

  it('sin respuesta de la IP, usa la zona horaria, y también solo el país', async () => {
    const zonas: Record<string, string> = {
      'America/Lima': 'PE',
      'America/La_Paz': 'BO',
      'America/Bogota': 'CO',
      'America/Mexico_City': 'MX',
      'Europe/Madrid': 'ES',
      'America/New_York': 'US',
      'America/Chicago': 'US',
      'America/Los_Angeles': 'US',
    };
    sinRed();
    for (const [zona, iso] of Object.entries(zonas)) {
      zonaHoraria = zona;
      const lugar = await LocationService.detectUserLocation();
      expect(lugar?.iso).toBe(iso);
      expect(Object.keys(lugar!).sort()).toEqual(['codigoPais', 'flag', 'iso', 'pais']);
      expect(JSON.stringify(lugar)).not.toMatch(NOMBRES_INVENTADOS);
    }
  });

  it('una IP que responde sin país cae en la zona horaria', async () => {
    respuestaDeIp({ error: true, reason: 'RateLimited' });
    zonaHoraria = 'America/Bogota';
    expect((await LocationService.detectUserLocation())?.pais).toBe('Colombia');
  });

  it('si no se sabe ni el país (sin red y zona desconocida), devuelve null: no se rellena nada, ni siquiera Perú', async () => {
    sinRed();
    for (const zona of ['Asia/Tokyo', 'Africa/Cairo', '']) {
      zonaHoraria = zona;
      expect(await LocationService.detectUserLocation()).toBeNull();
    }
  });

  it('un código de país que la app no tiene tampoco se inventa', async () => {
    respuestaDeIp({ country_code: 'ZZ', country_name: 'Nowhere' });
    zonaHoraria = 'Asia/Tokyo';
    expect(await LocationService.detectUserLocation()).toBeNull();
  });
});

describe('El código de la detección no trae lugares fijos (#235)', () => {
  const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'locationService.ts'), 'utf8');

  /** El tramo de código entre dos marcas, sin comentarios (nombrar lo que se quitó en un comentario está bien). */
  function codigoEntre(desde: string, hasta: string): string {
    const ini = fuente.indexOf(desde);
    const fin = fuente.indexOf(hasta, ini);
    expect(ini).toBeGreaterThanOrEqual(0);
    expect(fin).toBeGreaterThan(ini);
    return fuente
      .slice(ini, fin)
      .split('\n')
      .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
  }

  it('ni en el tipo, ni en la función, ni en sus ayudas aparece un lugar fijo, un departamento, una ciudad o un distrito', () => {
    const tramos = [
      codigoEntre('export interface DetectedLocation', '// 100% Instant In-Memory Dataset for Countries'),
      codigoEntre('function paisPorIso', '// In-memory search cache'),
      codigoEntre('static async detectUserLocation', 'static async searchGooglePlaces'),
    ];
    for (const codigo of tramos) {
      expect(codigo).not.toMatch(NOMBRES_INVENTADOS);
      expect(codigo).not.toMatch(/\b(departamento|ciudad|distrito)\b/i);
    }
  });

  it('el geocodificado inverso por GPS (reverseGeocodeGPS) ya no existe: nadie lo usa y sus reglas leían mal el distrito peruano', () => {
    expect(fuente).not.toMatch(/reverseGeocodeGPS/);
  });
});
