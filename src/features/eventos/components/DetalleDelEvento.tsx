import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { BotonPeligro, BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import type { Asistencia, Ocurrencia } from '../types/eventos.types';
import { sePuedeEditarEnLaApp } from '../utils/formularioDeEvento';
import { linkParaUnirme, nombreDelLink } from '../utils/linkDelEvento';
import { duracionEnPalabras, fechaYHora } from '../utils/textosDeFecha';
import { BotonVolver, EtiquetaAsistencia, LETRA, Parrafo } from './piezas';

/**
 * El detalle de un evento (E-5): cuándo, dónde, «Unirme» si hay link, y «Voy» / «No voy». Para
 * ADMIN y ALCHEMIST, además, editar y cancelar (E-6).
 *
 * Una acción principal por pantalla: si todavía no respondió, «Voy»; si ya dijo que va y hay link,
 * «Unirme». Lo demás son botones con borde.
 */
export function DetalleDelEvento({
  oc,
  puedeGestionar,
  enviando,
  onVolver,
  onResponder,
  onEditar,
  onCancelar,
}: {
  oc: Ocurrencia;
  puedeGestionar: boolean;
  enviando: boolean;
  onVolver: () => void;
  onResponder: (respuesta: Exclude<Asistencia, null>) => void;
  onEditar: () => void;
  /** `todas` = el evento entero; si no, solo esta fecha (eventos que se repiten). */
  onCancelar: (todas: boolean) => void;
}) {
  const { c } = useTheme();
  const { evento } = oc;
  const link = linkParaUnirme(evento);
  const duracion = duracionEnPalabras(oc.duracionMinutos);
  const vas = oc.asistencia === 'GOING';
  const noVas = oc.asistencia === 'NOT_GOING';

  const unirme = async () => {
    if (!link) return;
    try {
      await Linking.openURL(link);
    } catch {
      Alert.alert('No se pudo abrir el link', 'Revisa que tengas internet e intenta de nuevo.');
    }
  };

  const confirmarCancelacion = (todas: boolean) => {
    Alert.alert(
      todas ? '¿Cancelar este evento?' : '¿Cancelar solo esta fecha?',
      todas
        ? 'Se borra para todos y ya no aparece en la lista. No se puede deshacer.'
        : 'Las otras fechas del evento siguen igual.',
      [
        { text: 'No, dejarlo', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => onCancelar(todas) },
      ],
    );
  };

  return (
    <View style={{ gap: 18 }}>
      <BotonVolver etiqueta="Volver a Eventos" onPress={onVolver} />

      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
          {oc.titulo}
        </Text>
        <Text style={[estilos.cuando, { color: c.goldInk }]}>{fechaYHora(oc.iniciaEn, evento.zona)}</Text>
        {duracion ? <Parrafo>Dura {duracion}.</Parrafo> : null}
        <EtiquetaAsistencia oc={oc} />
      </View>

      {evento.descripcion ? <Parrafo tono="fuerte">{evento.descripcion}</Parrafo> : null}

      {link ? (
        <View style={{ gap: 8 }}>
          <Parrafo>Es por {nombreDelLink(link)}.</Parrafo>
          {vas ? (
            <BotonPrincipal etiqueta="Unirme" icono="play" onPress={unirme} accessibilityLabel={`Unirme por ${nombreDelLink(link)}`} />
          ) : (
            <BotonSecundario etiqueta="Unirme" icono="play" onPress={unirme} accessibilityLabel={`Unirme por ${nombreDelLink(link)}`} />
          )}
        </View>
      ) : evento.tipoUbicacion === 'ADDRESS' && evento.valorUbicacion ? (
        <Parrafo tono="fuerte">Lugar: {evento.valorUbicacion}</Parrafo>
      ) : null}

      <View style={{ gap: 10 }}>
        <Text style={[estilos.subtitulo, { color: c.textStrong }]}>¿Vas a ir?</Text>
        {vas ? (
          <Parrafo tono="bien">Anotado: vas. Te avisamos antes de que empiece.</Parrafo>
        ) : noVas ? (
          <Parrafo>Anotado: no vas.</Parrafo>
        ) : null}
        <View style={estilos.fila}>
          {vas ? (
            <BotonSecundario etiqueta="Voy" icono="check" deshabilitado estilo={estilos.mitad} onPress={() => {}} />
          ) : (
            <BotonPrincipal etiqueta="Voy" icono="check" cargando={enviando} estilo={estilos.mitad} onPress={() => onResponder('GOING')} />
          )}
          <BotonSecundario
            etiqueta="No voy"
            deshabilitado={noVas || enviando}
            estilo={estilos.mitad}
            onPress={() => onResponder('NOT_GOING')}
          />
        </View>
      </View>

      {puedeGestionar ? (
        <View style={{ gap: 10, marginTop: 8 }}>
          <Text style={[estilos.subtitulo, { color: c.textStrong }]}>Administrar</Text>
          {sePuedeEditarEnLaApp(evento) ? (
            <BotonSecundario etiqueta="Editar evento" onPress={onEditar} />
          ) : (
            <Parrafo>Este evento se repite o es para un grupo: se edita desde el panel de administración.</Parrafo>
          )}
          {evento.recurrente ? (
            <BotonPeligro etiqueta="Cancelar solo esta fecha" onPress={() => confirmarCancelacion(false)} />
          ) : null}
          <BotonPeligro
            etiqueta={evento.recurrente ? 'Cancelar todas las fechas' : 'Cancelar evento'}
            onPress={() => confirmarCancelacion(true)}
          />
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: LETRA.grande, lineHeight: 28 },
  cuando: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 23 },
  subtitulo: { fontFamily: 'Jost_500Medium', fontSize: LETRA.titulo, lineHeight: 24 },
  fila: { flexDirection: 'row', gap: 10 },
  mitad: { flex: 1 },
});
