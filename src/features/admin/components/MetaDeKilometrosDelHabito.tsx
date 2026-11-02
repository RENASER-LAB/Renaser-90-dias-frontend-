import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { FormField } from '../../../components/FormField';
import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { fijarLaMetaDeKilometros, leerLaMetaDeKilometros, type MetaDeKilometros } from '../api/metaDeKilometrosApi';
import { faltaParaLaMeta, leerLaMeta, TEXTOS_DE_LA_META, textoDeLaMetaVigente, textoParaElCampo } from '../utils/metaDeKilometros';
import { mensajeDeFallo } from '../utils/mensajes';

/**
 * «Meta diaria de km» dentro de «Hábitos del programa → Kilómetros diarios» (spec 037, D-310). Se guarda aparte del resto del
 * formulario (su propio botón): es un dato del hábito que el servidor lee para ofrecer «Registrar», no un campo más del alta.
 * Solo se dibuja si el servidor responde (un backend anterior responde 404 y la sección no existe).
 */
export function MetaDeKilometrosDelHabito({ habitoId }: { habitoId: string }) {
  const { c, t } = useTheme();
  const [vigente, setVigente] = useState<MetaDeKilometros | null>(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [guardada, setGuardada] = useState<number | null>(null);

  useEffect(() => {
    let vigenteLectura = true;
    setVigente(null);
    leerLaMetaDeKilometros(habitoId)
      .then(meta => {
        if (!vigenteLectura) return;
        setVigente(meta);
        setTexto(textoParaElCampo(meta.meta));
      })
      .catch(() => undefined);
    return () => {
      vigenteLectura = false;
    };
  }, [habitoId]);

  if (!vigente) return null;

  const guardar = async (meta: number | null) => {
    setOcupado(true);
    setError(null);
    try {
      const nueva = await fijarLaMetaDeKilometros(habitoId, meta);
      setVigente(nueva);
      setTexto(textoParaElCampo(nueva.meta));
      tacto.logro();
      setGuardada(Date.now());
    } catch (e) {
      setError(mensajeDeFallo(e, 'No pudimos guardar la meta. Intenta de nuevo.'));
    } finally {
      setOcupado(false);
    }
  };

  const alGuardar = () => {
    const falta = faltaParaLaMeta(texto, vigente.minimo, vigente.maximo);
    if (falta) {
      setError(falta);
      return;
    }
    void guardar(leerLaMeta(texto, vigente.minimo, vigente.maximo));
  };

  return (
    <View style={estilos.seccion}>
      <TituloDeSeccion detalle={TEXTOS_DE_LA_META.detalle}>{TEXTOS_DE_LA_META.titulo}</TituloDeSeccion>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
        {`Ahora: ${textoDeLaMetaVigente(vigente.meta, vigente.esLaPorDefecto)}. ${TEXTOS_DE_LA_META.rige}`}
      </Text>
      <FormField
        label="Km por día"
        value={texto}
        onChangeText={valor => {
          setTexto(valor);
          setError(null);
        }}
        keyboardType="decimal-pad"
        inputMode="decimal"
        error={error ?? undefined}
        editable={!ocupado}
        accessibilityLabel={TEXTOS_DE_LA_META.titulo}
      />
      {guardada ? <ConfirmacionEnLinea key={guardada} texto={TEXTOS_DE_LA_META.guardada} onTerminar={() => setGuardada(null)} /> : null}
      <BotonSecundario etiqueta={TEXTOS_DE_LA_META.guardar} onPress={alGuardar} cargando={ocupado} deshabilitado={ocupado} />
      {!vigente.esLaPorDefecto ? (
        <BotonSecundario
          etiqueta={TEXTOS_DE_LA_META.volverALaDelPrograma}
          onPress={() => void guardar(null)}
          deshabilitado={ocupado}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: 10 },
});
