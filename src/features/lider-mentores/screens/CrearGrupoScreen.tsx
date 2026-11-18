import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { FormField } from '../../../components/FormField';
import { BotonPrincipal, TituloDeSeccion } from '../../../components/Legible';
import { mensajeDeError } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { CargandoLectura } from '../../semaforo/components/EstadoDeLectura';
import { obtenerPadron } from '../api/liderMentoresApi';
import type { IndicadoresApi } from '../api/liderMentoresSchemas';
import { asignarMentorDelLider, crearGrupoDelLider, sumarAprendicesAlGrupo } from '../api/gruposDelLiderApi';
import { LecturaFallida } from '../components/LecturaFallida';
import { ListaDeAprendicesParaElegir } from '../components/ListaDeAprendicesParaElegir';
import { ListaDeMentoresParaElegir } from '../components/ListaDeMentoresParaElegir';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { useAprendicesSinGrupo } from '../hooks/useAprendicesSinGrupo';
import { useGruposDelLider } from '../hooks/useGruposDelLider';
import { useLecturaDelLider } from '../hooks/useLecturaDelLider';
import { cohorteParaCrear, nombreYaUsado } from '../utils/gruposDelLider';

const LARGO_MAXIMO_DEL_NOMBRE = 60;
type Paso = 1 | 2 | 3 | 4;

/**
 * «Crear grupo» (spec 056 historia 4, FR-008, SC-003): un asistente de tres pasos con **una decisión por pantalla** y un resumen para confirmar antes de crear.
 *
 * 1. **Nombre**: obligatorio y que no se repita con otro grupo de sus formaciones (el campo lo dice antes de avanzar).
 * 2. **Mentor**: cada uno con el anillo de su cupo; los que tienen el cupo lleno, apagados y sin poder elegirse.
 * 3. **Aprendices** sin grupo, con buscador y casillas (pueden ser ninguno).
 * 4. **Resumen** con el nombre, el mentor y los aprendices; al aceptar se crea el grupo, se le pone el mentor y se suman los aprendices.
 *
 * El atrás del sistema y la flecha suben un paso por vez (FR-046); desde el primer paso salen del asistente. El grupo nace en la generación activa de sus
 * formaciones. **Un toque, un pedido.** Si el grupo se creó pero el mentor o algún aprendiz no entró, se dice qué falta y el líder lo termina en el grupo.
 */
export function CrearGrupoScreen({ onVolver, onCreado }: { onVolver: () => void; onCreado: (grupo: { id: string; nombre: string }) => void }) {
  const { c, t } = useTheme();
  const grupos = useGruposDelLider();
  const padron = useLecturaDelLider(obtenerPadron, 'padron-crear');
  const [paso, setPaso] = useState<Paso>(1);
  const [nombre, setNombre] = useState('');
  const [falta, setFalta] = useState<string | null>(null);
  const [mentor, setMentor] = useState<IndicadoresApi | null>(null);
  const [elegidos, setElegidos] = useState<ReadonlySet<string>>(new Set());
  const [creando, setCreando] = useState(false);
  const enCurso = useRef(false);
  const sinGrupo = useAprendicesSinGrupo(paso >= 3, 'crear');

  const destino = grupos.grupos ? cohorteParaCrear(grupos.grupos) : null;
  const atras = () => (paso > 1 ? setPaso((paso - 1) as Paso) : onVolver());

  const avanzarDelNombre = () => {
    const limpio = nombre.trim();
    if (!limpio) return setFalta('Pon un nombre para el grupo.');
    if (grupos.grupos && nombreYaUsado(limpio, grupos.grupos)) return setFalta('Ya hay un grupo con ese nombre.');
    setFalta(null);
    setPaso(2);
  };

  const alternar = (id: string) =>
    setElegidos(previos => {
      const siguientes = new Set(previos);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });

  const nombresElegidos = (sinGrupo.aprendices ?? []).filter(a => elegidos.has(a.userId)).map(a => a.fullName?.trim() || 'Aprendiz sin nombre');

  const crear = async () => {
    if (enCurso.current || !destino || !mentor) return;
    enCurso.current = true;
    setCreando(true);
    try {
      let creado: { id: string };
      try {
        creado = await crearGrupoDelLider({ nombre, cohorteId: destino.cohorteId, formacion: destino.formacion });
      } catch (e) {
        Alert.alert('No se pudo crear el grupo', mensajeDeError(e, 'Revisa tu conexión e inténtalo de nuevo.'));
        return;
      }
      const pendientes: string[] = [];
      try {
        await asignarMentorDelLider({ id: creado.id, nombre: nombre.trim(), mentorId: null }, { userId: mentor.userId, fullName: mentor.fullName, grupos: (mentor.groups.items ?? []).map(g => g.id) });
      } catch (e) {
        pendientes.push(`No se pudo asignar a ${mentor.fullName}: ${mensajeDeError(e, 'inténtalo de nuevo desde el grupo.')}`);
      }
      if (elegidos.size > 0) {
        const { sumados, fallo } = await sumarAprendicesAlGrupo(creado.id, [...elegidos]);
        if (fallo) pendientes.push(`Entraron ${sumados} de ${elegidos.size} aprendices: ${mensajeDeError(fallo, 'inténtalo de nuevo desde el grupo.')}`);
      }
      if (pendientes.length > 0) Alert.alert(`El grupo «${nombre.trim()}» se creó`, `Pero faltó algo. ${pendientes.join(' ')}`);
      onCreado({ id: creado.id, nombre: nombre.trim() });
    } finally {
      enCurso.current = false;
      setCreando(false);
    }
  };

  return (
    <MarcoDelLider titulo="Crear grupo" onVolver={atras}>
      <Indicador paso={paso} />

      {paso === 1 ? (
        <View style={estilos.paso}>
          <TituloDeSeccion>Nombre del grupo</TituloDeSeccion>
          {grupos.grupos && !destino ? (
            <Linea>No hay una generación activa para crear un grupo.</Linea>
          ) : (
            <FormField
              label="Nombre"
              value={nombre}
              onChangeText={valor => {
                setNombre(valor);
                if (falta) setFalta(null);
              }}
              maxLength={LARGO_MAXIMO_DEL_NOMBRE}
              error={falta}
              mensajeDeErrorAparte
              accessibilityLabel="Nombre del grupo"
              autoCapitalize="sentences"
            />
          )}
          {falta ? <Text style={[t.body, { color: c.danger, fontSize: 15 }]}>{falta}</Text> : null}
          {grupos.fallo ? <LecturaFallida fallo={grupos.fallo} detalle={grupos.detalle} que="los grupos" onReintentar={grupos.recargar} /> : null}
          <BotonPrincipal etiqueta="Siguiente" onPress={avanzarDelNombre} deshabilitado={!destino} />
        </View>
      ) : null}

      {paso === 2 ? (
        <View style={estilos.paso}>
          <TituloDeSeccion>¿Quién lo acompaña?</TituloDeSeccion>
          {padron.datos ? (
            padron.datos.mentors.length === 0 ? (
              <Linea>Todavía no hay mentores activos.</Linea>
            ) : (
              <ListaDeMentoresParaElegir mentores={padron.datos.mentors} elegidoId={mentor?.userId ?? null} onElegir={setMentor} />
            )
          ) : padron.fallo ? (
            <LecturaFallida fallo={padron.fallo} detalle={padron.detalle} que="los mentores" onReintentar={padron.recargar} />
          ) : (
            <CargandoLectura texto="Cargando los mentores…" />
          )}
          <BotonPrincipal etiqueta="Siguiente" onPress={() => setPaso(3)} deshabilitado={!mentor} />
        </View>
      ) : null}

      {paso === 3 ? (
        <View style={estilos.paso}>
          <TituloDeSeccion>Aprendices sin grupo</TituloDeSeccion>
          {sinGrupo.aprendices ? (
            <ListaDeAprendicesParaElegir aprendices={sinGrupo.aprendices} elegidos={elegidos} onAlternar={alternar} />
          ) : sinGrupo.fallo ? (
            <LecturaFallida fallo={sinGrupo.fallo} detalle={sinGrupo.detalle} que="los aprendices sin grupo" onReintentar={sinGrupo.recargar} />
          ) : (
            <CargandoLectura texto="Cargando los aprendices…" />
          )}
          <BotonPrincipal etiqueta="Revisar" onPress={() => setPaso(4)} />
        </View>
      ) : null}

      {paso === 4 ? (
        <View style={estilos.paso}>
          <TituloDeSeccion>Resumen</TituloDeSeccion>
          <Dato titulo="Nombre" valor={nombre.trim()} />
          <Dato titulo="Mentor" valor={mentor?.fullName ?? ''} />
          <Dato titulo="Aprendices" valor={elegidos.size === 0 ? 'Ninguno por ahora' : `${elegidos.size}: ${nombresElegidos.join(', ')}`} />
          <BotonPrincipal etiqueta="Crear grupo" onPress={() => void crear()} cargando={creando} deshabilitado={creando} />
        </View>
      ) : null}
    </MarcoDelLider>
  );
}

/** «Paso 2 de 3» con tres barritas; en el resumen dice «Resumen». */
function Indicador({ paso }: { paso: Paso }) {
  const { c, t } = useTheme();
  const rotulo = paso === 4 ? 'Resumen' : `Paso ${paso} de 3`;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={rotulo} accessibilityValue={{ min: 1, max: 4, now: paso }} style={{ gap: 6 }}>
      <Text accessible={false} style={[t.body, { color: c.textSoft, fontFamily: fuentes.media, fontSize: 15 }]}>
        {rotulo}
      </Text>
      <View style={estilos.barras}>
        {[1, 2, 3].map(n => (
          <View key={n} style={[estilos.barra, { backgroundColor: n <= paso ? c.gold : c.border }]} />
        ))}
      </View>
    </View>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  const { c, t } = useTheme();
  return (
    <View accessible accessibilityLabel={`${titulo}: ${valor}`} style={[estilos.dato, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Text accessible={false} style={[t.body, { color: c.textSoft, fontSize: 15 }]}>
        {titulo}
      </Text>
      <Text accessible={false} style={[t.body, { color: c.textStrong, fontFamily: fuentes.media, fontSize: 17 }]}>
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  paso: { gap: 14 },
  barras: { flexDirection: 'row', gap: 6 },
  barra: { flex: 1, height: 4, borderRadius: 2 },
  dato: { gap: 2, borderWidth: 1, borderRadius: 14, padding: 14 },
});
