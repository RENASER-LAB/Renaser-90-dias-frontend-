import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { Palette } from '../../../theme/tokens';
import { fechaLarga, primeraEnMayuscula } from '../../semaforo/utils/lecturaDelSemaforo';
import type {
  AccionDeLaPersona,
  DiaDeLaPersona as DiaDeLaPersonaDatos,
  ObligacionDeLaPersona,
} from '../types/cumplimientoDelLider.types';
import {
  accionEnPalabras,
  contadorDelDia,
  dichoDeLaObligacion,
  entregaEnPalabras,
  estadoDeLaObligacionEnPalabras,
  motivoDelDiaEnPalabras,
} from '../utils/palabrasDeLaPersona';

/**
 * Un día de la semana de la persona (spec 005, FR-009): una cabecera que se toca —la fecha y, debajo, cuántos
 * hábitos cumplió o por qué no hay nada que medir— y, abierto, cada hábito que tenía ESE día con su estado en
 * palabras y con forma, y sus evidencias.
 *
 * - **El estado nunca va solo en color**: cada hábito lleva una marca con forma (✓ en círculo, reloj, ✕, círculo
 *   vacío) y su palabra («Cumplido», «Venció»…).
 * - **La falta de datos no es incumplimiento**: un día en pausa, antes del Día 1 o sin hábitos dice su motivo
 *   en palabras, sin marcas de fallo.
 * - Abrir y cerrar un día es instantáneo, sin animación: se hace varias veces por visita y lo que importa es
 *   leer.
 */
export function DiaDeLaPersona({
  dia,
  abierto,
  alAlternar,
}: {
  dia: DiaDeLaPersonaDatos;
  abierto: boolean;
  alAlternar: () => void;
}) {
  const { c, t } = useTheme();
  const fecha = primeraEnMayuscula(fechaLarga(dia.fecha));
  const resumen = resumenDelDia(dia);

  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Presionable
        onPress={alAlternar}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={`${fecha}. ${resumen}`}
        accessibilityHint={abierto ? 'Toca para plegar el día' : 'Toca para ver los hábitos del día'}
        style={estilos.cabecera}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[t.cardTitle, { color: c.textStrong }]}>{fecha}</Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22, marginTop: 2 }]}>{resumen}</Text>
        </View>
        {/* El chevron apunta abajo cerrado y arriba abierto: la forma dice el estado. */}
        <View style={{ transform: [{ rotate: abierto ? '270deg' : '90deg' }] }}>
          <Icon name="chevron" size={18} color={c.chevron} />
        </View>
      </Presionable>

      {abierto ? <CuerpoDelDia dia={dia} /> : null}
    </View>
  );
}

/** La línea de debajo de la fecha: lo que se cumplió, o por qué no hay nada que medir. */
function resumenDelDia(dia: DiaDeLaPersonaDatos): string {
  const partes: string[] = [];
  const contador = contadorDelDia(dia);
  const motivo = motivoDelDiaEnPalabras(dia.motivo);
  if (contador) partes.push(contador);
  if (motivo) partes.push(motivo);
  if (partes.length === 0) partes.push(dia.acciones.length > 0 ? 'Solo acciones de los objetivos' : 'Sin hábitos programados');
  if (dia.diaDePrograma !== null) partes.push(`Día ${dia.diaDePrograma}`);
  return partes.join(' · ');
}

function CuerpoDelDia({ dia }: { dia: DiaDeLaPersonaDatos }) {
  const { c, t } = useTheme();
  const vacio = dia.obligaciones.length === 0 && dia.acciones.length === 0;
  const motivo = motivoDelDiaEnPalabras(dia.motivo);

  return (
    <View style={[estilos.cuerpo, { borderTopColor: c.divider }]}>
      {vacio ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23, paddingVertical: 12 }]}>
          {motivo ? `${motivo}. No hay nada que medir este día.` : 'Sin hábitos programados este día.'}
        </Text>
      ) : null}
      {dia.obligaciones.map((obligacion, i) => (
        <FilaDeObligacion key={obligacion.registroId} obligacion={obligacion} primera={i === 0} />
      ))}
      {dia.acciones.length > 0 ? (
        <View style={{ marginTop: dia.obligaciones.length > 0 ? 8 : 0 }}>
          <Text
            accessibilityRole="header"
            style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_700Bold', paddingTop: 12 }]}
          >
            Acciones de los objetivos
          </Text>
          {dia.acciones.map((accion, i) => (
            <FilaDeAccion key={accion.id} accion={accion} primera={i === 0} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FilaDeObligacion({ obligacion, primera }: { obligacion: ObligacionDeLaPersona; primera: boolean }) {
  const { c, t } = useTheme();
  const estado = estadoDeLaObligacionEnPalabras(obligacion);
  const entrega = entregaEnPalabras(obligacion);

  return (
    <View style={[estilos.fila, { borderTopColor: c.divider, borderTopWidth: primera ? 0 : 1 }]}>
      <MarcaDelEstado estado={obligacion.estado} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View accessible accessibilityLabel={dichoDeLaObligacion(obligacion)} style={{ gap: 2 }}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: 'Jost_500Medium' }]}>
            {obligacion.titulo}
          </Text>
          <Text style={[t.body, { color: colorDelEstado(obligacion.estado, c), fontSize: 16, lineHeight: 22 }]}>{estado}</Text>
          {entrega ? <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{entrega}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function FilaDeAccion({ accion, primera }: { accion: AccionDeLaPersona; primera: boolean }) {
  const { c, t } = useTheme();
  const estado = accionEnPalabras(accion);
  const cumplida = estado === 'Cumplida';

  return (
    <View style={[estilos.fila, { borderTopColor: c.divider, borderTopWidth: primera ? 0 : 1 }]}>
      <MarcaDelEstado estado={cumplida ? 'COMPLETADO' : estado === 'No cumplida' ? 'FALLIDO' : 'PENDIENTE'} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View accessible accessibilityLabel={estado ? `${accion.titulo}. ${estado}.` : `${accion.titulo}.`} style={{ gap: 2 }}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: 'Jost_500Medium' }]}>
            {accion.titulo}
          </Text>
          {estado ? (
            <Text style={[t.body, { color: cumplida ? c.success : c.textSoft, fontSize: 16, lineHeight: 22 }]}>{estado}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function colorDelEstado(estado: string, c: Palette): string {
  if (estado === 'COMPLETADO') return c.success;
  if (estado === 'FALLIDO' || estado === 'EXPIRADO') return c.danger;
  return c.textSoft;
}

/**
 * La marca con forma de un estado (RL-30: el color no va solo): ✓ en círculo, ✕, reloj, o un círculo vacío para
 * lo que está por hacerse. Un estado que no se entiende lleva un guion.
 */
function MarcaDelEstado({ estado }: { estado: string }) {
  const { c } = useTheme();
  return (
    <View style={estilos.marca} accessible={false} importantForAccessibility="no-hide-descendants">
      {estado === 'COMPLETADO' ? (
        <Icon name="checkCircle" size={20} color={c.success} />
      ) : estado === 'FALLIDO' ? (
        <Icon name="close" size={18} color={c.danger} />
      ) : estado === 'EXPIRADO' ? (
        <Icon name="clock" size={18} color={c.danger} />
      ) : estado === 'PENDIENTE' || estado === 'EN_CURSO' ? (
        <View style={[estilos.vacio, { borderColor: c.textSoft }]} />
      ) : (
        <Text style={{ color: c.chevron, fontSize: 18 }}>—</Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  /* 56 px como mínimo: se toca con el pulgar sin apuntar (AGENTS.md §4). */
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10 },
  cuerpo: { borderTopWidth: 1, paddingHorizontal: 14, paddingBottom: 6 },
  fila: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  marca: { width: 24, height: 24, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  vacio: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.75 },
});
