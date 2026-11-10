import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Spec 048 (FR-005): `SoloConConexion` vuelve a montar lo de adentro al volver la señal, pero si los datos se leen en un hook
 * de la pantalla (por fuera de `SoloConConexion`), lo de adentro vuelve con el error de cuando no había red. Pasó dos veces
 * en el E2E del 09/11 (SER y el Muro). Estas pantallas tienen que pedir de nuevo sus datos con `alVolverLaConexion`.
 */
const PANTALLAS_QUE_LEEN_POR_FUERA = [
  'src/features/renasia/screens/RenasiaPanel.tsx',
  'src/screens/ComunidadScreen.tsx',
  'src/features/academy/components/ClaseDiariaModal.tsx',
];

describe('lo que se lee por fuera de SoloConConexion se vuelve a pedir al volver la señal', () => {
  // spec 048 FR-005
  it.each(PANTALLAS_QUE_LEEN_POR_FUERA)('%s', (ruta: string) => {
    const fuente = readFileSync(join(__dirname, '../../../..', ruta), 'utf8');
    expect(fuente).toContain('<SoloConConexion>');
    if (!fuente.includes('alVolverLaConexion(')) {
      throw new Error(
        `${ruta} envuelve su cuerpo en <SoloConConexion> pero lee sus datos por fuera: al volver la señal se queda con el ` +
          'error de cuando no había red. Pide de nuevo los datos con alVolverLaConexion(() => recargar()) en un useEffect.',
      );
    }
  });
});
