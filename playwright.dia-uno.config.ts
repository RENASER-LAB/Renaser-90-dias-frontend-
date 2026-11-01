import { defineConfig, devices } from '@playwright/test';

// Un servidor de pruebas explícito: esta suite no arranca ni limpia el entorno de Administración.
// (Antes compartía la configuración con el recorrido del Mapa del Poder, que se retiró con el Mapa de Renacimiento, spec 026.)
const appUrl = process.env.E2E_APP_URL;
if (!appUrl) throw new Error('Falta E2E_APP_URL para el recorrido del Día 1.');

export default defineConfig({
  testDir: './e2e/dia-uno',
  testMatch: 'dia-uno.spec.ts',
  outputDir: './artifacts/e2e-dia-uno/resultados',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 100_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list'],
    ['junit', { outputFile: 'artifacts/e2e-dia-uno/junit.xml' }],
    ['html', { outputFolder: 'artifacts/e2e-dia-uno/html', open: 'never' }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: appUrl,
    viewport: { width: 360, height: 800 },
    launchOptions: { executablePath: process.env.E2E_CHROME_BIN || undefined },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
  },
});
