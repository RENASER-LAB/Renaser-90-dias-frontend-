/**
 * Comunidad después del inventario de íconos (2026-10-05, tandas 1 y 3). Se lee el código fuente sin
 * comentarios —la pantalla tiene ~5000 líneas y monta medio app; acá importa QUÉ dibuja—.
 *
 * Contra el código anterior falla: la sección decía «Classroom», los medallones usaban `chat`, `stack`
 * y `star`, las lecciones pintaban 🎥📄🔗✍️ y 🔒, el Ranking ⚡/🔥/🏆, los textos iban en versales
 * («VER TODOS», «VOLVER A CURSOS», «✓ MARCAR LECCIÓN COMO COMPLETADA», «SIGUIENTE 🔒») y publicar o
 * compartir abría un diálogo «¡… ! 🦅».
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

function archivosFuente(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entrada => {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) return entrada.name === '__tests__' ? [] : archivosFuente(ruta);
    return /\.(ts|tsx)$/.test(entrada.name) ? [ruta] : [];
  });
}

const COMUNIDAD = sinComentarios(leer('screens/ComunidadScreen.tsx'));
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/** El bloque `SECCIONES = [ … ]` de la pantalla, fila por fila. */
function secciones(): { id: string; icon: string; label: string }[] {
  const bloque = COMUNIDAD.slice(COMUNIDAD.indexOf('const SECCIONES'), COMUNIDAD.indexOf('];', COMUNIDAD.indexOf('const SECCIONES')));
  return [...bloque.matchAll(/\{ id: '(\w+)', icon: '(\w+)', label: '([^']+)' \}/g)].map(m => ({ id: m[1], icon: m[2], label: m[3] }));
}

describe('Comunidad: secciones', () => {
  it('«Cursos» y no «Classroom»; la clave interna sigue siendo `classroom`', () => {
    const filas = secciones();
    expect(filas.map(f => f.label)).toEqual(['Muro', 'Eventos', 'Cursos', 'Tribu', 'Ranking', 'Testimonios']);
    expect(filas.find(f => f.label === 'Cursos')?.id).toBe('classroom');
  });

  it('ningún texto visible de la app dice «Classroom»', () => {
    const conClassroom = archivosFuente(RAIZ).flatMap(archivo =>
      sinComentarios(fs.readFileSync(archivo, 'utf8'))
        .split('\n')
        .filter(linea => /\bClassroom\b/.test(linea))
        .map(linea => `${path.relative(RAIZ, archivo)}: ${linea.trim()}`)
    );
    expect(conClassroom).toEqual([]);
  });

  it('cada sección lleva su ícono de línea, sin emojis ni metáforas repetidas', () => {
    const filas = secciones();
    expect(Object.fromEntries(filas.map(f => [f.label, f.icon]))).toEqual({
      Muro: 'newspaper',
      Eventos: 'calendar',
      Cursos: 'bookOpen',
      Tribu: 'users',
      Ranking: 'trophy',
      Testimonios: 'quote',
    });
    for (const f of filas) expect(EMOJI.test(f.icon + f.label)).toBe(false);
  });

  it('los medallones son pestañas con estado, se hunden al tocarlas y vibran al cambiar', () => {
    expect(COMUNIDAD).toMatch(/<Presionable\s+key=\{s\.id\}[\s\S]{0,200}if \(!activa\) tacto\.seleccion\(\);/);
    expect(COMUNIDAD).toMatch(/accessibilityRole="tab"\s+accessibilityLabel=\{s\.label\}\s+accessibilityState=\{\{ selected: activa \}\}/);
    expect(COMUNIDAD).toMatch(/gap: filaDeSecciones\.separacion/);
  });
});

describe('Comunidad: emojis que hacían de ícono', () => {
  it('lecciones, ranking y estados vacíos con íconos de línea', () => {
    for (const viejo of ["'🎥'", "'📄'", "'🔗'", "'✍️'", "? '🔒'", '⚡ {u.scoreText}', '>🏆<', "'SIGUIENTE 🔒'", "'FINALIZAR 🔒'"]) {
      expect(COMUNIDAD).not.toContain(viejo);
    }
    expect(COMUNIDAD).toMatch(/const ICONO_POR_TIPO_DE_LECCION: Record<ResourceType, IconName> = \{\s*video: 'video',\s*doc: 'fileText',\s*link: 'link',\s*text: 'pencil',\s*\}/);
    expect(COMUNIDAD).toMatch(/<Icon name="trophy" size=\{28\}/);
  });

  it('la meta de una lección ya no repite el tipo con un emoji', () => {
    const mapeador = sinComentarios(leer('features/academy/api/academyMappers.ts'));
    expect(mapeador).not.toMatch(/[🎥📄]|✍️/u);
  });

  it('el podio y la tabla muestran la cifra sola', () => {
    expect(sinComentarios(leer('features/community/components/PodioRanking.tsx'))).not.toContain('🔥');
    expect(sinComentarios(leer('features/ranking/utils/tablasDeRanking.ts'))).not.toContain('⚡');
  });

  it('«Escribir» con su ícono, no «💬 Chatear»', () => {
    const fila = sinComentarios(leer('features/community/components/FilaIntegrante.tsx'));
    expect(fila).not.toContain('💬');
    expect(fila).toMatch(/<Icon name="messageCircle"[\s\S]{0,200}>Escribir<\/Text>/);
  });

  it('los sellos de la lista distinguen grupo, comunidad y soporte', () => {
    const avatar = sinComentarios(leer('features/chat/components/AvatarDeChat.tsx'));
    expect(avatar).toMatch(/celula: 'users',\s*global: 'globe',\s*soporte: 'headset',/);
  });
});

describe('Comunidad: mayúsculas espaciadas → tipo oración', () => {
  it('ya no quedan los rótulos en versales de esta tanda', () => {
    for (const viejo of ["'VER TODOS'", "'OCULTAR'", 'VOLVER A CURSOS', 'VOLVER A LA SECCIÓN', 'MARCAR LECCIÓN COMO COMPLETADA', 'QUITAR DE COMPLETADAS', 'EXPLORAR CONTENIDO', '✓ HECHO', "'Ver más... ▼'", "'Ver menos ▲'", '‹ ANTERIOR']) {
      expect(COMUNIDAD).not.toContain(viejo);
    }
    expect(sinComentarios(leer('features/academy/api/academyMappers.ts'))).not.toMatch(/'CURSO (ABIERTO|RESTRINGIDO|BLOQUEADO)'/);
  });

  it('las flechas de volver van a 24', () => {
    expect(COMUNIDAD).not.toMatch(/<Icon name="arrowLeft" size=\{14\}/);
    expect((COMUNIDAD.match(/<Icon name="arrowLeft" size=\{TAMANO_ICONO\.grande\}/g) ?? []).length).toBe(2);
    expect(sinComentarios(leer('features/eventos/components/piezas.tsx'))).toMatch(/<Icon name="arrowLeft" size=\{24\}/);
  });
});

describe('Comunidad: los avisos de éxito ya no interrumpen', () => {
  it('publicar, compartir, el hábito y las lecciones se confirman en línea y vibran una vez', () => {
    for (const viejo of ['¡Publicación Compartida!', '¡Hábito completado!', '¡Excelente Progreso!', '¡Curso Completado!', "'Lección actualizada'"]) {
      expect(COMUNIDAD).not.toContain(viejo);
    }
    // Publicar vibra una sola vez: en el toque de «Publicar» (`NuevaPublicacion`), no otra al confirmarse.
    expect(COMUNIDAD).toMatch(/setConfirmacionMuro\(\{ clave: Date\.now\(\), texto: 'Publicado en el Muro\.' \}\);/);
    expect(COMUNIDAD).not.toMatch(/texto: 'Publicado en el Muro\.' \}\);\s*tacto\.logro\(\);/);
    expect(sinComentarios(leer('features/community/components/NuevaPublicacion.tsx'))).toMatch(/if \(puede\) tacto\.logro\(\);/);
    expect(COMUNIDAD).toMatch(/setConfirmacionDePublicacion\(\{[\s\S]{0,200}\}\);\s*tacto\.logro\(\);/);
    expect(COMUNIDAD).toMatch(/<ConfirmacionEnLinea/);
  });
});

describe('el botón flotante de SER', () => {
  // Corregido 2026-10-06: el orbe (`OrbeQuieto`) pasó a ser el fénix de SER en foto fija (`FenixDeSerQuieto`).
  it('lleva el fénix de SER y un nombre, no el globo de chat', () => {
    const lanzador = sinComentarios(leer('features/renasia/components/RenasiaLauncher.tsx'));
    expect(lanzador).not.toMatch(/icon="chat"/);
    expect(lanzador).not.toMatch(/<OrbeQuieto /);
    // 2026-10-07: la misma foto fija, que da un saltito al cumplir un hábito (`FenixDeSerQueSalta`).
    expect(lanzador).toMatch(/<FenixDeSerQueSalta size=\{TAMANO_FENIX\}/);
    expect(lanzador).toMatch(/accessibilityLabel=\{`Hablar con \$\{NOMBRE_ACOMPANANTE\}, tu acompañante`\}/);
  });
});
