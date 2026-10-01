import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TituloDeSeccion } from '../../../components/Legible';
import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { obtenerReporte } from '../api/liderMentoresApi';
import type { EntradaDelReporteApi, ReporteApi } from '../api/liderMentoresSchemas';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { useLecturaDelLider } from '../hooks/useLecturaDelLider';
import {
  corteEnPalabras,
  evaluacionEnPalabras,
  gruposEnPalabras,
  mesVecino,
  nombreDelMes,
  observacionesEnPalabras,
  respuestasEnPalabras,
} from '../utils/lecturaDeMentores';

/**
 * El reporte del mes (SDD 002, RL-19..RL-23): un informe que se lee de arriba abajo, con la zona y el
 * corte en la cabecera. Ordenado por la evaluación (el orden lo decide el servidor, sin redondear);
 * quien no tiene muestra se nombra aparte, nunca último con un cero. Sin gráficos: con pocos números,
 * un gráfico es decoración (plan §7).
 */
export function ReporteScreen({ onVolver }: { onVolver: () => void }) {
  const [mes, setMes] = useState<string | null>(null);
  const pedir = useCallback(() => obtenerReporte(mes), [mes]);
  const lectura = useLecturaDelLider(pedir, mes ?? 'en-curso');
  const reporte = lectura.datos;

  return (
    <MarcoDelLider titulo="Reporte del mes" onVolver={onVolver}>
      {reporte ? (
        <>
          <Meses reporte={reporte} onCambiar={setMes} />
          <Cuerpo reporte={reporte} />
        </>
      ) : lectura.fallo ? (
        <FalloDeLectura fallo={lectura.fallo} detalle={lectura.detalle} que="el reporte" onReintentar={lectura.recargar} />
      ) : (
        <CargandoLectura texto="Armando el reporte…" />
      )}
    </MarcoDelLider>
  );
}

function Meses({ reporte, onCambiar }: { reporte: ReporteApi; onCambiar: (mes: string) => void }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.meses}>
      <Pressable
        onPress={() => onCambiar(mesVecino(reporte.month, -1))}
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
        style={estilos.flecha}
      >
        <Icon name="arrowLeft" size={18} color={c.goldInk} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[t.cardTitle, { color: c.textStrong }]}>{primeraMayuscula(nombreDelMes(reporte.month, true))}</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>{`Hora de Lima · ${corteEnPalabras(reporte.cutoffAt)}`}</Text>
      </View>
      {reporte.closed ? (
        <Pressable
          onPress={() => onCambiar(mesVecino(reporte.month, 1))}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          style={[estilos.flecha, { transform: [{ rotate: '180deg' }] }]}
        >
          <Icon name="arrowLeft" size={18} color={c.goldInk} />
        </Pressable>
      ) : (
        <View style={estilos.flecha} />
      )}
    </View>
  );
}

function Cuerpo({ reporte }: { reporte: ReporteApi }) {
  const total = reporte.ranked.length + reporte.withoutSample.length;
  if (total === 0) return <Linea>Todavía no hay mentores activos.</Linea>;
  return (
    <>
      {reporte.ranked.length > 0 ? (
        <View style={{ gap: 10 }}>
          <TituloDeSeccion detalle="De mayor a menor evaluación.">Mentores</TituloDeSeccion>
          {reporte.ranked.map(e => <Entrada key={e.mentor.userId} entrada={e} reporte={reporte} />)}
        </View>
      ) : null}
      {reporte.withoutSample.length > 0 ? (
        <View style={{ gap: 10 }}>
          <TituloDeSeccion detalle="No entran en el orden: sin evidencias que medir este mes.">Sin evaluación</TituloDeSeccion>
          {reporte.withoutSample.map(e => <Entrada key={e.mentor.userId} entrada={e} reporte={reporte} />)}
        </View>
      ) : null}
      {reporte.answeredWithoutAttribution ? (
        <Linea>{`${reporte.answeredWithoutAttribution} consultas de este mes se respondieron antes de que se registrara quién respondía: no se cuentan a nadie.`}</Linea>
      ) : null}
    </>
  );
}

function Entrada({ entrada, reporte }: { entrada: EntradaDelReporteApi; reporte: ReporteApi }) {
  const { c, t } = useTheme();
  const m = entrada.mentor;
  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Text style={[t.cardTitle, { color: c.textStrong }]}>{m.fullName}</Text>
      <Linea fuerte>{evaluacionEnPalabras(m, reporte.month)}</Linea>
      <Linea>{`Hoy: ${gruposEnPalabras(m)}`}</Linea>
      <Linea>{respuestasEnPalabras(m, reporte.month)}</Linea>
      <Linea>{observacionesEnPalabras(entrada.observations)}</Linea>
    </View>
  );
}

function primeraMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const estilos = StyleSheet.create({
  meses: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flecha: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6, width: '100%' },
});
