import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonPrincipal, TituloDeSeccion } from '../../../components/Legible';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { AvatarConSemaforo } from '../../mentor/components/AvatarConSemaforo';
import { CargandoLectura } from '../../semaforo/components/EstadoDeLectura';
import { obtenerReporte } from '../api/liderMentoresApi';
import type { EntradaDelReporteApi, ReporteApi } from '../api/liderMentoresSchemas';
import { AnilloDeProgreso } from '../components/AnilloDeCupo';
import { LecturaFallida } from '../components/LecturaFallida';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { useExportarReporte } from '../hooks/useDescargarSemana';
import { useLecturaDelLider } from '../hooks/useLecturaDelLider';
import { corteEnPalabras, mesVecino, nombreDelMes } from '../utils/lecturaDeMentores';
import { UMBRAL_DE_LA_EVALUACION, colorDeLaEntrada, lineaDeLaEntrada, resumenDelReporte } from '../utils/reporteDelMes';

/**
 * El reporte del mes (spec 056 historia 6, FR-031 y FR-032): el **promedio** de las evaluaciones de los mentores en un anillo con su número, cuántos quedan
 * por debajo del 60 %, el **ranking** (en el orden del servidor, sin redondear antes) con la foto de cada mentor con el borde de su color y su línea corta, y
 * al pie **«Exportar el reporte»**: el documento del mes, con el mismo mecanismo de «Descargar semana». Quien no tiene evaluación este mes no entra en el
 * orden: va aparte, nombrado, nunca último con un cero. Sin textos de ayuda.
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
        <LecturaFallida fallo={lectura.fallo} detalle={lectura.detalle} que="el reporte" onReintentar={lectura.recargar} />
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
      <Presionable onPress={() => onCambiar(mesVecino(reporte.month, -1))} accessibilityRole="button" accessibilityLabel="Mes anterior" style={estilos.flecha}>
        <Icon name="arrowLeft" size={18} color={c.goldInk} />
      </Presionable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[t.cardTitle, { color: c.textStrong }]}>{primeraMayuscula(nombreDelMes(reporte.month, true))}</Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>{`Hora de Lima · ${corteEnPalabras(reporte.cutoffAt)}`}</Text>
      </View>
      {reporte.closed ? (
        <Presionable onPress={() => onCambiar(mesVecino(reporte.month, 1))} accessibilityRole="button" accessibilityLabel="Mes siguiente" style={[estilos.flecha, { transform: [{ rotate: '180deg' }] }]}>
          <Icon name="arrowLeft" size={18} color={c.goldInk} />
        </Presionable>
      ) : (
        <View style={estilos.flecha} />
      )}
    </View>
  );
}

function Cuerpo({ reporte }: { reporte: ReporteApi }) {
  const { c, t } = useTheme();
  const { exportando, exportar } = useExportarReporte(reporte.month);
  const total = reporte.ranked.length + reporte.withoutSample.length;
  if (total === 0) return <Linea>Todavía no hay mentores activos.</Linea>;
  const { promedio, conEvaluacion, debajo } = resumenDelReporte(reporte);

  return (
    <>
      {promedio !== null ? (
        <View style={[estilos.promedio, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          <AnilloDeProgreso
            ahora={promedio}
            maximo={100}
            texto={`${Math.round(promedio)} %`}
            etiqueta={`Promedio de tus mentores ${Math.round(promedio)} por ciento`}
            alerta={promedio < UMBRAL_DE_LA_EVALUACION}
            tamano={76}
            testID="anillo-del-promedio"
          />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[t.cardTitle, { color: c.textStrong }]}>Promedio de tus mentores</Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{`${debajo} de ${conEvaluacion} debajo de ${UMBRAL_DE_LA_EVALUACION} %`}</Text>
          </View>
        </View>
      ) : null}

      {reporte.ranked.length > 0 ? (
        <View style={estilos.seccion}>
          <TituloDeSeccion>Mentores</TituloDeSeccion>
          <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {reporte.ranked.map((e, i) => (
              <Fila key={e.mentor.userId} entrada={e} posicion={i + 1} separador={i > 0} />
            ))}
          </View>
        </View>
      ) : null}

      {reporte.withoutSample.length > 0 ? (
        <View style={estilos.seccion}>
          <TituloDeSeccion>Sin evaluación este mes</TituloDeSeccion>
          <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {reporte.withoutSample.map((e, i) => (
              <Fila key={e.mentor.userId} entrada={e} posicion={null} separador={i > 0} />
            ))}
          </View>
        </View>
      ) : null}

      {reporte.answeredWithoutAttribution ? <Linea>{`${reporte.answeredWithoutAttribution} respondidas sin autor: no se cuentan a nadie.`}</Linea> : null}

      <BotonPrincipal etiqueta="Exportar el reporte" icono="fileText" cargando={exportando} onPress={() => void exportar()} />
    </>
  );
}

/** Un mentor del ranking: la foto con el borde de su color, su nombre, su línea corta y, si entra en el orden, su puesto («1°»). */
function Fila({ entrada, posicion, separador }: { entrada: EntradaDelReporteApi; posicion: number | null; separador: boolean }) {
  const { c, t } = useTheme();
  const linea = lineaDeLaEntrada(entrada);
  return (
    <View
      accessible
      accessibilityLabel={`${posicion ? `Puesto ${posicion}. ` : ''}${entrada.mentor.fullName}${linea ? `. ${linea}` : ''}`}
      style={[estilos.fila, separador ? { borderTopWidth: 1, borderTopColor: c.border } : null]}
    >
      <AvatarConSemaforo nombre={entrada.mentor.fullName} avatarUrl={entrada.mentor.avatarUrl} color={colorDeLaEntrada(entrada)} size={40} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text accessible={false} style={[t.body, { color: c.text, fontSize: 16 }]} numberOfLines={1}>
          {entrada.mentor.fullName}
        </Text>
        {linea ? (
          <Text accessible={false} style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 19 }]} numberOfLines={2}>
            {linea}
          </Text>
        ) : null}
      </View>
      {posicion ? (
        <Text accessible={false} style={[t.body, { color: c.textSoft, fontFamily: fuentes.seminegrita, fontSize: 16, fontVariant: ['tabular-nums'] }]}>{`${posicion}°`}</Text>
      ) : null}
    </View>
  );
}

function primeraMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const estilos = StyleSheet.create({
  meses: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flecha: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  promedio: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 14 },
  seccion: { gap: 8 },
  tarjeta: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
});
