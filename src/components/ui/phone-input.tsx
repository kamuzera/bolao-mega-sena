import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const countries: Country[] = [
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: 'BR' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: 'US' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: 'AR' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: 'CL' },
  { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: 'CO' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: 'PE' },
  { code: 'UY', name: 'Uruguai', dialCode: '+598', flag: 'UY' },
  { code: 'PY', name: 'Paraguai', dialCode: '+595', flag: 'PY' },
  { code: 'BO', name: 'Bolívia', dialCode: '+591', flag: 'BO' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: 'VE' },
  { code: 'EC', name: 'Equador', dialCode: '+593', flag: 'EC' },
  { code: 'GY', name: 'Guiana', dialCode: '+592', flag: 'GY' },
  { code: 'SR', name: 'Suriname', dialCode: '+597', flag: 'SR' },
  { code: 'GF', name: 'Guiana Francesa', dialCode: '+594', flag: 'GF' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: 'PT' },
  { code: 'ES', name: 'Espanha', dialCode: '+34', flag: 'ES' },
  { code: 'FR', name: 'França', dialCode: '+33', flag: 'FR' },
  { code: 'IT', name: 'Itália', dialCode: '+39', flag: 'IT' },
  { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: 'DE' },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: 'GB' },
  { code: 'CA', name: 'Canadá', dialCode: '+1', flag: 'CA' },
  { code: 'AU', name: 'Austrália', dialCode: '+61', flag: 'AU' },
  { code: 'JP', name: 'Japão', dialCode: '+81', flag: 'JP' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: 'CN' },
  { code: 'IN', name: 'Índia', dialCode: '+91', flag: 'IN' },
  { code: 'RU', name: 'Rússia', dialCode: '+7', flag: 'RU' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: 'MX' },
  { code: 'ZA', name: 'África do Sul', dialCode: '+27', flag: 'ZA' },
  { code: 'EG', name: 'Egito', dialCode: '+20', flag: 'EG' },
  { code: 'NG', name: 'Nigéria', dialCode: '+234', flag: 'NG' },
];

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value = '',
  onChange,
  placeholder,
  className,
  disabled = false,
  name,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Brasil como padrão
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parsear o valor inicial
  useEffect(() => {
    if (value) {
      const country = countries.find(c => value.startsWith(c.dialCode));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(value.replace(country.dialCode, ''));
      } else {
        // Se não encontrar país, assumir Brasil
        setPhoneNumber(value.replace('+55', ''));
      }
    }
  }, [value]);

  // Formatar número brasileiro
  const formatBrazilianPhone = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newNumber = e.target.value;
    
    if (selectedCountry.code === 'BR') {
      // Formatação brasileira
      newNumber = formatBrazilianPhone(newNumber);
    } else {
      // Para outros países, apenas números
      newNumber = newNumber.replace(/\D/g, '');
    }
    
    setPhoneNumber(newNumber);
    
    // Montar número completo
    const fullNumber = selectedCountry.dialCode + newNumber.replace(/\D/g, '');
    onChange?.(fullNumber);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    
    // Limpar formatação se mudar de país
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const fullNumber = country.dialCode + cleanNumber;
    onChange?.(fullNumber);
  };

  const getPlaceholder = () => {
    if (selectedCountry.code === 'BR') {
      return '(11) 99999-9999';
    }
    return '999999999';
  };

  return (
    <div className={cn("flex", className)}>
      {/* Campo hidden para enviar com o formulário */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedCountry.dialCode + phoneNumber.replace(/\D/g, '')}
        />
      )}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-[120px] justify-between border-r-0 rounded-r-none"
            disabled={disabled}
          >
            <span className="flex items-center gap-2">
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {selectedCountry.flag}
              </span>
              <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0">
          <Command>
            <CommandInput placeholder="Buscar país..." />
            <CommandList>
              <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
              <CommandGroup>
                {countries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.dialCode}`}
                    onSelect={() => handleCountrySelect(country)}
                    className="flex items-center py-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded mr-3 flex-shrink-0">
                      {country.flag}
                    </span>
                    <span className="flex-1 font-medium">{country.name}</span>
                    <span className="text-sm text-muted-foreground font-mono">{country.dialCode}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <Input
        ref={inputRef}
        type="tel"
        placeholder={placeholder || getPlaceholder()}
        value={phoneNumber}
        onChange={handlePhoneChange}
        className="flex-1 rounded-l-none border-l-0"
        disabled={disabled}
      />
    </div>
  );
};
