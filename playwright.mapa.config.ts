import { defineConfig, devices } from '@playwright/test';

// Un servidor de pruebas explícito: esta suite no arranca ni limpia el entorno de Administración.
const appUrl = process.env.E2E_APP_URL;
if (!appUrl) throw new Error('Falta E2E_APP_URL para el recorrido del Mapa del Poder.');

export default defineConfig({
  testDir: './e2e/mapa-poder',
  testMatch: 'mapa-por-rol.spec.ts',
  outputDir: './artifacts/e2e-mapa/resultados',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list'],
    ['junit', { outputFile: 'artifacts/e2e-mapa/junit.xml' }],
    ['html', { outputFolder: 'artifacts/e2e-mapa/html', open: 'never' }],
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
