import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'en' | 'es' | 'ur' | 'ar';
export type Currency = 'USD' | 'PKR' | 'SAR' | 'EUR';

interface LocaleContextProps {
  language: Language;
  timezone: string;
  isAutoTimezone: boolean;
  currency: Currency;
  setLanguage: (lang: Language) => void;
  setTimezone: (tz: string) => void;
  setIsAutoTimezone: (auto: boolean) => void;
  setCurrency: (curr: Currency) => void;
  formatLocalDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatLocalCurrency: (amountInUSD: number) => string;
  formatStringCurrency: (amountStr: string | number) => string;
  exchangeRate: number;
}

const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  PKR: 278.0,
  SAR: 3.75,
  EUR: 0.92,
};

const LOCALE_MAP: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES',
  ur: 'ur-PK',
  ar: 'ar-SA',
};

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'en';
  });

  const [isAutoTimezone, setIsAutoTimezoneState] = useState<boolean>(() => {
    const saved = localStorage.getItem('isAutoTimezone');
    return saved === null ? true : saved === 'true';
  });

  const [timezone, setTimezoneState] = useState<string>(() => {
    const saved = localStorage.getItem('timezone');
    if (saved) return saved;
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  });

  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem('currency') as Currency) || 'USD';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    i18n.changeLanguage(lang);
    document.documentElement.dir = (lang === 'ar' || lang === 'ur') ? 'rtl' : 'ltr';
  };

  const setIsAutoTimezone = (auto: boolean) => {
    setIsAutoTimezoneState(auto);
    localStorage.setItem('isAutoTimezone', String(auto));
    if (auto) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setTimezoneState(detected);
        localStorage.setItem('timezone', detected);
      }
    }
  };

  const setTimezone = (tz: string) => {
    if (!isAutoTimezone) {
      setTimezoneState(tz);
      localStorage.setItem('timezone', tz);
    }
  };

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem('currency', curr);
  };

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.dir = (language === 'ar' || language === 'ur') ? 'rtl' : 'ltr';
  }, []);

  useEffect(() => {
    if (isAutoTimezone) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && detected !== timezone) {
        setTimezoneState(detected);
        localStorage.setItem('timezone', detected);
      }
    }
  }, [isAutoTimezone]);

  const formatLocalDate = (dateInput: Date | string, options?: Intl.DateTimeFormatOptions) => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(date.getTime())) return '';
      
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        timeZone: timezone,
        ...options,
      };

      return new Intl.DateTimeFormat(LOCALE_MAP[language], defaultOptions).format(date);
    } catch (e) {
      console.error('[Locale] Error formatting date:', e);
      return String(dateInput);
    }
  };

  const formatLocalCurrency = (amountInUSD: number) => {
    try {
      const convertedAmount = amountInUSD * EXCHANGE_RATES[currency];
      
      const formatOptions: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      };

      return new Intl.NumberFormat(LOCALE_MAP[language], formatOptions).format(convertedAmount);
    } catch (e) {
      console.error('[Locale] Error formatting currency:', e);
      return `${currency} ${amountInUSD}`;
    }
  };

  const formatStringCurrency = (amountStr: string | number) => {
    if (amountStr === undefined || amountStr === null) return '';
    const str = String(amountStr).trim();
    if (!str) return '';
    
    if (str.includes('$') || /^\d/.test(str)) {
      const cleanStr = str.replace(/[\$,]/g, '').trim();
      const match = cleanStr.match(/^([\d\.]+)\s*([KkMmBb]?)$/);
      if (match) {
        const numValue = parseFloat(match[1]);
        const suffix = match[2].toUpperCase();
        
        let multiplier = 1;
        if (suffix === 'K') multiplier = 1000;
        else if (suffix === 'M') multiplier = 1000000;
        else if (suffix === 'B') multiplier = 1000000000;
        
        const amountInUSD = numValue * multiplier;
        return formatLocalCurrency(amountInUSD);
      }
    }
    return str;
  };

  return (
    <LocaleContext.Provider value={{
      language,
      timezone,
      isAutoTimezone,
      currency,
      setLanguage,
      setTimezone,
      setIsAutoTimezone,
      setCurrency,
      formatLocalDate,
      formatLocalCurrency,
      formatStringCurrency,
      exchangeRate: EXCHANGE_RATES[currency],
    }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
