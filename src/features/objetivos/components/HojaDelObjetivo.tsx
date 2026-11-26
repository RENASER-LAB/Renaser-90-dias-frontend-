import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { DefinicionRocaMaestra, EjeObjetivo, RocaMaestraApi } from '../types/objetivos.types';
import { ETIQUETA_EJE } from '../types/objetivos.types';
import { lineaObjetivoFijo } from '../utils/objetivoFijo';
import {
  IDEAS_POR_EJE,
  MAXIMO_DE_LA_UNIDAD,
  PREGUNTA_DEL_PASO_1,
  PREGUNTA_DEL_PASO_2,
  PREGUNTA_DEL_PASO_3,
  UNIDADES_POR_EJE,
  avanceDelCamino,
  definicionDelObjetivo,
  fraseDelObjetivo,
  leerNumero,
  lineaDelAvance,
  validarNumeros,
  validarObjetivo,
  validarUnidad,
  type PasoDelObjetivo,
  type ResultadoDelPaso,
} from '../utils/pasosDelObjetivo';

const TEXTO_DEL_BOTON = { fontSize: 16, letterSpacing: 0 } as const;

/**
 * «Define tu objetivo de 90 días» en tres pasos (spec 058 FR-015): qué quieres lograr, cómo lo mides y desde dónde partes hasta dónde
 * llegas. Cuando el objetivo ya está fijo (D-234) la hoja es «Anota tu avance»: un solo número y su barra. Guarda con el mismo pedido de
 * siempre (`alGuardar` → `PUT /rocks/master/{eje}`); aquí solo se arma lo que se manda y se dice qué falta.
 */
export function HojaDelObjetivo({
  visible,
  alCerrar,
  eje,
  roca,
  plazo,
  duracionDias,
  guardando,
  alGuardar,
}: {
  visible: boolean;
  alCerrar: () => void;
  eje: EjeObjetivo;
  /** Con objetivo ya definido (fijo) es «Anota tu avance». */
  roca: RocaMaestraApi | null;
  plazo: string;
  duracionDias?: number | null;
  guardando: boolean;
  /** Manda la definición al servidor y dice si quedó guardada (quien llama muestra el error y cierra). */
  alGuardar: (definicion: DefinicionRocaMaestra) => Promise<boolean>;
}) {
  const { c, t } = useTheme();
  const fijo = roca != null;
  const [paso, setPaso] = useState<PasoDelObjetivo>(1);
  const [objetivo, setObjetivo] = useState('');
  const [unidad, setUnidad] = useState('');
  const [otraUnidad, setOtraUnidad] = useState(false);
  const [sinNumero, setSinNumero] = useState(false);
  const [base, setBase] = useState('');
  const [meta, setMeta] = useState('');
  const [avance, setAvance] = useState('');
  /* Un toque, un pedido: el botón queda apagado desde que se toca hasta que el servidor responde (E-380). */
  const enviando = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setPaso(1);
    setObjetivo('');
    setUnidad('');
    setOtraUnidad(false);
    setSinNumero(false);
    setBase('');
    setMeta('');
    setAvance(roca?.avance != null ? String(roca.avance).replace('.', ',') : '');
    // Solo al abrir: lo que se escribe después no se pisa con una relectura del objetivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, eje]);

  const decir = (r: Extract<ResultadoDelPaso, { ok: false }>) => Alert.alert(r.titulo, r.mensaje);
  const enviar = async (definicion: DefinicionRocaMaestra) => {
    if (enviando.current) return;
    enviando.current = true;
    try {
      await alGuardar(definicion);
    } finally {
      enviando.current = false;
    }
  };

  const volver = () => setPaso(p => (p > 1 ? ((p - 1) as PasoDelObjetivo) : p));
  useSystemBackHandler(() => {
    if (!fijo && paso > 1) {
      volver();
      return true;
    }
    alCerrar();
    return true;
  }, visible);

  const guardarAvance = () => {
    if (!roca) return;
    const n = leerNumero(avance);
    if (n === null || n < 0) {
      Alert.alert('Avance inválido', 'Escribe cuánto llevas: un número, no negativo.');
      return;
    }
    if (roca.meta == null || roca.unidad == null) return;
    void enviar({ objetivo: roca.objetivo, meta: roca.meta, avance: n, unidad: roca.unidad, lineaBase: roca.lineaBase ?? undefined });
  };

  const guardarNuevo = () => {
    void enviar(definicionDelObjetivo({ objetivo, sinNumero, unidad, base, meta }));
  };

  const siguiente = () => {
    if (paso === 1) {
      const r = validarObjetivo(objetivo);
      if (!r.ok) return decir(r);
      return setPaso(2);
    }
    if (paso === 2) {
      if (sinNumero) return guardarNuevo();
      const r = validarUnidad(unidad);
      if (!r.ok) return decir(r);
      return setPaso(3);
    }
    const r = validarNumeros(base, meta);
    if (!r.ok) return decir(r);
    guardarNuevo();
  };

  /* ---- Anota tu avance (objetivo fijo) ---- */
  if (fijo && roca) {
    const lineaBase = roca.lineaBase;
    const total = roca.meta;
    const nActual = leerNumero(avance);
    const camino = lineaBase != null && total != null && nActual !== null ? avanceDelCamino(lineaBase, total, nActual) : null;
    const resumen = total != null && roca.unidad ? lineaDelAvance(lineaBase, total, roca.unidad, avance) : null;
    return (
      <HojaDesdeAbajo
        visible={visible}
        alCerrar={alCerrar}
        titulo="Anota tu avance"
        subtitulo={ETIQUETA_EJE[eje]}
        tamano="grande"
        pie={<GoldButton label="Guardar mi avance" onPress={guardarAvance} loading={guardando} textStyle={TEXTO_DEL_BOTON} />}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo} showsVerticalScrollIndicator={false}>
          <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18 }]}>{roca.objetivo}</Text>
          <Text style={[t.small, { color: c.textSoft }]}>{lineaObjetivoFijo(plazo)}</Text>
          <Text style={[t.screenTitle, estilos.pregunta, { color: c.textStrong }]}>¿En cuánto vas hoy?</Text>
          <CampoGrande rotulo="Hoy" valor={avance} alCambiar={setAvance} unidad={roca.unidad ?? ''} accessibilityLabel="Cuánto llevas hoy" />
          {camino ? (
            <View style={[estilos.barra, { backgroundColor: c.divider }]} accessible={false}>
              <View style={[estilos.relleno, { backgroundColor: c.gold, width: `${camino.porcentaje}%` }]} />
            </View>
          ) : null}
          {resumen ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{resumen}</Text> : null}
        </ScrollView>
      </HojaDesdeAbajo>
    );
  }

  /* ---- Los tres pasos ---- */
  const frase = paso === 3 ? fraseDelObjetivo({ base, meta, unidad, plazo, duracionDias }) : null;
  const ultimo = paso === 3 || (paso === 2 && sinNumero);
  const unidades = UNIDADES_POR_EJE[eje];
  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo={`Define tu objetivo de ${plazo}`}
      subtitulo={`${ETIQUETA_EJE[eje]} · paso ${paso} de 3`}
      tamano="grande"
      alVolver={paso > 1 ? volver : undefined}
      etiquetaVolver="Paso anterior"
      pie={<GoldButton label={ultimo ? 'Guardar mi objetivo' : 'Siguiente'} onPress={siguiente} loading={guardando} textStyle={TEXTO_DEL_BOTON} />}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo} showsVerticalScrollIndicator={false}>
        {paso === 1 ? (
          <>
            <Text style={[t.screenTitle, estilos.pregunta, { color: c.textStrong }]}>{PREGUNTA_DEL_PASO_1[eje]}</Text>
            <View style={estilos.fichas}>
              {IDEAS_POR_EJE[eje].map(idea => (
                <Ficha key={idea} texto={idea} elegida={objetivo.trim() === idea} alTocar={() => setObjetivo(idea)} />
              ))}
            </View>
            <TextInput
              value={objetivo}
              onChangeText={setObjetivo}
              placeholder="O escribe el tuyo"
              placeholderTextColor={c.tabInactive}
              multiline
              accessibilityLabel="Tu objetivo"
              style={[estilos.campo, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text, minHeight: 72, textAlignVertical: 'top' }]}
            />
          </>
        ) : null}
        {paso === 2 ? (
          <>
            <Text style={[t.screenTitle, estilos.pregunta, { color: c.textStrong }]}>{PREGUNTA_DEL_PASO_2}</Text>
            <View style={estilos.fichas}>
              {unidades.map(u => (
                <Ficha
                  key={u}
                  texto={u}
                  elegida={!sinNumero && !otraUnidad && unidad === u}
                  alTocar={() => {
                    setSinNumero(false);
                    setOtraUnidad(false);
                    setUnidad(u);
                  }}
                />
              ))}
              <Ficha
                texto="Otra unidad"
                elegida={!sinNumero && otraUnidad}
                alTocar={() => {
                  setSinNumero(false);
                  setOtraUnidad(true);
                  setUnidad('');
                }}
              />
            </View>
            {otraUnidad && !sinNumero ? (
              <TextInput
                value={unidad}
                onChangeText={setUnidad}
                placeholder="Escribe la unidad"
                placeholderTextColor={c.tabInactive}
                maxLength={MAXIMO_DE_LA_UNIDAD}
                autoCapitalize="none"
                accessibilityLabel="Otra unidad"
                style={[estilos.campo, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.text }]}
              />
            ) : null}
            <Presionable
              onPress={() => setSinNumero(v => !v)}
              accessibilityRole="button"
              accessibilityState={{ selected: sinNumero }}
              accessibilityLabel="No se mide con un número"
              style={[estilos.sinNumero, { borderColor: sinNumero ? c.gold : c.border, backgroundColor: sinNumero ? c.goldWash : 'transparent' }]}
            >
              <Text style={[t.body, { color: sinNumero ? c.goldInk : c.textSoft, fontFamily: fuentes.media, fontSize: 16 }]}>No se mide con un número</Text>
            </Presionable>
          </>
        ) : null}
        {paso === 3 ? (
          <>
            <Text style={[t.screenTitle, estilos.pregunta, { color: c.textStrong }]}>{PREGUNTA_DEL_PASO_3}</Text>
            <View style={estilos.dosNumeros}>
              <View style={estilos.numero}>
                <CampoGrande rotulo="Hoy" valor={base} alCambiar={setBase} unidad={unidad} accessibilityLabel="Desde dónde partes" />
              </View>
              <View style={estilos.flecha}>
                <Icon name="arrow" size={TAMANO_ICONO.normal} color={c.chevron} />
              </View>
              <View style={estilos.numero}>
                <CampoGrande rotulo={`En ${plazo}`} valor={meta} alCambiar={setMeta} unidad={unidad} accessibilityLabel="A dónde quieres llegar" />
              </View>
            </View>
            <Text style={[t.body, { color: frase ? c.textStrong : c.textSoft, fontSize: 16, lineHeight: 23 }]} accessibilityLiveRegion="polite">
              {frase ?? 'Escribe los dos números y aquí verás tu objetivo armado.'}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

function Ficha({ texto, elegida, alTocar }: { texto: string; elegida: boolean; alTocar: () => void }) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={alTocar}
      accessibilityRole="button"
      accessibilityState={{ selected: elegida }}
      accessibilityLabel={texto}
      style={[estilos.ficha, { borderColor: elegida ? c.gold : c.border, backgroundColor: elegida ? c.goldWash : c.cardBgAlt }]}
    >
      {elegida ? <Icon name="check" size={TAMANO_ICONO.chico} color={c.goldInk} /> : null}
      <Text style={[t.body, { color: elegida ? c.goldInk : c.text, fontFamily: fuentes.media, fontSize: 16 }]}>{texto}</Text>
    </Presionable>
  );
}

/** Un número grande con su rótulo arriba y la unidad abajo: «Hoy · 82 · kg». */
function CampoGrande({
  rotulo,
  valor,
  alCambiar,
  unidad,
  accessibilityLabel,
}: {
  rotulo: string;
  valor: string;
  alCambiar: (v: string) => void;
  unidad: string;
  accessibilityLabel: string;
}) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.campoGrande}>
      <Text style={[t.small, { color: c.textSoft, fontFamily: fuentes.media }]}>{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={c.tabInactive}
        accessibilityLabel={accessibilityLabel}
        style={[estilos.numeroGrande, { color: c.textStrong, borderBottomColor: c.border }]}
      />
      {unidad ? <Text style={[t.small, { color: c.textSoft }]} numberOfLines={1}>{unidad}</Text> : null}
    </View>
  );
}


const estilos = StyleSheet.create({
  cuerpo: { gap: 16, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  pregunta: { fontSize: 24, lineHeight: 30 },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ficha: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16 },
  campo: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 16 },
  sinNumero: { minHeight: 48, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 8 },
  dosNumeros: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  numero: { flex: 1, minWidth: 0 },
  flecha: { width: 28, height: 56, alignItems: 'center', justifyContent: 'center' },
  campoGrande: { gap: 4 },
  numeroGrande: { fontFamily: fuentes.negrita, fontSize: 36, lineHeight: 44, minHeight: 52, borderBottomWidth: 1, paddingVertical: 2, fontVariant: ['tabular-nums'] },
  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4 },
});
