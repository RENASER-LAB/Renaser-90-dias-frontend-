import { defineConfig } from '@playwright/test';
import mapa from './playwright.mapa.config';

export default defineConfig({
  ...mapa,
  testMatch: 'dia-uno.spec.ts',
  timeout: 100_000,
  outputDir: './artifacts/e2e-dia-uno/resultados',
  reporter: [
    ['list'],
    ['junit', { outputFile: 'artifacts/e2e-dia-uno/junit.xml' }],
    ['html', { outputFolder: 'artifacts/e2e-dia-uno/html', open: 'never' }],
  ],
});
