import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tiempoRelativo } from '../../community/utils/tiempoRelativo';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { useBandejaDeTickets } from '../hooks/useBandejaDeTickets';
import type { WireTicketMentor } from '../types/tickets.types';
import { etiquetaDeEstadoDeTicket } from '../utils/bandeja';

/**
 * La bandeja de tickets de mentoría: qué bloqueos hay abiertos en toda la plataforma.
 *
 * <blockquote><b>Para qué existe.</b> El LÍDER DE MENTORES no tenía ni una pantalla propia. Tiene
 * el permiso <code>VIEW_ALL_MENTOR_TICKETS</code> desde el SDD 002 y el endpoint
 * <code>GET /api/v1/admin/tickets</code> construido y probado, sin un solo consumidor desde que
 * el apartado se retiró de la app el 2026-09-07.</blockquote>
 *
 * **Es de solo lectura, y se dice.** Responder un ticket es
 * `POST /api/v1/tickets/{id}/answer`, que exige ser el mentor de esa persona — no el líder. Una
 * pantalla que dejara escribir acá terminaría en un 403 después de redactar la respuesta.
 *
 * **No dice de quién es cada ticket.** La respuesta trae `traineeProfileId` y ningún nombre.
 * Mostrar el UUID como si fuera una persona, o resolverlo con una consulta que este rol quizá no
 * tenga permitida, sería peor que decir que el listado no lo trae.
 *
 * Un scroll único y `map` en vez de `FlatList`, como el resto de la app (AGENTS.md §2): la
 * bandeja se pagina con «Ver más», que es lo que el cursor del backend soporta.
 */
export function BandejaTicketsScreen({ onVolver }: { onVolver: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const bandeja = useBandejaDeTickets(true);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const { resumen } = bandeja;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          onPress={onVolver}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
            VOLVER
          </Text>
        </Pressable>
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={1}>
            Tickets de mentoría
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5 }]} numberOfLines={1}>
            Los bloqueos abiertos en toda la plataforma
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 14,
        }}
      >
        {/* Las cifras son de lo DESCARGADO, y lo dice. Con "Ver más" sin tocar, decir "3 sin
            responder" a secas haría creer que esos son todos los que hay. */}
        {!bandeja.cargando && !bandeja.fallo ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 19 }]}>
            {resumen.total === 0
              ? 'No hay tickets de mentoría.'
              : `${resumen.sinResponder} sin responder · ${resumen.respondidos} respondidos` +
                (bandeja.hayMas ? `, de los ${resumen.total} cargados hasta acá.` : '.')}
          </Text>
        ) : null}

        {bandeja.cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 20 }} /> : null}

        {bandeja.fallo ? <Fallo bandeja={bandeja} /> : null}

        {!bandeja.cargando && !bandeja.fallo && resumen.total > 0 ? (
          <>
            <MicroLabel>Bandeja</MicroLabel>
            <Text style={[t.body, { color: c.micro, fontSize: 12, lineHeight: 17 }]}>
              Primero lo que sigue esperando respuesta, empezando por lo que lleva más tiempo. El
              listado no trae el nombre de quien abrió cada ticket, y responder sigue siendo del
              mentor de esa persona.
            </Text>
            {bandeja.tickets.map(ticket => (
              <FilaDeTicket key={ticket.id} ticket={ticket} />
            ))}
          </>
        ) : null}

        {bandeja.hayMas && !bandeja.cargando && !bandeja.fallo ? (
          <Pressable
            onPress={bandeja.verMas}
            disabled={bandeja.cargandoMas}
            accessibilityRole="button"
            accessibilityLabel="Ver más tickets"
            style={[estilos.boton, { borderColor: c.border }]}
          >
            <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '500' }]}>
              {bandeja.cargandoMas ? 'Cargando…' : 'Ver más'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Un ticket. Se muestra lo que llega y nada más; los campos vacíos no se rellenan. */
function FilaDeTicket({ ticket }: { ticket: WireTicketMentor }) {
  const { c, t } = useTheme();
  const espera = ticket.status === 'OPEN';

  return (
    <View
      style={[
        estilos.tarjeta,
        { backgroundColor: c.cardBg, borderColor: espera ? c.borderStrong : c.border },
      ]}
    >
      <View style={estilos.cabecera}>
        <View
          style={[
            estilos.capsula,
            espera
              ? { backgroundColor: c.goldWash, borderColor: c.gold }
              : { backgroundColor: 'transparent', borderColor: c.border },
          ]}
        >
          <Text
            style={[
              t.micro,
              { color: espera ? c.goldInk : c.textSoft, fontFamily: 'Jost_500Medium', fontSize: 10.5 },
            ]}
          >
            {etiquetaDeEstadoDeTicket(ticket.status).toUpperCase()}
          </Text>
        </View>
        <Text style={[t.body, { color: c.micro, fontSize: 12 }]}>{tiempoRelativo(ticket.createdAt)}</Text>
      </View>

      <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, marginTop: 10, lineHeight: 21 }]}>
        {ticket.blockDescription}
      </Text>

      {ticket.attemptedSolutions ? (
        <Bloque etiqueta="Ya intentó" texto={ticket.attemptedSolutions} />
      ) : null}
      {ticket.smartGoalImpact ? (
        <Bloque etiqueta="Cómo le frena la meta" texto={ticket.smartGoalImpact} />
      ) : null}
      {ticket.mentorAnswer ? (
        <Bloque
          etiqueta={
            ticket.answeredAt ? `Respuesta del mentor · ${tiempoRelativo(ticket.answeredAt)}` : 'Respuesta del mentor'
          }
          texto={ticket.mentorAnswer}
        />
      ) : null}
    </View>
  );
}

function Bloque({ etiqueta, texto }: { etiqueta: string; texto: string }) {
  const { c, t } = useTheme();
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[t.micro, { color: c.micro, fontSize: 10.5 }]}>{etiqueta.toUpperCase()}</Text>
      <Text style={[t.body, { color: c.textSoft, fontSize: 13.5, marginTop: 3, lineHeight: 20 }]}>
        {texto}
      </Text>
    </View>
  );
}

/**
 * Por qué no hay bandeja. Cada motivo se dice distinto porque cada uno se arregla distinto, y
 * solo los que se arreglan reintentando ofrecen el botón.
 */
function Fallo({ bandeja }: { bandeja: ReturnType<typeof useBandejaDeTickets> }) {
  const { c, t } = useTheme();
  const sinPermiso = bandeja.fallo === 'sin_permiso';

  return (
    <View style={estilos.caja}>
      <Icon name={sinPermiso ? 'lock' : 'info'} size={26} color={c.chevron} />
      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 15, marginTop: 10, textAlign: 'center' }]}>
        {sinPermiso
          ? 'Tu cuenta no puede ver esta bandeja'
          : bandeja.fallo === 'sin_red'
            ? 'No pudimos conectar'
            : 'No pudimos cargar la bandeja'}
      </Text>
      <Text
        style={[t.body, { color: c.textSoft, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 }]}
      >
        {sinPermiso
          ? 'Ver todos los tickets de mentoría es de líderes de mentores, administradores y alquimistas. Si crees que es un error, escríbelo por soporte.'
          : bandeja.fallo === 'sin_red'
            ? 'Revisa tu conexión y vuelve a intentarlo.'
            : 'Vuelve a intentarlo. Si sigue pasando, avísanos por soporte.'}
      </Text>
      {/* El detalle técnico solo cuando aporta: dice qué cambió el backend y ahorra media hora a
          quien mantiene la app. Con un 403 no aporta nada. */}
      {bandeja.detalle && bandeja.fallo === 'error' ? (
        <Text style={[t.micro, { color: c.chevron, fontSize: 10.5, textAlign: 'center', marginTop: 8 }]}>
          {bandeja.detalle}
        </Text>
      ) : null}
      {!sinPermiso ? (
        <View style={{ marginTop: 16, width: '100%' }}>
          <GoldButton label="REINTENTAR" variant="outline" onPress={bandeja.recargar} />
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 10 },
  /* 48 px de alto: el mínimo cómodo para una sola mano (AGENTS.md §4). */
  volver: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, width: '100%' },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  capsula: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  boton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  caja: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, paddingHorizontal: 18 },
});
