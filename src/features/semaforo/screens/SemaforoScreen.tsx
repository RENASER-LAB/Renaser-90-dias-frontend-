import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { ahoraConfiable } from '../../../services/http/relojServidor';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CifraDelSemaforo } from '../components/CifraDelSemaforo';
import { ControlDePausa } from '../components/ControlDePausa';
import { EtiquetaSemaforo } from '../components/EtiquetaSemaforo';
import { FilaDelDia } from '../components/FilaDelDia';
import { GraficoDeDias, GraficoDeSemanas } from '../components/graficos';
import type { EstadoMiSemaforo } from '../hooks/useMiSemaforo';
import type { ColorSemaforo, DetalleDelSemaforo } from '../types/semaforo.types';
import {
  fechaLarga,
  formatearPorcentaje,
  hoyDeLaPersona,
  momentoDeCalculo,
  palabraDelSemaforo,
  primeraEnMayuscula,
  rangoDeFechas,
  textoDiasConDatos,
} from '../utils/lecturaDelSemaforo';

/**
 * El detalle del semáforo propio: el vigente en grande, los 7 días con su desglose, las semanas
 * cerradas, cómo se calcula y, solo para el staff con programa propio, la pausa.
 *
 * Se abre desde la tarjeta de Hoy o desde el aviso del sábado (ruta `/semaforo`). Es estado de Hoy
 * y no una ruta del navegador, igual que las vistas del mentor y la bandeja de tickets: los cinco
 * tabs no se tocan (AGENTS.md §1).
 *
 * Un único scroll (AGENTS.md §2), cuerpo de 16 px y controles de 48 px (§5 del contrato: público de
 * 50 a 60 años). Sin animaciones de entrada ni adornos. NO recalcula nada: lo que se ve es lo que
 * mandó el servidor.
 *
 * No pide datos: recibe la MISMA lectura que pinta la tarjeta (`useMiSemaforo`, que vive en Hoy).
 */
export function SemaforoScreen({
  semaforo,
  onVolver,
  onPausaCambiada,
}: {
  semaforo: EstadoMiSemaforo;
  onVolver: () => void;
  /** Pausar o volver a medir cambia el resumen de `/home`: Hoy lo relee con esto. */
  onPausaCambiada?: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const { detalle } = semaforo;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          onPress={onVolver}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>VOLVER</Text>
        </Pressable>
        <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18, flex: 1 }]} numberOfLines={1}>
          Tu semáforo
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          estilos.contenido,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
      >
        {detalle ? (
          <Detalle detalle={detalle} semaforo={semaforo} onPausaCambiada={onPausaCambiada} />
        ) : semaforo.fallo ? (
          <Fallo semaforo={semaforo} />
        ) : (
          <ActivityIndicator color={c.goldInk} style={{ marginTop: 32 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Detalle({
  detalle,
  semaforo,
  onPausaCambiada,
}: {
  detalle: DetalleDelSemaforo;
  semaforo: EstadoMiSemaforo;
  onPausaCambiada?: () => void;
}) {
  const { c, t } = useTheme();
  const cuerpo = [t.body, { color: c.text, fontSize: 16, lineHeight: 23 }];

  if (!detalle.aplica) {
    return (
      <Text style={[cuerpo, { marginTop: 8 }]}>
        Tu semáforo se mide cuando tienes el programa de 90 días activado. Por ahora no hay nada que medir.
      </Text>
    );
  }

  const vigente = detalle.vigente;
  const color: ColorSemaforo = vigente?.color ?? 'SIN_DATOS';
  const calculado = momentoDeCalculo(detalle.calculadoEn);
  const hoy = hoyDeLaPersona(detalle, ahoraConfiable());

  const alCambiarPausa = async (accion: Promise<boolean>) => {
    if (await accion) onPausaCambiada?.();
  };

  return (
    <>
      {/* 1. El vigente, en grande. El corte (qué días y cuándo se calculó) queda a la vista. */}
      <View style={{ gap: 6 }}>
        <MicroLabel>Últimos 7 días</MicroLabel>
        {vigente ? (
          <Text style={[cuerpo, { color: c.textSoft }]}>
            {primeraEnMayuscula(rangoDeFechas(vigente.desde, vigente.hasta))}
          </Text>
        ) : null}
        <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>
          {calculado ? `Calculado el ${calculado}.` : 'Todavía no se calculó ningún día.'}
        </Text>
      </View>

      <View
        style={{ gap: 8 }}
        accessible
        accessibilityLabel={
          `Tu semáforo: ${palabraDelSemaforo(color, vigente?.etiqueta)}` +
          (vigente?.porcentaje != null ? `, ${formatearPorcentaje(vigente.porcentaje)}` : '') +
          (vigente?.diasConDatos != null ? `. ${textoDiasConDatos(vigente.diasConDatos)}.` : '.')
        }
      >
        <CifraDelSemaforo porcentaje={vigente?.porcentaje ?? null} color={color} tamano="grande" />
        <EtiquetaSemaforo color={color} etiqueta={vigente?.etiqueta} tamano="grande" />
        {vigente?.diasConDatos != null ? (
          <Text style={[cuerpo, { color: c.textSoft }]}>{textoDiasConDatos(vigente.diasConDatos)}</Text>
        ) : null}
        {detalle.pausa && detalle.pausa.desde <= hoy ? (
          <Text style={[cuerpo, { color: c.textSoft }]}>En pausa hasta el {fechaLarga(detalle.pausa.hasta)}.</Text>
        ) : null}
      </View>

      {/* 2. Los 7 días: el gráfico para ver el patrón, la lista para leer los números. */}
      {vigente && vigente.dias.length > 0 ? (
        <View style={{ gap: 16 }}>
          <GraficoDeDias dias={vigente.dias} tamano="grande" />
          <View>
            {vigente.dias.map((dia, i) => (
              <FilaDelDia key={dia.fecha} dia={dia} primera={i === 0} />
            ))}
          </View>
        </View>
      ) : null}

      {/* 3. Las semanas cerradas. */}
      <View style={{ gap: 10 }}>
        <MicroLabel>Semanas cerradas</MicroLabel>
        {detalle.semanas.length > 0 ? (
          <>
            <Text style={[cuerpo, { color: c.textSoft }]}>Cada barra es una semana, de sábado a viernes.</Text>
            <View style={{ marginTop: 6 }}>
              <GraficoDeSemanas semanas={detalle.semanas} />
            </View>
          </>
        ) : (
          <Text style={[cuerpo, { color: c.textSoft }]}>Todavía no se cerró ninguna semana.</Text>
        )}
      </View>

      {/* 4. Cómo se calcula, en palabras. */}
      <ComoSeCalcula />

      {/* 5. La pausa: solo el staff con programa propio. El aprendiz no puede apagarlo. */}
      {detalle.obligatorio ? null : (
        <View style={{ gap: 10 }}>
          <MicroLabel>Pausar tu semáforo</MicroLabel>
          <ControlDePausa
            pausa={detalle.pausa}
            hoy={hoy}
            guardando={semaforo.guardando}
            error={semaforo.errorDeAccion}
            onPausar={hasta => void alCambiarPausa(semaforo.pausar(hasta))}
            onReanudar={() => void alCambiarPausa(semaforo.reanudar())}
          />
        </View>
      )}
    </>
  );
}

/**
 * La explicación corta. Los umbrales se escriben con las palabras del contrato (§1).
 *
 * Es texto fijo de la app: si el dueño cambiara un umbral en el servidor, esto habría que publicarlo
 * de nuevo (la app no se actualiza por aire).
 */
function ComoSeCalcula() {
  const { c, t } = useTheme();
  const cuerpo = [t.body, { color: c.text, fontSize: 16, lineHeight: 23 }];
  const umbrales: Array<{ color: ColorSemaforo; texto: string }> = [
    { color: 'VERDE', texto: '80 % o más' },
    { color: 'AMARILLO', texto: 'de 60 a 79.9 %' },
    { color: 'ROJO', texto: 'menos de 60 %' },
    { color: 'SIN_DATOS', texto: 'ningún día con algo programado' },
  ];

  return (
    <View style={{ gap: 10 }}>
      <MicroLabel>Cómo se calcula</MicroLabel>
      <Text style={cuerpo}>
        Cada día se mide lo que cumpliste de lo que tenías: tus hábitos y los objetivos que planificaste
        para ese día.
      </Text>
      <Text style={cuerpo}>
        Un hábito opcional que no hiciste no te baja el porcentaje. Un objetivo planificado que no
        cumpliste, sí.
      </Text>
      <Text style={cuerpo}>
        Tu semáforo es el promedio de los últimos 7 días que tuvieron algo programado. Los días sin nada
        programado no cuentan.
      </Text>
      <Text style={cuerpo}>La semana va de sábado a viernes y se cierra el sábado a las 00:00.</Text>
      <View style={{ gap: 8, marginTop: 4 }}>
        {umbrales.map(u => (
          <View key={u.color} style={estilos.umbral}>
            <EtiquetaSemaforo color={u.color} />
            <Text style={[cuerpo, { color: c.textSoft, flexShrink: 1 }]}>· {u.texto}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Por qué no hay semáforo. Un 404 es "todavía no está disponible" —sin botón, reintentar no lo
 * arregla—; el resto ofrece reintentar.
 */
function Fallo({ semaforo }: { semaforo: EstadoMiSemaforo }) {
  const { c, t } = useTheme();
  const noDisponible = semaforo.fallo === 'no_disponible';

  return (
    <View style={estilos.caja}>
      <Icon name="info" size={26} color={c.chevron} />
      <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 10, textAlign: 'center' }]}>
        {noDisponible
          ? 'Tu semáforo todavía no está disponible'
          : semaforo.fallo === 'sin_red'
            ? 'No pudimos conectar'
            : 'No pudimos cargar tu semáforo'}
      </Text>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 6 }]}>
        {noDisponible
          ? 'Cuando esté listo lo vas a ver aquí, sin hacer nada.'
          : semaforo.fallo === 'sin_red'
            ? 'Revisa tu conexión y vuelve a intentarlo.'
            : 'Vuelve a intentarlo. Si sigue pasando, avísanos por soporte.'}
      </Text>
      {/* El detalle técnico solo cuando aporta: dice qué cambió en el servidor. */}
      {semaforo.fallo === 'error' && semaforo.detalleDelFallo ? (
        <Text style={[t.micro, { color: c.chevron, textAlign: 'center', marginTop: 8 }]}>{semaforo.detalleDelFallo}</Text>
      ) : null}
      {noDisponible ? null : (
        <Pressable
          onPress={semaforo.recargar}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.reintentar, { borderColor: c.borderStrong, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[t.body, { fontSize: 16, color: c.textStrong, fontFamily: 'Jost_700Bold' }]}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 10 },
  /* 48 px de alto: el mínimo cómodo para una sola mano (AGENTS.md §4). */
  volver: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 6 },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: 36 + ESPACIO_PARA_LANZADOR, gap: 28 },
  umbral: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  caja: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, paddingHorizontal: 18 },
  reintentar: {
    marginTop: 16,
    minHeight: 48,
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
