import { convertToAscii } from "./utils";
import { getEmbedding } from "./embedding";
import { getPinconeClient } from "./pinecone";

export const getMatchesFromEmbeddings = async (
  embeddings: number[],
  file_name: string,
) => {
  try {
    const client = await getPinconeClient();
    const pineconeIndex = client.index(process.env.PINECONE_INDEX_NAME!);
    const namespace = pineconeIndex.namespace(convertToAscii(file_name));
    const queryResult = await namespace.query({
      topK: 10,
      vector: embeddings,
      includeMetadata: true,
    });
    return queryResult.matches || [];
  } catch (error) {
    console.error("error querying embeddings", error);
    throw error;
  }
};

export const getContext = async (query: string, file_name: string) => {
  const queryEmbeddings = await getEmbedding(query);

  if (!queryEmbeddings) {
    return "";
  }

  const matches = await getMatchesFromEmbeddings(queryEmbeddings, file_name);

  const qualifyingDocs = matches.filter(
    (match) => match.score && match.score > 0.7,
  );

  type Metadata = {
    text: string;
    pageNumber?: number;
  };

  const docs = qualifyingDocs.map(
    (match) => (match.metadata as Metadata)?.text ?? "",
  );

  return docs.join("\n").substring(0, 3000);
};
