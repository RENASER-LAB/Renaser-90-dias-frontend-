/**
 * Pruebas unitarias del proyecto.
 *
 * `jest-expo` es el preset oficial de Expo: enseña a Jest a leer TypeScript/JSX y a cargar los
 * módulos nativos de React Native, que con Jest a secas revientan al importarse.
 *
 * **Alcance deliberado: solo `src`.** Los `.spec.ts` de `e2e/` los corre Playwright contra la app
 * levantada y prueban otra cosa —el producto entero, con backend—; si Jest los tomara intentaría
 * ejecutarlos sin navegador y fallarían todos.
 */

/*
 * **Las pruebas corren en la zona del padrón, `America/Lima`, en cualquier máquina.** El CI corre en
 * UTC y la laptop en Lima: una prueba del domingo a las 22:00 de Lima (el lunes 03:00 UTC) daba un
 * resultado en cada lado. Tiene que ir acá y no en la prueba: asignar `process.env.TZ` dentro de un
 * archivo de prueba no cambia nada (Jest le da una copia de `process.env`), y los procesos de Jest
 * se crean después de leer esta configuración, así que heredan la zona. Visto el 2026-09-27 al
 * probar el lunes que se agenda el domingo (E-340 del backend).
 */
process.env.TZ = 'America/Lima';

module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts', '<rootDir>/src/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.claude/'],
  // Los worktrees de trabajo tienen su propio `package.json` con el mismo `name`, y el mapa de
  // módulos de React Native (Haste) los ve como una colisión de nombres. No rompe, pero ensucia
  // cada corrida con un aviso que no dice nada útil.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  clearMocks: true,
  setupFiles: ['<rootDir>/jest.setup.js'],
  // El `.riv` del fénix (2026-10-06) se trata como cualquier asset: Jest no lo puede leer como código.
  transform: { '^.+\\.riv$': require.resolve('jest-expo/src/preset/assetFileTransformer.js') },
};
