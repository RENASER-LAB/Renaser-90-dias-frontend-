/** La línea del récord de racha bajo la Racha de Yo (2026-10-31): «Récord: 3 días» o «Récord: 1 día». */
export function textoDelRecord(dias: number): string {
  return `Récord: ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
