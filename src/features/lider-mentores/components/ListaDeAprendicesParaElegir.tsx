import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Checkbox } from '../../../components/Checkbox';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { AprendizCandidatoApi } from '../../admin/api/adminSchemas';

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es');

/**
 * Los aprendices sin grupo con buscador y casillas (spec 056 FR-008, FR-009). Marcar es solo elegir: quien llama decide qué hacer con la selección.
 * El buscador filtra por nombre, sin tildes ni mayúsculas. «N sin grupo» dice cuántos hay. Sin nadie, una línea, no una lista vacía.
 */
export function ListaDeAprendicesParaElegir({
  aprendices,
  elegidos,
  onAlternar,
}: {
  aprendices: readonly AprendizCandidatoApi[];
  elegidos: ReadonlySet<string>;
  onAlternar: (id: string) => void;
}) {
  const { c, t } = useTheme();
  const [busqueda, setBusqueda] = useState('');
  const visibles = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    return q === '' ? aprendices : aprendices.filter(a => sinTildes(a.fullName ?? '').includes(q));
  }, [aprendices, busqueda]);

  return (
    <View style={estilos.lista}>
      <View style={[estilos.buscador, { backgroundColor: c.cardBg, borderColor: c.border }]}>
        <Icon name="search" size={TAMANO_ICONO.normal} color={c.textSoft} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre"
          placeholderTextColor={c.micro}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Buscar un aprendiz por nombre"
          style={[t.body, estilos.campo, { color: c.text }]}
        />
      </View>
      <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{`${aprendices.length} sin grupo`}</Text>
      {visibles.length === 0 ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{aprendices.length === 0 ? 'No hay aprendices sin grupo.' : 'Nadie con ese nombre.'}</Text>
      ) : (
        visibles.map(a => <Checkbox key={a.userId} checked={elegidos.has(a.userId)} onToggle={() => onAlternar(a.userId)} title={a.fullName?.trim() || 'Aprendiz sin nombre'} />)
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: 10 },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  campo: { flex: 1, fontSize: 16, minHeight: 50 },
});
