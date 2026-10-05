import React, { useMemo, useState } from 'react';
import Select, { components } from 'react-select';
import { GraduationCap, Building2 } from 'lucide-react';
import { UNIVERSIDADES } from '../data/universidades';

// Función para normalizar texto removiendo acentos/diacríticos y en minúsculas
export const normalizeText = (text = '') =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export default function UniversitySelect({
  value,
  onChange,
  otroNombre = '',
  onOtroNombreChange,
  hasError = false,
  id = 'register-universidad',
}) {
  const [inputValue, setInputValue] = useState('');

  // 5. Orden: UCC primera, el resto alfabético
  const options = useMemo(() => {
    const ucc = UNIVERSIDADES.find((u) => u.id === 'ucc');
    const others = UNIVERSIDADES.filter((u) => u.id !== 'ucc').sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es')
    );

    const list = ucc ? [ucc, ...others] : others;

    const formatted = list.map((u) => ({
      value: u.id,
      label: u.nombre,
      sigla: u.sigla || '',
      dominios: u.dominios || [],
      isOtro: false,
    }));

    // Opción "Otra universidad" al final
    formatted.push({
      value: 'otro',
      label: 'Otra universidad / institución',
      sigla: 'Otra',
      dominios: [],
      isOtro: true,
    });

    return formatted;
  }, []);

  // 2. Filtro personalizado: búsqueda en vivo por nombre y sigla, sin distinguir tildes ni mayúsculas
  const filterOption = (candidate, input) => {
    if (!input) return true;
    if (candidate.data.isOtro) return true; // Siempre mostrar opción "Otra" para facilitar selección
    const query = normalizeText(input);
    const labelNorm = normalizeText(candidate.data.label);
    const siglaNorm = normalizeText(candidate.data.sigla);
    return labelNorm.includes(query) || siglaNorm.includes(query);
  };

  // Encontrar la opción seleccionada actual
  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Custom Option component
  const Option = (props) => {
    const { data, isSelected } = props;
    return (
      <components.Option {...props}>
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
            {data.isOtro ? (
              <Building2
                size={16}
                className={isSelected ? 'text-white' : 'text-emerald-600'}
                style={{ flexShrink: 0 }}
              />
            ) : null}
            <span
              style={{
                fontWeight: isSelected ? 600 : 500,
                fontSize: '0.92rem',
                lineHeight: 1.35,
              }}
            >
              {data.label}
            </span>
          </div>
          {data.sigla && !data.isOtro && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.22)' : 'rgba(16, 185, 129, 0.1)',
                color: isSelected ? '#ffffff' : '#059669',
                flexShrink: 0,
              }}
            >
              {data.sigla}
            </span>
          )}
        </div>
      </components.Option>
    );
  };

  // Custom SingleValue component (muestra nombre y sigla)
  const SingleValue = (props) => {
    const { data } = props;
    return (
      <components.SingleValue {...props}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.92rem',
              color: 'var(--text, #172033)',
              fontWeight: 500,
            }}
          >
            {data.label}
          </span>
          {data.sigla && !data.isOtro && (
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted, #5c6b82)',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              ({data.sigla})
            </span>
          )}
        </div>
      </components.SingleValue>
    );
  };

  // Estilos personalizados con react-select
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '48px',
      height: '48px',
      borderRadius: '12px', // rounded-xl
      paddingLeft: '38px', // Espacio para el icono de birrete
      paddingRight: '6px',
      backgroundColor: '#ffffff',
      borderColor: hasError
        ? '#ef4444'
        : state.isFocused
        ? '#10b981'
        : '#e2e8f0', // borde gris claro
      borderWidth: state.isFocused ? '1.5px' : '1px',
      boxShadow: state.isFocused
        ? '0 0 0 3px rgba(16, 185, 129, 0.18)' // halo en verde HUASI
        : 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: hasError
          ? '#ef4444'
          : state.isFocused
          ? '#10b981'
          : '#cbd5e1',
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 6px',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
      color: 'var(--text, #172033)',
      fontSize: '0.92rem',
      fontWeight: 500,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#94a3b8',
      fontSize: '0.92rem',
      fontWeight: 400,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '14px',
      marginTop: '8px', // Separación de 8px del control
      boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.14), 0 4px 12px rgba(15, 23, 42, 0.06)',
      border: '1px solid rgba(226, 232, 240, 0.9)',
      overflow: 'hidden',
      zIndex: 50,
      backgroundColor: '#ffffff',
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '280px', // Altura máxima ~280px con scroll
      padding: '6px',
      scrollBehavior: 'smooth',
    }),
    option: (provided, state) => {
      let backgroundColor = '#ffffff';
      let color = '#172033';

      if (state.isSelected) {
        backgroundColor = '#10b981'; // Verde HUASI
        color = '#ffffff';
      } else if (state.isFocused) {
        backgroundColor = '#e4f9ee'; // Verde muy claro en hover/focus
        color = '#065f46';
      }

      return {
        ...provided,
        borderRadius: '8px',
        padding: '10px 14px',
        margin: '2px 0',
        cursor: 'pointer',
        backgroundColor,
        color,
        fontSize: '0.92rem',
        transition: 'all 0.15s ease',
        '&:active': {
          backgroundColor: state.isSelected ? '#10b981' : '#d1fae5',
        },
      };
    },
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused ? '#10b981' : '#94a3b8',
      padding: '6px',
      transition: 'color 0.2s ease, transform 0.2s ease',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'none',
      '&:hover': {
        color: '#10b981',
      },
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: '#94a3b8',
      padding: '4px',
      '&:hover': {
        color: '#ef4444',
      },
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#64748b',
      fontSize: '0.88rem',
      padding: '16px 12px',
      textAlign: 'center',
    }),
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Icono de birrete conservado a la izquierda */}
        <GraduationCap
          size={19}
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: selectedOption ? '#10b981' : '#94a3b8',
            pointerEvents: 'none',
            zIndex: 2,
            transition: 'color 0.2s ease',
          }}
        />

        <Select
          id={id}
          instanceId={id}
          aria-label="Seleccionar universidad"
          value={selectedOption}
          onChange={(opt) => {
            onChange(opt ? opt.value : '');
            if (opt && opt.value !== 'otro' && onOtroNombreChange) {
              onOtroNombreChange('');
            }
          }}
          onInputChange={(val) => setInputValue(val)}
          options={options}
          filterOption={filterOption}
          components={{ Option, SingleValue }}
          styles={customStyles}
          placeholder="Busca tu universidad..."
          noOptionsMessage={() => 'No encontramos tu universidad'}
          isClearable
          isSearchable
        />
      </div>

      {/* Si se selecciona 'Otro', se despliega el input para especificar el nombre */}
      {value === 'otro' && (
        <div style={{ marginTop: '10px', animation: 'fadeIn 0.25s ease' }}>
          <label
            htmlFor="register-otra-universidad"
            style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary, #1e293b)',
              marginBottom: 4,
            }}
          >
            Nombre de tu universidad / institución *
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Building2
              size={17}
              style={{
                position: 'absolute',
                left: 14,
                color: '#10b981',
                pointerEvents: 'none',
              }}
            />
            <input
              id="register-otra-universidad"
              type="text"
              required
              className="form-control"
              style={{
                paddingLeft: 42,
                height: 44,
                borderRadius: '10px',
                fontSize: '0.9rem',
              }}
              placeholder="Ej. Escuela Militar de Aviación, Colegio Mayor..."
              value={otroNombre}
              onChange={(e) => onOtroNombreChange && onOtroNombreChange(e.target.value)}
              autoFocus
            />
          </div>
          <small
            style={{
              color: '#475569', // Alto contraste
              fontSize: '0.74rem',
              marginTop: 4,
              display: 'block',
              lineHeight: 1.35,
            }}
          >
            Recuerda que debes ingresar un correo institucional terminado en <strong>.edu.co</strong> (o dominio oficial).
          </small>
        </div>
      )}
    </div>
  );
}
