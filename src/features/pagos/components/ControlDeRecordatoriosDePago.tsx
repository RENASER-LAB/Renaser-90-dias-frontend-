import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Checkbox } from '../../../components/Checkbox';
import { Interruptor } from '../../../components/Interruptor';
import { BotonSecundario } from '../../../components/Legible';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { HoraPickerModal } from '../../habits/components/HoraPickerModal';
import { HAY_RECORDATORIOS_LOCALES } from '../../habits/notificaciones/recordatoriosDeHabito';
import type { PagosDeLaPersona } from '../api/pagosSchemas';
import { ponerAlDiaLosRecordatoriosDePago } from '../notificaciones/alarmasDePagos';
import {
  ANTELACIONES_DE_PAGO,
  guardarPreferenciasDePagos,
  ordenarAntelaciones,
  PREFERENCIAS_DE_PAGOS_POR_DEFECTO,
  preferenciasDePagos,
  resumenDeLosRecordatoriosDePago,
  type AntelacionDePago,
  type PreferenciasDePagos,
} from '../notificaciones/preferenciasDePagos';

const NOMBRE_DEL_AVISO: Record<AntelacionDePago, string> = { 3: '3 días antes', 1: '1 día antes', 0: 'El mismo día' };

/**
 * Los recordatorios de pago (spec 032, decisión del dueño del 2026-11-01: «que le salga en Yo los recordatorios»): el encendido, cuándo avisar —3 días
 * antes, 1 día antes, el mismo día, uno o varios— y a qué hora. **Una sola pieza** para Yo → Alarmas y para la hoja «Recordatorios de pago ›» de «Mi
 * ingreso» (como «Recordatorios de tus acciones» en Plan). Lo elegido vive en el teléfono, por cuenta.
 *
 * - Cada cambio guarda y pone las alarmas al día (`ponerAlDiaLosRecordatoriosDePago`); encender o cambiar pide el permiso de avisos si hace falta y,
 *   si el teléfono no lo da, la pantalla lo dice en vez de quedarse prendida y muda.
 * - Los toques se hacen en fila (`cola`): dos cambios seguidos no se pisan.
 * - Es el control de quien YA tiene un cronograma: quien no tiene nada que recordar no lo ve (quien lo monta decide).
 * - Sin alarmas locales (web, Expo Go) no se dibuja, como el resto de las alarmas.
 * - Sin animaciones: se toca pocas veces y el estado tiene que verse en el acto (el `Interruptor` ya mueve su pulgar).
 */
export function ControlDeRecordatoriosDePago({
  userId,
  pagos,
  alCambiar,
}: {
  userId: string;
  /** Lo último que dijo el servidor: de ahí salen las cuotas que se recuerdan. */
  pagos: PagosDeLaPersona | null;
  /** Avisa que lo guardado cambió (la fila de «Mi ingreso» relee su línea de estado). */
  alCambiar?: () => void;
}) {
  const { c, t } = useTheme();
  const [prefs, setPrefs] = useState<PreferenciasDePagos>(PREFERENCIAS_DE_PAGOS_POR_DEFECTO);
  const [leidas, setLeidas] = useState(false);
  const [eligiendoHora, setEligiendoHora] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const pagosAlDia = useRef(pagos);
  pagosAlDia.current = pagos;

  useEffect(() => {
    if (!HAY_RECORDATORIOS_LOCALES) return;
    let vigente = true;
    void preferenciasDePagos(userId).then(leida => {
      if (vigente) {
        setPrefs(leida);
        setLeidas(true);
      }
    });
    return () => {
      vigente = false;
    };
  }, [userId]);

  const cambiar = useCallback(
    (parcial: Partial<PreferenciasDePagos>) => {
      setPrefs(previas => {
        const nuevas: PreferenciasDePagos = { ...previas, ...parcial };
        const trabajo = async () => {
          await guardarPreferenciasDePagos(userId, nuevas);
          const resultado = await ponerAlDiaLosRecordatoriosDePago(userId, pagosAlDia.current, {
            preferencias: nuevas,
            pedirElPermiso: nuevas.activos,
          });
          setSinPermiso(nuevas.activos && nuevas.antelaciones.length > 0 && resultado === 'sin_permiso');
          alCambiar?.();
        };
        cola.current = cola.current.then(trabajo, trabajo);
        return nuevas;
      });
    },
    [userId, alCambiar],
  );

  if (!HAY_RECORDATORIOS_LOCALES) return null;

  const alternarAviso = (aviso: AntelacionDePago, marcado: boolean) => {
    tacto.seleccion();
    const lista = marcado ? [...prefs.antelaciones, aviso] : prefs.antelaciones.filter(a => a !== aviso);
    cambiar({ antelaciones: ordenarAntelaciones(lista) });
  };

  return (
    <View style={estilos.caja}>
      <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <View style={estilos.fila}>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.nombre, { color: c.textStrong }]}>Recordarme mis cuotas</Text>
            <Text style={[t.body, estilos.detalle, { color: c.textSoft }]}>{leidas ? resumenDeLosRecordatoriosDePago(prefs) : 'Leyendo…'}</Text>
          </View>
          <Interruptor
            valor={prefs.activos}
            onCambiar={valor => cambiar({ activos: valor })}
            etiqueta="Recordarme mis cuotas"
          />
        </View>
        <Text style={[t.body, estilos.detalle, { color: c.textSoft, paddingBottom: 14 }]}>
          Suena con el sonido de tu teléfono, solo en las cuotas que siguen pendientes.
        </Text>
      </View>

      {prefs.activos ? (
        <>
          <View style={{ gap: 8 }}>
            <Text style={[estilos.nombre, { color: c.textStrong }]}>Avisarme</Text>
            <View accessibilityRole="menu" accessibilityLabel="Cuándo avisarme">
              {ANTELACIONES_DE_PAGO.map(aviso => (
                <Checkbox
                  key={aviso}
                  checked={prefs.antelaciones.includes(aviso)}
                  onToggle={marcado => alternarAviso(aviso, marcado)}
                  title={NOMBRE_DEL_AVISO[aviso]}
                  style={{ minHeight: 56, marginBottom: 8 }}
                />
              ))}
            </View>
            {prefs.antelaciones.length === 0 ? (
              <Text style={[t.body, estilos.detalle, { color: c.danger }]}>Elige al menos uno para que el teléfono te avise.</Text>
            ) : null}
          </View>
          <BotonSecundario etiqueta={`Cambiar la hora (${prefs.hora})`} icono="clock" onPress={() => setEligiendoHora(true)} />
        </>
      ) : null}

      {sinPermiso ? (
        <Text accessibilityRole="alert" style={[t.body, estilos.detalle, { color: c.danger }]}>
          El teléfono no deja que Renaser te avise. Actívalo en los ajustes de notificaciones del teléfono y vuelve a intentarlo.
        </Text>
      ) : null}

      <HoraPickerModal
        visible={eligiendoHora}
        tituloHabito="Hora de tus recordatorios de pago"
        horaInicial={prefs.hora}
        onConfirmar={hora => {
          setEligiendoHora(false);
          cambiar({ hora });
        }}
        onCerrar={() => setEligiendoHora(false)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: 16 },
  tarjeta: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingTop: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
  nombre: { fontFamily: fuentes.seminegrita, fontSize: 17, lineHeight: 24 },
  detalle: { fontSize: 16, lineHeight: 22 },
});
