import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../../components/Alerta';
import { ControlSegmentado } from '../../../../components/ControlSegmentado';
import { Icon } from '../../../../components/Icon';
import { BotonSecundario } from '../../../../components/Legible';
import { BuscadorDeHoja } from '../../../../components/hojaDesdeAbajo/BuscadorDeHoja';
import { useTheme } from '../../../../theme/ThemeContext';
import type { ListaDeAsistencia } from '../../types/asistencia.types';
import { filtrarPorNombre, resumirLista, siguienteLlegada, textoEnLaLista } from '../../utils/asistencia';
import type { ColaDeMarcas } from '../../utils/colaDeMarcas';
import type { Ocurrencia } from '../../types/eventos.types';
import { horaEnZona } from '../../utils/zonaHoraria';
import { BotonVolver, LETRA } from '../piezas';
import type { PersonaDeLaLista, EstadoDeLlegada } from '../../types/asistencia.types';
import { CirculoDeLlegada } from './CirculoDeLlegada';
import { Etiqueta, FilaDePersona, Vacio } from './piezasDeAsistencia';

type Quienes = 'voy' | 'todos';

/**
 * Modo «Pasar lista» (D-256, maqueta 3). Arriba, cuántos llegaron; después «Dijeron «Voy»» / «Todos»,
 * el buscador y una fila por persona con su círculo de 44 px. Abajo, «Cerrar la lista», que pide
 * confirmación (supuesto S-2). Cada toque se guarda al instante (`usePasarLista`).
 */
export function PasarLista({
  oc,
  lista,
  pendientes,
  hayPendientes,
  ocupada,
  ahoraMs,
  onVolver,
  onMarcar,
  onCerrar,
}: {
  oc: Ocurrencia;
  lista: ListaDeAsistencia;
  pendientes: ColaDeMarcas;
  hayPendientes: boolean;
  ocupada: boolean;
  ahoraMs: number;
  onVolver: () => void;
  onMarcar: (persona: PersonaDeLaLista, llegada: EstadoDeLlegada) => void;
  onCerrar: () => void;
}) {
  const { c } = useTheme();
  const zona = oc.evento.zona;
  const [quienes, setQuienes] = useState<Quienes>('voy');
  const [busqueda, setBusqueda] = useState('');
  const resumen = resumirLista(lista.personas);
  const dijeronVoy = useMemo(() => lista.personas.filter(p => p.respuesta === 'GOING'), [lista.personas]);
  const filas = filtrarPorNombre(quienes === 'voy' ? dijeronVoy : lista.personas, busqueda);

  const confirmarCierre = () => {
    const sinMarcar = resumen.faltaron;
    Alert.alert(
      '¿Cerrar la lista?',
      `${resumen.presentes} ${resumen.presentes === 1 ? 'presente' : 'presentes'}. ` +
        (sinMarcar > 0 ? `${sinMarcar} de los que dijeron «Voy» quedan como ausentes. ` : '') +
        'Puedes reabrirla para corregir hasta 12 h después de que termine.',
      [
        { text: 'Seguir pasando lista', style: 'cancel' },
        { text: 'Cerrar la lista', onPress: onCerrar },
      ],
    );
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={estilos.arriba}>
        <BotonVolver etiqueta="Volver al evento" onPress={onVolver} />
        <Etiqueta texto={`En curso · ${horaEnZona(ahoraMs, zona)}`} tono="bien" conPunto />
      </View>

      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
          Pasar lista
        </Text>
        <Text style={[estilos.sub, { color: c.textSoft }]} numberOfLines={1}>
          {oc.titulo} · {horaEnZona(oc.iniciaEn, zona)}
        </Text>
      </View>

      <View style={[estilos.resumen, { backgroundColor: c.cardBg, borderColor: c.border }]} accessibilityLiveRegion="polite">
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: c.textStrong }}>
            <Text style={estilos.numero}>{resumen.presentes}</Text>
            <Text style={estilos.unidad}> {resumen.presentes === 1 ? 'presente' : 'presentes'}</Text>
          </Text>
          <Text style={[estilos.detalle, { color: c.textSoft }]}>
            {resumen.vinieronDeLosQueDijeronVoy} de los {resumen.dijeronVoy} que dijeron «Voy»
            {resumen.sinConfirmar > 0 ? ` · ${resumen.sinConfirmar} sin confirmar` : ''}
            {resumen.tarde > 0 ? ` · ${resumen.tarde} tarde` : ''}
          </Text>
        </View>
        <View style={[estilos.sello, { backgroundColor: c.successWash }]}>
          <Icon name="check" size={24} color={c.success} />
        </View>
      </View>

      <ControlSegmentado<Quienes>
        opciones={[
          { valor: 'voy', etiqueta: `Dijeron «Voy» ${dijeronVoy.length}` },
          { valor: 'todos', etiqueta: `Todos ${lista.personas.length}` },
        ]}
        valor={quienes}
        onCambiar={setQuienes}
        accessibilityLabel="A quiénes mostrar"
      />
      <BuscadorDeHoja valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar por nombre" etiqueta="Buscar por nombre" autoCapitalize="words" />
      <Text style={[estilos.ayuda, { color: c.textSoft }]}>Toca el círculo: a tiempo. Otra vez, o mantén: tarde.</Text>

      <View>
        {filas.length === 0 ? (
          <Vacio>{busqueda.trim() ? `Nadie con «${busqueda.trim()}».` : quienes === 'voy' ? 'Nadie dijo «Voy».' : 'No hay nadie en la lista.'}</Vacio>
        ) : (
          filas.map((p, i) => {
            const reintentando = (pendientes[p.id]?.fallos ?? 0) > 0;
            return (
              <FilaDePersona
                key={p.id}
                nombre={p.nombre}
                avatarUrl={p.avatarUrl}
                linea={textoEnLaLista(p, zona)}
                tonoLinea={p.llegada === 'A_TIEMPO' ? 'bien' : p.llegada === 'TARDE' ? 'oro' : 'suave'}
                segunda={reintentando ? 'Sin conexión: se guarda al volver la red' : null}
                ultima={i === filas.length - 1}
                derecha={
                  <CirculoDeLlegada
                    nombre={p.nombre}
                    llegada={p.llegada}
                    alTocar={() => onMarcar(p, siguienteLlegada(p.llegada))}
                    alMantener={() => onMarcar(p, 'TARDE')}
                  />
                }
              />
            );
          })
        )}
      </View>

      <BotonSecundario
        etiqueta="Cerrar la lista"
        icono="lock"
        cargando={ocupada}
        deshabilitado={hayPendientes}
        onPress={confirmarCierre}
      />
      {hayPendientes ? <Text style={[estilos.ayuda, { color: c.textSoft }]}>Guardando las últimas marcas…</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  arriba: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  titulo: { fontFamily: 'Jost_500Medium', fontSize: LETRA.grande + 2, lineHeight: 30 },
  sub: { fontFamily: 'Jost_400Regular', fontSize: 17, lineHeight: 23 },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 18 },
  numero: { fontFamily: 'Jost_500Medium', fontSize: 34, lineHeight: 40 },
  unidad: { fontFamily: 'Jost_400Regular', fontSize: 18 },
  detalle: { fontFamily: 'Jost_400Regular', fontSize: LETRA.cuerpo, lineHeight: 22 },
  sello: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  ayuda: { fontFamily: 'Jost_400Regular', fontSize: 15, lineHeight: 21 },
});
