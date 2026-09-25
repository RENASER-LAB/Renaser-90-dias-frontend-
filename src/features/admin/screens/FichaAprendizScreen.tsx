import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MicroLabel } from '../../../components/ui';
import { irAPestana } from '../../../navigation/navegacionRef';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { abrirConversacionDirecta } from '../../chat/api/chatApi';
import { urlDeEvidencia } from '../../evidence/api/evidenceApi';
import { RejillaSemanal } from '../../mentor/components/RejillaSemanal';
import { TarjetaSemaforoDeAprendiz } from '../../semaforo/components/TarjetaSemaforoDeAprendiz';
import { avisar } from '../utils/dialogo';
import type { AprendizAdminApi } from '../api/adminSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { useSemanaAdministrativa } from '../hooks/useSemanaAdministrativa';
import { fechaCorta } from '../utils/fechas';

/**
 * La ficha de un aprendiz vista por administración: quién es, cómo viene la semana y qué entregó.
 *
 * **Reutiliza `RejillaSemanal` y el mismo tipo de datos que ve el mentor.** No es ahorro de
 * código: es que el administrador y el mentor tienen que ver EL MISMO día con los mismos estados.
 * Dos rejillas distintas serían dos verdades, y ninguna pantalla podría decir cuál es la buena.
 *
 * **Es de lectura.** No hay botón para completar un hábito ni para firmar por nadie: el
 * cumplimiento lo registra la persona, y un administrador marcándolo por ella convertiría el dato
 * en otra cosa (ARF-10).
 *
 * La evaluación no se calcula acá. Los números que se muestran son los que devuelve el servidor.
 */
export function FichaAprendizScreen({
  aprendiz,
  onVolver,
}: {
  aprendiz: AprendizAdminApi;
  onVolver: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const { semana, sinDatos, cargando, fallo, desplazar } = useSemanaAdministrativa(aprendiz.id);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [abriendoChat, setAbriendoChat] = useState(false);
  const [abriendoEvidencia, setAbriendoEvidencia] = useState<string | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  useEffect(() => {
    const conAlgo = semana?.dias.filter(d => d.obligaciones.length > 0) ?? [];
    setDiaElegido(conAlgo[0]?.fecha ?? null);
  }, [semana]);

  const detalle = semana?.dias.find(d => d.fecha === diaElegido) ?? null;
  const nombre = aprendiz.fullName?.trim() || 'Aprendiz sin nombre';

  /** La URL se pide al abrir y no antes: vence a los diez minutos y es una llave al archivo. */
  const verEvidencia = async (evidenciaId: string) => {
    setAbriendoEvidencia(evidenciaId);
    try {
      const url = await urlDeEvidencia(evidenciaId);
      if (!url) {
        avisar('Sin archivo', 'Esta evidencia es de texto: no hay archivo que abrir.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      avisar('No se pudo abrir', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setAbriendoEvidencia(null);
    }
  };

  /** Abre el 1 a 1 y NO manda nada: el mensaje lo decide y lo escribe una persona (ARF-12). */
  const escribirle = async () => {
    setAbriendoChat(true);
    try {
      const conversacion = await abrirConversacionDirecta(aprendiz.id);
      const navego = irAPestana('Comunidad', { abrirChatConversacionId: conversacion.id });
      if (!navego) {
        avisar(
          'Conversación lista',
          `Tu chat con ${nombre} está en Comunidad → Miembros. No se envió ningún mensaje.`,
        );
      }
    } catch {
      avisar('No se pudo abrir el chat', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setAbriendoChat(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo={nombre}
        subtitulo={aprendiz.email ?? null}
        onVolver={onVolver}
        accion={{ etiqueta: abriendoChat ? '…' : 'Escribirle', onPress: escribirle }}
      />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 16,
        }}
      >
        <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 6 }]}>
          <Text style={[t.body, { color: c.text, fontSize: 14.5 }]}>
            Día {aprendiz.programDay} del programa
            {aprendiz.phase ? ` · ${aprendiz.phase.replaceAll('_', ' ').toLowerCase()}` : ''}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 13.5 }]}>
            {aprendiz.cellId ? 'Con grupo asignado' : 'Sin grupo · esperando que alguien lo ubique'}
          </Text>
          {semana?.zona ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 12.5 }]}>
              Sus días se cuentan en {semana.zona}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          <View style={estilos.encabezadoSemana}>
            <MicroLabel>Cumplimiento de la semana</MicroLabel>
            <View style={estilos.navegacion}>
              <Pressable
                onPress={() => desplazar(-1)}
                accessibilityRole="button"
                accessibilityLabel="Semana anterior"
                style={estilos.flecha}
              >
                <Text style={[t.body, { color: c.goldInk, fontSize: 15 }]}>‹</Text>
              </Pressable>
              <Pressable
                onPress={() => desplazar(1)}
                accessibilityRole="button"
                accessibilityLabel="Semana siguiente"
                style={estilos.flecha}
              >
                <Text style={[t.body, { color: c.goldInk, fontSize: 15 }]}>›</Text>
              </Pressable>
            </View>
          </View>

          {semana ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 13 }]}>
              {fechaCorta(semana.inicioDeSemana)} – {fechaCorta(semana.finDeSemana)}
            </Text>
          ) : null}

          {cargando ? <ActivityIndicator color={c.goldInk} /> : null}

          {fallo ? (
            <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>
              {fallo === 'sin_permiso'
                ? 'Tu cuenta no puede ver el cumplimiento de esta persona.'
                : fallo === 'sin_red'
                  ? 'Sin conexión. Vuelve a intentar en un momento.'
                  : 'No se pudo cargar la semana.'}
            </Text>
          ) : null}

          {/* SIN_DATOS no es incumplimiento: puede que el padrón de ese período no se generara. */}
          {semana && sinDatos ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 13.5, lineHeight: 19 }]}>
              Sin datos en esta semana. No significa que no haya cumplido: significa que no hay
              hábitos registrados para estos días.
            </Text>
          ) : null}

          {semana && !sinDatos ? (
            <>
              <Text style={[t.body, { color: c.text, fontSize: 14 }]}>
                {semana.resumen.cumplidas} de {semana.resumen.obligaciones} cumplidos ·{' '}
                {semana.resumen.conEntrega} con evidencia
              </Text>
              <RejillaSemanal dias={semana.dias} />
            </>
          ) : null}
        </View>

        {detalle && detalle.obligaciones.length > 0 ? (
          <View style={{ gap: 10 }}>
            <MicroLabel>Detalle del {fechaCorta(detalle.fecha)}</MicroLabel>
            {detalle.obligaciones.map(o => (
              <View
                key={o.registroId}
                style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 4 }]}
              >
                <Text style={[t.body, { color: c.textStrong, fontSize: 14.5 }]}>{o.titulo}</Text>
                {/* Estado en PALABRAS además de color: el color solo no alcanza (AGENTS.md §4). */}
                <Text style={[t.body, { color: c.textSoft, fontSize: 13 }]}>
                  {etiquetaDeEstado(o.estadoHabito)} · {etiquetaDeEntrega(o.entrega)}
                  {o.revision ? ` · revisión: ${o.revision.toLowerCase()}` : ''}
                </Text>
                {o.evidenciaId ? (
                  <Pressable
                    onPress={() => verEvidencia(o.evidenciaId as string)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver la evidencia de ${o.titulo}`}
                    style={estilos.accionTexto}
                  >
                    <Text style={[t.body, { color: c.goldInk, fontSize: 13.5, fontWeight: '500' }]}>
                      {abriendoEvidencia === o.evidenciaId ? 'Abriendo…' : 'Ver evidencia'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {semana && !sinDatos && semana.dias.some(d => d.obligaciones.length > 0) ? (
          <View style={{ gap: 8 }}>
            <MicroLabel>Elige un día</MicroLabel>
            <View style={estilos.dias}>
              {semana.dias
                .filter(d => d.obligaciones.length > 0)
                .map(d => {
                  const activo = d.fecha === diaElegido;
                  return (
                    <Pressable
                      key={d.fecha}
                      onPress={() => setDiaElegido(d.fecha)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activo }}
                      accessibilityLabel={fechaCorta(d.fecha)}
                      style={[
                        estilos.dia,
                        {
                          borderColor: activo ? c.goldInk : c.border,
                          backgroundColor: activo ? c.goldWash : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[t.body, { color: activo ? c.goldInk : c.textSoft, fontSize: 13 }]}>
                        {fechaCorta(d.fecha)}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
          </View>
        ) : null}

        {/* Semáforo de cumplimiento (D-168), por la puerta de administración
            (`GET /api/v1/admin/trainees/{id}/semaforo`): la MISMA tarjeta que ve su mentor. Se suma
            al final, sin mover lo de arriba; con 404 o 403 no se dibuja. */}
        <TarjetaSemaforoDeAprendiz origen={{ quien: 'admin', aprendizId: aprendiz.id }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function etiquetaDeEstado(estado: string): string {
  return (
    {
      PENDIENTE: 'Pendiente',
      EN_CURSO: 'En curso',
      COMPLETADO: 'Cumplido',
      FALLIDO: 'Sin cumplir',
      EXPIRADO: 'Venció',
    }[estado] ?? estado
  );
}

function etiquetaDeEntrega(entrega: string): string {
  return (
    {
      NO_REQUERIDA: 'no pedía evidencia',
      SIN_ENTREGA: 'sin evidencia',
      ENTREGADA: 'con evidencia',
    }[entrega] ?? entrega
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, width: '100%' },
  encabezadoSemana: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  navegacion: { flexDirection: 'row', gap: 4 },
  flecha: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  dias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dia: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  accionTexto: { minHeight: 48, justifyContent: 'center' },
});
