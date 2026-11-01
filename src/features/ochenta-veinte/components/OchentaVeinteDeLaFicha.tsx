import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { TituloDeSeccion } from '../../../components/Legible';
import { Card } from '../../../components/ui';
import { useFuncionalidad } from '../../plataforma/estado/useFuncionalidad';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import { useOchentaVeinte } from '../hooks/useOchentaVeinte';
import type { CargarOchentaVeinte, TipoDePeriodo } from '../types/ochentaVeinte.types';
import { TITULO_DE_LA_SECCION_DE_LA_FICHA } from '../utils/textosDelOchentaVeinte';
import { PeriodoDelOchentaVeinte } from './PeriodoDelOchentaVeinte';

const OPCIONES: readonly { valor: TipoDePeriodo; etiqueta: string }[] = [
  { valor: 'SEMANA', etiqueta: 'Semana' },
  { valor: 'MES', etiqueta: 'Mes' },
];

/**
 * «Su 80/20» en la ficha de una persona (spec 031, 031-2 A; en tercera persona desde el E2E del 01/11/2026, J2-8): sus cifras del 80/20 y el análisis de SER de cada semana y cada mes. **Solo
 * lectura y solo para su acompañamiento** (el mentor o la guía del grupo, el líder, Administración y Alquimista); la propia persona
 * lo lee en Plan.
 *
 * Mismo criterio que `CierresDelDia`: `cargar(tipo, inicio)` es de cada ficha y estable; sin `cargar` no hay sección; un 403 o un 404
 * (backend sin la spec 031, otro rol, ya no la acompaña) esconden la sección sin error; mientras llega la PRIMERA lectura tampoco se
 * dibuja nada (un marco que se retira después sería un parpadeo); los demás fallos se dicen con «Reintentar». Y como el análisis resume
 * lo que la persona respondió en el Código Renaser, **respeta el mismo interruptor** (spec 034): con «Código Renaser en las fichas»
 * apagado para este rol ni se dibuja ni se pide.
 */
export function OchentaVeinteDeLaFicha({ cargar }: { cargar: CargarOchentaVeinte | null }) {
  const radarEnFichas = useFuncionalidad(CLAVES.radarFichas);
  const permitido = radarEnFichas.prendida && radarEnFichas.disponible;
  const [tipo, setTipo] = useState<TipoDePeriodo>('SEMANA');
  const lectura = useOchentaVeinte(permitido ? cargar : null, 'SEMANA');

  if (!permitido || !cargar || lectura.oculta) return null;
  if (lectura.cargando) return null;

  return (
    <Aparicion retardo={350} style={{ marginTop: 20 }}>
      <TituloDeSeccion>{TITULO_DE_LA_SECCION_DE_LA_FICHA}</TituloDeSeccion>
      <Card style={estilos.tarjeta}>
        <View style={estilos.control}>
          <ControlSegmentado opciones={OPCIONES} valor={tipo} onCambiar={setTipo} sinAnimacion />
        </View>
        <PeriodoDelOchentaVeinte cargar={cargar} tipo={tipo} voz="ficha" />
      </Card>
    </Aparicion>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { marginTop: 8, gap: 14 },
  control: { marginBottom: 4 },
});
