import { fuentes } from '../../../theme/fuentes';
import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Checkbox } from '../../../components/Checkbox';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { BotonPrincipal } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { avisar } from '../../admin/utils/dialogo';
import { registrarObservacion } from '../api/liderMentoresApi';
import type { TipoObservacion } from '../api/liderMentoresSchemas';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { enviarPorChat } from '../utils/irAlChat';
import { VERBO_DE_OBSERVACION } from '../utils/lecturaDeMentores';
import { avisoAlGuardarObservacion, textoParaElChat, type SobreUnaPersona } from '../utils/textoDeObservacion';

const TIPOS: TipoObservacion[] = ['RECONOCIMIENTO', 'SUGERENCIA', 'ALERTA'];

const LARGO_MAXIMO = 1000;

/**
 * Qué escribir en cada tipo. Spec 018: es el texto de relleno del campo y no un renglón aparte encima: el título ya dice
 * si es reconocer, sugerir o alertar, y la ayuda se va sola cuando la persona empieza a escribir.
 */
const AYUDA: Record<TipoObservacion, string> = {
  RECONOCIMIENTO: 'Lo que hizo bien',
  SUGERENCIA: 'Lo que podría cambiar',
  ALERTA: 'Lo que va mal y hay que atender',
};

/**
 * Registrar una observación sobre un mentor (SDD 002, RL-15/RL-16): un campo, una casilla y un botón.
 *
 * «Enviárselo también por el chat» arranca APAGADA (PL-05). Si está marcada, primero se manda por el
 * chat directo exactamente lo escrito y después se registra con el id del mensaje; si el chat falla, la
 * observación se guarda igual y se dice (RL-16). La clave de operación se fija al abrir la pantalla:
 * un segundo toque o un reintento no crean dos.
 *
 * **Sobre una persona** (spec 005, FR-014, «Avisar a su mentor» desde la ficha del líder): con `sobre` la
 * observación es la de siempre —el mismo buzón, las mismas reglas— pero lleva a la persona y la semana
 * (`personId`, `weekStart`), el líder elige si reconoce, sugiere o alerta, y el mensaje que va por el chat
 * empieza con el nombre de la persona. Sin `sobre`, la pantalla es exactamente la de antes.
 */
export function ObservarScreen({
  mentorId,
  nombre,
  tipo,
  onVolver,
  onGuardada,
  sobre,
}: {
  mentorId: string;
  nombre: string;
  /** Con `sobre`, el tipo con que arranca el selector. */
  tipo: TipoObservacion;
  onVolver: () => void;
  onGuardada: (aviso: string) => void;
  sobre?: SobreUnaPersona;
}) {
  const { c } = useTheme();
  const [tipoElegido, setTipoElegido] = useState<TipoObservacion>(tipo);
  const [texto, setTexto] = useState('');
  const [enviar, setEnviar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const clave = useRef(`obs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  /* El mensaje ya enviado no se vuelve a mandar si hay que reintentar el registro. */
  const mensajeEnviado = useRef<string | null>(null);
  const vacio = texto.trim().length === 0;

  const guardar = async () => {
    if (vacio) {
      avisar('Falta el texto', 'Escribe lo que le quieres decir.');
      return;
    }
    setGuardando(true);
    if (enviar && mensajeEnviado.current === null) {
      mensajeEnviado.current = await enviarPorChat(mentorId, textoParaElChat(texto, sobre));
    }
    try {
      await registrarObservacion(mentorId, {
        tipo: tipoElegido,
        texto: texto.trim(),
        claveOperacion: clave.current,
        mensajeId: mensajeEnviado.current,
        sobre: sobre ? { personaId: sobre.personaId, semanaDesde: sobre.semanaDesde } : undefined,
      });
      onGuardada(avisoAlGuardarObservacion(enviar, mensajeEnviado.current !== null));
    } catch {
      avisar('No se pudo guardar', 'Revisa tu conexión y vuelve a tocar «Guardar». Lo que escribiste sigue aquí.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <MarcoDelLider titulo={sobre ? `Avisar a ${nombre}` : `${VERBO_DE_OBSERVACION[tipo]} a ${nombre}`} onVolver={onVolver}>
      {sobre ? (
        <>
          <Linea fuerte>{`Sobre ${sobre.nombre.trim() || 'esta persona'}`}</Linea>
          <ControlSegmentado<TipoObservacion>
            opciones={TIPOS.map(valor => ({ valor, etiqueta: VERBO_DE_OBSERVACION[valor] }))}
            valor={tipoElegido}
            onCambiar={setTipoElegido}
            rol="radio"
            accessibilityLabel="Qué quieres decirle"
          />
        </>
      ) : null}
      <TextInput
        value={texto}
        onChangeText={setTexto}
        multiline
        maxLength={LARGO_MAXIMO}
        placeholder={AYUDA[tipoElegido]}
        placeholderTextColor={c.textSoft}
        accessibilityLabel={`Texto de la observación para ${nombre}`}
        style={[estilos.campo, { borderColor: c.borderStrong, color: c.textStrong, backgroundColor: c.cardBg }]}
        textAlignVertical="top"
      />
      <Checkbox
        checked={enviar}
        onToggle={setEnviar}
        title="Enviárselo también por el chat"
      />
      <BotonPrincipal etiqueta="Guardar" onPress={guardar} cargando={guardando} deshabilitado={vacio} />
    </MarcoDelLider>
  );
}

const estilos = StyleSheet.create({
  campo: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontFamily: fuentes.regular,
    fontSize: 16,
    lineHeight: 23,
  },
});
