import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonPrincipal } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { confirmar } from '../../admin/utils/dialogo';
import type { SeccionAdmin } from '../types/diagnosticoAdmin.types';
import { mensajeDeGuardar } from '../utils/textos';
import { CampoDeTexto } from './piezas';

/**
 * Crear o editar una sección (un paso de la ficha). La portada es una sección especial: solo se edita su título y su mensaje.
 * Una `HojaDesdeAbajo`; salir con cambios sin guardar pregunta.
 */
export function EditorDeSeccionSheet({
  visible,
  seccion,
  alCerrar,
  alGuardar,
}: {
  visible: boolean;
  /** `null` = sección nueva. */
  seccion: SeccionAdmin | null;
  alCerrar: () => void;
  /** Guarda en el servidor; si lanza, la hoja dice el motivo y sigue abierta. */
  alGuardar: (cuerpo: { titulo: string; descripcion: string | null }) => Promise<void>;
}) {
  const { c, t } = useTheme();
  const esPortada = seccion?.esPortada === true;
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitulo(seccion?.titulo ?? '');
    setDescripcion(seccion?.descripcion ?? '');
    setError(null);
    setIntento(false);
    setGuardando(false);
  }, [visible, seccion]);

  const cambiado = titulo !== (seccion?.titulo ?? '') || descripcion !== (seccion?.descripcion ?? '');
  const falta = !titulo.trim() ? (esPortada ? 'Escribe el título de la portada.' : 'Escribe el título de la sección.') : null;

  const cerrar = async () => {
    if (cambiado && !guardando && !(await confirmar('¿Salir sin guardar?', 'Se pierden los cambios de esta sección.', { ok: 'Salir' }))) return;
    alCerrar();
  };

  const guardar = async () => {
    setIntento(true);
    if (falta) {
      tacto.error();
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await alGuardar({ titulo: titulo.trim(), descripcion: descripcion.trim() ? descripcion.trim() : null });
    } catch (e) {
      tacto.error();
      setError(mensajeDeGuardar(e, 'No se pudo guardar. Vuelve a intentar.'));
    } finally {
      setGuardando(false);
    }
  };

  const nueva = seccion === null;
  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={() => void cerrar()}
      titulo={esPortada ? 'Portada' : nueva ? 'Sección nueva' : 'Editar sección'}
      tamano="grande"
      etiquetaCerrar="Cerrar sin guardar"
      pie={
        <View style={estilos.pie}>
          {error ? (
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
              {error}
            </Text>
          ) : null}
          <BotonPrincipal etiqueta={nueva ? 'Crear sección' : 'Guardar'} onPress={() => void guardar()} cargando={guardando} />
        </View>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo}>
        <CampoDeTexto
          rotulo={esPortada ? 'Título de la portada' : 'Título'}
          value={titulo}
          onChangeText={setTitulo}
          placeholder={esPortada ? 'Ej.: Diagnóstico inicial' : 'Ej.: Conociéndote'}
          error={intento ? falta : null}
          maxLength={120}
          autoCapitalize="sentences"
        />
        <CampoDeTexto
          rotulo={esPortada ? 'Mensaje de la portada' : 'Descripción (opcional)'}
          ayuda={esPortada ? 'Es lo primero que lee la persona. Puedes usar varias líneas.' : 'Una línea que se lee bajo el título del paso.'}
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={esPortada ? 5 : 3}
          maxLength={1000}
          autoCapitalize="sentences"
        />
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 18, paddingHorizontal: 20, paddingBottom: 24 },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
});
