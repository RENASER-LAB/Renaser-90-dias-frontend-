import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { useTheme } from '../../../theme/ThemeContext';
import type { useRocasSemanales } from '../hooks/useRocasSemanales';
import type { CierreRocaSemanal, EjeObjetivo, ItemPlanSemanal, RocaMaestraApi } from '../types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../types/objetivos.types';
import { textoVentanaSemanal } from '../utils/ventanasDePlanificacion';
import { PlanSemanalModal } from './PlanSemanalModal';
import { RevisionSemanalModal } from './RevisionSemanalModal';
import { Icon } from '../../../components/Icon';

/**
 * Parte 2 del plan: la semana.
 *
 * **Qué reemplaza.** Una lista de tildes en `useState` cuyo `Alert` decía "Los cambios han sido
 * guardados en tu plan" sin guardar nada: al recargar la app no quedaba rastro. Acá cada estado de
 * la semana tiene su propia cara, porque significan cosas distintas y no son "un error":
 *
 * - **bloqueada** → faltan los tres objetivos de 90 días. La salida es el Mapa, no reintentar.
 * - **sin planificar** → hay que abrir la semana. Alcanza con el eje principal (2026-09-22).
 * - **planificada** → se ve el plan y hasta cuándo se puede corregir.
 * - **cerrada** → las tres tienen revisión; queda como registro.
 */

interface TarjetaPlanSemanalProps {
  semanal: ReturnType<typeof useRocasSemanales>;
  maestras: RocaMaestraApi[];
  numeroSemana: number;
  /** El principal del Mapa: va primero en el asistente y es el único obligatorio. */
  ejePrincipal: EjeObjetivo | null;
  /** El objetivo de la semana ya calculado, por eje. Siembra el campo del asistente. */
  objetivoSugeridoDe: (eje: EjeObjetivo) => string;
  /** Para mandar a definir los objetivos cuando la cadena está bloqueada. */
  onIrAlMapa?: () => void;
}

export function TarjetaPlanSemanal({ semanal, maestras, numeroSemana, ejePrincipal, objetivoSugeridoDe,
  onIrAlMapa }: TarjetaPlanSemanalProps) {
  const { c, t } = useTheme();
  const [planificando, setPlanificando] = useState(false);
  const [revisando, setRevisando] = useState<EjeObjetivo | null>(null);

  const guardarPlan = async (items: ItemPlanSemanal[]) => {
    const resultado = await semanal.planificar(items);
    setPlanificando(false);
    if (!resultado.ok) {
      Alert.alert('Tu plan de la semana', resultado.mensaje);
    }
  };

  const guardarRevision = async (cierre: CierreRocaSemanal) => {
    const roca = revisando ? semanal.deEje(revisando) : null;
    if (!roca) return;
    const resultado = await semanal.cerrar(roca.id, cierre);
    setRevisando(null);
    if (!resultado.ok) {
      Alert.alert('Tu revisión', resultado.mensaje);
    }
  };

  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <View style={estilos.encabezado}>
        <Icon name="zap" size={18} color={c.goldInk} />
        <Text style={[t.micro, { color: c.success, fontFamily: 'Jost_700Bold', letterSpacing: 1, fontSize: 12 }]}>
          2. TU SEMANA {String(numeroSemana).padStart(2, '0')}
        </Text>
      </View>

      {semanal.estado === 'cargando' && (
        <Text style={[t.small, { color: c.textSoft, fontSize: 15, marginTop: 8 }]}>Cargando tu semana…</Text>
      )}

      {semanal.estado === 'bloqueada' && (
        <View style={{ gap: 12, marginTop: 8 }}>
          <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 22 }]}>
            Primero define tus tres objetivos de 90 días: uno de cuerpo, uno de negocio y dinero, y
            uno de relaciones. La semana se arma a partir de ellos.
          </Text>
          {!!onIrAlMapa && (
            <Pressable onPress={onIrAlMapa} style={[estilos.boton, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
              <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
                Ir al Mapa de Renacimiento
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {semanal.estado === 'sin_planificar' && (
        <View style={{ gap: 12, marginTop: 8 }}>
          <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 22 }]}>
            Todavía no armaste esta semana. Con tu eje principal alcanza; los otros dos los sumas
            cuando quieras.
          </Text>
          <Pressable
            onPress={() => setPlanificando(true)}
            style={[estilos.boton, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}
          >
            <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>Armar mi semana</Text>
          </Pressable>
        </View>
      )}

      {(semanal.estado === 'planificada' || semanal.estado === 'cerrada') && (
        <View style={{ gap: 12, marginTop: 10 }}>
          {/*
            > **Corregido el 2026-09-23.** Acá había un `if (!roca) return null`: los ejes sin
            > objetivo de la semana simplemente no se dibujaban. Sumado a que "Armar mi semana"
            > solo aparecía en `sin_planificar`, el resultado era que al guardar el eje principal
            > los otros dos quedaban inalcanzables hasta el domingo siguiente — el dueño abría
            > Negocio, veía el objetivo de Cuerpo y no tenía cómo planificar el suyo.
            >
            > Era la otra mitad de RK-12, que nunca se construyó: se bajó el mínimo a un eje para
            > no pedir los tres de una, pero sin forma de sumar los que faltan eso no es "después
            > los agregás", es "perdiste la semana". El backend ahora rechaza por eje y no por
            > semana, así que acá cada eje pendiente se muestra y se puede planificar.
          */}
          {EJES.map(eje => {
            const roca = semanal.deEje(eje);
            if (!roca) {
              return (
                <View key={eje} style={[estilos.bloqueEje, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Text style={[t.micro, { color: c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                    {ETIQUETA_EJE[eje].toUpperCase()}
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 15, marginTop: 4, lineHeight: 21 }]}>
                    Todavía no le pusiste objetivo esta semana.
                  </Text>
                  <Pressable onPress={() => setPlanificando(true)} style={estilos.enlace} hitSlop={12}>
                    <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
                      Planificar {ETIQUETA_EJE[eje]}
                    </Text>
                  </Pressable>
                </View>
              );
            }
            const cerrada = roca.autoevaluacionFin != null;
            return (
              <View key={eje} style={[estilos.bloqueEje, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                  {ETIQUETA_EJE[eje].toUpperCase()}
                </Text>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, marginTop: 4, lineHeight: 22 }]}>
                  {roca.titulo}
                </Text>
                {cerrada ? (
                  <Text style={[t.small, { color: c.success, fontSize: 14, marginTop: 8, fontFamily: 'Jost_700Bold' }]}>
                    Revisada · te pusiste {roca.autoevaluacionFin} de 10
                  </Text>
                ) : (
                  <Pressable onPress={() => setRevisando(eje)} style={estilos.enlace} hitSlop={12}>
                    <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
                      Cerrar este objetivo con mi revisión
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          {/* Decir la ventana en pantalla en vez de dejar que la persona la descubra con un 403. */}
          <Text style={[t.small, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>
            {textoVentanaSemanal()}
          </Text>
        </View>
      )}

      {!!semanal.error && (
        <Text style={[t.small, { color: c.danger, fontSize: 14, marginTop: 8 }]}>{semanal.error}</Text>
      )}

      <PlanSemanalModal
        visible={planificando}
        numeroSemana={numeroSemana}
        maestras={maestras}
        ejePrincipal={ejePrincipal}
        ejesYaConObjetivo={EJES.filter(eje => semanal.deEje(eje) != null)}
        objetivoSugeridoDe={objetivoSugeridoDe}
        guardando={semanal.guardando}
        onGuardar={guardarPlan}
        onCerrar={() => setPlanificando(false)}
      />

      <RevisionSemanalModal
        visible={revisando != null}
        eje={revisando}
        roca={revisando ? semanal.deEje(revisando) : null}
        guardando={semanal.guardando}
        onGuardar={guardarRevision}
        onCerrar={() => setRevisando(null)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 16 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bloqueEje: { borderWidth: 1, borderRadius: 12, padding: 14 },
  boton: { minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  enlace: { marginTop: 8, minHeight: 48, justifyContent: 'center' },
});
