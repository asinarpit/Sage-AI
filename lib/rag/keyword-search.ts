import { supabase } from "@/lib/db/supabase";


export const keywordSearch = async (
  query: string,
  documentIds: string[],
  matchCount: number = 10
) => {
  
  const stopwords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "about", "between",
    "through", "after", "before", "above", "below", "up", "down", "out",
    "off", "over", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "each", "every",
    "both", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "because", "but", "and", "or", "if", "while", "what", "which", "who",
    "this", "that", "these", "those", "i", "me", "my", "we", "our",
    "you", "your", "he", "him", "his", "she", "her", "it", "its", "they",
    "them", "their",
  ]);

  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word));

  if (keywords.length === 0) return [];

  const searchPattern = keywords.map((k) => `%${k}%`);

  try {
    const orFilter = keywords
      .map((k) => `content.ilike.%${k}%`)
      .join(",");

    const { data, error } = await supabase
      .from("embeddings")
      .select("id, content, document_id")
      .or(orFilter)
      .in("document_id", documentIds)
      .limit(matchCount);

    if (error) {
      console.error("Keyword search error:", error);
      return [];
    }

    const scored = (data || []).map((chunk: any) => {
      const contentLower = (chunk.content || "").toLowerCase();
      let score = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(keyword, "gi");
        const matches = contentLower.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      return {
        ...chunk,
        keyword_score: score,
        search_type: "keyword" as const,
      };
    });

    return scored.sort((a, b) => b.keyword_score - a.keyword_score);
  } catch (err) {
    console.error("Keyword search failed:", err);
    return [];
  }
};
