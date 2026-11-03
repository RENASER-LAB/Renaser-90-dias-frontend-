import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { FormField } from '../../../components/FormField';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { BotonPeligro, BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { nombreLargoDeFormacion } from '../../formaciones/utils/nombreDeFormacion';
import {
  actualizarCategoriaAdmin,
  cambiarActivaCategoriaAdmin,
  crearCategoriaAdmin,
  eliminarCategoriaAdmin,
  ordenarCategoriasAdmin,
} from '../../habits/categorias/api/categoriasApi';
import type { CategoriaAdmin } from '../../habits/categorias/types/categorias.types';
import {
  ICONOS_DE_CATEGORIA,
  iconoDeCategoria,
  NOMBRE_DEL_ICONO_DE_CATEGORIA,
} from '../../habits/categorias/utils/iconosDeCategoria';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { TODAS_LAS_FORMACIONES } from '../api/habitosProgramaApi';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import type { useHabitosProgramaAdmin } from '../hooks/useHabitosProgramaAdmin';
import {
  faltaEnLaCategoria,
  LARGO_MAXIMO_DE_LA_CATEGORIA,
  movida,
  textoDeLosHabitosDeLaCategoria,
  TEXTO_CON_HABITOS_ACTIVOS,
} from '../utils/categoriasDeHabito';
import { confirmar } from '../utils/dialogo';
import { mensajeDeFallo } from '../utils/mensajes';

/**
 * «Categorías» de una formación (spec 023, historia 2): las dimensiones que ven en Training los participantes de esa formación. Se crean,
 * se renombran, se les cambia el ícono (entre los que la app ya dibuja), se ordenan con ▲ ▼ (botones de 48, sin arrastrar), se activan o
 * desactivan y se eliminan. Una con hábitos activos no se desactiva ni se elimina; con historial se desactiva pero no se elimina: el
 * servidor lo decide y explica, y aquí se dice con sus palabras.
 *
 * Una sola lista que desliza. Tocar una categoría abre su hoja (nombre, ícono, activar y eliminar); «Nueva categoría» abre la misma vacía.
 *
 * Movimiento (`emil-design-eng`, `animate-expo`): subir y bajar cambian la fila al instante (se toca varias veces seguidas); la hoja es
 * `HojaDesdeAbajo`; lo guardado se confirma en línea. Nada más se anima.
 */
export function CategoriasDeHabitoAdminScreen({
  estado,
  onVolver,
}: {
  estado: ReturnType<typeof useHabitosProgramaAdmin>;
  onVolver: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const formacion = estado.formacion;
  const lista = estado.categoriasDe(formacion);
  const [editando, setEditando] = useState<{ clave: string | null } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const avisarListo = (texto: string) => {
    tacto.logro();
    setConfirmacion({ clave: Date.now(), texto });
  };

  const mover = async (clave: string, delta: -1 | 1) => {
    const claves = movida(lista.map(x => x.key), clave, delta);
    if (!claves || ocupado) return;
    tacto.seleccion();
    setOcupado(true);
    setError(null);
    try {
      estado.reemplazarCategoriasDe(formacion, await ordenarCategoriasAdmin(formacion, claves));
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudo cambiar el orden. Vuelve a intentar.'));
    } finally {
      setOcupado(false);
    }
  };

  const enTodas = formacion === TODAS_LAS_FORMACIONES;
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];
  const abierta = editando?.clave ? (lista.find(x => x.key === editando.clave) ?? null) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Categorías"
        subtitulo={enTodas ? 'Elige una formación' : nombreLargoDeFormacion(formacion)}
        onVolver={onVolver}
        accion={enTodas ? undefined : { etiqueta: 'Nueva', onPress: () => { setError(null); setEditando({ clave: null }); } }}
      />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
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
        {enTodas ? (
          <Text style={cuerpo}>Las categorías son de cada formación. Vuelve y elige una para verlas o cambiarlas.</Text>
        ) : (
          <Text style={cuerpo}>
            Son las dimensiones que ven en Training quienes están en esta formación, en este orden. Una categoría sin hábitos que les toquen no se
            dibuja.
          </Text>
        )}
        {confirmacion ? <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} /> : null}
        {error && !editando ? (
          <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
            {error}
          </Text>
        ) : null}

        {!enTodas && lista.length === 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={cuerpo}>Esta formación todavía no tiene categorías. Crea la primera para poder darle hábitos.</Text>
            <BotonPrincipal etiqueta="Nueva categoría" onPress={() => { setError(null); setEditando({ clave: null }); }} />
          </View>
        ) : null}

        {lista.map((categoria, indice) => (
          <FilaDeCategoria
            key={categoria.key}
            categoria={categoria}
            esPrimera={indice === 0}
            esUltima={indice === lista.length - 1}
            ocupado={ocupado}
            onAbrir={() => { setError(null); setEditando({ clave: categoria.key }); }}
            onSubir={() => void mover(categoria.key, -1)}
            onBajar={() => void mover(categoria.key, 1)}
          />
        ))}
      </ScrollView>

      <HojaDeLaCategoria
        visible={editando !== null}
        formacion={formacion}
        categoria={abierta}
        error={error}
        onError={setError}
        onCerrar={() => { setEditando(null); setError(null); }}
        onGuardada={(guardada, texto) => {
          estado.reemplazarCategoria(guardada);
          setEditando(null);
          avisarListo(texto);
        }}
        onEliminada={clave => {
          estado.quitarCategoria(clave);
          setEditando(null);
          avisarListo('Categoría eliminada.');
        }}
        existentes={lista}
      />
    </SafeAreaView>
  );
}

function FilaDeCategoria({
  categoria,
  esPrimera,
  esUltima,
  ocupado,
  onAbrir,
  onSubir,
  onBajar,
}: {
  categoria: CategoriaAdmin;
  esPrimera: boolean;
  esUltima: boolean;
  ocupado: boolean;
  onAbrir: () => void;
  onSubir: () => void;
  onBajar: () => void;
}) {
  const { c, t } = useTheme();
  const detalle = `${categoria.isActive ? 'Activa' : 'Desactivada'} · ${textoDeLosHabitosDeLaCategoria(categoria)}`;
  return (
    <View style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border, opacity: categoria.isActive ? 1 : 0.72 }]}>
      <Presionable
        onPress={onAbrir}
        accessibilityRole="button"
        accessibilityLabel={`${categoria.name}. ${detalle}. Abrir para cambiarla`}
        style={estilos.cuerpo}
      >
        <View style={[estilos.baldosa, { backgroundColor: c.goldWash }]}>
          <Icon name={iconoDeCategoria(categoria.icon)} size={TAMANO_ICONO.normal} color={c.gold} />
        </View>
        <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
          <Text numberOfLines={2} style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>
            {categoria.name}
          </Text>
          <Text numberOfLines={2} style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
            {detalle}
          </Text>
        </View>
      </Presionable>
      <View style={estilos.orden}>
        <BotonDeOrden direccion="arriba" deshabilitado={esPrimera || ocupado} onPress={onSubir} etiqueta={`Subir ${categoria.name}`} />
        <BotonDeOrden direccion="abajo" deshabilitado={esUltima || ocupado} onPress={onBajar} etiqueta={`Bajar ${categoria.name}`} />
      </View>
    </View>
  );
}

/** ▲ y ▼ de 48: el chevron del proyecto apunta a la derecha, así que se gira su contenedor. */
function BotonDeOrden({
  direccion,
  deshabilitado,
  onPress,
  etiqueta,
}: {
  direccion: 'arriba' | 'abajo';
  deshabilitado: boolean;
  onPress: () => void;
  etiqueta: string;
}) {
  const { c } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      style={[estilos.botonDeOrden, { opacity: deshabilitado ? 0.3 : 1 }]}
    >
      <View style={{ transform: [{ rotate: direccion === 'arriba' ? '-90deg' : '90deg' }] }}>
        <Icon name="chevron" size={TAMANO_ICONO.normal} color={c.textStrong} />
      </View>
    </Presionable>
  );
}

/**
 * La hoja de una categoría: nombre, ícono y —si ya existe— activar o desactivar y eliminar. Nada se guarda hasta «Guardar»; lo que el servidor
 * rechaza se dice con su motivo en la misma hoja.
 */
function HojaDeLaCategoria({
  visible,
  formacion,
  categoria,
  existentes,
  error,
  onError,
  onCerrar,
  onGuardada,
  onEliminada,
}: {
  visible: boolean;
  formacion: string;
  categoria: CategoriaAdmin | null;
  existentes: readonly CategoriaAdmin[];
  error: string | null;
  onError: (mensaje: string | null) => void;
  onCerrar: () => void;
  onGuardada: (categoria: CategoriaAdmin, texto: string) => void;
  onEliminada: (clave: string) => void;
}) {
  const { c, t } = useTheme();
  const esNueva = categoria === null;
  /* El borrador nace de la categoría que se abre; la hoja se monta de nuevo en cada apertura (`key`). */
  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      titulo={esNueva ? 'Nueva categoría' : categoria.name}
      subtitulo={nombreLargoDeFormacion(formacion)}
      etiquetaCerrar="Cerrar sin guardar"
      tamano="grande"
    >
      {visible ? (
        <CuerpoDeLaHoja
          key={categoria?.key ?? 'nueva'}
          formacion={formacion}
          categoria={categoria}
          existentes={existentes}
          error={error}
          onError={onError}
          onGuardada={onGuardada}
          onEliminada={onEliminada}
          colores={{ c, t }}
        />
      ) : null}
    </HojaDesdeAbajo>
  );
}

function CuerpoDeLaHoja({
  formacion,
  categoria,
  existentes,
  error,
  onError,
  onGuardada,
  onEliminada,
  colores,
}: {
  formacion: string;
  categoria: CategoriaAdmin | null;
  existentes: readonly CategoriaAdmin[];
  error: string | null;
  onError: (mensaje: string | null) => void;
  onGuardada: (categoria: CategoriaAdmin, texto: string) => void;
  onEliminada: (clave: string) => void;
  colores: { c: ReturnType<typeof useTheme>['c']; t: ReturnType<typeof useTheme>['t'] };
}) {
  const { c, t } = colores;
  const esNueva = categoria === null;
  const [nombre, setNombre] = useState(categoria?.name ?? '');
  const [icono, setIcono] = useState<string | null>(categoria?.icon ?? null);
  const [ocupado, setOcupado] = useState<'guardar' | 'activar' | 'eliminar' | null>(null);
  const cambiado = esNueva || nombre.trim() !== categoria.name || (icono ?? null) !== (categoria.icon ?? null);

  const guardar = async () => {
    const falta = faltaEnLaCategoria(nombre, existentes, categoria?.key ?? null);
    if (falta) {
      tacto.error();
      onError(falta);
      return;
    }
    setOcupado('guardar');
    onError(null);
    try {
      if (esNueva) {
        const creada = await crearCategoriaAdmin({ formacion, nombre: nombre.trim(), icono });
        if (creada) onGuardada(creada, `Categoría «${creada.name}» creada.`);
      } else {
        const cambioIcono = (icono ?? null) !== (categoria.icon ?? null);
        const guardada = await actualizarCategoriaAdmin(categoria.key, {
          nombre: nombre.trim() !== categoria.name ? nombre.trim() : undefined,
          icono,
          cambiaElIcono: cambioIcono,
        });
        if (guardada) onGuardada(guardada, 'Guardado.');
      }
    } catch (e) {
      onError(mensajeDeFallo(e, 'No se pudo guardar la categoría. Vuelve a intentar.'));
    } finally {
      setOcupado(null);
    }
  };

  const alternarActiva = async () => {
    if (!categoria) return;
    setOcupado('activar');
    onError(null);
    try {
      const guardada = await cambiarActivaCategoriaAdmin(categoria.key, !categoria.isActive);
      if (guardada) onGuardada(guardada, guardada.isActive ? 'Categoría activada.' : 'Categoría desactivada.');
    } catch (e) {
      onError(mensajeDeFallo(e, 'No se pudo cambiar el estado. Vuelve a intentar.'));
    } finally {
      setOcupado(null);
    }
  };

  const eliminar = async () => {
    if (!categoria) return;
    const acepto = await confirmar('¿Eliminar esta categoría?', `«${categoria.name}» desaparece de ${nombreLargoDeFormacion(formacion)}.`, {
      ok: 'Eliminar',
      destructivo: true,
    });
    if (!acepto) return;
    setOcupado('eliminar');
    onError(null);
    try {
      await eliminarCategoriaAdmin(categoria.key);
      onEliminada(categoria.key);
    } catch (e) {
      onError(mensajeDeFallo(e, 'No se pudo eliminar la categoría. Vuelve a intentar.'));
    } finally {
      setOcupado(null);
    }
  };

  const ayuda = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }];
  const bloqueada = categoria !== null && categoria.isActive && !categoria.canBeDeactivated;

  return (
    <View style={estilos.hoja}>
      <FormField
        label="Nombre"
        value={nombre}
        onChangeText={v => {
          onError(null);
          setNombre(v.slice(0, LARGO_MAXIMO_DE_LA_CATEGORIA));
        }}
        placeholder="Ej.: Estudio"
        autoCapitalize="sentences"
        returnKeyType="done"
      />

      <View style={{ gap: 8 }}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>Ícono</Text>
        <View style={estilos.iconos} accessibilityRole="radiogroup" accessibilityLabel="Ícono de la categoría">
          <OpcionDeIcono nombre={null} activo={icono === null} onPress={() => setIcono(null)} />
          {ICONOS_DE_CATEGORIA.map(i => (
            <OpcionDeIcono key={i} nombre={i} activo={icono === i} onPress={() => { tacto.seleccion(); setIcono(i); }} />
          ))}
        </View>
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
          {error}
        </Text>
      ) : null}

      <BotonPrincipal
        etiqueta={esNueva ? 'Crear categoría' : 'Guardar'}
        onPress={() => void guardar()}
        cargando={ocupado === 'guardar'}
        deshabilitado={!cambiado || ocupado !== null}
      />

      {categoria ? (
        <View style={{ gap: 10, marginTop: 4 }}>
          <BotonSecundario
            etiqueta={categoria.isActive ? 'Desactivar' : 'Activar'}
            onPress={() => void alternarActiva()}
            cargando={ocupado === 'activar'}
            deshabilitado={ocupado !== null || bloqueada}
          />
          {bloqueada ? <Text style={ayuda}>{TEXTO_CON_HABITOS_ACTIVOS}</Text> : null}
          <BotonPeligro etiqueta="Eliminar" onPress={() => void eliminar()} deshabilitado={ocupado !== null || !categoria.canBeDeleted} />
          <Text style={ayuda}>
            {categoria.canBeDeleted
              ? 'No tiene hábitos: se puede eliminar.'
              : 'Solo se elimina una categoría sin hábitos. Con historial, desactívala.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function OpcionDeIcono({ nombre, activo, onPress }: { nombre: string | null; activo: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const etiqueta = nombre === null ? 'Sin ícono' : (NOMBRE_DEL_ICONO_DE_CATEGORIA[nombre] ?? nombre);
  return (
    <Presionable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={etiqueta}
      style={[
        estilos.opcionDeIcono,
        { backgroundColor: activo ? c.goldWash : c.cardBg, borderColor: activo ? c.gold : c.border },
      ]}
    >
      <Icon name={nombre === null ? 'listChecks' : iconoDeCategoria(nombre)} size={TAMANO_ICONO.normal} color={activo ? c.goldInk : c.textSoft} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, minHeight: 64, paddingRight: 4 },
  cuerpo: { flex: 1, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 64 },
  baldosa: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  orden: { flexDirection: 'row', alignItems: 'center' },
  botonDeOrden: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hoja: { gap: 16, paddingHorizontal: 20, paddingBottom: 24 },
  iconos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcionDeIcono: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
