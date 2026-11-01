import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { cerrarGuiaDelAsistente } from '../admin-alquimista/soporte/fixtures';

declare function require(modulo: string): unknown;
declare const process: { env: Record<string, string | undefined> };
const { readFileSync } = require('node:fs') as { readFileSync(ruta: string, encoding: string): string };
const API = process.env.E2E_API_URL?.replace(/\/+$/, '');
// `E2E_MAPA_ACTORES` es el nombre de antes (cuando esta suite vivía con el recorrido del Mapa, que se retiró): se sigue aceptando.
const archivo = process.env.E2E_ACTORES ?? process.env.E2E_MAPA_ACTORES;
if (!API || !archivo) throw new Error('Faltan E2E_API_URL o E2E_ACTORES.');
type Actor = { id: string; email: string; role: string; case: string };
const semilla = JSON.parse(readFileSync(archivo, 'utf8')) as { password: string; dayOneActors: Actor[] };
if (semilla.dayOneActors?.length !== 35) throw new Error('Preparar cuentas con --con-casos-dia-uno.');
const ACT = '/api/v1/onboarding/activate-program';
const texto = (page: Page, contenido: string) => page.getByText(contenido, { exact: true })
  .and(page.locator(':visible:not([aria-hidden="true"] *)'));
const elegir = (page: Page) => page.getByRole('button', { name: /^Elegir mi Día 1$/i }).first();
const confirmar = (page: Page) => page.getByRole('button', { name: /^CONFIRMAR MI DÍA 1$/i });
const pestaña = (page: Page, nombre: string) => page.getByRole('tab', { name: new RegExp(`^${nombre}$`, 'i') });
const actor = (caso: string) => semilla.dayOneActors.find(a => a.case === caso)!;

async function entrar(page: Page, persona: Actor, onboarding = false) {
  await page.goto('/');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(persona.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(semilla.password);
  const login = page.waitForResponse(r => r.url() === `${API}/api/v1/auth/login` && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const respuesta = await login;
  expect(respuesta.status()).toBe(200);
  expect((await respuesta.json()).role).toBe(persona.role);
  const token = (await respuesta.allHeaders())['x-auth-token'];
  expect(token).toBeTruthy();
  if (!onboarding) {
    await expect(pestaña(page, 'hoy')).toBeVisible();
    await cerrarGuiaDelAsistente(page);
  }
  return token;
}

async function estado(request: APIRequestContext, token: string) {
  const r = await request.get(`${API}${ACT}`, { headers: { 'X-Auth-Token': token } });
  expect(r.status()).toBe(200);
  return r.json() as Promise<{ activated: boolean; startDate: string | null; validStartDates: string[] }>;
}

async function elegirFecha(page: Page, indice = 1) {
  await expect(page.getByRole('heading', { name: 'Elige tu Día 1', exact: true })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(3);
  await page.getByRole('radio').nth(indice).click();
  const respuesta = page.waitForResponse(r => r.url() === `${API}${ACT}` && r.request().method() === 'POST');
  await confirmar(page).click();
  const r = await respuesta;
  expect(r.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Elige tu Día 1', exact: true })).toHaveCount(0);
  return r.request().postDataJSON().startDate as string;
}

async function sinSelectorEnPestañas(page: Page) {
  for (const nombre of ['hoy', 'yo', 'training']) {
    await pestaña(page, nombre).click();
    await expect(elegir(page)).toHaveCount(0);
    await expect(texto(page, 'Todavía no elegiste tu Día 1')).toHaveCount(0);
    await expect(texto(page, 'Hacer mi programa de 90 días')).toHaveCount(0);
  }
}

for (const persona of semilla.dayOneActors.filter(a => ['PENDIENTE', 'FUTURO', 'EN_CURSO', 'GRADUADO', 'SIN_FILA'].includes(a.case))) {
  test(`${persona.role}: cuenta anterior ${persona.case}`, async ({ page, request }) => {
    let envios = 0;
    page.on('request', r => { if (r.url() === `${API}${ACT}` && r.method() === 'POST') envios++; });
    const token = await entrar(page, persona);
    if (persona.case === 'SIN_FILA' && persona.role === 'TRAINEE') {
      // Anomalía de datos: aprobar un aprendiz crea su participación en la misma transacción.
      const r = await request.get(`${API}${ACT}`, { headers: { 'X-Auth-Token': token } });
      expect(r.status()).toBe(404);
      await expect(elegir(page)).toHaveCount(0);
      await pestaña(page, 'training').click();
      await expect(texto(page, 'No pudimos comprobar tu Día 1')).toBeVisible();
      await expect(texto(page, 'No encontramos tu inscripción al programa. Pide al equipo que revise tu cuenta.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reintentar Día 1', exact: true })).toBeVisible();
      expect(envios).toBe(0);
      return;
    }
    const antes = await estado(request, token);
    if (persona.case === 'PENDIENTE') {
      expect(antes.activated).toBe(false);
      expect(antes.startDate).toBeNull();
      // La actualización ofrece la entrada por sí misma; no abre un modal ni confirma una fecha.
      await expect(texto(page, 'Todavía no elegiste tu Día 1')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Elige tu Día 1', exact: true })).toHaveCount(0);
      for (const nombre of ['yo', 'training']) {
        await pestaña(page, nombre).click();
        await expect(texto(page, 'Todavía no elegiste tu Día 1')).toBeVisible();
        await expect(elegir(page)).toBeVisible();
      }
      expect(envios).toBe(0);
      await elegir(page).click();
      await expect(page.getByRole('radio')).toHaveCount(3);
      await page.getByRole('button', { name: 'Volver sin elegir', exact: true }).click();
      expect((await estado(request, token)).activated).toBe(false);
      await pestaña(page, 'yo').click();
      await elegir(page).click();
      const fecha = await elegirFecha(page);
      expect(fecha).toBe(antes.validStartDates[1]);
      expect((await estado(request, token)).startDate).toBe(fecha);
      await sinSelectorEnPestañas(page);
      await page.reload();
      await expect(pestaña(page, 'hoy')).toBeVisible();
      await expect(elegir(page)).toHaveCount(0);
      expect(envios).toBe(1);
    } else if (persona.case === 'SIN_FILA') {
      expect(antes.activated).toBe(false);
      await expect(texto(page, 'Hacer mi programa de 90 días')).toBeVisible();
      await page.getByRole('button', { name: 'Ahora no. No se borra nada.', exact: true }).click();
      await page.reload();
      await expect(pestaña(page, 'hoy')).toBeVisible();
      await expect(texto(page, 'Hacer mi programa de 90 días')).toHaveCount(0);
      for (const nombre of ['yo', 'training']) {
        await pestaña(page, nombre).click();
        await expect(texto(page, 'Hacer mi programa de 90 días')).toBeVisible();
      }
      expect(envios).toBe(0);
      await elegir(page).click();
      const fecha = await elegirFecha(page, 0);
      expect(fecha).toBe(antes.validStartDates[0]);
      await sinSelectorEnPestañas(page);
    } else {
      expect(antes.activated).toBe(true);
      expect(antes.validStartDates).toEqual([]);
      await sinSelectorEnPestañas(page);
      if (persona.case === 'FUTURO') {
        await expect(texto(page, 'Tu programa arranca pronto')).toBeVisible();
      } else {
        await expect(texto(page, 'Tu programa arranca pronto')).toHaveCount(0);
      }
      expect(envios).toBe(0);
      const h = { 'X-Auth-Token': token };
      // Repetir la misma fecha es seguro; una actualización de la app jamás reinicia el reloj.
      expect((await request.post(`${API}${ACT}`, { headers: h, data: { startDate: antes.startDate } })).status()).toBe(200);
      expect((await request.post(`${API}${ACT}`, { headers: h, data: { startDate: '2000-01-01' } })).status()).toBe(409);
      expect((await estado(request, token)).startDate).toBe(antes.startDate);
    }
  });
}

test('un error al consultar el estado ofrece reintento y recupera la entrada', async ({ page, request }) => {
  let fallar = true;
  await page.route(`${API}${ACT}`, r => fallar && r.request().method() === 'GET' ? r.abort('failed') : r.continue());
  const token = await entrar(page, actor('ERROR_ESTADO'));
  await expect(texto(page, 'No pudimos comprobar tu Día 1')).toBeVisible();
  expect((await estado(request, token)).activated).toBe(false);
  fallar = false;
  await page.getByRole('button', { name: 'Reintentar Día 1', exact: true }).click();
  await expect(elegir(page)).toBeVisible();
});

test('una consulta sin respuesta termina en reintento; Training no muestra hábitos operables durante la espera', async ({ page }) => {
  let demorar = true;
  let soltar!: () => void;
  const espera = new Promise<void>(resolve => { soltar = resolve; });
  await page.route(`${API}${ACT}`, async r => {
    if (demorar && r.request().method() === 'GET') await espera;
    try { await r.continue(); } catch { /* La espera puede terminar después del aborto del cliente. */ }
  });
  await entrar(page, actor('LENTO'));
  await pestaña(page, 'training').click();
  await expect(page.getByLabel('Cargando tu entrenamiento', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /planificar|registrar/i })).toHaveCount(0);
  await expect(texto(page, 'No pudimos comprobar tu Día 1')).toBeVisible({ timeout: 25_000 });
  await expect(page.getByLabel('Cargando tu entrenamiento', { exact: true })).toHaveCount(0);
  demorar = false;
  soltar();
  await page.getByRole('button', { name: 'Reintentar Día 1', exact: true }).click();
  await expect(elegir(page)).toBeVisible();
});

test('un error al cargar fechas se recupera dentro del selector', async ({ page, request }) => {
  const token = await entrar(page, actor('ERROR_FECHAS'));
  await expect(elegir(page)).toBeVisible();
  let fallar = true;
  await page.route(`${API}${ACT}`, r => fallar && r.request().method() === 'GET' ? r.abort('failed') : r.continue());
  await elegir(page).click();
  await expect(page.getByRole('button', { name: 'Reintentar Día 1', exact: true })).toBeVisible();
  await expect(confirmar(page)).toBeDisabled();
  fallar = false;
  await page.getByRole('button', { name: 'Reintentar Día 1', exact: true }).click();
  await expect(page.getByRole('radio')).toHaveCount(3);
  expect((await estado(request, token)).activated).toBe(false);
});

test('si fallan capacidades no se oculta definitivamente el programa opcional', async ({ page }) => {
  let fallar = true;
  await page.route(`${API}/api/v1/mentor/context`, r => fallar ? r.abort('failed') : r.continue());
  await entrar(page, actor('ERROR_CAPACIDADES'));
  await expect(texto(page, 'No pudimos comprobar tu Día 1')).toBeVisible();
  fallar = false;
  await page.getByRole('button', { name: 'Reintentar Día 1', exact: true }).click();
  await expect(texto(page, 'Hacer mi programa de 90 días')).toBeVisible();
  await expect(elegir(page)).toBeVisible();
});

test('si se pierde la respuesta del POST, repetir la misma fecha no duplica ni reinicia', async ({ page, request }) => {
  const token = await entrar(page, actor('POST_SIN_RED'));
  await elegir(page).click();
  await expect(page.getByRole('radio')).toHaveCount(3);
  await page.getByRole('radio').nth(2).click();
  let perdida = false;
  await page.route(`${API}${ACT}`, async r => {
    if (r.request().method() === 'POST' && !perdida) {
      perdida = true;
      const enviada = await r.fetch();
      expect(enviada.status()).toBe(200);
      await r.abort('failed');
    } else await r.continue();
  });
  await confirmar(page).click();
  await expect(page.getByText(/Revisa tu conexión|No se pudo conectar/)).toBeVisible();
  const guardada = await estado(request, token);
  expect(guardada.activated).toBe(true);
  await confirmar(page).click();
  await expect(page.getByRole('heading', { name: 'Elige tu Día 1', exact: true })).toHaveCount(0);
  expect((await estado(request, token)).startDate).toBe(guardada.startDate);
});

test('un 400 de fecha fuera de ventana vuelve a consultar y permite elegir una vigente', async ({ page, request }) => {
  const token = await entrar(page, actor('VENTANA'));
  await elegir(page).click();
  await expect(page.getByRole('radio')).toHaveCount(3);
  let primera = true;
  let consultas = 0;
  await page.route(`${API}${ACT}`, async r => {
    if (r.request().method() === 'GET') consultas++;
    if (r.request().method() === 'POST' && primera) {
      primera = false;
      await r.continue({ postData: JSON.stringify({ startDate: '2000-01-01' }) });
    } else await r.continue();
  });
  await confirmar(page).click();
  await expect(texto(page, 'Las fechas disponibles cambiaron. Elige tu Día 1 nuevamente.')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(3);
  expect(consultas).toBeGreaterThan(0);
  expect((await estado(request, token)).activated).toBe(false);
  const fecha = await elegirFecha(page, 2);
  expect((await estado(request, token)).startDate).toBe(fecha);
});

test('si otro dispositivo eligió mientras el selector estaba abierto, conserva su fecha', async ({ page, request }) => {
  const token = await entrar(page, actor('OTRO_DISPOSITIVO'));
  const opciones = (await estado(request, token)).validStartDates;
  await elegir(page).click();
  await expect(page.getByRole('radio')).toHaveCount(3);
  const r = await request.post(`${API}${ACT}`, { headers: { 'X-Auth-Token': token }, data: { startDate: opciones[2] } });
  expect(r.status()).toBe(200);
  const conflicto = page.waitForResponse(r => r.url() === `${API}${ACT}` && r.request().method() === 'POST');
  await confirmar(page).click();
  expect((await conflicto).status()).toBe(409);
  await expect(page.getByRole('heading', { name: 'Elige tu Día 1', exact: true })).toHaveCount(0);
  expect((await estado(request, token)).startDate).toBe(opciones[2]);
  await sinSelectorEnPestañas(page);
});

test('aprendiz que cerró tras Términos retoma directamente la elección del Día 1', async ({ page, request }) => {
  const token = await entrar(page, actor('TERMINOS_SIN_DIA'), true);
  await expect(page.getByRole('heading', { name: 'Elige tu Día 1', exact: true })).toBeVisible();
  await expect(pestaña(page, 'hoy')).toHaveCount(0);
  expect((await estado(request, token)).activated).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Elige tu Día 1', exact: true })).toBeVisible();
  await elegirFecha(page);
  await expect(pestaña(page, 'hoy')).toBeVisible();
});

test('«Ahora no» de una cuenta no esconde el Día 1 de otra en el mismo navegador', async ({ page }) => {
  await entrar(page, actor('CUENTA_A'));
  await page.getByRole('button', { name: 'Ahora no. No se borra nada.', exact: true }).click();
  await pestaña(page, 'yo').click();
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByRole('button', { name: /Cerrar sesión/i }).click();
  await expect(page.getByLabel('Correo electrónico', { exact: true })).toBeVisible();
  await entrar(page, actor('CUENTA_B'));
  await expect(texto(page, 'Hacer mi programa de 90 días')).toBeVisible();
  await expect(elegir(page)).toBeVisible();
});
