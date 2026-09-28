import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonPeligro, BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { confirmar } from '../../admin/utils/dialogo';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import {
  ejecutarAccion,
  guardarChecklist,
  marcarEntregada,
  marcarEnviada,
  reportarProblema,
  type MotivoDeProblema,
} from '../api/cajaApi';
import type { DetalleDeCaja } from '../api/cajaSchemas';
import { CartaDeLaCaja } from '../components/CartaDeLaCaja';
import { ImagenDeLaCaja } from '../components/ImagenDeLaCaja';
import {
  ChecklistDeLaCaja,
  DatosDelEnvioHecho,
  DestinoDeLaCaja,
  FormularioDelEnvio,
  HistorialDeLaCaja,
  Titulo,
} from '../components/PartesDelDetalle';
import { useDetalleDeCaja } from '../hooks/useDetalleDeCaja';
import { alternarMarcado } from '../utils/contenidoYDestino';
import {
  ETIQUETA_DE_ACCION,
  FORMULARIO_VACIO,
  MOTIVOS_DE_PROBLEMA,
  accionesDelEstado,
  costoDelTexto,
  etiquetaDelEstado,
  faltaSegunElServidor,
  queFaltaParaEnviar,
  seEstaArmando,
  textoDeLoQueFalta,
  type AccionDeCaja,
  type FormularioDeEnvio,
} from '../utils/estadosDeCaja';

/** Lo que pregunta cada acción antes de hacerse: todas cambian lo que ve el aprendiz. */
const CONFIRMACION: Record<Exclude<AccionDeCaja, 'problema'>, { titulo: string; mensaje?: string }> = {
  aprobar: { titulo: '¿Aprobar para la caja?' },
  armar: { titulo: '¿Empezar a armar?' },
  enviar: { titulo: '¿Marcar enviada?' },
  entregada: { titulo: '¿Marcar entregada?' },
  previa: { titulo: '¿Ya se envió antes?', mensaje: 'Queda entregada. No se le avisa.' },
  reenviar: { titulo: '¿Reenviar?', mensaje: 'Vuelve a «Armando» como un envío nuevo.' },
};

/**
 * El detalle de una caja (spec §7): los botones del estado arriba, y debajo dónde enviarla, el
 * contenido, la foto, el envío, la carta y el historial. Cada botón hace una sola cosa; si el
 * servidor no la acepta (409: falta algo o el estado cambió), se muestra su motivo corto.
 */
export function CajaDetalleScreen({ aprendizId, onVolver }: { aprendizId: string; onVolver: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { detalle, cargando, fallo, recargar, actualizar } = useDetalleDeCaja(aprendizId);
  const [formulario, setFormulario] = useState<FormularioDeEnvio>(FORMULARIO_VACIO);
  const [haciendo, setHaciendo] = useState<AccionDeCaja | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportando, setReportando] = useState(false);

  useSystemBackHandler(() => {
    if (reportando) setReportando(false);
    else onVolver();
    return true;
  });

  // Lo que ya tenga guardado el envío (un reenvío, otra pestaña) llena el formulario una vez.
  const envioGuardado = detalle?.envioDatos;
  useEffect(() => {
    if (!envioGuardado) return;
    setFormulario(f =>
      f === FORMULARIO_VACIO
        ? {
            medio: envioGuardado.medio ?? '',
            courier: envioGuardado.courier ?? '',
            codigo: envioGuardado.codigo ?? '',
            costo: envioGuardado.costo != null ? String(envioGuardado.costo) : '',
          }
        : f,
    );
  }, [envioGuardado]);

  const operar = async (accion: AccionDeCaja, hacer: () => Promise<DetalleDeCaja>) => {
    setHaciendo(accion);
    setError(null);
    try {
      actualizar(await hacer());
      setReportando(false);
    } catch (e) {
      setError(faltaSegunElServidor(e) ?? mensajeDeError(e, 'No se pudo. Vuelve a intentar.'));
      // Un 409 dice que el estado cambió o que falta algo: se relee para que la pantalla lo muestre.
      if ((e as { status?: number } | null)?.status === 409) void recargar();
    } finally {
      setHaciendo(null);
    }
  };

  const tocar = async (accion: AccionDeCaja) => {
    if (accion === 'problema') {
      setReportando(true);
      return;
    }
    const pregunta = CONFIRMACION[accion];
    if (!(await confirmar(pregunta.titulo, pregunta.mensaje, { ok: 'Sí' }))) return;
    if (accion === 'enviar') {
      const costo = costoDelTexto(formulario.costo);
      void operar(accion, () =>
        marcarEnviada(aprendizId, {
          medio: formulario.medio.trim(),
          courier: formulario.courier.trim() || null,
          codigo: formulario.codigo.trim(),
          costo: typeof costo === 'number' ? costo : null,
        }),
      );
    } else if (accion === 'entregada' || accion === 'previa') {
      void operar(accion, () => marcarEntregada(aprendizId, accion === 'previa'));
    } else {
      void operar(accion, () => ejecutarAccion(aprendizId, accion));
    }
  };

  const alternar = (valor: string) => {
    if (!detalle?.contenido) return;
    const marcados = alternarMarcado(detalle.contenido, valor);
    // Se ve marcado enseguida; si el servidor no lo guarda, vuelve a lo que diga el servidor.
    actualizar({ ...detalle, contenido: detalle.contenido.map(e => ({ ...e, marcado: marcados.includes(e.valor) })) });
    guardarChecklist(aprendizId, marcados).then(actualizar, e => {
      setError(mensajeDeError(e, 'No se guardó el contenido.'));
      void recargar();
    });
  };

  const nombre = detalle?.nombre?.trim() || 'Caja Renaser';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo={nombre}
        subtitulo={detalle ? subtituloDe(detalle) : null}
        onVolver={reportando ? () => setReportando(false) : onVolver}
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
          gap: 22,
        }}
      >
        {cargando && !detalle ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Cargando…</Text> : null}
        {fallo && !detalle ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
              {fallo === 'sin_permiso'
                ? 'Solo Administración puede ver la Caja Renaser.'
                : fallo === 'sin_red'
                  ? 'Sin conexión con el servidor.'
                  : 'No se pudo cargar la caja.'}
            </Text>
            {fallo !== 'sin_permiso' ? <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} /> : null}
          </View>
        ) : null}

        {detalle ? (
          <>
            {error ? (
              <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
                {error}
              </Text>
            ) : null}

            {reportando ? (
              <ReportarProblema
                enviando={haciendo === 'problema'}
                onCancelar={() => setReportando(false)}
                onEnviar={problema => void operar('problema', () => reportarProblema(aprendizId, problema))}
              />
            ) : (
              <Acciones detalle={detalle} formulario={formulario} haciendo={haciendo} onTocar={accion => void tocar(accion)} />
            )}

            <DestinoDeLaCaja destino={detalle.destino} />
            <ChecklistDeLaCaja
              contenido={detalle.contenido ?? []}
              editable={seEstaArmando(detalle.estado)}
              onAlternar={alternar}
            />
            <ImagenDeLaCaja
              aprendizId={aprendizId}
              cual="foto"
              titulo="Foto de la caja"
              url={detalle.fotoArmadaUrl}
              editable={seEstaArmando(detalle.estado)}
              onCambio={actualizar}
            />
            {seEstaArmando(detalle.estado) ? (
              <FormularioDelEnvio valor={formulario} onCambio={setFormulario} />
            ) : (
              <DatosDelEnvioHecho envio={detalle.envioDatos} />
            )}
            <ImagenDeLaCaja
              aprendizId={aprendizId}
              cual="comprobante"
              titulo="Comprobante"
              url={detalle.comprobanteUrl}
              editable={seEstaArmando(detalle.estado)}
              onCambio={actualizar}
            />
            <CartaDeLaCaja aprendizId={aprendizId} nombre={detalle.nombre} />
            <HistorialDeLaCaja historial={detalle.historial} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** «Armando · Fase 1: 85 %» (y «Envío 2» si es un reenvío). */
function subtituloDe(detalle: DetalleDeCaja): string {
  return [
    etiquetaDelEstado(detalle.estado),
    detalle.envio && detalle.envio > 1 ? `Envío ${detalle.envio}` : null,
    detalle.cumplimientoFase1 != null ? `Fase 1: ${Math.round(detalle.cumplimientoFase1)} %` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Acciones({
  detalle,
  formulario,
  haciendo,
  onTocar,
}: {
  detalle: DetalleDeCaja;
  formulario: FormularioDeEnvio;
  haciendo: AccionDeCaja | null;
  onTocar: (accion: AccionDeCaja) => void;
}) {
  const { c, t } = useTheme();
  const { principal, secundarias } = accionesDelEstado(detalle.estado);
  if (!principal && secundarias.length === 0) return null;
  const falta = principal === 'enviar' ? textoDeLoQueFalta(queFaltaParaEnviar(detalle, formulario)) : null;
  const ocupado = haciendo !== null;
  return (
    <View style={{ gap: 10 }}>
      {principal ? (
        <BotonPrincipal
          etiqueta={ETIQUETA_DE_ACCION[principal]}
          onPress={() => onTocar(principal)}
          cargando={haciendo === principal}
          deshabilitado={ocupado || !!falta}
          accessibilityLabel={falta ? `${ETIQUETA_DE_ACCION[principal]}. ${falta}` : undefined}
        />
      ) : null}
      {falta ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{falta}</Text> : null}
      {secundarias.map(accion =>
        accion === 'problema' ? (
          <BotonPeligro key={accion} etiqueta={ETIQUETA_DE_ACCION[accion]} onPress={() => onTocar(accion)} deshabilitado={ocupado} />
        ) : (
          <BotonSecundario
            key={accion}
            etiqueta={ETIQUETA_DE_ACCION[accion]}
            onPress={() => onTocar(accion)}
            cargando={haciendo === accion}
            deshabilitado={ocupado}
          />
        ),
      )}
    </View>
  );
}

function ReportarProblema({
  enviando,
  onCancelar,
  onEnviar,
}: {
  enviando: boolean;
  onCancelar: () => void;
  onEnviar: (problema: { motivo: MotivoDeProblema; nota: string }) => void;
}) {
  const { c, t } = useTheme();
  const [motivo, setMotivo] = useState<MotivoDeProblema | null>(null);
  const [nota, setNota] = useState('');
  return (
    <View style={[estilos.problema, { borderColor: c.danger, backgroundColor: c.dangerWash }]}>
      <Titulo>¿Qué pasó?</Titulo>
      <View style={estilos.motivos}>
        {MOTIVOS_DE_PROBLEMA.map(m => {
          const elegido = motivo === m.valor;
          return (
            <Pressable
              key={m.valor}
              onPress={() => setMotivo(m.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: elegido }}
              style={[estilos.motivo, { borderColor: elegido ? c.danger : c.border, backgroundColor: c.cardBg }]}
            >
              <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: elegido ? 'Jost_700Bold' : 'Jost_400Regular' }]}>
                {m.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={nota}
        onChangeText={setNota}
        placeholder="Nota"
        placeholderTextColor={c.micro}
        multiline
        accessibilityLabel="Nota"
        style={[t.body, estilos.nota, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
      />
      <BotonPeligro
        etiqueta="Reportar"
        onPress={() => motivo && onEnviar({ motivo, nota: nota.trim() })}
        cargando={enviando}
        deshabilitado={!motivo}
      />
      <BotonSecundario etiqueta="Cancelar" onPress={onCancelar} deshabilitado={enviando} />
    </View>
  );
}

const estilos = StyleSheet.create({
  problema: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 12 },
  motivos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motivo: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, justifyContent: 'center' },
  nota: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 80, fontSize: 17, textAlignVertical: 'top' },
});
