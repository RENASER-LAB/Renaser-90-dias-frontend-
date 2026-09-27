import type { Palette } from '../../../theme/tokens';

/**
 * Los colores propios del chat estilo WhatsApp (2026-09-26), con el tema de Renaser: fondo crema,
 * burbuja propia dorado suave, ajena blanca (o carbón en oscuro). Nada del verde de WhatsApp.
 *
 * Viven acá y no en `theme/tokens.ts` porque solo los usa el chat: sumar cinco claves a la paleta
 * de toda la app por una pantalla ensuciaría el contrato que leen las otras 38.
 *
 * Contrastes medidos (texto principal sobre cada burbuja, WCAG): claro ≥ 13:1, oscuro ≥ 11:1; la
 * hora (`hora`) ≥ 4,8:1 en las dos burbujas de cada modo.
 */
export type ColoresDelChat = {
  fondo: string;
  propia: string;
  ajena: string;
  texto: string;
  hora: string;
  separador: string;
  textoSeparador: string;
};

export function coloresDelChat(c: Palette, oscuro: boolean): ColoresDelChat {
  return oscuro
    ? {
        fondo: '#0E0D0B',
        propia: '#3B3120',
        ajena: '#201F1C',
        texto: c.text,
        hora: '#BDB5A8',
        separador: '#262420',
        textoSeparador: c.textSoft,
      }
    : {
        fondo: '#F2ECE1',
        propia: '#F0E2C2',
        ajena: '#FFFFFF',
        texto: c.text,
        hora: '#5F574A',
        separador: '#E6DDCC',
        textoSeparador: '#4A453D',
      };
}
