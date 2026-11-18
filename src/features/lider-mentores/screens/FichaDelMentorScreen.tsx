import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { BotonSecundario } from '../../../components/Legible';
import { tacto } from '../../../utils/tacto';
import { FichaDePersona } from '../../mentor/components/FichaDePersona';
import type { OrigenDeLaFicha } from '../../mentor/utils/lecturasDeLaFicha';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { obtenerFicha } from '../api/liderMentoresApi';
import type { TipoObservacion } from '../api/liderMentoresSchemas';
import { BotonDeEstrella } from '../components/BotonDeEstrella';
import { BotonDescargarSemana } from '../components/BotonDescargarSemana';
import { ComoMentor } from '../components/ComoMentor';
import { HojaDeTexto } from '../components/HojaDeTexto';
import { HojaProgramarSesion } from '../components/HojaProgramarSesion';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { useLecturaDelLider } from '../hooks/useLecturaDelLider';
import { useObservarAlMentor } from '../hooks/useObservarAlMentor';
import type { MentorDeLasConsultas } from '../utils/consultasDelLider';
import { subtituloDelMentor } from '../utils/datosDelMentor';
import { VERBO_DE_OBSERVACION } from '../utils/lecturaDeMentores';
import { personaParaLaFicha } from '../utils/personaParaLaFicha';

const TIPOS: TipoObservacion[] = ['RECONOCIMIENTO', 'SUGERENCIA', 'ALERTA'];
const AYUDA_DEL_CAMPO: Record<TipoObservacion, string> = {
  RECONOCIMIENTO: 'Lo que hizo bien',
  SUGERENCIA: 'Lo que podría cambiar',
  ALERTA: 'Lo que va mal y hay que atender',
};
const GUARDADA: Record<TipoObservacion, string> = {
  RECONOCIMIENTO: 'Reconocimiento guardado.',
  SUGERENCIA: 'Sugerencia guardada.',
  ALERTA: 'Alerta guardada.',
};

/**
 * La ficha de un mentor para el líder (spec 056 historia 2, FR-021 a FR-026): **la misma ficha del aprendiz** con los datos del mentor —su semana, sus
 * días por pilar, sus evidencias, sus objetivos, su 80/20— y, debajo, lo suyo como mentor («Como mentor») con el mismo estilo plegable.
 *
 * - En la cabecera, en lugar del lápiz de las notas, una estrella que abre «Reconocer, sugerir o alertar»; el chat sigue.
 * - Si no sigue su programa, en lugar de la semana y los pilares va una línea que lo dice. Si su cuenta está suspendida, la ficha solo dice eso.
 * - Al pie: «Descargar semana», «Alertar» y «Programar sesión». Lo que se le dice le llega al mentor como aviso y como mensaje en su chat con el líder:
 *   lo manda el servidor, y «Lo que le dijiste» se relee al guardar.
 * - «Consultas» abre la bandeja filtrada a este mentor (`onAbrirConsultas` recibe su id, su nombre y los grupos que acompaña).
 */
export function FichaDelMentorScreen({
  mentorId,
  nombre,
  rotuloDeVolver = 'Mis mentores',
  onVolver,
  onAbrirGrupo,
  onAbrirConsultas,
}: {
  mentorId: string;
  /** El de la fila que se tocó: está a la vista antes de que llegue la ficha. */
  nombre: string;
  rotuloDeVolver?: string;
  onVolver: () => void;
  onAbrirGrupo: (grupoId: string, nombre: string) => void;
  onAbrirConsultas: (mentor: MentorDeLasConsultas) => void;
}) {
  const pedir = useCallback(() => obtenerFicha(mentorId), [mentorId]);
  const lectura = useLecturaDelLider(pedir, mentorId);
  const ficha = lectura.datos;
  const { guardando, guardar } = useObservarAlMentor(mentorId);
  const [hoja, setHoja] = useState<{ tipo: TipoObservacion } | null>(null);
  const [programando, setProgramando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);

  const origen = useMemo<OrigenDeLaFicha>(() => ({ quien: 'lider', grupoId: null }), []);
  const nombreVisible = ficha?.mentor.fullName ?? nombre;
  const alumno = useMemo(() => personaParaLaFicha(mentorId, nombreVisible), [mentorId, nombreVisible]);
  /* Los grupos que el servidor dice que acompaña: con ellos la bandeja reconoce a sus aprendices. Si no se pudieron leer, vacío (se filtra por su nombre). */
  const grupoIds = useMemo(() => (ficha?.mentor.groups.source === 'OK' ? (ficha.mentor.groups.items ?? []).map(g => g.id) : []), [ficha]);

  if (!ficha) {
    return (
      <MarcoDelLider titulo={nombre} onVolver={onVolver}>
        {lectura.fallo ? (
          <FalloDeLectura fallo={lectura.fallo} detalle={lectura.detalle} que="la ficha del mentor" onReintentar={lectura.recargar} />
        ) : (
          <CargandoLectura texto="Cargando la ficha…" />
        )}
      </MarcoDelLider>
    );
  }

  if (!ficha.accountActive) {
    return (
      <MarcoDelLider titulo={nombreVisible} onVolver={onVolver}>
        <Linea fuerte>Su cuenta está suspendida.</Linea>
      </MarcoDelLider>
    );
  }

  const tipoElegido = hoja?.tipo ?? 'ALERTA';
  const enviar = async (texto: string) => {
    const salio = await guardar(tipoElegido, texto);
    if (salio) {
      setHoja(null);
      setConfirmacion(GUARDADA[tipoElegido]);
      tacto.logro();
      lectura.recargar();
    }
    return salio;
  };

  return (
    <>
      <FichaDePersona
        origen={origen}
        alumno={alumno}
        onVolver={onVolver}
        rotuloDeVolver={rotuloDeVolver}
        onYaNoAcompana={() => undefined}
        sinNotas
        subtitulo={subtituloDelMentor(ficha)}
        accionesDeCabecera={<BotonDeEstrella nombre={nombreVisible} onPress={() => setHoja({ tipo: 'RECONOCIMIENTO' })} />}
        sinSemana={ficha.haceSuPrograma === false ? <Linea>No sigue su propio programa.</Linea> : undefined}
        despues={<ComoMentor ficha={ficha} onAbrirGrupo={onAbrirGrupo} onAbrirConsultas={() => onAbrirConsultas({ id: mentorId, nombre: nombreVisible, grupoIds })} onDecirle={() => setHoja({ tipo: 'RECONOCIMIENTO' })} />}
        pie={({ semanaHasta }) => (
          <View style={estilos.botones}>
            {confirmacion ? <ConfirmacionEnLinea texto={confirmacion} onTerminar={() => setConfirmacion(null)} /> : null}
            <BotonDescargarSemana documento={{ tipo: 'MENTOR', personaId: mentorId }} semanaHasta={semanaHasta} />
            <BotonSecundario etiqueta="Alertar" icono="alertTriangle" onPress={() => setHoja({ tipo: 'ALERTA' })} accessibilityLabel="Alertar" />
            <BotonSecundario etiqueta="Programar sesión" icono="calendar" onPress={() => setProgramando(true)} />
          </View>
        )}
      />
      <HojaDeTexto
        visible={hoja !== null}
        alCerrar={() => setHoja(null)}
        titulo="Reconocer, sugerir o alertar"
        subtitulo={`A ${nombreVisible}`}
        etiquetaDelCampo="Lo que le quieres decir"
        placeholder={AYUDA_DEL_CAMPO[tipoElegido]}
        etiquetaDelBoton="Guardar"
        enviando={guardando}
        onEnviar={enviar}
        arriba={
          <ControlSegmentado<TipoObservacion>
            opciones={TIPOS.map(valor => ({ valor, etiqueta: VERBO_DE_OBSERVACION[valor] }))}
            valor={tipoElegido}
            onCambiar={tipo => setHoja({ tipo })}
            rol="radio"
            accessibilityLabel="Qué quieres decirle"
          />
        }
      />
      <HojaProgramarSesion visible={programando} alCerrar={() => setProgramando(false)} mentor={{ id: mentorId, nombre: nombreVisible }} onProgramada={() => setConfirmacion('Sesión programada.')} />
    </>
  );
}

const estilos = StyleSheet.create({
  botones: { gap: 12 },
});
