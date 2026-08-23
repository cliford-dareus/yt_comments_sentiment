import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Document } from "langchain/document";
import { TaskType } from "@google/generative-ai";

const BATCH_SIZE = 100;

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "embedding-001", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
});

/**
 * Embed a slice of documents starting at `startIndex`.
 * Returns an array of embedding vectors corresponding to the batch.
 */
export const getEmbeddingBatch = async (
  splitDocs: Document<Record<string, any>>[],
  startIndex: number,
) => {
  const batch = splitDocs.slice(startIndex, startIndex + BATCH_SIZE);
  if (!batch.length) return [];

  const emb = await embeddings.embedDocuments(
    batch.map((doc) => doc.pageContent),
  );
  return emb;
};

export const getEmbedding = async (text: string) => {
  try {
    const query = text.replace(/\n/g, " ");
    return await embeddings.embedQuery(query);
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
};
