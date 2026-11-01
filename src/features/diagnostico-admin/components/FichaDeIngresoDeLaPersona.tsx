import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { avisar, confirmar } from '../../admin/utils/dialogo';
import { asignarFicha } from '../api/diagnosticoAdminApi';
import { useFichaDeLaPersona } from '../hooks/useFichaDeLaPersona';
import type { FichaDeIngreso } from '../types/diagnosticoAdmin.types';
import { textoDeLaFicha } from '../utils/resumenDeLaFicha';
import { mensajeDeGuardar } from '../utils/textos';
import { TextoDeError } from './piezas';

/**
 * La ficha de ingreso de una persona en su ficha de Administración (spec 026-9): «Estándar» o «Con diagnóstico», con «Asignar el diagnóstico»
 * a quien ya estaba dentro y «Volver a la ficha estándar». Quien decide si se puede es el servidor: si la persona ya respondió, responde
 * 409 con el motivo y acá se dice tal cual. Si el servidor no ofrece la lectura (backend anterior), la sección no se dibuja.
 *
 * Una escritura por toque: la confirmación va antes, y mientras corre el botón queda ocupado.
 */
export function FichaDeIngresoDeLaPersona({
  personaId,
  nombre,
  alCambiar,
}: {
  personaId: string;
  nombre: string;
  /** Quedó cambiada: quien la muestra lo avisa («Listo: …»). */
  alCambiar?: (texto: string) => void;
}) {
  const { c, t } = useTheme();
  const { ficha, estado, disponible, recargar } = useFichaDeLaPersona(personaId);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!disponible || !ficha || !estado) return null;

  const cambiar = async (destino: FichaDeIngreso) => {
    const asignar = destino === 'CON_DIAGNOSTICO';
    const sigue = await confirmar(
      asignar ? `¿Asignar el diagnóstico a ${nombre}?` : '¿Volver a la ficha estándar?',
      asignar
        ? 'Le aparecerá «Completa tu diagnóstico» en Hoy y en Yo; si todavía no entró al programa, lo hará en lugar de la ficha estándar.'
        : `${nombre} dejará de ver el diagnóstico y volverá a la ficha de siempre.`,
      { ok: asignar ? 'Asignar' : 'Volver a la estándar' },
    );
    if (!sigue) return;
    setOcupado(true);
    setError(null);
    try {
      const resultado = await asignarFicha([personaId], destino);
      const omitida = resultado.omitidas.find(o => o.id === personaId) ?? resultado.omitidas[0];
      if (resultado.asignadas === 0 && omitida) {
        tacto.error();
        setError(omitida.motivo);
        avisar(asignar ? 'No se pudo asignar el diagnóstico' : 'No se pudo volver a la ficha estándar', omitida.motivo);
        return;
      }
      tacto.logro();
      alCambiar?.(asignar ? `Listo: ${nombre} tiene el diagnóstico.` : `Listo: ${nombre} volvió a la ficha estándar.`);
      await recargar();
    } catch (e) {
      tacto.error();
      const motivo = mensajeDeGuardar(e, 'No se pudo cambiar la ficha. Vuelve a intentar.');
      setError(motivo);
      avisar(asignar ? 'No se pudo asignar el diagnóstico' : 'No se pudo volver a la ficha estándar', motivo);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <Text accessibilityRole="header" style={[t.body, { color: c.textSoft, fontSize: 16, fontFamily: fuentes.media }]}>
        Ficha de ingreso
      </Text>
      <Text style={[t.body, { color: c.textStrong, fontSize: 17, lineHeight: 24 }]}>{textoDeLaFicha(ficha, estado)}</Text>
      {ficha === 'ESTANDAR' ? (
        <BotonSecundario etiqueta="Asignar el diagnóstico" onPress={() => void cambiar('CON_DIAGNOSTICO')} cargando={ocupado} />
      ) : (
        <BotonSecundario etiqueta="Volver a la ficha estándar" onPress={() => void cambiar('ESTANDAR')} cargando={ocupado} />
      )}
      {error ? <TextoDeError texto={error} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8, width: '100%' },
});
