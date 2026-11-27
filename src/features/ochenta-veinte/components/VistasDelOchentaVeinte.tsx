import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { Palette } from '../../../theme/tokens';
import { estadoDeLaAccion, horaCortaDeLaAccion, textoDelEstado } from '../../objetivos/utils/accionesDeHoy';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import type { EjeObjetivo, RocaDiariaApi, RocaMaestraApi } from '../../objetivos/types/objetivos.types';
import { ETIQUETA_CORTA_EJE } from '../../objetivos/types/objetivos.types';
import { formatearNumero } from '../../objetivos/utils/cifraDelObjetivo';
import { colorDePareto, NOMBRE_DEL_COLOR } from '../../objetivos/utils/planPrincipal';
import type { AccionDelOchentaVeinte, VistaDelPeriodo } from '../types/ochentaVeinte.types';
import {
  COLORES,
  ETIQUETA_DE_LO_QUE_MAS_ACERCA,
  mapaDeCalor,
  pesosDeHoy,
  porOrdenDeImpacto,
  proyeccionDelMes,
  recomendacionDeHoy,
  recomendacionDeLaSemana,
  recomendacionDelMes,
  type EstadoDeCelda,
} from '../utils/recomendacionesDelFenix';
import { lineaDeAvance, lineaDeLasPorVenir } from '../utils/textosDelOchentaVeinte';
import { TarjetaDelFenix } from './TarjetaDelFenix';

/**
 * Las tres vistas de «Tu 80/20» con el fénix (spec 058 FR-016): Hoy (una dona y una recomendación), Semana (mapa de calor) y Mes (¿vas a llegar?).
 * Solo dibujan y dicen: las reglas de qué recomendar están en `utils/recomendacionesDelFenix.ts`.
 */

/* ------------------------------------------------------------------------------------------------
 * HOY
 * ---------------------------------------------------------------------------------------------- */

const LADO_DE_LA_DONA = 132;
const GROSOR = 16;

function Dona({ acciones, cumplidas }: { acciones: readonly RocaDiariaApi[]; cumplidas: number }) {
  const { c, t } = useTheme();
  const radio = (LADO_DE_LA_DONA - GROSOR) / 2;
  const largo = 2 * Math.PI * radio;
  const total = acciones.reduce((s, a) => s + Math.max(0, a.puntajeImpacto), 0);
  let recorrido = 0;
  const arcos = porOrdenDeImpacto(acciones).map(a => {
    const parte = total > 0 ? (Math.max(0, a.puntajeImpacto) / total) * largo : largo / acciones.length;
    const arco = { id: a.id, color: colorDePareto(a.color, c), parte, desde: recorrido, hecha: a.completada };
    recorrido += parte;
    return arco;
  });
  return (
    <View style={estilos.dona} accessible accessibilityLabel={`${cumplidas} de ${acciones.length} acciones cumplidas hoy`}>
      <Svg width={LADO_DE_LA_DONA} height={LADO_DE_LA_DONA} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={LADO_DE_LA_DONA / 2} cy={LADO_DE_LA_DONA / 2} r={radio} stroke={c.divider} strokeWidth={GROSOR} fill="none" />
        {arcos.map(a => (
          <Circle
            key={a.id}
            cx={LADO_DE_LA_DONA / 2}
            cy={LADO_DE_LA_DONA / 2}
            r={radio}
            stroke={a.color}
            strokeWidth={GROSOR}
            fill="none"
            opacity={a.hecha ? 1 : 0.3}
            strokeDasharray={`${Math.max(0, a.parte - 3)} ${largo}`}
            strokeDashoffset={-a.desde}
          />
        ))}
      </Svg>
      <View style={estilos.centroDeLaDona} pointerEvents="none">
        <Text style={[t.metric, { color: c.textStrong, fontSize: 30 }]}>{`${cumplidas}/${acciones.length}`}</Text>
      </View>
    </View>
  );
}

export function VistaDeHoy({
  eje,
  deHoy,
  hoyIso,
  seFueron,
  alAgendar,
}: {
  eje: EjeObjetivo;
  deHoy: readonly RocaDiariaApi[];
  hoyIso: string | null;
  seFueron: readonly AccionDelOchentaVeinte[];
  alAgendar?: () => void;
}) {
  const { c, t } = useTheme();
  const cumplidas = deHoy.filter(a => a.completada).length;
  const pesos = pesosDeHoy(deHoy);
  const recomendacion = recomendacionDeHoy({ deHoy, seFueron, eje, hoyIso });
  const frase =
    deHoy.length === 0
      ? 'Hoy no tienes acciones en este eje.'
      : cumplidas === deHoy.length
        ? 'Hoy cumpliste todo.'
        : pesos.VERDE >= 50
          ? 'Tu verde mueve la mitad o más de tu día.'
          : `Llevas ${cumplidas} de ${deHoy.length} acciones.`;
  return (
    <View style={estilos.columna}>
      {deHoy.length > 0 ? (
        <View style={estilos.filaDeLaDona}>
          <Dona acciones={deHoy} cumplidas={cumplidas} />
          <View style={estilos.leyenda}>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17, lineHeight: 24 }]}>{frase}</Text>
            {COLORES.map(color => (
              <View key={color} style={estilos.filaDeLeyenda}>
                <View style={[estilos.punto, { backgroundColor: colorDePareto(color, c) }]} />
                <Text style={[t.body, { color: c.text, fontSize: 15 }]}>{`${NOMBRE_DEL_COLOR[color]} · ${pesos[color]} %`}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{frase}</Text>
      )}

      {deHoy.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Por orden de impacto</Text>
          {porOrdenDeImpacto(deHoy).map(accion => {
            const estado = estadoDeLaAccion(accion, 24 * 60);
            const hora = horaCortaDeLaAccion(accion);
            return (
              <View key={accion.id} style={[estilos.accion, { borderColor: c.border, backgroundColor: c.cardBgAlt }]} accessible>
                <View style={[estilos.marca, { backgroundColor: colorDePareto(accion.color, c) }]} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={[t.body, estilos.tituloDeLaAccion, { color: c.textStrong }]}>{accion.titulo}</Text>
                  <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>
                    {hora ? `${hora} · ` : ''}
                    {estado === 'sePaso' ? 'Pendiente' : textoDelEstado(estado, null)}
                  </Text>
                </View>
                {estado === 'cumplida' ? (
                  <Icon name="checkCircle" size={TAMANO_ICONO.normal} color={c.success} />
                ) : estado === 'esperaALaVerde' ? (
                  <Icon name="lock" size={TAMANO_ICONO.normal} color={c.chevron} />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <TarjetaDelFenix
        rotulo={recomendacion.tipo === 'siguiente' ? ETIQUETA_DE_LO_QUE_MAS_ACERCA : undefined}
        texto={recomendacion.texto}
        boton={recomendacion.tipo === 'reagendar' || recomendacion.tipo === 'sin-acciones' ? (recomendacion.tipo === 'reagendar' ? 'Reagéndala' : 'Agendar mis acciones') : undefined}
        alTocarElBoton={alAgendar}
      />
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * SEMANA
 * ---------------------------------------------------------------------------------------------- */

const LETRAS_DE_LOS_DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const NOMBRE_DEL_ESTADO: Record<EstadoDeCelda, string> = {
  TODO: 'Todo cumplido',
  VERDE: 'Solo la verde',
  A_MEDIAS: 'A medias',
  NADA: 'Nada',
  POR_VENIR: 'Por venir',
  SIN_DATO: 'Sin dato',
};

function colorDeLaCelda(estado: EstadoDeCelda, c: Palette): { fondo: string; opacidad: number } {
  switch (estado) {
    case 'TODO':
      return { fondo: c.success, opacidad: 1 };
    case 'VERDE':
      return { fondo: c.success, opacidad: 0.5 };
    case 'A_MEDIAS':
      return { fondo: c.gold, opacidad: 0.75 };
    case 'NADA':
      return { fondo: c.danger, opacidad: 0.6 };
    default:
      return { fondo: c.divider, opacidad: estado === 'POR_VENIR' ? 0.5 : 1 };
  }
}

export function VistaDeLaSemana({
  vista,
  agendadas,
  hoyIso,
  alAgendar,
}: {
  vista: VistaDelPeriodo;
  agendadas: readonly RocaDiariaApi[];
  hoyIso: string | null;
  alAgendar?: () => void;
}) {
  const { c, t } = useTheme();
  const mapa = mapaDeCalor(vista, agendadas, hoyIso);
  const recomendacion = recomendacionDeLaSemana(vista);
  const { cumplidas, planificadas } = vista.cifras;
  const porcentaje = vista.cifras.porcentajeCumplidas ?? (planificadas > 0 ? Math.round((cumplidas / planificadas) * 100) : 0);
  /* Issue #115: «hasta hoy» y lo que viene (la semana suma el total) se siguen diciendo, con las mismas frases de siempre. */
  const avance = lineaDeAvance(vista.cifras, !vista.cerrado) ?? `${cumplidas} de ${planificadas} acciones · ${porcentaje} %`;
  const porVenir = lineaDeLasPorVenir(vista.cifras, vista.tipo);
  return (
    <View style={estilos.columna}>
      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18 }]}>{avance}</Text>
      {porVenir ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{porVenir}</Text> : null}
      <View style={estilos.rejilla}>
        <View style={estilos.filaDeRejilla}>
          <View style={estilos.rotuloDeEje} />
          {mapa.dias.map(fecha => (
            <Text
              key={fecha}
              style={[t.small, estilos.letraDelDia, { color: fecha === hoyIso ? c.textStrong : c.textSoft, fontFamily: fecha === hoyIso ? fuentes.negrita : fuentes.media }]}
            >
              {LETRAS_DE_LOS_DIAS[new Date(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10)), 12).getDay()]}
            </Text>
          ))}
        </View>
        {mapa.filas.map(fila => (
          <View key={fila.eje} style={estilos.filaDeRejilla}>
            <Text style={[t.small, estilos.rotuloDeEje, { color: c.text }]} numberOfLines={1}>
              {ETIQUETA_CORTA_EJE[fila.eje]}
            </Text>
            {fila.celdas.map((estado, i) => {
              const { fondo, opacidad } = colorDeLaCelda(estado, c);
              const esHoy = mapa.dias[i] === hoyIso;
              return (
                <View
                  key={mapa.dias[i]}
                  accessible
                  accessibilityLabel={`${ETIQUETA_CORTA_EJE[fila.eje]}, ${mapa.dias[i]}: ${NOMBRE_DEL_ESTADO[estado]}`}
                  style={[estilos.celda, { borderColor: esHoy ? c.textStrong : estado === 'POR_VENIR' ? c.borderStrong : 'transparent', borderStyle: estado === 'POR_VENIR' ? 'dashed' : 'solid' }]}
                >
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: fondo, opacity: opacidad, borderRadius: 6 }]} />
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View style={estilos.leyendaDeCeldas}>
        {(['TODO', 'VERDE', 'A_MEDIAS', 'NADA'] as const).map(estado => (
          <View key={estado} style={estilos.filaDeLeyenda}>
            <View style={[estilos.punto, { backgroundColor: colorDeLaCelda(estado, c).fondo, opacity: colorDeLaCelda(estado, c).opacidad }]} />
            <Text style={[t.small, { color: c.textSoft, fontSize: 13.5 }]}>{NOMBRE_DEL_ESTADO[estado]}</Text>
          </View>
        ))}
      </View>
      {mapa.conDato === 0 ? (
        <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>Los días que ya pasaron se van llenando con lo que cumples.</Text>
      ) : null}
      <TarjetaDelFenix texto={recomendacion.texto} boton={recomendacion.ofreceAgendar ? 'Agendar mis acciones' : undefined} alTocarElBoton={alAgendar} />
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * MES
 * ---------------------------------------------------------------------------------------------- */

const ALTO_DEL_GRAFICO = 120;

function Grafico({
  inicio,
  actual,
  meta,
  proyectado,
  diaPrograma,
  diaFinal,
}: {
  inicio: number;
  actual: number;
  meta: number;
  proyectado: number;
  diaPrograma: number;
  diaFinal: number;
}) {
  const { c } = useTheme();
  const [ancho, setAncho] = useState(0);
  const valores = [inicio, actual, meta, proyectado];
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const margen = 14;
  const x = (dia: number) => margen + (Math.min(dia, diaFinal) / Math.max(1, diaFinal)) * Math.max(0, ancho - margen * 2);
  const y = (v: number) => margen + (max === min ? 0.5 : (max - v) / (max - min)) * (ALTO_DEL_GRAFICO - margen * 2);
  return (
    <View onLayout={e => setAncho(e.nativeEvent.layout.width)} style={{ height: ALTO_DEL_GRAFICO }} accessible={false}>
      {ancho > 0 ? (
        <Svg width={ancho} height={ALTO_DEL_GRAFICO}>
          <Line x1={margen} x2={ancho - margen} y1={y(meta)} y2={y(meta)} stroke={c.success} strokeWidth={2} strokeDasharray="6 5" />
          <Line x1={x(0)} y1={y(inicio)} x2={x(diaFinal)} y2={y(proyectado)} stroke={c.gold} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />
          <Line x1={x(0)} y1={y(inicio)} x2={x(diaPrograma)} y2={y(actual)} stroke={c.textStrong} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={x(diaPrograma)} cy={y(actual)} r={6} fill={c.textStrong} />
        </Svg>
      ) : null}
    </View>
  );
}

export function VistaDelMes({
  vista,
  eje,
  maestra,
  metaDelMes,
  diaPrograma,
  diaEnQueTerminaElMes,
  alAgendar,
}: {
  vista: VistaDelPeriodo;
  eje: EjeObjetivo;
  maestra: RocaMaestraApi | null;
  /** La cifra que el servidor da para este mes (la misma de «Planificar mi mes»); `null` si el mes no lleva cifra. */
  metaDelMes: number | null;
  diaPrograma: number;
  diaEnQueTerminaElMes: number;
  alAgendar?: () => void;
}) {
  const { c, t } = useTheme();
  const unidad = maestra?.unidad ?? '';
  const numerico = maestra != null && maestra.lineaBase != null && maestra.avance != null && metaDelMes != null;
  const proyeccion = numerico
    ? proyeccionDelMes({ inicio: maestra.lineaBase as number, actual: maestra.avance as number, metaDelMes: metaDelMes as number, diaPrograma, diaEnQueTerminaElMes })
    : null;
  const { cumplidas, planificadas } = vista.cifras;
  const porcentaje = vista.cifras.porcentajeCumplidas ?? (planificadas > 0 ? Math.round((cumplidas / planificadas) * 100) : 0);
  const texto = recomendacionDelMes({ llega: proyeccion ? proyeccion.llega : null, eje, vista });
  const cifra = (n: number) => `${formatearNumero(n)}${unidad ? ` ${unidad}` : ''}`;

  return (
    <View style={estilos.columna}>
      {numerico && proyeccion ? (
        <>
          <View style={estilos.filaDeLaCifra}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Hoy</Text>
              <Text style={[t.metric, { color: c.textStrong, fontSize: 32 }]} numberOfLines={1} adjustsFontSizeToFit>{cifra(maestra?.avance as number)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
              <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Meta del mes</Text>
              <Text style={[t.metric, { color: c.success, fontSize: 32 }]} numberOfLines={1} adjustsFontSizeToFit>{cifra(metaDelMes as number)}</Text>
            </View>
          </View>
          <Grafico
            inicio={maestra?.lineaBase as number}
            actual={maestra?.avance as number}
            meta={metaDelMes as number}
            proyectado={proyeccion.proyectado}
            diaPrograma={diaPrograma}
            diaFinal={diaEnQueTerminaElMes}
          />
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17, lineHeight: 24 }]}>
            {proyeccion.llega
              ? `A este ritmo llegarías a ${cifra(proyeccion.proyectado)}: sí llegas a tu meta del mes.`
              : `A este ritmo llegarías a ${cifra(proyeccion.proyectado)}: te faltarían ${cifra(proyeccion.faltaria)}.`}
          </Text>
        </>
      ) : (
        <>
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18 }]}>
            {lineaDeAvance(vista.cifras, !vista.cerrado) ?? `${cumplidas} de ${planificadas} acciones · ${porcentaje} %`}
          </Text>
          <View style={[estilos.barra, { backgroundColor: c.divider }]} accessible={false}>
            <View style={[estilos.relleno, { backgroundColor: c.gold, width: `${Math.max(0, Math.min(100, porcentaje))}%` }]} />
          </View>
        </>
      )}
      <TarjetaDelFenix texto={texto} boton={proyeccion && !proyeccion.llega ? 'Agendar mis acciones' : undefined} alTocarElBoton={alAgendar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 14 },
  filaDeLaDona: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dona: { width: LADO_DE_LA_DONA, height: LADO_DE_LA_DONA, alignItems: 'center', justifyContent: 'center' },
  centroDeLaDona: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  leyenda: { flex: 1, minWidth: 0, gap: 6 },
  filaDeLeyenda: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  punto: { width: 12, height: 12, borderRadius: 6 },
  rotulo: { fontFamily: fuentes.media, fontSize: 14, letterSpacing: 0 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 56 },
  marca: { width: 6, height: 32, borderRadius: 3 },
  tituloDeLaAccion: { fontSize: 16, lineHeight: 22, fontFamily: fuentes.media },
  rejilla: { gap: 6 },
  filaDeRejilla: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rotuloDeEje: { width: 74 },
  letraDelDia: { flex: 1, textAlign: 'center', fontSize: 13.5 },
  celda: { flex: 1, height: 40, borderRadius: 8, borderWidth: 1.5 },
  leyendaDeCeldas: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  filaDeLaCifra: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4 },
});
