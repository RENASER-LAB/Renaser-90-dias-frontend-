import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { Card, MicroLabel } from '../../../components/ui';
import { ahoraConfiable } from '../../../services/http/relojServidor';
import { useTheme } from '../../../theme/ThemeContext';
import type { OrigenDelAprendiz } from '../api/semaforoApi';
import { useSemaforoDeAprendiz } from '../hooks/useSemaforoDeAprendiz';
import type { ColorSemaforo, DetalleDelSemaforo } from '../types/semaforo.types';
import {
  fechaLarga,
  formatearPorcentaje,
  hoyDeLaPersona,
  momentoDeCalculo,
  palabraDelSemaforo,
  primeraEnMayuscula,
  rangoDeFechas,
  textoDiasConDatos,
} from '../utils/lecturaDelSemaforo';
import { CargandoLectura, FalloDeLectura } from './EstadoDeLectura';
import { CifraDelSemaforo } from './CifraDelSemaforo';
import { EtiquetaSemaforo } from './EtiquetaSemaforo';
import { FilaDelDia } from './FilaDelDia';
import { GraficoDeDias, GraficoDeSemanas } from './graficos';

/**
 * El semáforo de un aprendiz, visto por su mentor (`AlumnoScreen`) o por administración
 * (`FichaAprendizScreen`): el vigente con palabra y porcentaje, los 7 días con su desglose y las
 * semanas cerradas. Son las mismas piezas del detalle propio, para que el mentor vea exactamente lo
 * mismo que ve la persona. **Sin control de pausa**: nadie pausa el semáforo de otro.
 *
 * Pide sus datos por su cuenta y, como las otras secciones de la ficha, **no se dibuja** si el
 * servidor todavía no tiene la ruta (404) o si quien mira ya no puede verla (403): ni título, ni
 * error rojo. Solo un problema pasajero —sin red, respuesta inesperada— se dice, con "Reintentar".
 */
export function TarjetaSemaforoDeAprendiz({
  origen,
  retardo = 0,
  margenArriba = 0,
}: {
  /** `null` = no hay por dónde preguntar (el mentor todavía sin grupo): no se dibuja nada. */
  origen: OrigenDelAprendiz | null;
  /** La entrada escalonada de la pantalla que la contiene. */
  retardo?: number;
  margenArriba?: number;
}) {
  const { detalle, fallo, detalleDelFallo, recargar } = useSemaforoDeAprendiz(origen);

  if (!origen || fallo === 'no_disponible' || fallo === 'sin_permiso') return null;

  return (
    <Aparicion retardo={retardo} style={{ marginTop: margenArriba }}>
      <MicroLabel>Semáforo</MicroLabel>
      <Card style={{ marginTop: 8, gap: 18 }}>
        {detalle ? (
          <DetalleDeOtraPersona detalle={detalle} />
        ) : fallo ? (
          <FalloDeLectura fallo={fallo} detalle={detalleDelFallo} que="su semáforo" onReintentar={recargar} />
        ) : (
          <CargandoLectura texto="Cargando su semáforo…" />
        )}
      </Card>
    </Aparicion>
  );
}

function DetalleDeOtraPersona({ detalle }: { detalle: DetalleDelSemaforo }) {
  const { c, t } = useTheme();
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  if (!detalle.aplica) {
    return (
      <Text style={cuerpo}>
        No tiene el programa de 90 días activado: por ahora no hay nada que medir.
      </Text>
    );
  }

  const vigente = detalle.vigente;
  const color: ColorSemaforo = vigente?.color ?? 'SIN_DATOS';
  const calculado = momentoDeCalculo(detalle.calculadoEn);
  const hoy = hoyDeLaPersona(detalle, ahoraConfiable());
  const pausa = detalle.pausa;

  return (
    <>
      {/* 1. El vigente: el corte a la vista, la cifra, la palabra y el denominador. */}
      <View style={{ gap: 6 }}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>
          Últimos 7 días
        </Text>
        {vigente ? (
          <Text style={cuerpo}>{primeraEnMayuscula(rangoDeFechas(vigente.desde, vigente.hasta))}</Text>
        ) : null}
      </View>

      <View
        style={{ gap: 6 }}
        accessible
        accessibilityLabel={
          `Su semáforo: ${palabraDelSemaforo(color, vigente?.etiqueta)}` +
          (vigente?.porcentaje != null ? `, ${formatearPorcentaje(vigente.porcentaje)}` : '') +
          (vigente?.diasConDatos != null ? `. ${textoDiasConDatos(vigente.diasConDatos)}.` : '.')
        }
      >
        <CifraDelSemaforo porcentaje={vigente?.porcentaje ?? null} color={color} />
        <EtiquetaSemaforo color={color} etiqueta={vigente?.etiqueta} />
        {vigente?.diasConDatos != null ? <Text style={cuerpo}>{textoDiasConDatos(vigente.diasConDatos)}</Text> : null}
        {pausa ? (
          <Text style={cuerpo}>
            {pausa.desde <= hoy
              ? `En pausa hasta el ${fechaLarga(pausa.hasta)}.`
              : `Pausa programada del ${fechaLarga(pausa.desde)} al ${fechaLarga(pausa.hasta)}.`}
          </Text>
        ) : null}
      </View>

      {/* 2. Los 7 días: el gráfico para el patrón, la lista para los números con su denominador. */}
      {vigente && vigente.dias.length > 0 ? (
        <View style={{ gap: 12 }}>
          <GraficoDeDias dias={vigente.dias} tamano="grande" titulo={`Sus últimos ${vigente.dias.length} días`} />
          <View>
            {vigente.dias.map((dia, i) => (
              <FilaDelDia key={dia.fecha} dia={dia} primera={i === 0} />
            ))}
          </View>
        </View>
      ) : null}

      {/* 3. La tendencia: las semanas cerradas, sábado a viernes. */}
      <View style={{ gap: 8 }}>
        <MicroLabel>Semanas cerradas</MicroLabel>
        {detalle.semanas.length > 0 ? (
          <View style={{ marginTop: 4 }}>
            <GraficoDeSemanas semanas={detalle.semanas} />
          </View>
        ) : (
          <Text style={cuerpo}>Todavía no se cerró ninguna semana.</Text>
        )}
      </View>

      <Text style={[t.small, estilos.nota, { color: c.textSoft }]}>
        {calculado ? `Calculado el ${calculado}.` : 'Todavía no se calculó ningún día.'}
      </Text>
    </>
  );
}

const estilos = StyleSheet.create({
  nota: { fontSize: 14, lineHeight: 20 },
});
