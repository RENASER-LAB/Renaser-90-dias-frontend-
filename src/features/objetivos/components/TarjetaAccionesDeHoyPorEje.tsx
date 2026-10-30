import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { BotonPrincipal } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useMinutoActual } from '../../../hooks/useMinutoActual';
import { useTheme } from '../../../theme/ThemeContext';
import { fechaLocal } from '../../habits/notificaciones/utils/alarmasPorDia';
import { horaLocal } from '../../training/utils/tarjetaDelHabito';
import { minutosDeAhora } from '../../training/utils/listaDelDia';
import { useAccionesDeHoy } from '../hooks/useAccionesDeHoy';
import type { EjeObjetivo } from '../types/objetivos.types';
import {
  etiquetaDeLaFila,
  fraseDeLaFila,
  filasPorEje,
  horaCortaDeLaAccion,
  subtituloDelDia,
  textoDelAvance,
  textoDelEstado,
  type EstadoDeLaAccion,
  type FilaDelEje,
} from '../utils/accionesDeHoy';
import { iconoDelEje } from '../utils/iconoDelEje';

/**
 * «Tus acciones de hoy» (spec 016, opción B «Por eje»): lo que ocupa el lugar del arco «Día 20 de 90» arriba de Plan.
 *
 * Una fila por eje que tenga acciones hoy —en el orden de las prioridades, el principal primero— con su ícono, «n de m», un
 * símbolo por acción y la que sigue («Sigue: X · 16:00») o la que se pasó («Se te pasó: X»). Tocar una fila abre una hoja
 * con las acciones de ese eje y «Registrar en Training», que lleva a Training, a esa acción.
 *
 * **Plan solo muestra.** Registrar sigue siendo en Training (spec 014): el botón no sube nada, navega con `abrirAccionId`.
 *
 * Los símbolos tienen forma, no solo color: ✓ cumplida (`checkCircle`), círculo vacío pendiente, reloj rojo «se te pasó la
 * hora» y candado si espera a la verde por Pareto (`utils/accionesDeHoy.ts`).
 *
 * **Movimiento** (`emil-design-eng`, `animate-expo`): ninguno propio. Es lo primero de Plan y se lee en cada visita; la fila
 * responde al dedo con `Presionable` (escala 0,97 en 120 ms, que con «reducir movimiento» no se anima) y la hoja es la
 * `HojaDesdeAbajo` de la app, que ya respeta «reducir movimiento».
 *
 * Lee `GET /rocks/today` una vez cada vez que Plan vuelve al foco (`useAccionesDeHoy`), la misma lectura que Hoy y Training
 * ya hacen. No toca nada del resto de Plan.
 */
export function TarjetaAccionesDeHoyPorEje({
  diaPrograma,
  ejesEnOrden,
}: {
  /** `diaPrograma` de `GET /home`, o `null` si no se sabe (la tarjeta no inventa el día). */
  diaPrograma: number | null;
  /** Los tres ejes en el orden de las prioridades de Plan: el principal primero (`conPrincipalPrimero`). */
  ejesEnOrden: readonly EjeObjetivo[];
}) {
  const { c, t } = useTheme();
  const { height } = useWindowDimensions();
  const navigation = useNavigation();
  const ahora = useMinutoActual();
  const { rocas, fallo, recargar } = useAccionesDeHoy();

  const filas = useMemo(
    () => (rocas ? filasPorEje(rocas, ejesEnOrden, minutosDeAhora(ahora.getTime())) : []),
    [rocas, ejesEnOrden, ahora],
  );
  const cumplidas = filas.reduce((suma, f) => suma + f.cumplidas, 0);
  const total = filas.reduce((suma, f) => suma + f.total, 0);

  /* La fecha es la de la acción (la zona de la persona la pone el servidor); sin acciones, la del teléfono. */
  const fecha = rocas?.[0]?.fecha ?? fechaLocal(ahora);
  const subtitulo = subtituloDelDia(fecha, diaPrograma);

  const [ejeAbierto, setEjeAbierto] = useState<EjeObjetivo | null>(null);
  const fila = filas.find(f => f.eje === ejeAbierto) ?? null;
  /* La hoja se queda con lo último que mostró mientras baja; navegar espera a que se haya ido del todo (como las de Training). */
  const despuesDeLaHoja = useRef<(() => void) | null>(null);
  const irATraining = (f: FilaDelEje) => {
    const id = f.sigue?.accion.id;
    despuesDeLaHoja.current = () =>
      (navigation as unknown as { navigate: (n: string, p?: Record<string, unknown>) => void }).navigate(
        'Training',
        id ? { abrirAccionId: id } : undefined,
      );
    setEjeAbierto(null);
  };
  const alIrseLaHoja = () => {
    const luego = despuesDeLaHoja.current;
    despuesDeLaHoja.current = null;
    luego?.();
  };

  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={estilos.encabezado}>
        <Icon name="target" size={TAMANO_ICONO.normal} color={c.goldInk} />
        <Text style={[t.small, estilos.rotulo, estilos.texto, { color: c.goldInk, flex: 1 }]}>Tus acciones de hoy</Text>
        {total > 0 ? (
          <Text
            accessibilityLabel={`${textoDelAvance(cumplidas, total)} cumplidas`}
            style={[t.small, estilos.texto, estilos.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}
          >
            {textoDelAvance(cumplidas, total)}
          </Text>
        ) : null}
      </View>
      {subtitulo ? <Text style={[t.small, estilos.texto, { color: c.textSoft, marginTop: 2 }]}>{subtitulo}</Text> : null}

      {rocas === null ? (
        <Text style={[t.body, estilos.texto, { color: c.textSoft, marginTop: 10 }]}>
          {fallo ? 'No pudimos cargar tus acciones de hoy.' : 'Cargando tus acciones…'}
        </Text>
      ) : filas.length === 0 ? (
        <Text style={[t.body, estilos.texto, { color: c.textSoft, marginTop: 10, lineHeight: 22 }]}>
          Hoy no tienes acciones agendadas. Agéndalas desde tus objetivos: toca una prioridad clave y elige «Agendar mis acciones».
        </Text>
      ) : (
        <>
          {/* Una barrita por acción: de un vistazo, cuántas van. Decorativa: el avance ya está dicho en texto. */}
          <View style={estilos.barritas} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {filas.flatMap(f => f.acciones).map(a => (
              <View
                key={a.accion.id}
                style={[estilos.barrita, { backgroundColor: a.estado === 'cumplida' ? c.gold : c.border }]}
              />
            ))}
          </View>
          {filas.map((f, i) => (
            <Presionable
              key={f.eje}
              onPress={() => setEjeAbierto(f.eje)}
              accessibilityRole="button"
              accessibilityLabel={etiquetaDeLaFila(f)}
              style={[estilos.fila, i > 0 ? { borderTopColor: c.divider, borderTopWidth: StyleSheet.hairlineWidth } : null]}
            >
              <Icon name={iconoDelEje(f.eje)} size={TAMANO_ICONO.grande} color={c.goldInk} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={estilos.tituloDeLaFila}>
                  <Text style={[t.cardTitle, estilos.texto, { color: c.text, flex: 1 }]}>{f.nombre}</Text>
                  <Text style={[t.small, estilos.texto, estilos.cifras, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>
                    {textoDelAvance(f.cumplidas, f.total)}
                  </Text>
                </View>
                <View style={estilos.simbolos}>
                  {f.acciones.map(a => (
                    <Simbolo key={a.accion.id} estado={a.estado} tamano={TAMANO_ICONO.chico} />
                  ))}
                </View>
                <Text
                  style={[t.small, estilos.texto, { color: f.sigue?.estado === 'sePaso' ? c.goldInk : c.textSoft }]}
                >
                  {fraseDeLaFila(f)}
                </Text>
              </View>
              <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
            </Presionable>
          ))}
        </>
      )}
      {fallo ? (
        <Presionable onPress={() => void recargar()} accessibilityRole="button" style={estilos.enlace}>
          <Text style={[t.small, estilos.texto, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 14 }]}>
            {rocas === null ? 'Reintentar' : 'No pudimos actualizar. Reintentar'}
          </Text>
        </Presionable>
      ) : null}

      <HojaDesdeAbajo
        visible={fila !== null}
        alCerrar={() => setEjeAbierto(null)}
        alTerminarDeCerrar={alIrseLaHoja}
        titulo={fila?.nombre ?? ''}
        subtitulo="Tus acciones de hoy en este eje"
        tamano="contenido"
        pie={
          fila && fila.sigue ? (
            <BotonPrincipal etiqueta="Registrar en Training" onPress={() => irATraining(fila)} />
          ) : undefined
        }
      >
        <ScrollView
          style={{ maxHeight: Math.round(height * 0.5) }}
          contentContainerStyle={estilos.cuerpoDeLaHoja}
          showsVerticalScrollIndicator
        >
          {(fila?.acciones ?? []).map(({ accion, estado }) => {
            const hora = horaCortaDeLaAccion(accion);
            const texto = textoDelEstado(estado, horaLocal(accion.completadaEn));
            return (
              <View
                key={accion.id}
                accessible
                accessibilityLabel={`${hora ?? 'Sin hora'}, ${accion.titulo}. ${texto}`}
                style={[estilos.accion, { borderTopColor: c.divider }]}
              >
                <Text style={[t.body, estilos.texto, estilos.hora, { color: c.textStrong }]}>{hora ?? '—'}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[t.body, estilos.texto, { color: estado === 'cumplida' ? c.textSoft : c.text }]}>{accion.titulo}</Text>
                  <Text
                    style={[
                      t.small,
                      estilos.texto,
                      {
                        color: estado === 'cumplida' ? c.success : estado === 'sePaso' ? c.goldInk : c.textSoft,
                        fontFamily: estado === 'cumplida' ? 'Jost_700Bold' : 'Jost_400Regular',
                      },
                    ]}
                  >
                    {texto}
                  </Text>
                </View>
                <Simbolo estado={estado} tamano={TAMANO_ICONO.grande} />
              </View>
            );
          })}
        </ScrollView>
      </HojaDesdeAbajo>
    </View>
  );
}

/**
 * El símbolo de una acción: ✓ cumplida, candado si espera a la verde, reloj rojo si se pasó la hora y un círculo vacío si
 * está pendiente. Cada uno es una forma distinta: el estado nunca depende solo del color.
 */
function Simbolo({ estado, tamano }: { estado: EstadoDeLaAccion; tamano: number }) {
  const { c } = useTheme();
  switch (estado) {
    case 'cumplida':
      return <Icon name="checkCircle" size={tamano} color={c.success} />;
    case 'esperaALaVerde':
      return <Icon name="lock" size={tamano} color={c.textSoft} />;
    case 'sePaso':
      // Dorado y no rojo, como «Se te pasó la hora» de Training (29/10): el reloj ya dice qué pasó sin depender del color.
      return <Icon name="clock" size={tamano} color={c.goldInk} />;
    case 'pendiente':
      return (
        <View
          style={{
            width: tamano - 2,
            height: tamano - 2,
            borderRadius: (tamano - 2) / 2,
            borderWidth: 1.75,
            borderColor: c.chevron,
            margin: 1,
          }}
        />
      );
  }
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 16 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /** Rótulo en tipo oración (como «Tus acciones · día N» de Objetivos). */
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  barritas: { flexDirection: 'row', gap: 4, marginTop: 12, marginBottom: 4 },
  barrita: { flex: 1, height: 5, borderRadius: 3 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  tituloDeLaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  simbolos: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  enlace: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  cuerpoDeLaHoja: { paddingHorizontal: 20, paddingBottom: 8 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  /* Ancho de dígito fijo (AGENTS.md §4): las horas se alinean en columna. */
  hora: { width: 52, fontFamily: 'Jost_700Bold', fontVariant: ['tabular-nums'] },
  /* Un padding mínimo en todo texto: el reciclado de vistas de Android con Fabric arrastra el de otro (E-419, `Legible`). */
  texto: { paddingHorizontal: 1 },
  /** Cifras que cambian en pantalla: ancho de dígito fijo (AGENTS.md §4). */
  cifras: { fontVariant: ['tabular-nums'] },
});
