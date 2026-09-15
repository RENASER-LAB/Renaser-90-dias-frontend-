import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { FichaIdentidadData, SexoOption, EstadoCivilOption } from '../types/onboarding.types';
import { FormField } from '../../../components/FormField';
import { MicroLabel } from '../../../components/ui';
import { DatePickerField } from '../../../components/DatePickerField';
import { PhoneCountryInput } from '../../../components/PhoneCountryInput';
import { LocationCascadePicker, LocationData } from '../../../components/LocationCascadePicker';
import { LocationService } from '../../../services/locationService';

interface ChapterIdentidadProps {
  data: FichaIdentidadData;
  onChange: (data: FichaIdentidadData) => void;
}

const DOCUMENT_TYPES = [
  { id: 'DNI', label: 'DNI / Cédula' },
  { id: 'Pasaporte', label: 'Pasaporte' },
  { id: 'Carné de extranjería', label: 'Extranjería' },
];

const SEXO_OPTIONS: SexoOption[] = ['Masculino', 'Femenino', 'Otro'];

const ESTADO_CIVIL_OPTIONS: EstadoCivilOption[] = [
  'Soltero(a)',
  'Casado(a)',
  'Conviviente',
  'Divorciado(a)',
  'Viudo(a)',
];

const HIJOS_OPTIONS = ['0', '1', '2', '3', '4+'];

export function ChapterIdentidad({ data, onChange }: ChapterIdentidadProps) {
  const { c, t } = useTheme();

  // Auto-detect user country & location on mount (WhatsApp / Instagram UX style)
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
  }, []);

  const updateField = (key: keyof FichaIdentidadData, value: any) => {
    onChange({ ...data, [key]: value });
  };

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
          keyboardType: 'numeric' as const,
          autoCapitalize: 'none' as const,
          helperText: '8 a 12 dígitos según tu país',
        };
    }
  };

  const handleDocNumberChange = (val: string) => {
    if (data.tipoDocumento === 'DNI') {
      const numericOnly = val.replace(/[^\d]/g, '').slice(0, 12);
      updateField('numeroDocumento', numericOnly);
    } else {
      const cleaned = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
      updateField('numeroDocumento', cleaned);
    }
  };

  const docConfig = getDocConfig();

  return (
    <View style={styles.container}>
      {/* Nombre Completo */}
      <FormField
        label="NOMBRE COMPLETO"
        value={data.nombre}
        onChangeText={val => updateField('nombre', val)}
        placeholder="Tu nombre y apellidos"
        icon="user"
        autoCapitalize="words"
        helperText="Como deseas que te identifique tu mentor y el sistema"
      />

      {/* Sexo (Masculino / Femenino / Otro) */}
      <View style={{ gap: 8 }}>
        <MicroLabel>Sexo</MicroLabel>
        <View style={styles.optionRow}>
          {SEXO_OPTIONS.map(sex => {
            const isSelected = data.sexo === sex;
            return (
              <Pressable
                key={sex}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={sex}
                onPress={() => updateField('sexo', sex)}
                style={[
                  styles.optionBtn,
                  {
                    borderColor: isSelected ? c.gold : c.border,
                    backgroundColor: isSelected ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <Text
                  style={[
                    t.micro,
                    {
                      color: isSelected ? c.goldInk : c.text,
                      fontSize: 12,
                      fontFamily: isSelected ? 'Jost_700Bold' : 'Jost_500Medium',
                      letterSpacing: 0.5,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {sex}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Información Familiar: Estado Civil */}
      <View style={{ gap: 8 }}>
        <MicroLabel>Estado civil / situación familiar</MicroLabel>
        <View style={styles.wrapRow}>
          {ESTADO_CIVIL_OPTIONS.map(ec => {
            const isSelected = data.estadoCivil === ec;
            return (
              <Pressable
                key={ec}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={ec}
                onPress={() => updateField('estadoCivil', ec)}
                style={[
                  styles.chipBtn,
                  {
                    borderColor: isSelected ? c.gold : c.border,
                    backgroundColor: isSelected ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <Text
                  style={[
                    t.micro,
                    {
                      color: isSelected ? c.goldInk : c.text,
                      fontSize: 11,
                      fontFamily: isSelected ? 'Jost_700Bold' : 'Jost_500Medium',
                    },
                  ]}
                >
                  {ec}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Cantidad de Hijos */}
      <View style={{ gap: 8 }}>
        <MicroLabel>Cantidad de hijos</MicroLabel>
        <View style={styles.optionRow}>
          {HIJOS_OPTIONS.map(hijos => {
            const isSelected = data.cantidadHijos === hijos;
            return (
              <Pressable
                key={hijos}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${hijos} hijos`}
                onPress={() => updateField('cantidadHijos', hijos)}
                style={[
                  styles.numCircleBtn,
                  {
                    borderColor: isSelected ? c.gold : c.border,
                    backgroundColor: isSelected ? c.gold : c.cardBgAlt,
                  },
                ]}
              >
                <Text
                  style={[
                    t.body,
                    {
                      color: isSelected ? c.onGold : c.text,
                      fontSize: 14,
                      fontFamily: 'Jost_700Bold',
                    },
                  ]}
                >
                  {hijos}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Ocupación y Negocio */}
      <FormField
        label="OCUPACIÓN / PROFESIÓN ACTUAL"
        value={data.ocupacion}
        onChangeText={val => updateField('ocupacion', val)}
        placeholder="Ej. Abogado, Ingeniero, Consultor..."
        icon="briefcase"
        helperText="Tu ocupación o actividad laboral principal"
      />

      <FormField
        label="EMPRESA / NEGOCIO ACTUAL (SI APLICA)"
        value={data.tipoNegocio}
        onChangeText={val => updateField('tipoNegocio', val)}
        placeholder="Nombre de tu negocio o rubro"
        icon="spark"
        helperText="Rubro o emprendimiento que deseas escalar"
      />

      {/* Selector de Tipo de Documento Centrado */}
      <View style={{ gap: 8 }}>
        <MicroLabel>Tipo de documento de identidad</MicroLabel>
        <View style={styles.optionRow}>
          {DOCUMENT_TYPES.map(tipo => {
            const isSelected = data.tipoDocumento === tipo.id;
            return (
              <Pressable
                key={tipo.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={tipo.label ?? tipo.id}
                onPress={() => {
                  onChange({
                    ...data,
                    tipoDocumento: tipo.id,
                    numeroDocumento: '',
                  });
                }}
                style={[
                  styles.optionBtn,
                  {
                    borderColor: isSelected ? c.gold : c.border,
                    backgroundColor: isSelected ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <Text
                  style={[
                    t.micro,
                    {
                      color: isSelected ? c.goldInk : c.text,
                      fontSize: 11,
                      fontFamily: isSelected ? 'Jost_700Bold' : 'Jost_500Medium',
                      letterSpacing: 0.5,
                      textAlign: 'center',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tipo.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Número de Documento Dinámico con Máxima Longitud y Validación Estricta */}
      <FormField
        label={docConfig.label}
        value={data.numeroDocumento}
        onChangeText={handleDocNumberChange}
        placeholder={docConfig.placeholder}
        icon="doc"
        keyboardType={docConfig.keyboardType}
        autoCapitalize={docConfig.autoCapitalize}
        maxLength={docConfig.maxLength}
        helperText={docConfig.helperText}
      />

      {/* Selector Rápido de Fecha de Nacimiento (Google/Material Style) */}
      <DatePickerField
        label="FECHA DE NACIMIENTO"
        value={data.fechaNacimiento}
        onChange={val => updateField('fechaNacimiento', val)}
        helperText="Toca para elegir día, mes y año sin escribir"
      />

      {/* WhatsApp Principal con Combobox de Países y Búsqueda */}
      <PhoneCountryInput
        label="WHATSAPP PRINCIPAL (CON CÓDIGO DE PAÍS)"
        value={data.whatsapp || (data.codigoPais ? `${data.codigoPais} ` : '+51 ')}
        onChange={(fullNumber, code) => {
          onChange({
            ...data,
            whatsapp: fullNumber,
            codigoPais: code,
          });
        }}
        helperText="El canal donde recibirás el seguimiento diario de tu mentor"
      />

      {/* Ubicación Geográfica con Campo Separado de Distrito y Dirección */}
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

      {/* Pregunta Abierta 1: Expectativa */}
      <View style={styles.openQuestionBlock}>
        <MicroLabel>¿Qué esperas concretamente de Renaser?</MicroLabel>
        <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 18, marginVertical: 4 }]}>
          Detalla los cambios específicos que necesitas lograr en tu mente, cuerpo y negocio durante los 90 días.
        </Text>
        <FormField
          label=""
          value={data.expectativa}
          onChangeText={val => updateField('expectativa', val)}
          placeholder="Espero que RENASER y mi mentor me guíen con disciplina en..."
          multiline
          numberOfLines={4}
          maxLength={2000}
        />
        <Text style={[t.micro, styles.counterText, { color: c.goldInk }]}>
          {data.expectativa.length} / 2000 caracteres
        </Text>
      </View>

      {/* Pregunta Abierta 2: Temor */}
      <View style={styles.openQuestionBlock}>
        <MicroLabel>¿Qué temes que no funcione?</MicroLabel>
        <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 18, marginVertical: 4 }]}>
          Honestidad absoluta. ¿Cuáles son tus mayores dudas, patrones de autosabotaje o miedos frente a este proceso?
        </Text>
        <FormField
          label=""
          value={data.temor}
          onChangeText={val => updateField('temor', val)}
          placeholder="Lo que más temo de este proceso es rendirme cuando..."
          multiline
          numberOfLines={4}
          maxLength={2000}
        />
        <Text style={[t.micro, styles.counterText, { color: c.goldInk }]}>
          {data.temor.length} / 2000 caracteres
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    width: '100%',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  optionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 48,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numCircleBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openQuestionBlock: {
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
