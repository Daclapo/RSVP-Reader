"use client";

import { useCallback } from "react";
import { dictionaries, type TranslationKey } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/reader/types";

export function useI18n(locale: Locale) {
  return useCallback((key: TranslationKey) => dictionaries[locale][key] ?? dictionaries.en[key], [locale]);
}
