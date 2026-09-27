import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { guardarTema, obtenerPreferencias, temasVisibles, type Preferencias, type TemaDeAviso } from '../api/preferenciasDeNotificacion';

/**
 * Los interruptores de Yo → Notificaciones (E-4). Cada toque se guarda en el servidor; si falla,
 * el interruptor vuelve a donde estaba y se dice. Nunca muestra un estado que el servidor no tiene.
 */
export function InterruptoresDeAvisos() {
  const { c } = useTheme();
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null);
  const [fallo, setFallo] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [errorAlGuardar, setErrorAlGuardar] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setFallo(false);
    try {
      setPreferencias(await obtenerPreferencias());
    } catch {
      setFallo(true);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiar = async (tema: TemaDeAviso, encendido: boolean) => {
    if (!preferencias) return;
    const antes = preferencias;
    setGuardando(tema.clave);
    setErrorAlGuardar(null);
    setPreferencias({ ...preferencias, ...Object.fromEntries(tema.tipos.map(t => [t, encendido])) });
    try {
      setPreferencias(await guardarTema(tema, encendido));
    } catch {
      setPreferencias(antes);
      setErrorAlGuardar(`No se pudo guardar «${tema.nombre}». Intenta de nuevo.`);
    } finally {
      setGuardando(null);
    }
  };

  const texto = [estilos.cuerpo, { color: c.textSoft }];

  if (fallo) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={[texto, { color: c.danger }]}>No se pudieron leer tus avisos.</Text>
        <BotonSecundario etiqueta="Reintentar" onPress={() => void cargar()} />
      </View>
    );
  }
  if (!preferencias) return <Text style={texto}>Cargando tus avisos…</Text>;

  const temas = temasVisibles(preferencias);
  return (
    <View style={{ gap: 10 }}>
      <Text style={texto}>Elige qué avisos te llegan al teléfono. Lo que apagues sigue en tu bandeja.</Text>
      <View style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        {temas.map((tema, i) => (
          <View key={tema.clave} style={[estilos.fila, { borderTopColor: c.divider, borderTopWidth: i === 0 ? 0 : 1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.nombre, { color: c.textStrong }]}>{tema.nombre}</Text>
              <Text style={texto}>{tema.detalle}</Text>
            </View>
            <Switch
              value={tema.encendido}
              disabled={guardando !== null}
              onValueChange={v => void cambiar(tema, v)}
              accessibilityLabel={tema.nombre}
              trackColor={{ false: '#332C20', true: c.gold }}
              thumbColor={tema.encendido ? '#1E1B18' : '#888'}
            />
          </View>
        ))}
      </View>
      {errorAlGuardar ? <Text style={[texto, { color: c.danger }]}>{errorAlGuardar}</Text> : null}
      <Text style={texto}>Los recordatorios de cada hábito se eligen en el hábito, desde Plan o Training.</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { fontFamily: 'Jost_400Regular', fontSize: 16, lineHeight: 23 },
  nombre: { fontFamily: 'Jost_500Medium', fontSize: 17, lineHeight: 22 },
  caja: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12 },
});
