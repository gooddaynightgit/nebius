import { proposeSpokenLine, type SpellProposal } from "./care";
import { hasTokenFactoryKey } from "./config";
import { completeWithFallback, nanoModels } from "./nebius";

const SPELL_SYSTEM = `You fix only obvious spelling and small grammar so a private bedtime note can be read aloud.
Return ONLY JSON: {"corrected":"the same sentence, lightly fixed"}
Rules:
- Keep their voice, order, and meaning.
- Do not rewrite into formal or corporate English.
- Fix typos like doung→doing, aboute→about, idoing→I'm doing, freind→friend.
- Do not add people, advice, or new facts.
- If nothing is wrong, return the original sentence.`;

function similarEnough(original: string, corrected: string): boolean {
  if (!corrected.trim()) return false;
  if (corrected.length > original.length * 2 + 12) return false;
  const origWords = original.toLowerCase().split(/\s+/);
  const nextWords = corrected.toLowerCase().split(/\s+/);
  const overlap = origWords.filter((word) => nextWords.includes(word)).length;
  return overlap >= Math.max(1, Math.floor(origWords.length * 0.4));
}

export async function proposeSpellfix(text: string): Promise<SpellProposal> {
  const local = proposeSpokenLine(text);
  if (!local.original) return local;
  if (!hasTokenFactoryKey()) return local;

  try {
    const result = await completeWithFallback(
      nanoModels(false),
      [
        { role: "system", content: SPELL_SYSTEM },
        { role: "user", content: local.original },
      ],
      { temperature: 0.1, maxTokens: 160 },
    );
    const match = result.text.match(/\{[\s\S]*\}/);
    const parsed = match ? (JSON.parse(match[0]) as { corrected?: string }) : {};
    const nano = proposeSpokenLine(parsed.corrected ?? "").corrected;
    if (nano && similarEnough(local.original, nano)) {
      return {
        original: local.original,
        corrected: nano,
        changed: local.original !== nano,
      };
    }
  } catch {
    // Local proposal is enough.
  }
  return local;
}
