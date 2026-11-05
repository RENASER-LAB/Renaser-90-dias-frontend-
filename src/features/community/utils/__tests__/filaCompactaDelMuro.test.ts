// pedido del dueño 2026-11-05 muro compacto
import { describe, expect, it } from '@jest/globals';

import type { PostItem } from '../../../../screens/ComunidadScreen';
import {
  cantidadDeComentarios,
  etiquetaDeComentarios,
  etiquetaDeLaFila,
  vistaDeLaFilaCompacta,
} from '../filaCompactaDelMuro';

const foto = (n: number): PostItem['media'][number] => ({
  type: 'image',
  title: `📷 Foto ${n}`,
  url: `https://s3/foto${n}.jpg`,
  mimeType: 'image/jpeg',
});

describe('la fila compacta del Muro (lógica pura)', () => {
  it('sin fotos: no hay miniatura ni chapa', () => {
    const vista = vistaDeLaFilaCompacta({ media: [], comments: [], cantidadComentarios: 0 });
    expect(vista.miniatura).toBeNull();
    expect(vista.fotosDeMas).toBe(0);
  });

  it('una foto: miniatura con la primera y sin «+N»', () => {
    const vista = vistaDeLaFilaCompacta({ media: [foto(1)], comments: [] });
    expect(vista.miniatura?.url).toBe('https://s3/foto1.jpg');
    expect(vista.fotosDeMas).toBe(0);
  });

  it('tres fotos: miniatura con la PRIMERA y «+2»', () => {
    const vista = vistaDeLaFilaCompacta({ media: [foto(1), foto(2), foto(3)], comments: [] });
    expect(vista.miniatura?.url).toBe('https://s3/foto1.jpg');
    expect(vista.fotosDeMas).toBe(2);
  });

  it('los comentarios: el conteo del servidor, o los ya leídos si van por delante', () => {
    expect(cantidadDeComentarios({ comments: [], cantidadComentarios: 4 })).toBe(4);
    expect(cantidadDeComentarios({ comments: [], cantidadComentarios: undefined })).toBe(0);
    const leidos = [1, 2, 3].map(i => ({ id: `c${i}`, author: 'A', avatar: '', text: 't', likes: 0, timeAgo: 'ahora' }));
    expect(cantidadDeComentarios({ comments: leidos, cantidadComentarios: 2 })).toBe(3);
  });

  it('lo que oye el lector de pantalla', () => {
    expect(etiquetaDeComentarios(0)).toBe('Sin comentarios. Abrir la publicación');
    expect(etiquetaDeComentarios(1)).toBe('1 comentario. Abrir la publicación');
    expect(etiquetaDeComentarios(5)).toBe('5 comentarios. Abrir la publicación');
    expect(etiquetaDeLaFila({ author: 'Ana', timeAgo: 'Hace 2 horas', media: [foto(1), foto(2)] })).toBe(
      'Publicación de Ana, Hace 2 horas, con 2 fotos. Abrir la publicación'
    );
  });
});
