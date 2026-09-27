import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { cargarPlanHabitos } from '../../habits/hooks/usePlanHabitos';
import { DIAS_DEL_PLAN } from '../../habits/utils/semanaDelPlan';
import { obtenerRocasDeHoy, obtenerRocasDeManana } from '../../objetivos/api/objetivosApi';
import type { Ocurrencia } from '../types/eventos.types';
import { armarAgenda, type AccionParaAgenda, type HabitoParaAgenda, type TipoDeEntrada } from '../utils/miAgenda';
import { diaRelativo } from '../utils/textosDeFecha';
import { fechaEnZona, sumarDiasIso, zonaDelTelefono } from '../utils/zonaHoraria';
import { BotonVolver, LETRA, Parrafo } from './piezas';
import { SemaforoDeLaAgenda } from './SemaforoDeLaAgenda';

const ICONO: Record<TipoDeEntrada, IconName> = { evento: 'calendar', habito: 'clock', accion: 'target' };
const PALABRA: Record<TipoDeEntrada, string> = { evento: 'Evento', habito: 'Hábito', accion: 'Acción' };

/**
 * «Mi agenda» (E-8): los próximos 7 días con lo que cada uno tiene a una hora. Pide los hábitos y las
 * acciones recién cuando se abre; los eventos ya los tiene la sección.
 *
 * Si hábitos o acciones fallan, se muestra lo demás y se dice qué falta: una lectura que falla no
 * borra lo que sí se sabe.
 *
 * Arriba va el semáforo de la persona (`SemaforoDeLaAgenda`, decisión del dueño del 2026-09-26): solo
 * días ya vividos; los de la agenda, que son de hoy en adelante, no llevan color.
 */
export function MiAgenda({
  ocurrencias,
  onVolver,
  onAbrirEvento,
}: {
  ocurrencias: Ocurrencia[];
  onVolver: () => void;
  onAbrirEvento: (eventoId: string) => void;
}) {
  const { c } = useTheme();
  const [habitos, setHabitos] = useState<HabitoParaAgenda[]>([]);
  const [acciones, setAcciones] = useState<AccionParaAgenda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [faltan, setFaltan] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [h, hoy, manana] = await Promise.allSettled([cargarPlanHabitos(), obtenerRocasDeHoy(), obtenerRocasDeManana()]);
      if (!vivo) return;
      const sinLeer: string[] = [];
      if (h.status === 'fulfilled') {
        setHabitos(
          h.value.map(x => ({
            titulo: x.title,
            hora: x.time,
            diasActivos: DIAS_DEL_PLAN.map(d => x.days[d]),
            bloqueado: x.locked,
          })),
        );
      } else sinLeer.push('tus hábitos');
      const rocas = [
        ...(hoy.status === 'fulfilled' ? hoy.value : []),
        ...(manana.status === 'fulfilled' ? manana.value : []),
      ];
      if (hoy.status === 'rejected' && manana.status === 'rejected') sinLeer.push('tus acciones');
      setAcciones(rocas.map(r => ({ fecha: r.fecha, titulo: r.titulo, hora: r.horaInicio })));
      setFaltan(sinLeer);
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const zona = zonaDelTelefono();
  const dias = useMemo(
    () => armarAgenda({ ahoraMs: Date.now(), zona, ocurrencias, habitos, acciones }),
    [zona, ocurrencias, habitos, acciones],
  );
  const hoy = fechaEnZona(Date.now(), zona);
  const manana = sumarDiasIso(hoy, 1);

  return (
    <View style={{ gap: 18 }}>
      <BotonVolver etiqueta="Volver a Eventos" onPress={onVolver} />
      <SemaforoDeLaAgenda />
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
          Mi agenda
        </Text>
        <Parrafo>Lo que tienes a una hora en los próximos 7 días: eventos, hábitos y acciones.</Parrafo>
      </View>
      {cargando ? <Parrafo>Armando tu agenda…</Parrafo> : null}
      {faltan.length > 0 ? <Parrafo tono="peligro">No se pudo leer {faltan.join(' ni ')}; puede faltar algo.</Parrafo> : null}

      {dias.map(dia => (
        <View key={dia.fecha} style={{ gap: 8 }}>
          <Text style={[estilos.dia, { color: c.goldInk }]}>{diaRelativo(dia.fecha, hoy, manana)}</Text>
          {dia.entradas.length === 0 ? (
            <Parrafo>Nada a una hora fija.</Parrafo>
          ) : (
            <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              {dia.entradas.map((e, i) => {
                const contenido = (
                  <>
                    <Text style={[estilos.hora, { color: c.textStrong }]}>{e.hora}</Text>
                    <Icon name={ICONO[e.tipo]} size={18} color={c.goldInk} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[estilos.entrada, { color: c.textStrong }]} numberOfLines={2}>
                        {e.titulo}
                      </Text>
                      <Text style={[estilos.tipo, { color: c.textSoft }]}>
                        {PALABRA[e.tipo]}
                        {e.tipo === 'evento' && e.voy ? ' · vas' : ''}
                      </Text>
                    </View>
                  </>
                );
                const estiloFila = [estilos.fila, { borderTopColor: c.divider, borderTopWidth: i === 0 ? 0 : 1 }];
                return e.eventoId ? (
                  <Pressable
                    key={`${e.tipo}-${e.hora}-${i}`}
                    onPress={() => onAbrirEvento(e.eventoId as string)}
                    accessibilityRole="button"
                    accessibilityLabel={`${e.hora}, ${e.titulo}. Ver el evento.`}
                    style={estiloFila}
                  >
                    {contenido}
                    <Icon name="chevron" size={14} color={c.chevron} />
                  </Pressable>
                ) : (
                  <View key={`${e.tipo}-${e.hora}-${i}`} style={estiloFila}>
                    {contenido}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: LETRA.grande, lineHeight: 28 },
  dia: { fontFamily: 'Jost_700Bold', fontSize: 17, lineHeight: 22 },
  lista: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10 },
  hora: { fontFamily: 'Jost_500Medium', fontSize: 17, width: 54, fontVariant: ['tabular-nums'] },
  entrada: { fontFamily: 'Jost_500Medium', fontSize: LETRA.cuerpo, lineHeight: 21 },
  tipo: { fontFamily: 'Jost_400Regular', fontSize: 16, lineHeight: 21 },
});
