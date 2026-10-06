import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Alert } from '../../../../components/Alerta';
import { ControlSegmentado } from '../../../../components/ControlSegmentado';
import { BotonSecundario } from '../../../../components/Legible';
import { BuscadorDeHoja } from '../../../../components/hojaDesdeAbajo/BuscadorDeHoja';
import { HojaDesdeAbajo } from '../../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import * as asistenciaApi from '../../api/asistenciaApi';
import type { PersonaQueRespondio, RespuestasDelEvento } from '../../types/asistencia.types';
import {
  agruparRespuestas,
  filtrarPorNombre,
  respuestaAnterior,
  respuestasParaCompartir,
  textoDeAntes,
  textoDeRespuesta,
} from '../../utils/asistencia';
import { fechaYHora } from '../../utils/textosDeFecha';
import { FilaDePersona, Vacio } from './piezasDeAsistencia';

type Grupo = 'van' | 'noVan' | 'sinRespuesta';

const VACIO: Record<Grupo, string> = {
  van: 'Nadie dijo «Voy» todavía.',
  noVan: 'Nadie dijo «No voy».',
  sinRespuesta: 'Todos respondieron.',
};

/**
 * Hoja «Quién respondió» (D-256, maqueta 2): Van / No van / Sin respuesta, con buscador, cuándo dijo
 * cada uno y, si cambió de idea desde que existe el historial, qué había dicho antes. «Compartir la
 * lista» abre el menú del teléfono con el texto (supuesto S-6: sin librerías nuevas).
 */
export function HojaQuienRespondio({
  visible,
  alCerrar,
  eventoId,
  inicioOcurrencia,
  titulo,
  iniciaEn,
  zona,
}: {
  visible: boolean;
  alCerrar: () => void;
  eventoId: string;
  inicioOcurrencia: string;
  titulo: string;
  iniciaEn: string;
  zona: string | null;
}) {
  const insets = useSafeAreaInsets();
  const [datos, setDatos] = useState<RespuestasDelEvento | null>(null);
  const [fallo, setFallo] = useState(false);
  const [grupo, setGrupo] = useState<Grupo>('van');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (!visible) return;
    let vivo = true;
    setFallo(false);
    asistenciaApi
      .verRespuestas(eventoId, inicioOcurrencia)
      .then(r => vivo && setDatos(r))
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
    };
  }, [visible, eventoId, inicioOcurrencia]);

  const grupos = useMemo(() => agruparRespuestas(datos?.personas ?? []), [datos]);
  const filas = useMemo(() => filtrarPorNombre(grupos[grupo], busqueda), [grupos, grupo, busqueda]);

  const compartir = async () => {
    if (!datos) return;
    try {
      await Share.share({ message: respuestasParaCompartir(titulo, iniciaEn, zona, datos.personas) });
    } catch {
      Alert.alert('No se pudo compartir', 'Intenta de nuevo en unos segundos.');
    }
  };

  const vacio = !datos ? (fallo ? 'No se pudo leer quién respondió. Revisa tu conexión.' : 'Cargando…') : busqueda.trim()
    ? `Nadie con «${busqueda.trim()}».`
    : VACIO[grupo];

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo="Quién respondió"
      subtitulo={fechaYHora(iniciaEn, zona)}
      tamano="grande"
      etiquetaCerrar="Cerrar quién respondió"
      bajoElTitulo={
        <View style={{ gap: 12 }}>
          <ControlSegmentado<Grupo>
            opciones={[
              { valor: 'van', etiqueta: `Van ${grupos.van.length}` },
              { valor: 'noVan', etiqueta: `No van ${grupos.noVan.length}` },
              { valor: 'sinRespuesta', etiqueta: `Sin respuesta ${grupos.sinRespuesta.length}` },
            ]}
            valor={grupo}
            onCambiar={setGrupo}
            accessibilityLabel="Qué respuesta ver"
          />
          <BuscadorDeHoja valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar por nombre" etiqueta="Buscar por nombre" autoCapitalize="words" />
        </View>
      }
      pie={<BotonSecundario etiqueta="Compartir la lista" icono="share" deshabilitado={!datos} onPress={() => void compartir()} />}
    >
      <FlatList
        data={filas}
        keyExtractor={p => p.id}
        renderItem={({ item, index }) => <FilaRespuesta persona={item} zona={zona} ultima={index === filas.length - 1} />}
        ListEmptyComponent={<Vacio>{vacio}</Vacio>}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) }}
        initialNumToRender={12}
      />
    </HojaDesdeAbajo>
  );
}

function FilaRespuesta({ persona, zona, ultima }: { persona: PersonaQueRespondio; zona: string | null; ultima: boolean }) {
  const antes = respuestaAnterior(persona);
  return (
    <FilaDePersona
      nombre={persona.nombre}
      avatarUrl={persona.avatarUrl}
      linea={textoDeRespuesta(persona, zona)}
      segunda={antes ? textoDeAntes(antes, zona) : null}
      ultima={ultima}
    />
  );
}
