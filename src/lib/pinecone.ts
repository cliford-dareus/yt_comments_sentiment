"use server";

import { createClient } from "@supabase/supabase-js";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddingBatch } from "./embedding";

const BATCH_SIZE = 100;

const loadSupabaseToPinecone = async (file_name: string) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await supabase.storage
    .from("yt_comment_bucket")
    .download(file_name);

  if (error || !data) {
    console.error("Failed to download file for Pinecone:", error);
    return null;
  }

  const loader = new CSVLoader(data);
  const documents = (await loader.load()) as Document[];

  const docs = documents.map(({ pageContent, metadata }) => ({
    pageContent: pageContent.replace(/\n/g, " ").trim(),
    metadata,
  })) satisfies Document[];

  if (!docs.length) {
    console.warn("No documents found to embed");
    return null;
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitDocs = await textSplitter.splitDocuments(docs);

  try {
    const vectors: PineconeRecord[] = [];

    // Process in proper batches
    for (let i = 0; i < splitDocs.length; i += BATCH_SIZE) {
      const batch = splitDocs.slice(i, i + BATCH_SIZE);
      const embeddings = await getEmbeddingBatch(splitDocs, i);

      batch.forEach((doc, batchIndex) => {
        const values = embeddings[batchIndex];
        if (!values) return;

        vectors.push({
          id: `${convertToAscii(file_name)}_${crypto.randomUUID()}`,
          values,
          metadata: {
            ...doc.metadata,
            text: doc.pageContent,
            loc: JSON.stringify(doc.metadata?.loc ?? {}),
          },
        });
      });
    }

    if (!vectors.length) {
      console.warn("No vectors produced");
      return null;
    }

    const pinecone = await getPinconeClient();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    const namespace = index.namespace(convertToAscii(file_name));

    // Pinecone upsert has a limit; chunk if needed
    const UPSERT_BATCH = 100;
    for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
      await namespace.upsert(vectors.slice(i, i + UPSERT_BATCH));
    }

    return { status: "success", count: vectors.length };
  } catch (error) {
    console.error("Error loading to Pinecone:", error);
    return null;
  }
};

export const deleteVectorInPinecone = async ({
  file_name,
}: {
  file_name: string;
}) => {
  const pinecone = await getPinconeClient();
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

  try {
    // Delete the entire namespace for this file
    await index.namespace(convertToAscii(file_name)).deleteAll();
    return { status: "Success" };
  } catch (err) {
    console.error("Error deleting Pinecone namespace:", err);
    return null;
  }
};

export const getPinconeClient = async () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

export default loadSupabaseToPinecone;
