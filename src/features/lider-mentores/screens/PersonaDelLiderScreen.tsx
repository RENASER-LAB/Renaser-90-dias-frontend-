import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { AvatarPersona } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
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
import { escribirleA } from '../utils/irAlChat';
import { resumenDeLaSemanaEnPalabras } from '../utils/palabrasDeLaPersona';
import { ObservarScreen } from './ObservarScreen';

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
 * - **Dos acciones** (US3): «Escribirle» abre el chat 1 a 1 con la persona, vacío y sin enviar nada
 *   (FR-015), y «Avisar a su mentor» deja una observación sobre ella y la semana (FR-014; no aparece si el
 *   grupo no tiene mentor). La observación se escribe en `ObservarScreen`; la ficha sigue montada debajo, así
 *   que al volver está en la misma semana, sin releerse (ni registrar otra consulta).
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
  const [observando, setObservando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [abriendoChat, setAbriendoChat] = useState(false);
  const [eleccion, setEleccion] = useState<{ desde: string; fecha: string | null } | null>(null);
  const diaAbierto = datos ? (eleccion?.desde === datos.desde ? eleccion.fecha : diaInicialDelDetalle(datos.dias)) : null;
  const alternarDia = (fecha: string) => {
    if (datos) setEleccion({ desde: datos.desde, fecha: diaAbierto === fecha ? null : fecha });
  };

  const nombreVisible = datos?.nombre ?? nombre;
  /* A quién se le avisa: el mentor del grupo, y nunca a la persona sobre sí misma (si ella es el mentor). */
  const mentor = datos?.mentor && datos.mentor.id !== personaId ? datos.mentor : null;

  const escribirle = async () => {
    setAbriendoChat(true);
    await escribirleA(personaId, nombreVisible);
    setAbriendoChat(false);
  };

  if (observando && datos && mentor) {
    return (
      <ObservarScreen
        mentorId={mentor.id}
        nombre={mentor.nombre?.trim() || 'su mentor'}
        tipo="SUGERENCIA"
        sobre={{ personaId, nombre: nombreVisible, semanaDesde: datos.desde, semanaHasta: datos.hasta }}
        onVolver={() => setObservando(false)}
        onGuardada={texto => {
          setObservando(false);
          setAviso(texto);
          tacto.logro();
        }}
      />
    );
  }

  return (
    <MarcoDelLider titulo={nombreVisible} onVolver={onVolver}>
      {aviso ? <ConfirmacionEnLinea texto={aviso} onTerminar={() => setAviso(null)} /> : null}
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
        onVolverAEstaSemana={lectura.puedeVolverAEstaSemana ? lectura.volverAEstaSemana : undefined}
      />

      <CuerpoDeLaSemana lectura={lectura} nombre={nombreVisible} diaAbierto={diaAbierto} alAlternarDia={alternarDia} />

      <View style={estilos.acciones}>
        <BotonPrincipal
          etiqueta={abriendoChat ? 'Abriendo…' : 'Escribirle'}
          icono="chat"
          onPress={() => void escribirle()}
          cargando={abriendoChat}
          accessibilityLabel={`Escribirle a ${nombreVisible}`}
        />
        {mentor ? (
          <>
            <BotonSecundario
              etiqueta="Avisar a su mentor"
              icono="bell"
              onPress={() => setObservando(true)}
              deshabilitado={!datos}
              accessibilityLabel={`Avisar a su mentor sobre ${nombreVisible}`}
            />
            <Linea>{`Le deja a ${mentor.nombre?.trim() || 'su mentor'} una observación sobre ${nombreVisible} y esta semana.`}</Linea>
          </>
        ) : null}
      </View>
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
  acciones: { gap: 12, marginTop: 8 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  estado: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  /* Cifras tabulares: 78.3 y 100 no bailan de ancho de una semana a la otra. */
  cifra: { fontFamily: 'Jost_700Bold', fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] },
});
