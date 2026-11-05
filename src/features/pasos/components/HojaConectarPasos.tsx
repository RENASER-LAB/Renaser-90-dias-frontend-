import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { abrirPoliticaDePrivacidad } from '../../legal/enlacesLegales';
import { textoDesdeCuando, TEXTOS_DE_PASOS } from '../utils/textosDePasos';

/**
 * «Cuenta tus km solo» (spec 037, D-310; maqueta 1.2, 1.4 y 3.4): la hoja donde la persona acepta que Renaser lea sus pasos y
 * su distancia de Health Connect. Tres líneas, un botón. Es también el consentimiento que pide Google Play: dice qué se lee y
 * quién ve el total de km (el mentor y el ranking). «Conectar» es aceptarlo y abre la pantalla de permisos del sistema.
 *
 * Tres caras en la misma hoja, sin abrir otra encima (en Android una segunda ventana apilada se come los toques):
 * 1. **pregunta** (Android 14 con Health Connect): las tres líneas, «Conectar» y «Ahora no»;
 * 2. **listo**: «Ya contamos tus pasos», la fuente (cuando ya se leyó) y desde qué hora cuenta hoy;
 * 3. **sin soporte** (Android menor a 14, sin Health Connect, iPhone/web): «Sube tu captura». Por decisión del dueño no se
 *    ofrece instalar nada; el botón lleva a la captura de siempre.
 *
 * Sin animación propia: la hoja es la de la app y se ve una vez por cuenta.
 */
export function HojaConectarPasos({
  visible,
  soporte,
  conectada = false,
  conectar,
  fuente,
  desdeLasHoy,
  onCerrar,
  alTerminarDeCerrar,
  onSubirCaptura,
  onAbrirHealthConnect,
}: {
  visible: boolean;
  soporte: 'disponible' | 'no-disponible';
  /**
   * La conexión ya quedó anotada (issue #137). Puede pasar SIN que `conectar` devuelva `true`: en algunos teléfonos el diálogo
   * contesta «no» mientras la persona todavía elige, y la conexión la termina la app al volver a primer plano. La hoja pasa a
   * «Ya contamos tus pasos» igual, en vez de quedarse en «Conectar».
   */
  conectada?: boolean;
  /** Pide el permiso y guarda la conexión. `true` si quedó conectado. */
  conectar: () => Promise<boolean>;
  /** La fuente que ya se leyó («Tu teléfono»); `null` hasta la primera lectura. */
  fuente: string | null;
  /** «14:05» si se conectó hoy. */
  desdeLasHoy: string | null;
  onCerrar: () => void;
  alTerminarDeCerrar?: () => void;
  /** Lleva a la captura de siempre; quien monta la abre cuando la hoja ya se fue. */
  onSubirCaptura: () => void;
  onAbrirHealthConnect: () => void;
}) {
  const { c, t } = useTheme();
  const [paso, setPaso] = useState<'pregunta' | 'listo'>('pregunta');
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const enCurso = useRef(false);
  const despues = useRef<(() => void) | null>(null);

  // Cada vez que se abre empieza de cero (la hoja sigue montada mientras está cerrada).
  useEffect(() => {
    if (visible) {
      setPaso('pregunta');
      setFallo(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && conectada) {
      setPaso('listo');
      setFallo(false);
    }
  }, [visible, conectada]);

  const alConectar = async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setEnviando(true);
    setFallo(false);
    try {
      const ok = await conectar();
      if (ok) setPaso('listo');
      else setFallo(true);
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  const irALaCaptura = () => {
    despues.current = onSubirCaptura;
    onCerrar();
  };

  const alIrse = () => {
    const pendiente = despues.current;
    despues.current = null;
    pendiente?.();
    alTerminarDeCerrar?.();
  };

  const sinSoporte = soporte === 'no-disponible';
  const textos = TEXTOS_DE_PASOS;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      alTerminarDeCerrar={alIrse}
      titulo={sinSoporte ? textos.sinSoporte.titulo : paso === 'listo' ? textos.conectado.titulo : textos.conectar.titulo}
      subtitulo={sinSoporte || paso === 'listo' ? undefined : textos.conectar.subtitulo}
      tamano="contenido"
      etiquetaCerrar="Cerrar"
      pie={
        sinSoporte ? (
          <GoldButton label={textos.sinSoporte.boton} icon="camera" iconPosition="left" onPress={irALaCaptura} textStyle={estilos.textoDelBoton} />
        ) : paso === 'listo' ? (
          <GoldButton label={textos.conectado.listo} onPress={onCerrar} textStyle={estilos.textoDelBoton} />
        ) : (
          <View style={{ gap: 4 }}>
            <GoldButton label={textos.conectar.boton} onPress={() => void alConectar()} loading={enviando} textStyle={estilos.textoDelBoton} />
            <Presionable onPress={onCerrar} accessibilityRole="button" accessibilityLabel={textos.conectar.ahoraNo} style={estilos.ahoraNo}>
              <Text style={[t.body, { color: c.textSoft, fontFamily: fuentes.seminegrita, fontSize: 16 }]}>{textos.conectar.ahoraNo}</Text>
            </Presionable>
          </View>
        )
      }
    >
      <View style={estilos.cuerpo}>
        {sinSoporte ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{textos.sinSoporte.texto}</Text>
        ) : paso === 'listo' ? (
          <View style={{ gap: 10 }}>
            <View style={[estilos.fuente, { borderColor: c.border, backgroundColor: c.cardBg }]}>
              <Text style={[t.small, { color: c.textSoft }]}>{textos.conectado.fuente}</Text>
              <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.seminegrita }]}>{fuente ?? '…'}</Text>
            </View>
            {desdeLasHoy ? <Text style={[t.body, { color: c.textSoft }]}>{textoDesdeCuando(desdeLasHoy)}</Text> : null}
          </View>
        ) : (
          <>
            {textos.conectar.lineas.map((linea, indice) => (
              <View key={linea} style={estilos.linea}>
                <View style={[estilos.icono, { backgroundColor: c.goldWash }]}>
                  <Icon name={ICONOS_DE_LAS_LINEAS[indice]} size={TAMANO_ICONO.normal} color={c.goldInk} />
                </View>
                <Text style={[t.body, { color: c.textStrong, flex: 1, fontSize: 16, lineHeight: 22 }]}>{linea}</Text>
              </View>
            ))}
            {fallo ? (
              <View style={{ gap: 2 }}>
                <Text accessibilityLiveRegion="polite" style={[t.small, { color: c.danger }]}>
                  {textos.errores.noSePudoConectar}
                </Text>
                <Presionable onPress={onAbrirHealthConnect} accessibilityRole="button" accessibilityLabel={textos.abrirHealthConnect} style={estilos.enlace}>
                  <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.seminegrita }]}>{textos.abrirHealthConnect}</Text>
                </Presionable>
              </View>
            ) : null}
            <View style={estilos.piePequeno}>
              <Text style={[t.small, { color: c.textSoft }]}>{textos.conectar.pie} · </Text>
              <Presionable onPress={() => void abrirPoliticaDePrivacidad()} accessibilityRole="link" accessibilityLabel={textos.conectar.politica} style={estilos.enlace}>
                <Text style={[t.small, { color: c.textSoft, textDecorationLine: 'underline' }]}>{textos.conectar.politica}</Text>
              </Presionable>
            </View>
          </>
        )}
      </View>
    </HojaDesdeAbajo>
  );
}

const ICONOS_DE_LAS_LINEAS: readonly IconName[] = ['footprints', 'lock', 'trophy'];

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icono: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fuente: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 2 },
  textoDelBoton: { fontSize: 17, letterSpacing: 0 },
  ahoraNo: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  enlace: { minHeight: 48, justifyContent: 'center' },
  piePequeno: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
