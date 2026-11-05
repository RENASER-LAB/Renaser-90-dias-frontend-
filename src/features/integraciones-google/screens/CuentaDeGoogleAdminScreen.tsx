import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Icon } from '../../../components/Icon';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { confirmar } from '../../admin/utils/dialogo';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { useCuentaDeGoogle, type FalloDeLaCuenta } from '../hooks/useCuentaDeGoogle';
import {
  CONFIRMACION_DE_DESCONECTAR,
  ETIQUETA_CONECTAR,
  ETIQUETA_DESCONECTAR,
  ETIQUETA_RECONECTAR,
  resultadoDeLaAccion,
  SUBTITULO_DE_LA_PANTALLA,
  TEXTO_DESCONECTADA,
  TEXTO_HAY_QUE_RECONECTAR,
  TEXTO_NO_DISPONIBLE,
  TEXTO_NO_SE_PUDO_ABRIR,
  TEXTO_NO_SE_PUDO_LEER,
  TEXTO_SIN_CREDENCIALES,
  TEXTO_SIN_CUENTA,
  TEXTO_SIN_PERMISO,
  TEXTO_SIN_RED,
  TEXTO_TERMINA_EN_EL_NAVEGADOR,
  textoDeCuandoSeConecto,
  textoDeLaAccion,
  textoDelUltimoUso,
  TITULO_DE_LA_PANTALLA,
  fechaYHora,
  vistaDeLaCuenta,
} from '../utils/cuentaDeGoogle';

const TEXTO_DEL_FALLO: Record<FalloDeLaCuenta, string> = {
  sin_permiso: TEXTO_SIN_PERMISO,
  no_disponible: TEXTO_NO_DISPONIBLE,
  sin_red: TEXTO_SIN_RED,
  error: TEXTO_NO_SE_PUDO_LEER,
};

/**
 * «Cuenta de Google» (spec 040, D-321, FR-010, FR-011, FR-015): la cuenta Gmail de Renaser que crea los enlaces de Meet de los eventos.
 * Yo → Administración → Más opciones; solo ADMIN y ALCHEMIST (el servidor vuelve a autorizar cada pedido).
 *
 * - **Conectar** abre Google en el navegador (el servidor da la dirección, atada a esta persona por 15 minutos). Al volver a Renaser la
 *   pantalla relee el estado; hasta entonces no dice «conectada».
 * - **Nunca se muestra un permiso ni un token**: el correo, cuándo se conectó, el último uso, el último error y las últimas acciones.
 * - **Desconectar** pide confirmación y dice que los enlaces ya creados siguen funcionando.
 *
 * Movimiento (`emil-design-eng`, `animate-expo`): se usa de vez en cuando, así que nada nuevo se anima; la confirmación en línea trae su
 * fundido y `tacto.logro()` una vez, al quedar desconectada.
 */
export function CuentaDeGoogleAdminScreen({ onVolver }: { onVolver: () => void }) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { cuenta, cargando, trabajando, fallo, esperandoAGoogle, conectar, desconectar, recargar } = useCuentaDeGoogle();
  const [hecho, setHecho] = useState<{ clave: number; texto: string } | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const alDesconectar = async () => {
    if (!(await confirmar(CONFIRMACION_DE_DESCONECTAR.titulo, CONFIRMACION_DE_DESCONECTAR.mensaje, { ok: CONFIRMACION_DE_DESCONECTAR.ok }))) return;
    if (await desconectar()) {
      tacto.logro();
      setHecho({ clave: Date.now(), texto: TEXTO_DESCONECTADA });
    }
  };

  const vista = cuenta ? vistaDeLaCuenta(cuenta) : null;
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo={TITULO_DE_LA_PANTALLA} subtitulo={SUBTITULO_DE_LA_PANTALLA} onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {cargando && !cuenta ? <Text style={cuerpo}>Cargando…</Text> : null}

        {cuenta && vista ? (
          <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            {vista.tipo === 'sin_credenciales' ? <Text style={cuerpo}>{TEXTO_SIN_CREDENCIALES}</Text> : null}
            {vista.tipo === 'sin_cuenta' ? <Text style={cuerpo}>{TEXTO_SIN_CUENTA}</Text> : null}

            {vista.tipo === 'activa' || vista.tipo === 'revocada' ? (
              <View style={{ gap: 6 }}>
                <View style={estilos.estado}>
                  <Icon
                    name={vista.tipo === 'activa' ? 'checkCircle' : 'alertTriangle'}
                    size={20}
                    color={vista.tipo === 'activa' ? c.success : c.danger}
                  />
                  <Text style={[estilos.titulo, { color: c.textStrong }]}>
                    {vista.tipo === 'activa' ? 'Conectada' : 'Hay que volver a conectarla'}
                  </Text>
                </View>
                {vista.correo ? <Text style={[estilos.titulo, { color: c.textStrong }]}>{vista.correo}</Text> : null}
                {textoDeCuandoSeConecto(cuenta) ? <Text style={cuerpo}>{textoDeCuandoSeConecto(cuenta)}</Text> : null}
                {textoDelUltimoUso(cuenta) ? <Text style={cuerpo}>{textoDelUltimoUso(cuenta)}</Text> : null}
                {vista.tipo === 'revocada' ? <Text style={cuerpo}>{TEXTO_HAY_QUE_RECONECTAR}</Text> : null}
                {cuenta.ultimoError ? <Text style={cuerpo}>Último problema: {cuenta.ultimoError}</Text> : null}
              </View>
            ) : null}

            {esperandoAGoogle ? (
              <Text accessibilityLiveRegion="polite" style={cuerpo}>
                {TEXTO_TERMINA_EN_EL_NAVEGADOR}
              </Text>
            ) : null}

            {vista.tipo === 'sin_cuenta' ? (
              <BotonPrincipal etiqueta={ETIQUETA_CONECTAR} icono="link" cargando={trabajando} onPress={() => void conectar()} />
            ) : null}
            {vista.tipo === 'activa' || vista.tipo === 'revocada' ? (
              <View style={{ gap: 10 }}>
                {vista.tipo === 'revocada' ? (
                  <BotonPrincipal etiqueta={ETIQUETA_RECONECTAR} icono="link" cargando={trabajando} onPress={() => void conectar()} />
                ) : (
                  <BotonSecundario etiqueta={ETIQUETA_RECONECTAR} icono="link" deshabilitado={trabajando} onPress={() => void conectar()} />
                )}
                <BotonSecundario etiqueta={ETIQUETA_DESCONECTAR} deshabilitado={trabajando} onPress={() => void alDesconectar()} />
              </View>
            ) : null}
          </View>
        ) : null}

        {cuenta && cuenta.acciones.length > 0 ? (
          <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <Text style={[estilos.titulo, { color: c.textStrong }]}>Últimas acciones</Text>
            {cuenta.acciones.map((accion, i) => (
              <View
                key={`${accion.en ?? i}-${i}`}
                accessible
                accessibilityLabel={`${textoDeLaAccion(accion)}. ${resultadoDeLaAccion(accion)}. ${fechaYHora(accion.en) ?? ''}`}
                style={estilos.accion}
              >
                <Icon name={accion.exito === false ? 'alertTriangle' : 'checkCircle'} size={16} color={accion.exito === false ? c.danger : c.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22 }]}>{textoDeLaAccion(accion)}</Text>
                  <Text style={[t.small, { color: c.textSoft, fontSize: 16 }]}>
                    {resultadoDeLaAccion(accion)}
                    {fechaYHora(accion.en) ? ` · ${fechaYHora(accion.en)}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {hecho ? (
          <ConfirmacionEnLinea key={hecho.clave} texto={hecho.texto} onTerminar={() => setHecho(null)} />
        ) : null}

        {fallo ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {cuenta && fallo === 'error' ? TEXTO_NO_SE_PUDO_ABRIR : TEXTO_DEL_FALLO[fallo]}
            </Text>
            {fallo !== 'sin_permiso' && fallo !== 'no_disponible' ? (
              <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17, gap: 12 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { fontFamily: fuentes.media, fontSize: 17, lineHeight: 24, flexShrink: 1 },
  accion: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 44 },
});
