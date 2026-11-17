import React, { useState } from 'react';
import { View } from 'react-native';

import { useNotasDelAprendiz } from '../hooks/useNotasDelAprendiz';
import type { OrigenDeLasNotas } from '../api/mentorApi';
import { HojaDeNotas } from './HojaDeNotas';
import { BotonDeNota } from './IconosDeLaCabecera';

/**
 * El lápiz de SOLO LECTURA de las fichas del líder y de Administración (spec 055 FR-024): el mismo ícono con su puntito y la misma hoja,
 * pero sin campo ni botón; ellos leen las notas del acompañamiento y no escriben. Si el servidor no deja leerlas (la persona no es
 * un aprendiz de su alcance, un 403 o un 404), el lápiz no se dibuja: ni hueco ni error en una ficha que sigue sirviendo.
 */
export function NotasDeLectura({ origen, nombre }: { origen: Exclude<OrigenDeLasNotas, { quien: 'mentor' }>; nombre: string }) {
  const notas = useNotasDelAprendiz(origen);
  const [abierta, setAbierta] = useState(false);

  if (notas.fallo && notas.notas.length === 0) return null;
  if (notas.cargando && notas.notas.length === 0) return null;

  return (
    <View style={{ alignSelf: 'flex-end' }}>
      <BotonDeNota nombre={nombre} conNotas={notas.hayNotas} onPress={() => setAbierta(true)} />
      <HojaDeNotas
        visible={abierta}
        alCerrar={() => setAbierta(false)}
        nombre={nombre}
        soloLectura
        notas={notas.notas}
        cargando={notas.cargando}
        fallo={notas.fallo}
        guardando={false}
        falloAlGuardar={null}
        onGuardar={async () => false}
        onCorregir={async () => false}
      />
    </View>
  );
}
