import { Pinecone } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbedding } from "./embedding";

export const getMatchesFromEmbeddings = async (
  embeddings: number[],
  file_name: string,
) => {
  try {
    const client = new Pinecone({
      // environment: process.env.PINECONE_ENVIRONMENT!,
      apiKey: process.env.PINECONE_API_KEY!,
    });
    const pineconeIndex = await client.index(process.env.PINECONE_INDEX_NAME!);
    const namespace = pineconeIndex.namespace(convertToAscii(file_name));
    const queryResult = await namespace.query({
      topK: 10,
      vector: embeddings,
      includeMetadata: true,
    });
    return queryResult.matches || [];
  } catch (error) {
    console.log("error querying embeddings", error);
    throw error;
  }
};

export const getContext = async (query: string, file_name: string) => {
  const queryEmbeddings = await getEmbedding(query);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings!, file_name);

  const qualifyingDocs = matches.filter(
    (match) => match.score && match.score > 0.7,
  );

  type Metadata = {
    text: string;
    pageNumber: number;
  };

  let docs = qualifyingDocs.map((match) => (match.metadata as Metadata).text);
  // 5 vectors
  return docs.join("\n").substring(0, 3000);
};
