import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { CursoPortada } from '../../academy/components/CursoPortada';
import { HoraPickerModal } from '../../habits/components/HoraPickerModal';
import type { Evento } from '../types/eventos.types';
import {
  DURACIONES_MINUTOS,
  MAX_DESCRIPCION,
  MAX_TITULO,
  TIPOS_DE_EVENTO,
  type FormularioDeEvento,
} from '../utils/formularioDeEvento';
import { elegirPortada, type PortadaElegida } from '../utils/portadaDelEvento';
import { duracionEnPalabras, diaRelativo } from '../utils/textosDeFecha';
import { fechaEnZona, sumarDiasIso } from '../utils/zonaHoraria';
import { BotonVolver, CampoDeTexto, LETRA, Parrafo } from './piezas';

/**
 * Crear o editar un evento (E-6), para ADMIN y ALCHEMIST. Mínimo a propósito: nombre, día, hora,
 * duración, el link (Meet, Zoom o Drive) o el lugar, y si se avisa a todos. La audiencia es todo el
 * mundo; lo avanzado (repetición, grupos, niveles) queda en el panel de administración.
 *
 * El día se elige con ‹ › en vez de un calendario: botones de 52 px que no hay que apuntar, y los
 * eventos casi siempre son de las próximas semanas.
 *
 * **Portada opcional** (2026-09-26, tarjetas «como cursos»): se elige acá y se sube DESPUÉS de guardar,
 * porque la URL de subida es por evento (`/events/{id}/portada/upload-url`) y un evento nuevo todavía
 * no tiene id. La vista previa es la misma caja de la tarjeta.
 */
export function FormularioDelEvento({
  inicial,
  original,
  error,
  guardando,
  onVolver,
  onGuardar,
}: {
  inicial: FormularioDeEvento;
  original: Evento | null;
  error: string | null;
  guardando: boolean;
  onVolver: () => void;
  onGuardar: (form: FormularioDeEvento, portada: PortadaElegida | null) => void;
}) {
  const { c } = useTheme();
  const [form, setForm] = useState<FormularioDeEvento>(inicial);
  const [eligiendoHora, setEligiendoHora] = useState(false);
  const [portada, setPortada] = useState<PortadaElegida | null>(null);
  const portadaVisible = portada?.uri ?? original?.portadaUrl ?? null;
  const cambiar = <K extends keyof FormularioDeEvento>(campo: K, valor: FormularioDeEvento[K]) =>
    setForm(f => ({ ...f, [campo]: valor }));

  const hoy = fechaEnZona(Date.now(), form.zona);
  const manana = sumarDiasIso(hoy, 1);
  const puedeRetroceder = form.fecha > hoy;

  return (
    <View style={{ gap: 18 }}>
      <BotonVolver etiqueta="Volver sin guardar" onPress={onVolver} />
      <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
        {original ? 'Editar evento' : 'Nuevo evento'}
      </Text>

      <CampoDeTexto
        rotulo="Nombre"
        ayuda={`Corto, hasta ${MAX_TITULO} letras.`}
        value={form.titulo}
        maxLength={MAX_TITULO}
        onChangeText={v => cambiar('titulo', v)}
        placeholder="Clase en vivo"
      />

      {!original ? (
        <View style={{ gap: 8 }}>
          <Text style={[estilos.rotulo, { color: c.textStrong }]}>Tipo</Text>
          {TIPOS_DE_EVENTO.map(tipo => {
            const elegido = form.tipoEvento === tipo.clave;
            return (
              <Pressable
                key={tipo.clave}
                onPress={() => cambiar('tipoEvento', tipo.clave)}
                accessibilityRole="radio"
                accessibilityState={{ checked: elegido }}
                style={[
                  estilos.opcion,
                  { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.goldWash : c.cardBg },
                ]}
              >
                <Icon name={elegido ? 'checkCircle' : 'dots'} size={18} color={elegido ? c.goldInk : c.chevron} />
                <Text style={[estilos.opcionTexto, { color: c.textStrong }]}>{tipo.nombre}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={[estilos.rotulo, { color: c.textStrong }]}>Día</Text>
        <View style={estilos.paso}>
          <BotonSecundario
            etiqueta="‹"
            accessibilityLabel="Un día antes"
            deshabilitado={!puedeRetroceder}
            estilo={estilos.flecha}
            onPress={() => cambiar('fecha', sumarDiasIso(form.fecha, -1))}
          />
          <Text style={[estilos.valor, { color: c.textStrong }]}>{diaRelativo(form.fecha, hoy, manana)}</Text>
          <BotonSecundario
            etiqueta="›"
            accessibilityLabel="Un día después"
            estilo={estilos.flecha}
            onPress={() => cambiar('fecha', sumarDiasIso(form.fecha, 1))}
          />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[estilos.rotulo, { color: c.textStrong }]}>Hora</Text>
        <BotonSecundario etiqueta={form.hora} icono="clock" onPress={() => setEligiendoHora(true)} accessibilityLabel={`Hora: ${form.hora}. Cambiar`} />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[estilos.rotulo, { color: c.textStrong }]}>Cuánto dura</Text>
        <View style={estilos.chips}>
          {DURACIONES_MINUTOS.map(min => {
            const elegido = form.duracionMinutos === min;
            return (
              <Pressable
                key={min}
                onPress={() => cambiar('duracionMinutos', min)}
                accessibilityRole="radio"
                accessibilityState={{ checked: elegido }}
                style={[estilos.chip, { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.goldWash : c.cardBg }]}
              >
                <Text style={[estilos.opcionTexto, { color: c.textStrong }]}>{duracionEnPalabras(min)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <CampoDeTexto
        rotulo="Link de la reunión"
        ayuda="Pega el link de Meet, Zoom o Drive. Empieza con https://"
        value={form.link}
        onChangeText={v => cambiar('link', v)}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://meet.google.com/…"
      />

      {!form.link.trim() ? (
        <CampoDeTexto
          rotulo="O el lugar"
          ayuda="Si es en persona, escribe la dirección."
          value={form.lugar}
          onChangeText={v => cambiar('lugar', v)}
        />
      ) : null}

      <CampoDeTexto
        rotulo="Descripción (opcional)"
        value={form.descripcion}
        maxLength={MAX_DESCRIPCION}
        multiline
        onChangeText={v => cambiar('descripcion', v)}
      />

      <View style={{ gap: 8 }}>
        <Text style={[estilos.rotulo, { color: c.textStrong }]}>Portada (opcional)</Text>
        <Parrafo>Una imagen apaisada. Sin portada, la tarjeta usa el fondo oscuro de siempre.</Parrafo>
        {portadaVisible ? (
          <View style={[estilos.portada, { borderColor: c.border }]}>
            <CursoPortada url={portadaVisible} />
          </View>
        ) : null}
        <BotonSecundario
          etiqueta={portadaVisible ? 'Cambiar portada' : 'Elegir portada'}
          icono="image"
          onPress={() => void elegirPortada().then(p => p && setPortada(p))}
        />
        {portada ? <BotonSecundario etiqueta="No usar esta imagen" onPress={() => setPortada(null)} /> : null}
      </View>

      <View style={[estilos.interruptor, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.opcionTexto, { color: c.textStrong }]}>Avisar a todos al guardarlo</Text>
          <Parrafo>Les llega un aviso con el nombre del evento.</Parrafo>
        </View>
        <Switch
          value={form.notificarAlCrear}
          onValueChange={v => cambiar('notificarAlCrear', v)}
          accessibilityLabel="Avisar a todos al guardarlo"
          trackColor={{ false: '#332C20', true: c.gold }}
          thumbColor={form.notificarAlCrear ? '#1E1B18' : '#888'}
        />
      </View>

      {error ? <Parrafo tono="peligro">{error}</Parrafo> : null}

      <BotonPrincipal
        etiqueta={original ? 'Guardar cambios' : 'Crear evento'}
        cargando={guardando}
        onPress={() => onGuardar(form, portada)}
      />

      <HoraPickerModal
        visible={eligiendoHora}
        tituloHabito={form.titulo.trim() || 'Evento'}
        horaInicial={form.hora}
        onConfirmar={hora => {
          cambiar('hora', hora);
          setEligiendoHora(false);
        }}
        onCerrar={() => setEligiendoHora(false)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: LETRA.grande, lineHeight: 28 },
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14 },
  opcionTexto: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22, flexShrink: 1 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flecha: { width: 56 },
  valor: { flex: 1, textAlign: 'center', fontFamily: 'Jost_500Medium', fontSize: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minHeight: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center' },
  portada: { height: 185, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
});
