'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { uz } from '@/locales/uz'
import { en } from '@/locales/en'
import { ru } from '@/locales/ru'

type LocaleType = 'uz' | 'en' | 'ru'
const dictionaries = { uz, en, ru }

interface LanguageContextProps {
  locale: LocaleType
  setLocale: (l: LocaleType) => void
  t: (key: keyof typeof uz) => string
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<LocaleType>('en')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem('app_locale') as LocaleType
    if (stored && ['uz', 'en', 'ru'].includes(stored)) {
      setLocaleState(stored)
    }
  }, [])

  const setLocale = (l: LocaleType) => {
    setLocaleState(l)
    localStorage.setItem('app_locale', l)
  }

  const t = (key: keyof typeof uz): string => {
    const dict = dictionaries[locale]
    return dict[key] || en[key] || key
  }

  // Prevent flash of default text
  if (!isMounted) return null

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
