import { supabase } from "@/lib/db/supabase";
import { generateEmbedding } from "@/lib/ai/embedding";
import { keywordSearch } from "@/lib/rag/keyword-search";
import { rerankChunks } from "@/lib/rag/rerank";

interface RetrievedChunk {
  id?: string;
  content: string;
  document_id: string;
  similarity?: number;
  keyword_score?: number;
  rerank_score?: number;
  search_type?: string;
  [key: string]: any;
}

//vector search using embedding and supabase rpc
const vectorSearch = async (
  query: string,
  documentIds: string[],
  matchCount: number = 10
): Promise<RetrievedChunk[]> => {
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_document_ids: documentIds,
  });

  if (error) {
    console.error("Vector search error:", error);
    //falback - trying with single doc id
    if (documentIds.length > 0) {
      const { data: fallbackData } = await supabase.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        doc_id: documentIds[0],
      });
      return (fallbackData || []).map((c: any) => ({
        ...c,
        search_type: "vector",
      }));
    }
    return [];
  }

  return (data || []).map((c: any) => ({
    ...c,
    search_type: "vector",
  }));
};


//  merge results from vector and keyword search.
//  de duplication

const mergeResults = (
  vectorResults: RetrievedChunk[],
  keywordResults: RetrievedChunk[]
): RetrievedChunk[] => {
  const merged = new Map<string, RetrievedChunk>();


  for (const chunk of vectorResults) {
    const key = (chunk.content || "").substring(0, 100);
    merged.set(key, {
      ...chunk,
      search_type: "vector",
    });
  }

  // Merge keyword results - if already exists, mark as hybrid 
  for (const chunk of keywordResults) {
    const key = (chunk.content || "").substring(0, 100);
    if (merged.has(key)) {
      const existing = merged.get(key)!;
      merged.set(key, {
        ...existing,
        search_type: "hybrid", //found by both
        keyword_score: chunk.keyword_score,
      });
    } else {
      merged.set(key, chunk);
    }
  }

  // Sort: hybrid first, then by similarity/keyword score
  const results = Array.from(merged.values());
  results.sort((a, b) => {
    if (a.search_type === "hybrid" && b.search_type !== "hybrid") return -1;
    if (b.search_type === "hybrid" && a.search_type !== "hybrid") return 1;
    return (b.similarity || 0) - (a.similarity || 0);
  });

  return results;
};

// removing near duplicate chunks
const optimizeContext = (
  chunks: RetrievedChunk[],
  maxChunks: number = 6,
  maxCharsPerChunk: number = 1500
): RetrievedChunk[] => {
  const optimized: RetrievedChunk[] = [];
  const seenContent = new Set<string>();

  for (const chunk of chunks) {
    if (optimized.length >= maxChunks) break;

    const contentFingerprint = (chunk.content || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 200);

    if (seenContent.has(contentFingerprint)) continue;
    seenContent.add(contentFingerprint);


    optimized.push({
      ...chunk,
      content: (chunk.content || "").substring(0, maxCharsPerChunk),
    });
  }

  return optimized;
};

//advanced hybrid search
export const searchSimilarChunks = async (
  query: string,
  documentIds: string[],
  options?: {
    enableRerank?: boolean;
    topK?: number;
  }
) => {
  const { enableRerank = true, topK = 5 } = options || {};

  //parallel search
  const [vectorResults, kwResults] = await Promise.all([
    vectorSearch(query, documentIds, 10),
    keywordSearch(query, documentIds, 10),
  ]);

  console.log(
    `[RAG] Vector: ${vectorResults.length} results, Keyword: ${kwResults.length} results`
  );

  // merge and de duplication
  const merged = mergeResults(vectorResults, kwResults);
  console.log(
    `[RAG] Merged: ${merged.length} unique chunks (${
      merged.filter((c) => c.search_type === "hybrid").length
    } hybrid matches)`
  );

  // reranking using llm
  let ranked: RetrievedChunk[];
  if (enableRerank && merged.length > topK) {
    ranked = await rerankChunks(query, merged, topK);
    console.log(`[RAG] Re-ranked: top ${ranked.length} chunks selected`);
  } else {
    ranked = merged.slice(0, topK);
  }

  const optimized = optimizeContext(ranked);
  console.log(`[RAG] Final context: ${optimized.length} chunks`);

  return optimized;
};