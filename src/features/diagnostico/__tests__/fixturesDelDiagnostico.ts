import type {
  DiagnosticoParaLaPersona,
  PreguntaDelDiagnostico,
  RespuestaDelDiagnostico,
  SeccionDelDiagnostico,
} from '../types/diagnostico.types';

/**
 * Un diagnóstico de prueba con la misma ESTRUCTURA que el del dueño (`diagnostico-inicial.csv` de la spec 026): seis
 * secciones, la cuadrícula de satisfacción, la pregunta condicional del negocio con sus cuatro hijas, las casillas con
 * máximo 2, los destinos que alimentan objetivos y el consentimiento. Las pruebas del recorrido, de los pasos y de la
 * validación parten de aquí.
 */

export const P = {
  nombre: 1,
  edad: 2,
  ciudad: 3,
  dedica: 4,
  satisfaccion: 5,
  sueno: 6,
  tieneNegocio: 13,
  negocioQueHace: 131,
  negocioFacturacion: 132,
  negocioUtilidad: 133,
  negocioPersonas: 134,
  queHaces: 14,
  situacion: 15,
  relaciones: 16,
  salud: 17,
  riqueza: 18,
  prioridad: 19,
  cambio: 20,
  primeraAccion: 21,
  tiempo: 22,
  consentimiento: 23,
} as const;

export function pregunta(extra: Partial<PreguntaDelDiagnostico> & { id: number; tipo: PreguntaDelDiagnostico['tipo'] }): PreguntaDelDiagnostico {
  return {
    clave: `diag_p${extra.id}`,
    texto: `Pregunta ${extra.id}`,
    ayuda: null,
    requerida: true,
    maximoOpciones: null,
    largoMaximo: null,
    opciones: [],
    escala: null,
    seMuestraSi: null,
    alimenta: null,
    precarga: null,
    ...extra,
  };
}

const SI_NO = [
  { valor: 'Sí.', etiqueta: 'Sí.' },
  { valor: 'No.', etiqueta: 'No.' },
];

const AREAS = ['Mi salud', 'Mis relaciones', 'Mi dinero', 'Mi trabajo', 'Mi crecimiento', 'Mi descanso', 'Mi propósito'];

export function seccionesDeEjemplo(): SeccionDelDiagnostico[] {
  return [
    {
      clave: 'conociendote',
      titulo: 'Conociéndote',
      descripcion: 'Cuéntanos quién eres.',
      preguntas: [
        pregunta({ id: P.nombre, tipo: 'TEXTO', texto: '¿Cuál es tu nombre completo?', precarga: 'María Pérez' }),
        pregunta({ id: P.edad, tipo: 'NUMERO', texto: '¿Qué edad tienes?' }),
        pregunta({ id: P.ciudad, tipo: 'TEXTO', texto: '¿En qué ciudad vives?', precarga: 'Arequipa' }),
        pregunta({ id: P.dedica, tipo: 'TEXTO', texto: '¿A qué te dedicas?', requerida: false }),
      ],
    },
    {
      clave: 'tu-vida-hoy',
      titulo: 'Tu vida hoy',
      descripcion: null,
      preguntas: [
        pregunta({
          id: P.satisfaccion,
          tipo: 'CUADRICULA',
          texto: '¿Qué tan satisfecho(a) estás con cada área?',
          opciones: AREAS.map(a => ({ valor: a, etiqueta: a })),
          escala: { min: 1, max: 5, etiquetaMin: 'Muy insatisfecho(a)', etiquetaMax: 'Muy satisfecho(a)' },
        }),
        pregunta({
          id: P.sueno,
          tipo: 'SELECCION_UNICA',
          texto: '¿Cuántas horas duermes?',
          opciones: [{ valor: 'Menos de 6', etiqueta: 'Menos de 6' }, { valor: '6 a 8', etiqueta: '6 a 8' }],
        }),
        pregunta({ id: P.tieneNegocio, tipo: 'SELECCION_UNICA', texto: '¿Tienes un negocio que ya genera ventas?', opciones: SI_NO }),
      ],
    },
    {
      clave: 'tu-negocio',
      titulo: 'Tu negocio',
      descripcion: 'Solo si tienes un negocio.',
      preguntas: [
        pregunta({ id: P.negocioQueHace, tipo: 'TEXTO', texto: '¿A qué se dedica tu negocio?', seMuestraSi: { preguntaId: P.tieneNegocio, valor: 'Sí.' } }),
        pregunta({ id: P.negocioFacturacion, tipo: 'NUMERO', texto: '¿Cuánto factura al mes?', seMuestraSi: { preguntaId: P.tieneNegocio, valor: 'Sí.' } }),
        pregunta({ id: P.negocioUtilidad, tipo: 'NUMERO', texto: '¿Cuánta utilidad deja?', seMuestraSi: { preguntaId: P.tieneNegocio, valor: 'Sí.' }, requerida: false }),
        pregunta({ id: P.negocioPersonas, tipo: 'NUMERO', texto: '¿Cuántas personas trabajan?', seMuestraSi: { preguntaId: P.tieneNegocio, valor: 'Sí.' } }),
      ],
    },
    {
      clave: 'mente',
      titulo: 'Tu mente, tus decisiones y tus resultados',
      descripcion: null,
      preguntas: [
        pregunta({
          id: P.queHaces,
          tipo: 'SELECCION_MULTIPLE',
          texto: '¿Qué haces cuando no actúas?',
          maximoOpciones: 2,
          opciones: [
            { valor: 'Postergo', etiqueta: 'Postergo' },
            { valor: 'Dudo', etiqueta: 'Dudo' },
            { valor: 'Me distraigo', etiqueta: 'Me distraigo' },
          ],
        }),
        pregunta({ id: P.situacion, tipo: 'AREA_TEXTO', texto: 'Cuenta una situación real de los últimos 30 días.' }),
      ],
    },
    {
      clave: 'vision',
      titulo: 'Tu visión y materialización',
      descripcion: null,
      preguntas: [
        pregunta({ id: P.relaciones, tipo: 'AREA_TEXTO', texto: 'En relaciones, en {duracion} quiero haber conseguido…', largoMaximo: 500, alimenta: 'OBJETIVO_RELACIONES' }),
        pregunta({ id: P.salud, tipo: 'AREA_TEXTO', texto: 'En salud…', largoMaximo: 500, alimenta: 'OBJETIVO_CUERPO' }),
        pregunta({ id: P.riqueza, tipo: 'AREA_TEXTO', texto: 'En riqueza…', largoMaximo: 500, alimenta: 'OBJETIVO_NEGOCIO' }),
        pregunta({
          id: P.prioridad,
          tipo: 'SELECCION_UNICA',
          texto: '¿Cuál es tu prioridad principal?',
          alimenta: 'PRIORIDAD_PRINCIPAL',
          opciones: [
            { valor: 'CUERPO', etiqueta: 'Salud y bienestar' },
            { valor: 'TRABAJO', etiqueta: 'Riqueza y negocios' },
            { valor: 'RELACIONES', etiqueta: 'Relaciones' },
          ],
        }),
        pregunta({ id: P.cambio, tipo: 'AREA_TEXTO', texto: '¿Qué cambio quieres ver en 12 meses?', requerida: false }),
      ],
    },
    {
      clave: 'accion',
      titulo: 'De la decisión a la acción',
      descripcion: null,
      preguntas: [
        pregunta({ id: P.primeraAccion, tipo: 'AREA_TEXTO', texto: '¿Cuál será tu primera acción?', largoMaximo: 500, alimenta: 'PRIMERA_ACCION' }),
        pregunta({
          id: P.tiempo,
          tipo: 'SELECCION_UNICA',
          texto: '¿Cuánto tiempo semanal le dedicarás?',
          opciones: [{ valor: '1 a 3 h', etiqueta: '1 a 3 h' }, { valor: '4 a 6 h', etiqueta: '4 a 6 h' }],
        }),
        pregunta({
          id: P.consentimiento,
          tipo: 'CASILLA',
          texto: 'Declaración de responsabilidad y consentimiento',
          ayuda: 'Declaro que mis respuestas son verdaderas y autorizo su uso para mi acompañamiento.',
          opciones: [{ valor: 'acepto', etiqueta: 'He leído y acepto la declaración' }],
        }),
      ],
    },
  ];
}

export function diagnosticoDeEjemplo(extra: Partial<DiagnosticoParaLaPersona> = {}): DiagnosticoParaLaPersona {
  return {
    version: 3,
    estado: 'PENDIENTE',
    titulo: 'Diagnóstico inicial · Diplomado Renaser',
    portada: {
      titulo: 'Diagnóstico inicial',
      mensaje: 'Tiempo estimado: 15 minutos\nNo buscamos respuestas perfectas. Buscamos respuestas verdaderas.',
    },
    formacion: { codigo: 'DIPLOMADO', nombre: 'Diplomado Renaser' },
    duracion: { dias: 365, texto: '1 año' },
    paso: null,
    secciones: seccionesDeEjemplo(),
    respuestas: [],
    ...extra,
  };
}

export function respuestaTexto(preguntaId: number, valorTexto: string): RespuestaDelDiagnostico {
  return { preguntaId, valorTexto, valorNumero: null, valorBooleano: null, valorEscala: null, valorJson: null };
}

export function respuestaNumero(preguntaId: number, valorNumero: number): RespuestaDelDiagnostico {
  return { preguntaId, valorTexto: null, valorNumero, valorBooleano: null, valorEscala: null, valorJson: null };
}

export function respuestaJson(preguntaId: number, valorJson: string): RespuestaDelDiagnostico {
  return { preguntaId, valorTexto: null, valorNumero: null, valorBooleano: null, valorEscala: null, valorJson };
}

export function respuestaBooleano(preguntaId: number): RespuestaDelDiagnostico {
  return { preguntaId, valorTexto: null, valorNumero: null, valorBooleano: true, valorEscala: null, valorJson: null };
}

export function filasCompletas(valor = 4): Record<string, number> {
  return Object.fromEntries(AREAS.map(a => [a, valor]));
}

/** Contesta todo lo obligatorio con algo válido (el negocio, solo si se dice «Sí.»). */
export function respuestasCompletas(conNegocio: boolean): RespuestaDelDiagnostico[] {
  return [
    respuestaTexto(P.nombre, 'María Pérez'),
    respuestaNumero(P.edad, 34),
    respuestaTexto(P.ciudad, 'Arequipa'),
    respuestaJson(P.satisfaccion, JSON.stringify(filasCompletas())),
    respuestaTexto(P.sueno, '6 a 8'),
    respuestaTexto(P.tieneNegocio, conNegocio ? 'Sí.' : 'No.'),
    ...(conNegocio
      ? [respuestaTexto(P.negocioQueHace, 'Panadería'), respuestaNumero(P.negocioFacturacion, 12000), respuestaNumero(P.negocioPersonas, 4)]
      : []),
    respuestaJson(P.queHaces, JSON.stringify(['Postergo'])),
    respuestaTexto(P.situacion, 'Dejé una reunión importante para después.'),
    respuestaTexto(P.relaciones, 'Hablar con mi familia cada semana.'),
    respuestaTexto(P.salud, 'Bajar 8 kilos.'),
    respuestaTexto(P.riqueza, 'Duplicar mis ventas.'),
    respuestaTexto(P.prioridad, 'TRABAJO'),
    respuestaTexto(P.primeraAccion, 'Llamar a mi primer cliente.'),
    respuestaTexto(P.tiempo, '4 a 6 h'),
    respuestaBooleano(P.consentimiento),
  ];
}
