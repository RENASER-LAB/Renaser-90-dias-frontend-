import { formatoKm } from '../../habits/utils/formatoKm';

/**
 * La meta diaria de km en «Hábitos del programa» (spec 037, D-310). Lógica pura: lo que escribe Administración, validado igual que
 * el servidor (de 0,5 a 50 km, dos decimales), y cómo se lee.
 */

export const TEXTOS_DE_LA_META = {
  titulo: 'Meta diaria de km',
  detalle: 'Con los pasos del teléfono, la persona registra el hábito al llegar a esta meta. La captura con el número a mano sigue igual.',
  guardar: 'Guardar meta',
  volverALaDelPrograma: 'Volver a la del programa',
  guardada: 'Meta guardada',
  rige: 'Rige desde ya.',
} as const;

/** «5» → 5; «6,5» y «6.5» → 6,5. `null` si no es un número en el rango (se dice con `faltaParaLaMeta`). */
export function leerLaMeta(texto: string, minimo: number, maximo: number): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(limpio)) return null;
  const meta = Math.round(Number(limpio) * 100) / 100;
  return meta >= minimo && meta <= maximo ? meta : null;
}

export function faltaParaLaMeta(texto: string, minimo: number, maximo: number): string | null {
  if (texto.trim() === '') return 'Escribe la meta en km.';
  return leerLaMeta(texto, minimo, maximo) === null ? `La meta tiene que estar entre ${formatoKm(minimo)} y ${formatoKm(maximo)} km.` : null;
}

export function textoDeLaMetaVigente(meta: number, esLaPorDefecto: boolean): string {
  return `${formatoKm(meta)} km${esLaPorDefecto ? ' · la del programa' : ''}`;
}

export function textoParaElCampo(meta: number): string {
  return formatoKm(meta);
}
