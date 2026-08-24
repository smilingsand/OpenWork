const quoteCharacters = /["'“”‘’＂＇]/g;

function formatKeyword(terms) {
  return terms.map((term) => term.phrase ? `"${term.value}"` : term.value).join(" ");
}

/**
 * OpenWork 关键词语法：空白分隔关键词；含空白的单个关键词必须用引号包围。
 * 所有允许的单双引号均先统一为 ASCII 双引号，最终查询串统一为小写。
 */
export function normalizeKeywordInput(value, maxLength = 120) {
  const input = String(value ?? "")
    .replace(quoteCharacters, "\"")
    .toLocaleLowerCase("zh-CN")
    .trim();
  if (!input) throw new Error("请输入职业关键词");
  if (input.length > maxLength) throw new Error(`职业关键词最多 ${maxLength} 个字符`);

  const terms = [];
  let cursor = 0;
  while (cursor < input.length) {
    while (/\s/.test(input[cursor] || "")) cursor += 1;
    if (cursor >= input.length) break;
    const quoted = input[cursor] === "\"";
    if (quoted) {
      const end = input.indexOf("\"", cursor + 1);
      if (end < 0) throw new Error("关键词中的引号未闭合");
      const phrase = input.slice(cursor + 1, end).trim().replace(/\s+/g, " ");
      if (!phrase) throw new Error("引号中必须包含关键词");
      terms.push({ value: phrase, phrase: true });
      cursor = end + 1;
      if (cursor < input.length && !/\s/.test(input[cursor])) throw new Error("关键词之间请使用空格分隔");
      continue;
    }

    const nextQuote = input.indexOf("\"", cursor);
    const nextWhitespace = input.slice(cursor).search(/\s/);
    const end = nextWhitespace < 0 ? input.length : cursor + nextWhitespace;
    if (nextQuote >= cursor && nextQuote < end) throw new Error("引号必须包围完整关键词");
    const token = input.slice(cursor, end);
    if (token) terms.push({ value: token, phrase: false });
    cursor = end;
  }
  if (!terms.length) throw new Error("请输入职业关键词");
  return { keyword: formatKeyword(terms), terms };
}

export function keywordTerms(value) {
  return normalizeKeywordInput(value).terms;
}

/** LinkedIn 的 keywords 参数使用显式 AND 连接每个规范化关键词。 */
export function toLinkedInKeywords(valueOrTerms) {
  const terms = Array.isArray(valueOrTerms) ? valueOrTerms : keywordTerms(valueOrTerms);
  return terms.map((term) => term.phrase ? `"${term.value}"` : term.value).join(" AND ");
}
