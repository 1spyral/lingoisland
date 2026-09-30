"use client";

import { useCharacterSet } from "@/contexts/CharacterSetContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function T({ k }: { k: string }) {
  const { t } = useLanguage();
  const { convertText } = useCharacterSet();
  return <>{convertText(t(k))}</>;
}
