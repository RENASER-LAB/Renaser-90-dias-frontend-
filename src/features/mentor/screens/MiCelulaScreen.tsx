import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Aparicion } from '../../../components/Aparicion';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { useSemaforoDelGrupo } from '../../semaforo/hooks/useLecturaPorSemana';
import { seOcultaLaSeccion } from '../../semaforo/utils/entradasDelSemaforo';
import { CargandoCelula, EstadoCelula } from '../components/EstadoCelula';
import { FilaDeAprendiz, ALTO_DE_TOQUE } from '../components/FilaDeAprendiz';
import { HojaDeMiEvaluacion } from '../components/HojaDeMiEvaluacion';
import { useAvisosDeAcompanamiento } from '../hooks/useAvisosDeAcompanamiento';
import { useEscribirleAlAprendiz } from '../hooks/useEscribirleAlAprendiz';
import { useEvaluacionPropia } from '../hooks/useEvaluacionPropia';
import type { FalloCelula, VistaCelula } from '../hooks/useCelulaQueAcompano';
import type { AlumnoConEstado } from '../types/mentor.types';
import { cantidadDeAprendices } from '../utils/entradaAMisGrupos';
import { filasDeMiGrupo } from '../utils/filasDeMiGrupo';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * «Mi grupo» del mentor (spec 055, historia 1; bocetos aprobados por el dueño el 17/11): el título del grupo con «N aprendices» a
 * la derecha y UNA tarjeta con TODAS las filas ordenadas —rojo, ámbar, verde, sin datos—. El color del semáforo va en el borde de
 * la foto; el nombre, en texto normal; debajo, una línea gris con el motivo; a la derecha, el chat. Sin lista de avisos arriba,
 * sin conteos por color y sin la insignia del rol. Al pie, el enlace a «Mi evaluación · N %».
 *
 * Un scroll único (AGENTS.md §2). La lista se recorre con `map` y no con `FlatList`: es un grupo de diez personas, y una lista
 * virtualizada dentro de un `ScrollView` es el doble scroll que la guía prohíbe.
 *
 * Quién es quién, y el orden, lo trae el semáforo del grupo (`GET /mentor/groups/{g}/semaforo`): la app no recalcula colores ni
 * porcentajes. Si no responde (404 o 403) queda la lista simple del padrón, sin colores. «Mis grupos» (`MisGruposScreen`) es la
 * pantalla anterior cuando acompaña a más de uno.
 */
export function MiCelulaScreen({
  onSalir,
  onAbrirAlumno,
  vista,
  cargando,
  fallo,
  detalle,
  recargar,
  rotuloDeVolver = 'Volver',
}: {
  onSalir: () => void;
  onAbrirAlumno: (alumno: AlumnoConEstado) => void;
  vista: VistaCelula | null;
  cargando: boolean;
  fallo: FalloCelula | null;
  detalle: string | null;
  recargar: () => void;
  /** Lo que dice la barra de arriba junto a la flecha: «Mis grupos» si hay varios, «Mi grupo» desde Yo, «Volver» desde Tribu. */
  rotuloDeVolver?: string;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();

  useSystemBackHandler(() => {
    onSalir();
    return true;
  });

  const { evaluacion, disponible: hayEvaluacion } = useEvaluacionPropia(vista != null);
  const { avisos } = useAvisosDeAcompanamiento(vista != null);
  const semaforo = useSemaforoDelGrupo(vista ? { quien: 'mentor', grupoId: vista.celula.id } : null);
  const sinSemaforo = seOcultaLaSeccion(semaforo);
  const esperandoSemaforo = semaforo.cargando && semaforo.datos === null && !sinSemaforo;
  const { escribiendoId, escribirle } = useEscribirleAlAprendiz();
  const [evaluacionAbierta, setEvaluacionAbierta] = useState(false);

  const filas = vista ? filasDeMiGrupo({ semaforo: semaforo.datos, padron: vista.todos, avisos }) : [];
  /* La cifra de la derecha: lo que cuenta el servidor y, si no la manda, las filas que se ven. */
  const cuantos = semaforo.datos?.resumen?.total ?? (vista ? (filas.length > 0 ? filas.length : vista.resumen.total) : 0);
  const porcentaje = evaluacion?.porcentaje ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Presionable
          onPress={onSalir}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={rotuloDeVolver === 'Volver' ? 'Volver' : `Volver a ${rotuloDeVolver}`}
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 16 }]}>{rotuloDeVolver}</Text>
        </Presionable>
      </View>

      <ScrollView
        {...barraAlDesplazar}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          estilos.contenido,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
      >
        <Aparicion>
          <View style={estilos.titulo}>
            <Text style={[t.screenTitle, { color: c.text, fontSize: 21, flexShrink: 1 }]} numberOfLines={2}>
              {vista?.celula.nombre ?? 'Mi grupo'}
            </Text>
            {vista ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, fontVariant: ['tabular-nums'] }]}>{cantidadDeAprendices(cuantos)}</Text>
            ) : null}
          </View>

          {/* Que falte mentor no borra el grupo: se dice quién lo cubre, no «no tienes grupo» (plan.md §10). */}
          {vista && vista.celula.cobertura !== 'con_mentor' ? (
            <View
              style={[
                estilos.avisoCobertura,
                {
                  backgroundColor: vista.celula.cobertura === 'soporte' ? c.goldWash : c.dangerWash,
                  borderColor: vista.celula.cobertura === 'soporte' ? c.goldInk : c.danger,
                },
              ]}
            >
              <Text style={[t.body, { color: vista.celula.cobertura === 'soporte' ? c.goldInk : c.danger, fontSize: 16, fontFamily: fuentes.media }]}>
                {vista.celula.cobertura === 'soporte' ? 'Grupo acompañado por soporte' : 'Este grupo todavía no tiene quien lo acompañe'}
              </Text>
            </View>
          ) : null}
        </Aparicion>

        {cargando ? <CargandoCelula /> : null}

        {!cargando && (fallo || (vista && vista.todos.length === 0)) ? (
          <EstadoCelula fallo={fallo} vacia={!fallo && vista?.todos.length === 0} detalle={detalle} onReintentar={recargar} />
        ) : null}

        {!cargando && vista && vista.todos.length > 0 ? (
          <>
            {semaforo.fallo !== null && !sinSemaforo ? (
              <View style={estilos.sinColores}>
                <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, flexShrink: 1 }]}>
                  No se pudieron cargar los colores del grupo.
                </Text>
                <Presionable onPress={semaforo.recargar} accessibilityRole="button" accessibilityLabel="Reintentar los colores del grupo" style={estilos.reintentar}>
                  <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 15 /* metadato */}]}>Reintentar</Text>
                </Presionable>
              </View>
            ) : null}
            {esperandoSemaforo ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, marginTop: 14 }]}>Cargando el semáforo del grupo…</Text>
            ) : (
              <Aparicion retardo={40} style={{ marginTop: 14 }}>
                <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {filas.map((fila, i) => (
                    <FilaDeAprendiz
                      key={fila.aprendizId}
                      nombre={fila.nombre}
                      avatarUrl={fila.avatarUrl}
                      color={fila.color}
                      motivo={fila.motivo}
                      conSeparador={i > 0}
                      /* Solo si sigue en el padrón: la ficha necesita al alumno entero, y alguien que ya rotó no es de este mentor. */
                      onAbrirFicha={fila.alumno ? () => onAbrirAlumno(fila.alumno as AlumnoConEstado) : undefined}
                      onEscribirle={() => void escribirle(fila.aprendizId, fila.nombre)}
                      escribiendo={escribiendoId !== null}
                    />
                  ))}
                </View>
              </Aparicion>
            )}

            {hayEvaluacion && evaluacion ? (
              <Presionable
                onPress={() => setEvaluacionAbierta(true)}
                accessibilityRole="button"
                accessibilityLabel={porcentaje === null ? 'Mi evaluación' : `Mi evaluación, ${Math.round(porcentaje)} por ciento`}
                style={estilos.enlace}
              >
                <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 16 }]}>
                  {porcentaje === null ? 'Mi evaluación' : `Mi evaluación · ${Math.round(porcentaje)} %`}
                </Text>
                <Icon name="chevron" size={14} color={c.goldInk} />
              </Presionable>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <HojaDeMiEvaluacion
        visible={evaluacionAbierta}
        alCerrar={() => setEvaluacionAbierta(false)}
        evaluacion={evaluacion}
        cohorteId={vista?.celula.cohorteId ?? null}
        grupoId={vista?.celula.id ?? null}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 6 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: ALTO_DE_TOQUE },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  titulo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  avisoCobertura: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderLeftWidth: 3 },
  tarjeta: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  sinColores: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 12 },
  reintentar: { minHeight: ALTO_DE_TOQUE, justifyContent: 'center', paddingHorizontal: 8 },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: ALTO_DE_TOQUE, marginTop: 14, alignSelf: 'flex-start' },
});
