import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { TituloDeSeccion } from '../../../components/Legible';
import { Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { Flecha } from '../../semaforo/components/NavegacionDeSemanas';
import { useHuecosDeLaSemana, type FalloDeHuecos } from '../hooks/useHuecosDeLaSemana';
import type { CargarHuecos, HuecosDeLaSemana } from '../types/huecos.types';
import {
  avisoDeLaSemanaSinHoras,
  diaInicial,
  momentoDelDia,
  totalLibreDeLaSemana,
} from '../utils/agendaDelDia';
import { duracionEnPalabras, duracionHablada, lineaDeLoReal, rangoDeLaSemana, tituloDeLaSemana } from '../utils/textosDeHuecos';
import { AgendaDelDia } from './AgendaDelDia';
import { ColumnasDeLaSemana } from './ColumnasDeLaSemana';
import { SeRepite } from './SeRepite';
import { TarjetaDeHoraQueFalta } from './TarjetaDeHoraQueFalta';

/**
 * Lo que dice el lector de pantalla de cada flecha. **No son «Semana anterior» / «Semana siguiente»**: la ficha del líder
 * ya tiene esas dos flechas arriba (las de los 7 días del semáforo) y dos botones con el mismo nombre en la misma pantalla
 * se confunden para quien usa lector de pantalla y para las pruebas de punta a punta.
 */
export const ETIQUETA_ANTERIOR = 'Tiempo libre: semana anterior';
export const ETIQUETA_SIGUIENTE = 'Tiempo libre: semana siguiente';

/**
 * «Tiempo libre de la semana» de una persona (spec 015): lo que le queda libre entre lo que planificó, semana por
 * semana, de lunes a domingo. **Solo lectura y solo para su acompañamiento** (el mentor o la guía del grupo, el líder de
 * mentores, el administrador y el alquimista): la persona no lo ve en ningún lugar (decisión del dueño, 2026-10-29).
 *
 * ## Cada ficha dice cómo cargar
 *
 * Como `CodigoRenaserDelAlumno`: `cargar(semana)` es de cada ficha y la sección no sabe de rutas ni de roles (el servidor
 * decide quién lee). Tiene que ser estable (un `useMemo` por persona); `null` = no hay a quién preguntarle y la sección
 * no se dibuja.
 *
 * ## Si el endpoint no está, acá no hay nada
 *
 * Un 403 (ya no la acompaña, o es otro rol) o un 404 (backend sin la ruta) no dibujan la sección ni dicen error. Mientras
 * llega la PRIMERA lectura tampoco se dibuja nada: mostrar el marco con «Cargando…» para sacarlo un instante después
 * sería un parpadeo, y la sección va al final de una ficha larga. Los demás fallos sí se dicen, con «Reintentar».
 *
 * ## Una lectura por semana
 *
 * La primera es la semana en curso de la persona (sin `semana`: el servidor sabe su zona). Cada semana a la que se va es un
 * pedido más y queda guardada mientras la ficha está abierta: ir y volver no pide nada, ni tampoco volver a dibujar o
 * enfocar la ficha. Sin ir al futuro ni antes de `primeraSemana`.
 *
 * ## Por día (corregido 2026-10-29)
 *
 * El dueño pidió verlo «como por día, más intuitivo»: arriba la semana con sus flechas y las horas libres de toda ella; siete
 * columnas de lunes a domingo con lo libre de cada día (`ColumnasDeLaSemana`); el día elegido como una agenda de Despertar a
 * Dormir (`AgendaDelDia`); y al final «Se repite», tres filas como máximo (`SeRepite`). Si falta la hora de Despertar o de
 * Dormir de toda la semana, una sola tarjeta lo dice y NO se dibuja el sueño como tiempo libre ni se cuenta un total
 * inventado (`TarjetaDeHoraQueFalta`). Todo viene calculado del servidor; la app solo lo acomoda.
 *
 * Entra con `Aparicion` como las otras secciones de la ficha; el cambio de semana y de día son instantáneos.
 */
export function TiempoLibreDeLaSemana({ cargar }: { cargar: CargarHuecos | null }) {
  const lectura = useHuecosDeLaSemana(cargar);
  const { datos, cargando, fallo, semana } = lectura;

  if (!cargar || lectura.oculta) return null;
  /* La primera lectura todavía no llegó: nada que mostrar (ver arriba). */
  if (cargando && semana === null) return null;

  return (
    <Aparicion retardo={260} style={{ marginTop: 20 }}>
      <TituloDeSeccion>Tiempo libre de la semana</TituloDeSeccion>
      <Card style={estilos.tarjeta}>
        <Encabezado lectura={lectura} />
        {cargando ? (
          <Cargando />
        ) : fallo ? (
          <Fallo fallo={fallo} alReintentar={lectura.reintentar} />
        ) : datos ? (
          <Cuerpo datos={datos} />
        ) : null}
      </Card>
    </Aparicion>
  );
}

/** ‹ ›, el título de la semana y su rango. Las flechas de 48 × 48; deshabilitadas se siguen viendo, más tenues. */
function Encabezado({ lectura }: { lectura: ReturnType<typeof useHuecosDeLaSemana> }) {
  const { c, t } = useTheme();
  const { datos, semana, semanaEnCurso } = lectura;
  const titulo = tituloDeLaSemana({
    cerrada: datos?.cerrada ?? false,
    esLaEnCurso: semana !== null && semana === semanaEnCurso,
  });
  const rango = semana ? rangoDeLaSemana(semana) : '';

  return (
    <View style={estilos.encabezado}>
      <Flecha icono="arrowLeft" etiqueta={ETIQUETA_ANTERIOR} habilitada={lectura.puedeAnterior} onPress={lectura.anterior} />
      <View
        style={estilos.centro}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={rango ? `${titulo}. ${rango}` : titulo}
      >
        <Text style={[t.cardTitle, { color: c.textStrong, textAlign: 'center', fontSize: 17 }]}>{titulo}</Text>
        {rango ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22, textAlign: 'center' }]}>{rango}</Text>
        ) : null}
      </View>
      <Flecha icono="arrow" etiqueta={ETIQUETA_SIGUIENTE} habilitada={lectura.puedeSiguiente} onPress={lectura.siguiente} />
    </View>
  );
}

function Cargando() {
  const { c, t } = useTheme();
  /* Alto reservado: al llegar la semana la tarjeta no da un salto desde una línea. */
  return (
    <View style={estilos.cargando}>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Cargando el tiempo libre…</Text>
    </View>
  );
}

function Fallo({ fallo, alReintentar }: { fallo: FalloDeHuecos; alReintentar: () => void }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.fallo}>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
        {fallo === 'sin_red'
          ? 'No se pudo cargar el tiempo libre de esta semana. Revisa tu conexión.'
          : 'No se pudo cargar el tiempo libre de esta semana.'}
      </Text>
      <Pressable
        onPress={alReintentar}
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        style={({ pressed }) => [
          estilos.reintentar,
          { borderColor: c.border, backgroundColor: pressed ? c.goldWash : 'transparent' },
        ]}
      >
        <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: fuentes.media }]}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function Cuerpo({ datos }: { datos: HuecosDeLaSemana }) {
  const { c, t } = useTheme();
  /* El día elegido es de UNA semana: al cambiar de semana vuelve al día inicial, sin un efecto que corra un dibujo tarde. */
  const [eleccion, setEleccion] = useState<{ semana: string; fecha: string } | null>(null);
  const elegido =
    eleccion && eleccion.semana === datos.semana && datos.dias.some(d => d.fecha === eleccion.fecha)
      ? eleccion.fecha
      : diaInicial(datos);
  const dia = datos.dias.find(d => d.fecha === elegido) ?? null;

  if (datos.dias.length === 0) {
    return (
      <View style={estilos.cuerpo}>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>No hay días para mostrar en esta semana.</Text>
      </View>
    );
  }

  const aviso = avisoDeLaSemanaSinHoras(datos.dias);
  return (
    <View style={estilos.cuerpo}>
      {aviso ? <TarjetaDeHoraQueFalta aviso={aviso} /> : null}
      <TotalLibre datos={datos} />
      {aviso ? null : (
        <>
          <ColumnasDeLaSemana
            dias={datos.dias}
            hoy={datos.hoy}
            cerrada={datos.cerrada}
            elegido={elegido}
            alElegir={fecha => setEleccion({ semana: datos.semana, fecha })}
          />
          {dia ? (
            <AgendaDelDia dia={dia} momento={momentoDelDia(dia.fecha, datos.hoy, datos.cerrada)} cerrada={datos.cerrada} />
          ) : null}
          {datos.resumen ? <SeRepite huecos={datos.resumen.huecosQueSeRepiten} /> : null}
        </>
      )}
    </View>
  );
}

/**
 * «27 h libres esta semana, de Despertar a Dormir». La suma es de los días que tienen ventana; si ninguno la tiene el total
 * dice «—» (no se cuenta el día entero como tiempo libre). En una semana cerrada, cuyos días no traen lo cumplido, la línea de
 * lo real de la semana sale de su resumen para no perderla.
 */
function TotalLibre({ datos }: { datos: HuecosDeLaSemana }) {
  const { c, t } = useTheme();
  const total = totalLibreDeLaSemana(datos.dias);
  const sinConteosPorDia = datos.dias.every(d => d.cumplidosATiempo === null);
  const real = sinConteosPorDia && datos.resumen ? lineaDeLoReal(datos.resumen) : null;

  return (
    <View style={estilos.total}>
      <View
        accessible
        accessibilityLabel={
          total === null
            ? 'Tiempo libre de la semana: no se calcula'
            : `${duracionHablada(total)} libres esta semana, de Despertar a Dormir`
        }
        style={estilos.totalFila}
      >
        <Text style={[estilos.totalCifra, { color: c.textStrong }]}>{total === null ? '—' : duracionEnPalabras(total)}</Text>
        <Text style={[t.body, estilos.totalTexto, { color: c.textSoft }]}>
          {total === null ? 'libres esta semana' : 'libres esta semana, de Despertar a Dormir'}
        </Text>
      </View>
      {real ? <Text style={[t.body, estilos.real, { color: c.text }]}>{`${real} en la semana`}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  /* Menos relleno a los lados que la `Card` de siempre (17): las siete columnas ganan ancho y cada una se acerca a los 44 dp. */
  tarjeta: { marginTop: 8, paddingHorizontal: 12 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  centro: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  cuerpo: { marginTop: 16 },
  total: { marginTop: 14 },
  totalFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 },
  totalCifra: { fontFamily: fuentes.negrita, fontSize: 26, lineHeight: 32, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  totalTexto: { fontSize: 15, lineHeight: 21, flexShrink: 1 },
  real: { fontSize: 15, lineHeight: 21, marginTop: 4 },
  cargando: { minHeight: 96, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  fallo: { marginTop: 14, gap: 12, alignItems: 'flex-start' },
  /* 48 px: pulsable con el pulgar sin apuntar (A-1, 26/09). */
  reintentar: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
});
