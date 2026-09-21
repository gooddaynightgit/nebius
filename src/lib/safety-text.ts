export const SAFETY_REFUSAL =
  "This one isn't for Gooddaynight. Tonight is for a real, gentle moment of yours — nothing violent, hateful, or sexual.";

const HORRIFIC_RE =
  /\b(gore|gory|behead|decapitat|dismember|murder|homicide|massacre|rape|raping|porn|porno|pornography|nsfw|xxx|nude|nudes|naked pics|child\s*porn|csam|bestiality|zoophilia|lynch|genocide|nazi|swastika|slur|self-harm|self harm|kill myself|killing myself|suicide|suicidal|hanging myself|cut myself|gunshot wound|bloodbath|mutilat|torture|abuse porn)\b/i;

export function isHorrificText(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  return HORRIFIC_RE.test(value);
}

export function isHorrificFilename(name: string | undefined): boolean {
  if (!name?.trim()) return false;
  return HORRIFIC_RE.test(name.replace(/[_-]+/g, " "));
}
