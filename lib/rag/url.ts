export const fetchUrlContent = async (url: string) => {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FIRECRAWLER_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true, //for cleaner rag data
    }),
  });


  if (!res.ok) {
    throw new Error("Failed to fetch URL content");
  }

  const data = await res.json();

  return data.data?.markdown || "";
};