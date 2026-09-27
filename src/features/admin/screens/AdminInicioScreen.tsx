import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { EtiquetaSemaforo } from '../../semaforo/components/EtiquetaSemaforo';
import { palabraParaQuienAcompana } from '../../semaforo/utils/ayudaDelSemaforo';
import { textoDiasConDatos } from '../../semaforo/utils/lecturaDelSemaforo';
import { useAQuienAtiendoHoy } from '../hooks/useAQuienAtiendoHoy';
import type { PersonaDeFicha, SeccionAdmin } from '../types/admin.types';
import { usePendientesAdmin } from '../hooks/usePendientesAdmin';

/**
 * La raíz de Administración: a quién atender, qué hay pendiente y por dónde se entra.
 *
 * Desde el 26/09 (retroalimentación, A-3 y S-4) son tres bloques y ninguno se repite:
 *
 * 1. **¿A quién atiendo hoy?** — las personas en rojo o amarillo de todos los grupos. Tocar una abre
 *    su ficha: dos toques para llegar a alguien que necesita ayuda.
 * 2. **Pendientes** — Grupos, Personas y Solicitudes, cada uno con su contador. Son también la
 *    entrada a esas secciones.
 * 3. **Más** — el semáforo de todos los grupos y las demás opciones.
 *
 * > **Corregido 2026-09-26.** Antes había «Pendientes» (Grupos por vencer, Personas sin grupo,
 * > Solicitudes) y debajo «Secciones» con Grupos, Personas y Solicitudes OTRA VEZ: tres filas que
 * > llevaban al mismo lugar que las de arriba. Se juntaron.
 *
 * Los contadores solo aparecen cuando hay una lectura REAL detrás. Un panel que no responde deja
 * su fila sin número y con un aviso propio; no pone cero, que es una afirmación distinta, y no
 * arrastra a los demás paneles con él (ARF-02).
 */
export function AdminInicioScreen({
  onSalir,
  onAbrir,
  onAbrirFicha,
}: {
  onSalir: () => void;
  onAbrir: (seccion: SeccionAdmin) => void;
  onAbrirFicha: (persona: PersonaDeFicha) => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const pendientes = usePendientesAdmin();

  useSystemBackHandler(() => {
    onSalir();
    return true;
  });

  const colas: Array<{
    clave: SeccionAdmin;
    titulo: string;
    queCuenta: string;
    contador: number | null;
    fallo: boolean;
  }> = [
    {
      clave: 'grupos',
      titulo: 'Grupos',
      queCuenta: 'Grupos por vencer en 7 días',
      contador: pendientes.gruposPorVencer,
      fallo: pendientes.falloGrupos,
    },
    {
      clave: 'personas',
      titulo: 'Personas',
      queCuenta: 'Personas sin grupo',
      contador: pendientes.personasSinGrupo,
      fallo: pendientes.falloPersonas,
    },
    {
      clave: 'solicitudes',
      titulo: 'Solicitudes',
      queCuenta: 'Altas por decidir',
      contador: pendientes.solicitudesPendientes,
      fallo: pendientes.falloSolicitudes,
    },
  ];

  const mas: Array<{ clave: SeccionAdmin; titulo: string; detalle: string }> = [
    /* Semáforo de cumplimiento (D-168): el resumen por grupos y, al tocar uno, su tabla con nombres. */
    { clave: 'semaforo', titulo: 'Semáforo', detalle: 'Cuánto cumplió cada grupo, semana a semana' },
    { clave: 'mas', titulo: 'Más opciones', detalle: 'Bienvenida, equipo, catálogo, soporte y comunidad' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Administración"
        subtitulo="Operación del programa"
        onVolver={onSalir}
        accion={{ etiqueta: 'Mi programa', onPress: onSalir }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 26,
        }}
      >
        <AQuienAtiendoHoy onAbrirFicha={onAbrirFicha} />

        <View style={{ gap: 10 }}>
          <TituloDeSeccion>Pendientes</TituloDeSeccion>
          {colas.map(cola => (
            <Pressable
              key={cola.clave}
              onPress={() => onAbrir(cola.clave)}
              accessibilityRole="button"
              accessibilityLabel={cola.titulo}
              accessibilityHint={
                cola.contador === null ? `${cola.queCuenta}: no se pudo contar` : `${cola.queCuenta}: ${cola.contador}`
              }
              style={({ pressed }) => [
                estilos.fila,
                { backgroundColor: pressed ? c.goldWash : c.cardBg, borderColor: c.border },
              ]}
            >
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 18, fontFamily: 'Jost_500Medium' }]}>
                  {cola.titulo}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]}>
                  {cola.fallo ? `${cola.queCuenta}: no se pudo consultar ahora` : cola.queCuenta}
                </Text>
              </View>
              {/* Guion y no cero: que no se sepa no es que valga cero. */}
              <Text style={[t.cardTitle, { color: cola.contador ? c.goldInk : c.textSoft, fontSize: 22 }]}>
                {cola.contador === null ? '—' : String(cola.contador)}
              </Text>
              <Icon name="chevron" size={18} color={c.chevron} />
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <TituloDeSeccion>Más</TituloDeSeccion>
          {mas.map(seccion => (
            <Pressable
              key={seccion.clave}
              onPress={() => onAbrir(seccion.clave)}
              accessibilityRole="button"
              accessibilityLabel={seccion.titulo}
              style={({ pressed }) => [
                estilos.fila,
                { backgroundColor: pressed ? c.goldWash : c.cardBg, borderColor: c.border },
              ]}
            >
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 18, fontFamily: 'Jost_500Medium' }]}>
                  {seccion.titulo}
                </Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]}>
                  {seccion.detalle}
                </Text>
              </View>
              <Icon name="chevron" size={18} color={c.chevron} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Cuántas personas se ven antes de «Ver más»: una pantalla, sin tener que buscar. */
const PERSONAS_A_LA_VISTA = 8;

/**
 * S-4: las personas en rojo o amarillo de todos los grupos, primero los rojos. Si el servidor no
 * tiene el semáforo (404) o la cuenta no puede verlo (403), el bloque no aparece.
 */
function AQuienAtiendoHoy({ onAbrirFicha }: { onAbrirFicha: (persona: PersonaDeFicha) => void }) {
  const { c, t } = useTheme();
  const { personas, cargando, fallo, oculta, gruposSinLeer, recargar } = useAQuienAtiendoHoy();
  const [todas, setTodas] = useState(false);
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  if (oculta) return null;
  const visibles = todas ? personas : personas.slice(0, PERSONAS_A_LA_VISTA);

  return (
    <View style={{ gap: 10 }}>
      <TituloDeSeccion detalle="Necesitan atención esta semana: en rojo o en amarillo, de todos los grupos.">
        ¿A quién atiendo hoy?
      </TituloDeSeccion>

      {cargando && personas.length === 0 ? <Text style={cuerpo}>Buscando a quién atender…</Text> : null}

      {!cargando && fallo ? (
        <View style={{ gap: 8 }}>
          <Text style={[cuerpo, { color: c.danger }]}>
            {fallo === 'sin_red' ? 'Sin conexión con el servidor.' : 'No se pudo leer el semáforo de los grupos.'}
          </Text>
          <BotonSecundario etiqueta="Reintentar" onPress={recargar} />
        </View>
      ) : null}

      {!cargando && !fallo && personas.length === 0 ? (
        <Text style={cuerpo}>Nadie está en rojo ni en amarillo esta semana.</Text>
      ) : null}

      {visibles.length > 0 ? (
        <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          {visibles.map((p, i) => {
            const nombre = p.nombre?.trim() || 'Aprendiz sin nombre';
            const palabra = palabraParaQuienAcompana(p.color, p.etiqueta);
            const dias = p.diasConDatos !== null ? textoDiasConDatos(p.diasConDatos) : null;
            return (
              <Pressable
                key={p.aprendizId}
                onPress={() => onAbrirFicha({ id: p.aprendizId, fullName: p.nombre, cellId: p.grupoId })}
                accessibilityRole="button"
                accessibilityLabel={`${nombre}. ${palabra}.${dias ? ` ${dias}.` : ''} ${
                  p.grupoNombre ? `Grupo ${p.grupoNombre}.` : ''
                } Abrir su ficha.`}
                style={({ pressed }) => [
                  estilos.persona,
                  { borderTopColor: c.divider, borderTopWidth: i === 0 ? 0 : 1 },
                  { backgroundColor: pressed ? c.goldWash : 'transparent' },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]} numberOfLines={2}>
                    {nombre}
                  </Text>
                  <EtiquetaSemaforo color={p.color} etiqueta={palabra} />
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                    {[dias, p.grupoNombre].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Icon name="chevron" size={16} color={c.chevron} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {personas.length > PERSONAS_A_LA_VISTA ? (
        <BotonSecundario
          etiqueta={todas ? 'Ver menos' : `Ver ${personas.length - PERSONAS_A_LA_VISTA} más`}
          onPress={() => setTodas(v => !v)}
        />
      ) : null}

      {gruposSinLeer > 0 ? (
        <Text style={cuerpo}>
          {gruposSinLeer === 1
            ? 'No se pudo leer 1 grupo; puede faltar alguien en esta lista.'
            : `No se pudieron leer ${gruposSinLeer} grupos; puede faltar alguien en esta lista.`}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    flexWrap: 'wrap',
  },
  lista: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  persona: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12 },
});
