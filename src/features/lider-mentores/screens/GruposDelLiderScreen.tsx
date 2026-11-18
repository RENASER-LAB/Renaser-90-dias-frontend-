import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { Icon } from '../../../components/Icon';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { CargandoLectura } from '../../semaforo/components/EstadoDeLectura';
import type { GrupoDelResumen } from '../../semaforo/types/semaforo.types';
import { AnilloDeCupo } from '../components/AnilloDeCupo';
import { ContadoresPorColor } from '../components/ContadoresPorColor';
import { HojaElegirMentor } from '../components/HojaElegirMentor';
import { LecturaFallida } from '../components/LecturaFallida';
import { Linea, MarcoDelLider } from '../components/MarcoDelLider';
import { useGruposDelLider } from '../hooks/useGruposDelLider';
import type { FiltroDeGrupos, GrupoDelLider } from '../types/gruposDelLider.types';
import { cuantosPorFiltro, filtroInicialDeGrupos, gruposDelFiltro } from '../utils/gruposDelLider';

const NOMBRE_DEL_FILTRO: Record<FiltroDeGrupos, string> = { sinMentor: 'Sin mentor', activos: 'Activos', llenos: 'Llenos' };
const SIN_GRUPOS: Record<FiltroDeGrupos, string> = { sinMentor: 'Ningún grupo sin mentor.', activos: 'Ningún grupo activo.', llenos: 'Ningún grupo lleno.' };

/**
 * «Grupos» del líder (spec 056 historia 4, FR-006 y FR-007): todos los grupos de sus formaciones con los filtros «Sin mentor», «Activos» y «Llenos» (cada
 * uno con su cantidad). Abre en «Sin mentor» si hay alguno; si no, en «Activos». Cada fila lleva el anillo de su cupo, su nombre y, si tiene mentor, sus
 * aprendices por estado; si no tiene mentor, el botón «Asignar», que abre la hoja para elegirlo. «Crear grupo» abre el asistente.
 *
 * «Sin mentor» cuenta lo mismo que «Por resolver» de «Mis mentores»: grupos regulares en curso sin mentor.
 */
export function GruposDelLiderScreen({
  filtroInicial,
  resumenes,
  onVolver,
  onAbrirGrupo,
  onCrear,
}: {
  /** Con qué filtro abre (por ejemplo «Sin mentor» desde «Por resolver»); sin él, el que toca según lo que haya. */
  filtroInicial?: FiltroDeGrupos;
  /** Lo que el resumen por grupos dice de cada grupo (los colores de sus aprendices); vacío si no se pudo leer: la fila no dibuja contadores. */
  resumenes: readonly GrupoDelResumen[];
  onVolver: () => void;
  onAbrirGrupo: (grupo: GrupoDelLider) => void;
  onCrear: () => void;
}) {
  const lectura = useGruposDelLider();
  const [elegido, setElegido] = useState<FiltroDeGrupos | null>(filtroInicial ?? null);
  const [asignando, setAsignando] = useState<GrupoDelLider | null>(null);
  const grupos = lectura.grupos;
  const filtro: FiltroDeGrupos = elegido ?? (grupos ? filtroInicialDeGrupos(grupos) : 'activos');
  const cuantos = useMemo(() => (grupos ? cuantosPorFiltro(grupos) : null), [grupos]);
  const visibles = grupos ? gruposDelFiltro(grupos, filtro) : [];

  return (
    <>
      <MarcoDelLider titulo="Grupos" onVolver={onVolver}>
        <BotonSecundario etiqueta="Crear grupo" icono="plus" onPress={onCrear} />
        {grupos ? (
          <>
            <ControlSegmentado<FiltroDeGrupos>
              opciones={(['sinMentor', 'activos', 'llenos'] as const).map(valor => ({ valor, etiqueta: `${NOMBRE_DEL_FILTRO[valor]} · ${cuantos?.[valor] ?? 0}` }))}
              valor={filtro}
              onCambiar={setElegido}
              rol="tab"
              achicarTexto
              accessibilityLabel="Filtrar los grupos"
            />
            {visibles.length === 0 ? (
              <Linea>{SIN_GRUPOS[filtro]}</Linea>
            ) : (
              <View style={estilos.lista}>
                {visibles.map(g => (
                  <FilaDeGrupo key={g.id} grupo={g} resumen={resumenes.find(r => r.grupoId === g.id) ?? null} onAbrir={() => onAbrirGrupo(g)} onAsignar={() => setAsignando(g)} />
                ))}
              </View>
            )}
          </>
        ) : lectura.fallo ? (
          <LecturaFallida fallo={lectura.fallo} detalle={lectura.detalle} que="los grupos" onReintentar={lectura.recargar} />
        ) : (
          <CargandoLectura texto="Cargando los grupos…" />
        )}
      </MarcoDelLider>
      <HojaElegirMentor
        grupo={asignando ? { id: asignando.id, nombre: asignando.nombre, mentorId: asignando.mentorId } : null}
        alCerrar={() => setAsignando(null)}
        onAsignado={() => {
          /* Asignar saca al grupo de «Sin mentor»: se relee y queda en «Activos», con ese mentor. */
          setElegido(null);
          lectura.recargar();
        }}
      />
    </>
  );
}

function FilaDeGrupo({ grupo, resumen, onAbrir, onAsignar }: { grupo: GrupoDelLider; resumen: GrupoDelResumen | null; onAbrir: () => void; onAsignar: () => void }) {
  const { c, t } = useTheme();
  const conMentor = grupo.mentorId !== null;
  const colores = conMentor ? resumen?.resumen ?? null : null;
  const cupoVisible = grupo.cupo !== null && grupo.aprendices !== null;

  const cuerpo = (
    <>
      {cupoVisible ? <AnilloDeCupo acompanados={grupo.aprendices ?? 0} maximo={grupo.cupo ?? 0} /> : null}
      <View style={estilos.textos}>
        <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={2}>
          {grupo.nombre}
        </Text>
        {conMentor && grupo.mentorNombre ? <Text style={[t.body, { color: c.textSoft, fontFamily: fuentes.regular, fontSize: 15 }]}>{grupo.mentorNombre}</Text> : null}
        {!cupoVisible && grupo.aprendices !== null ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{`${grupo.aprendices} ${grupo.aprendices === 1 ? 'aprendiz' : 'aprendices'}`}</Text> : null}
        {colores ? <ContadoresPorColor rojo={colores.rojo} ambar={colores.amarillo} verde={colores.verde} sinDatos={colores.sinDatos} /> : null}
      </View>
    </>
  );

  if (!conMentor) {
    return (
      <View style={[estilos.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        {cuerpo}
        <BotonSecundario etiqueta="Asignar" compacto accessibilityLabel={`Asignar mentor a ${grupo.nombre}`} onPress={onAsignar} estilo={estilos.asignar} />
      </View>
    );
  }
  return (
    <Presionable onPress={onAbrir} accessibilityRole="button" accessibilityLabel={`Abrir el grupo ${grupo.nombre}`} style={[estilos.fila, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      {cuerpo}
      <Icon name="chevron" size={16} color={c.chevron} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12 },
  textos: { flex: 1, minWidth: 0, gap: 4 },
  asignar: { minWidth: 92, flexShrink: 0 },
});
