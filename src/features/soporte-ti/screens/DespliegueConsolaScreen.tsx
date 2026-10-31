import { fuentes } from '../../../theme/fuentes';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { FormField } from '../../../components/FormField';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ChipDeOpcion } from '../../admin/components/ChipDeOpcion';
import { confirmar } from '../../admin/utils/dialogo';
import { mensajeDeFallo } from '../../admin/utils/mensajes';
import { etiquetaDeRol } from '../../admin/utils/rolesAsignables';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import { ApiError } from '../../../services/http/apiClient';
import { buscarPersonas, cambiarDespliegue, desbloquear, leerDespliegue, quitarProbador, sumarProbador } from '../api/soporteTiApi';
import type { DespliegueApi, FuncionalidadConsola, PersonaBuscada, Probador } from '../api/soporteTiSchemas';
import { GraficoDeHoras } from '../components/GraficoDeHoras';
import { HojaDeContrasena } from '../components/HojaDeContrasena';
import { fechaYHora, nombreDe, queHacerConElError } from '../utils/consola';
import {
  cifra,
  CODIGO_DESPLIEGUE_SIN_CUENTA,
  esDesplegable,
  ESCALONES,
  TEXTO_SIN_CUENTA,
  esEscalonCritico,
  faltaParaElEscalon,
  horaCorta,
  horasDeMetricas,
  nombreDelEscalon,
  PARA_TODOS,
  porcentajeDeErrores,
  porcentajeVigente,
  resumenDelDespliegue,
  textoDelBotonDeEscalon,
  totales,
} from '../utils/despliegue';

/** Lo que la lista necesita saber después de un cambio (la insignia «En despliegue · 25 %»). */
export type ResumenDeDespliegue = { porcentaje: number; probadores: number } | null;

const ESPERA_DEL_BUSCADOR_MS = 350;

/**
 * El despliegue progresivo de una funcionalidad (spec 002, fase 2, US4; contrato `fase-2.md` §3.4): a quién le llega
 * y cómo le va. Decisión del dueño: «lista de probadores y luego porcentaje estable (5 → 25 → 50 → 100 %)», a mano.
 *
 * - **Escalón**: el porcentaje de ahora y los escalones para elegir (bajar uno es tocar el de al lado); «Para todos»
 *   termina el despliegue. Motivo obligatorio, como en la fase 1. Empezar uno, o bajar el de algo crítico, pide la
 *   contraseña (`X-Reautenticacion`, también ante un 428). Versión optimista: un 409 relee y avisa.
 * - **Probadores**: quienes la tienen siempre. Se buscan por nombre o correo (`GET /soporte-ti/personas`), se suman y se
 *   quitan. Solo con el despliegue empezado (el servidor responde 409 si no).
 * - **Últimas 24 h** (decisión P5): pedidos y errores 5xx dentro y fuera del despliegue, en dos gráficos de una escala
 *   cada uno, y la tabla por hora para quien no lee gráficos.
 *
 * Movimiento (`emil-design-eng`): nada se anima; los chips y el buscador se tocan seguido y cambian en el acto. Lo
 * guardado se confirma en línea (`ConfirmacionEnLinea` y `tacto.logro`); los errores, en diálogo.
 */
export function DespliegueConsolaScreen({
  funcionalidad,
  onCambiado,
  onBloqueada,
  onVolver,
}: {
  funcionalidad: FuncionalidadConsola;
  onCambiado: (resumen: ResumenDeDespliegue) => void;
  onBloqueada: () => void;
  onVolver: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const f = funcionalidad;
  const [despliegue, setDespliegue] = useState<DespliegueApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [faltaMotivo, setFaltaMotivo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [pidiendoContrasena, setPidiendoContrasena] = useState(false);
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null);
  const [confirmandoContrasena, setConfirmandoContrasena] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<PersonaBuscada[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [trabajandoCon, setTrabajandoCon] = useState<string | null>(null);
  const [verTabla, setVerTabla] = useState(false);
  const bloquear = useRef(onBloqueada);
  bloquear.current = onBloqueada;

  const actual = porcentajeVigente(despliegue);
  const probadores: Probador[] = despliegue?.probadores ?? [];
  const horas = horasDeMetricas(despliegue?.metricas);
  const enDespliegue = actual !== null;
  /* Lo que se usa sin cuenta (hoy, el alta pública) no se despliega: no se ofrece empezar (contrato §3.4). */
  const sinCuenta = !esDesplegable(despliegue) && !enDespliegue;
  const critico = elegido !== null && esEscalonCritico(f, actual, elegido);

  const avisarResumen = useCallback(
    (d: DespliegueApi) => {
      const p = porcentajeVigente(d);
      onCambiado(p === null ? null : { porcentaje: p, probadores: d.probadores?.length ?? 0 });
    },
    [onCambiado],
  );

  const recargar = useCallback(async (): Promise<DespliegueApi | null> => {
    setCargando(true);
    setFallo(null);
    try {
      const d = await leerDespliegue(f.clave);
      setDespliegue(d);
      return d;
    } catch (e) {
      if (queHacerConElError(e) === 'desbloquear') {
        bloquear.current();
        return null;
      }
      setFallo(mensajeDeFallo(e, 'No se pudo leer el despliegue.'));
      return null;
    } finally {
      setCargando(false);
    }
  }, [f.clave]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  /* El buscador de probadores: espera a que se deje de escribir y descarta respuestas de un texto viejo. */
  const textoPedido = useRef('');
  useEffect(() => {
    const texto = busqueda.trim();
    if (texto.length < 2) {
      textoPedido.current = '';
      setResultados(null);
      setBuscando(false);
      return;
    }
    const reloj = setTimeout(() => {
      textoPedido.current = texto;
      setBuscando(true);
      buscarPersonas(texto)
        .then(lista => {
          if (textoPedido.current === texto) setResultados(lista);
        })
        .catch(e => {
          if (queHacerConElError(e) === 'desbloquear') bloquear.current();
          else if (textoPedido.current === texto) setResultados([]);
        })
        .finally(() => {
          if (textoPedido.current === texto) setBuscando(false);
        });
    }, ESPERA_DEL_BUSCADOR_MS);
    return () => clearTimeout(reloj);
  }, [busqueda]);

  const salir = async () => {
    if (elegido !== null && motivo.trim() && !(await confirmar('¿Salir sin guardar?', 'No se cambia el escalón.', { ok: 'Salir' }))) return;
    onVolver();
  };
  useSystemBackHandler(() => {
    void salir();
    return true;
  });

  const guardarEscalon = async (reautenticacion?: string) => {
    const falta = faltaParaElEscalon(actual, elegido, motivo);
    if (falta || elegido === null) {
      tacto.error();
      if (!motivo.trim()) setFaltaMotivo(true);
      Alert.alert('Falta algo para guardar', falta ?? 'Elige un escalón.');
      return;
    }
    if (!reautenticacion && critico) {
      setErrorContrasena(null);
      setPidiendoContrasena(true);
      return;
    }
    setOcupado(true);
    try {
      const nuevo = await cambiarDespliegue(
        f.clave,
        { porcentaje: elegido, motivo: motivo.trim(), ...(typeof despliegue?.version === 'number' ? { version: despliegue.version } : {}) },
        reautenticacion,
      );
      // `porcentaje: 100` termina el despliegue: si el servidor no lo dice, se entiende así.
      const quedo: DespliegueApi = elegido >= PARA_TODOS ? { ...nuevo, enDespliegue: false, porcentaje: null, probadores: [] } : nuevo;
      setDespliegue(actualAnterior => ({ ...quedo, metricas: quedo.metricas ?? actualAnterior?.metricas }));
      avisarResumen(quedo);
      setElegido(null);
      setMotivo('');
      tacto.logro();
      setConfirmacion({
        clave: Date.now(),
        texto: elegido >= PARA_TODOS ? 'Listo: la tienen todos. Rige en unos segundos.' : `Listo: ${nombreDelEscalon(elegido)}. Rige en unos segundos.`,
      });
    } catch (e) {
      const que = queHacerConElError(e);
      if (e instanceof ApiError && e.status === 409 && e.codigo === CODIGO_DESPLIEGUE_SIN_CUENTA) {
        // No es una versión vieja: el servidor dice por qué no se puede. Se muestra su mensaje y se relee.
        await recargar();
        Alert.alert('No se puede desplegar', e.message || TEXTO_SIN_CUENTA);
      } else if (que === 'desbloquear') onBloqueada();
      else if (que === 'reautenticar') {
        setErrorContrasena(null);
        setPidiendoContrasena(true);
      } else if (que === 'releer') {
        await recargar();
        Alert.alert('Alguien lo cambió antes', 'Mientras lo mirabas, el despliegue cambió. Ya ves cómo quedó: revisa y vuelve a guardar (tu motivo sigue escrito).');
      } else Alert.alert('No se pudo guardar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
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
      await guardarEscalon(token);
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

  const sumar = async (persona: PersonaBuscada) => {
    setTrabajandoCon(persona.id);
    try {
      await sumarProbador(f.clave, persona.id);
      const d = await recargar();
      if (d) avisarResumen(d);
      tacto.logro();
      setConfirmacion({ clave: Date.now(), texto: `${persona.nombre?.trim() || 'La persona'} ya es probador.` });
      setBusqueda('');
    } catch (e) {
      const que = queHacerConElError(e);
      if (que === 'desbloquear') onBloqueada();
      else if (e instanceof ApiError && e.status === 409) Alert.alert('Todavía no está en despliegue', 'Empieza el despliegue (por ejemplo, «Solo probadores») y después suma probadores.');
      else if (e instanceof ApiError && e.status === 404) Alert.alert('No se encontró', 'Esa persona ya no está activa.');
      else Alert.alert('No se pudo sumar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
    } finally {
      setTrabajandoCon(null);
    }
  };

  const quitar = async (p: Probador) => {
    const nombre = p.nombre?.trim() || p.email || 'esta persona';
    if (!(await confirmar(`¿Quitar a ${nombre}?`, 'Deja de tenerla, salvo que el porcentaje le toque.', { ok: 'Quitar' }))) return;
    setTrabajandoCon(p.id);
    try {
      await quitarProbador(f.clave, p.id);
      const d = await recargar();
      if (d) avisarResumen(d);
      setConfirmacion({ clave: Date.now(), texto: `${nombre} ya no es probador.` });
    } catch (e) {
      if (queHacerConElError(e) === 'desbloquear') onBloqueada();
      else Alert.alert('No se pudo quitar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
    } finally {
      setTrabajandoCon(null);
    }
  };

  const ayuda = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }];
  const fuerte = [t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }];
  const quien = despliegue?.actualizadoPor?.nombre?.trim();
  const yaSonProbadores = new Set(probadores.map(p => p.id));
  const encontrados = (resultados ?? []).filter(p => !yaSonProbadores.has(p.id));
  const dentro = totales(horas, 'dentro');
  const fuera = totales(horas, 'fuera');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Despliegue" subtitulo={nombreDe(f)} onVolver={() => void salir()} />
      <ScrollView
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
        {cargando && !despliegue ? <Text style={ayuda}>Cargando el despliegue…</Text> : null}
        {!cargando && fallo && !despliegue ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {fallo}
            </Text>
            <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />
          </View>
        ) : null}

        {despliegue ? (
          <>
            <View
              accessible
              accessibilityLabel={`Ahora: ${actual === null ? 'la tienen todos' : nombreDelEscalon(actual)}. ${resumenDelDespliegue(actual, probadores.length)}`}
              style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}
            >
              <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>Ahora</Text>
              <Text style={[estilos.cifraGrande, { color: c.textStrong }]}>{actual === null ? 'Para todos' : nombreDelEscalon(actual)}</Text>
              <Text style={ayuda}>{resumenDelDespliegue(actual, probadores.length)}</Text>
              {despliegue.actualizadoEn ? (
                <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>
                  Último cambio: {fechaYHora(despliegue.actualizadoEn)}
                  {quien ? `, por ${quien}` : ''}.
                </Text>
              ) : null}
            </View>

            <View style={{ gap: 10 }}>
              <TituloDeSeccion detalle="5 → 25 → 50 → 100 %. Cada persona cae siempre en el mismo grupo: subir no saca a nadie.">
                Escalón
              </TituloDeSeccion>
              {sinCuenta ? <Text style={ayuda}>{TEXTO_SIN_CUENTA}</Text> : null}
              {sinCuenta ? null : (
              <View accessibilityRole="radiogroup" accessibilityLabel="Escalón del despliegue" style={estilos.chips}>
                {ESCALONES.map(e => {
                  const esElDeAhora = (actual ?? PARA_TODOS) === e;
                  return (
                    <ChipDeOpcion
                      key={e}
                      etiqueta={esElDeAhora ? `${nombreDelEscalon(e)} · ahora` : nombreDelEscalon(e)}
                      activo={elegido === null ? esElDeAhora : elegido === e}
                      deshabilitado={ocupado}
                      onPress={() => {
                        tacto.seleccion();
                        setElegido(esElDeAhora ? null : e);
                      }}
                    />
                  );
                })}
              </View>
              )}
              {critico ? (
                <Text style={ayuda}>
                  {elegido === 0 && !enDespliegue
                    ? 'Empezar solo con probadores la esconde para todos los demás: te pide la contraseña.'
                    : 'Es una funcionalidad crítica: te pide la contraseña.'}
                </Text>
              ) : null}
              {elegido !== null ? (
                <>
                  <FormField
                    label="Motivo"
                    helperText="Obligatorio. Queda en la auditoría."
                    value={motivo}
                    onChangeText={v => {
                      setFaltaMotivo(false);
                      setMotivo(v);
                    }}
                    placeholder="Ej.: Sin errores en las últimas 24 horas."
                    testID="campo-motivo-despliegue"
                    multiline
                    numberOfLines={2}
                    error={faltaMotivo ? 'Escribe el motivo del cambio.' : null}
                  />
                  <BotonPrincipal
                    etiqueta={`${textoDelBotonDeEscalon(actual, elegido)}${critico ? ' con contraseña' : ''}`}
                    onPress={() => void guardarEscalon()}
                    cargando={ocupado}
                    deshabilitado={ocupado}
                  />
                </>
              ) : null}
              {confirmacion ? <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} /> : null}
            </View>

            {sinCuenta ? null : (
            <View style={{ gap: 10 }}>
              <TituloDeSeccion detalle="La tienen siempre, aunque el porcentaje no les toque.">{`Probadores (${probadores.length})`}</TituloDeSeccion>
              {probadores.map(p => (
                <View key={p.id} style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text style={fuerte} numberOfLines={1}>
                      {p.nombre?.trim() || 'Sin nombre'}
                    </Text>
                    {p.email ? (
                      <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]} numberOfLines={1}>
                        {p.email}
                      </Text>
                    ) : null}
                  </View>
                  <Presionable
                    onPress={() => void quitar(p)}
                    disabled={trabajandoCon !== null}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar a ${p.nombre?.trim() || p.email || 'esta persona'} de los probadores`}
                    hitSlop={4}
                    style={estilos.botonIcono}
                  >
                    <Icon name="trash" size={TAMANO_ICONO.normal} color={c.danger} />
                  </Presionable>
                </View>
              ))}
              {enDespliegue ? (
                <>
                  <View style={[estilos.buscador, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                    <Icon name="search" size={TAMANO_ICONO.normal} color={c.textSoft} />
                    <TextInput
                      value={busqueda}
                      onChangeText={setBusqueda}
                      placeholder="Sumar: busca por nombre o correo"
                      placeholderTextColor={c.textSoft}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Buscar una persona para sumarla como probador"
                      style={[t.body, estilos.campo, { color: c.text }]}
                    />
                  </View>
                  {buscando ? <Text style={ayuda}>Buscando…</Text> : null}
                  {!buscando && resultados !== null && encontrados.length === 0 ? (
                    <Text style={ayuda}>Nadie coincide con «{busqueda.trim()}».</Text>
                  ) : null}
                  {encontrados.map(p => (
                    <View key={p.id} style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                      <View style={{ flex: 1, flexShrink: 1 }}>
                        <Text style={fuerte} numberOfLines={1}>
                          {p.nombre?.trim() || 'Sin nombre'}
                        </Text>
                        <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]} numberOfLines={1}>
                          {[p.email, p.rol ? etiquetaDeRol(p.rol) : null].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Presionable
                        onPress={() => void sumar(p)}
                        disabled={trabajandoCon !== null}
                        accessibilityRole="button"
                        accessibilityLabel={`Sumar a ${p.nombre?.trim() || p.email || 'esta persona'} como probador`}
                        style={[estilos.botonTexto, { borderColor: c.gold, backgroundColor: c.goldWash }]}
                      >
                        <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: fuentes.media }]}>
                          {trabajandoCon === p.id ? 'Sumando…' : 'Sumar'}
                        </Text>
                      </Presionable>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={ayuda}>Para sumar probadores, primero empieza el despliegue (por ejemplo, «Solo probadores»).</Text>
              )}
            </View>
            )}

            <View style={{ gap: 10 }}>
              <TituloDeSeccion detalle="Pedidos y errores del servidor, por hora, de quienes la tienen y de quienes no.">
                Últimas 24 horas
              </TituloDeSeccion>
              {horas.length === 0 ? (
                <Text style={ayuda}>{enDespliegue ? 'Todavía no hay pedidos registrados.' : 'Las métricas se cuentan mientras está en despliegue.'}</Text>
              ) : (
                <>
                  <View style={estilos.cifras}>
                    <TarjetaDeCifras titulo="Dentro" pedidos={dentro.pedidos} errores={porcentajeDeErrores(dentro.porcentajeDeErrores)} />
                    <TarjetaDeCifras titulo="Fuera" pedidos={fuera.pedidos} errores={porcentajeDeErrores(fuera.porcentajeDeErrores)} />
                  </View>
                  <GraficoDeHoras titulo="Pedidos por hora" horas={horas} medida="pedidos" />
                  <GraficoDeHoras titulo="Errores por hora (5xx)" horas={horas} medida="errores" />
                  <BotonSecundario etiqueta={verTabla ? 'Ocultar la tabla' : 'Ver por hora'} onPress={() => setVerTabla(v => !v)} />
                  {verTabla ? (
                    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 6 }]}>
                      <View style={estilos.filaTabla}>
                        {['Hora', 'Dentro', 'Fuera'].map(encabezado => (
                          <Text key={encabezado} style={[t.small, estilos.celda, { color: c.textSoft, fontFamily: fuentes.negrita, fontSize: 13 }]}>
                            {encabezado}
                          </Text>
                        ))}
                      </View>
                      {horas.map(h => (
                        <View
                          key={h.hora}
                          style={estilos.filaTabla}
                          accessible
                          accessibilityLabel={`${horaCorta(h.hora)}: dentro ${h.dentro.pedidos} pedidos y ${h.dentro.errores} errores; fuera ${h.fuera.pedidos} pedidos y ${h.fuera.errores} errores`}
                        >
                          <Text style={[t.small, estilos.celda, estilos.numero, { color: c.text }]}>{horaCorta(h.hora)}</Text>
                          <Text style={[t.small, estilos.celda, estilos.numero, { color: c.text }]}>
                            {cifra(h.dentro.pedidos)} · {cifra(h.dentro.errores)}
                          </Text>
                          <Text style={[t.small, estilos.celda, estilos.numero, { color: c.text }]}>
                            {cifra(h.fuera.pedidos)} · {cifra(h.fuera.errores)}
                          </Text>
                        </View>
                      ))}
                      <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>Cada celda: pedidos · errores.</Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <HojaDeContrasena
        visible={pidiendoContrasena}
        nombre={nombreDe(f)}
        explicacion="Es un cambio crítico del despliegue: empezarlo, empezarlo solo con probadores o bajarle el porcentaje a una función crítica. Se avisa por push."
        error={errorContrasena}
        enviando={confirmandoContrasena}
        onConfirmar={contrasena => void confirmarConContrasena(contrasena)}
        onCerrar={() => setPidiendoContrasena(false)}
      />
    </SafeAreaView>
  );
}

/** Una cifra de las 24 h (skill `dataviz`, «stat tile»): el rótulo, los pedidos y el porcentaje de errores. */
function TarjetaDeCifras({ titulo, pedidos, errores }: { titulo: string; pedidos: number; errores: string }) {
  const { c, t } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${titulo} del despliegue: ${cifra(pedidos)} pedidos, ${errores} de errores`}
      style={[estilos.tarjeta, estilos.cifra, { backgroundColor: c.cardBg, borderColor: c.border }]}
    >
      <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>{titulo}</Text>
      <Text style={[estilos.valor, { color: c.textStrong }]}>{cifra(pedidos)}</Text>
      <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>pedidos · {errores} errores</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  cifraGrande: { fontFamily: fuentes.negrita, fontSize: 30, lineHeight: 36 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, minHeight: 56 },
  botonIcono: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 48 },
  campo: { flex: 1, fontSize: 16, paddingVertical: 10 },
  cifras: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  cifra: { flexGrow: 1, flexBasis: 140 },
  valor: { fontFamily: fuentes.negrita, fontSize: 24, lineHeight: 30 },
  filaTabla: { flexDirection: 'row', gap: 8 },
  celda: { flex: 1, fontSize: 13 },
  numero: { fontVariant: ['tabular-nums'] },
});
