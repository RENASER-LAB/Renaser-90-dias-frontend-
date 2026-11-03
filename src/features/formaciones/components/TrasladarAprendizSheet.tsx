import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Interruptor } from '../../../components/Interruptor';
import { BotonPrincipal } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { confirmar } from '../../admin/utils/dialogo';
import { listarFormaciones, trasladarAprendiz } from '../api/formacionesApi';
import type { ResumenDeFormacion } from '../types/formaciones.types';
import {
  BORRADOR_DE_TRASLADO_VACIO,
  MOTIVO_MAXIMO,
  destinosPosibles,
  duracionInicial,
  errorDelTraslado,
  paraTrasladar,
  textoDeLaConfirmacion,
  type BorradorDeTraslado,
} from '../utils/borradorDeTraslado';
import { etiquetaDeDuracion } from '../utils/etiquetaDeDuracion';

/**
 * «Pasar a otra formación» (spec 022, historia 7): la hoja para trasladar a un aprendiz. Se pasa en el acto si terminó su formación;
 * si todavía no, solo dándola por terminada con un motivo escrito. Al enviar, su programa empieza de cero en la nueva (día 0, sin
 * grupo ni mentor, 100 puntos) y lo que hizo antes queda en su historial; la confirmación lo dice antes de hacerlo.
 */
export function TrasladarAprendizSheet({
  visible,
  personaId,
  nombre,
  formacionActual,
  alCerrar,
  alTrasladar,
}: {
  visible: boolean;
  personaId: string;
  nombre: string;
  formacionActual: string | null;
  alCerrar: () => void;
  /** Quedó trasladada: quien la muestra relee la ficha. */
  alTrasladar: (destinoNombre: string) => void;
}) {
  const { c, t } = useTheme();
  const [formaciones, setFormaciones] = useState<ResumenDeFormacion[] | null>(null);
  const [borrador, setBorrador] = useState<BorradorDeTraslado>(BORRADOR_DE_TRASLADO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return undefined;
    let vigente = true;
    setBorrador(BORRADOR_DE_TRASLADO_VACIO);
    setError(null);
    listarFormaciones().then(
      lista => vigente && setFormaciones(lista.map(tarjeta => tarjeta.resumen)),
      e => vigente && setError(mensajeDeError(e, 'No pudimos leer las formaciones. Revisa tu conexión.')),
    );
    return () => {
      vigente = false;
    };
  }, [visible]);

  const destinos = destinosPosibles(formaciones ?? [], formacionActual);
  const elegido = destinos.find(d => d.codigo === borrador.destino) ?? null;
  const falta = errorDelTraslado(borrador);

  const enviar = async () => {
    if (falta || enviando || !elegido) return;
    const acepto = await confirmar('¿Pasar de formación?', textoDeLaConfirmacion(nombre, elegido.nombre), {
      ok: 'Pasar de formación',
      destructivo: true,
    });
    if (!acepto) return;
    setEnviando(true);
    setError(null);
    try {
      await trasladarAprendiz(personaId, paraTrasladar(borrador));
      tacto.logro();
      alTrasladar(elegido.nombre);
      alCerrar();
    } catch (e) {
      tacto.error();
      setError(mensajeDeError(e, 'No pudimos pasar a esta persona. Inténtalo de nuevo.'));
      /* «Todavía no terminó»: el servidor lo dice; se abre el motivo para que se pueda darla por terminada. */
      if (e instanceof ApiError && e.esConflicto) setBorrador(b => ({ ...b, darPorTerminada: true }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo="Pasar a otra formación"
      subtitulo={nombre}
      tamano="grande"
      etiquetaCerrar="Cerrar sin pasar de formación"
      pie={
        <View style={estilos.pie}>
          {falta ? <Text style={[t.small, estilos.aviso, { color: c.textSoft }]}>{falta}</Text> : null}
          {error ? (
            <Text accessibilityRole="alert" style={[t.small, estilos.aviso, { color: c.danger }]}>
              {error}
            </Text>
          ) : null}
          <BotonPrincipal etiqueta="Pasar de formación" onPress={() => void enviar()} cargando={enviando} deshabilitado={falta !== null} />
        </View>
      }
    >
      <View style={estilos.cuerpo}>
        <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>¿A cuál pasa?</Text>
        {formaciones === null && !error ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Cargando formaciones…</Text> : null}
        {formaciones !== null && destinos.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>No hay otra formación disponible por ahora.</Text>
        ) : null}
        {destinos.map(destino => {
          const marcada = destino.codigo === borrador.destino;
          return (
            <Pressable
              key={destino.codigo}
              onPress={() => {
                tacto.seleccion();
                setBorrador(b => ({ ...b, destino: destino.codigo, duracionDias: duracionInicial(destino) }));
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: marcada }}
              accessibilityLabel={destino.nombre}
              style={[estilos.opcion, { borderColor: marcada ? c.goldInk : c.border, backgroundColor: marcada ? c.goldWash : c.cardBgAlt }]}
            >
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17, flex: 1 }]}>{destino.nombre}</Text>
              {marcada ? <Text style={[t.body, { color: c.goldInk, fontSize: 17 }]}>✓</Text> : null}
            </Pressable>
          );
        })}

        {elegido ? (
          <>
            <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Duración</Text>
            <View style={estilos.chips}>
              {elegido.duracionesDias.map(dias => {
                const marcada = borrador.duracionDias === dias;
                return (
                  <Pressable
                    key={dias}
                    onPress={() => {
                      tacto.seleccion();
                      setBorrador(b => ({ ...b, duracionDias: dias }));
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

            <View style={estilos.fila}>
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 17 }]}>Darla por terminada</Text>
                <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>
                  Solo hace falta si todavía no terminó su formación actual. Pide un motivo.
                </Text>
              </View>
              <Interruptor
                valor={borrador.darPorTerminada}
                onCambiar={darPorTerminada => setBorrador(b => ({ ...b, darPorTerminada }))}
                etiqueta="Dar por terminada su formación actual"
              />
            </View>
            {borrador.darPorTerminada ? (
              <TextInput
                value={borrador.motivo}
                onChangeText={motivo => setBorrador(b => ({ ...b, motivo }))}
                maxLength={MOTIVO_MAXIMO}
                multiline
                placeholder="Motivo (queda en su historial)"
                placeholderTextColor={c.micro}
                accessibilityLabel="Motivo para darla por terminada"
                style={[t.body, estilos.motivo, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
              />
            ) : null}
          </>
        ) : null}
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  rotulo: { fontSize: 13, fontFamily: fuentes.negrita },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderWidth: 1, borderRadius: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  motivo: { minHeight: 96, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingTop: 12, fontSize: 16, textAlignVertical: 'top' },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  aviso: { fontSize: 15, lineHeight: 21 },
});
