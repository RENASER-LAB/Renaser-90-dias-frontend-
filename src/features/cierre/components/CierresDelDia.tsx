import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { TituloDeSeccion } from '../../../components/Legible';
import { Card } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { Flecha } from '../../semaforo/components/NavegacionDeSemanas';
import { useCierresDeLaSemana, type FalloDeCierres } from '../hooks/useCierresDeLaSemana';
import type { AccionDelCierre, CargarCierres, CierresDeLaSemana, DiaDelCierre } from '../types/cierre.types';
import {
  TEXTO_SIN_DIAS,
  TITULO_DE_LA_SECCION,
  encabezadoDelDia,
  lineaDeUnMotivo,
  lineaDelResumen,
  rangoDeLaSemana,
  respuestaEnPalabras,
} from '../utils/textosDeLosCierres';

/**
 * Lo que dice el lector de pantalla de cada flecha. Distintas a las del tiempo libre y a las del semáforo de la ficha:
 * dos botones con el mismo nombre en la misma pantalla se confunden.
 */
export const ETIQUETA_ANTERIOR = 'Cierres del día: semana anterior';
export const ETIQUETA_SIGUIENTE = 'Cierres del día: semana siguiente';

/**
 * «Cierres del día» de una persona (spec 017): lo que dijo cada día al cerrarlo —qué quedó pendiente, qué pasó y qué
 * hará mañana—, semana por semana. **Solo lectura y solo para su acompañamiento** (el mentor o la guía del grupo, el
 * líder, Administración y Alquimista); la propia persona lo escribe en Training y no lo ve acá.
 *
 * Mismo criterio que `TiempoLibreDeLaSemana` (spec 015): `cargar(semana)` es de cada ficha y estable; sin `cargar` no hay
 * sección; un 403 o un 404 (backend sin la spec 017, otro rol, ya no la acompaña) esconden la sección sin error; mientras
 * llega la PRIMERA lectura tampoco se dibuja nada (un marco que se retira después sería un parpadeo); los demás fallos
 * se dicen con «Reintentar». Una lectura por semana; sin ir al futuro ni antes de la primera semana. Un día sin cerrar
 * dice «Sin cerrar» y nada más: cerrar es opcional y no se penaliza.
 */
export function CierresDelDia({ cargar }: { cargar: CargarCierres | null }) {
  const lectura = useCierresDeLaSemana(cargar);
  const { datos, cargando, fallo, semana } = lectura;

  if (!cargar || lectura.oculta) return null;
  if (cargando && semana === null) return null;

  return (
    <Aparicion retardo={300} style={{ marginTop: 20 }}>
      <TituloDeSeccion>{TITULO_DE_LA_SECCION}</TituloDeSeccion>
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

function Cargando() {
  const { c, t } = useTheme();
  /* Alto reservado: al llegar la semana la tarjeta no da un salto desde una línea. */
  return (
    <View style={estilos.cargando}>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Cargando los cierres…</Text>
    </View>
  );
}

function Encabezado({ lectura }: { lectura: ReturnType<typeof useCierresDeLaSemana> }) {
  const { c, t } = useTheme();
  const { semana, semanaEnCurso } = lectura;
  const titulo = semana !== null && semana === semanaEnCurso ? 'Semana en curso' : 'Semana';
  const rango = semana ? rangoDeLaSemana(semana) : '';

  return (
    <View style={estilos.encabezado}>
      <Flecha icono="arrowLeft" etiqueta={ETIQUETA_ANTERIOR} habilitada={lectura.puedeAnterior} onPress={lectura.anterior} />
      <View style={estilos.centro} accessible accessibilityLiveRegion="polite" accessibilityLabel={rango ? `${titulo}. ${rango}` : titulo}>
        <Text style={[t.cardTitle, { color: c.textStrong, textAlign: 'center', fontSize: 17 }]}>{titulo}</Text>
        {rango ? <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22, textAlign: 'center' }]}>{rango}</Text> : null}
      </View>
      <Flecha icono="arrow" etiqueta={ETIQUETA_SIGUIENTE} habilitada={lectura.puedeSiguiente} onPress={lectura.siguiente} />
    </View>
  );
}

function Fallo({ fallo, alReintentar }: { fallo: FalloDeCierres; alReintentar: () => void }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.fallo}>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
        {fallo === 'sin_red'
          ? 'No se pudieron cargar los cierres de esta semana. Revisa tu conexión.'
          : 'No se pudieron cargar los cierres de esta semana.'}
      </Text>
      <Pressable
        onPress={alReintentar}
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        style={({ pressed }) => [estilos.reintentar, { borderColor: c.border, backgroundColor: pressed ? c.goldWash : 'transparent' }]}
      >
        <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: fuentes.media }]}>Reintentar</Text>
      </Pressable>
    </View>
  );
}

function Cuerpo({ datos }: { datos: CierresDeLaSemana }) {
  const { c, t } = useTheme();
  const resumen = datos.resumen;
  const linea = resumen ? lineaDelResumen(resumen) : null;
  const motivos = resumen ? resumen.motivos.flatMap(m => lineaDeUnMotivo(m) ?? []) : [];

  return (
    <View style={estilos.cuerpo}>
      {linea ? (
        <View style={estilos.bloque}>
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>{linea}</Text>
          {motivos.length > 0 ? (
            <>
              <Text style={[t.micro, estilos.rotulo, { color: c.micro, fontSize: 14 }]}>Lo que más se repite</Text>
              {motivos.map(m => (
                <Text key={m} style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>
                  {m}
                </Text>
              ))}
            </>
          ) : null}
        </View>
      ) : null}

      <View style={[estilos.dias, linea ? { borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 6 } : null]}>
        {datos.dias.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23, paddingVertical: 8 }]}>{TEXTO_SIN_DIAS}</Text>
        ) : (
          datos.dias.map((dia, i) => <DiaDeCierre key={dia.fecha} dia={dia} primero={i === 0} />)
        )}
      </View>
    </View>
  );
}

/** Un día: cómo quedó, cuántas acciones se cumplieron, lo que dijo de cada pendiente y su nota. */
function DiaDeCierre({ dia, primero }: { dia: DiaDelCierre; primero: boolean }) {
  const { c, t } = useTheme();
  const pendientes = dia.acciones.filter(a => !a.cumplida);
  const cumplidas = dia.acciones.length - pendientes.length;
  const encabezado = encabezadoDelDia(dia);

  return (
    <View style={[estilos.dia, primero ? null : { borderTopWidth: 1, borderTopColor: c.divider }]} accessible={false}>
      <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>
        {encabezado}
      </Text>
      {dia.acciones.length === 0 ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>Ese día no tenía acciones.</Text>
      ) : (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
          {`${cumplidas} de ${dia.acciones.length} ${dia.acciones.length === 1 ? 'acción cumplida' : 'acciones cumplidas'}`}
        </Text>
      )}
      {pendientes.map(a => (
        <Pendiente key={a.id} accion={a} />
      ))}
      {dia.nota ? (
        <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>Nota del día: «{dia.nota}»</Text>
      ) : null}
    </View>
  );
}

function Pendiente({ accion }: { accion: AccionDelCierre }) {
  const { c, t } = useTheme();
  const respuesta = accion.cierre ? respuestaEnPalabras(accion.cierre) : null;
  return (
    <View style={estilos.pendiente}>
      <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media }]}>
        «{accion.titulo}» quedó pendiente
      </Text>
      {respuesta ? <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22 }]}>{respuesta}</Text> : null}
      {accion.cierre?.nota ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>«{accion.cierre.nota}»</Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { marginTop: 8 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  centro: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  cuerpo: { marginTop: 16, gap: 14 },
  bloque: { gap: 3 },
  rotulo: { letterSpacing: 0, fontFamily: fuentes.negrita, marginTop: 6 },
  dias: { gap: 0 },
  dia: { paddingVertical: 10, gap: 3 },
  pendiente: { gap: 1, paddingLeft: 12, marginTop: 4 },
  cargando: { minHeight: 96, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  fallo: { marginTop: 14, gap: 12, alignItems: 'flex-start' },
  reintentar: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
});
