"use server";

import { createClient } from "@supabase/supabase-js";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddingBatch } from "./embedding";

const loadSupabaseToPinecone = async (file_name: string) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Download the file from supabase
  const { data, error } = await supabase.storage
    .from("yt_comment_bucket")
    .download(file_name);

  if (error) return;

  // Load the file with langchain(maybe)
  const loader = new CSVLoader(data);
  const documents = (await loader.load()) as Document[];
  const docs = documents.map(({ pageContent, metadata, id }) => {
    return {
      id,
      metadata,
      pageContent: pageContent.replace(/\n/g, ""),
    };
  }) satisfies Document[];

  // Prepare the file (split or chunk)
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitDocs = await textSplitter.splitDocuments(docs);
  console.log(splitDocs);
  try {
    // Embed the chunks
    const vector = await Promise.all(
      splitDocs.map(async (doc, index) => {
        const embeddings = await getEmbeddingBatch(splitDocs, index);

        return {
          id: `${file_name}_${crypto.randomUUID()}`,
          values: embeddings[0],
          metadata: {
            ...doc.metadata,
            text: doc.pageContent,
            loc: JSON.stringify(doc.metadata.loc),
          },
        } as PineconeRecord;
      }),
    );

    // Create a pinecone client
    const pinecone = await getPinconeClient();

    // Initialize Pinecone index
    const index = await pinecone.index(process.env.PINECONE_INDEX_NAME!);
    const namespace = index.namespace(convertToAscii(file_name));
    // upsert the vector in pinecone
    await namespace.upsert(vector);
    return { status: "success" };
  } catch (error) {
    return null;
  }
};

const getPinconeClient = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

export default loadSupabaseToPinecone;
