import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { BotonPeligro, BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { LogoDeMarca } from '../../../components/LogoDeMarca';
import { useTheme } from '../../../theme/ThemeContext';
import { useAhora } from '../hooks/useAhora';
import { useAsistenciaDelEvento } from '../hooks/useAsistenciaDelEvento';
import type { Asistencia, Ocurrencia } from '../types/eventos.types';
import { sePuedeEditarEnLaApp } from '../utils/formularioDeEvento';
import { linkParaUnirme, marcaDelLink, nombreDelLink } from '../utils/linkDelEvento';
import { duracionEnPalabras, fechaYHora } from '../utils/textosDeFecha';
import { HojaQuienRespondio } from './asistencia/HojaQuienRespondio';
import { TarjetaDeAsistencia } from './asistencia/TarjetaDeAsistencia';
import { BotonVolver, EtiquetaAsistencia, LETRA, Parrafo } from './piezas';

/**
 * El detalle de un evento (E-5): cuándo, dónde, «Unirme» si hay link, y «Voy» / «No voy». Para
 * ADMIN y ALCHEMIST, además, editar y cancelar (E-6).
 *
 * Una acción principal por pantalla: si todavía no respondió, «Voy»; si ya dijo que va y hay link,
 * «Unirme». Lo demás son botones con borde.
 *
 * **Asistencia (D-256, 2026-10-06).** Para quien creó el evento, el Admin, el Alquimista y el Líder de
 * mentores (`verAsistencia`), la tarjeta «Asistencia» con quién respondió y «Pasar lista». Si el
 * servidor no la entrega (backend viejo, 404; sin permiso, 403), no aparece.
 */
export function DetalleDelEvento({
  oc,
  puedeGestionar,
  verAsistencia = false,
  enviando,
  onVolver,
  onPasarLista,
  onResponder,
  onEditar,
  onCancelar,
}: {
  oc: Ocurrencia;
  puedeGestionar: boolean;
  /** Quien creó el evento, Admin, Alquimista o Líder de mentores (`puedeVerAsistencia`). */
  verAsistencia?: boolean;
  enviando: boolean;
  onVolver: () => void;
  onPasarLista?: () => void;
  onResponder: (respuesta: Exclude<Asistencia, null>) => void;
  onEditar: () => void;
  /** `todas` = el evento entero; si no, solo esta fecha (eventos que se repiten). */
  onCancelar: (todas: boolean) => void;
}) {
  const { c } = useTheme();
  const { evento } = oc;
  const link = linkParaUnirme(evento);
  const marca = link ? marcaDelLink(link) : null;
  const duracion = duracionEnPalabras(oc.duracionMinutos);
  const vas = oc.asistencia === 'GOING';
  const noVas = oc.asistencia === 'NOT_GOING';
  const ahora = useAhora();
  const { lista } = useAsistenciaDelEvento(evento.id, oc.inicioOcurrencia, verAsistencia);
  const [hojaAbierta, setHojaAbierta] = useState(false);

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
          <View style={estilos.porFila}>
            {marca ? <LogoDeMarca marca={marca} size={20} decorativo /> : null}
            <Parrafo>Es por {nombreDelLink(link)}.</Parrafo>
          </View>
          {vas ? (
            <BotonPrincipal etiqueta="Unirme" icono="play" onPress={unirme} accessibilityLabel={`Unirme por ${nombreDelLink(link)}`} />
          ) : (
            <BotonSecundario etiqueta="Unirme" icono="play" onPress={unirme} accessibilityLabel={`Unirme por ${nombreDelLink(link)}`} />
          )}
        </View>
      ) : evento.tipoUbicacion === 'ADDRESS' && evento.valorUbicacion ? (
        <Parrafo tono="fuerte">Lugar: {evento.valorUbicacion}</Parrafo>
      ) : null}

      {lista ? (
        <TarjetaDeAsistencia
          lista={lista}
          zona={evento.zona}
          ahoraMs={ahora}
          onVerRespuestas={() => setHojaAbierta(true)}
          onPasarLista={() => onPasarLista?.()}
        />
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
            <BotonPrincipal etiqueta="Voy" cargando={enviando} estilo={estilos.mitad} onPress={() => onResponder('GOING')} />
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

      {lista ? (
        <HojaQuienRespondio
          visible={hojaAbierta}
          alCerrar={() => setHojaAbierta(false)}
          eventoId={evento.id}
          inicioOcurrencia={oc.inicioOcurrencia}
          titulo={oc.titulo}
          iniciaEn={oc.iniciaEn}
          zona={evento.zona}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: LETRA.grande, lineHeight: 28 },
  cuando: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 23 },
  subtitulo: { fontFamily: 'Jost_500Medium', fontSize: LETRA.titulo, lineHeight: 24 },
  fila: { flexDirection: 'row', gap: 10 },
  porFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mitad: { flex: 1 },
});
