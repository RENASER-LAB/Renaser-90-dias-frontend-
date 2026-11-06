import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { FormField } from '../../../components/FormField';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { ApiError } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { cambiarSobrenombreDeLaPersona, quitarSobrenombreDeLaPersona, sobrenombreDeLaPersona } from '../api/sobrenombreApi';
import { MENSAJE_DEL_PROBLEMA, limpiarSobrenombre, problemaDeLaForma } from '../utils/reglasDelSobrenombre';

/**
 * Spec 046 (US5): en la ficha de una persona (Administración y Alquimista), su sobrenombre en el Muro con «Cambiar» y «Quitar». Los dos
 * piden un motivo (queda en la constancia; a la persona se le avisa sin él, D7). Sin permiso o con un servidor anterior, no se dibuja.
 */
export function SobrenombreDeLaPersona({ personaId, alCambiar }: { personaId: string; alCambiar?: (aviso: string) => void }) {
  const { c, t } = useTheme();
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'oculto'>('cargando');
  const [actual, setActual] = useState<string | null>(null);
  const [editando, setEditando] = useState<'cambiar' | 'quitar' | null>(null);
  const [nuevo, setNuevo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    sobrenombreDeLaPersona(personaId)
      .then(s => {
        if (!vigente) return;
        setActual(s);
        setEstado('listo');
      })
      .catch(() => vigente && setEstado('oculto'));
    return () => {
      vigente = false;
    };
  }, [personaId]);

  const guardar = useCallback(async () => {
    if (guardando) return;
    const limpio = limpiarSobrenombre(nuevo);
    if (editando === 'cambiar' && problemaDeLaForma(limpio)) {
      setError(MENSAJE_DEL_PROBLEMA[problemaDeLaForma(limpio)!]);
      tacto.error();
      return;
    }
    if (motivo.trim().length < 3) {
      setError('Escribe el motivo (3 letras o más).');
      tacto.error();
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      if (editando === 'quitar') {
        await quitarSobrenombreDeLaPersona(personaId, motivo.trim());
        setActual(null);
        alCambiar?.('Sobrenombre quitado. Se le avisó a la persona.');
      } else {
        const s = await cambiarSobrenombreDeLaPersona(personaId, limpio, motivo.trim());
        setActual(s);
        alCambiar?.('Sobrenombre cambiado. Se le avisó a la persona.');
      }
      tacto.logro();
      setEditando(null);
      setNuevo('');
      setMotivo('');
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }, [guardando, nuevo, editando, motivo, personaId, alCambiar]);

  if (estado !== 'listo') return null;

  return (
    <View style={{ gap: 10, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, backgroundColor: c.cardBg }} testID="sobrenombre-de-la-persona">
      <Text style={[t.small, { color: c.textSoft, fontFamily: fuentes.negrita }]}>Sobrenombre en el Muro</Text>
      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>{actual ?? 'Sin sobrenombre'}</Text>
      {editando === null ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <BotonSecundario etiqueta={actual ? 'Cambiar' : 'Ponerle uno'} onPress={() => setEditando('cambiar')} />
          {actual ? <BotonSecundario etiqueta="Quitar" onPress={() => setEditando('quitar')} /> : null}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {editando === 'cambiar' ? (
            <FormField label="Nuevo sobrenombre" value={nuevo} onChangeText={setNuevo} placeholder="Ej.: Fénix de Arequipa" maxLength={25} />
          ) : null}
          <FormField label="Motivo" value={motivo} onChangeText={setMotivo} placeholder="Ej.: lo pidió por soporte" maxLength={200} />
          {error ? <Text style={[t.body, { color: c.danger, fontSize: 15 }]}>{error}</Text> : null}
          <BotonPrincipal etiqueta={guardando ? 'Guardando…' : editando === 'quitar' ? 'Quitar el sobrenombre' : 'Guardar'} onPress={() => void guardar()} />
          <BotonSecundario etiqueta="Cancelar" onPress={() => { setEditando(null); setError(null); }} />
        </View>
      )}
    </View>
  );
}
