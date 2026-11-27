import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { ErrorDeCarga } from '../../sinRed/components/ErrorDeCarga';
import { useEfectosDeLaRuta } from '../hooks/useEfectosDeLaRuta';
import type { RocaDiariaApi, EjeObjetivo } from '../types/objetivos.types';
import { fotoDeLaRuta } from '../utils/efectosDeLaRuta';
import {
  nivelesDeLaRuta,
  type EstadoDeLaSemanaDeLaRuta,
  type ItemDeLoQueViene,
  type NivelDeLaRuta,
} from '../utils/rutaDelPlan';
import { FranjaDeLaSemana, LoQueViene, RutaDelPlan } from './RutaDelPlan';
import { TarjetaOchentaVeinte } from './TarjetasDelPlan';

/**
 * El cuerpo de Plan como ruta (spec 058): la franja de la semana, los niveles, y debajo «Cierra tu día», «Tu 80/20», «Organizar mi
 * semana» y «Lo que viene» (FR-003 y FR-009). No lee nada ni guarda nada: recibe lo que `PlanDelEje` ya tiene y avisa qué se tocó.
 */
export function ContenidoDeLaRuta({
  eje,
  acciones,
  hoyIso,
  estadoDeLaSemana,
  tituloDeLaSemana,
  revisada,
  puedeAgendar,
  sinLectura,
  error,
  plazo,
  avance,
  numeroSemana,
  rangoDeLaSemana,
  cierre,
  loQueViene,
  alTocarNivel,
  alTocarLaFranja,
  alAbrirOchentaVeinte,
  alOrganizar,
  alTocarProximo,
}: {
  eje: EjeObjetivo;
  acciones: readonly RocaDiariaApi[];
  hoyIso: string | null;
  estadoDeLaSemana: EstadoDeLaSemanaDeLaRuta;
  tituloDeLaSemana: string | null;
  revisada: number | null;
  puedeAgendar: boolean;
  sinLectura: boolean;
  error: string | null;
  plazo: string;
  avance: { cumplidas: number; total: number };
  numeroSemana: number;
  rangoDeLaSemana: string | null;
  cierre?: React.ReactNode;
  loQueViene: readonly ItemDeLoQueViene[];
  alTocarNivel: (nivel: NivelDeLaRuta) => void;
  alTocarLaFranja?: () => void;
  alAbrirOchentaVeinte: () => void;
  alOrganizar: () => void;
  alTocarProximo: (item: ItemDeLoQueViene) => void;
}) {
  const niveles = useMemo(
    () => nivelesDeLaRuta({ acciones, hoyIso, eje, estadoDeLaSemana, tituloDeLaSemana, revisada, puedeAgendar, sinLectura, plazo }),
    [acciones, hoyIso, eje, estadoDeLaSemana, tituloDeLaSemana, revisada, puedeAgendar, sinLectura, plazo],
  );
  const cargada = estadoDeLaSemana !== 'cargando' && !sinLectura;
  const disparo = useEfectosDeLaRuta(fotoDeLaRuta(niveles, avance, eje, cargada));

  const sinTitulo =
    estadoDeLaSemana === 'bloqueada'
      ? `Primero escribe tus metas de ${plazo}`
      : estadoDeLaSemana === 'cargando'
        ? 'Cargando tu semana…'
        : 'Todavía no la armas';

  return (
    <View style={estilos.columna}>
      <FranjaDeLaSemana
        numeroSemana={numeroSemana}
        rango={rangoDeLaSemana}
        titulo={estadoDeLaSemana === 'planificada' || estadoDeLaSemana === 'cerrada' ? tituloDeLaSemana : null}
        avance={avance}
        alTocar={estadoDeLaSemana === 'cargando' || sinLectura ? undefined : alTocarLaFranja}
        disparo={disparo}
        mensajeSinTitulo={sinTitulo}
      />

      {sinLectura && error ? <ErrorDeCarga mensaje={error} /> : <RutaDelPlan niveles={niveles} disparo={disparo} alTocar={alTocarNivel} />}

      {cierre}

      <TarjetaOchentaVeinte alAbrir={alAbrirOchentaVeinte} />

      <GoldButton label="Organizar mi semana" onPress={alOrganizar} icon="chevron" textStyle={estilos.textoDelBoton} />

      <LoQueViene items={loQueViene} alTocar={alTocarProximo} />
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 14 },
  textoDelBoton: { fontSize: 16, letterSpacing: 0 },
});
