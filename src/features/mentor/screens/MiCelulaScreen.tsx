import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Aparicion } from '../../../components/Aparicion';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CargandoCelula, EstadoCelula } from '../components/EstadoCelula';
import { FilaAlumno } from '../components/FilaAlumno';
import type { FalloCelula, VistaCelula } from '../hooks/useCelulaQueAcompano';
import type { AlumnoConEstado } from '../types/mentor.types';

/**
 * La célula del mentor: quién necesita algo hoy, y quién va al día.
 *
 * Un scroll único, como pide AGENTS.md §2. La lista de aprendices se recorre con `map` y NO
 * con `FlatList` a propósito: una lista virtualizada dentro de un `ScrollView` es exactamente
 * el doble scroll que la guía prohíbe, y una célula tiene diez personas —no mil— así que la
 * virtualización no compra nada y sí rompe el gesto.
 */
export function MiCelulaScreen({
  onSalir,
  onAbrirAlumno,
  vista,
  cargando,
  fallo,
  detalle,
  recargar,
}: {
  onSalir: () => void;
  onAbrirAlumno: (alumno: AlumnoConEstado) => void;
  vista: VistaCelula | null;
  cargando: boolean;
  fallo: FalloCelula | null;
  detalle: string | null;
  recargar: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();

  useSystemBackHandler(() => {
    onSalir();
    return true;
  });

  const resumen = vista?.resumen;
  /** `—` y no `0`: que no se sepa no es que valga cero. */
  const pct = resumen?.cumplimiento;
  const cifras: Array<{ valor: string; etiqueta: string }> = [
    { valor: String(resumen?.total ?? '—'), etiqueta: 'aprendices' },
    { valor: String(resumen?.alDia ?? '—'), etiqueta: 'al día' },
    { valor: pct === null || pct === undefined ? '—' : `${Math.round(pct * 100)}%`, etiqueta: 'cumplimiento' },
    { valor: resumen?.evidenciasPendientes === null || resumen?.evidenciasPendientes === undefined
        ? '—' : String(resumen.evidenciasPendientes), etiqueta: 'por revisar' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          onPress={onSalir}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
            VOLVER
          </Text>
        </Pressable>
        <View style={[estilos.insignia, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 10.5 }]}>
            MENTOR
          </Text>
        </View>
      </View>

      <ScrollView
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
          <Text style={[t.screenTitle, { color: c.text, fontSize: 21 }]} numberOfLines={2}>
            {vista?.celula.nombre ?? 'Mi célula'}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 4 }]}>
            {vista
              ? [vista.celula.cohorte, `${vista.resumen.total} aprendices`].filter(Boolean).join(' · ')
              : 'Acompañamiento de tu grupo'}
          </Text>
        </Aparicion>

        {cargando ? <CargandoCelula /> : null}

        {!cargando && (fallo || (vista && vista.todos.length === 0)) ? (
          <EstadoCelula
            fallo={fallo}
            vacia={!fallo && vista?.todos.length === 0}
            detalle={detalle}
            onReintentar={recargar}
          />
        ) : null}

        {!cargando && vista && vista.todos.length > 0 ? (
          <>
            <Aparicion retardo={70}>
              {/* `flexWrap` y un ancho minimo: cuatro en linea donde cabe, 2x2 en pantallas
                  estrechas. Sin puntos de ruptura escritos a mano — la caja decide. */}
              <View style={estilos.cifras}>
                {cifras.map(cifra => (
                  <View
                    key={cifra.etiqueta}
                    style={[estilos.cifra, { borderColor: c.border, backgroundColor: c.cardBg }]}
                  >
                    <Text style={[estilos.cifraValor, { color: c.textStrong }]}>{cifra.valor}</Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]} numberOfLines={2}>
                      {cifra.etiqueta}
                    </Text>
                  </View>
                ))}
              </View>
            </Aparicion>

            {vista.requierenSeguimiento.length > 0 ? (
              <Aparicion retardo={140} style={{ marginTop: 22 }}>
                <MicroLabel>REQUIEREN SEGUIMIENTO</MicroLabel>
                <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {vista.requierenSeguimiento.map(a => (
                    <FilaAlumno key={a.participanteId} alumno={a} onPress={() => onAbrirAlumno(a)} />
                  ))}
                </View>
              </Aparicion>
            ) : (
              <Aparicion retardo={140} style={{ marginTop: 22 }}>
                <View style={[estilos.todoBien, { borderColor: c.border, backgroundColor: c.successWash }]}>
                  <Icon name="checkCircle" size={17} color={c.success} />
                  <Text style={[t.body, { color: c.text, fontSize: 13, flex: 1 }]}>
                    Nadie de tu célula necesita seguimiento hoy.
                  </Text>
                </View>
              </Aparicion>
            )}

            {vista.alDia.length > 0 ? (
              <Aparicion retardo={210} style={{ marginTop: 22 }}>
                <MicroLabel>AL DÍA</MicroLabel>
                <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {vista.alDia.map(a => (
                    <FilaAlumno key={a.participanteId} alumno={a} onPress={() => onAbrirAlumno(a)} />
                  ))}
                </View>
              </Aparicion>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, paddingBottom: 6,
  },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44 },
  insignia: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  /* `flexBasis: 132` es lo que hace que escale sola, sin puntos de ruptura escritos a mano:
     a 375px de ancho no caben cuatro, asi que se reparten 2x2 y cada etiqueta tiene sitio; en
     tablet (560 de contenido) las cuatro entran en una fila. Con 74 cabian las cuatro y
     "cumplimiento" se partia por la mitad. */
  cifra: {
    flexGrow: 1, flexBasis: 132, minWidth: 132,
    borderWidth: 1, borderRadius: 13, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center',
  },
  cifraValor: {
    fontFamily: 'Jost_500Medium', fontSize: 23, lineHeight: 27,
    fontVariant: ['tabular-nums'],
  },
  lista: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, marginTop: 8 },
  todoBien: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
});
