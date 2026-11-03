import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HojaDesdeAbajo } from '../../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { BotonPrincipal, BotonSecundario } from '../../../../components/Legible';
import { mensajeDeError } from '../../../../services/http/apiClient';
import { useTheme } from '../../../../theme/ThemeContext';
import { leerQuienesAceptaron } from '../api/terminosApi';
import type { QuienesAceptaronApi, VersionDeTerminosApi } from '../api/terminosSchemas';
import { ContenidoDeLosTerminos } from './ContenidoDeLosTerminos';
import { fechaDeVersion } from '../utils/estadoDeLosTerminos';

/**
 * Una versión de los términos en una hoja (spec 027): su texto completo, su nota y, solo para Administración, «Restaurar como borrador» y quiénes la aceptaron
 * y quiénes faltan (FR-018). También es la «vista previa» del editor (sin acciones): lo que verá la persona, con su casilla.
 */
export function VersionDeTerminosSheet({
  visible,
  version,
  titulo,
  alCerrar,
  alRestaurar,
}: {
  visible: boolean;
  version: VersionDeTerminosApi | null;
  titulo: string;
  alCerrar: () => void;
  /** Solo con una versión publicada: pone su texto como borrador. */
  alRestaurar?: (numero: number) => void;
}) {
  const { c, t } = useTheme();
  const [quienes, setQuienes] = useState<QuienesAceptaronApi | null>(null);
  const [cargandoQuienes, setCargandoQuienes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const numero = version?.number ?? null;

  useEffect(() => {
    setQuienes(null);
    setError(null);
  }, [visible, numero]);

  const verQuienes = async () => {
    if (!version || numero === null) return;
    setCargandoQuienes(true);
    setError(null);
    try {
      setQuienes(await leerQuienesAceptaron(version.formation, numero));
    } catch (e) {
      setError(mensajeDeError(e, 'No pudimos leer quiénes aceptaron. Revisa tu conexión.'));
    } finally {
      setCargandoQuienes(false);
    }
  };

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo={titulo}
      subtitulo={version?.number != null ? `Versión ${version.number} · ${fechaDeVersion(version.publishedAt)}` : undefined}
      tamano="grande"
      etiquetaCerrar="Cerrar"
      pie={
        alRestaurar && numero !== null ? (
          <View style={estilos.pie}>
            <BotonPrincipal etiqueta="Restaurar como borrador" onPress={() => alRestaurar(numero)} />
          </View>
        ) : undefined
      }
    >
      <View style={estilos.cuerpo}>
        {version?.note ? (
          <View style={[estilos.nota, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}>
            <Text style={[t.small, { color: c.goldInk, fontSize: 14 }]}>Nota del cambio</Text>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16 }]}>{version.note}</Text>
          </View>
        ) : null}
        {version ? <ContenidoDeLosTerminos introduccion={version.introduction ?? ''} clausulas={version.clauses} /> : null}
        {version ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{`Casilla: «${version.checkboxText}»`}</Text>
        ) : null}
        {alRestaurar && numero !== null ? (
          <View style={{ gap: 10 }}>
            {!quienes ? <BotonSecundario etiqueta={cargandoQuienes ? 'Cargando…' : '¿Quiénes la aceptaron?'} onPress={() => void verQuienes()} cargando={cargandoQuienes} /> : null}
            {error ? <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>{error}</Text> : null}
            {quienes ? (
              <>
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>{`La aceptaron (${quienes.accepted.length})`}</Text>
                {quienes.accepted.length === 0 ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Nadie todavía.</Text> : null}
                {quienes.accepted.map(p => (
                  <Text key={p.id} style={[t.body, { color: c.text, fontSize: 16 }]}>{p.name ?? 'Persona sin nombre'}</Text>
                ))}
                <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17, marginTop: 6 }]}>{`Faltan (${quienes.missing.length})`}</Text>
                {quienes.missing.length === 0 ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Nadie falta.</Text> : null}
                {quienes.missing.map(p => (
                  <Text key={p.id} style={[t.body, { color: c.text, fontSize: 16 }]}>{p.name ?? 'Persona sin nombre'}</Text>
                ))}
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  nota: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  pie: { paddingHorizontal: 20, paddingBottom: 8 },
});
