import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../../components/Alerta';
import { Checkbox } from '../../../../components/Checkbox';
import { GoldButton } from '../../../../components/GoldButton';
import { SignatureCanvas, SignatureCanvasHandle, SignatureData } from '../../../../components/SignatureCanvas';
import { useSystemBackHandler } from '../../../../hooks/useSystemBackHandler';
import { useTheme } from '../../../../theme/ThemeContext';
import { tacto } from '../../../../utils/tacto';
import { MarcoDePaso } from '../../components/MarcoDePaso';
import type { TerminosDeMiFormacionApi } from '../api/terminosSchemas';
import { ContenidoDeLosTerminos } from '../components/ContenidoDeLosTerminos';
import { avisoDeSellar, useSellarTerminos } from '../hooks/useSellarTerminos';
import { explicacionDeLaAceptacion, titularDeLaAceptacion } from '../utils/pendienteDeTerminos';

/**
 * «Actualizamos nuestros términos» (spec 027, FR-016): la pantalla que sale al abrir la app cuando Administración publicó unos términos y pidió aceptarlos de
 * nuevo, o cuando la persona entra a una formación cuyos términos todavía no aceptó (personal asignado, aprendiz trasladado). **No se puede usar el resto de la
 * app hasta aceptar**; sí se puede cerrar sesión (la flecha de arriba). Casilla y firma, igual que la primera vez (Q3-A); lleva la nota de lo que cambió.
 *
 * Es la misma pantalla de siempre en lo que importa —las cláusulas numeradas, la casilla, el lienzo de la firma— con otro titular. El atrás del sistema cierra la
 * sesión, que es la única salida: nunca deja pasar a la app sin aceptar.
 */
export function TerminosActualizadosScreen({
  terminos,
  alAceptar,
  alCerrarSesion,
  alCambiar,
}: {
  terminos: TerminosDeMiFormacionApi;
  /** Quedó aceptada: quien la muestra relee y deja pasar. */
  alAceptar: () => void;
  alCerrarSesion: () => void;
  /** Los términos cambiaron mientras leía: relee el texto. */
  alCambiar: () => Promise<unknown>;
}) {
  const { c, t } = useTheme();
  const sellar = useSellarTerminos();
  const firmaRef = useRef<SignatureCanvasHandle>(null);
  const [aceptado, setAceptado] = useState(false);
  const [firma, setFirma] = useState<SignatureData | null>(null);
  const [mostrarError, setMostrarError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const version = terminos.version;

  useSystemBackHandler(() => {
    alCerrarSesion();
    return true;
  }, true);

  if (!version) return null;

  const continuar = async () => {
    if (!aceptado) {
      setMostrarError(true);
      tacto.error();
      Alert.alert('Aceptación requerida', 'Por favor marca la casilla de lectura y aceptación de los términos y condiciones.');
      return;
    }
    if (!firma) {
      setMostrarError(true);
      tacto.error();
      Alert.alert('Firma requerida', 'Por favor dibuja tu firma con el dedo en el recuadro para validar la aceptación legal.');
      return;
    }
    if (guardando) return;
    setGuardando(true);
    try {
      const resultado = await sellar({ capturarFirma: async () => firmaRef.current?.capturarComoPngBase64(), trazos: firma.data, versionId: version.id });
      if (resultado.tipo !== 'ok') {
        if (resultado.tipo === 'cambiaron') await alCambiar();
        const aviso = avisoDeSellar(resultado);
        Alert.alert(aviso.titulo, aviso.mensaje);
        return;
      }
      tacto.logro();
      alAceptar();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <MarcoDePaso
      alVolver={alCerrarSesion}
      etiquetaVolver="Cerrar sesión"
      accesibilidadVolver="Cerrar sesión"
      pie={<GoldButton label="ACEPTAR" onPress={continuar} loading={guardando} icon="arrow" />}
    >
      <View style={estilos.encabezado}>
        <Text style={[t.micro, { color: c.micro, textTransform: 'uppercase' }]}>{terminos.formation.name}</Text>
        <Text accessibilityRole="header" style={[t.screenTitle, { color: c.textStrong }]}>
          {titularDeLaAceptacion(terminos)}
        </Text>
        <Text style={[t.body, { color: c.textSoft }]}>{explicacionDeLaAceptacion(terminos)}</Text>
      </View>

      <View style={estilos.cuerpo}>
        {terminos.changeNote ? (
          <View style={[estilos.nota, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
            <Text style={[t.small, { color: c.goldInk, fontSize: 14 }]}>Lo que cambió</Text>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23 }]}>{terminos.changeNote}</Text>
          </View>
        ) : null}

        <ContenidoDeLosTerminos introduccion={version.introduction ?? ''} clausulas={version.clauses} />

        <View style={[estilos.tarjetaFirma, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <SignatureCanvas
            ref={firmaRef}
            onSignatureChange={(valida, datos) => {
              setFirma(valida ? datos : null);
              if (valida && mostrarError) setMostrarError(false);
            }}
            label="Firma de aceptación legal (con tu dedo)"
            error={mostrarError && !firma ? 'Por favor dibuja tu firma con el dedo para continuar' : null}
          />
        </View>

        <Checkbox
          checked={aceptado}
          onToggle={valor => {
            tacto.seleccion();
            setAceptado(valor);
            if (valor && mostrarError) setMostrarError(false);
          }}
          title={version.checkboxText}
          subtitle="Este es un compromiso legal y ético entre tú y el sistema Renaser."
        />
      </View>
    </MarcoDePaso>
  );
}

const estilos = StyleSheet.create({
  encabezado: { gap: 8, marginBottom: 24 },
  cuerpo: { gap: 14 },
  nota: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  tarjetaFirma: { borderWidth: 1, borderRadius: 18, padding: 16 },
});
