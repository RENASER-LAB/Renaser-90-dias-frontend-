import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { Icon } from '../../../components/Icon';
import { BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import * as habitsApi from '../../habits/api/habitsApi';
import { HoraPickerModal } from '../../habits/components/HoraPickerModal';
import * as recordatorios from '../../habits/notificaciones/recordatoriosDeHabito';
import { cambiarHoraDelHabito } from '../../habits/utils/cambioDeHora';
import { DIAS_A_LA_VISTA, listarProximos } from '../../eventos/api/eventosApi';
import {
  cancelarTodasLasAlarmasDeEventos,
  reprogramarConSonidoNuevo,
  sincronizarAlarmasDeEventos,
} from '../../eventos/notificaciones/alarmasDeEventos';
import {
  guardarPreferenciasDeAlarmas,
  preferenciasDeAlarmas,
  PREFERENCIAS_POR_DEFECTO,
  type PreferenciasDeAlarmas,
} from '../preferenciasDeAlarmas';
import { probarSonido } from '../probarSonido';
import { SONIDOS, type SonidoDeAlarma } from '../sonidoDeAlarma';

/** El hábito de despertar, por su clave de sistema (el título lo puede renombrar el aprendiz). */
const CLAVE_DESPERTAR = 'WAKE_UP';

interface Despertar {
  habitoId: string;
  titulo: string;
  /** `HH:mm`, o vacío si no tiene hora. */
  hora: string;
  limitTime: string | null;
  recordatorioServidor: { activo: boolean; minutosAntes: number | null };
  /** Si ESTE teléfono tiene la alarma puesta. */
  alarmaPuesta: boolean;
}

/**
 * Yo → Alarmas (E-10, decisión del dueño del 26/09): encender o apagar cada alarma (Despertar y
 * eventos), elegir el sonido y la hora. Sin tablas nuevas: la alarma de Despertar es el recordatorio
 * del hábito `WAKE_UP` (las mismas preferencias de siempre, `habit-preferences`), y lo demás vive en
 * el teléfono (`preferenciasDeAlarmas`).
 *
 * En web y en Expo Go no hay alarmas locales: la sección lo dice y no ofrece nada que no funcione.
 */
export function SeccionAlarmas({ userId }: { userId: string }) {
  const { c } = useTheme();
  const [prefs, setPrefs] = useState<PreferenciasDeAlarmas>(PREFERENCIAS_POR_DEFECTO);
  const [despertar, setDespertar] = useState<Despertar | null | 'sin_habito' | 'fallo'>(null);
  const [eligiendoHora, setEligiendoHora] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const cargarDespertar = useCallback(async () => {
    try {
      const [catalogo, preferencias] = await Promise.all([habitsApi.obtenerCatalogo(), habitsApi.obtenerPreferencias()]);
      const habito = catalogo.find(h => h.systemKey === CLAVE_DESPERTAR && !h.locked);
      if (!habito) {
        setDespertar('sin_habito');
        return;
      }
      const pref = preferencias.find(p => p.habitId === habito.id);
      const antelaciones = await recordatorios.antelacionesDe(userId, habito.id);
      setDespertar({
        habitoId: habito.id,
        titulo: habito.title,
        hora: pref?.triggerTime ? pref.triggerTime.slice(0, 5) : '',
        limitTime: pref?.limitTime ?? null,
        recordatorioServidor: { activo: pref?.reminderEnabled ?? false, minutosAntes: pref?.reminderMinutesBefore ?? null },
        alarmaPuesta: antelaciones.length > 0,
      });
    } catch {
      setDespertar('fallo');
    }
  }, [userId]);

  useEffect(() => {
    void preferenciasDeAlarmas(userId).then(setPrefs);
    if (recordatorios.HAY_RECORDATORIOS_LOCALES) void cargarDespertar();
  }, [userId, cargarDespertar]);

  if (!recordatorios.HAY_RECORDATORIOS_LOCALES) {
    return (
      <Text style={[estilos.cuerpo, { color: c.textSoft }]}>
        Las alarmas suenan en la app del teléfono. Desde aquí no se pueden programar.
      </Text>
    );
  }

  const guardarPrefs = async (nuevas: PreferenciasDeAlarmas) => {
    setPrefs(nuevas);
    await guardarPreferenciasDeAlarmas(userId, nuevas);
  };

  /** Despertar: prender = alarma a la hora exacta; apagar = sin alarma. El servidor se entera (E-2). */
  const cambiarDespertar = async (encender: boolean) => {
    if (!despertar || typeof despertar === 'string') return;
    if (encender && !despertar.hora) {
      Alert.alert('Primero elige la hora', 'Toca «Cambiar hora» y elige a qué hora te despiertas.');
      return;
    }
    setOcupado(true);
    try {
      const recordatorio = encender ? { activo: true, minutosAntes: 0 } : { activo: false, minutosAntes: null };
      await habitsApi.cambiarHorario(despertar.habitoId, `${despertar.hora}:00`, despertar.limitTime, recordatorio);
      const ok = await recordatorios.programar(userId, despertar.habitoId, despertar.titulo, despertar.hora, encender ? [0] : []);
      if (encender && !ok) {
        Alert.alert('Falta el permiso', 'Este teléfono no tiene permiso para avisarte. Actívalo en los ajustes del teléfono.');
      }
      setDespertar({ ...despertar, recordatorioServidor: recordatorio, alarmaPuesta: encender && ok });
    } catch {
      Alert.alert('No se pudo guardar', 'Intenta de nuevo en unos segundos.');
    } finally {
      setOcupado(false);
    }
  };

  const cambiarHoraDespertar = async (hora: string) => {
    setEligiendoHora(false);
    if (!despertar || typeof despertar === 'string') return;
    setOcupado(true);
    try {
      const { resultado } = await cambiarHoraDelHabito({
        userId,
        habitoId: despertar.habitoId,
        titulo: despertar.titulo,
        horaNueva: hora,
        limitTime: despertar.limitTime,
        recordatorio: despertar.recordatorioServidor,
      });
      setDespertar({ ...despertar, hora });
      if (resultado.deferred) {
        Alert.alert('Guardado', `Desde mañana tu hora de despertar es a las ${hora}. La alarma ya quedó a esa hora.`);
      }
    } catch {
      Alert.alert('No se pudo cambiar la hora', 'Intenta de nuevo en unos segundos.');
    } finally {
      setOcupado(false);
    }
  };

  const cambiarEventos = async (encender: boolean) => {
    await guardarPrefs({ ...prefs, eventosActivas: encender });
    if (!encender) {
      await cancelarTodasLasAlarmasDeEventos(userId);
      return;
    }
    try {
      const ahora = Date.now();
      const lista = await listarProximos(ahora);
      await sincronizarAlarmasDeEventos(userId, lista, {
        desdeMs: ahora - 60 * 60 * 1000,
        hastaMs: ahora + DIAS_A_LA_VISTA * 24 * 60 * 60 * 1000,
      });
    } catch {
      // Sin red: las alarmas se ponen la próxima vez que se abra Eventos.
    }
  };

  /** Cambiar el sonido cambia el canal (Android), así que se reprograma lo que ya estaba puesto. */
  const cambiarSonido = async (sonido: SonidoDeAlarma) => {
    if (sonido === prefs.sonido) return;
    setOcupado(true);
    try {
      await guardarPrefs({ ...prefs, sonido });
      if (despertar && typeof despertar !== 'string') {
        await recordatorios.fijarSonido(userId, despertar.habitoId, sonido);
        if (despertar.alarmaPuesta && despertar.hora) {
          await recordatorios.reprogramarTrasCambioDeHora(userId, despertar.habitoId, despertar.titulo, despertar.hora);
        }
      }
      try {
        await reprogramarConSonidoNuevo(userId, await listarProximos(Date.now()));
      } catch {
        // Sin red: las de eventos se quedan con el sonido anterior hasta el próximo «Voy».
      }
    } finally {
      setOcupado(false);
    }
  };

  const probar = async () => {
    if (!(await probarSonido(prefs.sonido))) {
      Alert.alert('No se pudo probar', 'Este teléfono no tiene permiso para avisarte. Actívalo en los ajustes del teléfono.');
    }
  };

  const texto = [estilos.cuerpo, { color: c.textSoft }];
  const caja = [estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }];
  const hayDespertar = despertar !== null && typeof despertar !== 'string';

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Text style={[estilos.titulo, { color: c.textStrong }]}>Despertar</Text>
        {despertar === null ? <Text style={texto}>Cargando…</Text> : null}
        {despertar === 'sin_habito' ? <Text style={texto}>Todavía no tienes el hábito de despertar en tu plan.</Text> : null}
        {despertar === 'fallo' ? (
          <View style={{ gap: 8 }}>
            <Text style={[texto, { color: c.danger }]}>No se pudo leer tu hora de despertar.</Text>
            <BotonSecundario etiqueta="Reintentar" onPress={() => void cargarDespertar()} />
          </View>
        ) : null}
        {hayDespertar ? (
          <View style={caja}>
            <View style={estilos.fila}>
              <View style={{ flex: 1 }}>
                <Text style={[estilos.nombre, { color: c.textStrong }]}>
                  {despertar.hora ? `Alarma a las ${despertar.hora}` : 'Sin hora elegida'}
                </Text>
                <Text style={texto}>{despertar.alarmaPuesta ? 'Suena todos los días.' : 'Apagada en este teléfono.'}</Text>
              </View>
              <Switch
                value={despertar.alarmaPuesta}
                disabled={ocupado}
                onValueChange={v => void cambiarDespertar(v)}
                accessibilityLabel="Alarma de despertar"
                trackColor={{ false: '#332C20', true: c.gold }}
                thumbColor={despertar.alarmaPuesta ? '#1E1B18' : '#888'}
              />
            </View>
            <View style={{ paddingBottom: 14 }}>
              <BotonSecundario etiqueta="Cambiar hora" icono="clock" deshabilitado={ocupado} onPress={() => setEligiendoHora(true)} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[estilos.titulo, { color: c.textStrong }]}>Eventos</Text>
        <View style={caja}>
          <View style={estilos.fila}>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.nombre, { color: c.textStrong }]}>Alarma de los eventos a los que vas</Text>
              <Text style={texto}>Cuando dices «Voy», suena antes de que empiece.</Text>
            </View>
            <Switch
              value={prefs.eventosActivas}
              onValueChange={v => void cambiarEventos(v)}
              accessibilityLabel="Alarma de los eventos a los que vas"
              trackColor={{ false: '#332C20', true: c.gold }}
              thumbColor={prefs.eventosActivas ? '#1E1B18' : '#888'}
            />
          </View>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[estilos.titulo, { color: c.textStrong }]}>Sonido</Text>
        <Text style={texto}>Para la alarma de despertar y la de los eventos.</Text>
        {SONIDOS.map(s => {
          const elegido = prefs.sonido === s.clave;
          return (
            <Pressable
              key={s.clave}
              onPress={() => void cambiarSonido(s.clave)}
              disabled={ocupado}
              accessibilityRole="radio"
              accessibilityState={{ checked: elegido, disabled: ocupado }}
              accessibilityLabel={`${s.nombre}. ${s.detalle}`}
              style={[estilos.opcion, { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.goldWash : c.cardBg }]}
            >
              <Icon name={elegido ? 'checkCircle' : 'volume'} size={20} color={elegido ? c.goldInk : c.chevron} />
              <View style={{ flex: 1 }}>
                <Text style={[estilos.nombre, { color: c.textStrong }]}>{s.nombre}</Text>
                <Text style={texto}>{s.detalle}</Text>
              </View>
            </Pressable>
          );
        })}
        <BotonSecundario etiqueta="Probar el sonido" icono="play" onPress={() => void probar()} />
      </View>

      {hayDespertar ? (
        <HoraPickerModal
          visible={eligiendoHora}
          tituloHabito={despertar.titulo}
          horaInicial={despertar.hora}
          onConfirmar={hora => void cambiarHoraDespertar(hora)}
          onCerrar={() => setEligiendoHora(false)}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: 19, lineHeight: 25 },
  cuerpo: { fontFamily: 'Jost_400Regular', fontSize: 16, lineHeight: 23 },
  nombre: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22 },
  caja: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
});
