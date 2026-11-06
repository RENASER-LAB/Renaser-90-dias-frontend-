/** Spec 045: las reglas puras del recorrido y sus textos. */
import { describe, expect, it } from '@jest/globals';

import { pasosDelRecorrido, tituloDeBienvenida } from '../data/pasosDelRecorrido';
import { circuloDelFoco, medirPestana, olvidarBotonesParaPruebas, registrarBotonDePestana } from '../estado/focoDeLasPestanas';
import { PAUSA_ENTRE_PASOS_MS, alVolverAtras, cantidadDePasos, esToqueDemasiadoPronto, pasoParaRetomar, puedeArrancar, sePausa } from '../utils/cuandoSaleElRecorrido';

const base = { servidorDiceMostrar: true, repetido: false, pestanaActual: 'Hoy', otraCapaAbierta: false, panelDeSerAbierto: false, verComo: false };

describe('cuándo arranca', () => {
  it('spec 045 FR-001: solo si el servidor lo dice, en Hoy; nunca sobre una duda (null) ni en «ver como»', () => {
    expect(puedeArrancar(base)).toBe(true);
    expect(puedeArrancar({ ...base, servidorDiceMostrar: null })).toBe(false);
    expect(puedeArrancar({ ...base, servidorDiceMostrar: false })).toBe(false);
    // D9: sobre cualquiera de las cinco pestañas (un aviso pudo abrir otra al entrar), nunca fuera de ellas.
    expect(puedeArrancar({ ...base, pestanaActual: 'Plan' })).toBe(true);
    expect(puedeArrancar({ ...base, pestanaActual: 'TerminosActualizados' })).toBe(false);
    expect(puedeArrancar({ ...base, pestanaActual: null })).toBe(false);
    expect(puedeArrancar({ ...base, verComo: true })).toBe(false);
    expect(puedeArrancar({ ...base, servidorDiceMostrar: false, repetido: true })).toBe(true);
  });

  it('spec 045 FR-008: no arranca ni se dibuja con otra capa obligatoria o el panel de SER', () => {
    expect(puedeArrancar({ ...base, otraCapaAbierta: true })).toBe(false);
    expect(puedeArrancar({ ...base, panelDeSerAbierto: true })).toBe(false);
    expect(sePausa({ otraCapaAbierta: true, panelDeSerAbierto: false })).toBe(true);
    expect(sePausa({ otraCapaAbierta: false, panelDeSerAbierto: false })).toBe(false);
  });

  it('spec 045 FR-001: 5 pasos; 4 si ya publicó o si el Muro no está disponible; retoma acotado', () => {
    expect(cantidadDePasos({ yaPublico: false, muroDisponible: true })).toBe(5);
    expect(cantidadDePasos({ yaPublico: true, muroDisponible: true })).toBe(4);
    expect(cantidadDePasos({ yaPublico: false, muroDisponible: false })).toBe(4);
    expect(pasoParaRetomar(5, 4)).toBe(4);
    expect(pasoParaRetomar(0, 5)).toBe(1);
    expect(pasoParaRetomar(Number.NaN, 5)).toBe(1);
  });

  it('spec 045 FR-005: el atrás vuelve un paso; en el primero pregunta antes de saltar', () => {
    expect(alVolverAtras(3)).toEqual({ tipo: 'paso', paso: 2 });
    expect(alVolverAtras(1)).toEqual({ tipo: 'preguntarSaltar' });
  });

  it('spec 045 FR-005, D9: para una cuenta nueva el atrás nunca salta: en el primer paso y en el del Muro no hace nada', () => {
    expect(alVolverAtras(1, { obligatorio: true, esElDelMuro: false })).toEqual({ tipo: 'nada' });
    expect(alVolverAtras(5, { obligatorio: true, esElDelMuro: true })).toEqual({ tipo: 'nada' });
    expect(alVolverAtras(3, { obligatorio: true, esElDelMuro: false })).toEqual({ tipo: 'paso', paso: 2 });
  });
});

describe('los textos', () => {
  it('spec 045 FR-003, FR-010: cinco pasos, una frase corta cada uno, en castellano y con «Entrenar» (D5)', () => {
    const pasos = pasosDelRecorrido('Ana Pérez');
    expect(pasos.map(p => p.titulo)).toEqual(['Te damos la bienvenida, Ana', 'Hoy', 'Plan', 'Entrenar', 'Tu primera publicación']);
    expect(pasos.map(p => p.pestana)).toEqual([null, 'Hoy', 'Plan', 'Training', 'Comunidad']);
    for (const p of pasos) {
      expect(p.frase.length).toBeLessThanOrEqual(90);
      expect(`${p.titulo} ${p.frase} ${p.botonPrincipal} ${p.botonSecundario}`).not.toMatch(/\b(Training|Ranking|post|Skip|Next|Start)\b/i);
    }
  });

  it('spec 045 FR-003: el saludo no depende del género (D6)', () => {
    expect(tituloDeBienvenida('')).toBe('Te damos la bienvenida');
    expect(tituloDeBienvenida('  Juan  Ríos ')).toBe('Te damos la bienvenida, Juan');
  });
});

describe('el foco', () => {
  it('spec 045 FR-002: se mide la pestaña de verdad y el círculo la rodea con 16 dp de aire (mínimo 64)', async () => {
    olvidarBotonesParaPruebas();
    registrarBotonDePestana('Plan', { measureInWindow: cb => cb(78, 700, 78, 60) });
    expect(await medirPestana('Plan')).toEqual({ x: 78, y: 700, ancho: 78, alto: 60 });
    expect(await medirPestana('Hoy')).toBeNull();
    expect(circuloDelFoco({ x: 78, y: 700, ancho: 78, alto: 60 })).toEqual({ cx: 117, cy: 730, radio: 47 });
    expect(circuloDelFoco({ x: 0, y: 0, ancho: 20, alto: 20 }).radio).toBe(32);
  });
});

describe('un toque por paso (issue #151)', () => {
  it('spec 045 FR-002, FR-003: un toque en el foco que llega mientras el foco todavía se mueve no avanza otro paso', () => {
    expect(PAUSA_ENTRE_PASOS_MS).toBeGreaterThanOrEqual(300);
    expect(esToqueDemasiadoPronto(null, 1000)).toBe(false);
    expect(esToqueDemasiadoPronto(1000, 1000)).toBe(true);
    expect(esToqueDemasiadoPronto(1000, 1000 + PAUSA_ENTRE_PASOS_MS - 1)).toBe(true);
    expect(esToqueDemasiadoPronto(1000, 1000 + PAUSA_ENTRE_PASOS_MS)).toBe(false);
    // Un reloj que va para atrás nunca traba el recorrido.
    expect(esToqueDemasiadoPronto(5000, 1000)).toBe(false);
  });

  it('spec 045 FR-002: el área tocable del foco pasa por el freno, no directo a «Siguiente»', () => {
    const fuente = require('fs').readFileSync(require('path').join(__dirname, '../components/RecorridoDeBienvenida.tsx'), 'utf8') as string;
    expect(fuente).toMatch(/onPress=\{alTocarElFoco\}\s*\n\s*accessibilityElementsHidden/);
    expect(fuente).toMatch(/esToqueDemasiadoPronto\(ultimoCambioDePaso\.current, Date\.now\(\)\)/);
  });
});
