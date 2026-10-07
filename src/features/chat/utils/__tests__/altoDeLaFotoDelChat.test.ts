import { describe, expect, it } from '@jest/globals';
import { altoDeLaFotoDelChat, ANCHO_DE_LA_FOTO } from '../altoDeLaFotoDelChat';

describe('altoDeLaFotoDelChat', () => {
  it('el podio de la semana lleva su proporción 4:5, sin recortar el encabezado ni la frase final', () => {
    expect(altoDeLaFotoDelChat('ranking-semanal/2026-09-28-v1.jpg')).toBe(300);
    expect(altoDeLaFotoDelChat('ranking-semanal/2026-09-28-v1.png')).toBe(300);
  });

  it('las demás fotos siguen cuadradas', () => {
    expect(altoDeLaFotoDelChat('semaforo/tarjetas/verde-v1.jpg')).toBe(ANCHO_DE_LA_FOTO);
    expect(altoDeLaFotoDelChat('chat/abc/foto.jpg')).toBe(ANCHO_DE_LA_FOTO);
    expect(altoDeLaFotoDelChat(null)).toBe(ANCHO_DE_LA_FOTO);
    expect(altoDeLaFotoDelChat(undefined)).toBe(ANCHO_DE_LA_FOTO);
  });
});
