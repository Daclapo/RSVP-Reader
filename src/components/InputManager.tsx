import TabbedInput from "./TabbedInput";
import type { SourceMeta } from "@/lib/reader/types";

export type InputManagerProps = {
  text: string;
  onTextChange: (text: string) => void;
  onSourceMetaChange: (meta: SourceMeta) => void;
};

const InputManager = ({ text, onTextChange, onSourceMetaChange }: InputManagerProps) => {
  return (
    <TabbedInput
      text={text}
      onTextChange={onTextChange}
      onSourceMetaChange={onSourceMetaChange}
    />
  );
};

export default InputManager;
