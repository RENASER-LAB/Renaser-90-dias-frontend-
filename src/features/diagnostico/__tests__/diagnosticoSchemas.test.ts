import { describe, expect, it } from '@jest/globals';

import {
  leerDiagnostico,
  leerEstadoDeMiDiagnostico,
  leerLecturaDelDiagnostico,
  leerPregunta,
  leerResumenDeMiDiagnostico,
} from '../api/diagnosticoSchemas';

const pregunta = (extra: Record<string, unknown> = {}) => ({ id: 1, clave: 'diag_p1', texto: '¿Cuál es tu nombre?', tipo: 'TEXTO', requerida: true, ...extra });

describe('diagnosticoSchemas: lectura tolerante del diagnóstico', () => {
  it('una pregunta de un tipo desconocido se pierde ella, no el diagnóstico', () => {
    const d = leerDiagnostico({
      version: 3,
      estado: 'EN_CURSO',
      titulo: 'Diagnóstico inicial · Diplomado Renaser',
      secciones: [{ clave: 'a', titulo: 'Conociéndote', preguntas: [pregunta(), pregunta({ id: 2, tipo: 'HOLOGRAMA' }), 'basura'] }],
    });
    expect(d?.secciones).toHaveLength(1);
    expect(d?.secciones[0].preguntas.map(p => p.id)).toEqual([1]);
  });

  it('una sección sin preguntas dibujables no llega a la persona', () => {
    const d = leerDiagnostico({ secciones: [{ titulo: 'Vacía', preguntas: [pregunta({ tipo: 'OTRA' })] }] });
    expect(d?.secciones).toEqual([]);
  });

  it('sin duración ni portada toma 90 días y el título como portada', () => {
    const d = leerDiagnostico({ titulo: 'Mi diagnóstico' });
    expect(d?.duracion).toEqual({ dias: 90, texto: '90 días' });
    expect(d?.portada.titulo).toBe('Mi diagnóstico');
  });

  it('lo que no es un objeto no es un diagnóstico', () => {
    expect(leerDiagnostico('hola')).toBeNull();
    expect(leerDiagnostico(null)).toBeNull();
  });

  it('lee la condición, la escala y el destino', () => {
    const p = leerPregunta(pregunta({
      tipo: 'CUADRICULA',
      seMuestraSi: { preguntaId: 9, valor: 'Sí.' },
      escala: { min: 1, max: 5, etiquetaMin: 'Muy mal' },
      alimenta: 'OBJETIVO_CUERPO',
      largoMaximo: 500,
      opciones: [{ valor: 'a', etiqueta: 'A' }, { roto: true }],
    }));
    expect(p?.seMuestraSi).toEqual({ preguntaId: 9, valor: 'Sí.' });
    expect(p?.escala).toEqual({ min: 1, max: 5, etiquetaMin: 'Muy mal', etiquetaMax: null });
    expect(p?.alimenta).toBe('OBJETIVO_CUERPO');
    expect(p?.opciones).toEqual([{ valor: 'a', etiqueta: 'A' }]);
    expect(p?.largoMaximo).toBe(500);
  });
});

describe('diagnosticoSchemas: estado, resumen y lectura', () => {
  it('sin lectura del estado (backend anterior) la persona es de la ficha estándar', () => {
    expect(leerEstadoDeMiDiagnostico(undefined)).toEqual({ ficha: 'ESTANDAR', estado: 'NO_APLICA', version: null, completedAt: null });
  });

  it('el resumen ignora ejes que no conoce y nunca falla', () => {
    const r = leerResumenDeMiDiagnostico({ completado: true, prioridad: 'MARTE', objetivos: [{ eje: 'CUERPO', texto: 'x' }, { eje: 'MARTE', texto: 'y' }] });
    expect(r.prioridad).toBeNull();
    expect(r.objetivos).toEqual([{ eje: 'CUERPO', texto: 'x' }]);
    expect(leerResumenDeMiDiagnostico(null).completado).toBe(false);
  });

  it('la lectura omite secciones sin preguntas y marca las retiradas', () => {
    const l = leerLecturaDelDiagnostico({
      ficha: 'CON_DIAGNOSTICO',
      estado: 'COMPLETADO',
      secciones: [
        { titulo: 'Tu vida', preguntas: [{ id: 1, texto: 'Q', tipo: 'TEXTO', retirada: true, respuesta: { texto: 'R' } }] },
        { titulo: 'Vacía', preguntas: [] },
      ],
    });
    expect(l.secciones).toHaveLength(1);
    expect(l.secciones[0].preguntas[0].retirada).toBe(true);
    expect(l.secciones[0].preguntas[0].respuesta?.texto).toBe('R');
  });
});
