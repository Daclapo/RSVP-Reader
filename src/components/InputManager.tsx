import TabbedInput from "./TabbedInput";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { Locale, SourceMeta } from "@/lib/reader/types";

export type InputManagerProps = {
  text: string;
  sourceMeta: SourceMeta;
  onTextChange: (text: string) => void;
  onSourceMetaChange: (meta: SourceMeta) => void;
  locale: Locale;
  t: (key: TranslationKey) => string;
};

const InputManager = ({ text, sourceMeta, onTextChange, onSourceMetaChange, locale, t }: InputManagerProps) => {
  return (
    <TabbedInput
      text={text}
      sourceMeta={sourceMeta}
      onTextChange={onTextChange}
      onSourceMetaChange={onSourceMetaChange}
      locale={locale}
      t={t}
    />
  );
};

export default InputManager;
