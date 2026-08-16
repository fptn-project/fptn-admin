import React, { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n'

const LanguageSwitcher = (): ReactElement => {
  const { i18n, t } = useTranslation()
  const current = (i18n.resolvedLanguage ??
    i18n.language ??
    'en') as SupportedLanguage
  const next = SUPPORTED_LANGUAGES.find((lang) => lang !== current) ?? current

  return (
    <button
      type="button"
      onClick={() => void i18n.changeLanguage(next)}
      aria-label={t('header.language')}
      title={next.toUpperCase()}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold uppercase text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {current}
    </button>
  )
}

export default LanguageSwitcher
