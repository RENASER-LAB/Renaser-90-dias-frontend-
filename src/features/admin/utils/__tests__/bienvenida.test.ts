import { describe, expect, it } from '@jest/globals';

import { ApiError } from '../../../../services/http/apiClient';
import {
  MARCADOR_MENTOR,
  MARCADOR_NOMBRE,
  NOMBRE_DE_EJEMPLO,
  SIN_ALMACENAMIENTO,
  SIN_PERMISO,
  accionesDeLaPortada,
  acotarNombreDeEjemplo,
  ayudaDeMarcadores,
  estadoDeLaPortada,
  estadoDelTexto,
  fechaYHoraDelCambio,
  insertarMarcador,
  largoDelTexto,
  marcadoresDelTexto,
  marcadoresQueFaltan,
  mensajeDeErrorDeBienvenida,
  nombreParaLaMuestra,
  piezaDelTexto,
  revisarTexto,
  sePuedeGuardar,
  seManda,
  vistaPrevia,
} from '../bienvenida';

/**
 * La pantalla «Bienvenida» de Administración (pedido del dueño del 27/09; backend D-210): Admin y
 * Alquimista cambian los tres mensajes y la portada de la tarjeta. Esta lógica no existía: todo el
 * archivo falla contra el código anterior.
 */

const SOPORTE = [MARCADOR_NOMBRE];
const GRUPO = [MARCADOR_NOMBRE, MARCADOR_MENTOR];
const LARGO = 1000;

describe('qué es cada mensaje', () => {
  it('los tres mensajes con palabras simples, y uno nuevo del servidor no rompe', () => {
    expect(piezaDelTexto('SOPORTE_CON_LA_TARJETA').titulo).toBe('Mensaje que acompaña la tarjeta');
    expect(piezaDelTexto('SOPORTE_FORMAL').titulo).toBe('Mensaje formal de bienvenida');
    expect(piezaDelTexto('GRUPO').titulo).toBe('Mensaje al entrar a su grupo');
    expect(piezaDelTexto('GRUPO').detalle).toBe('Llega al chat del grupo cuando la persona se suma.');
    expect(piezaDelTexto('OTRO_NUEVO')).toEqual({ titulo: 'Mensaje de bienvenida', detalle: '' });
  });

  it('la ayuda dice dónde va cada marcador', () => {
    expect(ayudaDeMarcadores(SOPORTE)).toBe('Escribe {nombre} donde va el nombre de la persona.');
    expect(ayudaDeMarcadores(GRUPO)).toBe(
      'Escribe {nombre} donde va el nombre de la persona y {mentor} donde va el de su mentor.',
    );
    expect(ayudaDeMarcadores([])).toBe('');
  });
});

describe('revisión local del texto: la misma que hace el servidor antes de guardar', () => {
  it('no puede quedar vacío, ni con solo espacios', () => {
    expect(revisarTexto('', SOPORTE, LARGO)).toEqual({ ok: false, error: 'El mensaje no puede quedar vacío.' });
    expect(revisarTexto('   \n ', SOPORTE, LARGO)).toEqual({ ok: false, error: 'El mensaje no puede quedar vacío.' });
  });

  it('el largo se cuenta en caracteres de verdad y sin los espacios de los bordes (un emoji es uno)', () => {
    expect(largoDelTexto('  🌿  ')).toBe(1);
    expect('🌿'.length).toBe(2); // lo que contaría `length`, y el servidor no
    const conEmojis = `${MARCADOR_NOMBRE} ${'🌿'.repeat(LARGO - 9)}`;
    expect(largoDelTexto(conEmojis)).toBe(LARGO);
    expect(revisarTexto(conEmojis, SOPORTE, LARGO).ok).toBe(true);
    expect(revisarTexto(`${conEmojis}!`, SOPORTE, LARGO)).toEqual({
      ok: false,
      error: 'El mensaje tiene 1001 caracteres: el máximo es 1000.',
    });
  });

  it('le falta un marcador: dice cuál y qué va ahí', () => {
    expect(revisarTexto('Hola, te damos la bienvenida.', SOPORTE, LARGO)).toEqual({
      ok: false,
      error: 'Falta {nombre}: es donde va el nombre de la persona.',
    });
    expect(revisarTexto('¡Hola, {nombre}! Bienvenida al grupo.', GRUPO, LARGO)).toEqual({
      ok: false,
      error: 'Falta {mentor}: es donde va el nombre de su mentor.',
    });
  });

  it('un marcador que no se reemplaza se rechaza: {mentor} en un mensaje del soporte saldría tal cual', () => {
    expect(revisarTexto('Hola {nombre}, soy {mentor}', SOPORTE, LARGO)).toEqual({
      ok: false,
      error: '{mentor} no se puede usar en este mensaje: acá solo va {nombre}.',
    });
    expect(revisarTexto('Hola {nombre} y {mentor}, {fecha}', GRUPO, LARGO)).toEqual({
      ok: false,
      error: '{fecha} no se puede usar en este mensaje: acá solo van {nombre} y {mentor}.',
    });
  });

  it('con mayúsculas distintas sugiere el marcador correcto', () => {
    expect(revisarTexto('Hola {Nombre}', SOPORTE, LARGO)).toEqual({
      ok: false,
      error: '{Nombre} no se puede usar en este mensaje. ¿Quisiste escribir {nombre}?',
    });
  });

  it('marcador es cualquier {…} sin llaves ni saltos de línea adentro, como en el servidor', () => {
    expect(marcadoresDelTexto('a {nombre} b {nombre} c {x y}')).toEqual(['{nombre}', '{x y}']);
    expect(marcadoresDelTexto('{nom\nbre}')).toEqual([]);
    expect(marcadoresDelTexto(`{${'a'.repeat(41)}}`)).toEqual([]);
  });

  it('un texto válido se devuelve sin los espacios de los bordes, que es lo que se guarda', () => {
    expect(revisarTexto('  ¡Hola, {nombre}! 🌿  ', SOPORTE, LARGO)).toEqual({ ok: true, texto: '¡Hola, {nombre}! 🌿' });
    expect(revisarTexto('Hola {nombre}, te acompaña {mentor}.', GRUPO, LARGO).ok).toBe(true);
  });

  it('«Guardar» solo con un texto válido y distinto del que ya sale', () => {
    const vigente = 'Hola, {nombre}.';
    expect(sePuedeGuardar('Hola, {nombre}.  ', vigente, SOPORTE, LARGO)).toBe(false);
    expect(sePuedeGuardar('Hola de nuevo, {nombre}.', vigente, SOPORTE, LARGO)).toBe(true);
    expect(sePuedeGuardar('Hola de nuevo.', vigente, SOPORTE, LARGO)).toBe(false);
  });
});

describe('marcadores en el editor', () => {
  it('los que faltan son los botones «Agregar …»', () => {
    expect(marcadoresQueFaltan('Hola', GRUPO)).toEqual(['{nombre}', '{mentor}']);
    expect(marcadoresQueFaltan('Hola {nombre}', GRUPO)).toEqual(['{mentor}']);
    expect(marcadoresQueFaltan('Hola {nombre} y {mentor}', GRUPO)).toEqual([]);
  });

  it('se pone donde está el cursor, o reemplaza lo seleccionado', () => {
    expect(insertarMarcador('Hola, !', MARCADOR_NOMBRE, { start: 6, end: 6 })).toEqual({
      texto: 'Hola, {nombre}!',
      cursor: 14,
    });
    expect(insertarMarcador('Hola, XX!', MARCADOR_NOMBRE, { start: 6, end: 8 })).toEqual({
      texto: 'Hola, {nombre}!',
      cursor: 14,
    });
  });

  it('sin cursor conocido va al final, separado por un espacio', () => {
    expect(insertarMarcador('Hola  ', MARCADOR_NOMBRE)).toEqual({ texto: 'Hola {nombre}', cursor: 13 });
    expect(insertarMarcador('', MARCADOR_NOMBRE)).toEqual({ texto: '{nombre}', cursor: 8 });
    // Una selección fuera del texto (vieja) no se usa.
    expect(insertarMarcador('Hola', MARCADOR_NOMBRE, { start: 10, end: 12 }).texto).toBe('Hola {nombre}');
  });
});

describe('vista previa con el nombre de ejemplo', () => {
  it('reemplaza todos los marcadores; el mentor de ejemplo es Carlos', () => {
    expect(vistaPrevia('  {nombre}, {nombre}: te acompaña {mentor}.  ', 'Ana')).toBe(
      'Ana, Ana: te acompaña Carlos.',
    );
  });

  it('un mensaje vacío en el archivo no se manda, y la pantalla lo dice en vez de una burbuja en blanco', () => {
    expect(seManda('   ')).toBe(false);
    expect(seManda('Hola, {nombre}.')).toBe(true);
  });

  it('el nombre de ejemplo: hasta 40 caracteres, y «María» si quedó vacío', () => {
    expect(acotarNombreDeEjemplo('M'.repeat(45))).toHaveLength(40);
    expect(acotarNombreDeEjemplo(`${'🌿'.repeat(41)}`)).toBe('🌿'.repeat(40));
    expect(nombreParaLaMuestra('   ')).toBe(NOMBRE_DE_EJEMPLO);
    expect(nombreParaLaMuestra(' Flor de María ')).toBe('Flor de María');
  });
});

describe('estado: original, cambiado (por quién y cuándo) o vuelto al original', () => {
  it('la hora es la de Lima, también cuando en UTC ya es el día siguiente', () => {
    expect(fechaYHoraDelCambio('2026-09-27T15:04:05Z')).toBe('27 de septiembre a las 10:04');
    // 03:30 UTC del 28 son las 22:30 del 27 en Lima (regla 02: la medianoche local no cae a hora UTC fija).
    expect(fechaYHoraDelCambio('2026-09-28T03:30:00Z')).toBe('27 de septiembre a las 22:30');
    expect(fechaYHoraDelCambio('no es fecha')).toBeNull();
    expect(fechaYHoraDelCambio(null)).toBeNull();
  });

  it('de un mensaje', () => {
    expect(estadoDelTexto({ cambiado: false, ultimoCambio: null })).toBe('Texto original');
    expect(
      estadoDelTexto({
        cambiado: true,
        ultimoCambio: { por: 'Kelin Rojas', en: '2026-09-27T15:04:05Z', volvioAlOriginal: false },
      }),
    ).toBe('Cambiado por Kelin Rojas el 27 de septiembre a las 10:04.');
    expect(estadoDelTexto({ cambiado: true, ultimoCambio: { por: null, en: '2026-09-27T15:04:05Z' } })).toBe(
      'Cambiado por alguien del equipo el 27 de septiembre a las 10:04.',
    );
    expect(
      estadoDelTexto({
        cambiado: false,
        ultimoCambio: { por: 'Kelin Rojas', en: '2026-09-27T16:00:00Z', volvioAlOriginal: true },
      }),
    ).toBe('Volvió al original: Kelin Rojas el 27 de septiembre a las 11:00.');
  });

  it('de la portada', () => {
    expect(estadoDeLaPortada({ cambiada: false, ultimoCambio: undefined })).toBe('Es la portada original');
    expect(
      estadoDeLaPortada({ cambiada: true, ultimoCambio: { por: 'Ana Torres', en: '2026-09-27T15:04:05Z' } }),
    ).toBe('Cambiada por Ana Torres el 27 de septiembre a las 10:04.');
    expect(
      estadoDeLaPortada({
        cambiada: false,
        ultimoCambio: { por: 'Ana Torres', en: '2026-09-27T15:04:05Z', volvioAlOriginal: true },
      }),
    ).toBe('Volvió a la original: Ana Torres el 27 de septiembre a las 10:04.');
  });
});

describe('acciones de la portada', () => {
  it('sin dónde guardar imágenes (local): no se puede cambiar y se dice por qué', () => {
    expect(accionesDeLaPortada({ cambiada: false, sePuedeCambiar: false })).toEqual({
      puedeCambiar: false,
      puedeVolver: false,
      aviso: SIN_ALMACENAMIENTO,
    });
  });

  it('volver a la original solo si está cambiada, aunque no se puedan subir imágenes', () => {
    expect(accionesDeLaPortada({ cambiada: true, sePuedeCambiar: true })).toEqual({
      puedeCambiar: true,
      puedeVolver: true,
      aviso: null,
    });
    expect(accionesDeLaPortada({ cambiada: true, sePuedeCambiar: false }).puedeVolver).toBe(true);
  });
});

describe('errores de la API en palabras', () => {
  it('un 403 siempre dice quién puede cambiar la bienvenida', () => {
    expect(mensajeDeErrorDeBienvenida(new ApiError(403, 'Solo ADMIN/ALCHEMIST cambian la bienvenida'), 'x')).toBe(
      SIN_PERMISO,
    );
  });

  it('un 400 muestra el motivo del servidor; sin red, el aviso de conexión', () => {
    expect(mensajeDeErrorDeBienvenida(new ApiError(400, 'Falta {nombre} en el texto.'), 'x')).toBe(
      'Falta {nombre} en el texto.',
    );
    expect(mensajeDeErrorDeBienvenida(new ApiError(0, 'No se pudo conectar con el servidor.'), 'x')).toBe(
      'No se pudo conectar con el servidor.',
    );
    expect(mensajeDeErrorDeBienvenida(new Error('raro'), 'Por defecto')).toBe('Por defecto');
  });
});
