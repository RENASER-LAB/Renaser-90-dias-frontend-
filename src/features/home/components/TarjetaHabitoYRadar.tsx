import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { CodigoRenaserModal } from '../../radar/components/CodigoRenaserModal';
import { HojaDeTuRadarDeHoy } from '../../radar/components/HojaDeTuRadarDeHoy';
import { HojaDelRegistroDeEstaHora } from '../../radar/components/HojaDelRegistroDeEstaHora';
import { useRadarEnHoy } from '../../radar/hooks/useRadarEnHoy';
import { FUERA_DE_HORARIO, HOY_SIN_RADAR, miRadarCorresponde, resumenDeMiRadarHoy, TEXTO_DEL_PIE_DE_MI_RADAR } from '../../radar/utils/miRadar';
import { etiquetaDeLaMitad, filasDeLasHorasDeHoy, resumenDelDiaDeHoy } from '../../radar/utils/mitadDelRadar';
import { horaEnPunto, type SlotRadar } from '../../radar/utils/slotsDelRadar';

/**
 * «Hábitos de hoy» y el Radar en una sola tarjeta, en dos mitades iguales y centradas (spec 016, opción A «Lado a lado»,
 * pedido del dueño del 2026-10-29: «así, pero más centrado, para que sea CX/UX»).
 *
 *  - **Izquierda:** el hábito de esta hora (cifra, título y lo que queda). Lleva a Training, como la tarjeta de antes.
 *  - **Derecha:** el Radar. Qué dice y qué hace en cada caso está en `radar/utils/mitadDelRadar.ts`; acá solo se dibuja y se
 *    abre lo que pide: el formulario de siempre (los días 1 a 7, el obligatorio de `RadarContext`; desde el día 8, el mismo
 *    formulario pero que se puede cerrar), la hoja de lo respondido, la hoja «Tu Radar de hoy» o Yo → Mi Radar.
 *  - **Sin Radar** (sin Día 1, backend sin Mi Radar, o mientras no se sabe) la tarjeta es solo la mitad de los hábitos, a todo el
 *    ancho: no hay una mitad vacía ni un «cargando».
 *  - **Letra grande** (`fontScale` > 1,15): las mitades pasan una debajo de la otra y nada se corta.
 *
 * Las dos mitades miden lo mismo (la fila las estira a la más alta) y su contenido va **alineado a la izquierda y arriba**, como
 * la tarjeta «Hábitos de hoy» de antes. > Corregido 2026-10-29 (el dueño, sobre la captura de la mitad de hábitos: «esto alineado
 * como estaba antes, que se vea mejor»). Iba centrado a lo ancho y a lo alto: con títulos de largo distinto, cada renglón de una
 * mitad quedaba a otra altura que el de la otra, y un título en mayúsculas de tres renglones se leía en zigzag. Alineado a la
 * izquierda y arriba, rótulo con rótulo, estado con estado y título con título quedan a la misma altura, y se lee de un tirón.
 *
 * **Movimiento** (`emil-design-eng`, `animate-expo`): ninguno. Es lo más visto de Hoy y lo que cambia (la hora, «Registrado») tiene
 * que leerse en el acto. El toque responde con el fondo lavado de oro (no con la escala de `Presionable`: una mitad que se
 * hundiera dentro de una tarjeta de bordes comunes se vería rota) y con «reducir movimiento» no cambia nada.
 */
export interface DatosDeLaMitadDeHabitos {
  /** `8/18`, o `null` si no hay cifra (sin datos). */
  cifra: string | null;
  titulo: string;
  detalle: string;
  etiquetaAccesible: string;
}

export function TarjetaHabitoYRadar({
  habitos,
  onAbrirTraining,
  diaPrograma,
  inscrito,
  onAbrirMiRadar,
}: {
  habitos: DatosDeLaMitadDeHabitos;
  onAbrirTraining: () => void;
  /** `diaPrograma` e `inscrito` de `GET /home`. Sin Día 1 no hay mitad del Radar. */
  diaPrograma: number | null | undefined;
  inscrito: boolean | null | undefined;
  /** Yo → Mi Radar (`abrirMiRadar`), para planificarlo o cambiar las horas. */
  onAbrirMiRadar: () => void;
}) {
  const { c } = useTheme();
  const { fontScale } = useWindowDimensions();
  const apilar = fontScale > 1.15;

  const [hoja, setHoja] = useState<'resumen' | 'horas' | null>(null);
  /* Desde el día 8 el formulario es de esta tarjeta; los días 1 a 7 es el obligatorio de `RadarContext`. */
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const radar = useRadarEnHoy({ diaPrograma, inscrito, hojaAbierta: hoja !== null });
  const { mitad, ahora } = radar;

  /* Lo que sigue a una hoja (el formulario, Yo) espera a que se vaya del todo: dos `Modal` a la vez, uno subiendo y otro bajando,
     no se llevan bien en Android (`alTerminarDeCerrar`, ver `HojaDelHabito`). */
  const despuesDeLaHoja = useRef<(() => void) | null>(null);
  const cerrarHoja = (luego?: () => void) => {
    despuesDeLaHoja.current = luego ?? null;
    setHoja(null);
  };
  const alIrseLaHoja = () => {
    const luego = despuesDeLaHoja.current;
    despuesDeLaHoja.current = null;
    luego?.();
  };

  const hoy = useMemo(() => resumenDeMiRadarHoy(radar.config, radar.registros, ahora), [radar.config, radar.registros, ahora]);
  const filas = useMemo(() => filasDeLasHorasDeHoy(hoy.horasDeHoy, radar.registros, ahora), [hoy.horasDeHoy, radar.registros, ahora]);
  const motivoSinRegistrar = !hoy.hoyTieneRadar
    ? HOY_SIN_RADAR
    : !hoy.dentroDelHorario
      ? FUERA_DE_HORARIO
      : hoy.yaRegistroEstaHora
        ? 'Ya registraste esta hora'
        : null;

  const slotDeAhora = useMemo<SlotRadar>(() => {
    const hora = ahora.getHours();
    return { hora, etiqueta: horaEnPunto(hora), cierraA: horaEnPunto(hora + 1) };
  }, [ahora]);

  const alTocarElRadar = () => {
    if (!mitad) return;
    switch (mitad.accion) {
      case 'formulario':
        if (miRadarCorresponde(diaPrograma)) setFormularioAbierto(true);
        else radar.abrirFormularioDeLaSemanaUno();
        break;
      case 'resumen':
        setHoja('resumen');
        break;
      case 'horas':
        setHoja('horas');
        break;
      case 'yo':
        onAbrirMiRadar();
        break;
      case 'ninguna':
        break;
    }
  };

  return (
    <>
      <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        <View style={{ flexDirection: apilar ? 'column' : 'row' }}>
          <Mitad
            apilada={apilar}
            icono="listChecks"
            etiqueta="Hábitos de hoy"
            estado={habitos.cifra}
            tono="dorado"
            titulo={habitos.titulo}
            detalle={habitos.detalle}
            destacada={false}
            onPress={onAbrirTraining}
            accesibilidad={habitos.etiquetaAccesible}
          />
          {mitad ? (
            <>
              <View style={apilar ? [estilos.divisorHorizontal, { backgroundColor: c.border }] : [estilos.divisorVertical, { backgroundColor: c.border }]} />
              <Mitad
                apilada={apilar}
                icono={mitad.icono}
                etiqueta={mitad.nombre}
                estado={`${mitad.hora ? `${mitad.hora} · ` : ''}${mitad.estado}`}
                tono={mitad.tono}
                titulo={mitad.titulo}
                detalle={mitad.detalle}
                destacada={mitad.destacada}
                onPress={mitad.accion === 'ninguna' ? undefined : alTocarElRadar}
                accesibilidad={etiquetaDeLaMitad(mitad)}
              />
            </>
          ) : null}
        </View>
      </View>

      <HojaDelRegistroDeEstaHora
        visible={hoja === 'resumen'}
        mitad={mitad}
        ahora={ahora}
        registros={radar.registros}
        leyendo={radar.leyendoRegistros}
        fallo={radar.falloAlLeerRegistros}
        onReintentar={() => void radar.releerRegistros()}
        onCerrar={() => cerrarHoja()}
        alTerminarDeCerrar={alIrseLaHoja}
      />
      <HojaDeTuRadarDeHoy
        visible={hoja === 'horas'}
        filas={filas}
        resumen={radar.config ? resumenDelDiaDeHoy(radar.config, ahora) : null}
        leyendo={radar.leyendoRegistros}
        motivoSinRegistrar={motivoSinRegistrar}
        onRegistrarAhora={() => cerrarHoja(() => setFormularioAbierto(true))}
        onCambiarHoras={() => cerrarHoja(onAbrirMiRadar)}
        onCerrar={() => cerrarHoja()}
        alTerminarDeCerrar={alIrseLaHoja}
      />
      {miRadarCorresponde(diaPrograma) ? (
        <CodigoRenaserModal
          visible={formularioAbierto}
          slot={slotDeAhora}
          obligatorio={false}
          usuarioId={radar.usuarioId}
          enviando={radar.enviando}
          error={radar.errorAlRegistrar}
          onEnviar={radar.registrar}
          onCerrar={() => setFormularioAbierto(false)}
          onLimpiarError={radar.limpiarErrorAlRegistrar}
          textoDelPie={TEXTO_DEL_PIE_DE_MI_RADAR}
        />
      ) : null}
    </>
  );
}

/** Una mitad: el ícono con el rótulo (y el chevron si se toca), una línea de estado, el título y el detalle, a la izquierda. */
function Mitad({
  apilada,
  icono,
  etiqueta,
  estado,
  tono,
  titulo,
  detalle,
  destacada,
  onPress,
  accesibilidad,
}: {
  apilada: boolean;
  icono: IconName;
  etiqueta: string;
  estado: string | null;
  tono: 'dorado' | 'ok' | 'suave';
  titulo: string | null;
  detalle: string;
  destacada: boolean;
  onPress?: () => void;
  accesibilidad: string;
}) {
  const { c, t } = useTheme();
  const colorDelEstado = tono === 'ok' ? c.success : tono === 'suave' ? c.textSoft : c.goldInk;
  const contenido = (
    <>
      <View style={estilos.rotulo}>
        <Icon name={icono} size={TAMANO_ICONO.normal} color={tono === 'ok' ? c.success : c.goldInk} />
        <View style={{ flexShrink: 1 }}>
          <MicroLabel>{etiqueta}</MicroLabel>
        </View>
        {onPress ? <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} /> : null}
      </View>
      {estado ? (
        <Text style={[t.small, estilos.texto, estilos.cifras, { color: colorDelEstado, fontFamily: 'Jost_700Bold' }]}>{estado}</Text>
      ) : null}
      {titulo ? (
        <Text style={[t.cardTitle, estilos.texto, { color: c.text, lineHeight: 21 }]} numberOfLines={3}>
          {titulo}
        </Text>
      ) : null}
      <Text style={[t.small, estilos.texto, { color: c.textSoft }]}>{detalle}</Text>
    </>
  );
  const base = [estilos.mitad, apilada ? null : estilos.mitadEnFila];
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accesibilidad} style={[base, destacada ? { backgroundColor: c.goldWash } : null]}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accesibilidad}
      style={({ pressed }) => [base, { backgroundColor: pressed || destacada ? c.goldWash : 'transparent' }]}
    >
      {contenido}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  /* 48 de alto como mínimo; el contenido va a la izquierda y arriba (renglones parejos entre mitades), y la fila estira las dos
     mitades a la más alta. 16 a los lados, como el `Card` de las demás tarjetas de Hoy. */
  mitad: { minHeight: 48, paddingVertical: 16, paddingHorizontal: 16, alignItems: 'stretch', justifyContent: 'flex-start', gap: 6 },
  /* Reparto parejo del ancho solo en fila: apiladas, un `flex: 1` en una columna sin alto fijo colapsa la mitad. */
  mitadEnFila: { flex: 1 },
  divisorVertical: { width: 1 },
  divisorHorizontal: { height: 1 },
  rotulo: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  /* Un padding mínimo en todo texto: el reciclado de vistas de Android con Fabric arrastra el de otro (E-419, `Legible`). */
  texto: { textAlign: 'left', alignSelf: 'stretch', paddingHorizontal: 1 },
  /** Cifras que cambian en pantalla: ancho de dígito fijo (AGENTS.md §4). */
  cifras: { fontVariant: ['tabular-nums'] },
});
