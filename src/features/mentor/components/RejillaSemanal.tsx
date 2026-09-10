import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import type { DiaAlumnoApi, ObligacionDiaApi } from '../api/mentorSchemas';

/**
 * La semana completa en una rejilla: un hábito por fila, un día por columna.
 *
 * Dos formas de la MISMA rejilla, según el ancho. No dos componentes ni dos verdades: los
 * mismos datos, las mismas marcas y las mismas etiquetas de accesibilidad, acomodados distinto.
 *
 * **Ancha (tablet, web):** título a la izquierda y los siete días a la derecha, como una tabla.
 *
 * **Compacta (móvil):** el título ocupa su propia línea y debajo van los siete días repartidos a
 * lo ancho. Antes acá no se dibujaba NADA, y el motivo era real: los siete días se llevan 266 px
 * fijos, así que en 360 px al título le quedaban 58 y "RITUAL TIERRA - AGUA - FUEGO (mediodía)"
 * era ilegible. Pero esconder la semana entera es una respuesta peor que reacomodarla — el
 * selector de día muestra UN día, y lo que el mentor necesita ver es el patrón: dónde están los
 * huecos. Apilado, cada día tiene ~46 px y el título la línea completa.
 *
 * No trae scroll propio: vive dentro del único scroll de la pantalla (AGENTS.md §2).
 */
export function RejillaSemanal({ dias }: { dias: DiaAlumnoApi[] }) {
  const { c, t } = useTheme();
  const { isTablet } = useResponsive();
  const apilada = !isTablet;

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

  /* En compacto los días se reparten el ancho (flex) en vez de medir 38 px fijos: con siete
     columnas rígidas, cualquier teléfono por debajo de 330 px útiles desbordaría. */
  const celdaDia = apilada ? estilos.celdaDiaFluida : estilos.celdaDia;

  /* Cada celda se nombra entera. Sin esto un lector de pantalla recorre "raya, raya, tilde" sin
     decir de qué hábito ni de qué día: la información está en la POSICIÓN, y la posición no se
     lee en voz alta. Vale para las dos formas, por eso vive acá y no dentro de cada una. */
  const celdasDe = (titulo: string) =>
    dias.map(dia => {
      const obligacion = porHabitoYFecha.get(`${titulo}|${dia.fecha}`);
      return (
        <View
          key={dia.fecha}
          accessible
          accessibilityLabel={`${titulo}, ${diaLargoDe(dia.fecha)}: ${estadoEnPalabras(obligacion)}`}
          style={celdaDia}
        >
          <Marca obligacion={obligacion} />
        </View>
      );
    });

  /* Cabecera: inicial del día y número. La inicial sola no alcanza —L y M se repiten— así que el
     número desambigua sin ocupar más de una columna estrecha. */
  const cabecera = dias.map(dia => (
    <View key={dia.fecha} style={celdaDia}>
      <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>{inicialDe(dia.fecha)}</Text>
      <Text style={[t.micro, { color: c.chevron, fontSize: 9.5 }]}>{numeroDe(dia.fecha)}</Text>
    </View>
  ));

  return (
    <View style={{ marginTop: 14 }}>
      <View style={estilos.fila}>
        {apilada ? null : <View style={estilos.celdaHabito} />}
        {cabecera}
      </View>

      {habitos.map(titulo =>
        apilada ? (
          <View key={titulo} style={[estilos.bloque, { borderTopWidth: 1, borderTopColor: c.border }]}>
            <Text style={[t.body, { color: c.text, fontSize: 12.5 }]} numberOfLines={2}>
              {titulo}
            </Text>
            <View style={estilos.fila}>{celdasDe(titulo)}</View>
          </View>
        ) : (
          <View key={titulo} style={[estilos.fila, { borderTopWidth: 1, borderTopColor: c.border }]}>
            <View style={estilos.celdaHabito}>
              <Text style={[t.body, { color: c.text, fontSize: 12.5 }]} numberOfLines={2}>
                {titulo}
              </Text>
            </View>
            {celdasDe(titulo)}
          </View>
        ),
      )}

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
  // Compacta: los siete se reparten el ancho disponible en vez de medir fijo.
  celdaDiaFluida: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', gap: 1 },
  bloque: { paddingTop: 8, paddingBottom: 2 },
  pendiente: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  itemLeyenda: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
