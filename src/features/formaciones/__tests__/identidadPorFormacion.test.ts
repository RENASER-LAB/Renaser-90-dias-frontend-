import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { firmaDelProgramaDe } from '../../chat/api/chatMappers';
import { fotoDeLaConversacion } from '../../chat/utils/fotosDelChat';
import { grupoTieneFotoPropia } from '../../chat/utils/refrescoDeLaLista';
import { bienvenidaEsDe, estadoDeLaPortada, SERVIDOR_SIN_BIENVENIDA_POR_FORMACION } from '../../admin/utils/bienvenida';
import { accionesDeLaImagen, estadoDeLaImagen, etiquetaDeVolver, imagenEsDe } from '../utils/imagenDeLaFormacion';
import { ROTULO_DE_TRIBU_POR_DEFECTO, rotuloDeLaSeccionDeTribu } from '../utils/rotuloDeTribu';

/**
 * Identidad por formación (spec 035, D-308 del backend): la bienvenida y la imagen de cada formación. Lo puro y el cableado; el aspecto en
 * pantalla se confirma en el emulador (Maestro `identidad-por-formacion`).
 */

const SRC = path.resolve(__dirname, '..', '..', '..');
const leer = (ruta: string) => fs.readFileSync(path.join(SRC, ruta), 'utf8');

const IMAGEN = {
  formation: 'DIPLOMADO',
  hayImagen: true,
  cambiada: true,
  heredada: false,
  sePuedeCambiar: true,
  ultimoCambio: { por: 'Kelin Rojas', en: '2026-11-02T15:04:05Z', volvioAlOriginal: false },
  otroCampoDeMañana: 1,
};

describe('la bienvenida de otra formación nunca se confunde con la de la Escuela', () => {
  it('la Escuela se acepta con o sin el campo (un backend anterior solo conoce la suya)', () => {
    expect(bienvenidaEsDe({}, 'ESCUELA')).toBe(true);
    expect(bienvenidaEsDe({ formation: 'ESCUELA' }, 'ESCUELA')).toBe(true);
    expect(bienvenidaEsDe({ formation: 'DIPLOMADO' }, 'ESCUELA')).toBe(false);
  });

  it('el Diplomado y la Certificación SOLO si la respuesta dice que es de ellos: sin el campo no se edita nada', () => {
    expect(bienvenidaEsDe({ formation: 'DIPLOMADO' }, 'DIPLOMADO')).toBe(true);
    expect(bienvenidaEsDe({}, 'DIPLOMADO')).toBe(false);
    expect(bienvenidaEsDe({ formation: null }, 'CERTIFICACION')).toBe(false);
    expect(bienvenidaEsDe({ formation: 'ESCUELA' }, 'CERTIFICACION')).toBe(false);
    expect(SERVIDOR_SIN_BIENVENIDA_POR_FORMACION).toMatch(/todavía/);
  });

  it('la portada dice si usa la de la Escuela', () => {
    expect(estadoDeLaPortada({ cambiada: false, heredada: true, ultimoCambio: null })).toBe('Usa la portada de la Escuela.');
    expect(estadoDeLaPortada({ cambiada: false, heredada: false, ultimoCambio: null })).toBe('Es la portada original');
    expect(estadoDeLaPortada({ cambiada: false, ultimoCambio: null })).toBe('Es la portada original');
    expect(
      estadoDeLaPortada({ cambiada: false, heredada: true, ultimoCambio: { en: '2026-11-02T15:04:05Z', volvioAlOriginal: true, por: 'Kelin' } }),
    ).toMatch(/^Vuelve a ser la de la Escuela: /);
  });
});

describe('la imagen de la formación: lo que se lee y lo que se ofrece', () => {
  it('la línea de estado dice de quién es la imagen que se ve', () => {
    expect(estadoDeLaImagen(IMAGEN)).toMatch(/^Cambiada por Kelin Rojas/);
    expect(estadoDeLaImagen({ formation: 'DIPLOMADO', hayImagen: true, cambiada: false, heredada: true, ultimoCambio: null })).toBe(
      'Usa la imagen de la Escuela.',
    );
    expect(estadoDeLaImagen({ formation: 'ESCUELA', hayImagen: false, cambiada: false, heredada: false, ultimoCambio: null })).toBe(
      'Usa la imagen de siempre.',
    );
    expect(estadoDeLaImagen({ formation: 'CERTIFICACION', hayImagen: false, cambiada: false, heredada: false, ultimoCambio: null })).toBe(
      'Usa la imagen de siempre, como la Escuela.',
    );
  });

  it('qué se ofrece: cambiar solo si el servidor guarda imágenes; volver solo si hay una propia', () => {
    expect(accionesDeLaImagen({ cambiada: false, sePuedeCambiar: true })).toEqual({ puedeCambiar: true, puedeVolver: false, aviso: null });
    const sinAlmacen = accionesDeLaImagen({ cambiada: true, sePuedeCambiar: false });
    expect(sinAlmacen.puedeCambiar).toBe(false);
    expect(sinAlmacen.puedeVolver).toBe(true);
    expect(sinAlmacen.aviso).toMatch(/no tiene dónde guardar imágenes/);
    expect(etiquetaDeVolver('ESCUELA')).toBe('Volver a la imagen de siempre');
    expect(etiquetaDeVolver('DIPLOMADO')).toBe('Volver a la imagen de la Escuela');
  });

  it('una respuesta de otra formación no se muestra bajo esta', () => {
    expect(imagenEsDe({ formation: 'DIPLOMADO' }, 'DIPLOMADO')).toBe(true);
    expect(imagenEsDe({ formation: 'diplomado' }, 'DIPLOMADO')).toBe(true);
    expect(imagenEsDe({ formation: 'ESCUELA' }, 'DIPLOMADO')).toBe(false);
  });
});


describe('el chat muestra lo de su formación', () => {
  it('el rótulo de la sección de grupos: la Escuela y lo desconocido conservan «Formación Renaser»', () => {
    expect(ROTULO_DE_TRIBU_POR_DEFECTO).toBe('Formación Renaser');
    expect(rotuloDeLaSeccionDeTribu('ESCUELA')).toBe('Formación Renaser');
    expect(rotuloDeLaSeccionDeTribu('ESCUELA', 'Escuela Renaser')).toBe('Formación Renaser');
    expect(rotuloDeLaSeccionDeTribu(null)).toBe('Formación Renaser');
    expect(rotuloDeLaSeccionDeTribu(undefined, 'Diplomado Renaser')).toBe('Formación Renaser');
  });

  it('el Diplomado y la Certificación llevan SU nombre (el configurado o el de fábrica)', () => {
    expect(rotuloDeLaSeccionDeTribu('DIPLOMADO', 'Diplomado Renaser')).toBe('Diplomado Renaser');
    expect(rotuloDeLaSeccionDeTribu('DIPLOMADO')).toBe('Diplomado Renaser');
    expect(rotuloDeLaSeccionDeTribu('CERTIFICACION', '  ')).toBe('Certificación Renaser');
    expect(rotuloDeLaSeccionDeTribu('CERTIFICACION', 'Certificación Pro')).toBe('Certificación Pro');
  });

  it('el programa firma con el nombre de la formación que manda el servidor; la cuenta de staff no es una firma', () => {
    expect(firmaDelProgramaDe('Diplomado Renaser')).toBe('Diplomado Renaser');
    expect(firmaDelProgramaDe('Certificación Renaser')).toBe('Certificación Renaser');
    expect(firmaDelProgramaDe('Formación Renaser')).toBe('Formación Renaser');
    expect(firmaDelProgramaDe(null)).toBe('Formación Renaser');
    expect(firmaDelProgramaDe('Kelin Rojas')).toBe('Formación Renaser');
  });

  it('la comunidad con imagen de su formación lleva la del servidor; un grupo sigue igual', () => {
    expect(fotoDeLaConversacion('global', '/api/v1/chat/conversations/c-1/foto?v=1')).toBe('foto-del-servidor');
    expect(fotoDeLaConversacion('global')).toBe('fenix');
    expect(fotoDeLaConversacion('celula', '/api/v1/chat/conversations/g-1/foto?v=1')).toBe('foto-del-servidor');
    expect(fotoDeLaConversacion('celula')).toBe('tarjeta-sin-nombre');
  });

  it('«Volver a la foto de Renaser» solo con una foto PROPIA: la de la formación no cuenta (y con un backend anterior, la ruta es siempre propia)', () => {
    expect(grupoTieneFotoPropia({ fotoPath: '/foto?v=1', fotoPropia: true })).toBe(true);
    expect(grupoTieneFotoPropia({ fotoPath: '/foto?v=1', fotoPropia: false })).toBe(false);
    expect(grupoTieneFotoPropia({ fotoPath: null, fotoPropia: true })).toBe(false);
    expect(grupoTieneFotoPropia({ fotoPath: '/foto?v=1' })).toBe(true);
    expect(grupoTieneFotoPropia({ fotoPath: null })).toBe(false);
  });
});

describe('cableado (lee el código fuente: no hay testing-library en el proyecto)', () => {
  it('la pantalla Bienvenida elige la formación, relee con ella y no mezcla borradores entre formaciones', () => {
    const pantalla = leer('features/admin/screens/BienvenidaAdminScreen.tsx');
    expect(pantalla).toMatch(/<ControlDeFormacion valor=\{formacion\} onCambiar=\{setFormacion\}/);
    expect(pantalla).toMatch(/useBienvenidaAdmin\(formacion\)/);
    expect(pantalla).toMatch(/bienvenidaEsDe\(bienvenida, formacion\)/);
    expect(pantalla).toMatch(/key=\{`portada-\$\{formacion\}`\}/);
    expect(pantalla).toMatch(/key=\{`\$\{formacion\}-\$\{texto\.clave\}`\}/);
    expect(pantalla).toMatch(/formacion=\{formacion\}/);
    // El control de formación es el segmentado de la app, sin otro selector.
    const control = leer('features/formaciones/components/ControlDeFormacion.tsx');
    expect(control).toMatch(/<ControlSegmentado/);
    expect(control).toMatch(/CODIGOS_DE_FORMACION\.map/);
  });

  it('la portada y los mensajes mandan la formación a cada pedido', () => {
    expect(leer('features/admin/components/PortadaDeBienvenida.tsx')).toMatch(/confirmarPortadaDeBienvenida\(flujo\.ruta, formacion\)/);
    expect(leer('features/admin/components/PortadaDeBienvenida.tsx')).toMatch(/volverALaPortadaOriginal\(formacion\)/);
    expect(leer('features/admin/components/PortadaDeBienvenida.tsx')).toMatch(/useTarjetaDeMuestra\(nombre, version, entorno, formacion\)/);
    expect(leer('features/admin/components/MensajeDeBienvenida.tsx')).toMatch(/guardarTextoDeBienvenida\(texto\.clave, revision\.texto, formacion\)/);
    expect(leer('features/admin/components/MensajeDeBienvenida.tsx')).toMatch(/volverAlTextoOriginal\(texto\.clave, formacion\)/);
  });

  it('el detalle de cada formación suma «Imagen de la formación»', () => {
    expect(leer('features/formaciones/screens/FormacionDetalleAdminScreen.tsx')).toMatch(/<ImagenDeLaFormacion codigo=\{codigo\} \/>/);
    const componente = leer('features/formaciones/components/ImagenDeLaFormacion.tsx');
    expect(componente).toMatch(/Imagen de la formación/);
    expect(componente).toMatch(/elegirFotoCuadrada\(\{ lado: LADO_DE_LA_IMAGEN/);
    expect(componente).not.toMatch(/launchImageLibraryAsync/);
    expect(componente).toMatch(/if \(noDisponible \|\| \(cargando && !imagen\)\) return null;/);
  });

  it('el avatar de la comunidad deja el fénix debajo de la imagen del servidor; los demás, la tarjeta', () => {
    const avatar = leer('features/chat/components/AvatarDeChat.tsx');
    expect(avatar).toMatch(/tipo === 'global' \? <FotoDelPrograma size=\{size\} \/> : <FotoDelGrupo size=\{size\} \/>/);
  });

  it('Comunidad usa el rótulo de la formación y la foto propia del grupo', () => {
    const comunidad = leer('screens/ComunidadScreen.tsx');
    expect(comunidad).toMatch(/rotuloDeLaSeccionDeTribu\(/);
    expect(comunidad).toMatch(/tieneFotoPropia: grupoTieneFotoPropia\(activeChat\)/);
    expect(comunidad).not.toMatch(/<MicroLabel>Formación Renaser<\/MicroLabel>/);
    expect(leer('features/community/components/SharePostSheet.tsx')).toMatch(/<MicroLabel>\{rotuloDeLaSeccion\}<\/MicroLabel>/);
  });
});
