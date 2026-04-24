/**
 * Post-processing script for GPT-generated articles.
 * Normalizes markdown to a consistent format regardless of GPT quirks.
 *
 * Runs AFTER article generation, BEFORE rendering in the editor.
 */
export function normalizeArticle(md: string): string {
  let text = md;

  // ── 1. Clean heading word-count hints: "## Title (~200 palavras)" → "## Title"
  text = text.replace(/^(#{1,3}\s+.+?)\s*\(~?\d+\s*palavras?\)/gim, "$1");

  // ── 2. Normalize FAQ questions to ### format
  // Catches: *"Question?"*, **"Question?"**, **Question?**, *Question?*, "Question?"
  text = text.replace(/^(\*{1,2})"?([^*\n]+\?)"?\1$/gm, "### $2");
  // Catches: standalone quoted questions like "Question?" on their own line
  text = text.replace(/^"([^"\n]+\?)"$/gm, "### $1");
  // Catches: bold questions without asterisks wrapping: **Question?**
  text = text.replace(/^\*\*([^*\n]+\?)\*\*$/gm, "### $1");

  // ── 3. Ensure headings have blank line before them (except at start)
  text = text.replace(/([^\n])\n(#{1,3}\s)/g, "$1\n\n$2");

  // ── 4. Ensure headings have blank line after them
  text = text.replace(/(#{1,3}\s+[^\n]+)\n([^#\n])/g, "$1\n\n$2");

  // ── 5. Normalize list markers: "* item" → "- item"
  text = text.replace(/^\*\s+(?=[^\*])/gm, "- ");

  // ── 6. Enforce max 3 sentences per paragraph
  // Split on double newlines (paragraph boundaries), process each
  const blocks = text.split(/\n{2,}/);
  const processed = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return "";

    // Skip headings, images, lists
    if (trimmed.startsWith("#") || trimmed.startsWith("!") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      return trimmed;
    }

    // Count sentences (rough: split on ". " followed by uppercase, or "? " or "! ")
    const sentences = trimmed.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÃÕÇ])/);

    if (sentences.length <= 3) return trimmed;

    // Split into groups of 3 sentences
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 3) {
      paragraphs.push(sentences.slice(i, i + 3).join(" "));
    }
    return paragraphs.join("\n\n");
  });

  text = processed.filter(Boolean).join("\n\n");

  // ── 7. Collapse 3+ consecutive newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  // ── 8. Remove trailing whitespace from lines
  text = text.replace(/[ \t]+$/gm, "");

  // ── 9. Ensure single newline at end
  text = text.trim() + "\n";

  return text;
}
