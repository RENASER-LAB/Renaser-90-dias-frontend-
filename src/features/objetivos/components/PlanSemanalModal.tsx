import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { GoldButton } from '../../../components/GoldButton';
import { useTheme } from '../../../theme/ThemeContext';
import type { EjeObjetivo, ItemPlanSemanal, RocaMaestraApi } from '../types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../types/objetivos.types';
import { conPrincipalPrimero } from '../hooks/usePrioridadPrincipal';
import { textoVentanaSemanal } from '../utils/ventanasDePlanificacion';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Presionable } from '../../../components/Presionable';
import { tacto } from '../../../utils/tacto';

/**
 * Armar el plan de la semana: **un eje por pantalla**.
 *
 * **Por qué de a uno.** Son tres rocas con seis campos cada una: dieciocho campos juntos son un
 * muro, y el usuario de este programa tiene entre 50 y 60 años. Se avanza de a un eje, igual que el
 * Mapa de Renacimiento con sus vistas. El último paso resume y recién ahí se guarda: el backend
 * crea todas de una sola llamada (`POST /rocks/weekly`), así que guardar eje por eje no sería ni
 * siquiera posible.
 *
 * **Nada bloquea el avance** (2026-09-21, pedido del dueño). Se recorren los cuatro pasos sin
 * escribir una palabra, y se vuelve a cualquiera de ellos. Antes «Siguiente» quedaba apagado hasta
 * llenar el eje que estaba en pantalla, y eso obligaba a completar los cuatro pasos de corrido o
 * cerrar el formulario.
 *
 * **Lo que sí exige el backend, y por eso se pide recién al guardar.** Un título no vacío en el eje
 * principal, y nada más. El botón de guardar se puede tocar siempre, y si falta algo un `Alert` dice
 * **qué** falta y **en qué eje**, que es lo que pide AGENTS.md §5. El obstáculo, la contingencia y
 * la autoevaluación son opcionales de verdad, también al guardar.
 *
 * > **Corregido el 2026-09-22.** Acá decía que `POST /rocks/weekly` abre **los tres ejes de una
 * > sola vez** (`@Size(min = 3, max = 3)`) y que cada uno necesita *"exactamente tres acciones
 * > críticas no vacías"*. Las dos cosas dejaron de ser ciertas el mismo día: alcanza con un eje
 * > (RK-12) y las acciones pasaron al objetivo diario (RK-13, V61). Este formulario pedía doce
 * > campos mínimos; ahora pide uno.
 *
 * **Vocabulario.** En pantalla ya no se dice «roca» sino «objetivo semanal». Los nombres internos
 * —`RocaSemanalApi`, `rocaMaestraId`, `ItemPlanSemanal`, `/rocks/weekly`— NO se tocaron: son el
 * contrato con el backend, que sigue llamándolas rocas.
 */

const AUTOEVALUACION_MINIMA = 1;
const AUTOEVALUACION_MAXIMA = 10;

/** Lo que se está escribiendo para un eje, antes de convertirse en `ItemPlanSemanal`. */
interface BorradorDeEje {
  titulo: string;
  obstaculo: string;
  contingencia: string;
  autoevaluacionInicio: number | null;
}

const BORRADOR_VACIO: BorradorDeEje = {
  titulo: '',
  obstaculo: '',
  contingencia: '',
  autoevaluacionInicio: null,
};

interface PlanSemanalModalProps {
  visible: boolean;
  numeroSemana: number;
  /** Para mostrar, en cada paso, a qué objetivo de 90 días sirve el de esta semana. */
  maestras: RocaMaestraApi[];
  /**
   * El eje que eligió como principal en el Mapa. Va primero y es **el único obligatorio**: los
   * otros dos se suman cuando quiera, no cuando el formulario lo exija.
   */
  ejePrincipal: EjeObjetivo | null;
  /**
   * Los ejes que esta semana YA tienen objetivo: el asistente no los vuelve a pedir.
   *
   * Existe para poder sumar los que faltan sin recorrer de nuevo lo ya hecho. El backend igual los
   * ignoraría —desde el 2026-09-23 rechaza por eje y no por semana— pero mostrarlos sería pedirle
   * a la persona que reescriba algo que ya guardó, y como no se pisa quedaría además la sensación
   * de que no se guardó.
   */
  ejesYaConObjetivo?: EjeObjetivo[];
  /**
   * El objetivo de la semana ya escrito, por eje: `"Llegar a 83.5 kg"`. Lo calcula el servidor y
   * siembra el campo — la persona lo confirma o lo cambia, pero no escribe un número que el sistema
   * ya sabe. `''` cuando ese eje no lleva cifra; ahí el campo abre vacío.
   */
  objetivoSugeridoDe: (eje: EjeObjetivo) => string;
  guardando: boolean;
  onGuardar: (items: ItemPlanSemanal[]) => void;
  onCerrar: () => void;
}

export function PlanSemanalModal({
  visible,
  numeroSemana,
  maestras,
  ejePrincipal,
  ejesYaConObjetivo,
  objetivoSugeridoDe,
  guardando,
  onGuardar,
  onCerrar,
}: PlanSemanalModalProps) {
  const { c, t } = useTheme();
  const [paso, setPaso] = useState(0);
  const [borradores, setBorradores] = useState<Record<EjeObjetivo, BorradorDeEje>>(() => ({
    CUERPO: { ...BORRADOR_VACIO },
    TRABAJO: { ...BORRADOR_VACIO },
    RELACIONES: { ...BORRADOR_VACIO },
  }));

  /*
   * Se vuelve al paso 1 cada vez que se abre, y se siembran las acciones del Mapa.
   *
   * Reabrir a mitad de camino, con lo escrito de la vez anterior, es más confuso que empezar de
   * nuevo: no hay forma de saber qué quedó a medias. Lo que sí sobrevive es lo que la persona
   * escribió el día 7 — eso no es "a medias", es su plan.
   */
  useEffect(() => {
    if (!visible) return;
    setPaso(0);
    setBorradores({
      CUERPO: { ...BORRADOR_VACIO, titulo: objetivoSugeridoDe('CUERPO') },
      TRABAJO: { ...BORRADOR_VACIO, titulo: objetivoSugeridoDe('TRABAJO') },
      RELACIONES: { ...BORRADOR_VACIO, titulo: objetivoSugeridoDe('RELACIONES') },
    });
  }, [visible, objetivoSugeridoDe]);

  /*
   * El principal del Mapa va primero: es el que manda y el único que hay que llenar para guardar.
   * Los que ya tienen objetivo esta semana quedan fuera de los pasos — ver `ejesYaConObjetivo`.
   */
  const ejesOrdenados = useMemo(() => {
    const todos = conPrincipalPrimero(EJES, ejePrincipal);
    const pendientes = todos.filter(eje => !(ejesYaConObjetivo ?? []).includes(eje));
    // Si no quedara ninguno, se muestran todos antes que un asistente vacío que no se puede cerrar.
    return pendientes.length > 0 ? pendientes : todos;
  }, [ejePrincipal, ejesYaConObjetivo]);
  const ejeObligatorio = ejesOrdenados[0];
  const ejeActual = ejesOrdenados[Math.min(paso, ejesOrdenados.length - 1)];

  /**
   * El rótulo del paso, sin contador.
   *
   * > **Corregido el 2026-09-22.** Decía `Paso 1 de 4 · Cuerpo`. Son cuatro **pasos** —los tres ejes
   * > y el resumen— pero el dueño lo leyó como cuatro cosas que tenía que llenar: *"no tengo que
   * > llenar todo del mes para continuar (…) el usuario se va, le dará flojera los 4 de una"*. Y con
   * > un solo eje obligatorio (RK-12) el contador además exageraba el trabajo: decía cuatro cuando
   * > lo que hace falta es uno.
   * >
   * > Los puntos de abajo ya dicen dónde está y cuánto queda, así que el número no hacía falta para
   * > orientarse. Lo que sí hacía falta es decir cuál es obligatorio.
   */
  const rotuloDelPaso =
    ejeActual === ejesOrdenados[0]
      ? `${ETIQUETA_EJE[ejeActual]} · el único obligatorio`
      : `${ETIQUETA_EJE[ejeActual]} · opcional`;
  const esResumen = paso >= ejesOrdenados.length;

  const borrador = borradores[ejeActual];
  const objetivoDelEje = maestras.find(m => m.eje === ejeActual)?.objetivo ?? null;

  const cambiar = (campo: keyof BorradorDeEje, valor: string | number | null) => {
    setBorradores(previos => ({ ...previos, [ejeActual]: { ...previos[ejeActual], [campo]: valor } }));
  };

  /**
   * Qué le falta a un eje para que el backend lo acepte, dicho como se le diría a la persona.
   * `null` cuando está listo. Es la única fuente de verdad: de acá salen `completo`, el aviso del
   * resumen y el `Alert` de guardar, así que los tres nombran exactamente lo mismo.
   */
  const loQueFalta = (b: BorradorDeEje): string | null =>
    b.titulo.trim() === '' ? 'falta el objetivo de la semana' : null;

  /**
   * Con el eje obligatorio lleno ya se puede cerrar la semana, sin recorrer los otros dos.
   *
   * Se mira `loQueFalta` del obligatorio —el mismo que usa `intentarGuardar`— y no solo el título,
   * para que el botón no prometa algo que el guardado después rechaza con un diálogo.
   */
  const puedeGuardarYa = loQueFalta(borradores[ejeObligatorio]) === null;

  const completo = (b: BorradorDeEje) => loQueFalta(b) === null;

  /** Solo viajan los ejes completos. El backend acepta de 1 a 3 desde el 2026-09-22. */
  const guardar = () => {
    onGuardar(
      ejesOrdenados
        .filter(eje => completo(borradores[eje]))
        .map<ItemPlanSemanal>(eje => {
        const b = borradores[eje];
        return {
          eje,
          titulo: b.titulo.trim(),
          // Vacío se manda como ausente, no como "": el backend guarda el texto tal cual, y una
          // cadena vacía se vería después como un obstáculo escrito que no dice nada.
          obstaculo: b.obstaculo.trim() || undefined,
          contingencia: b.contingencia.trim() || undefined,
          autoevaluacionInicio: b.autoevaluacionInicio ?? undefined,
        };
      })
    );
  };

  /**
   * El botón de guardar se puede tocar siempre.
   *
   * > **Corregido el 2026-09-22.** Antes exigía **los tres ejes** y, si alguno estaba a medias, no
   * > mandaba nada: doce campos mínimos en una sentada, o la semana entera sin armar. El dueño lo
   * > cambió con el criterio del Mapa — alcanza con el eje que la persona eligió como principal, y
   * > los otros dos se suman cuando quiera. El texto decía *"Tu semana se abre con los tres ejes
   * > juntos"*, que ya no es cierto.
   *
   * Los ejes a medias no se mandan (el backend los rechazaría con un 400 igual de mudo), pero
   * tampoco bloquean: se guarda lo que esté completo.
   */
  const intentarGuardar = () => {
    const faltaElPrincipal = loQueFalta(borradores[ejeObligatorio]);
    if (faltaElPrincipal !== null) {
      Alert.alert(
        'Falta poco para guardar tu semana',
        `Con ${ETIQUETA_EJE[ejeObligatorio]} alcanza para abrir la semana, y le ${faltaElPrincipal}.`
          + '\n\nEn el resumen, toca ese eje para volver a él.'
      );
      return;
    }
    guardar();
  };

  /** Elegir en la escala: un «tic» por toque. Tocar el elegido lo desmarca (es opcional). */
  const elegirEnLaEscala = (valor: number) => {
    tacto.seleccion();
    cambiar('autoevaluacionInicio', borrador.autoevaluacionInicio === valor ? null : valor);
  };

  const campo = (
    etiqueta: string,
    valor: string,
    alCambiar: (texto: string) => void,
    opciones: { ayuda?: string; largo?: boolean; obligatorio?: boolean } = {}
  ) => (
    <View style={{ gap: 6 }} key={etiqueta}>
      <Text style={[t.small, estilos.etiqueta, { color: c.goldInk }]}>
        {etiqueta}
        {opciones.obligatorio ? '' : '  ·  opcional'}
      </Text>
      {!!opciones.ayuda && (
        <Text style={[t.small, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>{opciones.ayuda}</Text>
      )}
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        multiline={opciones.largo}
        placeholder=""
        placeholderTextColor={c.chevron}
        style={[
          estilos.entrada,
          {
            borderColor: c.border,
            backgroundColor: c.cardBgAlt,
            color: c.textStrong,
            minHeight: opciones.largo ? 88 : 52,
            textAlignVertical: opciones.largo ? 'top' : 'center',
          },
        ]}
      />
    </View>
  );

  /*
   * Hoja desde abajo (2026-10-05) en vez de la ventana centrada, con el mismo contenido: los puntos
   * del paso van pegados al título (también arrastran la hoja) y los botones fijos abajo. `grande`
   * porque es un formulario largo: con el teclado abierto el cuerpo se acorta y el pie queda a la
   * vista.
   */
  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      titulo={`Plan de la semana ${numeroSemana}`}
      subtitulo={esResumen ? 'Revisa antes de guardar' : rotuloDelPaso}
      tamano="grande"
      bajoElTitulo={
        /* Un punto por paso: dónde está y cuánto falta, sin animación ni barra que se mueva. */
        <View style={estilos.puntos}>
          {[...ejesOrdenados, 'resumen'].map((clave, indice) => (
            <View
              key={clave}
              style={[
                estilos.punto,
                { backgroundColor: indice <= paso ? c.gold : c.border },
              ]}
            />
          ))}
        </View>
      }
      pie={
        <View style={estilos.pie}>
          {paso > 0 && (
            <Presionable onPress={() => setPaso(p => p - 1)} accessibilityRole="button" style={estilos.botonAtras}>
              <Text style={[t.body, { color: c.textSoft, fontFamily: 'Jost_500Medium', fontSize: 15 }]}>Atrás</Text>
            </Presionable>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            {/*
              > **Corregido el 2026-09-23.** Guardar solo aparecía en el resumen, así que para
              > terminar había que pasar por los tres ejes sí o sí. Ahora, apenas el eje obligatorio
              > tiene su objetivo, el botón principal es Guardar; los otros dos siguen alcanzables por
              > el enlace de abajo, que es lo que son: opcionales.
            */}
            {esResumen || puedeGuardarYa ? (
              /* Sin `disabled` por lo que falte: eso lo resuelve `intentarGuardar` diciendo qué
                 falta. Apagado solo mientras se está guardando, para no mandar dos veces. */
              <GoldButton
                label={guardando ? 'Guardando…' : 'Guardar mi semana'}
                onPress={intentarGuardar}
                disabled={guardando}
                textStyle={TEXTO_DE_BOTON}
              />
            ) : (
              /* Nunca apagado: se avanza con el eje vacío y se vuelve después. */
              <GoldButton label="Siguiente" onPress={() => setPaso(p => p + 1)} textStyle={TEXTO_DE_BOTON} />
            )}
            {!esResumen && puedeGuardarYa && (
              <Presionable onPress={() => setPaso(p => p + 1)} accessibilityRole="button" style={estilos.enlaceOpcional}>
                <Text style={[t.small, { color: c.textSoft, fontFamily: 'Jost_500Medium', fontSize: 14 }]}>
                  {paso + 1 < ejesOrdenados.length ? 'Agregar otro eje (opcional)' : 'Ver el resumen'}
                </Text>
              </Presionable>
            )}
          </View>
        </View>
      }
    >
      <ScrollView contentContainerStyle={estilos.cuerpo} keyboardShouldPersistTaps="handled">
        {esResumen ? (
          <>
            {ejesOrdenados.map(eje => {
              const b = borradores[eje];
              return (
                <View key={eje} style={[estilos.bloqueResumen, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Text style={[t.small, estilos.etiqueta, { color: c.goldInk }]}>{ETIQUETA_EJE[eje]}</Text>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 16, marginTop: 4 }]}>
                    {b.titulo.trim() || 'Sin título'}
                  </Text>
                  {!completo(b) && (
                    <Presionable
                      onPress={() => setPaso(ejesOrdenados.indexOf(eje))}
                      accessibilityRole="button"
                      style={estilos.enlaceCompletar}
                    >
                      <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
                        Le {loQueFalta(b)} · toca para volver
                      </Text>
                    </Presionable>
                  )}
                </View>
              );
            })}
            <Text style={[t.small, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>
              {textoVentanaSemanal()}
            </Text>
          </>
        ) : (
          <>
            {objetivoDelEje ? (
              <View style={[estilos.recordatorio, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>Tu objetivo de 90 días</Text>
                <Text style={[t.body, { color: c.textStrong, fontSize: 15, marginTop: 4, lineHeight: 21 }]}>
                  {objetivoDelEje}
                </Text>
              </View>
            ) : null}

            {campo('Tu objetivo de esta semana', borrador.titulo, texto => cambiar('titulo', texto), {
              ayuda: 'Viene calculado de tu objetivo del mes. Cámbialo si quieres otra cosa.',
              obligatorio: true,
            })}

            {campo('Qué podría impedirlo', borrador.obstaculo, texto => cambiar('obstaculo', texto), {
              ayuda: 'El obstáculo más probable. Nombrarlo ahora te ahorra la sorpresa el jueves.',
              largo: true,
            })}

            {campo('Qué haces si pasa', borrador.contingencia, texto => cambiar('contingencia', texto), {
              ayuda: 'Tu plan B, decidido en frío.',
              largo: true,
            })}

            <View style={{ gap: 8 }}>
              <Text style={[t.small, estilos.etiqueta, { color: c.goldInk }]}>
                ¿Qué tan capaz te ves de cumplirla?  ·  opcional
              </Text>
              <View style={estilos.escala} accessibilityRole="radiogroup">
                {Array.from({ length: AUTOEVALUACION_MAXIMA }, (_, i) => i + AUTOEVALUACION_MINIMA).map(valor => {
                  const elegido = borrador.autoevaluacionInicio === valor;
                  return (
                    <Presionable
                      key={valor}
                      onPress={() => elegirEnLaEscala(valor)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: elegido }}
                      accessibilityLabel={`${valor}`}
                      style={[
                        estilos.puntoEscala,
                        { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.gold : c.cardBgAlt },
                      ]}
                    >
                      <Text
                        style={[
                          t.body,
                          { color: elegido ? c.onGold : c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 15 },
                        ]}
                      >
                        {valor}
                      </Text>
                    </Presionable>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

/** Botones en tipo oración y a tamaño de lectura (`GoldButton` va en versales espaciadas por defecto). */
const TEXTO_DE_BOTON = { fontSize: 15, letterSpacing: 0 } as const;

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 18 },
  etiqueta: { fontFamily: 'Jost_500Medium', fontSize: 14, letterSpacing: 0 },
  puntos: { flexDirection: 'row', gap: 6 },
  punto: { flex: 1, height: 4, borderRadius: 2 },
  entrada: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 52 },
  recordatorio: { borderWidth: 1, borderRadius: 12, padding: 14 },
  bloqueResumen: { borderWidth: 1, borderRadius: 12, padding: 14 },
  enlaceCompletar: { marginTop: 8, minHeight: 48, justifyContent: 'center' },
  escala: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puntoEscala: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pie: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  // 48 de alto: el piso de área táctil del proyecto, y con 50-60 años no es un detalle.
  botonAtras: { minWidth: 88, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  enlaceOpcional: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
