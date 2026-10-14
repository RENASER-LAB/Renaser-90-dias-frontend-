import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { TituloDeSeccion } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { ApiError } from '../../../services/http/apiClient';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { useAuth } from '../../auth/context/AuthContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { mensajeDeFallo } from '../../admin/utils/mensajes';
import { etiquetaDeRol } from '../../admin/utils/rolesAsignables';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import type { RolPersonalizadoConsola } from '../api/soporteTiSchemas';
import { queHacerConElError } from '../utils/consola';
import { rolesActivos, ROLES_BASE } from '../utils/roles';
import type { EleccionVerComo } from '../verComo/verComoApi';

type Opcion = { clave: string; titulo: string; detalle: string | null; eleccion: EleccionVerComo };

/** Las opciones de «Ver como» (contrato §5, decisión P4): los seis roles base y los personalizados activos. */
export function opcionesDeVerComo(roles: readonly RolPersonalizadoConsola[] | null): { base: Opcion[]; personalizados: Opcion[] } {
  return {
    base: ROLES_BASE.map(r => ({ clave: r.clave, titulo: r.etiqueta, detalle: null, eleccion: { rol: r.clave } })),
    personalizados: rolesActivos(roles ?? []).map(r => ({
      clave: `rp:${r.id}`,
      titulo: r.nombre,
      detalle: `Hereda de ${etiquetaDeRol(r.rolBase)}`,
      eleccion: { rolPersonalizadoId: r.id },
    })),
  };
}

/**
 * «Ver como» (spec 002, fase 2, US5; contrato `fase-2.md` §5; decisiones P2 y P4 del dueño): elegir un rol —los seis
 * base, sin Soporte TI, y los personalizados activos— y recorrer la app como la ve, con una **cuenta de prueba** y en
 * **solo lectura**. La sesión de Soporte TI se guarda aparte; arriba queda la franja «Viendo como Mentor · Salir».
 */
export function VerComoConsolaScreen({
  roles,
  onBloqueada,
  onVolver,
}: {
  roles: RolPersonalizadoConsola[] | null;
  onBloqueada: () => void;
  onVolver: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { entrarAVerComo } = useAuth();
  const [entrandoCon, setEntrandoCon] = useState<string | null>(null);

  useSystemBackHandler(() => {
    if (!entrandoCon) onVolver();
    return true;
  });

  const { base, personalizados } = opcionesDeVerComo(roles);

  const entrar = async (opcion: Opcion) => {
    if (entrandoCon) return;
    setEntrandoCon(opcion.clave);
    try {
      await entrarAVerComo(opcion.eleccion, opcion.titulo);
      tacto.logro();
      // La app se vuelve a armar como la ve ese rol: esta pantalla se desmonta sola.
    } catch (e) {
      tacto.error();
      if (queHacerConElError(e) === 'desbloquear') onBloqueada();
      else if (e instanceof ApiError && e.status === 404) Alert.alert('Todavía no está disponible', 'El servidor todavía no tiene «Ver como».');
      else Alert.alert('No se pudo entrar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
      setEntrandoCon(null);
    }
  };

  const ayuda = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Ver como" subtitulo="Solo lectura" onVolver={onVolver} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          paddingHorizontal: horizontalPadding,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 14,
        }}
      >
        <View style={estilos.fila}>
          <View style={[estilos.baldosa, { backgroundColor: c.goldWash }]}>
            <Icon name="eye" size={TAMANO_ICONO.grande} color={c.goldInk} />
          </View>
          <Text style={[ayuda, { flex: 1 }]}>
            Entras con una cuenta de prueba de ese rol: ves la app como la ve, pero no se guarda nada. Para volver, toca «Salir»
            en la franja de arriba. Dura 30 minutos.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <TituloDeSeccion>Roles base</TituloDeSeccion>
          {base.map(o => (
            <FilaDeOpcion key={o.clave} opcion={o} entrando={entrandoCon === o.clave} deshabilitada={entrandoCon !== null} onPress={() => void entrar(o)} />
          ))}
        </View>

        {personalizados.length > 0 ? (
          <View style={{ gap: 8 }}>
            <TituloDeSeccion>Roles personalizados</TituloDeSeccion>
            {personalizados.map(o => (
              <FilaDeOpcion key={o.clave} opcion={o} entrando={entrandoCon === o.clave} deshabilitada={entrandoCon !== null} onPress={() => void entrar(o)} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaDeOpcion({ opcion, entrando, deshabilitada, onPress }: { opcion: Opcion; entrando: boolean; deshabilitada: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      disabled={deshabilitada}
      accessibilityRole="button"
      accessibilityLabel={`Ver como ${opcion.titulo}`}
      accessibilityState={{ disabled: deshabilitada, busy: entrando }}
      style={[estilos.opcion, { backgroundColor: c.cardBg, borderColor: entrando ? c.gold : c.border, opacity: deshabilitada && !entrando ? 0.55 : 1 }]}
    >
      <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>{opcion.titulo}</Text>
        {opcion.detalle ? <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>{opcion.detalle}</Text> : null}
      </View>
      {entrando ? (
        <Text style={[t.small, { color: c.goldInk, fontSize: 13 }]}>Entrando…</Text>
      ) : (
        <Icon name="chevron" size={16} color={c.chevron} />
      )}
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  baldosa: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 56 },
});
