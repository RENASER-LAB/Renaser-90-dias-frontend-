import React, { useState } from 'react';

import { HojaConectarPasos } from '../../pasos/components/HojaConectarPasos';
import { LogoSaludDeApple } from '../../pasos/components/LogoSaludDeApple';
import { useConexionDeSalud, type EstadoDeLaConexion } from '../../pasos/hooks/useConexionDeSalud';
import { TEXTOS_DE_PASOS_EN_IPHONE } from '../../pasos/utils/textosDePasos';
import { FilaDeAjuste } from './FilasDeAjustes';

/** Solo en iPhone y iPad: Android y la web no tienen «Salud de Apple» (ni su ícono). */
export function muestraSaludDeApple(plataforma: string): boolean {
  return plataforma === 'ios';
}

/** Lo que dice la fila según el estado: nunca queda en blanco. */
export function detalleDeSaludDeApple(estado: EstadoDeLaConexion): string {
  const t = TEXTOS_DE_PASOS_EN_IPHONE.saludDeApple;
  if (estado === 'conectada') return t.conectada;
  if (estado === 'sin-conectar') return t.sinConectar;
  if (estado === 'no-disponible') return t.noDisponible;
  return t.revisando;
}

/**
 * Yo → Preferencias → «Salud de Apple» (solo iOS; spec 037, issue #255, norma 2.5.1 de la App Store): el lugar fijo donde la app
 * dice que usa Salud de Apple (HealthKit) para los pasos y la distancia. Ícono OFICIAL de Apple (decorativo) con el nombre al lado;
 * el toque va en la FILA entera, el ícono no es un botón. Muestra el estado y abre la hoja de siempre (`HojaConectarPasos`) para
 * conectar o desconectar. Sin Salud en el aparato (un iPad) no se toca y lo dice: no hay nada que conectar.
 */
export function FilaSaludDeApple({ cuentaId }: { cuentaId: string | null }) {
  const conexion = useConexionDeSalud(cuentaId);
  const [abierta, setAbierta] = useState(false);
  const textos = TEXTOS_DE_PASOS_EN_IPHONE;
  const detalle = detalleDeSaludDeApple(conexion.estado);
  const sePuedeAbrir = conexion.estado === 'conectada' || conexion.estado === 'sin-conectar';
  return (
    <>
      <FilaDeAjuste
        baldosaLibre
        baldosa={<LogoSaludDeApple size={24} />}
        titulo={textos.saludDeApple.nombre}
        detalle={detalle}
        etiqueta={`${textos.saludDeApple.nombre}. ${detalle}`}
        onPress={sePuedeAbrir ? () => setAbierta(true) : undefined}
      />
      <HojaConectarPasos
        visible={abierta}
        soporte="disponible"
        conectada={conexion.estado === 'conectada'}
        conectar={conexion.conectar}
        fuente={textos.saludDeApple.nombre}
        desdeLasHoy={null}
        onCerrar={() => setAbierta(false)}
        onSubirCaptura={() => undefined}
        onAbrirHealthConnect={conexion.abrirSalud}
        onDesconectar={conexion.desconectar}
      />
    </>
  );
}
