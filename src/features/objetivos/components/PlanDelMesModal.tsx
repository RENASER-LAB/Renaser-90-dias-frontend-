import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { MesDelPlan } from '../api/planMensualApi';
import { useObjetivosSemanalesDelMes } from '../hooks/useObjetivosSemanalesDelMes';
import { EditarObjetivoDelMesModal } from './EditarObjetivoDelMesModal';
import type { usePlanMensual } from '../hooks/usePlanMensual';
import type { EjeObjetivo, RocaMaestraApi } from '../types/objetivos.types';
import { ETIQUETA_EJE } from '../types/objetivos.types';
import { iconoDelEje } from '../utils/iconoDelEje';
import {
  ETIQUETA_DEL_ESTADO,
  MESES,
  estadoDeLaSemana,
  mesAlAbrir,
  rangoDelMes,
  sePuedeOrganizar,
  semanasDeLaHoja,
  type EstadoDeLaSemanaDelMes,
  type SemanaDeLaHoja,
} from '../utils/mesDelPrograma';
import { objetivoDelMesEnPalabras, textoDelBotonDelMes, type ObjetivoDelMes } from '../utils/objetivoDelMesEnPalabras';
import { etiquetaDelMes } from '../utils/periodoDelPrograma';

/**
 * «Planificar mi mes» (spec 028, 2026-10-31; decisión del dueño 028-2: «planificar el mes» es el plan de OBJETIVOS de Plan, el mes del
 * programa, no el del calendario). Una hoja con los tres meses del programa, el objetivo del mes del eje abierto y las semanas del mes.
 *
 * Reutiliza todo lo que ya había y no pone ninguna regla nueva:
 * - el objetivo del mes lo calcula el servidor (`GET /rocks/monthly/plan`) y se corrige con `EditarObjetivoDelMesModal` y
 *   `PUT /rocks/monthly/{eje}/{mes}`, que acepta cualquiera de los tres meses (Plan solo ofrecía el que está en curso);
 * - los objetivos de cada semana se leen con `GET /rocks/weekly?semana=N`, solo de las que pasaron y de la de ahora;
 * - tocar la semana de ahora (o la que se arma el domingo) abre «Organizar mi semana», lo de siempre. **No se arman objetivos semanales
 *   de semanas que no llegaron**: la ventana del domingo (D-203) no se mueve.
 *
 * Es opcional: nada la pide ni la recuerda.
 *
 * ## Movimiento (`emil-design-eng`, `animate-expo`)
 * Se abre pocas veces por sesión (frecuencia «ocasional»): sube con la hoja de siempre y nada más se anima. Cambiar de mes intercambia el
 * contenido al instante (la píldora del control ya viaja sola y vibra con `tacto.seleccion()`: no se suma otro háptico). El guardado
 * usa `ConfirmacionEnLinea` y `tacto.logro()`, como el objetivo del mes de Plan. Todo lo que cambia de tamaño al cambiar de mes es
 * contenido, no un valor animado.
 */

export const TITULO_DE_LA_HOJA = 'Planificar mi mes';
export const NOTA_DE_LAS_SEMANAS = 'El objetivo de cada semana se arma el domingo.';

type PlanMensual = Pick<ReturnType<typeof usePlanMensual>, 'porEje' | 'guardando' | 'guardarMes'>;

interface Props {
  visible: boolean;
  alCerrar: () => void;
  /** El eje abierto en Plan: de él son el objetivo del mes y los objetivos semanales que se leen. */
  eje: EjeObjetivo;
  /** El día del programa (`GET /home`). 0 = todavía no arrancó. */
  diaPrograma: number;
  maestras: RocaMaestraApi[];
  planMensual: PlanMensual;
  /** Tocaron la semana de ahora (o la que se arma hoy). Se llama cuando la hoja ya se fue, para que lo que abre no compita con ella. */
  onOrganizarSemana: () => void;
  /** Solo para probar. */
  hoy?: Date;
}

/** Cómo se dibuja cada estado: ícono y si el color es de énfasis (dorado), de éxito o neutro. */
const DIBUJO_DEL_ESTADO: Readonly<Record<EstadoDeLaSemanaDelMes, { icono: IconName; tono: 'oro' | 'exito' | 'suave' }>> = {
  revisada: { icono: 'checkCircle', tono: 'exito' },
  'esta-semana': { icono: 'flag', tono: 'oro' },
  'se-arma-hoy': { icono: 'calendarRange', tono: 'oro' },
  armada: { icono: 'checkCircle', tono: 'oro' },
  'se-arma-el-domingo': { icono: 'calendarRange', tono: 'suave' },
  'no-llega': { icono: 'clock', tono: 'suave' },
  'pasada-sin-objetivo': { icono: 'clock', tono: 'suave' },
  pasada: { icono: 'flag', tono: 'suave' },
};

export function PlanDelMesModal({ visible, alCerrar, eje, diaPrograma, maestras, planMensual, onOrganizarSemana, hoy: hoyDePrueba }: Props) {
  const { c, t } = useTheme();
  /* «Hoy» se fija al abrir: si el reloj cruza la medianoche con la hoja abierta, las semanas no se corren a mitad de una lectura. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hoy = useMemo(() => hoyDePrueba ?? new Date(), [visible, hoyDePrueba]);
  const mesDeAhora = mesAlAbrir(diaPrograma, hoy);
  const [mes, setMes] = useState(mesDeAhora);
  const [editando, setEditando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const organizarAlIrse = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setMes(mesDeAhora);
    setEditando(false);
    setConfirmacion(null);
    organizarAlIrse.current = false;
    // Solo al abrir: cambiar de mes dentro de la hoja no vuelve a elegir el de ahora.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const semanas = useMemo(() => semanasDeLaHoja(mes, diaPrograma, hoy), [mes, diaPrograma, hoy]);
  const { deLaSemana } = useObjetivosSemanalesDelMes({
    activo: visible,
    semanas: semanas.filter(s => s.seLee).map(s => s.numero),
    maestras,
    eje,
  });

  const plan = planMensual.porEje.get(eje);
  const mesDelPlan: MesDelPlan | undefined = plan?.meses.find(m => m.numeroMes === mes);
  const objetivo = objetivoDelMesEnPalabras(mesDelPlan, plan);
  const rango = rangoDelMes(mes, diaPrograma, hoy);

  const guardar = async (cifra: number | null) => {
    const resultado = await planMensual.guardarMes(eje, mes, {
      /* El título es obligatorio en el servidor y acá no se pide: este tramo es un número, no una frase (igual que en Plan). */
      titulo: `Objetivo del mes ${mes}`,
      cifra,
      unidad: plan?.unidad ?? '',
    });
    setEditando(false);
    if (!resultado.ok) {
      Alert.alert('El objetivo de este mes', resultado.mensaje);
      return;
    }
    tacto.logro();
    setConfirmacion({ clave: Date.now(), texto: `Tu objetivo del mes ${mes} quedó guardado.` });
  };

  const organizar = () => {
    organizarAlIrse.current = true;
    alCerrar();
  };

  return (
    <>
      <HojaDesdeAbajo
        visible={visible}
        alCerrar={alCerrar}
        alTerminarDeCerrar={() => {
          if (!organizarAlIrse.current) return;
          organizarAlIrse.current = false;
          onOrganizarSemana();
        }}
        titulo={TITULO_DE_LA_HOJA}
        subtitulo={ETIQUETA_EJE[eje]}
        tamano="grande"
        bajoElTitulo={
          <ControlSegmentado
            opciones={MESES.map(m => ({ valor: String(m), etiqueta: `Mes ${m}` }))}
            valor={String(mes)}
            onCambiar={valor => {
              setMes(Number(valor));
              setConfirmacion(null);
            }}
            accessibilityLabel="Mes del programa"
          />
        }
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo} showsVerticalScrollIndicator={false}>
          <View style={estilos.encabezado} accessibilityRole="header">
            <Text style={[t.cardTitle, { color: c.textStrong }]}>{etiquetaDelMes(mes)}</Text>
            <Text style={[t.small, estilos.chico, estilos.cifras, { color: c.textSoft }]}>
              {[rango, mes === mesDeAhora ? 'El mes en curso' : null].filter(Boolean).join(' · ')}
            </Text>
          </View>

          {confirmacion ? (
            <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} />
          ) : null}

          <ObjetivoDelMesTarjeta eje={eje} objetivo={objetivo} guardando={planMensual.guardando} alCambiar={() => setEditando(true)} />

          <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Semanas</Text>
          <View style={estilos.lista}>
            {semanas.map(semana => (
              <FilaDeLaSemana
                key={semana.numero}
                semana={semana}
                estado={estadoDeLaSemana(semana.numero, diaPrograma, hoy, semana.seLee ? deLaSemana(semana.numero) : undefined)}
                titulo={semana.seLee ? deLaSemana(semana.numero)?.titulo ?? null : null}
                organizable={sePuedeOrganizar(semana.numero, diaPrograma, hoy)}
                alOrganizar={organizar}
              />
            ))}
          </View>
          <Text style={[t.small, estilos.chico, { color: c.textSoft }]}>{NOTA_DE_LAS_SEMANAS}</Text>
        </ScrollView>
      </HojaDesdeAbajo>

      {/* El mismo formulario del objetivo del mes de Plan, para cualquiera de los tres meses. */}
      <EditarObjetivoDelMesModal
        visible={editando}
        mes={mesDelPlan ?? null}
        unidad={plan?.unidad ?? ''}
        guardando={planMensual.guardando}
        onCerrar={() => setEditando(false)}
        onGuardar={guardar}
      />
    </>
  );
}

function ObjetivoDelMesTarjeta({
  eje,
  objetivo,
  guardando,
  alCambiar,
}: {
  eje: EjeObjetivo;
  objetivo: ObjetivoDelMes;
  guardando: boolean;
  alCambiar: () => void;
}) {
  const { c, t } = useTheme();
  const boton = textoDelBotonDelMes(objetivo);
  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={estilos.filaDelRotulo}>
        <Icon name={iconoDelEje(eje)} size={TAMANO_ICONO.chico} color={c.goldInk} />
        <Text style={[t.small, estilos.rotuloDeLaTarjeta, { color: c.goldInk }]}>Objetivo del mes</Text>
      </View>

      {objetivo.tipo === 'cifra' ? (
        <>
          <Text style={[t.cardTitle, estilos.cifra, estilos.cifras, { color: c.textStrong }]}>{objetivo.cifra}</Text>
          <Text style={[t.small, estilos.chico, { color: c.textSoft }]}>
            {[`Al Día ${objetivo.diaDeCierre}`, objetivo.tuyo ? 'Tu cifra' : 'Propuesta', objetivo.yaAlcanzado ? 'Ya la alcanzaste' : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </>
      ) : objetivo.tipo === 'titulo' ? (
        <>
          <Text style={[t.body, estilos.texto, { color: c.textStrong }]}>{objetivo.texto}</Text>
          <Text style={[t.small, estilos.chico, { color: c.textSoft }]}>{`Al Día ${objetivo.diaDeCierre} · ${objetivo.tuyo ? 'Tu objetivo' : 'Propuesto'}`}</Text>
        </>
      ) : objetivo.tipo === 'sin-cifra' ? (
        <>
          <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>{objetivo.texto}</Text>
          <Text style={[t.small, estilos.chico, { color: c.textSoft }]}>{`Al Día ${objetivo.diaDeCierre}`}</Text>
        </>
      ) : (
        <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>Todavía no tenemos el plan de este mes.</Text>
      )}

      {boton ? (
        <Presionable
          onPress={alCambiar}
          disabled={guardando}
          accessibilityRole="button"
          accessibilityLabel={`${boton} el objetivo de este mes`}
          style={estilos.botonDelMes}
        >
          <Icon name="pencil" size={TAMANO_ICONO.chico} color={c.goldInk} />
          <Text style={[t.body, estilos.textoDelBoton, { color: c.goldInk }]}>{boton}</Text>
        </Presionable>
      ) : null}
    </View>
  );
}

function FilaDeLaSemana({
  semana,
  estado,
  titulo,
  organizable,
  alOrganizar,
}: {
  semana: SemanaDeLaHoja;
  estado: EstadoDeLaSemanaDelMes;
  titulo: string | null;
  organizable: boolean;
  alOrganizar: () => void;
}) {
  const { c, t } = useTheme();
  const { icono, tono } = DIBUJO_DEL_ESTADO[estado];
  const color = tono === 'oro' ? c.goldInk : tono === 'exito' ? c.success : c.textSoft;
  const etiqueta = ETIQUETA_DEL_ESTADO[estado];
  const dicho = [`Semana ${semana.numero}`, semana.rango, etiqueta, titulo ? `Objetivo: ${titulo}` : null].filter(Boolean).join('. ');

  const contenido = (
    <>
      <Icon name={icono} size={TAMANO_ICONO.normal} color={color} />
      <View style={estilos.columnaDeLaSemana}>
        <Text style={[t.body, estilos.cifras, { color: c.textStrong }]}>
          <Text style={estilos.negrita}>{`Semana ${semana.numero}`}</Text>
          {semana.rango ? <Text style={{ color: c.textSoft }}>{`   ${semana.rango}`}</Text> : null}
        </Text>
        <Text style={[t.small, estilos.estado, { color }]}>{etiqueta}</Text>
        {titulo ? (
          <Text style={[t.small, estilos.chico, { color: c.text }]} numberOfLines={2}>
            {titulo}
          </Text>
        ) : null}
      </View>
      {organizable ? (
        <View style={estilos.organizar}>
          <Text style={[t.small, estilos.chico, { color: c.goldInk }]}>Organizar</Text>
          <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.goldInk} />
        </View>
      ) : null}
    </>
  );

  const estiloDeLaFila = [estilos.fila, { borderColor: semana.esLaDeAhora ? c.gold : c.border, backgroundColor: c.cardBg }];
  return organizable ? (
    <Presionable
      onPress={alOrganizar}
      accessibilityRole="button"
      accessibilityLabel={`${dicho}. Toca para organizar tu semana.`}
      style={estiloDeLaFila}
    >
      {contenido}
    </Presionable>
  ) : (
    <View accessible accessibilityLabel={dicho} style={estiloDeLaFila}>
      {contenido}
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  encabezado: { gap: 2 },
  cifras: { fontVariant: ['tabular-nums'] },
  rotulo: { fontFamily: fuentes.negrita, fontSize: 13, letterSpacing: 0, marginTop: 4 },
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17, gap: 6 },
  filaDelRotulo: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  rotuloDeLaTarjeta: { fontFamily: fuentes.media, fontSize: 15, letterSpacing: 0 },
  cifra: { fontSize: 24, lineHeight: 30, fontFamily: fuentes.negrita },
  texto: { fontSize: 16, lineHeight: 22 },
  botonDelMes: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  textoDelBoton: { fontFamily: fuentes.media, fontSize: 16, letterSpacing: 0 },
  lista: { gap: 10 },
  fila: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  columnaDeLaSemana: { flex: 1, gap: 2 },
  negrita: { fontFamily: fuentes.negrita },
  estado: { fontFamily: fuentes.media, fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  chico: { fontSize: 14, lineHeight: 20 },
  organizar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
