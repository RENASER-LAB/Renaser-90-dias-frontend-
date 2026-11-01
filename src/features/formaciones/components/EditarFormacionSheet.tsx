import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Interruptor } from '../../../components/Interruptor';
import { BotonPrincipal } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { guardarFormacion } from '../api/formacionesApi';
import type { ResumenDeFormacion } from '../types/formaciones.types';
import { etiquetaDeDuracion } from '../utils/etiquetaDeDuracion';
import { borradorDeLaFormacion, errorDelBorrador, paraGuardar, type BorradorDeFormacion } from '../utils/borradorDeFormacion';

/**
 * Editar una formación (Administración, spec 022): nombre, descripción, si está disponible y qué duraciones ofrece. Cambiar las
 * duraciones rige solo para quien se acepte o se traslade DESPUÉS: quien ya empezó conserva la suya (FR-004). El servidor guarda
 * con `version`: si otra persona la cambió antes, responde 409 y aquí se dice y se pide revisar.
 *
 * Una `HojaDesdeAbajo` grande con «Guardar» fijo abajo. Los campos validan antes de enviar y el botón dice qué falta.
 */
export function EditarFormacionSheet({
  visible,
  resumen,
  alCerrar,
  alGuardar,
}: {
  visible: boolean;
  resumen: ResumenDeFormacion;
  alCerrar: () => void;
  /** Quedó guardada: quien la muestra relee el detalle y la lista. */
  alGuardar: () => void;
}) {
  const { c, t } = useTheme();
  const [borrador, setBorrador] = useState<BorradorDeFormacion>(() => borradorDeLaFormacion(resumen));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Cada vez que se abre, parte de lo que el servidor tiene ahora (y no de una edición que se dejó a medias). */
  useEffect(() => {
    if (visible) {
      setBorrador(borradorDeLaFormacion(resumen));
      setError(null);
    }
  }, [visible, resumen]);

  const falta = errorDelBorrador(borrador);

  const guardar = async () => {
    if (falta || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await guardarFormacion(resumen.codigo, paraGuardar(borrador, resumen.version));
      tacto.logro();
      alGuardar();
      alCerrar();
    } catch (e) {
      tacto.error();
      setError(
        e instanceof ApiError && e.esConflicto
          ? 'Otra persona cambió esta formación mientras la editabas. Ciérrala y vuelve a abrirla para ver lo último.'
          : mensajeDeError(e, 'No pudimos guardar los cambios. Inténtalo de nuevo.'),
      );
    } finally {
      setGuardando(false);
    }
  };

  const entrada = [t.body, estilos.entrada, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }];

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo={`Editar ${resumen.nombre}`}
      tamano="grande"
      etiquetaCerrar="Cerrar sin guardar"
      pie={
        <View style={estilos.pie}>
          {falta ? <Text style={[t.small, estilos.aviso, { color: c.textSoft }]}>{falta}</Text> : null}
          {error ? (
            <Text accessibilityRole="alert" style={[t.small, estilos.aviso, { color: c.danger }]}>
              {error}
            </Text>
          ) : null}
          <BotonPrincipal etiqueta="Guardar" onPress={() => void guardar()} cargando={guardando} deshabilitado={falta !== null} />
        </View>
      }
    >
      <View style={estilos.cuerpo}>
        <View style={estilos.campo}>
          <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Nombre</Text>
          <TextInput
            value={borrador.nombre}
            onChangeText={nombre => setBorrador(b => ({ ...b, nombre }))}
            maxLength={80}
            accessibilityLabel="Nombre de la formación"
            style={entrada}
          />
        </View>
        <View style={estilos.campo}>
          <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Descripción</Text>
          <TextInput
            value={borrador.descripcion}
            onChangeText={descripcion => setBorrador(b => ({ ...b, descripcion }))}
            maxLength={600}
            multiline
            accessibilityLabel="Descripción de la formación"
            style={[...entrada, estilos.multilinea]}
          />
        </View>
        <View style={estilos.fila}>
          <View style={{ flex: 1, flexShrink: 1 }}>
            <Text style={[t.body, { color: c.textStrong, fontSize: 17 }]}>Disponible</Text>
            <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>
              Apagada, no se acepta ni se traslada a nadie; quien ya está en ella sigue.
            </Text>
          </View>
          <Interruptor valor={borrador.activa} onCambiar={activa => setBorrador(b => ({ ...b, activa }))} etiqueta="Formación disponible" />
        </View>
        <View style={estilos.campo}>
          <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Duraciones que ofrece</Text>
          <View style={estilos.chips}>
            {borrador.opcionesDeDuracion.map(dias => {
              const marcada = borrador.duracionesDias.includes(dias);
              return (
                <Pressable
                  key={dias}
                  onPress={() => {
                    tacto.seleccion();
                    setBorrador(b => ({
                      ...b,
                      duracionesDias: marcada ? b.duracionesDias.filter(d => d !== dias) : [...b.duracionesDias, dias].sort((x, y) => x - y),
                    }));
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marcada }}
                  accessibilityLabel={`${etiquetaDeDuracion(dias)} (${dias} días)`}
                  style={[
                    estilos.chip,
                    { borderColor: marcada ? c.goldInk : c.border, backgroundColor: marcada ? c.goldWash : 'transparent' },
                  ]}
                >
                  <Text style={[t.body, { color: marcada ? c.goldInk : c.textSoft, fontSize: 16, fontFamily: marcada ? fuentes.negrita : fuentes.regular }]}>
                    {marcada ? '✓ ' : ''}
                    {etiquetaDeDuracion(dias)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[t.small, { color: c.textSoft, fontSize: 15 }]}>
            Quien ya empezó conserva su duración; esto rige para quien entre o se traslade después.
          </Text>
        </View>
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 18, paddingHorizontal: 20, paddingBottom: 24 },
  campo: { gap: 6 },
  rotulo: { fontSize: 13, fontFamily: fuentes.negrita },
  entrada: { minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16, width: '100%' },
  multilinea: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  aviso: { fontSize: 15, lineHeight: 21 },
});
