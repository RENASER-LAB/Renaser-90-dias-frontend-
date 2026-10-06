import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { dark, light } from '../../../theme/tokens';
import { tacto } from '../../../utils/tacto';
import { almacenamientoSinConfigurar, subirImagenAS3 } from '../../community/api/wallApi';
import { FASES_EN_ORDEN } from '../../home/hooks/useResumenHome';
import { TarjetaDeFase } from '../../yo/components/TarjetaDeFase';
import { ANIMAL_DE_FASE } from '../../yo/data/animalesDeFase';
import { animalConfigurado } from '../../yo/utils/animalConfigurado';
import { DIAS_DEL_PROGRAMA } from '../../home/hooks/useResumenHome';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import {
  cambiarNombreDelAnimal,
  confirmarImagenDeFase,
  restaurarImagenDeFase,
  solicitarSubidaDeImagenDeFase,
} from '../api/animalesDeFaseAdminApi';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import type { useAnimalesDeFaseAdmin } from '../hooks/useAnimalesDeFaseAdmin';
import {
  hayCambiosParaGuardar,
  mensajeDeErrorDeAnimales,
  SIN_ALMACENAMIENTO_DE_ANIMALES,
} from '../utils/animalesDeFase';
import { confirmar } from '../utils/dialogo';
import { ejemploDeLaTarjetaDeFase } from '../utils/ejemploDeLaTarjetaDeFase';
import { elegirImagenDeAnimal } from '../utils/elegirImagenDeAnimal';
import { motivoDeRechazoDeLaImagen, RECOMENDACION_DE_IMAGEN, type ImagenElegida } from '../utils/imagenDeAnimal';

const LARGO_MAXIMO_DEL_NOMBRE = 24;

/**
 * Cambiar el animal de una fase, con la vista previa de la tarjeta de Yo tal como la verá el aprendiz,
 * en claro y en oscuro (la misma `TarjetaDeFase`, con la imagen y el nombre que se están eligiendo).
 *
 * Nada queda vigente hasta «Guardar». La imagen elegida se revisa acá (tipo, peso, medidas) y otra vez
 * en el servidor al confirmar; si el servidor la rechaza se dice con sus palabras y se puede elegir otra.
 */
export function AnimalDeFaseDetalleScreen({
  numero,
  estado,
  onVolver,
}: {
  numero: number;
  estado: ReturnType<typeof useAnimalesDeFaseAdmin>;
  onVolver: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const fase = FASES_EN_ORDEN.find(f => f.numero === numero);
  const ejemplo = useMemo(() => ejemploDeLaTarjetaDeFase(numero), [numero]);
  const vigente = estado.animales?.find(a => a.fase === numero);
  const [elegida, setElegida] = useState<ImagenElegida | null>(null);
  const [nombre, setNombre] = useState(vigente?.nombre ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });
  // El nombre vigente llega después de la carga: se copia una vez, sin pisar lo que se esté escribiendo.
  const [nombreCopiado, setNombreCopiado] = useState(false);
  useEffect(() => {
    if (vigente && !nombreCopiado) {
      setNombre(vigente.nombre ?? '');
      setNombreCopiado(true);
    }
  }, [vigente, nombreCopiado]);

  if (!fase || !ejemplo) return null;
  const porDefecto = ANIMAL_DE_FASE[fase.clave];
  const configurado = animalConfigurado(porDefecto, vigente);
  const animalDeLaVista = {
    nombre: nombre.trim() || porDefecto.nombre,
    imagen: elegida ? { uri: elegida.uri } : configurado.imagen,
    imagenDeRespaldo: porDefecto.imagen,
  };
  const ocupado = guardando || restaurando;
  const hayCambios = hayCambiosParaGuardar(vigente, elegida !== null, nombre);
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  const avisarListo = (texto: string) => {
    tacto.logro();
    setConfirmacion({ clave: Date.now(), texto });
  };

  const elegir = async () => {
    setError(null);
    const imagen = await elegirImagenDeAnimal();
    if (!imagen) return;
    const motivo = motivoDeRechazoDeLaImagen(imagen);
    if (motivo) {
      setElegida(null);
      setError(motivo);
      return;
    }
    setElegida(imagen);
  };

  const subirLaElegida = async (imagen: ImagenElegida) => {
    const subida = await solicitarSubidaDeImagenDeFase(numero, imagen.mimeType);
    if (almacenamientoSinConfigurar(subida.url)) throw new Error(SIN_ALMACENAMIENTO_DE_ANIMALES);
    await subirImagenAS3(subida.url, imagen.uri, imagen.mimeType);
    return confirmarImagenDeFase(numero, subida.ruta);
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      let nuevos = estado.animales ?? [];
      if (elegida) nuevos = await subirLaElegida(elegida);
      if (nombre.trim() !== (vigente?.nombre ?? '').trim()) nuevos = await cambiarNombreDelAnimal(numero, nombre);
      estado.actualizar(nuevos);
      setElegida(null);
      avisarListo('Listo: la fase quedó con los cambios.');
    } catch (e) {
      setError(mensajeDeErrorDeAnimales(e, 'No se pudo guardar. Vuelve a intentar.'));
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = async () => {
    const acepto = await confirmar(
      '¿Volver a la imagen por defecto?',
      `La fase ${numero} vuelve a mostrar la imagen que trae la app.`,
      { ok: 'Sí, restaurar' },
    );
    if (!acepto) return;
    setRestaurando(true);
    setError(null);
    try {
      estado.actualizar(await restaurarImagenDeFase(numero));
      setElegida(null);
      avisarListo('Listo: volvió la imagen por defecto.');
    } catch (e) {
      setError(mensajeDeErrorDeAnimales(e, 'No se pudo restaurar la imagen. Vuelve a intentar.'));
    } finally {
      setRestaurando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo={`Fase ${numero} · ${porDefecto.nombre}`} subtitulo={fase.nombre} onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 16,
        }}
      >
        <TituloDeSeccion detalle={`Así la verá el aprendiz. Todavía no se usa hasta que guardes.`}>
          Vista previa
        </TituloDeSeccion>
        <VistaPrevia etiqueta="Claro" paleta={light} ejemplo={ejemplo} animal={animalDeLaVista} />
        <VistaPrevia etiqueta="Oscuro" paleta={dark} ejemplo={ejemplo} animal={animalDeLaVista} />

        <View style={{ gap: 8 }}>
          <Text style={[estilos.rotulo, { color: c.textStrong }]}>Nombre del animal</Text>
          <TextInput
            value={nombre}
            onChangeText={v => setNombre(v.slice(0, LARGO_MAXIMO_DEL_NOMBRE))}
            placeholder={porDefecto.nombre}
            placeholderTextColor={c.micro}
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel="Nombre del animal"
            style={[t.body, estilos.campo, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text, fontSize: 18 }]}
          />
          <Text style={cuerpo}>Vacío = «{porDefecto.nombre}».</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={[estilos.rotulo, { color: c.textStrong }]}>Imagen</Text>
          <Text style={cuerpo}>{RECOMENDACION_DE_IMAGEN}</Text>
          <BotonSecundario
            etiqueta={elegida ? 'Elegir otra imagen' : 'Elegir una imagen'}
            icono="image"
            onPress={() => void elegir()}
            deshabilitado={ocupado}
          />
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>{error}</Text>
        ) : null}

        <BotonPrincipal etiqueta="Guardar" onPress={() => void guardar()} cargando={guardando} deshabilitado={!hayCambios || ocupado} />
        {vigente?.personalizada && !elegida ? (
          <BotonSecundario
            etiqueta="Restaurar la imagen por defecto"
            onPress={() => void restaurar()}
            cargando={restaurando}
            deshabilitado={guardando}
          />
        ) : null}
        {confirmacion ? (
          <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** La tarjeta de Yo sobre el fondo de un tema, sin importar el tema de quien administra. */
function VistaPrevia({
  etiqueta,
  paleta,
  ejemplo,
  animal,
}: {
  etiqueta: string;
  paleta: typeof light;
  ejemplo: NonNullable<ReturnType<typeof ejemploDeLaTarjetaDeFase>>;
  animal: React.ComponentProps<typeof TarjetaDeFase>['animal'];
}) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{etiqueta}</Text>
      <View style={[estilos.marcoDeVista, { backgroundColor: paleta.bg, borderColor: c.border }]}>
        <TarjetaDeFase
          numero={ejemplo.numero}
          totalDeFases={FASES_EN_ORDEN.length}
          nombreDeLaFase={ejemplo.nombreDeLaFase}
          animal={animal}
          diasDeLaFase={ejemplo.diasDeLaFase}
          diaDelPrograma={ejemplo.diaDelPrograma}
          diasDelPrograma={DIAS_DEL_PROGRAMA}
          paleta={paleta}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24 },
  campo: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 56 },
  marcoDeVista: { borderWidth: 1, borderRadius: 24, padding: 12 },
});
