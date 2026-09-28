import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getLocales } from "expo-localization";
import { dateLocale, detectSupportedLocale, languageOptions, t as translate, type Locale, type TranslationKey, type TranslationParams } from "../../../../packages/domain/src";
import { readStoredLocale, writeStoredLocale } from "./storage";
type Value={locale:Locale;setLocale:(locale:Locale)=>void;t:(key:TranslationKey,params?:TranslationParams)=>string;dateLocale:ReturnType<typeof dateLocale>;options:ReturnType<typeof languageOptions>};
const Context=createContext<Value|null>(null);
export function deviceLocale():Locale{return detectSupportedLocale(getLocales().map((x)=>x.languageTag));}
export function LocaleProvider({children}:{children:React.ReactNode}){
  const [locale,setLocaleState]=useState<Locale>("pt");
  useEffect(()=>{let alive=true;void readStoredLocale().then((stored)=>{if(alive)setLocaleState(stored||deviceLocale())});return()=>{alive=false}},[]);
  const setLocale=useCallback((next:Locale)=>{setLocaleState(next);void writeStoredLocale(next)},[]);
  const value=useMemo<Value>(()=>({locale,setLocale,t:(key,params)=>translate(locale,key,params),dateLocale:dateLocale(locale),options:languageOptions(locale)}),[locale,setLocale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLocale(){const value=useContext(Context);if(!value)throw new Error("useLocale precisa estar dentro de LocaleProvider");return value;}
