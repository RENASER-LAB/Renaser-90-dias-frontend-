import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { Interruptor } from '../../../components/Interruptor';
import { BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { HoraPickerModal } from '../../habits/components/HoraPickerModal';
import { HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import { etiquetaDeAntelacion } from '../../habits/utils/etiquetaDeAntelacion';
import * as objetivosApi from '../api/objetivosApi';
import {
  ANTELACIONES_DE_ACCIONES,
  cancelarRecordatorioDiario,
  cancelarTodasLasAlarmasDeAcciones,
  guardarPreferenciasDeAcciones,
  pedirPermisoDeAvisos,
  preferenciasDeAcciones,
  PREFERENCIAS_DE_ACCIONES_POR_DEFECTO,
  programarRecordatorioDiario,
  sincronizarAlarmasDeAcciones,
  type PreferenciasDeAcciones,
} from '../notificaciones/recordatoriosDeAcciones';
import type { RocaDiariaApi } from '../types/objetivos.types';

/** Hoy y mañana del servidor, para cuando la pantalla no tiene la lista a mano (Yo → Alarmas). */
async function leerRocasDeHoyYManana(): Promise<RocaDiariaApi[]> {
  const [hoy, manana] = await Promise.allSettled([objetivosApi.obtenerRocasDeHoy(), objetivosApi.obtenerRocasDeManana()]);
  return [...(hoy.status === 'fulfilled' ? hoy.value : []), ...(manana.status === 'fulfilled' ? manana.value : [])];
}

const SIN_PERMISO = 'Este teléfono no tiene permiso para avisarte. Actívalo en los ajustes del teléfono.';

/**
 * Los recordatorios de las acciones de los objetivos (2026-09-26): el diario («Recordarme mis
 * acciones del día», con hora y encendido/apagado) y el aviso antes de cada acción con hora. Vive en
 * Plan, en la tarjeta de las acciones del día, y en Yo → Alarmas: es el mismo control y la misma
 * preferencia (en este teléfono). La lógica está en `notificaciones/recordatoriosDeAcciones.ts`.
 *
 * Con `rocas` (Plan ya las tiene), cada vez que la lista cambia se ponen al día las alarmas de cada
 * acción. Sin `rocas` (Yo), las lee al cambiar la antelación.
 *
 * En web y en Expo Go no hay alarmas locales: no pinta nada.
 */
export function RecordatorioDeAcciones({ userId, rocas }: { userId: string; rocas?: RocaDiariaApi[] }) {
  const { c } = useTheme();
  const [prefs, setPrefs] = useState<PreferenciasDeAcciones>(PREFERENCIAS_DE_ACCIONES_POR_DEFECTO);
  const [eligiendoHora, setEligiendoHora] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (HAY_RECORDATORIOS_LOCALES) void preferenciasDeAcciones(userId).then(setPrefs);
  }, [userId]);

  // Qué de la lista le importa a las alarmas: si esto no cambia, no se toca nada.
  const huella = useMemo(
    () => (rocas ?? []).map(r => `${r.id}|${r.fecha}|${r.horaInicio ?? ''}|${r.completada}`).join(','),
    [rocas],
  );
  useEffect(() => {
    if (!HAY_RECORDATORIOS_LOCALES || !rocas) return;
    void sincronizarAlarmasDeAcciones(userId, rocas).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, huella]);

  const guardar = useCallback(
    async (nuevas: PreferenciasDeAcciones) => {
      setPrefs(nuevas);
      await guardarPreferenciasDeAcciones(userId, nuevas);
    },
    [userId],
  );

  if (!HAY_RECORDATORIOS_LOCALES) return null;

  const cambiarDiario = async (encender: boolean) => {
    setOcupado(true);
    try {
      if (!encender) {
        await cancelarRecordatorioDiario(userId);
        await guardar({ ...prefs, diarioActivo: false });
        return;
      }
      const ok = await programarRecordatorioDiario(userId, prefs.horaDiaria);
      if (!ok) Alert.alert('Falta el permiso', SIN_PERMISO);
      await guardar({ ...prefs, diarioActivo: ok });
    } finally {
      setOcupado(false);
    }
  };

  const cambiarHora = async (hora: string) => {
    setEligiendoHora(false);
    setOcupado(true);
    try {
      await guardar({ ...prefs, horaDiaria: hora });
      if (prefs.diarioActivo && !(await programarRecordatorioDiario(userId, hora))) {
        Alert.alert('Falta el permiso', SIN_PERMISO);
      }
    } finally {
      setOcupado(false);
    }
  };

  /** `null` = «Sin aviso». Las demás se prenden y apagan, como en un hábito. */
  const alternarAntelacion = async (minutos: number | null) => {
    const actuales = prefs.antelaciones;
    const nuevas =
      minutos === null ? [] : actuales.includes(minutos) ? actuales.filter(m => m !== minutos) : [...actuales, minutos];
    setOcupado(true);
    try {
      if (nuevas.length > 0 && !(await pedirPermisoDeAvisos())) {
        Alert.alert('Falta el permiso', SIN_PERMISO);
        return;
      }
      await guardar({ ...prefs, antelaciones: nuevas });
      // Se rehacen todas con la elección nueva: así «Sin aviso» no deja ninguna sonando.
      await cancelarTodasLasAlarmasDeAcciones(userId);
      if (nuevas.length > 0) await sincronizarAlarmasDeAcciones(userId, rocas ?? (await leerRocasDeHoyYManana()));
    } catch {
      // Sin red en Yo: se ponen la próxima vez que la app lea las acciones.
    } finally {
      setOcupado(false);
    }
  };

  const texto = [estilos.cuerpo, { color: c.textSoft }];
  const pastilla = (activa: boolean) => [
    estilos.pastilla,
    { borderColor: activa ? c.gold : c.border, backgroundColor: activa ? c.goldWash : 'transparent' },
  ];
  const opciones: { minutos: number | null; etiqueta: string }[] = [
    { minutos: null, etiqueta: 'Sin aviso' },
    ...ANTELACIONES_DE_ACCIONES.map(m => ({ minutos: m, etiqueta: etiquetaDeAntelacion(m) })),
  ];

  return (
    <View style={{ gap: 12 }}>
      <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <View style={estilos.fila}>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.nombre, { color: c.textStrong }]}>Recordarme mis acciones del día</Text>
            <Text style={texto}>
              {prefs.diarioActivo ? `Todos los días a las ${prefs.horaDiaria}.` : 'Apagado en este teléfono.'}
            </Text>
          </View>
          {/* `Interruptor` y no el `Switch` con colores a mano (prueba en Android, 2026-10-05). */}
          <Interruptor
            valor={prefs.diarioActivo}
            deshabilitado={ocupado}
            onCambiar={v => void cambiarDiario(v)}
            etiqueta="Recordarme mis acciones del día"
          />
        </View>
        <View style={{ paddingBottom: 14 }}>
          <BotonSecundario
            etiqueta={`Cambiar hora (${prefs.horaDiaria})`}
            icono="clock"
            deshabilitado={ocupado}
            onPress={() => setEligiendoHora(true)}
          />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[estilos.nombre, { color: c.textStrong }]}>Aviso antes de cada acción con hora</Text>
        <View style={estilos.filaPastillas}>
          {opciones.map(o => {
            const activa = o.minutos === null ? prefs.antelaciones.length === 0 : prefs.antelaciones.includes(o.minutos);
            return (
              <Pressable
                key={o.etiqueta}
                onPress={() => void alternarAntelacion(o.minutos)}
                disabled={ocupado}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: activa, disabled: ocupado }}
                accessibilityLabel={o.etiqueta}
                style={pastilla(activa)}
              >
                <Text style={[estilos.etiqueta, { color: activa ? c.goldInk : c.textSoft }]}>{o.etiqueta}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <HoraPickerModal
        visible={eligiendoHora}
        tituloHabito="Tus acciones del día"
        horaInicial={prefs.horaDiaria}
        onConfirmar={hora => void cambiarHora(hora)}
        onCerrar={() => setEligiendoHora(false)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { fontFamily: 'Jost_400Regular', fontSize: 16, lineHeight: 23 },
  nombre: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22 },
  etiqueta: { fontFamily: 'Jost_500Medium', fontSize: 15, lineHeight: 20 },
  caja: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12 },
  filaPastillas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pastilla: { minHeight: 48, borderWidth: 1.5, borderRadius: 24, paddingHorizontal: 16, justifyContent: 'center' },
});
