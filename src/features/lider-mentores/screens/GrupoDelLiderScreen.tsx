import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { AvatarConSemaforo } from '../../mentor/components/AvatarConSemaforo';
import { CargandoLectura } from '../../semaforo/components/EstadoDeLectura';
import type { InicioSemanal } from '../../semaforo/hooks/useLecturaPorSemana';
import type { AprendizDelSemaforo, GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import { ContadoresPorColor } from '../components/ContadoresPorColor';
import { EstadoConForma } from '../components/EstadoConForma';
import { HojaElegirMentor } from '../components/HojaElegirMentor';
import { HojaSumarAprendices } from '../components/HojaSumarAprendices';
import { LecturaFallida } from '../components/LecturaFallida';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { useGrupoDelLider } from '../hooks/useGrupoDelLider';
import { estadoDelGrupo, filasDelGrupo } from '../utils/grupoDelLider';

/**
 * Un grupo para el líder (spec 056 historia 3, FR-011 a FR-013), el «Mi grupo» de la 055 sin las flechas de semana:
 *
 * - **Cabecera**: su nombre, su mentor y su estado con forma y una frase corta («Grupo en rojo · 0 % en 7 días»).
 * - **Cuatro contadores** con forma (rojo, ámbar, verde, sin datos) y, debajo, los aprendices en el orden de la 055: cada uno con el borde de su color en la foto,
 *   su estado con forma y una línea con su motivo y su porcentaje. Los colores y los porcentajes son los del servidor: la app no los recalcula.
 * - **«+ Aprendices»** y **«Cambiar mentor»**: cada cambio se confirma en su hoja antes de guardarse; al guardar, el grupo se relee.
 *
 * Un grupo sin aprendices lo dice en una línea. Un solo scroll (`MarcoDelLider`); el atrás vuelve a donde se abrió.
 */
export function GrupoDelLiderScreen({
  grupoId,
  nombre,
  mentorId,
  mentorNombre,
  resumen,
  inicio,
  onVolver,
  onAbrirPersona,
  onCambiado,
  onMentorCambiado,
}: {
  grupoId: string;
  /** El de la fila que se tocó: está a la vista antes de que llegue la lista. */
  nombre: string;
  mentorId: string | null;
  mentorNombre: string | null;
  /** Lo que el resumen por grupos dice de este grupo (su color y su promedio); `null` si no se pudo leer: la cabecera dice «sin datos». */
  resumen: Pick<GrupoDelResumen, 'colorDelPromedio' | 'promedio'> | null;
  /** Los 7 días que se estaban mirando (el resumen por grupos manda en todo, 2026-10-19); sin ellos, los vigentes. */
  inicio?: InicioSemanal;
  onVolver: () => void;
  onAbrirPersona: (persona: AprendizDelSemaforo) => void;
  /** El mentor o los aprendices del grupo cambiaron: quien lo abrió relee sus listas. */
  onCambiado?: () => void;
  /** El grupo tiene otro mentor (el que el servidor acaba de aceptar): quien lo abrió lo recuerda, para que al volver a esta pantalla no se lea el anterior. */
  onMentorCambiado?: (mentor: { id: string; nombre: string }) => void;
}) {
  const { c } = useTheme();
  const lectura = useGrupoDelLider(grupoId, inicio);
  const [hoja, setHoja] = useState<'mentor' | 'aprendices' | null>(null);
  /* Lo que se dice del mentor: lo que trajo quien abrió el grupo hasta que se le asigna otro; entonces, el que el servidor confirmó (la cabecera no vuelve al anterior). */
  const [mentor, setMentor] = useState<{ id: string | null; nombre: string | null }>({ id: mentorId, nombre: mentorNombre });
  const datos = lectura.datos;
  const filas = datos ? filasDelGrupo(datos.aprendices) : [];
  const { estado, frase } = estadoDelGrupo(resumen);
  const cuenta = datos?.resumen ?? null;

  const cambio = () => {
    lectura.recargar();
    onCambiado?.();
  };
  const cambioElMentor = (nuevo: { id: string; nombre: string }) => {
    setMentor(nuevo);
    onMentorCambiado?.(nuevo);
    cambio();
  };

  return (
    <>
      <MarcoDelLider titulo={datos?.grupoNombre?.trim() || nombre} onVolver={onVolver}>
        {mentor.nombre ? <Linea>{`Mentor: ${mentor.nombre}`}</Linea> : null}
        <View style={estilos.estado} accessible accessibilityLabel={frase}>
          <EstadoConForma estado={estado} tamano={20} />
          <Text style={[estilos.frase, { color: c.textStrong }]}>{frase}</Text>
        </View>

        {cuenta ? <ContadoresPorColor rojo={cuenta.rojo} ambar={cuenta.amarillo} verde={cuenta.verde} sinDatos={cuenta.sinDatos} variante="tarjetas" /> : null}

        {datos ? (
          filas.length === 0 ? (
            <Linea>Este grupo todavía no tiene aprendices.</Linea>
          ) : (
            <View style={estilos.lista}>
              {filas.map(fila => (
                <FilaDelAprendiz key={fila.persona.aprendizId} fila={fila} onAbrir={() => onAbrirPersona(fila.persona)} />
              ))}
            </View>
          )
        ) : lectura.fallo ? (
          <LecturaFallida fallo={lectura.fallo} detalle={lectura.detalleDelFallo} que="los aprendices del grupo" onReintentar={lectura.recargar} />
        ) : (
          <CargandoLectura texto="Cargando el grupo…" />
        )}

        <View style={estilos.botones}>
          <BotonSecundario etiqueta="+ Aprendices" onPress={() => setHoja('aprendices')} accessibilityLabel="Sumar aprendices al grupo" estilo={estilos.boton} />
          <BotonSecundario etiqueta="Cambiar mentor" onPress={() => setHoja('mentor')} estilo={estilos.boton} />
        </View>
      </MarcoDelLider>
      <HojaSumarAprendices grupo={hoja === 'aprendices' ? { id: grupoId, nombre } : null} alCerrar={() => setHoja(null)} onSumados={cambio} />
      <HojaElegirMentor grupo={hoja === 'mentor' ? { id: grupoId, nombre, mentorId: mentor.id } : null} alCerrar={() => setHoja(null)} onAsignado={cambioElMentor} />
    </>
  );
}

function FilaDelAprendiz({ fila, onAbrir }: { fila: ReturnType<typeof filasDelGrupo>[number]; onAbrir: () => void }) {
  const { c, t } = useTheme();
  const nombre = fila.persona.nombre?.trim() || 'Aprendiz sin nombre';
  return (
    <Presionable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`Abrir la ficha de ${nombre}. ${fila.linea}`}
      style={[estilos.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}
    >
      <AvatarConSemaforo nombre={fila.persona.nombre} avatarUrl={fila.persona.avatarUrl} color={fila.color} size={40} />
      <View style={estilos.textos}>
        <Text style={[t.body, { color: c.text, fontSize: 16 }]} numberOfLines={1}>
          {nombre}
        </Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 19 }]} numberOfLines={2}>
          {fila.linea}
        </Text>
      </View>
      <EstadoConForma estado={fila.estado} tamano={20} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  estado: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  frase: { fontFamily: fuentes.seminegrita, fontSize: 17, lineHeight: 23 },
  lista: { gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  textos: { flex: 1, minWidth: 0, gap: 1 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boton: { flexGrow: 1, flexBasis: 150 },
});
