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
 *
 * `leido` (2026-09-27, D-208 del backend): el «✓✓» dorado de un mensaje propio que ya leyeron. Va
 * sobre la burbuja propia, con contraste de texto: 4,65:1 en claro (#7D5F16 sobre #F0E2C2; el
 * `goldInk` de la paleta daba 3,9:1) y 6,07:1 en oscuro (#D4AF37 sobre #3B3120). `leidoSobreFoto`, el
 * mismo «✓✓» sobre la franja oscura de una foto sin texto: 6,4:1 con una foto de gris medio detrás
 * (sobre una foto blanca baja a 2,3:1, como la hora blanca de siempre baja a 3,4:1).
 *
 * Responder a un mensaje (D-251 del backend, 2026-10-05): `citaAjena`/`citaPropia` son el fondo de la
 * cita dentro de cada burbuja (un panel que se separa de la burbuja) y `barraDeCita` el de «Respondiendo
 * a…» sobre el campo; `autorPropio`, el «Tú» de una cita propia. Medidos con el resumen (`hora`), el
 * «Tú» y los ocho colores de remitente de `formatoChat`: ≥ 5:1 en claro y ≥ 4,6:1 en oscuro sobre los
 * tres fondos. `seleccion` tiñe el renglón del mensaje con el menú abierto, o al que se llegó tocando
 * una cita.
 */
export type ColoresDelChat = {
  fondo: string;
  propia: string;
  ajena: string;
  texto: string;
  hora: string;
  separador: string;
  textoSeparador: string;
  leido: string;
  leidoSobreFoto: string;
  citaAjena: string;
  citaPropia: string;
  barraDeCita: string;
  autorPropio: string;
  seleccion: string;
};

/** Sobre la franja oscura de la foto el fondo es el mismo en los dos modos. */
const LEIDO_SOBRE_FOTO = '#F2D27E';

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
        leido: '#D4AF37',
        leidoSobreFoto: LEIDO_SOBRE_FOTO,
        citaAjena: '#2C2A26',
        citaPropia: '#4A3E28',
        barraDeCita: '#201F1C',
        autorPropio: '#D4AF37',
        seleccion: 'rgba(212,175,55,0.16)',
      }
    : {
        fondo: '#F2ECE1',
        propia: '#F0E2C2',
        ajena: '#FFFFFF',
        texto: c.text,
        hora: '#5F574A',
        separador: '#E6DDCC',
        textoSeparador: '#4A453D',
        leido: '#7D5F16',
        leidoSobreFoto: LEIDO_SOBRE_FOTO,
        citaAjena: '#F3EEE5',
        citaPropia: '#F8F1E2',
        barraDeCita: '#FFFFFF',
        autorPropio: '#664D12',
        seleccion: 'rgba(176,138,48,0.16)',
      };
}
