import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { useFormacionDeLaSesion } from '../../formaciones/context/FormacionContext';
import { ListaDeFilas } from '../../paneles-de-rol/components/FilaDeLista';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CargandoLectura, FalloDeLectura } from '../../semaforo/components/EstadoDeLectura';
import { EncabezadoDelDia } from '../components/EncabezadoDelDia';
import { FilaDeHabito } from '../components/FilaDeHabito';
import { FiltrosDeLosHabitos, type GrupoParaFiltrar } from '../components/FiltrosDeLosHabitos';
import { BarraDelLider } from '../components/MarcoDelLider';
import { useHabitosDeTodos } from '../hooks/useHabitosDeTodos';
import type { FiltrosDeLosHabitos as Filtros, HabitoDeTodos, PersonaEnUnHabito } from '../types/habitosDeTodos.types';
import { urlDeLaFoto } from '../utils/aprendicesDelLider';
import {
  fichaParaElDia,
  hayFiltros,
  navegacionDelDia,
  resumenDelDiaEnPalabras,
  seOfreceElFiltroDeFormacion,
  sumarDimensiones,
  textoSinHabitos,
  type OpcionDeDimension,
} from '../utils/habitosDeTodos';
import { AVISO_SI_NO_SE_ABRE } from './AprendicesDelLiderScreen';
import { PersonasDeUnHabitoScreen } from './PersonasDeUnHabitoScreen';
import { PersonaDelLiderScreen } from './PersonaDelLiderScreen';

const SIN_FILTROS: Filtros = { fecha: null, grupo: null, formacion: null, categoria: null };

/** El hábito que se abrió, con el día y los filtros CONCRETOS con que se miraba (el día de la lista, no «hoy» a secas). */
interface HabitoAbierto {
  habito: HabitoDeTodos;
  filtros: Filtros;
  esHoy: boolean;
  masReciente: string | null;
}

/**
 * «Hábitos de todos» del líder de mentores (spec 029; pedido del dueño): un día a la vez —hoy y hasta 7 atrás—, hábito por hábito, quién
 * lo cumplió y quién no entre TODOS los alumnos de sus formaciones, con las personas que menos cumplen primero. Se abre desde Yo → «Mis
 * mentores» → «Hábitos de todos» (la fila solo existe si el servidor la ofrece). Solo lectura.
 *
 * Tres niveles, y el atrás (sistema y flecha) sube uno por vez: **ficha de la persona → personas del hábito → hábitos del día → «Mis
 * mentores» → Yo**. Los niveles de abajo quedan montados y ocultos mientras se mira el de arriba (como «Todos los aprendices»), así que al
 * volver conservan el día, los filtros, la búsqueda, lo leído y la posición, sin releerse.
 *
 * - **Hábitos del día**: ‹ día ›, el resumen («118 de 120 alumnos con hábitos · 940 de 1 500 cumplidos»), los filtros (dimensión, formación
 *   —solo para quien ve más de una a la vez—, grupo con «Sin grupo») y una fila por hábito con su barra. Deslizar hacia abajo recarga.
 * - **Cada lectura toma un turno** y al cambiar de día o de filtro no queda a la vista el dato del anterior (ni por un instante).
 * - **Sin hábitos** dice «Ese día nadie tenía hábitos por cumplir.»; con filtros puestos, «Ningún alumno coincide con estos filtros.» y un
 *   botón para quitarlos. Un fallo dice por qué y ofrece «Reintentar».
 * - Sin animaciones propias: cambiar de día, de filtro o de nivel se hace decenas de veces y tiene que verse en el acto (`Presionable` en
 *   las filas).
 */
export function HabitosDeTodosScreen({ grupos, onSalir }: { grupos: readonly GrupoParaFiltrar[]; onSalir: () => void }) {
  const [filtros, setFiltros] = React.useState<Filtros>(SIN_FILTROS);
  const [abierto, setAbierto] = React.useState<HabitoAbierto | null>(null);
  const [persona, setPersona] = React.useState<PersonaEnUnHabito | null>(null);
  const lectura = useHabitosDeTodos(filtros);

  /* Los hábitos del día suben a «Mis mentores»; con uno abierto, el retroceso es el de ese nivel. */
  useSystemBackHandler(() => {
    onSalir();
    return true;
  }, abierto === null);

  const ficha = abierto && persona ? fichaParaElDia({ fecha: abierto.filtros.fecha ?? '', esHoy: abierto.esHoy }) : null;

  return (
    <>
      <View style={abierto ? estilos.oculta : estilos.visible}>
        <HabitosDelDia
          lectura={lectura}
          filtros={filtros}
          grupos={grupos}
          onFiltros={setFiltros}
          onSalir={onSalir}
          onAbrir={(habito, datos) =>
            setAbierto({
              habito,
              filtros: { ...filtros, fecha: datos.fecha },
              esHoy: datos.esHoy,
              masReciente: datos.masReciente,
            })
          }
        />
      </View>
      {abierto ? (
        <View style={persona ? estilos.oculta : estilos.visible}>
          {/* `key`: otro hábito es otra lista, desde cero. */}
          <PersonasDeUnHabitoScreen
            key={`${abierto.habito.habitoId}|${abierto.filtros.fecha}`}
            habito={abierto.habito}
            filtros={abierto.filtros}
            esHoy={abierto.esHoy}
            masReciente={abierto.masReciente}
            activa={persona === null}
            onVolver={() => setAbierto(null)}
            onAbrirPersona={setPersona}
          />
        </View>
      ) : null}
      {persona && ficha ? (
        /* `key`: otra persona es otra ficha, desde cero. Abre en el MISMO día que se miraba. */
        <PersonaDelLiderScreen
          key={persona.personaId}
          grupoId={persona.grupoId}
          grupoNombre={persona.grupoNombre ?? (persona.grupoId ? 'Grupo sin nombre' : 'Sin grupo')}
          personaId={persona.personaId}
          nombre={persona.nombre}
          avatarUrl={urlDeLaFoto(persona.fotoPath)}
          inicio={ficha.inicio}
          diaInicial={ficha.diaInicial}
          desdeTodos
          avisoSiNoSeAbre={AVISO_SI_NO_SE_ABRE}
          onVolver={() => setPersona(null)}
        />
      ) : null}
    </>
  );
}

function HabitosDelDia({
  lectura,
  filtros,
  grupos,
  onFiltros,
  onSalir,
  onAbrir,
}: {
  lectura: ReturnType<typeof useHabitosDeTodos>;
  filtros: Filtros;
  grupos: readonly GrupoParaFiltrar[];
  onFiltros: (filtros: Filtros) => void;
  onSalir: () => void;
  onAbrir: (habito: HabitoDeTodos, datos: NonNullable<ReturnType<typeof useHabitosDeTodos>['datos']>) => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { formacion } = useFormacionDeLaSesion();
  const { datos, limites } = lectura;

  /* Las dimensiones que ya se vieron: al filtrar por una, las otras no desaparecen. */
  const [dimensiones, setDimensiones] = React.useState<OpcionDeDimension[]>([]);
  React.useEffect(() => {
    if (!datos) return;
    setDimensiones(previas => {
      const suma = sumarDimensiones(previas, datos.habitos);
      return suma.length === previas.length ? previas : suma;
    });
  }, [datos]);

  const dia = filtros.fecha ?? datos?.fecha ?? limites.masReciente;
  const esHoy = filtros.fecha === null ? true : datos?.esHoy ?? dia === limites.masReciente;
  const navegacion = navegacionDelDia(dia, limites.masAntigua, limites.masReciente);
  const conFiltros = hayFiltros(filtros);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <BarraDelLider titulo="Hábitos de todos" onVolver={onSalir} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={lectura.refrescando} onRefresh={() => void lectura.recargar()} tintColor={c.goldInk} colors={[c.goldInk]} />}
        contentContainerStyle={{
          flexGrow: 1,
          gap: 16,
          paddingHorizontal: horizontalPadding,
          paddingTop: 8,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <EncabezadoDelDia
          fecha={dia}
          esHoy={esHoy}
          masReciente={limites.masReciente}
          navegacion={navegacion}
          onCambiar={fecha => onFiltros({ ...filtros, fecha })}
        />
        {datos ? (
          <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>{resumenDelDiaEnPalabras(datos.totales)}</Text>
        ) : null}
        <FiltrosDeLosHabitos
          dimensiones={dimensiones}
          categoria={filtros.categoria}
          onCategoria={categoria => onFiltros({ ...filtros, categoria })}
          verFormacion={seOfreceElFiltroDeFormacion(formacion)}
          formacion={filtros.formacion}
          onFormacion={codigo => onFiltros({ ...filtros, formacion: codigo })}
          grupos={grupos}
          grupo={filtros.grupo}
          onGrupo={id => onFiltros({ ...filtros, grupo: id })}
        />
        {lectura.cargando ? (
          <CargandoLectura texto="Cargando los hábitos…" />
        ) : lectura.fallo || !datos ? (
          <FalloDeLectura
            fallo={lectura.fallo ?? 'error'}
            detalle={lectura.detalleDelFallo}
            que="los hábitos de todos"
            onReintentar={() => void lectura.recargar()}
          />
        ) : datos.habitos.length === 0 ? (
          <View style={{ gap: 12, alignItems: 'flex-start' }}>
            <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{textoSinHabitos(conFiltros)}</Text>
            {conFiltros ? (
              <BotonSecundario
                etiqueta="Quitar los filtros"
                onPress={() => onFiltros({ ...filtros, grupo: null, formacion: null, categoria: null })}
              />
            ) : null}
          </View>
        ) : (
          <ListaDeFilas>
            {datos.habitos.map((habito, i) => (
              <FilaDeHabito key={habito.habitoId} habito={habito} esHoy={datos.esHoy} primera={i === 0} onAbrir={() => onAbrir(habito, datos)} />
            ))}
          </ListaDeFilas>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  visible: { flex: 1 },
  /* Montada pero fuera de la vista: volver es instantáneo y conserva el día, los filtros, la búsqueda y el lugar. */
  oculta: { display: 'none' },
});
