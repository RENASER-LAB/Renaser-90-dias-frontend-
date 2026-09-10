import { defineConfig, devices } from '@playwright/test';

/**
 * E2E de la app web (Expo + react-native-web) contra el backend Spring REAL.
 *
 * **El puerto 8081 no es una preferencia.** El backend acepta CORS solo desde ese origen, así que
 * servir la app en otro puerto hace que TODAS las peticiones vuelvan 403 y la suite falle por un
 * motivo que no tiene nada que ver con lo que prueba.
 *
 * **`webServer` arranca la app, nunca el backend.** El backend de pruebas lo levanta quien corre
 * la suite y su URL entra por `E2E_API_URL`: arrancarlo desde acá significaría elegir por el
 * equipo contra qué base se prueba, y ya hubo un incidente con dos backends peleándose el 8080.
 *
 * **Móvil primero.** El público de esta app usa el teléfono; el viewport por defecto son 360 px,
 * que es donde caen los Xiaomi y los Android estándar. Tablet y 320 px son proyectos aparte, para
 * el smoke responsive — no se corren en cada cambio.
 */
const APP_URL = (process.env.E2E_APP_URL ?? 'http://localhost:8081').replace(/\/+$/, '');

/**
 * Navegador propio, cuando `npx playwright install` no puede correr.
 *
 * En una shell de contenedor donde `node` es del contenedor y `npx` viene del host, el descargador
 * de Playwright —que se lanza en un proceso hijo— muere con "invalid ELF header". Pero el binario
 * puede estar ya en la caché por otra vía. `E2E_CHROME_BIN` deja apuntarlo sin tocar nada más.
 *
 * Vacío = comportamiento normal: Playwright usa el navegador que él mismo instaló.
 */
const CHROME_BIN = process.env.E2E_CHROME_BIN?.trim() || undefined;

export default defineConfig({
  testDir: './e2e/admin-alquimista',
  outputDir: './artifacts/e2e/resultados',
  /* Un solo worker: los recorridos comparten un backend y una base. Paralelizarlos haría que un
     caso viera los grupos que otro está creando, y los fallos serían irreproducibles. */
  workers: 1,
  fullyParallel: false,
  /* Cero reintentos a propósito. Un reintento que "arregla" un caso esconde un problema real de
     sincronización; e2e.md pide que un resultado inestable quede señalado, no disimulado. */
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['junit', { outputFile: 'artifacts/e2e/junit.xml' }],
    ['html', { outputFolder: 'artifacts/e2e/html', open: 'never' }],
  ],
  use: {
    baseURL: APP_URL,
    /* Traza y captura solo cuando algo falla: guardarlas siempre llena el disco y, sobre todo,
       una captura de un caso que pasó no prueba nada que la aserción no probara ya. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    {
      /* Corre ANTES que todo y deja el entorno en un estado conocido. Es un proyecto y no un
         `globalSetup` porque así aparece en el reporte: cuando la limpieza falla conviene verlo,
         no que se pierda en la consola. */
      name: 'limpieza',
      testMatch: /limpieza\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: CHROME_BIN } },
    },
    {
      name: 'movil-360',
      dependencies: ['limpieza'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 760 },
        launchOptions: { executablePath: CHROME_BIN },
      },
    },
    {
      /* Solo los casos de layout, seleccionados por TÍTULO y no por nombre de archivo: los E16
         viven junto a los de permisos, y un `testMatch` por archivo no encontraba ninguno. */
      name: 'responsive-tablet',
      grep: /E16/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        launchOptions: { executablePath: CHROME_BIN },
      },
    },
  ],
  webServer: {
    command: 'npx expo start --web --port 8081',
    url: APP_URL,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
