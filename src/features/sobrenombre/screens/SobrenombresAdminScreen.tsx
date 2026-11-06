import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { AvatarPersona } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { ApiError } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import {
  agregarPalabraProhibida,
  listarSobrenombres,
  palabrasProhibidas,
  quitarPalabraProhibida,
  type PalabrasProhibidas,
  type PersonaConSobrenombre,
} from '../api/sobrenombreApi';

/**
 * Spec 046 (US5): Administración → Más opciones → «Sobrenombres». La lista de quienes tienen sobrenombre (con su nombre real y desde
 * cuándo), un buscador por cualquiera de los dos, y las palabras que no se pueden usar (agregar y quitar). Para cambiar uno, se abre la
 * ficha de la persona.
 */
export function SobrenombresAdminScreen({ onVolver, onAbrirPersona }: { onVolver: () => void; onAbrirPersona?: (personaId: string) => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [buscar, setBuscar] = useState('');
  const [filas, setFilas] = useState<PersonaConSobrenombre[] | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [palabras, setPalabras] = useState<PalabrasProhibidas | null>(null);
  const [nueva, setNueva] = useState('');
  const turno = useRef(0);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  useEffect(() => {
    const mio = ++turno.current;
    const espera = setTimeout(() => {
      listarSobrenombres(buscar)
        .then(r => mio === turno.current && (setFilas(r), setFallo(null)))
        .catch(e => mio === turno.current && setFallo(e instanceof ApiError && e.status === 403 ? 'Tu cuenta no puede ver esto.' : 'No se pudo cargar la lista.'));
    }, 300);
    return () => clearTimeout(espera);
  }, [buscar]);

  useEffect(() => {
    palabrasProhibidas().then(setPalabras).catch(() => undefined);
  }, []);

  const agregar = () => {
    const p = nueva.trim();
    if (p.length < 2) return;
    agregarPalabraProhibida(p)
      .then(r => {
        setPalabras(r);
        setNueva('');
        tacto.logro();
      })
      .catch(() => tacto.error());
  };

  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Sobrenombres" subtitulo="Cómo se ve cada persona en el Muro" onVolver={onVolver} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 12,
        }}
      >
        <TextInput
          value={buscar}
          onChangeText={setBuscar}
          placeholder="Buscar por sobrenombre o nombre"
          placeholderTextColor={c.textSoft}
          accessibilityLabel="Buscar por sobrenombre o nombre"
          style={[t.body, { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14, color: c.textStrong, backgroundColor: c.cardBg, fontSize: 16 }]}
        />
        {fallo ? <Text style={[t.body, { color: c.danger, fontSize: 16 }]}>{fallo}</Text> : null}
        {!fallo && filas === null ? <Text style={cuerpo}>Cargando…</Text> : null}
        {filas && filas.length === 0 ? <Text style={cuerpo}>{buscar.trim() ? `Sin resultados para «${buscar.trim()}».` : 'Todavía nadie eligió un sobrenombre.'}</Text> : null}
        {filas?.map(f => (
          <Presionable
            key={f.personaId}
            onPress={onAbrirPersona ? () => onAbrirPersona(f.personaId) : undefined}
            accessibilityRole={onAbrirPersona ? 'button' : undefined}
            accessibilityLabel={`${f.sobrenombre}, ${f.nombreReal}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderBottomWidth: 1, borderBottomColor: c.divider, paddingVertical: 8 }}
          >
            <AvatarPersona nombre={f.sobrenombre} size={40} />
            <View style={{ flexShrink: 1 }}>
              <Text numberOfLines={1} style={[t.cardTitle, { color: c.textStrong, fontSize: 16 }]}>{f.sobrenombre}</Text>
              <Text numberOfLines={1} style={[t.small, { color: c.textSoft }]}>{f.nombreReal}</Text>
            </View>
          </Presionable>
        ))}

        <View style={{ gap: 10, marginTop: 12, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, backgroundColor: c.cardBg }}>
          <Text style={[t.small, { color: c.textSoft, fontFamily: fuentes.negrita }]}>Palabras que no se pueden usar</Text>
          {palabras ? (
            <Text style={cuerpo}>{`${palabras.deLaListaBase} de la lista base, más las que agregues aquí.`}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {palabras?.deAdministracion.map(p => (
              <Presionable
                key={p}
                onPress={() => void quitarPalabraProhibida(p).then(setPalabras).catch(() => undefined)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar la palabra ${p}`}
                style={{ minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, justifyContent: 'center' }}
              >
                <Text style={[t.body, { color: c.textStrong, fontSize: 15 }]}>{`${p}  ✕`}</Text>
              </Presionable>
            ))}
          </View>
          <TextInput
            value={nueva}
            onChangeText={setNueva}
            placeholder="Una palabra"
            placeholderTextColor={c.textSoft}
            accessibilityLabel="Palabra que no se puede usar"
            style={[t.body, { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14, color: c.textStrong, fontSize: 16 }]}
          />
          <BotonSecundario etiqueta="Agregar una palabra" onPress={agregar} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
