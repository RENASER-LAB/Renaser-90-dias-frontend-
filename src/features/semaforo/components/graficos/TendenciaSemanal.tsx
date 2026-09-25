import React from 'react';

import { dichoDeLaSemana, rotuloDeSemana } from '../../utils/lecturaDelSemaforo';
import { Columnas, type Columna } from './Columnas';
import type { PropsGraficoDeSemanas } from './tipos';

/**
 * Las semanas cerradas (sábado→viernes), de la más vieja a la más nueva, de izquierda a derecha:
 * una barra por semana con su porcentaje encima y sus fechas debajo. Una semana sin datos es un
 * trazo neutro.
 *
 * Es la foto de lo que se reportó cada sábado: no cambia aunque después cambie un día.
 * Solo props; si no hay semanas no dibuja nada y la pantalla decide qué decir.
 */
export function TendenciaSemanal({ semanas }: PropsGraficoDeSemanas) {
  if (semanas.length === 0) return null;

  const columnas: Columna[] = semanas.map(semana => ({
    clave: semana.hasta,
    valor: semana.porcentaje,
    color: semana.color,
    abajo: rotuloDeSemana(semana.desde, semana.hasta),
  }));

  const cuantas = semanas.length === 1 ? 'Una semana cerrada' : `${semanas.length} semanas cerradas`;
  const dicho = `${cuantas}, de la más antigua a la más reciente. ${semanas.map(dichoDeLaSemana).join('. ')}.`;

  return <Columnas columnas={columnas} alto={96} conRotulos dicho={dicho} />;
}
