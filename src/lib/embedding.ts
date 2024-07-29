import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Document } from "langchain/document";

const BATCH_SIZE = 100;

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "embedding-001", // 768 dimensions
  // taskType: TaskType.RETRIEVAL_DOCUMENT,
  // title: "Document title",
});

const getEmbedding = async (
  splitDocs: Document<Record<string, any>>[],
  index: number,
) => {
  const batch = splitDocs.slice(index, index + BATCH_SIZE);
  const emb = await embeddings.embedDocuments(
    batch.map((doc) => doc.pageContent),
  );
  return emb;
};

export default getEmbedding;
