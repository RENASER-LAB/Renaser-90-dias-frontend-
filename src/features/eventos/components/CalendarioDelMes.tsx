import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { BotonSecundario } from '../../../components/Legible';
import { LogoDeMarca } from '../../../components/LogoDeMarca';
import { useTheme } from '../../../theme/ThemeContext';
import type { Ocurrencia } from '../types/eventos.types';
import {
  DIAS_DE_LA_SEMANA,
  DIAS_DE_LA_SEMANA_COMPLETOS,
  grillaDelMes,
  marcaDelDia,
  soloElMes,
  type CeldaDelDia,
  type MarcaDelDia,
  type Mes,
} from '../utils/calendarioDelMes';
import { linkParaUnirme, marcaDelLink, nombreDelLink } from '../utils/linkDelEvento';
import { diaEnPalabras } from '../utils/textosDeFecha';
import { horaEnZona } from '../utils/zonaHoraria';
import { EtiquetaAsistencia, LETRA, Parrafo } from './piezas';

/**
 * La vista «Calendario» de Eventos (pedido del dueño del 2026-09-26): la grilla del mes, de lunes a
 * domingo, con una marca en los días que tienen eventos —dorada; verde si la persona dijo «Voy»,
 * el mismo verde de la etiqueta «Vas»—. Tocar un día muestra debajo sus eventos; cada uno abre el
 * detalle de siempre.
 *
 * Celdas de 54 px de alto y números de 17 px: a 360 px de ancho cada columna tiene ~45 px, que se
 * tocan con el pulgar. Toda la lógica (qué días, qué marca, qué día queda elegido) está en
 * `utils/calendarioDelMes.ts`; acá solo se dibuja.
 */
export function CalendarioDelMes({
  mes,
  hoyIso,
  porDia,
  diaElegido,
  zona,
  cargando,
  fallo,
  onCambiarMes,
  onHoy,
  onElegirDia,
  onReintentar,
  onAbrir,
}: {
  mes: Mes;
  hoyIso: string;
  /** Ocurrencias por día local (ya filtradas si se pidió «Solo a los que voy»). */
  porDia: Record<string, Ocurrencia[]>;
  diaElegido: string | null;
  zona: string;
  cargando: boolean;
  fallo: boolean;
  onCambiarMes: (delta: number) => void;
  onHoy: () => void;
  onElegirDia: (fecha: string) => void;
  onReintentar: () => void;
  onAbrir: (oc: Ocurrencia) => void;
}) {
  const { c, space } = useTheme();
  const semanas = grillaDelMes(mes);
  const delDia = diaElegido ? porDia[diaElegido] ?? [] : [];

  return (
    <View style={{ gap: 14 }}>
      <View style={estilos.cabecera}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            accessibilityRole="header"
            style={[estilos.mes, { color: c.textStrong }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {soloElMes(mes)}
          </Text>
          <Text style={[estilos.anio, { color: c.textSoft }]}>{mes.anio}</Text>
        </View>
        <BotonSecundario etiqueta="Hoy" onPress={onHoy} estilo={estilos.botonHoy} accessibilityLabel="Ir a hoy" />
        <BotonSecundario etiqueta="‹" onPress={() => onCambiarMes(-1)} estilo={estilos.flecha} accessibilityLabel="Mes anterior" />
        <BotonSecundario etiqueta="›" onPress={() => onCambiarMes(1)} estilo={estilos.flecha} accessibilityLabel="Mes siguiente" />
      </View>

      <View style={[estilos.grilla, { borderColor: c.border, backgroundColor: c.cardBg, borderRadius: space.radius }]}>
        <View style={estilos.semana}>
          {DIAS_DE_LA_SEMANA.map((inicial, i) => (
            <Text
              key={i}
              accessibilityLabel={DIAS_DE_LA_SEMANA_COMPLETOS[i]}
              style={[estilos.inicial, { color: i >= 5 ? c.goldInk : c.textSoft }]}
            >
              {inicial}
            </Text>
          ))}
        </View>
        {semanas.map(semana => (
          <View key={semana[0].fecha} style={estilos.semana}>
            {semana.map(celda => (
              <Celda
                key={celda.fecha}
                celda={celda}
                hoy={celda.fecha === hoyIso}
                elegida={celda.fecha === diaElegido}
                marca={marcaDelDia(porDia[celda.fecha])}
                cuantos={porDia[celda.fecha]?.length ?? 0}
                onPress={() => onElegirDia(celda.fecha)}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={estilos.leyenda}>
        <Punto color={c.gold} />
        <Text style={[estilos.leyendaTexto, { color: c.textSoft }]}>Hay evento</Text>
        <View style={{ width: 12 }} />
        <Punto color={c.success} />
        <Text style={[estilos.leyendaTexto, { color: c.textSoft }]}>Vas</Text>
      </View>

      {cargando ? <Parrafo>Buscando eventos…</Parrafo> : null}
      {fallo && !cargando ? (
        <View style={{ gap: 8 }}>
          <Parrafo tono="peligro">No se pudieron leer los eventos de este mes.</Parrafo>
          <BotonSecundario etiqueta="Reintentar" onPress={onReintentar} />
        </View>
      ) : null}

      {diaElegido ? (
        <View style={{ gap: 10 }}>
          <Text style={[estilos.tituloDelDia, { color: c.textStrong }]}>
            {diaElegido === hoyIso ? `Hoy, ${diaEnPalabras(diaElegido).toLowerCase()}` : diaEnPalabras(diaElegido)}
          </Text>
          {delDia.length === 0 && !cargando ? <Parrafo>No hay eventos este día.</Parrafo> : null}
          {delDia.map(oc => (
            <TarjetaDelDia key={`${oc.evento.id}|${oc.inicioOcurrencia}`} oc={oc} zona={zona} onPress={() => onAbrir(oc)} />
          ))}
        </View>
      ) : !cargando ? (
        <Parrafo>Toca un día con punto para ver sus eventos.</Parrafo>
      ) : null}
    </View>
  );
}

function Punto({ color }: { color: string }) {
  return <View style={[estilos.punto, { backgroundColor: color }]} />;
}

function Celda({
  celda,
  hoy,
  elegida,
  marca,
  cuantos,
  onPress,
}: {
  celda: CeldaDelDia;
  hoy: boolean;
  elegida: boolean;
  marca: MarcaDelDia;
  cuantos: number;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const colorDelNumero = elegida ? c.onGold : !celda.delMes ? c.tabInactive : hoy ? c.goldInk : c.textStrong;
  const eventos = cuantos === 0 ? 'sin eventos' : cuantos === 1 ? '1 evento' : `${cuantos} eventos`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: elegida }}
      accessibilityLabel={`${hoy ? 'Hoy, ' : ''}${diaEnPalabras(celda.fecha)}, ${eventos}${marca === 'vas' ? ', vas' : ''}`}
      style={({ pressed }) => [estilos.celda, { opacity: pressed ? 0.7 : celda.delMes ? 1 : 0.55 }]}
    >
      <View
        style={[
          estilos.circulo,
          elegida ? { backgroundColor: c.gold } : hoy ? { borderWidth: 1.5, borderColor: c.gold } : null,
        ]}
      >
        <Text style={[estilos.numero, { color: colorDelNumero, fontFamily: hoy || elegida ? 'Jost_700Bold' : 'Jost_500Medium' }]}>
          {celda.dia}
        </Text>
      </View>
      {marca ? <Punto color={marca === 'vas' ? c.success : c.gold} /> : <View style={estilos.punto} />}
    </Pressable>
  );
}

/** Un evento del día elegido: la hora grande a la izquierda, el nombre, dónde y si vas. */
function TarjetaDelDia({ oc, zona, onPress }: { oc: Ocurrencia; zona: string; onPress: () => void }) {
  const { c } = useTheme();
  const link = linkParaUnirme(oc.evento);
  const donde = link ? nombreDelLink(link) : oc.evento.tipoUbicacion === 'ADDRESS' ? oc.evento.valorUbicacion : null;
  const marca = link ? marcaDelLink(link) : null;
  const hora = horaEnZona(oc.iniciaEn, oc.evento.zona ?? zona);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${hora}. ${oc.titulo}.${donde ? ` ${donde}.` : ''}${oc.asistencia === 'GOING' ? ' Vas.' : ''} Ver el evento.`}
      style={({ pressed }) => [
        estilos.tarjeta,
        { borderColor: c.border, backgroundColor: pressed ? c.goldWash : c.cardBg },
      ]}
    >
      <Text style={[estilos.hora, { color: c.goldInk }]}>{hora}</Text>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={[estilos.tituloTarjeta, { color: c.textStrong }]} numberOfLines={2}>
          {oc.titulo}
        </Text>
        {donde ? (
          <View style={estilos.dondeFila}>
            {marca ? <LogoDeMarca marca={marca} size={16} decorativo /> : null}
            <Text style={[estilos.donde, { color: c.textSoft }]} numberOfLines={1}>
              {donde}
            </Text>
          </View>
        ) : null}
        <EtiquetaAsistencia oc={oc} />
      </View>
      <Icon name="chevron" size={16} color={c.chevron} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mes: { fontFamily: 'Fraunces_600SemiBold', fontSize: 24, letterSpacing: -0.4, lineHeight: 29 },
  anio: { fontFamily: 'Jost_500Medium', fontSize: LETRA.cuerpo },
  botonHoy: { minWidth: 64, paddingHorizontal: 12 },
  flecha: { width: 48, paddingHorizontal: 0 },
  grilla: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 4 },
  semana: { flexDirection: 'row' },
  inicial: { flex: 1, textAlign: 'center', fontFamily: 'Jost_700Bold', fontSize: LETRA.cuerpo, paddingVertical: 6 },
  celda: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', gap: 3 },
  circulo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  numero: { fontSize: 17 },
  punto: { width: 7, height: 7, borderRadius: 3.5 },
  leyenda: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  leyendaTexto: { fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo },
  tituloDelDia: { fontFamily: 'Jost_500Medium', fontSize: LETRA.titulo + 1, lineHeight: 26, marginTop: 4 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  hora: { fontFamily: 'Jost_700Bold', fontSize: 20, width: 62, fontVariant: ['tabular-nums'] },
  tituloTarjeta: { fontFamily: 'Jost_500Medium', fontSize: LETRA.titulo, lineHeight: 24 },
  dondeFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  donde: { flexShrink: 1, fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo, lineHeight: 22 },
});
