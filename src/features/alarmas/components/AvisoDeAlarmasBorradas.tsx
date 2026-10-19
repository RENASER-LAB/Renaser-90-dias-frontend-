import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Presionable } from '../../../components/Presionable';
import { useAuth } from '../../../context/AuthContext';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useTheme } from '../../../theme/ThemeContext';
import { abrirGuiaDeLaMarca } from '../abrirGuiaDeLaMarca';
import { lineaDeLaGuia, TEXTO_PREVENTIVO, TITULO_PREVENTIVO } from '../data/guiasPorMarca';
import { fotoDeLasAlarmasAlAbrir } from '../alarmasVivas';
import { revisarDetencionForzada, type ResultadoDeLaRevision } from '../detencionForzada';
import { alPedirLaGuiaPreventiva } from '../pedidoDeLaGuia';
import { esperarLaPuestaAlDia, ponerAlDiaLasAlarmas } from '../ponerAlDiaLasAlarmas';
import { marcaDelTelefono } from '../utils/marcaDelTelefono';

/**
 * Al abrir la app: «Tu teléfono cerró Renaser» (spec 007, historia 2, FR-006 a FR-008).
 *
 * ## Qué pasa
 *
 * Honor y Huawei (y a veces Xiaomi, Oppo o Vivo) tratan «quitar de recientes» o el ahorro de batería como
 * una detención forzada: Android borra todas las alarmas de Renaser hasta que la persona vuelve a abrir la
 * app. Ningún tipo de alarma lo evita. Lo único posible es que la persona lo sepa y cambie un ajuste de su
 * teléfono, que cambia según la marca.
 *
 * ## Qué hace
 *
 * Una vez por apertura de la app, con sesión (Android): primero deja las alarmas al día
 * ({@link ponerAlDiaLasAlarmas}, esperando a la corrida de `RearmadorDeAlarmas` si ya arrancó) y después
 * pregunta al módulo nativo si el sistema detuvo la app a la fuerza desde la última revisión
 * ({@link revisarDetencionForzada}). Solo si sí y hoy no se avisó, abre una hoja desde abajo con dos
 * frases, la línea de la marca y dos botones: «Arreglarlo» (abre la pantalla de la marca) y «Ahora no».
 * Quitar la app de recientes en un Android sin capa del fabricante, o que el sistema la cierre por memoria,
 * no avisa nada.
 *
 * ## Refuerzos generales (spec 007, FR-020 y FR-021)
 *
 * - **No depende del motivo de salida**: antes de rearmar se toma la foto de si las alarmas siguen vivas
 *   ({@link fotoDeLasAlarmasAlAbrir}); si la app tenía alarmas programadas y el sistema no tiene ninguna suya,
 *   también se avisa, aunque la marca no cuente por qué salió el proceso.
 * - **La misma hoja, antes de que pase**: en las marcas que detienen apps, la primera vez que la persona activa un
 *   recordatorio (`guiaPreventiva.ts`, llamada al guardar en Training) se muestra con texto preventivo («En tu
 *   teléfono, Renaser necesita un ajuste para que tus alarmas suenen siempre.») y el botón «Ajustarlo». Si ya hay
 *   otra hoja abierta, no se le pone una encima.
 *
 * Vive en `App.tsx`, por encima del navegador, junto a `RearmadorDeAlarmas`: ninguna pestaña cambia. Con la
 * hoja cerrada no pinta nada.
 *
 * ## Movimiento (`emil-design-eng`, `animate-expo`)
 *
 * Ninguno propio: lo de `HojaDesdeAbajo` (que se ve pocas veces) y el hundido de `Presionable` al apoyar el
 * dedo. Sin vibración: el aviso informa, no confirma una acción de la persona.
 */

export const TITULO_DEL_AVISO = 'Tu teléfono cerró Renaser';
/** Dos frases, en tuteo (dueño, 28/09: «mucho texto marea al usuario»). La línea de la marca va aparte. */
export const TEXTO_DEL_AVISO = 'Por eso no sonaron tus alarmas. Ya las volvimos a poner.';

/** `borradas`: el teléfono ya cerró Renaser. `preventiva`: la guía antes de que pase (FR-021). */
type ModoDeLaHoja = 'borradas' | 'preventiva';

/** Los botones de la hoja van en tipo oración, sin espaciar (como los demás pies de hoja). */
const TEXTO_DE_BOTON = { fontSize: 16, letterSpacing: 0 } as const;

/**
 * La revisión de esta apertura. Una sola por proceso: una detención forzada mata el proceso, así que
 * la siguiente apertura que importa es un proceso nuevo con esta variable en blanco. Cerrar sesión y entrar
 * con otra cuenta, o volver a montar el componente, no repiten el aviso de la misma detención.
 */
let revisionDeEstaApertura: Promise<ResultadoDeLaRevision> | null = null;
let yaSeMostroEnEstaApertura = false;

/** Solo para las pruebas. */
export function olvidarLaRevisionDeEstaApertura(): void {
  revisionDeEstaApertura = null;
  yaSeMostroEnEstaApertura = false;
}

async function revisarAlAbrir(userId: string): Promise<ResultadoDeLaRevision> {
  try {
    // FR-020: la foto de las alarmas va ANTES de rearmar, o el rearmado las dejaría puestas y no se vería el borrado.
    // Normalmente ya la tomó la primera puesta al día del proceso; esto solo asegura el orden.
    void fotoDeLasAlarmasAlAbrir();
    await ponerAlDiaLasAlarmas(userId).catch(() => null);
    // Si `RearmadorDeAlarmas` ya tenía una corrida en marcha, la de arriba volvió sin esperarla.
    await esperarLaPuestaAlDia();
    return await revisarDetencionForzada(userId);
  } catch {
    return 'nada';
  }
}

export function AvisoDeAlarmasBorradas() {
  const { user } = useAuth();
  const { c, t } = useTheme();
  const userId = user?.id ?? null;
  const [visible, setVisible] = useState(false);
  // Qué dice la hoja. No se reinicia al cerrar: durante la salida la hoja sigue mostrando lo mismo.
  const [modo, setModo] = useState<ModoDeLaHoja>('borradas');
  // Para que el pedido de la guía preventiva sepa, sin esperar a un render, si ya hay una hoja abierta.
  const abierta = useRef(false);
  const linea = useMemo(() => lineaDeLaGuia(marcaDelTelefono()), []);

  const abrirHoja = useCallback((cual: ModoDeLaHoja) => {
    abierta.current = true;
    setModo(cual);
    setVisible(true);
  }, []);
  const cerrar = useCallback(() => {
    abierta.current = false;
    setVisible(false);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !userId) return undefined;
    let vigente = true;
    revisionDeEstaApertura ??= revisarAlAbrir(userId);
    void revisionDeEstaApertura.then(resultado => {
      if (!vigente || resultado !== 'avisar' || yaSeMostroEnEstaApertura) return;
      yaSeMostroEnEstaApertura = true;
      abrirHoja('borradas');
    });
    return () => {
      vigente = false;
    };
  }, [userId, abrirHoja]);

  // FR-021: la guía antes de que pase. Solo Android; si ya hay otra hoja abierta, responde que no (no se marca).
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    return alPedirLaGuiaPreventiva(() => {
      if (abierta.current) return false;
      abrirHoja('preventiva');
      return true;
    });
  }, [abrirHoja]);

  // El gesto atrás del sistema cierra la hoja y no minimiza la app (AGENTS.md §6).
  const alAtras = useCallback(() => {
    cerrar();
    return true;
  }, [cerrar]);
  useSystemBackHandler(alAtras, visible);

  const arreglar = useCallback(() => {
    cerrar();
    void abrirGuiaDeLaMarca();
  }, [cerrar]);

  const preventiva = modo === 'preventiva';

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={cerrar}
      titulo={preventiva ? TITULO_PREVENTIVO : TITULO_DEL_AVISO}
      etiquetaCerrar="Cerrar el aviso"
      pie={
        <View style={estilos.pie}>
          <GoldButton
            label={preventiva ? 'Ajustarlo' : 'Arreglarlo'}
            onPress={arreglar}
            textStyle={TEXTO_DE_BOTON}
            style={estilos.ancho}
          />
          <Presionable
            onPress={cerrar}
            accessibilityRole="button"
            accessibilityLabel="Ahora no"
            contenedorStyle={estilos.ancho}
            style={estilos.ahoraNo}
          >
            <Text style={[estilos.etiquetaAhoraNo, { color: c.textSoft }]}>Ahora no</Text>
          </Presionable>
        </View>
      }
    >
      <View style={estilos.cuerpo}>
        <Text style={[t.body, estilos.texto, { color: c.textStrong }]}>{preventiva ? TEXTO_PREVENTIVO : TEXTO_DEL_AVISO}</Text>
        <View style={[estilos.guia, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
          <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>{linea}</Text>
        </View>
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingBottom: 4, gap: 12 },
  texto: { fontSize: 16, lineHeight: 24 },
  guia: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  pie: { gap: 4 },
  ancho: { width: '100%' },
  /** 48 de alto: el mínimo de toque cómodo con una mano (AGENTS.md §4). */
  ahoraNo: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  etiquetaAhoraNo: { fontFamily: 'Jost_500Medium', fontSize: 16, lineHeight: 22 },
});
