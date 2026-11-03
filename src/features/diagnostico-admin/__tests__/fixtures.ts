import type { PreguntaAdmin, SeccionAdmin } from '../types/diagnosticoAdmin.types';

/** Datos de prueba compartidos: una ficha chica con una condición, una protegida y una que alimenta un objetivo. */
export function pregunta(parcial: Partial<PreguntaAdmin> & { id: number }): PreguntaAdmin {
  return {
    clave: `p${parcial.id}`,
    orden: 0,
    seccionId: 2,
    estado: 'ACTIVA',
    protegida: false,
    respuestas: 0,
    texto: `Pregunta ${parcial.id}`,
    ayuda: null,
    tipo: 'TEXTO',
    requerida: false,
    maximoOpciones: null,
    opciones: [],
    escala: null,
    seMuestraSi: null,
    alimenta: null,
    formaciones: null,
    precarga: null,
    ...parcial,
  };
}

export function seccion(parcial: Partial<SeccionAdmin> & { id: number }): SeccionAdmin {
  return {
    clave: `s${parcial.id}`,
    titulo: `Sección ${parcial.id}`,
    descripcion: null,
    orden: parcial.id,
    esPortada: false,
    preguntas: [],
    ...parcial,
  };
}

export const SI_NO = [
  { valor: 'Sí.', etiqueta: 'Sí.' },
  { valor: 'No.', etiqueta: 'No.' },
];

/**
 * portada (1) · Conociéndote (2: p10 texto, p11 opción única Sí/No) · Tu vida (3: p12 condicionada a p11=Sí., p13 que alimenta Cuerpo,
 * p14 protegida con respuestas).
 */
export function fichaDePrueba(): SeccionAdmin[] {
  return [
    seccion({ id: 1, orden: 0, esPortada: true, titulo: 'Diagnóstico inicial' }),
    seccion({
      id: 2,
      orden: 1,
      titulo: 'Conociéndote',
      preguntas: [
        pregunta({ id: 10, orden: 0, seccionId: 2, texto: '¿Cuál es tu nombre completo?', requerida: true }),
        pregunta({ id: 11, orden: 1, seccionId: 2, texto: '¿Tienes pareja?', tipo: 'SELECCION_UNICA', opciones: SI_NO }),
      ],
    }),
    seccion({
      id: 3,
      orden: 2,
      titulo: 'Tu vida',
      preguntas: [
        pregunta({ id: 12, orden: 0, seccionId: 3, texto: 'Cuéntanos de tu pareja', tipo: 'AREA_TEXTO', seMuestraSi: { preguntaId: 11, valor: 'Sí.' } }),
        pregunta({ id: 13, orden: 1, seccionId: 3, texto: '¿Qué quieres lograr con tu cuerpo?', tipo: 'AREA_TEXTO', alimenta: 'OBJETIVO_CUERPO', respuestas: 4 }),
        pregunta({ id: 14, orden: 2, seccionId: 3, texto: '¿Cómo te llamamos?', tipo: 'SELECCION_UNICA', alimenta: 'TRATO_DE_LA_PERSONA', protegida: true, respuestas: 9, opciones: [
          { valor: 'MASCULINO', etiqueta: 'Él' },
          { valor: 'FEMENINO', etiqueta: 'Ella' },
          { valor: 'NEUTRO', etiqueta: 'Elle' },
        ] }),
      ],
    }),
  ];
}
