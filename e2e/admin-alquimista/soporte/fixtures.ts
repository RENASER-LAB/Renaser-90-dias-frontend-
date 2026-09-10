import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

/*
 * Node se usa con una superficie declarada a mano, y no con `@types/node`.
 *
 * Instalar esos tipos para las pruebas los mete en el `tsconfig` de la app, que es React Native:
 * `setTimeout` pasaría a devolver `NodeJS.Timeout` en vez de `number` y varias pantallas dejarían
 * de compilar. Cuatro funciones declaradas acá cuestan menos que ese efecto colateral.
 */
declare function require(modulo: string): unknown;
declare const process: { cwd(): string; env: Record<string, string | undefined> };

const { existsSync, mkdirSync, rmSync } = require('fs') as {
  existsSync(ruta: string): boolean;
  mkdirSync(ruta: string, opciones: { recursive: boolean }): void;
  rmSync(ruta: string, opciones: { force: boolean }): void;
};
const path = require('path') as { join(...partes: string[]): string };

import { ApiDePruebas } from './api';
import { ENTORNO, type Actor } from './entorno';

/**
 * Dónde se guarda la sesión de cada actor.
 *
 * <blockquote>Fuera del repositorio, porque lleva un token real. Y fuera de `artifacts/`, que es
 * el `outputDir` que Playwright administra y limpia por su cuenta: teniendo las sesiones ahí
 * dentro, una ejecución terminó con `ENOENT` al escribir su propia traza. No pelearse con el
 * directorio que otro proceso gestiona es más barato que averiguar quién borró qué.</blockquote>
 */
const CARPETA_SESIONES = path.join(
  process.env.HOME ?? process.cwd(),
  '.cache',
  'renaser-e2e',
  'sesiones',
);

/**
 * Una sesión por actor, reutilizada entre casos.
 *
 * <blockquote><b>Por qué no se hace login en cada prueba.</b> La primera versión de este archivo
 * entraba por la pantalla en cada caso. Con 22 pruebas eso son 22 logins, y el backend limita a
 * <b>10 por correo cada hora</b> ({@code AutenticacionService.LIMITE_POR_EMAIL}): a mitad de la
 * suite el servidor empieza a responder "Demasiados intentos" y todo lo que sigue falla por un
 * motivo que no tiene nada que ver con lo que se está probando. No es un defecto del limitador
 * —hace exactamente lo que debe—, es que la suite estaba pidiendo algo que ninguna persona real
 * pide.</blockquote>
 *
 * Ahora cada actor entra UNA vez, su `storageState` se guarda en disco y el resto de los casos
 * arranca de ahí. Son 5 logins por ejecución, y cero en las siguientes mientras el archivo siga
 * siendo válido.
 *
 * <p><b>Lo que NO cambia:</b> cada actor tiene su propio contexto y su propio estado. Compartirlo
 * entre un administrador y un aprendiz haría pasar justamente los casos que tienen que fallar.
 */
type Fixtures = {
  /**
   * @param sesionLimpia ignora la sesión guardada y entra de cero. Solo para las pruebas que
   *                     miden algo que vive EN el navegador —una preferencia de `localStorage`,
   *                     por ejemplo—: reutilizar el estado les arrastraría el resultado de la
   *                     ejecución anterior y pasarían o fallarían por lo que hizo otra corrida.
   */
  entrarComo: (actor: Actor, opciones?: { sesionLimpia?: boolean }) => Promise<Page>;
  api: (actor: Actor) => ApiDePruebas;
};

/**
 * El archivo se nombra por CORREO y no por rol.
 *
 * Con el rol, dos cuentas ADMIN distintas —la principal y la que E02 necesita sin programa—
 * escriben y leen el MISMO archivo: la segunda hereda la sesión de la primera y la prueba mide
 * la cuenta equivocada sin que nada falle. Es el peor tipo de error: silencioso y verde.
 */
function rutaDeSesion(actor: Actor): string {
  const nombre = actor.email.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return path.join(CARPETA_SESIONES, `${nombre}.json`);
}

export const test = base.extend<Fixtures>({
  entrarComo: async ({ browser }, usar, info) => {
    const abiertos: BrowserContext[] = [];

    await usar(async (actor: Actor, pedido?: { sesionLimpia?: boolean }) => {
      mkdirSync(CARPETA_SESIONES, { recursive: true });
      const ruta = rutaDeSesion(actor);
      const opciones = {
        baseURL: info.project.use.baseURL,
        viewport: info.project.use.viewport,
        storageState: !pedido?.sesionLimpia && existsSync(ruta) ? ruta : undefined,
      };

      let contexto = await browser.newContext(opciones);
      abiertos.push(contexto);
      let pagina = await contexto.newPage();
      await pagina.goto('/');

      if (await estaDentro(pagina)) {
        await cerrarGuiaDelAsistente(pagina);
        return pagina;
      }

      /* La sesión guardada caducó o nunca existió. Se entra de nuevo y se reescribe el archivo:
         un estado viejo que no se limpia hace fallar TODA ejecución posterior con un síntoma
         —"no aparece la pestaña Hoy"— que no dice nada de la causa. */
      if (opciones.storageState) {
        rmSync(ruta, { force: true });
        await contexto.close();
        contexto = await browser.newContext({ ...opciones, storageState: undefined });
        abiertos.push(contexto);
        pagina = await contexto.newPage();
        await pagina.goto('/');
      }

      await iniciarSesion(pagina, actor);
      await contexto.storageState({ path: ruta });
      await cerrarGuiaDelAsistente(pagina);
      return pagina;
    });

    for (const contexto of abiertos) {
      await contexto.close().catch(() => undefined);
    }
  },
  api: async ({}, usar) => {
    await usar((actor: Actor) => new ApiDePruebas(actor));
  },
});

export { expect };

/**
 * Cierra la guía de SER si está abierta.
 *
 * <blockquote>Una cuenta que nunca publicó en el Muro recibe, nada más entrar, un overlay a
 * pantalla completa invitándola a hacerlo. Tapa Hoy entero — incluida la entrada a
 * Administración—, así que los clics siguientes fallaban con "timeout" aunque el elemento
 * existiera detrás: {@code count()} lo encontraba y el clic nunca llegaba. Seis pruebas caían por
 * esto y el mensaje no decía nada del overlay.</blockquote>
 *
 * No es un fallo de la app: el overlay hace lo que debe. Es que una suite que entra con cuentas
 * recién creadas se lo come siempre, y una persona real lo cierra sin pensar.
 */
export async function cerrarGuiaDelAsistente(page: Page): Promise<void> {
  const posponer = page.getByRole('button', { name: /posponer la guía/i }).first();
  /* La espera es de 8 s y no de 3 porque el overlay aparece DESPUÉS de que cargan los datos de
     Hoy. Con la sonda corta el chequeo pasaba antes de que existiera, devolvía "no está" y el
     overlay se abría un segundo más tarde, justo encima del botón que la prueba iba a pulsar. */
  if (await posponer.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await posponer.click();
    await expect(posponer).toBeHidden({ timeout: 10_000 });
  }
}

/** Si la app ya está adentro. Se mira la barra de pestañas, que solo existe con sesión. */
async function estaDentro(page: Page): Promise<boolean> {
  return page
    .getByRole('tab', { name: /^hoy$/i })
    .first()
    .isVisible({ timeout: 20_000 })
    .catch(() => false);
}

/**
 * Login REAL por la interfaz. No se inyecta el token a mano: hacerlo saltearía el único lugar
 * donde se comprueba que la app guarda y reenvía el `X-Auth-Token` como el backend espera, que es
 * la parte frágil en react-native-web.
 *
 * Los nombres salen de los `accessibilityLabel` de LoginScreen, EXACTOS y no por expresión
 * regular: la pantalla tiene además "Recuperar la contraseña", "Mostrar la contraseña" y
 * "Confirmar contraseña", así que un /contraseñ/i engancha cuatro elementos y falla por
 * ambigüedad en vez de por lo que se está probando. El botón se ve como "ACCEDER AL PROGRAMA"
 * pero su etiqueta accesible es "Continuar", y es la etiqueta la que manda.
 */
export async function iniciarSesion(page: Page, actor: Actor): Promise<void> {
  await page.getByLabel('Correo electrónico', { exact: true }).fill(actor.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(actor.password);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();

  const barra = page.getByRole('tab', { name: /^hoy$/i }).first();
  const limitado = page.getByText(/demasiados intentos/i);
  // Se espera a lo que ocurra primero. Sin esto, un bloqueo por límite de intentos se manifiesta
  // 45 segundos después como "no aparece la pestaña", que manda a buscar el problema al lado
  // equivocado — pasó, y costó dos ejecuciones enteras.
  await Promise.race([
    barra.waitFor({ state: 'visible', timeout: 45_000 }),
    limitado.waitFor({ state: 'visible', timeout: 45_000 }),
  ]);
  if (await limitado.isVisible().catch(() => false)) {
    throw new Error(
      `El backend bloqueó el login de ${actor.email} por límite de intentos (10 por correo cada ` +
        'hora). Esperá a que se libere o limpiá la clave login:email:<correo> en Redis.',
    );
  }
  await expect(barra).toBeVisible();
}

export async function cerrarSesion(page: Page): Promise<void> {
  await page.getByRole('tab', { name: /^yo$/i }).click();
  /* `.first()`: el control existe en la vista principal de Yo y otra vez dentro del hub de
     ajustes. Solo uno está montado a la vez, pero fijar el primero evita que un cambio futuro
     convierta esto en un fallo por ambigüedad. */
  await page.getByRole('button', { name: /cerrar sesión/i }).first().click();
  await expect(page.getByLabel('Correo electrónico', { exact: true })).toBeVisible({ timeout: 20_000 });
}

/**
 * Entra a una sección desde la portada de Administración.
 *
 * <blockquote><b>Por qué no basta un `click()` suelto.</b> E04 y E17 fallaban de forma
 * intermitente con "timeout" sobre la fila de la sección, mientras otras pruebas pulsaban ESA
 * MISMA fila sin problema. Dos cosas lo explican y las dos se cubren acá: la guía de SER puede
 * volver a montarse después de entrar y tapa la pantalla, y en 360 px las secciones caen bajo el
 * pliegue, así que hay que llevarlas a la vista antes de pulsar.</blockquote>
 *
 * Un fallo intermitente que se "arregla" con un reintento esconde el motivo. Esto no reintenta:
 * quita las dos causas conocidas y después pulsa una sola vez.
 */
export async function abrirSeccion(page: Page, seccion: RegExp): Promise<void> {
  await cerrarGuiaDelAsistente(page);
  const fila = page.getByRole('button', { name: seccion }).first();
  await fila.scrollIntoViewIfNeeded();
  await fila.click();
}

/** Entra a Administración desde Hoy. Devuelve `false` si la cuenta no tiene la entrada. */
export async function abrirAdministracion(page: Page): Promise<boolean> {
  /* El overlay se cierra otra vez ACÁ y no solo al entrar: aparece cuando la app termina de
     cargar el estado del Muro, que puede ser después del login. Una cuenta que acaba de activar
     su programa lo recibe justo al volver a Hoy, y tapa esta misma entrada. */
  await cerrarGuiaDelAsistente(page);
  const entrada = page.getByRole('button', { name: /abrir administración/i }).first();
  if ((await entrada.count()) === 0) return false;
  /* Mismo tratamiento que `abrirSeccion`, y por el mismo motivo: la tarjeta se encontraba pero
     nunca llegaba a "visible, enabled and stable". Hoy anima su contenido al entrar y la guía de
     SER puede volver a taparla, así que se cierra la guía y se lleva la tarjeta a la vista antes
     de pulsar. E04 fallaba por esto mientras E01 —que llega antes, con la pantalla ya quieta—
     pulsaba la misma tarjeta sin problema. */
  await cerrarGuiaDelAsistente(page);
  /* Hoy sigue reacomodándose mientras llegan sus datos —hábitos, rocas, muro—, y cada respuesta
     mueve la tarjeta unos píxeles. Playwright exige que el elemento no se mueva entre dos
     fotogramas antes de pulsar, así que con la pantalla todavía cargando ese requisito no se
     cumple nunca y el clic agota sus 15 segundos con el botón perfectamente visible.
​
     Se espera a que la red se calme. No es un `sleep` disfrazado: es la condición real —"Hoy
     terminó de cargar"— y por eso lleva su propio tope, para que una petición colgada no deje la
     prueba esperando para siempre. */
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await entrada.scrollIntoViewIfNeeded();
  await entrada.click();
  await expect(page.getByText(/pendientes/i).first()).toBeVisible();
  return true;
}

export { ENTORNO };
