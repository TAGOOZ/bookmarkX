import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { LocaleContext } from '../App';
import enMessages from '../../../locales/en.json';
import arMessages from '../../../locales/ar.json';

const allMessages: Record<string, Record<string, string>> = {
  en: enMessages as Record<string, string>,
  ar: arMessages as Record<string, string>,
};

function renderWithIntl(
  ui: React.ReactElement,
  options: { locale?: string; setLocale?: (l: string) => void } & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { locale = 'en', setLocale, ...renderOptions } = options;
  const messages = allMessages[locale] ?? allMessages.en;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <IntlProvider locale={locale} messages={messages}>
        <LocaleContext.Provider value={{ locale: locale as 'ar' | 'en', setLocale: setLocale ?? (() => {}) }}>
          {children}
        </LocaleContext.Provider>
      </IntlProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export { renderWithIntl };
