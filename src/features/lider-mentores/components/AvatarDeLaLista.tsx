import React from 'react';

import { AvatarPersona } from '../../../components/ui';
import { FotoConSesion } from '../../chat/components/AvatarDeChat';
import type { AprendizDeLaLista } from '../types/aprendicesDelLider.types';
import { esRutaConSesion, urlDeLaFoto } from '../utils/aprendicesDelLider';

/**
 * La foto de una persona en «Todos los aprendices»: si el servidor manda una URL completa, la foto; si manda una ruta suya
 * (como las del chat), se pide con la sesión y, mientras llega o si falla, quedan las iniciales; sin foto, las iniciales.
 * La foto es un adorno: nunca un error a la vista.
 */
export function AvatarDeLaLista({ fila, size }: { fila: Pick<AprendizDeLaLista, 'nombre' | 'fotoPath'>; size: number }) {
  const url = urlDeLaFoto(fila.fotoPath);
  if (url) return <AvatarPersona nombre={fila.nombre} avatarUrl={url} size={size} />;
  const iniciales = <AvatarPersona nombre={fila.nombre} avatarUrl={null} size={size} />;
  if (esRutaConSesion(fila.fotoPath)) return <FotoConSesion ruta={fila.fotoPath} size={size} debajo={iniciales} />;
  return iniciales;
}
