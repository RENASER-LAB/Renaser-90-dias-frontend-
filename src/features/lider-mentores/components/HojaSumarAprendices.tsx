import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonPrincipal } from '../../../components/Legible';
import { mensajeDeError } from '../../../services/http/apiClient';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { sumarAprendicesAlGrupo } from '../api/gruposDelLiderApi';
import { useAprendicesSinGrupo } from '../hooks/useAprendicesSinGrupo';
import { ListaDeAprendicesParaElegir } from './ListaDeAprendicesParaElegir';

/**
 * «+ Aprendices» de un grupo (spec 056 FR-009): los aprendices sin grupo con buscador y casillas; el botón dice cuántos se suman y es la confirmación. Los
 * suma de a uno y se detiene en el primer rechazo del servidor (cupo lleno, otro líder los asignó antes), diciendo cuántos entraron y el motivo. **Un toque, un
 * pedido.** Al terminar —aunque haya entrado solo una parte— la lista del grupo se relee.
 */
export function HojaSumarAprendices({ grupo, alCerrar, onSumados }: { grupo: { id: string; nombre: string } | null; alCerrar: () => void; onSumados: () => void }) {
  const insets = useSafeAreaInsets();
  const visible = grupo !== null;
  const lectura = useAprendicesSinGrupo(visible, grupo?.id ?? '');
  const [elegidos, setElegidos] = useState<ReadonlySet<string>>(new Set());
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);

  useEffect(() => {
    if (visible) setElegidos(new Set());
  }, [grupo?.id, visible]);

  const alternar = (id: string) =>
    setElegidos(previos => {
      const siguientes = new Set(previos);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });

  const sumar = async () => {
    if (!grupo || elegidos.size === 0 || enCurso.current) return;
    enCurso.current = true;
    setGuardando(true);
    try {
      const { sumados, fallo } = await sumarAprendicesAlGrupo(grupo.id, [...elegidos]);
      if (sumados > 0) onSumados();
      if (fallo) {
        const motivo = mensajeDeError(fallo, 'No se pudo sumar. Revisa tu conexión e inténtalo de nuevo.');
        Alert.alert('No se pudo sumar a todos', sumados > 0 ? `Entraron ${sumados} de ${elegidos.size}. ${motivo}` : motivo);
        void lectura.recargar();
        setElegidos(new Set());
      } else {
        alCerrar();
      }
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  const n = elegidos.size;
  return (
    <HojaDesdeAbajo visible={visible} alCerrar={alCerrar} titulo="Sumar aprendices" subtitulo={grupo?.nombre} tamano="grande" etiquetaCerrar="Cerrar sumar aprendices">
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[estilos.cuerpo, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
        {lectura.aprendices ? (
          <ListaDeAprendicesParaElegir aprendices={lectura.aprendices} elegidos={elegidos} onAlternar={alternar} />
        ) : lectura.fallo ? (
          <FalloDeLectura fallo={lectura.fallo} detalle={lectura.detalle} que="los aprendices sin grupo" onReintentar={lectura.recargar} />
        ) : (
          <CargandoLectura texto="Cargando los aprendices…" />
        )}
        <BotonPrincipal etiqueta={n === 0 ? 'Sumar' : `Sumar ${n} ${n === 1 ? 'aprendiz' : 'aprendices'}`} onPress={() => void sumar()} cargando={guardando} deshabilitado={n === 0 || guardando} />
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, gap: 14 },
});
