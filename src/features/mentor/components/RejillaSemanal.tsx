import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { DiaAlumnoApi, ObligacionDiaApi } from '../api/mentorSchemas';

/**
 * La semana completa en una rejilla: un hábito por fila, un día por columna.
 *
 * Solo se usa donde entra de verdad. En 320–360 px, siete columnas con títulos como
 * "RITUAL TIERRA - AGUA - FUEGO (mediodía)" quedan ilegibles, y por eso AGENTS.md y plan.md §10
 * piden un selector de día en su lugar. En tablet y web ancha sí hay lugar, y ver la semana de
 * un vistazo es justo lo que un mentor quiere: los huecos se leen mejor en la forma que en una
 * lista.
 *
 * No trae scroll propio: vive dentro del único scroll de la pantalla (AGENTS.md §2).
 */
export function RejillaSemanal({ dias }: { dias: DiaAlumnoApi[] }) {
  const { c, t } = useTheme();

  /**
   * Filas = hábitos distintos de la semana, en el orden en que aparecen. Se arma una sola vez:
   * pivotar en cada render sobre siete días es trabajo repetido para un resultado que no cambia.
   */
  const { habitos, porHabitoYFecha } = useMemo(() => {
    const vistos: string[] = [];
    const mapa = new Map<string, ObligacionDiaApi>();
    for (const dia of dias) {
      for (const o of dia.obligaciones) {
        if (!vistos.includes(o.titulo)) vistos.push(o.titulo);
        mapa.set(`${o.titulo}|${dia.fecha}`, o);
      }
    }
    return { habitos: vistos, porHabitoYFecha: mapa };
  }, [dias]);

  if (habitos.length === 0) {
    return null;
  }

  return (
    <View style={{ marginTop: 14 }}>
      {/* Cabecera: inicial del día y número. La inicial sola no alcanza —L y M se repiten— así
          que el número desambigua sin ocupar más de una columna estrecha. */}
      <View style={estilos.fila}>
        <View style={estilos.celdaHabito} />
        {dias.map(dia => (
          <View key={dia.fecha} style={estilos.celdaDia}>
            <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>{inicialDe(dia.fecha)}</Text>
            <Text style={[t.micro, { color: c.chevron, fontSize: 9.5 }]}>{numeroDe(dia.fecha)}</Text>
          </View>
        ))}
      </View>

      {habitos.map(titulo => (
        <View key={titulo} style={[estilos.fila, { borderTopWidth: 1, borderTopColor: c.border }]}>
          <View style={estilos.celdaHabito}>
            <Text style={[t.body, { color: c.text, fontSize: 12.5 }]} numberOfLines={2}>
              {titulo}
            </Text>
          </View>
          {dias.map(dia => {
            const obligacion = porHabitoYFecha.get(`${titulo}|${dia.fecha}`);
            return (
              /* Cada celda se nombra entera. Sin esto un lector de pantalla recorre
                 "raya, raya, tilde" sin decir de que habito ni de que dia: la informacion
                 esta en la POSICION, y la posicion no se lee en voz alta. */
              <View
                key={dia.fecha}
                accessible
                accessibilityLabel={`${titulo}, ${diaLargoDe(dia.fecha)}: ${estadoEnPalabras(obligacion)}`}
                style={estilos.celdaDia}
              >
                <Marca obligacion={obligacion} />
              </View>
            );
          })}
        </View>
      ))}

      {/* Leyenda obligatoria: el color no puede ser el único portador del significado
          (AGENTS.md §4). Quien no distingue verde de rojo tiene que poder leerla igual. */}
      <View style={estilos.leyenda}>
        <ItemLeyenda icono="checkCircle" color={c.success} texto="Cumplido" />
        <ItemLeyenda icono="clock" color={c.danger} texto="No cumplido" />
        <ItemLeyenda icono="circle" color={c.textSoft} texto="Pendiente" />
        <ItemLeyenda icono="minus" color={c.chevron} texto="No programado" />
      </View>
    </View>
  );
}

/** El estado de una celda, en palabras. Es lo que oye quien no ve la rejilla. */
function estadoEnPalabras(obligacion: ObligacionDiaApi | undefined): string {
  if (!obligacion) return 'no programado';
  switch (obligacion.estadoHabito) {
    case 'COMPLETADO':
      return obligacion.entrega === 'ENTREGADA' ? 'cumplido, evidencia entregada' : 'cumplido';
    case 'FALLIDO':
    case 'EXPIRADO':
      return obligacion.entrega === 'SIN_ENTREGA' ? 'no cumplido, evidencia sin entregar' : 'no cumplido';
    default:
      return 'pendiente';
  }
}

const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function diaLargoDe(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${DIAS_LARGOS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/** Una celda. `undefined` significa que ese día ese hábito no estaba programado. */
function Marca({ obligacion }: { obligacion: ObligacionDiaApi | undefined }) {
  const { c, t } = useTheme();

  if (!obligacion) {
    return <Text style={[t.micro, { color: c.chevron, fontSize: 13 }]}>—</Text>;
  }
  if (obligacion.estadoHabito === 'COMPLETADO') {
    return <Icon name="checkCircle" size={15} color={c.success} />;
  }
  if (obligacion.estadoHabito === 'FALLIDO' || obligacion.estadoHabito === 'EXPIRADO') {
    return <Icon name="clock" size={14} color={c.danger} />;
  }
  return <View style={[estilos.pendiente, { borderColor: c.textSoft }]} />;
}

function ItemLeyenda({ icono, color, texto }: { icono: string; color: string; texto: string }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.itemLeyenda}>
      {icono === 'circle' ? (
        <View style={[estilos.pendiente, { borderColor: color }]} />
      ) : icono === 'minus' ? (
        <Text style={[t.micro, { color, fontSize: 13 }]}>—</Text>
      ) : (
        <Icon name={icono as 'checkCircle' | 'clock'} size={13} color={color} />
      )}
      <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>{texto}</Text>
    </View>
  );
}

/* Se formatea con UTC a mano: las fechas llegan como YYYY-MM-DD en la zona del ALUMNO, y dejar
   que el dispositivo las interprete en su huso corre el día una casilla. */
const INICIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function inicialDe(iso: string): string {
  return INICIALES[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

function numeroDe(iso: string): string {
  return String(new Date(`${iso}T00:00:00Z`).getUTCDate());
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  // El hábito manda: se lleva el ancho que sobra y los días quedan en columnas parejas.
  celdaHabito: { flex: 1, paddingRight: 10, justifyContent: 'center' },
  celdaDia: { width: 38, alignItems: 'center', justifyContent: 'center', gap: 1 },
  pendiente: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  itemLeyenda: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
