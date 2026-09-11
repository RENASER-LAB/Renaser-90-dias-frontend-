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
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts', '<rootDir>/src/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.claude/'],
  // Los worktrees de trabajo tienen su propio `package.json` con el mismo `name`, y el mapa de
  // módulos de React Native (Haste) los ve como una colisión de nombres. No rompe, pero ensucia
  // cada corrida con un aviso que no dice nada útil.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  clearMocks: true,
};
