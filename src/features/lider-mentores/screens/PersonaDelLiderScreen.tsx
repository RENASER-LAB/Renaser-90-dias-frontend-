import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AvatarPersona } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { diaInicialDelDetalle } from '../../mentor/utils/diaInicialDelDetalle';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { EtiquetaSemaforo } from '../../semaforo/components/EtiquetaSemaforo';
import { PALABRA_NO_SE_MIDE, palabraParaQuienAcompana } from '../../semaforo/utils/ayudaDelSemaforo';
import { formatearPorcentaje } from '../../semaforo/utils/lecturaDelSemaforo';
import { DiaDeLaPersona } from '../components/DiaDeLaPersona';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { NavegacionDeLaSemana } from '../components/NavegacionDeLaSemana';
import { useSemanaDePersona, type LecturaDeLaSemana } from '../hooks/useSemanaDePersona';
import type { SemanaDePersona } from '../types/cumplimientoDelLider.types';
import { resumenDeLaSemanaEnPalabras } from '../utils/palabrasDeLaPersona';

/**
 * La semana de una persona del grupo, para el líder (spec 005, US1; `GET /leadership/groups/{g}/people/{p}/week`).
 *
 * De sábado a viernes, día por día, con lo que la persona tenía ESE día (no los hábitos de hoy proyectados
 * hacia atrás). Arriba, quién es, su color y su porcentaje de la semana —los mismos que ve el administrador:
 * salen del mismo cálculo— y debajo la navegación entre semanas: hacia atrás hasta el inicio de su programa, y
 * sin semanas futuras.
 *
 * - **Cada día es una cabecera que se abre**: un día a la vez, el más reciente con hábitos a la vista. La
 *   falta de datos (pausa, antes del Día 1, nada programado) se dice con su motivo, nunca como incumplimiento.
 * - **Carga, error o dato, nunca el de otra persona ni el de otra semana** (SC-005): `useSemanaDePersona`
 *   vacía los datos en el mismo render del cambio, y «Reintentar» vuelve a pedir lo mismo.
 * - **Abrir la ficha deja un registro** de la consulta en el servidor (FR-016): la lectura se hace al abrir y
 *   al cambiar de semana, no en cada foco.
 *
 * Un único scroll (`MarcoDelLider`); el retroceso del sistema vuelve a la lista del grupo.
 */
export function PersonaDelLiderScreen({
  grupoId,
  grupoNombre,
  personaId,
  nombre,
  avatarUrl,
  semanaHasta,
  onVolver,
}: {
  grupoId: string;
  grupoNombre: string;
  personaId: string;
  /** El de la fila que se tocó: está a la vista antes de que llegue la semana. */
  nombre: string;
  avatarUrl: string | null;
  /** El viernes de la semana en que estaba la lista; `null` = la semana en curso. */
  semanaHasta: string | null;
  onVolver: () => void;
}) {
  const lectura = useSemanaDePersona(grupoId, personaId, semanaHasta);
  const datos = lectura.datos;

  /* El día abierto se guarda junto con la semana a la que pertenece: al cambiar de semana vuelve solo al día
     más reciente con hábitos, sin un efecto que corra un render tarde. */
  const [eleccion, setEleccion] = useState<{ desde: string; fecha: string | null } | null>(null);
  const diaAbierto = datos ? (eleccion?.desde === datos.desde ? eleccion.fecha : diaInicialDelDetalle(datos.dias)) : null;
  const alternarDia = (fecha: string) => {
    if (datos) setEleccion({ desde: datos.desde, fecha: diaAbierto === fecha ? null : fecha });
  };

  const nombreVisible = datos?.nombre ?? nombre;

  return (
    <MarcoDelLider titulo={nombreVisible} onVolver={onVolver}>
      <EncabezadoDeLaPersona
        nombre={nombreVisible}
        avatarUrl={datos?.avatarUrl ?? avatarUrl}
        grupoNombre={grupoNombre}
        datos={datos}
      />

      <NavegacionDeLaSemana
        titulo={lectura.rotulo.titulo}
        rango={lectura.rotulo.rango}
        puedeAnterior={lectura.puedeAnterior}
        puedeSiguiente={lectura.puedeSiguiente}
        onAnterior={lectura.anterior}
        onSiguiente={lectura.siguiente}
      />

      <CuerpoDeLaSemana lectura={lectura} nombre={nombreVisible} diaAbierto={diaAbierto} alAlternarDia={alternarDia} />
    </MarcoDelLider>
  );
}

/** Quién es, a qué grupo y con qué mentor, y cómo le fue en la semana: color y % del semáforo, o «no se mide». */
function EncabezadoDeLaPersona({
  nombre,
  avatarUrl,
  grupoNombre,
  datos,
}: {
  nombre: string;
  avatarUrl: string | null;
  grupoNombre: string;
  datos: SemanaDePersona | null;
}) {
  const { c, t } = useTheme();
  const quien = [grupoNombre, datos?.mentor?.nombre ? `Mentor: ${datos.mentor.nombre}` : null].filter(Boolean).join(' · ');

  return (
    <View style={estilos.encabezado}>
      <AvatarPersona nombre={nombre} avatarUrl={avatarUrl} size={56} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]} numberOfLines={2}>
          {quien}
        </Text>
        {datos ? <EstadoDeLaSemana datos={datos} /> : null}
      </View>
    </View>
  );
}

function EstadoDeLaSemana({ datos }: { datos: SemanaDePersona }) {
  const { c, t } = useTheme();
  const cifra = datos.porcentaje !== null ? formatearPorcentaje(datos.porcentaje) : null;
  return (
    <View style={{ gap: 4 }}>
      <View style={estilos.estado}>
        {datos.noSeMide ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22, flexShrink: 1 }]}>
            {PALABRA_NO_SE_MIDE}
          </Text>
        ) : (
          <EtiquetaSemaforo color={datos.color} etiqueta={palabraParaQuienAcompana(datos.color, datos.etiqueta)} />
        )}
        {cifra ? (
          <Text style={[estilos.cifra, { color: c.textStrong }]} accessibilityLabel={`${cifra} de la semana`}>
            {cifra}
          </Text>
        ) : null}
      </View>
      {datos.resumen ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
          {resumenDeLaSemanaEnPalabras(datos.resumen)}
        </Text>
      ) : null}
    </View>
  );
}

function CuerpoDeLaSemana({
  lectura,
  nombre,
  diaAbierto,
  alAlternarDia,
}: {
  lectura: LecturaDeLaSemana;
  nombre: string;
  diaAbierto: string | null;
  alAlternarDia: (fecha: string) => void;
}) {
  const datos = lectura.datos;
  if (datos) {
    return datos.dias.length === 0 ? (
      <Linea>No hay nada que mostrar de esta semana.</Linea>
    ) : (
      <View style={{ gap: 10 }}>
        {datos.dias.map(dia => (
          <DiaDeLaPersona key={dia.fecha} dia={dia} abierto={diaAbierto === dia.fecha} alAlternar={() => alAlternarDia(dia.fecha)} />
        ))}
      </View>
    );
  }
  if (lectura.fallo) {
    return (
      <FalloDeLectura
        fallo={lectura.fallo}
        detalle={lectura.detalleDelFallo}
        que={`la semana de ${nombre}`}
        onReintentar={lectura.recargar}
      />
    );
  }
  return <CargandoLectura texto="Cargando la semana…" />;
}

const estilos = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  estado: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  /* Cifras tabulares: 78.3 y 100 no bailan de ancho de una semana a la otra. */
  cifra: { fontFamily: 'Jost_700Bold', fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] },
});
