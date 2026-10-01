import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Checkbox } from '../../../components/Checkbox';
import { BotonPrincipal } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { avisar } from '../../admin/utils/dialogo';
import { registrarObservacion } from '../api/liderMentoresApi';
import type { TipoObservacion } from '../api/liderMentoresSchemas';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { enviarPorChat } from '../utils/irAlChat';
import { VERBO_DE_OBSERVACION } from '../utils/lecturaDeMentores';

const LARGO_MAXIMO = 1000;

const AYUDA: Record<TipoObservacion, string> = {
  RECONOCIMIENTO: 'Lo que hizo bien.',
  SUGERENCIA: 'Lo que podría cambiar.',
  ALERTA: 'Lo que va mal y hay que atender.',
};

/**
 * Registrar una observación sobre un mentor (SDD 002, RL-15/RL-16): un campo, una casilla y un botón.
 *
 * «Enviárselo también por el chat» arranca APAGADA (PL-05). Si está marcada, primero se manda por el
 * chat directo exactamente lo escrito y después se registra con el id del mensaje; si el chat falla, la
 * observación se guarda igual y se dice (RL-16). La clave de operación se fija al abrir la pantalla:
 * un segundo toque o un reintento no crean dos.
 */
export function ObservarScreen({
  mentorId,
  nombre,
  tipo,
  onVolver,
  onGuardada,
}: {
  mentorId: string;
  nombre: string;
  tipo: TipoObservacion;
  onVolver: () => void;
  onGuardada: (aviso: string) => void;
}) {
  const { c } = useTheme();
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
      mensajeEnviado.current = await enviarPorChat(mentorId, texto.trim());
    }
    try {
      await registrarObservacion(mentorId, {
        tipo,
        texto: texto.trim(),
        claveOperacion: clave.current,
        mensajeId: mensajeEnviado.current,
      });
      onGuardada(avisoAlGuardar(enviar, mensajeEnviado.current !== null));
    } catch {
      avisar('No se pudo guardar', 'Revisa tu conexión y vuelve a tocar «Guardar». Lo que escribiste sigue aquí.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <MarcoDelLider titulo={`${VERBO_DE_OBSERVACION[tipo]} a ${nombre}`} onVolver={onVolver}>
      <Linea>{AYUDA[tipo]}</Linea>
      <TextInput
        value={texto}
        onChangeText={setTexto}
        multiline
        maxLength={LARGO_MAXIMO}
        placeholder="Escribe aquí"
        placeholderTextColor={c.textSoft}
        accessibilityLabel={`Texto de la observación para ${nombre}`}
        style={[estilos.campo, { borderColor: c.borderStrong, color: c.textStrong, backgroundColor: c.cardBg }]}
        textAlignVertical="top"
      />
      <Checkbox
        checked={enviar}
        onToggle={setEnviar}
        title="Enviárselo también por el chat"
        subtitle="Le llega como mensaje tuyo, tal como lo escribiste."
      />
      <BotonPrincipal etiqueta="Guardar" onPress={guardar} cargando={guardando} deshabilitado={vacio} />
    </MarcoDelLider>
  );
}

function avisoAlGuardar(queriaEnviar: boolean, seEnvio: boolean): string {
  if (!queriaEnviar) return 'Observación guardada.';
  return seEnvio ? 'Observación guardada y enviada por el chat.' : 'Observación guardada. No se pudo enviar por el chat.';
}

const estilos = StyleSheet.create({
  campo: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontFamily: 'Jost_400Regular',
    fontSize: 16,
    lineHeight: 23,
  },
});
