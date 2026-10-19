import { Platform } from 'react-native';

/**
 * La marca del teléfono, reducida a las que tienen guía propia (spec 007, historia 2).
 *
 * Honor y Huawei van separadas aunque comparten la línea de la guía: son marcas distintas y la pantalla que
 * se abre (en el módulo nativo) también se elige por ellas. Redmi y POCO son Xiaomi; Realme y OnePlus
 * comparten el sistema de Oppo; iQOO comparte el de Vivo.
 */
export type MarcaDelTelefono = 'honor' | 'huawei' | 'xiaomi' | 'samsung' | 'oppo' | 'vivo' | 'otra';

/** Lo que Android le cuenta a React Native del teléfono (`Platform.constants`). Todo opcional: no se confía en él. */
export interface ConstantesDelTelefono {
  Manufacturer?: string;
  Brand?: string;
}

const PISTAS_POR_MARCA: readonly (readonly [MarcaDelTelefono, RegExp])[] = [
  ['honor', /honor/],
  ['huawei', /huawei/],
  ['xiaomi', /xiaomi|redmi|poco/],
  ['samsung', /samsung/],
  ['oppo', /oppo|realme|oneplus/],
  ['vivo', /vivo|iqoo/],
];

/**
 * ¿Esta marca detiene apps al quitarlas de recientes o por el ahorro de batería, y con eso borra sus alarmas?
 * (spec 007, refuerzos FR-021 y FR-022.) Son todas las que tienen guía propia: Honor, Huawei, Xiaomi (Redmi y POCO),
 * Samsung, Oppo (Realme y OnePlus) y Vivo (iQOO). El módulo nativo lleva la misma lista
 * (`MARCAS_QUE_DETIENEN_APPS`) y `moduloNativoDeAlarmas.test.ts` vigila que no se desfasen.
 */
export function marcaQueDetieneApps(marca: MarcaDelTelefono): boolean {
  return marca !== 'otra';
}

function marcaDeUnTexto(texto: unknown): MarcaDelTelefono {
  if (typeof texto !== 'string') return 'otra';
  const minusculas = texto.trim().toLowerCase();
  for (const [marca, pista] of PISTAS_POR_MARCA) {
    if (pista.test(minusculas)) return marca;
  }
  return 'otra';
}

/**
 * La marca de ESTE teléfono. Se mira primero la marca comercial (`Brand`) y después el fabricante
 * (`Manufacturer`): un Honor de cuando todavía era de Huawei dice `HUAWEI` / `HONOR`, y un POCO dice
 * `Xiaomi` / `POCO`. Fuera de Android (iOS, web) o sin datos, `otra`.
 *
 * Los parámetros existen para las pruebas; en la app se llama sin argumentos.
 */
export function marcaDelTelefono(
  constantes: ConstantesDelTelefono | null = leerConstantes(),
  sistema: string = Platform.OS,
): MarcaDelTelefono {
  if (sistema !== 'android' || !constantes) return 'otra';
  const porMarca = marcaDeUnTexto(constantes.Brand);
  return porMarca !== 'otra' ? porMarca : marcaDeUnTexto(constantes.Manufacturer);
}

function leerConstantes(): ConstantesDelTelefono | null {
  try {
    return (Platform.constants as unknown as ConstantesDelTelefono | undefined) ?? null;
  } catch {
    return null;
  }
}
