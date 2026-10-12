import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { cerrarGuiaDelAsistente } from '../admin-alquimista/soporte/fixtures';

declare function require(modulo: string): unknown;
declare const process: { env: Record<string, string | undefined> };
const { readFileSync } = require('node:fs') as {
  readFileSync(ruta: string, encoding: string): string;
};

type ActorDelMapa = {
  id: string;
  email: string;
  role: 'MENTOR' | 'ADMIN' | 'ALCHEMIST' | 'MENTOR_LEAD' | 'TRAINEE';
};

function requerida(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta ${nombre}; ver e2e/mapa-poder/README.md.`);
  return valor;
}

const API = requerida('E2E_API_URL').replace(/\/+$/, '');
// Solo cuentas NUEVAS de la base aislada. El archivo con los correos queda fuera del repositorio.
const semilla = JSON.parse(readFileSync(requerida('E2E_MAPA_ACTORES'), 'utf8')) as {
  password: string;
  actors: ActorDelMapa[];
};
const CLAVE = semilla.password;
const actores = semilla.actors;
const roles = ['MENTOR', 'ADMIN', 'ALCHEMIST', 'MENTOR_LEAD', 'TRAINEE'];
if (actores.length !== 5 || roles.some(rol => !actores.some(actor => actor.role === rol))) {
  throw new Error('El fixture necesita una cuenta nueva de cada uno de los cinco roles.');
}

async function avanzar(page: Page, boton: string, paso: number) {
  await page.getByRole('button', { name: boton, exact: true }).click();
  await expect(page.getByText(`Paso ${paso} de 10`, { exact: true })).toBeVisible();
}

async function llenarCampos(page: Page, valores: string[]) {
  const campos = page.getByRole('textbox');
  await expect(campos).toHaveCount(valores.length);
  for (let i = 0; i < valores.length; i++) await campos.nth(i).fill(valores[i]);
}

async function leerApi(request: APIRequestContext, token: string, ruta: string) {
  const respuesta = await request.get(`${API}${ruta}`, { headers: { 'X-Auth-Token': token } });
  expect(respuesta.status(), `GET ${ruta}`).toBe(200);
  return respuesta.json();
}

for (const actor of actores) {
  test(`${actor.role}: Día 1, diez pasos, activación y persistencia del mapa propio`, async ({ page, request, browser }) => {
    let token = '';
    let fechaElegida = '';
    const acciones = [
      `Caminar cuarenta minutos ${actor.role}`,
      `Contactar cinco clientes ${actor.role}`,
      `Llamar a mi familia ${actor.role}`,
    ];

    await test.step('entrar por la pantalla con una sesión real y el rol esperado', async () => {
      await page.goto('/');
      await page.getByLabel('Correo electrónico', { exact: true }).fill(actor.email);
      await page.getByLabel('Contraseña', { exact: true }).fill(CLAVE);
      const login = page.waitForResponse(r => r.url() === `${API}/api/v1/auth/login` && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      const respuesta = await login;
      expect(respuesta.status()).toBe(200);
      expect((await respuesta.json()).role).toBe(actor.role);
      token = (await respuesta.allHeaders())['x-auth-token'];
      expect(token).toBeTruthy();
      const yo = await leerApi(request, token, '/api/v1/auth/me');
      expect(yo.id).toBe(actor.id);
      expect(yo.role).toBe(actor.role);
      await expect(page.getByRole('tab', { name: /^hoy$/i })).toBeVisible();
      await cerrarGuiaDelAsistente(page);
      expect((await leerApi(request, token, '/api/v1/mapa-renacimiento')).stageCompleted).toBe(false);
    });

    await test.step('elegir explícitamente el Día 1 desde la interfaz', async () => {
      const fechas = page.waitForResponse(r => r.url() === `${API}/api/v1/onboarding/activate-program` && r.request().method() === 'GET');
      await page.getByRole('button', { name: /^Elegir mi Día 1$/i }).first().click();
      const disponibles = await (await fechas).json();
      expect(disponibles.activated).toBe(false);
      expect(disponibles.validStartDates).toHaveLength(3);
      fechaElegida = disponibles.validStartDates[1];
      await expect(page.getByRole('heading', { name: 'Elige tu Día 1', exact: true })).toBeVisible();
      await page.getByRole('radio').nth(1).click();
      const confirmado = page.waitForResponse(r => r.url() === `${API}/api/v1/onboarding/activate-program` && r.request().method() === 'POST');
      await page.getByRole('button', { name: /^CONFIRMAR MI DÍA 1$/i }).click();
      const respuesta = await confirmado;
      expect(respuesta.status()).toBe(200);
      expect(respuesta.request().postDataJSON().startDate).toBe(fechaElegida);
      const programa = await leerApi(request, token, '/api/v1/onboarding/activate-program');
      expect(programa.activated).toBe(true);
      expect(programa.startDate).toBe(fechaElegida);
      await expect(page.getByRole('tab', { name: /^hoy$/i })).toBeVisible();
      await cerrarGuiaDelAsistente(page);
    });

    await test.step('abrir el mapa y definir la prioridad', async () => {
      await page.getByRole('button', { name: /^Diseña tu mapa\./ }).click();
      await expect(page.getByText('Diseña tu mapa', { exact: true })).toBeVisible();
      await avanzar(page, 'Diseñar mi mapa', 2);
      await page.getByRole('button', { name: /^Cuerpo y salud/ }).click();
      await avanzar(page, 'Continuar', 3);
    });

    await test.step('definir los tres objetivos con todos sus datos', async () => {
      await page.getByRole('button', { name: 'peso', exact: true }).click();
      await llenarCampos(page, ['82', 'kg', '75', 'Foto y registro semanal del peso', `Caminar con constancia para cuidar mi salud ${actor.role}`]);
      await avanzar(page, 'Revisar mi meta', 4);
      await page.getByRole('button', { name: 'facturación', exact: true }).click();
      await page.getByRole('button', { name: 'S/', exact: true }).click();
      await page.getByRole('button', { name: 'Mensual', exact: true }).click();
      await llenarCampos(page, ['1000', '2000', 'Reporte de ventas al cierre del mes', `Registrar mis ventas para sostener el negocio ${actor.role}`]);
      await avanzar(page, 'Revisar mi meta', 5);
      await page.getByRole('button', { name: 'familia', exact: true }).click();
      await page.getByRole('button', { name: '4 de 10', exact: true }).nth(0).click();
      await page.getByRole('button', { name: '8 de 10', exact: true }).nth(1).click();
      await llenarCampos(page, ['Llamar a mi familia tres veces por semana', 'Registro de llamadas y conversaciones', `Compartir tiempo y escuchar a mi familia ${actor.role}`]);
      await avanzar(page, 'Revisar mi meta', 6);
    });

    await test.step('definir acciones, días y reemplazos', async () => {
      for (let i = 0; i < acciones.length; i++) {
        await page.getByRole('button', { name: 'Agregar acción (0/2)', exact: true }).first().click();
        await page.getByPlaceholder('Verbo + objeto. Ej. Caminar 40 minutos', { exact: true }).nth(i).fill(acciones[i]);
        await page.getByRole('button', { name: 'Check', exact: true }).nth(i).click();
      }
      await avanzar(page, 'Confirmar mi sistema', 7);
      await page.getByRole('button', { name: 'postergar', exact: true }).click();
      await llenarCampos(page, ['Al terminar mi jornada laboral', 'Mirar el teléfono sin horario', 'Caminar diez minutos antes de cenar']);
      await avanzar(page, 'Guardar mis reemplazos', 8);
    });

    await test.step('confirmar nueve hitos, el retorno y el compromiso', async () => {
      const hitos = page.getByRole('textbox');
      await expect(hitos).toHaveCount(9);
      for (let i = 0; i < 9; i++) await expect(hitos.nth(i)).not.toHaveValue('');
      await avanzar(page, 'Confirmar hitos', 9);
      await llenarCampos(page, [`Caminar diez minutos y revisar mi plan ${actor.role}`]);
      await avanzar(page, 'Definir mi retorno', 10);
      // Es un Pressable de React Native, no un input nativo; se verifica el resultado del toque.
      await page.getByRole('checkbox').click();
      await expect(page.getByText(/Falta completar:/)).toHaveCount(0);
    });

    await test.step('activar desde la app y comprobar lo que llegó al servidor', async () => {
      const completado = page.waitForResponse(r => r.url() === `${API}/api/v1/mapa-renacimiento/completar` && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Activar mi mapa', exact: true }).click();
      await expect(page.getByText('Tu mapa está activo.', { exact: true })).toBeVisible();
      expect((await completado).status()).toBe(204);
      const mapa = await leerApi(request, token, '/api/v1/mapa-renacimiento');
      expect(mapa.stageCompleted).toBe(true);
      expect(mapa.actions.map((a: { text: string }) => a.text).sort()).toEqual([...acciones].sort());
      expect(mapa.actions.every((a: { days: number[]; weeklyFrequency: number }) => a.weeklyFrequency === 3 && a.days.join(',') === '1,3,5')).toBe(true);
      expect(mapa.protocols).toHaveLength(1);
      expect(mapa.protocols[0].alternativeResponse).toBe('Caminar diez minutos antes de cenar');
      const respuestas = await leerApi(request, token, '/api/v1/onboarding/answers?flow=mapa_dia7');
      expect(JSON.stringify(respuestas)).toContain(`Caminar diez minutos y revisar mi plan ${actor.role}`);
      expect(JSON.stringify(respuestas)).toContain('Compartir tiempo y escuchar a mi familia');
      const rocas = await leerApi(request, token, '/api/v1/rocks/master');
      expect(rocas).toHaveLength(3);
      expect(rocas.map((r: { eje: string }) => r.eje).sort()).toEqual(['CUERPO', 'RELACIONES', 'TRABAJO']);
      const habitos = await leerApi(request, token, '/api/v1/habits');
      for (const titulo of acciones) expect(JSON.stringify(habitos)).toContain(titulo);
    });

    await test.step('recargar y entrar desde otro navegador sin perder el mapa', async () => {
      await page.reload();
      await expect(page.getByRole('tab', { name: /^hoy$/i })).toBeVisible();
      await cerrarGuiaDelAsistente(page);
      await expect(page.getByRole('button', { name: /^Tu mapa está activo\./ })).toBeVisible();
      const limpio = await browser.newContext({ viewport: { width: 360, height: 800 } });
      try {
        const otra = await limpio.newPage();
        await otra.goto(requerida('E2E_APP_URL'));
        await otra.getByLabel('Correo electrónico', { exact: true }).fill(actor.email);
        await otra.getByLabel('Contraseña', { exact: true }).fill(CLAVE);
        await otra.getByRole('button', { name: 'Ingresar', exact: true }).click();
        await expect(otra.getByRole('tab', { name: /^hoy$/i })).toBeVisible();
        await cerrarGuiaDelAsistente(otra);
        await otra.getByRole('button', { name: /^Tu mapa está activo\./ }).click();
        await expect(otra.getByText('Tu mapa está activo.', { exact: true })).toBeVisible();
        await expect(otra.getByText('3 acciones semanales', { exact: true })).toBeVisible();
        await expect(otra.getByText('1 reemplazo', { exact: true })).toBeVisible();
        expect((await leerApi(request, token, '/api/v1/auth/me')).role).toBe(actor.role);
      } finally {
        await limpio.close();
      }
    });
  });
}
