/**
 * Training después del rediseño aprobado por el dueño (2026-10-05). Se lee el código fuente sin
 * comentarios —la pantalla monta medio app—; acá importa QUÉ dibuja y con qué.
 *
 * Contra el código anterior falla: había emojis de texto (🦅 ⏳ 🕗 ▾ ⊘ ↺ «✓ GUARDADO»), versalitas
 * («VOLVER A TRAINING», «PONERLE OTRO NOMBRE», «0/7 CUMPLIDOS»), el asterisco de Espíritu en
 * «Próximo a vencer» y en «Ponerle otro nombre», diálogos de éxito y de «Ya está cumplido», ventanas
 * centradas y hojas hechas a mano, y la pestaña vacía «Guías y audios».
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const leer = (relativo: string) => fs.readFileSync(path.join(RAIZ, relativo), 'utf-8');

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const TRAINING = sinComentarios(leer('screens/TrainingScreen.tsx'));
const PROXIMO = sinComentarios(leer('features/training/components/ProximoAVencerCard.tsx'));
const PLANIFICAR = sinComentarios(leer('features/training/components/PlanificarDimensionModal.tsx'));
const EVIDENCIA = sinComentarios(leer('features/habits/components/EvidenciaHabitoModal.tsx'));
const RENOMBRAR = sinComentarios(leer('features/habits/components/RenombrarHabitoModal.tsx'));
const CLASE = sinComentarios(leer('features/academy/components/ClaseDiariaModal.tsx'));
const PASTILLA = sinComentarios(leer('features/spirit/components/PastillaRenacerModal.tsx'));
const ELEGIR = sinComentarios(leer('features/habits/components/ElegirHabitoParaFotoModal.tsx'));
const ICONOS = leer('components/Icon.tsx');

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{25B0}-\u{25FF}\u{2298}]/u;

describe('Training: sin emojis ni glifos de texto haciendo de ícono', () => {
  it('ni en la pantalla ni en sus hojas', () => {
    for (const [nombre, codigo] of Object.entries({ TRAINING, PROXIMO, PLANIFICAR, EVIDENCIA, RENOMBRAR, CLASE, PASTILLA, ELEGIR })) {
      const conEmoji = codigo.split('\n').filter(l => EMOJI.test(l));
      expect({ nombre, conEmoji }).toEqual({ nombre, conEmoji: [] });
    }
  });

  it('el asterisco queda solo para Espíritu y el corazón solo para Emociones', () => {
    expect(PROXIMO).not.toContain("name=\"spark\"");
    expect(PROXIMO).toContain('name="timer"');
    expect((TRAINING.match(/'spark'/g) ?? []).length).toBe(1);
    expect((TRAINING.match(/'heart'/g) ?? []).length).toBe(1);
    expect(TRAINING).toMatch(/<Icon name="pencil"/);
  });

  it('los íconos nuevos están en su bloque «Training» de Icon.tsx y en una línea propia del tipo', () => {
    expect(ICONOS).toContain('/* Training */');
    const linea = ICONOS.split('\n').find(l => l.includes("| 'timer'"));
    expect(linea).toBeDefined();
    // `flame` también lo trajo el rediseño de Hoy, que entró antes al integrar: vive en el bloque de Hoy.
    expect(ICONOS).toContain("case 'flame':");
    for (const nombre of ['timer', 'badgeCheck', 'hourglass', 'ban', 'rotateCcw', 'audioLines', 'sunrise', 'sunMedium', 'moonStar', 'glassWater', 'showerHead', 'footprints', 'salad', 'utensils', 'utensilsCrossed', 'bookOpenText', 'headphones', 'notebookPen', 'handHeart', 'smartphoneOff']) {
      expect(linea).toContain(`'${nombre}'`);
      expect(ICONOS.slice(ICONOS.indexOf('/* Training */'))).toContain(`case '${nombre}':`);
    }
  });
});

describe('Training: tipo oración y respuesta al tacto', () => {
  it('sin las versalitas de antes', () => {
    for (const viejo of ['VOLVER A TRAINING', 'DIMENSIÓN ·', 'CUMPLIDOS</', 'PONERLE OTRO NOMBRE', 'CAMBIAR O QUITAR EL NOMBRE', 'TU ENTRENAMIENTO INTEGRAL', 'PLANIFICAR {', "'SUBIR'", "'VER'", 'Evidencia Sellada', 'HÁBITOS & EVIDENCIAS', 'GUÍAS Y AUDIOS', 'EN DESARROLLO']) {
      expect({ viejo, esta: TRAINING.includes(viejo) }).toEqual({ viejo, esta: false });
    }
    for (const viejo of ['CERRAR</', 'VOLVER</', 'CREAR UN HÁBITO EN', 'ELIGE UN ICONO', '¿A QUÉ HORA?', '¿QUÉ DÍAS?', 'RECORDATORIO {', 'TODOS LOS DÍAS', 'GUARDAR ${', 'CREAR A LAS']) {
      expect({ viejo, esta: PLANIFICAR.includes(viejo) }).toEqual({ viejo, esta: false });
    }
    expect(EVIDENCIA).not.toMatch(/'FOTO'\s*,\s*etiqueta: 'FOTO'|TOMAR FOTO|SELLAR EVIDENCIA|CANCELAR/);
    expect(RENOMBRAR).not.toContain('Ponele');
    expect(RENOMBRAR).toContain('Ponle');
    expect(CLASE).not.toMatch(/CLASE DIARIA|ENVIAR Y COMPLETAR|CLASE COMPLETADA/);
  });

  it('dimensiones, hábitos, ✓ y el botón de la derecha se hunden al tocarlos; marcar vibra', () => {
    expect(TRAINING).not.toMatch(/<Pressable\b/);
    expect(TRAINING).toMatch(/if \(!habit\.done\) tacto\.seleccion\(\);\s*toggleHabitState\(habit\.id\)/);
    expect(PLANIFICAR).not.toMatch(/<Pressable\b/);
    expect(PROXIMO).toContain('<Presionable');
  });
});

describe('Training: avisos y hábitos cumplidos', () => {
  it('los avisos de éxito son una línea que se va sola, con el háptico de logro', () => {
    expect(TRAINING).not.toMatch(/Sellada|Pastilla Renaser registrada 🦅|Alert\.alert\(\s*'Ya está cumplido'/);
    expect(TRAINING).toMatch(/const confirmar = \(texto: string, habitoId: string \| null\) => \{\s*tacto\.logro\(\);/);
    expect(TRAINING).toContain('<ConfirmacionEnLinea');
    expect(PLANIFICAR).not.toMatch(/Alert\.alert\(\s*'Horario guardado'|Alert\.alert\('Hábito creado'|Alert\.alert\('Listo', mensaje\)/);
    expect(PLANIFICAR).toContain('<ConfirmacionEnLinea');
  });

  it('tocar uno cumplido lo despliega en la tarjeta, sin diálogo', () => {
    expect(TRAINING).not.toContain("'Ya está cumplido'");
    expect(TRAINING).toMatch(/alternarCumplido\(habit\.id\)/);
    expect(TRAINING).toContain('detalleDelCumplido(habit)');
  });

  it('«Guías y audios» no se dibuja mientras no tenga contenido', () => {
    expect(TRAINING).toMatch(/const GUIAS_DE_LA_DIMENSION = 0;/);
    expect(TRAINING).toMatch(/secciones\.length > 1 && \(\s*<ControlSegmentado/);
  });
});

describe('Training: hojas desde abajo', () => {
  it('evidencia, cambiar nombre, clase diaria, planificar, pastilla y elegir hábito usan la hoja de la app', () => {
    for (const [nombre, codigo] of Object.entries({ PLANIFICAR, EVIDENCIA, RENOMBRAR, CLASE, PASTILLA, ELEGIR })) {
      expect({ nombre, hoja: codigo.includes('<HojaDesdeAbajo'), modalPropio: /<Modal\b/.test(codigo) })
        .toEqual({ nombre, hoja: true, modalPropio: false });
    }
    expect(PLANIFICAR).toMatch(/tamano="grande"/);
    expect(PASTILLA).toMatch(/tamano="grande"/);
  });

  it('«Pausar…» es una hoja de opciones, no un diálogo de tres botones', () => {
    expect(PLANIFICAR).not.toMatch(/Alert\.alert\(`Pausar/);
    expect(PLANIFICAR).toContain('<OpcionDeHoja etiqueta="Solo hoy"');
    expect(PLANIFICAR).toContain('<OpcionDeHoja etiqueta="Hasta que yo lo reactive"');
  });

  it('la evidencia elige la forma en un control segmentado y graba con un micrófono', () => {
    expect(EVIDENCIA).toContain('<ControlSegmentado');
    expect(EVIDENCIA).toMatch(/etiqueta=\{[\s\S]{0,160}'Grabar audio'[\s\S]{0,40}\}\s*icono="mic"/);
    expect(EVIDENCIA).not.toMatch(/icono[:=]\s*["']volume["']|icono[:=]\s*["']play["']/);
  });
});
