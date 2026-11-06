import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { useEstadoDelEnvio, useRelojDeLaCarrera } from '../hooks/useCarreraEnVivo';
import { useCentroDelMapa } from '../servicios/centroDelMapa';
import type { EstadoDeLaCarrera, PreferenciasDeLaCarrera } from '../types/carrera.types';
import {
  alDarPasos,
  alPuntoGps,
  AVATAR_INICIAL,
  avatarCamina,
  conRumbo,
  type FiguraDelAvatar,
  type PosicionDelAvatar,
} from '../utils/fusionDelAvatar';
import { rumboEntre } from '../utils/geo';
import { activoMs, ritmoActualSegPorKm, tramosDe, zancadaEstimada } from '../utils/motorDeCarrera';
import { formatoDuracion, formatoEntero, formatoKm, formatoRitmo, ritmoSegPorKm } from '../utils/ritmoYCalorias';
import { chapaDelKm, lineaDelEnvio, TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';
import { MapaDeCarrera } from './MapaDeCarrera';
import { BarraDeslizarParaPausar } from './BarraDeslizarParaPausar';
import { FilaDeTresDatos, PanelEstadisticas, PanelTramos, PanelVoz, PestanasDeLaCarrera, type PestanaDeLaCarrera } from './PanelesDeLaCarrera';

/**
 * La carrera a pantalla completa (spec 042): «Corriendo», «Pausa» y «Terminaste». Recibe el estado del motor y avisa lo que la
 * persona pide; no guarda ni envía nada (eso lo hace `AnfitrionDeLaCarrera`).
 */

export type PanelDeLaPausa = null | 'tramos' | 'estadisticas' | 'voz';

export interface DatosDeLaPersona {
  figura: FiguraDelAvatar;
  iniciales: string;
  fotoUrl: string | null;
}

export function PantallaCorriendo({
  e,
  prefs,
  persona,
  alPausar,
  alSeguir,
  alTerminar,
  alDescartar,
  alCambiarPrefs,
  panel,
  alCambiarPanel,
  bloqueada,
  alBloquear,
  detrasDeLaCuenta = false,
}: {
  /** Montada detrás de la cuenta 3, 2, 1: el mapa ya carga y la pantalla es la de correr aunque la carrera siga en pausa. */
  detrasDeLaCuenta?: boolean;
  e: EstadoDeLaCarrera;
  prefs: PreferenciasDeLaCarrera;
  persona: DatosDeLaPersona;
  alPausar: () => void;
  alSeguir: () => void;
  alTerminar: () => void;
  alDescartar: () => void;
  alCambiarPrefs: (p: PreferenciasDeLaCarrera) => void;
  panel: PanelDeLaPausa;
  alCambiarPanel: (p: PanelDeLaPausa) => void;
  bloqueada: boolean;
  alBloquear: (b: boolean) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const enPausa = e.fase === 'pausa' && !detrasDeLaCuenta;
  const ahora = useRelojDeLaCarrera(true);
  const centroDeVista = useCentroDelMapa();
  // Detrás de la cuenta solo se deja ver el mapa: lo demás ocupa su lugar (el mapa no se mueve al terminar) pero no se ve.
  const soloElMapa = detrasDeLaCuenta ? estilos.invisible : null;
  const [pestana, setPestana] = useState<PestanaDeLaCarrera>('mapa');
  const avatar = useAvatarFusionado(e, ahora);

  useEffect(() => {
    if (!prefs.pantallaEncendida) return;
    void activateKeepAwakeAsync('carrera').catch(() => undefined);
    return () => {
      try {
        deactivateKeepAwake('carrera');
      } catch {
        // Nada.
      }
    };
  }, [prefs.pantallaEncendida]);

  const act = activoMs(e, ahora);
  const tramos = tramosDe(e, ahora);
  const enCurso = tramos.find(t => t.parcial);
  const chapa = enCurso ? chapaDelKm(e.distanciaM, enCurso.segundos) : null;
  const velocidad = (() => {
    const r = ritmoActualSegPorKm(e, ahora);
    return r ? 3600 / r : null;
  })();

  const contenidoDePestana = () => {
    switch (pestana) {
      case 'estadisticas':
        return <PanelEstadisticas e={e} ahora={ahora} />;
      case 'tramos':
        return <PanelTramos tramos={tramos} />;
      case 'voz':
        return <PanelVoz prefs={prefs} onCambiar={alCambiarPrefs} />;
      default:
        return (
          <MapaDeCarrera
            ruta={e.ruta}
            posicion={avatar.estado.posicion}
            centroDeVista={centroDeVista}
            rumbo={avatar.estado.rumbo}
            duracionMs={avatar.duracionMs}
            figura={persona.figura}
            caminando={avatarCamina(avatar.estado, ahora, enPausa, velocidad)}
            iniciales={persona.iniciales}
            fotoUrl={persona.fotoUrl}
            chapa={chapa}
            cuentaId={e.cuentaId}
          />
        );
    }
  };

  if (enPausa && panel) {
    return (
      <View style={[estilos.pantalla, { backgroundColor: c.bg, paddingTop: insets.top + 8 }]}>
        <Presionable
          onPress={() => alCambiarPanel(null)}
          accessibilityRole="button"
          accessibilityLabel="Volver a la pausa"
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={TAMANO_ICONO.grande} color={c.textStrong} />
          <Text style={[estilos.tituloPanel, { color: c.textStrong }]}>
            {panel === 'tramos' ? 'Tus tramos' : panel === 'estadisticas' ? 'Estadísticas' : TEXTOS_DE_LA_CARRERA.vozYSonidos}
          </Text>
        </Presionable>
        <ScrollView contentContainerStyle={[estilos.scrollInterno, { paddingBottom: insets.bottom + 24 }]}>
          {panel === 'tramos' ? <PanelTramos tramos={tramos} /> : panel === 'estadisticas' ? <PanelEstadisticas e={e} ahora={ahora} /> : <PanelVoz prefs={prefs} onCambiar={alCambiarPrefs} />}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[estilos.pantalla, { backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      {enPausa ? (
        <View style={[estilos.franja, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]} accessibilityLiveRegion="polite">
          <Icon name="pause" size={TAMANO_ICONO.chico} color={c.goldInk} />
          <Text style={[estilos.textoFranja, { color: c.goldInk }]}>
            {e.pausaAutomatica ? TEXTOS_DE_LA_CARRERA.pausaAutomatica : TEXTOS_DE_LA_CARRERA.enPausa}
          </Text>
        </View>
      ) : null}
      <View style={[estilos.tiempo, soloElMapa]} accessible accessibilityLabel={`${TEXTOS_DE_LA_CARRERA.duracion}: ${formatoDuracion(act)}`}>
        <Text style={[estilos.tiempoGrande, { color: enPausa ? c.textSoft : c.textStrong }]}>{formatoDuracion(act)}</Text>
        <Text style={[estilos.rotuloTiempo, { color: c.textSoft }]}>{TEXTOS_DE_LA_CARRERA.duracion}</Text>
      </View>
      <View style={soloElMapa}>
        <FilaDeTresDatos e={e} ahora={ahora} atenuado={enPausa} />
      </View>

      {enPausa && !e.pausaAutomatica ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={estilos.pausa}>
          <View style={[estilos.guardada, { backgroundColor: c.successWash }]}>
            <Icon name="checkCircle" size={TAMANO_ICONO.normal} color={c.success} />
            <Text style={[estilos.textoGuardada, { color: c.success }]}>{TEXTOS_DE_LA_CARRERA.guardada}</Text>
          </View>
          <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
            <FilaDePausa icono="listChecks" texto={TEXTOS_DE_LA_CARRERA.verTramos} onPress={() => alCambiarPanel('tramos')} />
            <FilaDePausa icono="chartNoAxesColumn" texto={TEXTOS_DE_LA_CARRERA.verEstadisticas} onPress={() => alCambiarPanel('estadisticas')} />
            <FilaDePausa icono="volume" texto={TEXTOS_DE_LA_CARRERA.vozYSonidos} onPress={() => alCambiarPanel('voz')} />
            <FilaDePausa icono="lock" texto={TEXTOS_DE_LA_CARRERA.bloquearPantalla} onPress={() => alBloquear(true)} ultima />
          </View>
          <GoldButton label={TEXTOS_DE_LA_CARRERA.seguir} icon="play" iconPosition="left" onPress={alSeguir} />
          <GoldButton label={TEXTOS_DE_LA_CARRERA.terminar} variant="outline" onPress={alTerminar} />
          <Presionable onPress={alDescartar} accessibilityRole="button" accessibilityLabel={TEXTOS_DE_LA_CARRERA.descartar} style={estilos.descartar}>
            <Text style={[estilos.textoDescartar, { color: c.danger }]}>{TEXTOS_DE_LA_CARRERA.descartar}</Text>
          </Presionable>
        </ScrollView>
      ) : (
        <>
          <View style={soloElMapa}>
            <PestanasDeLaCarrera valor={pestana} onCambiar={setPestana} />
          </View>
          <View style={{ flex: 1 }}>
            {pestana === 'mapa' ? contenidoDePestana() : <ScrollView contentContainerStyle={estilos.scrollInterno}>{contenidoDePestana()}</ScrollView>}
          </View>
          {enPausa ? (
            <GoldButton label={TEXTOS_DE_LA_CARRERA.seguir} icon="play" iconPosition="left" onPress={alSeguir} />
          ) : (
            <View style={soloElMapa}>
              <BarraDeslizarParaPausar alPausar={alPausar} />
            </View>
          )}
        </>
      )}
      {bloqueada ? <PantallaBloqueada alDesbloquear={() => alBloquear(false)} /> : null}
    </View>
  );
}

function FilaDePausa({ icono, texto, onPress, ultima = false }: { icono: IconName; texto: string; onPress: () => void; ultima?: boolean }) {
  const { c } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={[estilos.filaPausa, ultima ? null : { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider }]}
    >
      <Icon name={icono} size={TAMANO_ICONO.normal} color={c.goldInk} />
      <Text style={[estilos.textoFilaPausa, { color: c.textStrong }]}>{texto}</Text>
      <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
    </Presionable>
  );
}

/** «Bloquear la pantalla»: tapa todo para que un roce no toque nada; se quita manteniendo presionado. */
function PantallaBloqueada({ alDesbloquear }: { alDesbloquear: () => void }) {
  return (
    <Presionable
      onLongPress={alDesbloquear}
      delayLongPress={800}
      accessibilityRole="button"
      accessibilityLabel="Pantalla bloqueada. Mantén presionado para desbloquear"
      contenedorStyle={StyleSheet.absoluteFill}
      style={estilos.bloqueo}
    >
      <Icon name="lock" size={TAMANO_ICONO.grande} color="#FFFFFF" />
      <Text style={estilos.textoBloqueo}>Mantén presionado para desbloquear</Text>
    </Presionable>
  );
}

/** El avatar fusionado (FR-031, FR-032): cada paso lo adelanta al instante; cada punto GPS lo reconcilia. */
function useAvatarFusionado(e: EstadoDeLaCarrera, ahora: number) {
  const [mov, setMov] = useState<{ estado: PosicionDelAvatar; duracionMs: number }>({ estado: AVATAR_INICIAL, duracionMs: 0 });
  const pasosPrevios = useRef(e.pasos);
  const ultimoPunto = useRef<{ lat: number; lng: number; t: number } | null>(null);

  useEffect(() => {
    const delta = e.pasos - pasosPrevios.current;
    pasosPrevios.current = e.pasos;
    if (delta > 0 && e.fase === 'corriendo') setMov(m => alDarPasos(m.estado, delta, zancadaEstimada(e, Date.now()), Date.now()));
  }, [e.pasos, e.fase, e]);

  useEffect(() => {
    const ultimo = e.ruta.length > 0 ? e.ruta[e.ruta.length - 1] : null;
    if (!ultimo || ultimo === ultimoPunto.current) return;
    const anterior = ultimoPunto.current;
    ultimoPunto.current = ultimo;
    const rumbo = anterior ? rumboEntre(anterior, ultimo) : null;
    setMov(m => alPuntoGps(conRumbo(m.estado, rumbo), ultimo));
  }, [e.ruta]);

  // `ahora` solo fuerza a volver a mirar si el avatar dejó de caminar.
  void ahora;
  return mov;
}

/** «Terminaste» (FR-014): mapa, km, duración, ritmo, calorías, tramos, la línea del hábito y «Compartir en el Muro». */
export function PantallaTerminaste({
  final,
  terminadaEnMs,
  conHabito,
  persona,
  alCompartir,
  alListo,
}: {
  final: EstadoDeLaCarrera;
  terminadaEnMs: number;
  conHabito: boolean;
  persona: DatosDeLaPersona;
  alCompartir: () => void;
  alListo: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const envio = useEstadoDelEnvio(final.carreraId);
  const act = activoMs(final, terminadaEnMs);
  const tramos = useMemo(() => tramosDe(final, terminadaEnMs), [final, terminadaEnMs]);
  const ultimo = final.ruta.length > 0 ? final.ruta[final.ruta.length - 1] : null;
  const linea = envio ? lineaDelEnvio(envio, conHabito) : lineaDelEnvio({ tipo: 'enviando', km: formatoKm(final.distanciaM) }, conHabito);
  const exito = envio?.tipo === 'respondida' || envio?.tipo === 'ya-registrada';
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[estilos.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={[estilos.titulo, { color: c.textStrong }]} accessibilityRole="header">
        {TEXTOS_DE_LA_CARRERA.terminaste}
      </Text>
      <MapaDeCarrera
        ruta={final.ruta}
        posicion={ultimo}
        rumbo={0}
        duracionMs={0}
        modo="resumen"
        figura={persona.figura}
        caminando={false}
        iniciales={persona.iniciales}
        fotoUrl={persona.fotoUrl}
        alto={220}
      />
      <View style={estilos.filaDatos}>
        <DatoFinal valor={formatoKm(final.distanciaM)} rotulo="km" />
        <DatoFinal valor={formatoDuracion(act)} rotulo={TEXTOS_DE_LA_CARRERA.duracion} />
      </View>
      <View style={estilos.filaDatos}>
        <DatoFinal valor={formatoRitmo(ritmoSegPorKm(final.distanciaM, act / 1000))} rotulo="Ritmo min/km" />
        <DatoFinal valor={formatoEntero(final.caloriasKcal)} rotulo="Calorías aprox." />
      </View>
      <View
        style={[estilos.envio, { backgroundColor: exito ? c.successWash : c.goldWash }]}
        accessibilityLiveRegion="polite"
        accessible
        accessibilityLabel={linea}
      >
        <Icon name={exito ? 'checkCircle' : 'clock'} size={TAMANO_ICONO.normal} color={exito ? c.success : c.goldInk} />
        <Text style={[estilos.textoEnvio, { color: exito ? c.success : c.goldInk }]}>{linea}</Text>
      </View>
      {envio?.tipo === 'respondida' && envio.respuesta.porRevisar ? (
        <Text style={[estilos.porRevisar, { color: c.textSoft }]}>{TEXTOS_DE_LA_CARRERA.porRevisar}</Text>
      ) : null}
      <Text style={[estilos.subtitulo, { color: c.textStrong }]}>Tramos</Text>
      <PanelTramos tramos={tramos} />
      <GoldButton label={TEXTOS_DE_LA_CARRERA.compartir} variant="outline" icon="share" iconPosition="left" onPress={alCompartir} />
      <GoldButton label={TEXTOS_DE_LA_CARRERA.listo} onPress={alListo} />
    </ScrollView>
  );
}

function DatoFinal({ valor, rotulo }: { valor: string; rotulo: string }) {
  const { c } = useTheme();
  return (
    <View style={[estilos.datoFinal, { backgroundColor: c.cardBgAlt, borderColor: c.border }]} accessible accessibilityLabel={`${rotulo}: ${valor}`}>
      <Text style={[estilos.valorFinal, { color: c.textStrong }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {valor}
      </Text>
      <Text style={[estilos.rotuloFinal, { color: c.textSoft }]}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  invisible: { opacity: 0 },
  pantalla: { flex: 1, paddingHorizontal: 18, gap: 12 },
  franja: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 40 },
  textoFranja: { fontFamily: fuentes.seminegrita, fontSize: 15, flexShrink: 1 },
  tiempo: { alignItems: 'center' },
  tiempoGrande: { fontFamily: fuentes.negrita, fontSize: 56, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  rotuloTiempo: { fontFamily: fuentes.media, fontSize: 14 },
  pausa: { gap: 12, paddingBottom: 12 },
  guardada: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14 },
  textoGuardada: { fontFamily: fuentes.seminegrita, fontSize: 15, flexShrink: 1 },
  lista: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  filaPausa: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16 },
  textoFilaPausa: { flex: 1, fontFamily: fuentes.media, fontSize: 16 },
  descartar: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  textoDescartar: { fontFamily: fuentes.seminegrita, fontSize: 16 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, alignSelf: 'flex-start' },
  tituloPanel: { fontFamily: fuentes.seminegrita, fontSize: 19 },
  scroll: { gap: 14, paddingHorizontal: 18, flexGrow: 1 },
  scrollInterno: { gap: 14, flexGrow: 1 },
  bloqueo: { flex: 1, backgroundColor: 'rgba(17,16,13,0.82)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  textoBloqueo: { color: '#FFFFFF', fontFamily: fuentes.seminegrita, fontSize: 16 },
  titulo: { fontFamily: fuentes.display, fontSize: 30, letterSpacing: -0.5 },
  filaDatos: { flexDirection: 'row', gap: 10 },
  datoFinal: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 2 },
  valorFinal: { fontFamily: fuentes.negrita, fontSize: 24, fontVariant: ['tabular-nums'] },
  rotuloFinal: { fontFamily: fuentes.media, fontSize: 13 },
  envio: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14 },
  textoEnvio: { fontFamily: fuentes.seminegrita, fontSize: 15, flexShrink: 1 },
  subtitulo: { fontFamily: fuentes.seminegrita, fontSize: 17 },
  porRevisar: { fontFamily: fuentes.regular, fontSize: 15 },
});
