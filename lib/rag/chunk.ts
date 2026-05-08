const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 100;

export const chunkText = (text: string) => {
  const chunks: string[] = [];

  let start = 0;

  while (start < text.length) {
    const end = start + CHUNK_SIZE;

    const chunk = text.slice(start, end);
    chunks.push(chunk);

    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
};