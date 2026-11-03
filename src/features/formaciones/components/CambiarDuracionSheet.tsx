import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BotonPrincipal } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { mensajeDeError } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { confirmar } from '../../admin/utils/dialogo';
import { cambiarDuracionDelPrograma, listarFormaciones } from '../api/formacionesApi';
import type { ResumenDeFormacion } from '../types/formaciones.types';
import {
  MOTIVO_DE_DURACION_MAXIMO,
  duracionesPosibles,
  errorDelCambioDeDuracion,
  textoDelCambioDeDuracion,
} from '../utils/borradorDeDuracion';
import { etiquetaDeDuracion } from '../utils/etiquetaDeDuracion';

/**
 * «Cambiar la duración» (spec 025, 025-2 A): Administración pasa el programa de un aprendiz que ya empezó, por ejemplo de 3 meses a 1 año,
 * con un motivo escrito. Conserva su día y solo cambia cuándo termina; queda anotado con quién y por qué. Solo ofrece las duraciones que su
 * formación admite, y el servidor vuelve a comprobarlo (si ya terminó, o si su día no cabe en la nueva, lo dice).
 */
export function CambiarDuracionSheet({
  visible,
  personaId,
  nombre,
  formacion,
  duracionActual,
  alCerrar,
  alCambiar,
}: {
  visible: boolean;
  personaId: string;
  nombre: string;
  formacion: string;
  duracionActual: number;
  alCerrar: () => void;
  /** Quedó cambiada: quien la muestra relee la ficha. */
  alCambiar: (nuevaDuracion: number) => void;
}) {
  const { c, t } = useTheme();
  const [catalogo, setCatalogo] = useState<ResumenDeFormacion[] | null>(null);
  const [duracion, setDuracion] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return undefined;
    let vigente = true;
    setDuracion(null);
    setMotivo('');
    setError(null);
    listarFormaciones().then(
      lista => vigente && setCatalogo(lista.map(tarjeta => tarjeta.resumen)),
      e => vigente && setError(mensajeDeError(e, 'No pudimos leer las duraciones. Revisa tu conexión.')),
    );
    return () => {
      vigente = false;
    };
  }, [visible]);

  const posibles = duracionesPosibles(catalogo?.find(f => f.codigo === formacion), duracionActual);
  const falta = errorDelCambioDeDuracion(duracion, motivo);

  const enviar = async () => {
    if (falta || enviando || duracion === null) return;
    const acepto = await confirmar('¿Cambiar la duración?', textoDelCambioDeDuracion(nombre, duracionActual, duracion), {
      ok: 'Cambiar la duración',
    });
    if (!acepto) return;
    setEnviando(true);
    setError(null);
    try {
      await cambiarDuracionDelPrograma(personaId, duracion, motivo.trim());
      tacto.logro();
      alCambiar(duracion);
      alCerrar();
    } catch (e) {
      tacto.error();
      setError(mensajeDeError(e, 'No pudimos cambiar la duración. Inténtalo de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo="Cambiar la duración"
      subtitulo={nombre}
      tamano="grande"
      etiquetaCerrar="Cerrar sin cambiar la duración"
      pie={
        <View style={estilos.pie}>
          {posibles.length > 0 && falta ? <Text style={[t.small, estilos.aviso, { color: c.textSoft }]}>{falta}</Text> : null}
          {error ? (
            <Text accessibilityRole="alert" style={[t.small, estilos.aviso, { color: c.danger }]}>
              {error}
            </Text>
          ) : null}
          <BotonPrincipal etiqueta="Cambiar la duración" onPress={() => void enviar()} cargando={enviando} deshabilitado={falta !== null || posibles.length === 0} />
        </View>
      }
    >
      <View style={estilos.cuerpo}>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
          {`Hoy dura ${etiquetaDeDuracion(duracionActual)}. Seguirá en el mismo día; solo cambia cuándo termina.`}
        </Text>
        {catalogo !== null && posibles.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Esta formación no ofrece otra duración.</Text>
        ) : null}
        {posibles.length > 0 ? (
          <>
            <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Nueva duración</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Nueva duración" style={estilos.chips}>
              {posibles.map(dias => {
                const marcada = duracion === dias;
                return (
                  <Pressable
                    key={dias}
                    onPress={() => {
                      tacto.seleccion();
                      setDuracion(dias);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: marcada }}
                    accessibilityLabel={`${etiquetaDeDuracion(dias)} (${dias} días)`}
                    style={[estilos.chip, { borderColor: marcada ? c.goldInk : c.border, backgroundColor: marcada ? c.goldWash : 'transparent' }]}
                  >
                    <Text style={[t.body, { color: marcada ? c.goldInk : c.textSoft, fontSize: 16, fontFamily: marcada ? fuentes.negrita : fuentes.regular }]}>
                      {etiquetaDeDuracion(dias)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Motivo</Text>
            <TextInput
              value={motivo}
              onChangeText={setMotivo}
              maxLength={MOTIVO_DE_DURACION_MAXIMO}
              multiline
              placeholder="Por qué se cambia (queda anotado)"
              placeholderTextColor={c.micro}
              accessibilityLabel="Motivo del cambio de duración"
              style={[t.body, estilos.motivo, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
            />
          </>
        ) : null}
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  rotulo: { fontSize: 13, fontFamily: fuentes.negrita },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },
  motivo: { minHeight: 96, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, fontSize: 16, textAlignVertical: 'top' },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  aviso: { fontSize: 15, lineHeight: 21 },
});
