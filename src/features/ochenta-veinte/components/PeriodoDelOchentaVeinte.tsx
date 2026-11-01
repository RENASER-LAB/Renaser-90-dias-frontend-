import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { AvisoDeMantenimiento } from '../../plataforma/components/AvisoDeMantenimiento';
import { useFuncionalidad } from '../../plataforma/estado/useFuncionalidad';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import { Flecha } from '../../semaforo/components/NavegacionDeSemanas';
import { useOchentaVeinte, type FalloDelOchentaVeinte } from '../hooks/useOchentaVeinte';
import type { CargarOchentaVeinte, TipoDePeriodo, VistaDelPeriodo } from '../types/ochentaVeinte.types';
import {
  PARTES_DEL_ANALISIS,
  TEXTO_PARA_AGENDAR,
  avisoDelEstado,
  fechaCorta,
  hayCifras,
  lineaDeAvance,
  lineaDeLasVerdes,
  lineaDeUnEje,
  lineaDeUnaAccion,
  lineaDeUnaSemana,
  lineaDelCodigoRenaser,
  lineaDelVeintePorCiento,
  paraLeer,
  rangoDelPeriodo,
  textosDeLaVoz,
  tituloDeLosPasos,
  tituloDelPeriodo,
  type VozDelOchentaVeinte,
} from '../utils/textosDelOchentaVeinte';

/** Lo que dice el lector de pantalla de cada flecha. Distintas a las de las otras secciones de la ficha. */
export const ETIQUETA_PERIODO_ANTERIOR = 'Tu 80/20: periodo anterior';
export const ETIQUETA_PERIODO_SIGUIENTE = 'Tu 80/20: periodo siguiente';

/**
 * Un periodo del 80/20 (semana o mes): las cifras al día, y cuando cerró, el análisis de SER con sus cuatro partes o por qué todavía no
 * está (spec 031). Lo usan la hoja «Tu 80/20» de Plan y la sección de las fichas de quien acompaña: no saben de rutas ni de roles,
 * `cargar` es de cada pantalla y **tiene que ser estable**.
 *
 * Un 403 o un 404 (backend sin la spec 031, otro rol, ya no la acompaña, «Código Renaser en las fichas» apagado) no dibujan nada; los
 * demás fallos se dicen con «Reintentar». Con `ia.analisis` apagada por Soporte TI las cifras se ven igual y el texto del análisis
 * se cambia por el aviso de mantenimiento (FR-019). Un periodo cerrado muchas veces abierto es una lectura, y ninguna llama a la IA.
 */
export function PeriodoDelOchentaVeinte({
  cargar,
  tipo,
  activo = true,
  alAgendar,
  voz = 'propia',
}: {
  cargar: CargarOchentaVeinte | null;
  tipo: TipoDePeriodo;
  activo?: boolean;
  /** Solo la hoja de la propia persona: «Agendar mis acciones» cuando no hay acciones que contar. */
  alAgendar?: () => void;
  /** Quién lo lee: la propia persona en Plan (por defecto, «tu 80/20») o quien la acompaña en su ficha («su 80/20»). */
  voz?: VozDelOchentaVeinte;
}) {
  const lectura = useOchentaVeinte(cargar, tipo, activo);
  const { datos, cargando, fallo } = lectura;

  if (!cargar || lectura.oculta) return null;
  return (
    <View style={estilos.columna}>
      {datos ? <Encabezado vista={datos} lectura={lectura} voz={voz} /> : null}
      {cargando ? (
        <Cargando voz={voz} />
      ) : fallo ? (
        <Fallo fallo={fallo} alReintentar={lectura.reintentar} voz={voz} />
      ) : datos ? (
        <Cuerpo vista={datos} alAgendar={alAgendar} voz={voz} />
      ) : null}
    </View>
  );
}

function Cargando({ voz }: { voz: VozDelOchentaVeinte }) {
  const { c, t } = useTheme();
  /* Alto reservado: al llegar el periodo la hoja no da un salto desde una línea. */
  return (
    <View style={estilos.cargando}>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{textosDeLaVoz(voz).cargando}</Text>
    </View>
  );
}

function Encabezado({ vista, lectura, voz }: { vista: VistaDelPeriodo; lectura: ReturnType<typeof useOchentaVeinte>; voz: VozDelOchentaVeinte }) {
  const { c, t } = useTheme();
  const textos = textosDeLaVoz(voz);
  const titulo = tituloDelPeriodo(vista.tipo, vista.numero);
  const rango = rangoDelPeriodo(vista.inicio, vista.fin);
  return (
    <View style={estilos.encabezado}>
      <Flecha icono="arrowLeft" etiqueta={textos.periodoAnterior} habilitada={lectura.puedeAnterior} onPress={lectura.anterior} />
      <View style={estilos.centro} accessible accessibilityLiveRegion="polite" accessibilityLabel={rango ? `${titulo}. ${rango}` : titulo}>
        <Text style={[t.cardTitle, { color: c.textStrong, textAlign: 'center', fontSize: 17 }]}>{titulo}</Text>
        {rango ? <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22, textAlign: 'center' }]}>{rango}</Text> : null}
      </View>
      <Flecha icono="arrow" etiqueta={textos.periodoSiguiente} habilitada={lectura.puedeSiguiente} onPress={lectura.siguiente} />
    </View>
  );
}

function Fallo({ fallo, alReintentar, voz }: { fallo: FalloDelOchentaVeinte; alReintentar: () => void; voz: VozDelOchentaVeinte }) {
  const { c, t } = useTheme();
  const textos = textosDeLaVoz(voz);
  return (
    <View style={estilos.fallo}>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
        {fallo === 'sin_red' ? textos.noCargoSinRed : textos.noCargo}
      </Text>
      <Pressable
        onPress={alReintentar}
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        style={({ pressed }) => [estilos.reintentar, { borderColor: c.border, backgroundColor: pressed ? c.goldWash : 'transparent' }]}
      >
        <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: fuentes.media }]}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function Cuerpo({ vista, alAgendar, voz }: { vista: VistaDelPeriodo; alAgendar?: () => void; voz: VozDelOchentaVeinte }) {
  const { c, t } = useTheme();
  const iaAnalisis = useFuncionalidad(CLAVES.iaAnalisis);
  /* El análisis de la IA lo apaga Soporte TI aparte de SER; las cifras no dependen de eso. */
  const analisisDisponible = iaAnalisis.disponible;
  const enMantenimiento = analisisDisponible && !iaAnalisis.prendida && vista.estado !== 'EN_CURSO';
  const conTexto = vista.estado === 'LISTO' && vista.analisis !== null && !enMantenimiento && analisisDisponible;
  const aviso = enMantenimiento || !analisisDisponible ? null : avisoDelEstado(vista, voz);

  return (
    <View style={estilos.cuerpo}>
      {hayCifras(vista.cifras) ? <Cifras vista={vista} conListas={!conTexto} voz={voz} /> : <SinAcciones alAgendar={alAgendar} voz={voz} />}
      {enMantenimiento ? <AvisoDeMantenimiento aviso={iaAnalisis.aviso} /> : null}
      {aviso && hayCifras(vista.cifras) ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]} accessibilityLiveRegion="polite">
          {aviso}
        </Text>
      ) : null}
      {conTexto && vista.analisis ? <Analisis vista={vista} voz={voz} /> : null}
    </View>
  );
}

function SinAcciones({ alAgendar, voz }: { alAgendar?: () => void; voz: VozDelOchentaVeinte }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.bloque}>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{textosDeLaVoz(voz).sinAcciones}</Text>
      {alAgendar ? (
        <Pressable
          onPress={alAgendar}
          accessibilityRole="button"
          accessibilityLabel={TEXTO_PARA_AGENDAR}
          style={({ pressed }) => [estilos.agendar, { borderColor: c.border, backgroundColor: pressed ? c.goldWash : 'transparent' }]}
        >
          <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: fuentes.media }]}>{TEXTO_PARA_AGENDAR}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Las cifras del periodo: lo cumplido, las dos reglas del 20 %, los ejes y —sin texto de la IA— los nombres de lo que movió y de lo que se fue. */
function Cifras({ vista, conListas, voz }: { vista: VistaDelPeriodo; conListas: boolean; voz: VozDelOchentaVeinte }) {
  const { c, t } = useTheme();
  const propia = voz === 'propia';
  const cifras = vista.cifras;
  const avance = lineaDeAvance(cifras);
  const verdes = lineaDeLasVerdes(cifras);
  const veinte = lineaDelVeintePorCiento(cifras);
  const porcentaje = cifras.porcentajeCumplidas ?? 0;
  const codigo = vista.codigoRenaser ? lineaDelCodigoRenaser(vista.codigoRenaser) : null;

  return (
    <View style={estilos.bloque}>
      {avance ? (
        <>
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]} accessibilityLabel={paraLeer(avance)}>
            {avance}
          </Text>
          <View style={[estilos.barra, { backgroundColor: c.divider }]} accessible={false}>
            <View style={[estilos.relleno, { backgroundColor: c.gold, width: `${Math.max(0, Math.min(100, porcentaje))}%` }]} />
          </View>
        </>
      ) : null}
      {verdes ? <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>{verdes}</Text> : null}
      {veinte ? <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>{veinte}</Text> : null}
      {vista.cifras.porVenir > 0 ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
          {vista.cifras.porVenir === 1 ? '1 acción más está agendada para los días que vienen.' : `${vista.cifras.porVenir} acciones más están agendadas para los días que vienen.`}
        </Text>
      ) : null}
      {cifras.porEje.length > 0 ? (
        <View style={estilos.lista}>
          {cifras.porEje.map(eje => (
            <Text key={eje.eje} style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>
              {lineaDeUnEje(eje)}
            </Text>
          ))}
        </View>
      ) : null}
      {vista.semanas.length > 0 ? (
        <View style={estilos.lista}>
          <Text style={[t.micro, estilos.rotulo, { color: c.micro, fontSize: 14 }]}>Semana a semana</Text>
          {vista.semanas.map(semana => (
            <Text key={semana.numero} style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>
              {lineaDeUnaSemana(semana)}
            </Text>
          ))}
        </View>
      ) : null}
      {conListas && cifras.lasQueMasMovieron.length > 0 ? (
        <Lista titulo={PARTES_DEL_ANALISIS.loQueMasMovio} lineas={cifras.lasQueMasMovieron.map(lineaDeUnaAccion)} />
      ) : null}
      {conListas && cifras.lasQueSeFueron.length > 0 ? (
        <Lista
          titulo={textosDeLaVoz(voz).loQueSeFue}
          lineas={cifras.lasQueSeFueron.map(lineaDeUnaAccion)}
          nota={
            cifras.cumplioLoQueMenosMovia
              ? propia
                ? 'Mientras tanto cumpliste cosas de menos impacto: pasa, y se puede retomar.'
                : 'Mientras tanto cumplió cosas de menos impacto: pasa, y se puede retomar.'
              : undefined
          }
        />
      ) : null}
      {codigo ? <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{codigo}</Text> : null}
    </View>
  );
}

function Lista({ titulo, lineas, nota }: { titulo: string; lineas: string[]; nota?: string }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.lista}>
      <Text style={[t.micro, estilos.rotulo, { color: c.micro, fontSize: 14 }]}>{titulo}</Text>
      {lineas.map(linea => (
        <Text key={linea} style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>
          {linea}
        </Text>
      ))}
      {nota ? <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{nota}</Text> : null}
    </View>
  );
}

/** Las cuatro partes del análisis, siempre en este orden, y de dónde viene. */
function Analisis({ vista, voz }: { vista: VistaDelPeriodo; voz: VozDelOchentaVeinte }) {
  const { c, t } = useTheme();
  const analisis = vista.analisis;
  if (!analisis) return null;
  const generado = fechaCorta(vista.generadoEn);
  const textos = textosDeLaVoz(voz);
  return (
    <View style={[estilos.analisis, { borderTopColor: c.divider }]}>
      <Parte titulo={PARTES_DEL_ANALISIS.loQueMasMovio} texto={analisis.loQueMasMovio} />
      <Parte titulo={textos.loQueSeFue} texto={analisis.loQueSeTeFue} />
      <Parte titulo={textos.comoEstuvo} texto={analisis.comoEstuviste} />
      <View style={estilos.parte}>
        <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>
          {tituloDeLosPasos(vista.tipo)}
        </Text>
        {analisis.proximosPasos.map(paso => (
          <Text key={paso} style={[t.body, { color: c.text, fontSize: 16, lineHeight: 24 }]}>
            {`• ${paso}`}
          </Text>
        ))}
      </View>
      <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>
        {textos.pie(generado)}
      </Text>
    </View>
  );
}

function Parte({ titulo, texto }: { titulo: string; texto: string }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.parte}>
      <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>
        {titulo}
      </Text>
      <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 24 }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 14 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  centro: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  cuerpo: { gap: 14 },
  bloque: { gap: 8 },
  lista: { gap: 4, marginTop: 4 },
  rotulo: { letterSpacing: 0, fontFamily: fuentes.negrita, marginTop: 6 },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4 },
  analisis: { gap: 14, borderTopWidth: 1, paddingTop: 14 },
  parte: { gap: 4 },
  cargando: { minHeight: 120, justifyContent: 'center', alignItems: 'center' },
  fallo: { gap: 12, alignItems: 'flex-start' },
  reintentar: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  agendar: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
});
