import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CargandoLectura } from '../../semaforo/components/EstadoDeLectura';
import { useBandejaDeTickets } from '../../tickets/hooks/useBandejaDeTickets';
import type { WireTicketMentor } from '../../tickets/types/tickets.types';
import { HojaDeTexto } from '../components/HojaDeTexto';
import { LecturaFallida } from '../components/LecturaFallida';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { useAtenderConsultas } from '../hooks/useAtenderConsultas';
import { useQuienesPreguntan } from '../hooks/useQuienesPreguntan';
import { esDeLosAprendicesDe, haceCuantosDias, quienPregunta, type MentorDeLasConsultas } from '../utils/consultasDelLider';

type Pestana = 'sinResponder' | 'respondidas';

/**
 * Las consultas de los mentores para el líder (spec 056 historia 6, FR-028 a FR-030): «Sin responder» y «Respondidas». Cada consulta dice quién pregunta, a qué
 * mentor le toca y hace cuántos días. Las que esperan respuesta tienen dos botones: **«Recordar al mentor»** (el servidor le manda la consulta a su chat con el
 * líder) y **«Responder yo»** (el líder la responde: el aprendiz recibe la respuesta con su nombre, el mentor la ve en su bandeja y la consulta pasa a
 * «Respondidas»). Las respondidas dicen quién respondió.
 *
 * El listado trae a todos los de la plataforma, primero lo que lleva más tiempo esperando; las cifras de las pestañas son de lo ya descargado (con «+» si hay más).
 *
 * Desde la ficha de un mentor (`mentor`) se abre ya filtrada a las consultas de sus aprendices, con «Ver las de todos» para quitar el filtro. El servidor no filtra por
 * mentor: se reconoce a quien pregunta por su grupo (`esDeLosAprendicesDe`). Lo que no se pudo ubicar no se esconde: se dice cuántas consultas faltan por saber de quién son.
 */
export function ConsultasDelLiderScreen({ onVolver, mentor }: { onVolver: () => void; mentor?: MentorDeLasConsultas }) {
  const bandeja = useBandejaDeTickets(true);
  const { conocidos: quienes, buscando } = useQuienesPreguntan(useMemo(() => bandeja.tickets.map(t => t.traineeProfileId), [bandeja.tickets]));
  const { ocupadas, recordar, responder } = useAtenderConsultas();
  const [pestana, setPestana] = useState<Pestana>('sinResponder');
  const [respondiendo, setRespondiendo] = useState<WireTicketMentor | null>(null);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  /* El filtro viene de quien abrió la pantalla; «Ver las de todos» lo quita aquí. */
  const [filtrando, setFiltrando] = useState(true);
  const delMentor = mentor && filtrando ? mentor : null;

  const { c, t: tipos } = useTheme();
  const quien = (t: WireTicketMentor) => quienes.get(t.traineeProfileId) ?? null;
  const tickets = delMentor ? bandeja.tickets.filter(t => esDeLosAprendicesDe(quien(t), delMentor)) : bandeja.tickets;
  const sinUbicar = delMentor && !buscando ? bandeja.tickets.filter(t => !quienes.has(t.traineeProfileId)).length : 0;
  const abiertas = tickets.filter(t => t.status === 'OPEN');
  const respondidas = tickets.filter(t => t.status === 'ANSWERED');
  const visibles = pestana === 'sinResponder' ? abiertas : respondidas;
  const mas = bandeja.hayMas ? '+' : '';

  const alRecordar = async (t: WireTicketMentor) => {
    const salio = await recordar(t.id);
    if (salio) {
      setConfirmacion(`Le recordaste a ${quien(t)?.mentorNombre?.trim() || 'su mentor'}.`);
      tacto.logro();
    }
  };

  const alResponder = async (texto: string) => {
    if (!respondiendo) return false;
    const salio = await responder(respondiendo.id, texto);
    if (salio) {
      setRespondiendo(null);
      setConfirmacion('Respondiste la consulta.');
      tacto.logro();
      bandeja.recargar();
    }
    return salio;
  };

  return (
    <>
      <MarcoDelLider titulo="Consultas" onVolver={onVolver}>
        {confirmacion ? <ConfirmacionEnLinea texto={confirmacion} onTerminar={() => setConfirmacion(null)} /> : null}
        {bandeja.cargando ? (
          <CargandoLectura texto="Cargando las consultas…" />
        ) : bandeja.fallo ? (
          <LecturaFallida fallo={bandeja.fallo} detalle={bandeja.detalle} que="las consultas" onReintentar={bandeja.recargar} />
        ) : (
          <>
            {delMentor ? (
              <View style={estilos.filtro}>
                <Text accessibilityRole="header" style={[tipos.body, { color: c.textStrong, fontFamily: fuentes.seminegrita, fontSize: 16, flexShrink: 1 }]}>
                  {`Consultas de ${delMentor.nombre}`}
                </Text>
                <BotonSecundario etiqueta="Ver las de todos" onPress={() => setFiltrando(false)} accessibilityLabel="Ver las consultas de todos los mentores" estilo={estilos.quitarFiltro} />
              </View>
            ) : null}
            <ControlSegmentado<Pestana>
              opciones={[
                { valor: 'sinResponder', etiqueta: `Sin responder · ${abiertas.length}${mas}` },
                { valor: 'respondidas', etiqueta: `Respondidas · ${respondidas.length}${mas}` },
              ]}
              valor={pestana}
              onCambiar={setPestana}
              rol="tab"
              achicarTexto
              accessibilityLabel="Filtrar las consultas"
            />
            {delMentor && buscando ? <Linea>{`Buscando las consultas de ${delMentor.nombre}…`}</Linea> : null}
            {visibles.length === 0 && !(delMentor && buscando) ? <Linea>{lineaSinConsultas(pestana, delMentor)}</Linea> : null}
            {sinUbicar > 0 ? <Linea>{`No se pudo saber de quién son ${sinUbicar} ${sinUbicar === 1 ? 'consulta más' : 'consultas más'}.`}</Linea> : null}
            <View style={estilos.lista}>
              {visibles.map(t => (
                <Consulta
                  key={t.id}
                  ticket={t}
                  quien={quien(t)}
                  ocupada={ocupadas.has(t.id)}
                  onRecordar={() => void alRecordar(t)}
                  onResponder={() => setRespondiendo(t)}
                />
              ))}
            </View>
            {bandeja.hayMas ? <BotonSecundario etiqueta={bandeja.cargandoMas ? 'Cargando…' : 'Ver más'} cargando={bandeja.cargandoMas} onPress={bandeja.verMas} accessibilityLabel="Ver más consultas" /> : null}
          </>
        )}
      </MarcoDelLider>
      <HojaDeTexto
        visible={respondiendo !== null}
        alCerrar={() => setRespondiendo(null)}
        titulo="Responder la consulta"
        subtitulo={respondiendo ? quienPregunta(quien(respondiendo)?.nombre ?? null, quien(respondiendo)?.mentorNombre ?? null) : undefined}
        etiquetaDelCampo="Tu respuesta"
        etiquetaDelBoton="Responder"
        enviando={respondiendo ? ocupadas.has(respondiendo.id) : false}
        onEnviar={alResponder}
        largoMaximo={2000}
      />
    </>
  );
}

/** Lo que dice una pestaña sin consultas: de todos, o de ese mentor. */
function lineaSinConsultas(pestana: Pestana, mentor: MentorDeLasConsultas | null): string {
  if (mentor) return pestana === 'sinResponder' ? `${mentor.nombre} no tiene consultas sin responder.` : `${mentor.nombre} todavía no tiene consultas respondidas.`;
  return pestana === 'sinResponder' ? 'No hay consultas sin responder.' : 'Todavía no hay consultas respondidas.';
}

function Consulta({
  ticket,
  quien,
  ocupada,
  onRecordar,
  onResponder,
}: {
  ticket: WireTicketMentor;
  quien: { nombre: string; mentorNombre: string | null } | null;
  ocupada: boolean;
  onRecordar: () => void;
  onResponder: () => void;
}) {
  const { c, t } = useTheme();
  const abierta = ticket.status === 'OPEN';
  const hace = haceCuantosDias(ticket.createdAt);
  const linea = quienPregunta(quien?.nombre ?? null, quien?.mentorNombre ?? null);
  const respondio = ticket.respondidoPor?.nombre?.trim();

  return (
    <View accessible={false} style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={estilos.cabecera}>
        <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.seminegrita, fontSize: 16, flex: 1 }]} numberOfLines={2}>
          {ticket.blockDescription}
        </Text>
        {hace ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{hace}</Text> : null}
      </View>
      <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{linea}</Text>
      {abierta ? (
        <View style={estilos.botones}>
          <BotonSecundario etiqueta="Recordar al mentor" onPress={onRecordar} cargando={ocupada} accessibilityLabel={`Recordar al mentor la consulta de ${quien?.nombre ?? 'un aprendiz'}`} estilo={estilos.boton} />
          <BotonPrincipal etiqueta="Responder yo" onPress={onResponder} deshabilitado={ocupada} accessibilityLabel={`Responder yo la consulta de ${quien?.nombre ?? 'un aprendiz'}`} estilo={estilos.boton} />
        </View>
      ) : (
        <>
          {ticket.mentorAnswer ? <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 22 }]}>{ticket.mentorAnswer}</Text> : null}
          <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{respondio ? `Respondió ${respondio}` : 'Respondida'}</Text>
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  filtro: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  quitarFiltro: { flexGrow: 0 },
  lista: { gap: 10 },
  tarjeta: { gap: 8, borderWidth: 1, borderRadius: 16, padding: 14 },
  cabecera: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boton: { flexGrow: 1, flexBasis: 150 },
});
