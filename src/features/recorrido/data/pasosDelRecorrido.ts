/**
 * Spec 045: los textos del recorrido de bienvenida, en un solo lugar para que el dueño los cambie sin tocar la lógica.
 * Una frase por paso, tipo oración, tuteo de Perú y nada en inglés (D8). La pestaña del centro se llama «Entrenar» (D5).
 */
export type PestanaDelRecorrido = 'Hoy' | 'Plan' | 'Training' | 'Comunidad';

export type PasoDelRecorrido = {
  numero: number;
  /** La pestaña que se resalta (por el nombre de su ruta, que sigue siendo 'Training' para Entrenar). `null` = sin foco. */
  pestana: PestanaDelRecorrido | null;
  titulo: string;
  frase: string;
  botonPrincipal: string;
  botonSecundario: string;
};

/** D6: sin género. Con el primer nombre si existe. */
export function tituloDeBienvenida(nombre?: string | null): string {
  const primer = (nombre ?? '').trim().split(/\s+/)[0];
  return primer ? `Te damos la bienvenida, ${primer}` : 'Te damos la bienvenida';
}

export function pasosDelRecorrido(nombre?: string | null): PasoDelRecorrido[] {
  return [
    {
      numero: 1,
      pestana: null,
      titulo: tituloDeBienvenida(nombre),
      frase: 'Te muestro en un minuto dónde está cada cosa.',
      botonPrincipal: 'Empezar',
      botonSecundario: 'Saltar',
    },
    {
      numero: 2,
      pestana: 'Hoy',
      titulo: 'Hoy',
      frase: 'Lo de hoy, de un vistazo: tu hábito de esta hora y tu acompañante SER.',
      botonPrincipal: 'Siguiente',
      botonSecundario: 'Saltar',
    },
    {
      numero: 3,
      pestana: 'Plan',
      titulo: 'Plan',
      frase: 'Tus objetivos y la semana: aquí decides hacia dónde vas.',
      botonPrincipal: 'Siguiente',
      botonSecundario: 'Saltar',
    },
    {
      numero: 4,
      pestana: 'Training',
      titulo: 'Entrenar',
      frase: 'Tus hábitos del día, hora por hora. Aquí registras lo que haces.',
      botonPrincipal: 'Siguiente',
      botonSecundario: 'Saltar',
    },
    {
      numero: 5,
      pestana: 'Comunidad',
      titulo: 'Tu primera publicación',
      frase: 'Preséntate al grupo: quién eres y qué vienes a cambiar. Con una foto.',
      botonPrincipal: 'Escribir mi publicación',
      botonSecundario: 'Cerrar',
    },
  ];
}

/** El texto de ayuda del compositor del Muro cuando se abre desde el recorrido. */
export const AYUDA_DEL_PRIMER_POST = '¿Quién eres y qué vienes a cambiar?';

export const PREGUNTA_SALTAR = {
  titulo: '¿Saltar el recorrido?',
  mensaje: 'Puedes volver a verlo desde Yo → Ajustes.',
  confirmar: 'Saltar',
  cancelar: 'Seguir viendo',
};

/** D9 (06/11): el primer post es obligatorio para una cuenta nueva; lo demás se abre al publicar. */
export const AVISO_DEL_BLOQUEO = 'Lo demás se abre cuando publiques.';
