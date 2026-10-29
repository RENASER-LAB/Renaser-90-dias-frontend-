import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { TituloDeSeccion } from '../../../components/Legible';
import { Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { Flecha } from '../../semaforo/components/NavegacionDeSemanas';
import { useHuecosDeLaSemana, type FalloDeHuecos } from '../hooks/useHuecosDeLaSemana';
import type { CargarHuecos, HuecosDeLaSemana } from '../types/huecos.types';
import { rangoDeLaSemana, tituloDeLaSemana } from '../utils/textosDeHuecos';
import { FilaDelDia } from './FilaDelDia';
import { ResumenDeLaSemana } from './ResumenDeLaSemana';

/**
 * Lo que dice el lector de pantalla de cada flecha. **No son «Semana anterior» / «Semana siguiente»**: la ficha del líder
 * ya tiene esas dos flechas arriba (las de los 7 días del semáforo) y dos botones con el mismo nombre en la misma pantalla
 * se confunden para quien usa lector de pantalla y para las pruebas de punta a punta.
 */
export const ETIQUETA_ANTERIOR = 'Tiempo libre: semana anterior';
export const ETIQUETA_SIGUIENTE = 'Tiempo libre: semana siguiente';

/** Desde cuántos huecos en la semana cada día pasa a plegarse: con más de uno por día en promedio, ya es largo. */
export const HUECOS_PARA_PLEGAR = 8;

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
 * Entra con `Aparicion` como las otras secciones de la ficha; el cambio de semana y abrir un día son instantáneos.
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
        <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function Cuerpo({ datos }: { datos: HuecosDeLaSemana }) {
  const { c, t } = useTheme();
  const totalDeHuecos = datos.dias.reduce((suma, dia) => suma + dia.huecos.length, 0);
  const plegable = totalDeHuecos >= HUECOS_PARA_PLEGAR;
  /* Los días abiertos son de UNA semana: al cambiar de semana vuelven a estar plegados, sin un efecto que corra un
     dibujo tarde. */
  const [abiertos, setAbiertos] = useState<{ semana: string; fechas: string[] }>({ semana: datos.semana, fechas: [] });
  const fechasAbiertas = abiertos.semana === datos.semana ? abiertos.fechas : [];
  const alternar = (fecha: string) =>
    setAbiertos({
      semana: datos.semana,
      fechas: fechasAbiertas.includes(fecha) ? fechasAbiertas.filter(f => f !== fecha) : [...fechasAbiertas, fecha],
    });

  return (
    <View style={estilos.cuerpo}>
      {datos.resumen ? <ResumenDeLaSemana resumen={datos.resumen} /> : null}

      <View style={[estilos.dias, datos.resumen ? { borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 6 } : null]}>
        {datos.dias.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23, paddingVertical: 8 }]}>
            No hay días para mostrar en esta semana.
          </Text>
        ) : (
          datos.dias.map((dia, indice) => (
            <FilaDelDia
              key={dia.fecha}
              dia={dia}
              primera={indice === 0}
              plegable={plegable}
              abierto={fechasAbiertas.includes(dia.fecha)}
              alAlternar={() => alternar(dia.fecha)}
            />
          ))
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { marginTop: 8 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  centro: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  cuerpo: { marginTop: 16, gap: 14 },
  dias: { gap: 0 },
  cargando: { minHeight: 96, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  fallo: { marginTop: 14, gap: 12, alignItems: 'flex-start' },
  /* 48 px: pulsable con el pulgar sin apuntar (A-1, 26/09). */
  reintentar: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
});
