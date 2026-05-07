const READING_WORD_PATTERN = /[^\s\p{L}\p{N}]?[\p{L}\p{N}]+(?:[’'´`-][\p{L}\p{N}]+)*(?:[^\s\p{L}\p{N}]*)/gu;

export const tokenizeReadingWords = (value: string): string[] => value.match(READING_WORD_PATTERN) ?? [];

export const countWords = (value: string) => tokenizeReadingWords(value).length;

export const detectTextFormat = (value: string): "markdown" | "plain" => {
  const markdownSignals = [
    /^#{1,6}\s+\S/m,
    /\[[^\]]+\]\([^)]+\)/,
    /(\*\*|__)[^*_]+(\*\*|__)/,
    /^[-*+]\s+\S/m,
    /^\d+[.)]\s+\S/m,
    /^>\s+\S/m,
    /^```/m,
  ];

  return markdownSignals.some((pattern) => pattern.test(value)) ? "markdown" : "plain";
};

const removeInlineMarkup = (value: string) =>
  value
    .replace(/_([^_\n]{1,120})_/g, "$1")
    .replace(/\b_([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][^_\n]{0,80}[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])_\b/g, "$1")
    .replace(/(^|[\s([{"'“‘])_([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g, "$1$2")
    .replace(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])_($|[\s.,;:!?)\]}"'”’])/g, "$1$2")
    .replace(/_/g, "")
    .replace(/\*\*([^*\n]{1,120})\*\*/g, "$1")
    .replace(/\*([^*\n]{1,120})\*/g, "$1");

const normalizeContractions = (value: string) =>
  value
    .replace(/\b([A-Za-z]+)\s+([’'´`])\s*(t|s|m|re|ve|ll|d)\b/gi, "$1$2$3")
    .replace(/\b([A-Za-z]+)([’'´`])\s+(t|s|m|re|ve|ll|d)\b/gi, "$1$2$3");

const DECORATIVE_INITIAL_PREFIX = /^(\s*(?:#{1,6}\s+|>\s+|[-*+]\s+|\d+[.)]\s+)?)/;
const SPELLED_HEADING_KEYWORDS = new Set([
  "CHAPTER",
  "CHAPTERS",
  "CONTENTS",
  "INTRODUCTION",
  "INDEX",
  "ILLUSTRATIONS",
  "PREFACE",
  "PROLOGUE",
  "EPILOGUE",
  "PART",
  "BOOK",
  "VOLUME",
  "SECTION",
  "MR",
  "MRS",
  "MISS",
  "MS",
]);

const repairDecorativeInitialSpacing = (line: string) => {
  const prefixMatch = line.match(DECORATIVE_INITIAL_PREFIX);
  const prefix = prefixMatch?.[1] ?? "";
  let body = line.slice(prefix.length);

  const spelledHeading = body.match(/^((?:[A-Z]\s+){2,}[A-Z])(\b.*)$/);
  if (spelledHeading) {
    const joined = spelledHeading[1].replace(/\s+/g, "");
    if (SPELLED_HEADING_KEYWORDS.has(joined)) {
      body = `${joined}${spelledHeading[2]}`;
    }
  }

  const repairedBody = body
    .replace(/^([A-Z])\s+([A-Z]{2,})\b/, (match, initial: string, rest: string) => {
      const joined = `${initial}${rest}`;
      return SPELLED_HEADING_KEYWORDS.has(joined) ? joined : match;
    })
    .replace(/^([Cc])\s+(hapters?|ontents?)\b/, "$1$2")
    .replace(/^([Ii])\s+(ntroduction|ndex|llustrations?|t)\b/, "$1$2")
    .replace(/^([Pp])\s+(reface|rologue|art)\b/, "$1$2")
    .replace(/^([Ee])\s+(pilogue)\b/, "$1$2")
    .replace(/^([Bb])\s+(ook)\b/, "$1$2")
    .replace(/^([Vv])\s+(olume)\b/, "$1$2")
    .replace(/^([Ss])\s+(ection)\b/, "$1$2")
    .replace(/^([Mm])\s+(r|rs|s|iss)(\.)?\b/i, "$1$2$3");

  return `${prefix}${repairedBody}`;
};

export function cleanReadingText(value: string) {
  return normalizeContractions(removeInlineMarkup(value))
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => repairDecorativeInitialSpacing(line.replace(/[ \t]+/g, " ").trim()))
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/(?:-{3,}\s*){3,}/g, "---\n\n")
    .trim();
}

export function stripProjectGutenbergBoilerplate(value: string) {
  const startPattern = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i;
  const endPattern = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*$/i;
  const startMatch = value.match(startPattern);
  const withoutHeader = startMatch ? value.slice((startMatch.index ?? 0) + startMatch[0].length) : value;
  return withoutHeader.replace(endPattern, "");
}

export function cleanImportedText(value: string) {
  return normalizeContractions(removeInlineMarkup(stripProjectGutenbergBoilerplate(value)))
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/([.!?;:])(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g, "$1 ")
    .replace(/([,])(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g, "$1 ")
    .replace(/([)\]”’])(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g, "$1 ")
    .replace(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])([(¿¡“‘])/g, "$1 $2")
    .split("\n")
    .map((line) => repairDecorativeInitialSpacing(line.replace(/\s+/g, " ").trim()))
    .filter((line) => {
      if (!line) return true;
      if (/\.(?:jpg|jpeg|png|gif|webp|svg|ico)(?:\s|$)/i.test(line)) return false;
      if (/^(image|figure|caption|alt text|thumbnail)\b/i.test(line)) return false;
      if (/^START OF THE PROJECT GUTENBERG EBOOK/i.test(line)) return false;
      if (/^END OF THE PROJECT GUTENBERG EBOOK/i.test(line)) return false;
      return true;
    })
    .filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
    .join("\n")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/([.!?]){3,}/g, "$1")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
