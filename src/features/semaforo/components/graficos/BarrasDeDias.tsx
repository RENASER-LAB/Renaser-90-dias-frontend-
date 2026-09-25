import React from 'react';

import { dichoDelDia, fechaDeBarra } from '../../utils/lecturaDelSemaforo';
import { Columnas, type Columna } from './Columnas';
import type { PropsGraficoDeDias } from './tipos';

/**
 * Los días de la ventana vigente como barras: una por día, de su color, con la altura de su
 * porcentaje. Un día que no se midió (sin nada programado, en pausa, todavía sin calcular, fuera del
 * programa) es un trazo neutro — nunca una barra en cero ni una barra verde.
 *
 * Solo props: no pide nada a la red. Lo que dibuja lo decidió el servidor.
 */
export function BarrasDeDias({ dias, tamano = 'grande', titulo }: PropsGraficoDeDias) {
  if (dias.length === 0) return null;

  const columnas: Columna[] = dias.map(dia => {
    const { dia: nombre, numero } = fechaDeBarra(dia.fecha);
    return {
      clave: dia.fecha,
      valor: dia.estado === 'MEDIDO' ? dia.porcentaje : null,
      color: dia.color,
      abajo: [nombre, numero],
    };
  });

  const dicho = `${titulo ?? `Tus últimos ${dias.length} días`}. ${dias.map(dichoDelDia).join('. ')}.`;

  return <Columnas columnas={columnas} alto={tamano === 'chico' ? 32 : 96} conRotulos={tamano === 'grande'} dicho={dicho} />;
}
