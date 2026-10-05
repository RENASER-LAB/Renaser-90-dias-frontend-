import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { LogoDeMarca } from '../../../components/LogoDeMarca';
import { useTheme } from '../../../theme/ThemeContext';
import { CursoPortada } from '../../academy/components/CursoPortada';
import type { Ocurrencia } from '../types/eventos.types';
import { agruparPorMes, soloElMes } from '../utils/calendarioDelMes';
import { rotuloDelTipo } from '../utils/formularioDeEvento';
import { linkParaUnirme, marcaDelLink, nombreDelLink } from '../utils/linkDelEvento';
import { diaRelativo, duracionEnPalabras } from '../utils/textosDeFecha';
import { fechaEnZona, horaEnZona, sumarDiasIso } from '../utils/zonaHoraria';
import { EtiquetaAsistencia, LETRA } from './piezas';

/**
 * La vista «Tarjetas» de Eventos: los próximos eventos «de largo, como cursos» (pedido del dueño del
 * 2026-09-26). Es la tarjeta de Classroom (`ComunidadScreen.tsx`, `courseCard` /
 * `courseCoverHeader` / `courseCategoryBadge` / `exploreBtn`) con los datos de un evento, no un estilo
 * nuevo: misma portada (`CursoPortada`, que sin foto pinta el mismo fondo oscuro de los cursos sin
 * portada), mismo rótulo sobre la portada, mismo título en serif blanco y mismo botón con borde
 * dorado. Solo cambia el tamaño de la letra: la fecha y la hora van grandes (20–26 px) porque son lo
 * que se busca, y el rótulo y el botón van a 14–16 px en vez de 10,5 (usuarios de 30 a 60 años).
 *
 * Se agrupan por mes («Septiembre», «Octubre»), como un catálogo.
 */
export function TarjetasDeEventos({
  ocurrencias,
  zona,
  ahoraMs,
  onAbrir,
}: {
  /** Ya filtradas y ordenadas (`proximasParaTarjetas`). */
  ocurrencias: Ocurrencia[];
  zona: string;
  ahoraMs: number;
  onAbrir: (oc: Ocurrencia) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 22 }}>
      {agruparPorMes(ocurrencias, zona).map(grupo => (
        <View key={`${grupo.mes.anio}-${grupo.mes.mes}`} style={{ gap: 14 }}>
          <Text accessibilityRole="header" style={[estilos.mes, { color: c.textStrong }]}>
            {soloElMes(grupo.mes)}
          </Text>
          {grupo.ocurrencias.map(oc => (
            <TarjetaComoCurso
              key={`${oc.evento.id}|${oc.inicioOcurrencia}`}
              oc={oc}
              zona={zona}
              ahoraMs={ahoraMs}
              onPress={() => onAbrir(oc)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function TarjetaComoCurso({
  oc,
  zona,
  ahoraMs,
  onPress,
}: {
  oc: Ocurrencia;
  zona: string;
  ahoraMs: number;
  onPress: () => void;
}) {
  const { c, t, space } = useTheme();
  const zonaDelEvento = oc.evento.zona ?? zona;
  const hoy = fechaEnZona(ahoraMs, zonaDelEvento);
  const dia = diaRelativo(fechaEnZona(oc.iniciaEn, zonaDelEvento), hoy, sumarDiasIso(hoy, 1));
  const hora = horaEnZona(oc.iniciaEn, zonaDelEvento);
  const duracion = duracionEnPalabras(oc.duracionMinutos);
  const link = linkParaUnirme(oc.evento);
  const donde = link ? nombreDelLink(link) : oc.evento.tipoUbicacion === 'ADDRESS' ? oc.evento.valorUbicacion : null;
  const marca = link ? marcaDelLink(link) : null;
  const rotulo = rotuloDelTipo(oc.evento.tipoEvento);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rotulo}. ${oc.titulo}. ${dia}, ${hora}.${donde ? ` ${donde}.` : ''}${oc.asistencia === 'GOING' ? ' Vas.' : ''} Ver evento.`}
      style={({ pressed }) => [
        estilos.tarjeta,
        { borderColor: c.border, backgroundColor: c.cardBg, borderRadius: space.radius, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={estilos.portada}>
        <CursoPortada url={oc.evento.portadaUrl} />
        <View style={[estilos.rotulo, { backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: space.radiusSm }]}>
          <Text style={[estilos.rotuloTexto, { color: c.goldInk }]}>{rotulo}</Text>
        </View>
        <Text style={[t.screenTitle, estilos.titulo]} numberOfLines={2}>
          {oc.titulo}
        </Text>
      </View>

      <View style={{ padding: space.cardPad, gap: 10 }}>
        <View style={{ gap: 2 }}>
          <Text style={[estilos.dia, { color: c.goldInk }]}>{dia}</Text>
          <Text style={[estilos.hora, { color: c.textStrong }]}>
            {hora}
            {duracion ? <Text style={[estilos.duracion, { color: c.textSoft }]}>{`  ·  ${duracion}`}</Text> : null}
          </Text>
        </View>
        {donde ? (
          <View style={estilos.donde}>
            {marca ? (
              <LogoDeMarca marca={marca} size={18} decorativo />
            ) : (
              <Icon name={link ? 'play' : 'users'} size={18} color={c.goldInk} />
            )}
            <Text style={[estilos.dondeTexto, { color: c.textSoft }]} numberOfLines={2}>
              {donde}
            </Text>
          </View>
        ) : null}
        <EtiquetaAsistencia oc={oc} />
        <View style={[estilos.boton, { borderColor: c.gold, backgroundColor: c.cardBgAlt, borderRadius: space.radiusSm }]}>
          <Text style={[estilos.botonTexto, { color: c.goldInk }]}>VER EVENTO ›</Text>
        </View>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  mes: { fontFamily: 'Fraunces_600SemiBold', fontSize: 24, letterSpacing: -0.4, lineHeight: 29 },
  tarjeta: { borderWidth: 1, overflow: 'hidden' },
  // Mismo alto y padding que `courseCoverHeader` de Classroom.
  portada: { height: 185, padding: 14, justifyContent: 'space-between' },
  rotulo: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6 },
  rotuloTexto: { fontFamily: 'Jost_700Bold', fontSize: 14, letterSpacing: 1.4 },
  titulo: { color: '#FFFFFF', fontSize: 24, lineHeight: 29 },
  dia: { fontFamily: 'Jost_500Medium', fontSize: 20, lineHeight: 26 },
  hora: { fontFamily: 'Jost_700Bold', fontSize: 26, lineHeight: 32, fontVariant: ['tabular-nums'] },
  duracion: { fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo },
  donde: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dondeTexto: { flex: 1, fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo + 1, lineHeight: 23 },
  // Mismo que `exploreBtn` de Classroom, con 52 px de alto en vez de 48.
  boton: { borderWidth: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  botonTexto: { fontFamily: 'Jost_700Bold', fontSize: LETRA.cuerpo, letterSpacing: 0.5 },
});
