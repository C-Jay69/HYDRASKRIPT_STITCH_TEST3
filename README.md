HydraSkript 🚀
AI-Powered Book-Writing Platform
Generate consistent, full-length novels with "Story Bible" continuity enforcement, audiobook export, and credit-gated queues.

[ [ [ [

Role: Senior Full-Stack Engineer & AI Architect
Status: Technical Specification & Implementation Blueprint

🎯 Project Objective
Build a robust, scalable backend for HydraSkript—an AI platform that generates full books with enforced narrative continuity, real-time progress tracking, audiobook export, and a credit-based economy. Frontend powered by Next.js/Tailwind with Framer Motion animations.

🛠 Core Tech Stack
Layer	Technology	Purpose
Frontend	Next.js (App Router), Tailwind CSS, Framer Motion	UI, animations, real-time screens
Backend/DB	Supabase (PostgreSQL + Auth), Redis	Auth, data, generation queues
AI	LangChain/LangGraph, OpenRouter (LLMs)	Multi-step story generation
Media	FAL.ai (covers), ElevenLabs/Gemini (TTS)	Art & audiobooks
Storage	Cloudflare R2 / AWS S3	PDFs, EPUBs, audio files
Payments	Stripe Connect	Credit purchases & author payouts
🗄 Data Schema (Prisma)
text
// prisma/schema.prisma
model Profile {
  id              String   @id @default(cuid())
  subscriptionTier SubscriptionTier
  creditBalance   Int      @default(0)
  universes       Universe[]
  styles          Style[]
}

model Universe {
  id              String   @id @default(cuid())
  ownerId         String
  globalLore      Json     // Story Bible lore
  globalCharacters Json    // Character states
  owner           Profile  @relation(fields: [ownerId], references: [id])
  books           Book[]
}

model Book {
  id            String   @id @default(cuid())
  universeId    String
  title         String
  targetLength  Int      // words
  genre         String
  styleId       String?
  currentStatus BookStatus
  universe      Universe @relation(fields: [universeId], references: [id])
  chapters      Chapter[]
}

model Chapter {
  id           String @id @default(cuid())
  bookId       String
  chapterIndex Int
  content      String // Generated text
  sequenceData Json   // Timeline/continuity data
  book         Book   @relation(fields: [bookId], references: [id])
}

model Style {
  id               String   @id @default(cuid())
  ownerId          String
  trainingDataRef  String?
  structureMetrics Json     // {sentenceLengthAvg, complexityScore}
  owner            Profile  @relation(fields: [ownerId], references: [id])
  books            Book[]
}

enum SubscriptionTier {
  Starter Author Publisher Studio
}
enum BookStatus {
  Draft Queued Generating Complete
}
🔧 Key Logic Modules
1. Logic Guard Engine (RAG Continuity Check)
Middleware that vector-searches the Story Bible before each chapter generation. Flags ContinuityError if character states diverge > threshold.

typescript
// app/api/generate-chapter/route.ts
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

export async function POST(req: Request) {
  const { bookId, chapterIndex, prompt } = await req.json();
  
  // RAG check against Story Bible
  const embeddings = new OpenAIEmbeddings();
  const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, {
    client: supabaseClient,
    tableName: "story_bible_vectors",
    queryName: "match_documents",
  });
  
  const results = await vectorStore.similaritySearch(prompt, 5);
  const continuityScore = calculateCosineSimilarity(results, prompt);
  
  if (continuityScore < 0.85) {
    throw new ContinuityError("Character state/location mismatch detected");
  }
  
  // Proceed with generation...
}
2. Credit-Gated Redis Queue
typescript
// lib/credit-queue.ts
import { createClient } from "redis";

const redis = createClient();
await redis.connect();

export async function enqueueGeneration(profileId: string, taskCost: number) {
  const credits = await getProfileCredits(profileId);
  if (credits < taskCost) throw new Error("Insufficient credits");
  
  await deductCredits(profileId, taskCost);
  await redis.lpush("generation_queue", JSON.stringify({ profileId, task: "full_book" }));
}
3. Sentence Rhythm Parser (Flow Visualizer)
typescript
// lib/sentence-rhythm.ts
export function analyzeRhythm(text: string) {
  const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
  return sentences.map(s => ({
    length: s.trim().split(/\s+/).length,
    lexicalDensity: calculateLexicalDensity(s),
  }));
}
4. Audiobook Chunker Service
Splits chapters → TTS API → stitches M4B with metadata.

🌐 API Routes Structure (Next.js App Router)
text
app/api/
├── auth/
│   ├── login/route.ts
│   └── credits/route.ts
├── generate/
│   ├── chapter/route.ts (POST)
│   ├── book/route.ts (POST - full book)
│   └── style/route.ts (POST - analyze/train)
├── queue/
│   └── status/[taskId]/route.ts (GET - WebSocket updates)
└── media/
    ├── audiobook/route.ts (POST)
    └── cover-art/route.ts (POST)
🚀 Integration Features
Real-time Progress: Supabase Realtime + WebSockets → "Interactive Hero" screen

Stripe Connect: USD → Credits + Author storefront payouts

Flow Visualizer: Sentence rhythm charts (recharts/d3)

Boutique Storefront: Published books with direct reader purchases

📋 Next Steps
✅ Deploy Supabase + Prisma migration

🔄 Implement Logic Guard middleware

🎨 Build "Generation Monitor" UI

🔊 Audiobook pipeline + metadata tagging

💳 Stripe Connect integration

🤝 Contributing
Fork & clone

pnpm install

pnpm dev

Submit PRs to main

Made with ❤️ for AI storytellers
