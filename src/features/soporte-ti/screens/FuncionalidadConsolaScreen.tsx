import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { FormField } from '../../../components/FormField';
import { Icon } from '../../../components/Icon';
import { InterruptorDeConsola } from '../components/InterruptorDeConsola';
import { Presionable } from '../../../components/Presionable';
import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { confirmar } from '../../admin/utils/dialogo';
import { mensajeDeFallo } from '../../admin/utils/mensajes';
import { etiquetaDeRol } from '../../admin/utils/rolesAsignables';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import { cambiarFuncionalidad, desbloquear } from '../api/soporteTiApi';
import type { FuncionalidadConsola } from '../api/soporteTiSchemas';
import { HojaDeContrasena } from '../components/HojaDeContrasena';
import {
  cambioDesde,
  esCambioCritico,
  estadoEnLaConsola,
  fechaYHora,
  faltaParaGuardar,
  formularioDesde,
  hayCambios,
  hora,
  LARGO_MAXIMO_DEL_AVISO,
  nombreDe,
  queHacerConElError,
  textoDelEstado,
  type FormularioDeFuncionalidad,
} from '../utils/consola';
import { textoDeDespliegueEnLaLista } from '../utils/despliegue';
import { Insignia } from './FuncionalidadesConsolaScreen';

/**
 * Una funcionalidad en la consola (spec 002, US1): prendida para todos (interruptor general) y por rol, el aviso que
 * verá la gente (≤ 200) y el motivo, obligatorio, que queda en la auditoría.
 *
 * - **Versión optimista**: el `PUT` lleva la versión que se leyó; si otro cambio llegó antes (409), se relee, se avisa
 *   y el formulario muestra lo nuevo conservando el motivo escrito.
 * - **Lo crítico pide la contraseña** (apagar para todos o tocar algo marcado crítico): un token de un solo uso en
 *   `X-Reautenticacion`. Si el servidor igual responde 428, se pide.
 * - **423**: la consola se bloqueó; se vuelve a la puerta.
 * - Errores en diálogo; lo guardado, en línea (`ConfirmacionEnLinea` y `tacto.logro`). Salir con cambios pregunta.
 */
export function FuncionalidadConsolaScreen({
  funcionalidad,
  todas,
  onGuardada,
  onReleer,
  onBloqueada,
  onAuditoria,
  onDespliegue,
  onVolver,
}: {
  funcionalidad: FuncionalidadConsola;
  todas: readonly FuncionalidadConsola[];
  onGuardada: (nueva: FuncionalidadConsola) => void;
  /** Relee el catálogo (después de un 409); la fila nueva llega por `funcionalidad`. */
  onReleer: () => Promise<FuncionalidadConsola[] | null>;
  onBloqueada: () => void;
  onAuditoria: (clave: string) => void;
  /** Fase 2: abre el despliegue progresivo de esta funcionalidad. */
  onDespliegue?: (clave: string) => void;
  onVolver: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const f = funcionalidad;
  const [formulario, setFormulario] = useState<FormularioDeFuncionalidad>(() => formularioDesde(f));
  const [faltaMotivo, setFaltaMotivo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [pidiendoContrasena, setPidiendoContrasena] = useState(false);
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null);
  const [confirmandoContrasena, setConfirmandoContrasena] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const cambiado = hayCambios(formulario, f);
  const scroll = useRef<ScrollView>(null);

  /* Llegó otra versión (guardado o releído tras un 409): el formulario parte de ella y conserva el motivo escrito. */
  const versionVista = useRef(f.version);
  useEffect(() => {
    if (versionVista.current === f.version) return;
    versionVista.current = f.version;
    setFormulario(actual => ({ ...formularioDesde(f), motivo: actual.motivo }));
  }, [f]);

  const salir = async () => {
    if (cambiado && !(await confirmar('¿Salir sin guardar?', 'Se pierden los cambios de esta funcionalidad.', { ok: 'Salir' }))) return;
    onVolver();
  };

  useSystemBackHandler(() => {
    void salir();
    return true;
  });

  const cambiar = <K extends keyof FormularioDeFuncionalidad>(campo: K, valor: FormularioDeFuncionalidad[K]) => {
    if (campo === 'motivo') setFaltaMotivo(false);
    setFormulario(actual => ({ ...actual, [campo]: valor }));
  };

  const guardar = async (reautenticacion?: string) => {
    const falta = faltaParaGuardar(formulario, f);
    if (falta) {
      tacto.error();
      if (!formulario.motivo.trim()) setFaltaMotivo(true);
      Alert.alert('Falta algo para guardar', falta);
      return;
    }
    if (!reautenticacion && esCambioCritico(formulario, f)) {
      setErrorContrasena(null);
      setPidiendoContrasena(true);
      return;
    }
    setOcupado(true);
    try {
      const nueva = await cambiarFuncionalidad(f.clave, cambioDesde(formulario, f), reautenticacion);
      versionVista.current = nueva.version;
      setFormulario(formularioDesde(nueva));
      onGuardada(nueva);
      tacto.logro();
      setConfirmacion({ clave: Date.now(), texto: 'Guardado. Rige en unos segundos para todos.' });
    } catch (e) {
      const que = queHacerConElError(e);
      if (que === 'desbloquear') {
        onBloqueada();
      } else if (que === 'reautenticar') {
        setErrorContrasena(null);
        setPidiendoContrasena(true);
      } else if (que === 'releer') {
        await onReleer();
        Alert.alert(
          'Alguien la cambió antes',
          'Mientras la editabas, esta funcionalidad cambió. Ya ves cómo quedó: revisa y vuelve a guardar (tu motivo sigue escrito).',
        );
      } else {
        Alert.alert('No se pudo guardar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
      }
    } finally {
      setOcupado(false);
    }
  };

  const confirmarConContrasena = async (contrasena: string) => {
    setConfirmandoContrasena(true);
    setErrorContrasena(null);
    try {
      const { token } = await desbloquear(contrasena, 'CAMBIO_CRITICO');
      setPidiendoContrasena(false);
      await guardar(token);
    } catch (e) {
      const que = queHacerConElError(e);
      tacto.error();
      if (que === 'contrasena_incorrecta') {
        setErrorContrasena('La contraseña no es correcta.');
        return;
      }
      setPidiendoContrasena(false);
      if (que === 'desbloquear') onBloqueada();
      else if (que === 'demasiados_intentos') Alert.alert('Demasiados intentos', 'Espera unos minutos y vuelve a intentarlo.');
      else Alert.alert('No se pudo confirmar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
    } finally {
      setConfirmandoContrasena(false);
    }
  };

  const estado = estadoEnLaConsola(f, todas);
  const roles = Object.keys(formulario.porRol);
  const ayuda = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }];
  const fuerte = [t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }];
  const quien = f.actualizadoPor?.nombre?.trim();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo={nombreDe(f)} subtitulo={textoDelEstado(estado)} onVolver={() => void salir()} />
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          paddingHorizontal: horizontalPadding,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 18,
        }}
      >
        <View style={{ gap: 6 }}>
          <View style={estilos.filaInsignias}>
            <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>{f.clave}</Text>
            {f.critica ? <Insignia texto="Crítica" /> : null}
          </View>
          {f.descripcion ? <Text style={ayuda}>{f.descripcion}</Text> : null}
          {f.critica ? <Text style={ayuda}>Al guardar te pide la contraseña y avisa a Administración y al Alquimista.</Text> : null}
          {f.actualizadoEn ? (
            <Text style={ayuda}>
              Último cambio: {fechaYHora(f.actualizadoEn)}
              {quien ? `, por ${quien}` : ''}.
            </Text>
          ) : null}
          {f.circuito?.estado?.toUpperCase() === 'ABIERTO' ? (
            <Text style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
              Apagada sola por fallas del proveedor
              {f.circuito.proximaPrueba ? `; prueba de nuevo a las ${hora(f.circuito.proximaPrueba)}` : ''}. Apagarla a mano
              la deja apagada aunque el proveedor vuelva.
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          <TituloDeSeccion>Para todos</TituloDeSeccion>
          <View style={[estilos.interruptor, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={fuerte}>Prendida para todos</Text>
              <Text style={ayuda}>{formulario.prendidaGlobal ? 'Cada rol, según lo de abajo.' : 'Nadie la usa: ven el aviso.'}</Text>
            </View>
            <InterruptorDeConsola etiqueta="Prendida para todos" valor={formulario.prendidaGlobal} onCambiar={v => cambiar('prendidaGlobal', v)} />
          </View>
        </View>

        {roles.length > 0 ? (
          <View style={{ gap: 10 }}>
            <TituloDeSeccion detalle={formulario.prendidaGlobal ? 'Apagarla para un rol no toca a los demás.' : 'Apagada para todos: lo de cada rol no cuenta hasta prenderla.'}>
              Por rol
            </TituloDeSeccion>
            {roles.map(rol => (
              <View key={rol} style={[estilos.interruptor, { backgroundColor: c.cardBg, borderColor: c.border, opacity: formulario.prendidaGlobal ? 1 : 0.6 }]}>
                <Text style={[...fuerte, { flex: 1, flexShrink: 1 }]}>{etiquetaDeRol(rol)}</Text>
                <InterruptorDeConsola
                  etiqueta={`Prendida para ${etiquetaDeRol(rol)}`}
                  valor={formulario.porRol[rol] !== false}
                  deshabilitado={!formulario.prendidaGlobal}
                  onCambiar={v => cambiar('porRol', { ...formulario.porRol, [rol]: v })}
                />
              </View>
            ))}
          </View>
        ) : null}

        {onDespliegue ? (
          <View style={{ gap: 10 }}>
            <TituloDeSeccion>Despliegue</TituloDeSeccion>
            <Presionable
              onPress={() =>
                void (async () => {
                  if (cambiado && !(await confirmar('¿Ir al despliegue sin guardar?', 'Se pierden los cambios de esta funcionalidad.', { ok: 'Ir' }))) return;
                  onDespliegue(f.clave);
                })()
              }
              accessibilityRole="button"
              accessibilityLabel={`Despliegue. ${textoDeDespliegueEnLaLista(f) ?? 'La tienen todos'}`}
              style={[estilos.interruptor, { backgroundColor: c.cardBg, borderColor: c.border }]}
            >
              <View style={{ flex: 1, flexShrink: 1 }}>
                <Text style={fuerte}>{textoDeDespliegueEnLaLista(f) ?? 'La tienen todos'}</Text>
                <Text style={ayuda}>Probadores, escalones (5 → 25 → 50 → 100 %) y las últimas 24 horas.</Text>
              </View>
              <Icon name="chevron" size={16} color={c.chevron} />
            </Presionable>
          </View>
        ) : null}

        <FormField
          label="Aviso"
          helperText={`Lo que verá la gente en su lugar. Vacío: «Esta función está en mantenimiento…». ${formulario.aviso.length} de ${LARGO_MAXIMO_DEL_AVISO}.`}
          value={formulario.aviso}
          onChangeText={v => cambiar('aviso', v.slice(0, LARGO_MAXIMO_DEL_AVISO))}
          maxLength={LARGO_MAXIMO_DEL_AVISO}
          placeholder="Ej.: El chat vuelve a las 18:00."
          multiline
          numberOfLines={3}
        />
        <FormField
          label="Motivo"
          helperText="Obligatorio. Queda en la auditoría."
          value={formulario.motivo}
          onChangeText={v => cambiar('motivo', v)}
          placeholder="Ej.: El proveedor de audio está caído."
          multiline
          numberOfLines={2}
          error={faltaMotivo ? 'Escribe el motivo del cambio.' : null}
        />

        <BotonPrincipal
          etiqueta={esCambioCritico(formulario, f) ? 'Guardar con contraseña' : 'Guardar'}
          onPress={() => void guardar()}
          cargando={ocupado}
          deshabilitado={!cambiado || ocupado}
        />
        {confirmacion ? <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} /> : null}
        <BotonSecundario
          etiqueta="Ver su historial"
          onPress={() =>
            void (async () => {
              if (cambiado && !(await confirmar('¿Ir al historial sin guardar?', 'Se pierden los cambios de esta funcionalidad.', { ok: 'Ir' }))) return;
              onAuditoria(f.clave);
            })()
          }
        />
      </ScrollView>

      <HojaDeContrasena
        visible={pidiendoContrasena}
        nombre={nombreDe(f)}
        error={errorContrasena}
        enviando={confirmandoContrasena}
        onConfirmar={contrasena => void confirmarConContrasena(contrasena)}
        onCerrar={() => setPidiendoContrasena(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  filaInsignias: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 56 },
});
