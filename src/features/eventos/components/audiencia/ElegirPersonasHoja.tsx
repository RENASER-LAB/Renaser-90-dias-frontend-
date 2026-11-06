import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { AvatarPersona } from '../../../../components/ui';
import { HojaDesdeAbajo } from '../../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon } from '../../../../components/Icon';
import { BotonPrincipal, BotonSecundario } from '../../../../components/Legible';
import { Presionable } from '../../../../components/Presionable';
import { fuentes } from '../../../../theme/fuentes';
import { useTheme } from '../../../../theme/ThemeContext';
import { tacto } from '../../../../utils/tacto';
import { buscarPersonas } from '../../api/audienciaApi';
import type { PersonaConvocable } from '../../types/audiencia.types';
import { alternarPersona } from '../../utils/audienciaDelFormulario';
import { Parrafo } from '../piezas';
import { PildorasDePersonas } from './PildorasDePersonas';

/** Cuánto se espera después de la última tecla para preguntar al servidor. */
export const ESPERA_DEL_BUSCADOR_MS = 300;

/**
 * Elegir personas por su nombre (spec 044): un buscador que pregunta al servidor —que solo devuelve a quien esta cuenta puede invitar— con la foto o
 * las iniciales, el nombre y el rol o el grupo de cada uno. Nunca el semáforo (FR-016). Cada lectura toma un turno y solo escribe la última; la
 * página siguiente se pide al acercarse al final.
 */
export function ElegirPersonasHoja({
  visible,
  elegidas,
  formation,
  onListo,
}: {
  visible: boolean;
  elegidas: PersonaConvocable[];
  formation: string | null;
  onListo: (personas: PersonaConvocable[]) => void;
}) {
  const { c } = useTheme();
  const [texto, setTexto] = useState('');
  const [marcadas, setMarcadas] = useState<PersonaConvocable[]>(elegidas);
  const [lista, setLista] = useState<PersonaConvocable[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'fallo'>('cargando');
  const turno = useRef(0);

  useEffect(() => {
    if (visible) setMarcadas(elegidas);
  }, [visible, elegidas]);

  const leer = (pedida: number, reemplazar: boolean) => {
    const mio = ++turno.current;
    setEstado('cargando');
    buscarPersonas(texto, pedida, formation)
      .then(r => {
        if (mio !== turno.current) return;
        setLista(antes => (reemplazar ? r.personas : [...antes, ...r.personas.filter(p => !antes.some(a => a.id === p.id))]));
        setPagina(r.pagina);
        setHayMas(r.hayMas);
        setEstado('listo');
      })
      .catch(() => mio === turno.current && setEstado('fallo'));
  };

  useEffect(() => {
    if (!visible) return;
    const espera = setTimeout(() => leer(0, true), ESPERA_DEL_BUSCADOR_MS);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, texto, formation]);

  const cuantas = marcadas.length;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={() => onListo(marcadas)}
      titulo="Elegir personas"
      tamano="grande"
      bajoElTitulo={
        <View style={{ gap: 10 }}>
          <View style={[estilos.buscar, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
            <Icon name="search" size={20} color={c.textSoft} />
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Buscar por nombre"
              placeholderTextColor={c.tabInactive}
              accessibilityLabel="Buscar por nombre"
              autoCorrect={false}
              style={[estilos.entrada, { color: c.textStrong }]}
            />
          </View>
          <PildorasDePersonas personas={marcadas} onQuitar={p => setMarcadas(m => alternarPersona(m, p))} />
        </View>
      }
      pie={
        <BotonPrincipal
          etiqueta={cuantas === 0 ? 'Listo' : `Listo · ${cuantas} ${cuantas === 1 ? 'persona' : 'personas'}`}
          onPress={() => onListo(marcadas)}
        />
      }
    >
      {estado === 'fallo' && lista.length === 0 ? (
        <View style={estilos.aviso}>
          <Parrafo tono="peligro">No se pudo cargar la lista.</Parrafo>
          <BotonSecundario etiqueta="Reintentar" icono="rotateCcw" onPress={() => leer(0, true)} />
        </View>
      ) : null}
      {estado === 'listo' && lista.length === 0 ? (
        <View style={estilos.aviso}>
          <Parrafo>{texto.trim() ? `Sin resultados para «${texto.trim()}».` : 'Todavía no hay personas que puedas invitar.'}</Parrafo>
        </View>
      ) : null}
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={estilos.lista}
        data={lista}
        keyExtractor={p => p.id}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={() => hayMas && estado !== 'cargando' && leer(pagina + 1, false)}
        renderItem={({ item, index }) => {
          const on = marcadas.some(m => m.id === item.id);
          const detalle = [item.rol, item.grupo].filter(Boolean).join(' · ');
          return (
            <Presionable
              onPress={() => {
                tacto.seleccion();
                setMarcadas(m => alternarPersona(m, item));
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={detalle ? `${item.nombre}, ${detalle}` : item.nombre}
              style={[estilos.fila, index > 0 ? { borderTopWidth: 1, borderTopColor: c.border } : null]}
            >
              <AvatarPersona nombre={item.nombre} avatarUrl={item.fotoUrl} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[estilos.nombre, { color: c.textStrong }]} numberOfLines={1}>
                  {item.nombre}
                </Text>
                {detalle ? <Text style={[estilos.detalle, { color: c.textSoft }]}>{detalle}</Text> : null}
              </View>
              <View style={[estilos.casilla, { borderColor: on ? c.gold : c.borderStrong, backgroundColor: on ? c.gold : 'transparent' }]}>
                {on ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
              </View>
            </Presionable>
          );
        }}
      />
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  // El cuerpo de la hoja no lleva relleno lateral: lo pone cada lista (como «Quién respondió»).
  lista: { paddingHorizontal: 20, paddingBottom: 12 },
  aviso: { gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  buscar: { minHeight: 48, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  entrada: { flex: 1, fontFamily: fuentes.regular, fontSize: 16, minHeight: 48 },
  fila: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  nombre: { fontFamily: fuentes.seminegrita, fontSize: 16, lineHeight: 22 },
  detalle: { fontFamily: fuentes.regular, fontSize: 14, lineHeight: 19 },
  casilla: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
