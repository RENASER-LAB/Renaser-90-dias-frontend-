import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { FichaIdentidadData, SexoOption, EstadoCivilOption } from '../types/onboarding.types';
import { FormField } from '../../../components/FormField';
import { MicroLabel } from '../../../components/ui';
import { DatePickerField } from '../../../components/DatePickerField';
import { PhoneCountryInput } from '../../../components/PhoneCountryInput';
import { LocationCascadePicker, LocationData } from '../../../components/LocationCascadePicker';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { LocationService } from '../../../services/locationService';
import { useEnfocarAlLlegar } from '../../../hooks/useEnfocarAlLlegar';
import { OpcionElegible } from './OpcionElegible';

/**
 * Capítulo 1 de la Ficha Inicial · Identidad y familia, partido en pasos (2026-10-05).
 *
 * Antes este archivo exportaba UN componente con las doce preguntas del capítulo en una sola
 * columna. Ahora exporta un componente por paso (`PASOS_FICHA` en `data/pasosFicha.ts` dice el
 * orden) y `FichaInicialScreen` muestra uno por pantalla. Los campos, sus etiquetas, sus ayudas,
 * sus límites y cómo limpian lo que se escribe son los mismos: cambió la forma, no el dato.
 */

export interface PasoIdentidadProps {
  data: FichaIdentidadData;
  onChange: (data: FichaIdentidadData) => void;
  /** La tecla de acción del teclado en el último campo del paso: lleva al paso siguiente. */
  alEnviar?: () => void;
}

const DOCUMENT_TYPES = [
  { valor: 'DNI', etiqueta: 'DNI / Cédula' },
  { valor: 'Pasaporte', etiqueta: 'Pasaporte' },
  { valor: 'Carné de extranjería', etiqueta: 'Extranjería', accessibilityLabel: 'Carné de extranjería' },
] as const;

type TipoDocumento = (typeof DOCUMENT_TYPES)[number]['valor'];

const SEXO_OPTIONS: SexoOption[] = ['Masculino', 'Femenino', 'Otro'];

const ESTADO_CIVIL_OPTIONS: EstadoCivilOption[] = [
  'Soltero(a)',
  'Casado(a)',
  'Conviviente',
  'Divorciado(a)',
  'Viudo(a)',
];

const HIJOS_OPTIONS = ['0', '1', '2', '3', '4+'];

/** Un grupo de opciones con su rótulo. */
function Pregunta({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.pregunta}>
      <MicroLabel>{rotulo}</MicroLabel>
      {children}
    </View>
  );
}

/**
 * País y prefijo según dónde está el teléfono, si todavía no se eligieron (estilo WhatsApp). Es el
 * mismo efecto que corría al montar el capítulo entero; ahora corre en los dos pasos que lo usan.
 */
function useCompletarUbicacion({ data, onChange }: PasoIdentidadProps) {
  useEffect(() => {
    if (!data.pais || !data.codigoPais) {
      LocationService.detectUserLocation().then(loc => {
        onChange({
          ...data,
          pais: data.pais || loc.pais,
          departamento: data.departamento || loc.departamento,
          ciudad: data.ciudad || loc.ciudad,
          distrito: data.distrito || loc.distrito,
          codigoPais: data.codigoPais || loc.codigoPais,
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function PasoNombre({ data, onChange, alEnviar }: PasoIdentidadProps) {
  const campo = useRef<TextInput>(null);
  useEnfocarAlLlegar(campo);
  return (
    <FormField
      ref={campo}
      label=""
      accessibilityLabel="Nombre completo"
      value={data.nombre}
      onChangeText={nombre => onChange({ ...data, nombre })}
      placeholder="Tu nombre y apellidos"
      icon="user"
      autoCapitalize="words"
      autoCorrect={false}
      autoComplete="name"
      textContentType="name"
      returnKeyType="next"
      submitBehavior="submit"
      onSubmitEditing={alEnviar}
    />
  );
}

export function PasoSobreTi({ data, onChange }: PasoIdentidadProps) {
  return (
    <View style={styles.columna}>
      <Pregunta rotulo="Sexo">
        <View accessibilityRole="radiogroup" style={styles.lista}>
          {SEXO_OPTIONS.map(sexo => (
            <OpcionElegible
              key={sexo}
              etiqueta={sexo}
              elegida={data.sexo === sexo}
              onElegir={() => onChange({ ...data, sexo })}
            />
          ))}
        </View>
      </Pregunta>

      <DatePickerField
        label="FECHA DE NACIMIENTO"
        value={data.fechaNacimiento}
        onChange={fechaNacimiento => onChange({ ...data, fechaNacimiento })}
        helperText="Toca para elegir día, mes y año sin escribir"
      />
    </View>
  );
}

export function PasoFamilia({ data, onChange }: PasoIdentidadProps) {
  return (
    <View style={styles.columna}>
      <Pregunta rotulo="Estado civil / situación familiar">
        <View accessibilityRole="radiogroup" style={styles.lista}>
          {ESTADO_CIVIL_OPTIONS.map(ec => (
            <OpcionElegible
              key={ec}
              etiqueta={ec}
              elegida={data.estadoCivil === ec}
              onElegir={() => onChange({ ...data, estadoCivil: ec })}
            />
          ))}
        </View>
      </Pregunta>

      <Pregunta rotulo="Cantidad de hijos">
        <View accessibilityRole="radiogroup" style={styles.filaCirculos}>
          {HIJOS_OPTIONS.map(hijos => (
            <OpcionElegible
              key={hijos}
              forma="circulo"
              etiqueta={hijos}
              accessibilityLabel={`${hijos} hijos`}
              elegida={data.cantidadHijos === hijos}
              onElegir={() => onChange({ ...data, cantidadHijos: hijos })}
            />
          ))}
        </View>
      </Pregunta>
    </View>
  );
}

export function PasoTrabajo({ data, onChange, alEnviar }: PasoIdentidadProps) {
  const ocupacionRef = useRef<TextInput>(null);
  const empresaRef = useRef<TextInput>(null);
  useEnfocarAlLlegar(ocupacionRef);
  return (
    <View style={styles.columna}>
      <FormField
        ref={ocupacionRef}
        label="OCUPACIÓN / PROFESIÓN ACTUAL"
        value={data.ocupacion}
        onChangeText={ocupacion => onChange({ ...data, ocupacion })}
        placeholder="Ej. Abogado, Ingeniero, Consultor..."
        icon="briefcase"
        helperText="Tu ocupación o actividad laboral principal"
        textContentType="jobTitle"
        autoCapitalize="sentences"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => empresaRef.current?.focus()}
      />

      <FormField
        ref={empresaRef}
        label="EMPRESA / NEGOCIO ACTUAL (SI APLICA)"
        value={data.tipoNegocio}
        onChangeText={tipoNegocio => onChange({ ...data, tipoNegocio })}
        placeholder="Nombre de tu negocio o rubro"
        icon="spark"
        helperText="Rubro o emprendimiento que deseas escalar"
        textContentType="organizationName"
        autoCapitalize="sentences"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={alEnviar}
      />
    </View>
  );
}

export function PasoDocumento({ data, onChange, alEnviar }: PasoIdentidadProps) {
  const numeroRef = useRef<TextInput>(null);
  useEnfocarAlLlegar(numeroRef);

  // Dynamic Document Input Config
  const getDocConfig = () => {
    switch (data.tipoDocumento) {
      case 'Pasaporte':
        return {
          label: 'NÚMERO DE PASAPORTE',
          placeholder: 'Ej. PE1234567',
          maxLength: 12,
          keyboardType: 'default' as const,
          autoCapitalize: 'characters' as const,
          helperText: 'Ingresa tu pasaporte oficial vigente',
        };
      case 'Carné de extranjería':
        return {
          label: 'NÚMERO DE CARNÉ DE EXTRANJERÍA',
          placeholder: 'Ej. 001234567',
          maxLength: 12,
          keyboardType: 'default' as const,
          autoCapitalize: 'characters' as const,
          helperText: 'Ingresa tu carné de extranjería o residencia',
        };
      case 'DNI':
      default:
        return {
          label: 'NÚMERO DE DNI / CÉDULA',
          placeholder: 'Ej. 72345678',
          maxLength: 12,
          /* `number-pad` y no `numeric`: el DNI son sólo dígitos, y `numeric` muestra además coma,
             punto y signo menos que acá no sirven para nada. */
          keyboardType: 'number-pad' as const,
          autoCapitalize: 'none' as const,
          helperText: '8 a 12 dígitos según tu país',
        };
    }
  };

  const handleDocNumberChange = (val: string) => {
    if (data.tipoDocumento === 'DNI') {
      const numericOnly = val.replace(/[^\d]/g, '').slice(0, 12);
      onChange({ ...data, numeroDocumento: numericOnly });
    } else {
      const cleaned = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
      onChange({ ...data, numeroDocumento: cleaned });
    }
  };

  const docConfig = getDocConfig();

  return (
    <View style={styles.columna}>
      <Pregunta rotulo="Tipo de documento de identidad">
        <ControlSegmentado<TipoDocumento>
          rol="radio"
          accessibilityLabel="Tipo de documento de identidad"
          opciones={DOCUMENT_TYPES}
          valor={data.tipoDocumento as TipoDocumento}
          onCambiar={tipoDocumento => {
            // Igual que antes: cambiar de tipo borra el número, porque las reglas de cada uno son otras.
            onChange({ ...data, tipoDocumento, numeroDocumento: '' });
            numeroRef.current?.focus();
          }}
        />
      </Pregunta>

      {/* Número de Documento Dinámico con Máxima Longitud y Validación Estricta */}
      <FormField
        ref={numeroRef}
        label={docConfig.label}
        value={data.numeroDocumento}
        onChangeText={handleDocNumberChange}
        placeholder={docConfig.placeholder}
        icon="doc"
        keyboardType={docConfig.keyboardType}
        autoCapitalize={docConfig.autoCapitalize}
        autoCorrect={false}
        maxLength={docConfig.maxLength}
        helperText={docConfig.helperText}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={alEnviar}
      />
    </View>
  );
}

export function PasoWhatsapp(props: PasoIdentidadProps) {
  const { data, onChange, alEnviar } = props;
  useCompletarUbicacion(props);
  return (
    <PhoneCountryInput
      label=""
      value={data.whatsapp || (data.codigoPais ? `${data.codigoPais} ` : '+51 ')}
      onChange={(fullNumber, code) => {
        onChange({
          ...data,
          whatsapp: fullNumber,
          codigoPais: code,
        });
      }}
      autoFocus
      returnKeyType="next"
      onSubmitEditing={alEnviar}
    />
  );
}

export function PasoUbicacion(props: PasoIdentidadProps) {
  const { data, onChange } = props;
  useCompletarUbicacion(props);

  const handleLocationChange = (loc: LocationData) => {
    onChange({
      ...data,
      pais: loc.pais,
      departamento: loc.departamento,
      ciudad: loc.ciudad,
      distrito: loc.distrito,
      direccion: loc.direccion !== undefined ? loc.direccion : data.direccion,
    });
  };

  return (
    <LocationCascadePicker
      data={{
        pais: data.pais || 'Perú',
        departamento: data.departamento || 'Lima',
        ciudad: data.ciudad || 'Lima Metropolitana',
        distrito: data.distrito || 'Miraflores',
        direccion: data.direccion || '',
      }}
      onChange={handleLocationChange}
    />
  );
}

/**
 * Las dos preguntas abiertas del capítulo («¿Qué esperas…?» y «¿Qué temes…?»). La pregunta y su
 * explicación las pone el título del paso; acá quedan el campo, sin rótulo repetido, y el contador.
 */
export function PasoPreguntaAbierta({
  valor,
  onCambiar,
  placeholder,
  accesibilidad,
}: {
  valor: string;
  onCambiar: (valor: string) => void;
  placeholder: string;
  accesibilidad: string;
}) {
  const { c, t } = useTheme();
  const campo = useRef<TextInput>(null);
  useEnfocarAlLlegar(campo);
  return (
    <View style={styles.preguntaAbierta}>
      <FormField
        ref={campo}
        label=""
        accessibilityLabel={accesibilidad}
        value={valor}
        onChangeText={onCambiar}
        placeholder={placeholder}
        multiline
        numberOfLines={5}
        maxLength={2000}
        autoCapitalize="sentences"
      />
      <Text style={[t.micro, styles.counterText, { color: c.goldInk }]}>
        {valor.length} / 2000 caracteres
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  columna: {
    gap: 24,
    width: '100%',
  },
  pregunta: {
    gap: 10,
  },
  lista: {
    gap: 10,
  },
  filaCirculos: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  preguntaAbierta: {
    gap: 2,
  },
  counterText: {
    alignSelf: 'flex-end',
    fontSize: 10.5,
    fontFamily: 'Jost_700Bold',
    marginTop: 4,
    marginRight: 2,
  },
});
