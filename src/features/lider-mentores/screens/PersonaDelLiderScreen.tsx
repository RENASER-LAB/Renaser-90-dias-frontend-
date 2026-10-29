import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { AvatarPersona } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CodigoRenaserDelAlumno } from '../../mentor/components/CodigoRenaserDelAlumno';
import { diaInicialDelDetalle } from '../../mentor/utils/diaInicialDelDetalle';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { EtiquetaSemaforo } from '../../semaforo/components/EtiquetaSemaforo';
import { PALABRA_NO_SE_MIDE, palabraParaQuienAcompana, rolEnPalabras } from '../../semaforo/utils/ayudaDelSemaforo';
import { formatearPorcentaje } from '../../semaforo/utils/lecturaDelSemaforo';
import { obtenerRadarDePersona } from '../api/cumplimientoDelLiderApi';
import { DiaDeLaPersona } from '../components/DiaDeLaPersona';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { NavegacionDeSemanas } from '../../semaforo/components/NavegacionDeSemanas';
import type { InicioSemanal } from '../../semaforo/hooks/useLecturaPorSemana';
import { useSemanaDePersona, type LecturaDeLaSemana } from '../hooks/useSemanaDePersona';
import type { SemanaDePersona } from '../types/cumplimientoDelLider.types';
import { escribirleA } from '../utils/irAlChat';
import { resumenDeLaSemanaEnPalabras } from '../utils/palabrasDeLaPersona';
import { ObservarScreen } from './ObservarScreen';

/**
 * Los 7 días de una persona del grupo, para el líder (spec 005, US1; `GET /leadership/groups/{g}/people/{p}/week`).
 *
 * **Son los mismos 7 días que mostraba la lista del grupo y, antes, el resumen por grupos** (decisión del dueño del
 * 2026-10-19: «la ventana del resumen manda en todo»): abre en la ventana que recibe en `inicio` y su navegación
 * (`NavegacionDeSemanas`) rotula y mueve esa ventana igual que las otras dos pantallas, de 7 en 7 días, hacia atrás
 * hasta el inicio de su programa y sin llegar nunca al futuro.
 *
 * Día por día, con lo que la persona tenía ESE día (no los hábitos de hoy proyectados hacia atrás). Arriba, quién es,
 * su color y su porcentaje de esos días —los mismos que ve la lista y el administrador: salen del mismo cálculo—.
 *
 * - **Cada día es una cabecera que se abre**: un día a la vez, el más reciente con hábitos a la vista. La
 *   falta de datos (pausa, antes del Día 1, nada programado) se dice con su motivo, nunca como incumplimiento.
 * - **Carga, error o dato, nunca el de otra persona ni el de otra semana** (SC-005): `useSemanaDePersona`
 *   vacía los datos en el mismo render del cambio, y «Reintentar» vuelve a pedir lo mismo.
 * - **Abrir la ficha deja un registro** de la consulta en el servidor (FR-016): la lectura se hace al abrir y
 *   al cambiar de semana, no en cada foco.
 * - **Sin días por venir**: la ventana termina ayer (o, con el viernes de hoy, hoy: «Hoy, todavía sin cerrar»), así
 *   que no hay tarjetas de días futuros ni un aviso de que el porcentaje puede cambiar.
 * - **El mentor o la guía con programa propio** (`NO_SE_MIDE`) llega sin días: se dice su rol y que no se mide,
 *   con su porcentaje, y no se cuentan hábitos (ceros que parecerían incumplimiento).
 * - **Dos acciones** (US3): «Escribirle» abre el chat 1 a 1 con la persona, vacío y sin enviar nada
 *   (FR-015), y «Avisar a su mentor» deja una observación sobre ella y la semana (FR-014; no aparece si el
 *   grupo no tiene mentor). La observación se escribe en `ObservarScreen`; la ficha sigue montada debajo, así
 *   que al volver está en la misma semana, sin releerse (ni registrar otra consulta).
 *
 * Un único scroll (`MarcoDelLider`); el retroceso del sistema vuelve a la lista del grupo.
 *
 * **Administración y Alquimista la usan igual** (2026-10-27): el servidor les da la misma lectura que al líder. Con las
 * dos props opcionales que siguen cambia solo lo que dice la pantalla; sin ellas es exactamente la del líder.
 */
export function PersonaDelLiderScreen({
  grupoId,
  grupoNombre,
  personaId,
  nombre,
  avatarUrl,
  inicio,
  onVolver,
  avisoSiNoSeAbre,
  alAbrirFicha,
}: {
  grupoId: string;
  grupoNombre: string;
  personaId: string;
  /** El de la fila que se tocó: está a la vista antes de que llegue la semana. */
  nombre: string;
  avatarUrl: string | null;
  /** La ventana que estaba mirando la lista (posición y ancla); ausente = la vigente. */
  inicio?: InicioSemanal;
  onVolver: () => void;
  /**
   * Lo que se lee cuando el servidor no abre a la persona (404: grupo sin mentor, persona que ya no está en ese grupo o que no se
   * muestra), en lugar del «todavía no está disponible» genérico. Solo lo pasa Administración; el líder nunca llega a un 404.
   */
  avisoSiNoSeAbre?: string;
  /** Un botón «Ver su ficha» al pie, para quien tiene otra vista de la persona (la ficha de administración). */
  alAbrirFicha?: () => void;
}) {
  const lectura = useSemanaDePersona(grupoId, personaId, inicio);
  const datos = lectura.datos;
  /* Spec 012: su Código Renaser y su Mi Radar (solo lectura). Se pide una vez por persona, no al cambiar de semana. */
  const cargarRadar = useMemo(
    () => (cursor?: string | null) => obtenerRadarDePersona(grupoId, personaId, cursor),
    [grupoId, personaId],
  );

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

      <NavegacionDeSemanas lectura={lectura} />

      <CuerpoDeLaSemana
        lectura={lectura}
        nombre={nombreVisible}
        diaAbierto={diaAbierto}
        alAlternarDia={alternarDia}
        avisoSiNoSeAbre={avisoSiNoSeAbre}
      />

      <CodigoRenaserDelAlumno cargar={cargarRadar} />

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
            <Linea>{`Le deja a ${mentor.nombre?.trim() || 'su mentor'} una observación sobre ${nombreVisible} y los días que estás viendo.`}</Linea>
          </>
        ) : null}
        {alAbrirFicha ? (
          <BotonSecundario
            etiqueta="Ver su ficha"
            icono="idCard"
            onPress={alAbrirFicha}
            accessibilityLabel={`Ver la ficha de ${nombreVisible}`}
          />
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
  const rol = rolEnPalabras(datos.rol);
  return (
    <View style={{ gap: 4 }}>
      <View style={estilos.estado}>
        {datos.noSeMide ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22, flexShrink: 1 }]}>
            {rol ? `${rol} · ${PALABRA_NO_SE_MIDE}` : PALABRA_NO_SE_MIDE}
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
      {/* Quien no se mide no trae días: contar sus hábitos daría ceros que parecen incumplimiento. */}
      {datos.resumen && !datos.noSeMide ? (
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
  avisoSiNoSeAbre,
}: {
  lectura: LecturaDeLaSemana;
  nombre: string;
  diaAbierto: string | null;
  alAlternarDia: (fecha: string) => void;
  avisoSiNoSeAbre?: string;
}) {
  const datos = lectura.datos;
  if (datos) {
    return datos.dias.length === 0 ? (
      <Linea>
        {datos.noSeMide
          ? `${nombre} lleva su propio programa y no se mide en el semáforo: no hay días que mostrar.`
          : 'No hay nada que mostrar de estos días.'}
      </Linea>
    ) : (
      <View style={{ gap: 10 }}>
        {datos.dias.map(dia => (
          <DiaDeLaPersona key={dia.fecha} dia={dia} abierto={diaAbierto === dia.fecha} alAlternar={() => alAlternarDia(dia.fecha)} />
        ))}
      </View>
    );
  }
  if (lectura.fallo === 'no_disponible' && avisoSiNoSeAbre) return <Linea>{avisoSiNoSeAbre}</Linea>;
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
