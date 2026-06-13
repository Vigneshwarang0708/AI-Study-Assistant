import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import dns from "dns";

// Support Node standard port 3000
const PORT = 3000;
const app = express();

// Set system DNS to avoid resolving issues if any
dns.setDefaultResultOrder("ipv4first");

// Increase payload sizes for large PDFs and base64 audio
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS middleware for external deployments (e.g. Vercel)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, user-email, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Configure Upload Middleware (limit to 50MB)
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});

// Create persistent folders if they don't exist
const VERCEL_ENV = process.env.VERCEL ? true : false;
const DATA_DIR_SRC = path.join(process.cwd(), "data");
const DATA_DIR = VERCEL_ENV ? path.join("/tmp", "data") : DATA_DIR_SRC;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Simple Local DB utilities
const DB_PATHS = {
  users: path.join(DATA_DIR, "users.json"),
  documents: path.join(DATA_DIR, "documents.json"),
  summaries: path.join(DATA_DIR, "summaries.json"),
  quizzes: path.join(DATA_DIR, "quizzes.json"),
  flashcards: path.join(DATA_DIR, "flashcards.json"),
  analytics: path.join(DATA_DIR, "analytics.json"),
  chats: path.join(DATA_DIR, "chats.json"),
};

// Initialize DB files & copy pre-seeded items for Vercel
Object.entries(DB_PATHS).forEach(([key, filePath]) => {
  if (VERCEL_ENV) {
    const srcPath = path.join(DATA_DIR_SRC, `${key}.json`);
    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(srcPath)) {
        try {
          fs.copyFileSync(srcPath, filePath);
        } catch (e) {
          fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
        }
      } else {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      }
    }
  } else {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
    }
  }
});

function readDb(key: keyof typeof DB_PATHS): any {
  try {
    const raw = fs.readFileSync(DB_PATHS[key], "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading database ${key}:`, err);
    return {};
  }
}

function writeDb(key: keyof typeof DB_PATHS, data: any): void {
  try {
    fs.writeFileSync(DB_PATHS[key], JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error writing database ${key}:`, err);
  }
}

// Lazy Gemini Client initialization (avoids crash on startup if key missing)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel in AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Chunking helper for RAG context
function chunkText(text: string, chunkSize = 1500, overlap = 300): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

// Relevance search helper based on user queries
function findRelevantChunks(query: string, chunks: string[], topK = 5): string[] {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (queryTerms.length === 0) {
    return chunks.slice(0, topK);
  }

  const chunkScores = chunks.map((chunk, index) => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;
    queryTerms.forEach((term) => {
      const regex = new RegExp(term, "g");
      const count = (chunkLower.match(regex) || []).length;
      score += count;
    });
    return { chunk, score, index };
  });

  // Sort descending by score, and only return scores above 0 (fallback to top slice if nothing matches)
  chunkScores.sort((a, b) => b.score - a.score);
  const relevantList = chunkScores.filter((c) => c.score > 0);
  if (relevantList.length === 0) {
    return chunks.slice(0, topK);
  }
  return relevantList.slice(0, topK).map((c) => c.chunk);
}

// Learning analytics stats update
function trackActivity(email: string, type: string, docName: string, description: string) {
  const analytics = readDb("analytics");
  const userStats = analytics[email] || {
    streak: 0,
    lastActive: "",
    totalMinutes: 0,
    totalQuizzesTaken: 0,
    averageQuizScore: 0,
    flashcardsLearnedCount: 0,
    recentActivity: [],
  };

  const today = new Date().toISOString().split("T")[0];
  if (userStats.lastActive !== today) {
    if (userStats.lastActive) {
      const lastActiveDate = new Date(userStats.lastActive);
      const diffTime = Math.abs(new Date(today).getTime() - lastActiveDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        userStats.streak += 1;
      } else if (diffDays > 1) {
        userStats.streak = 1;
      }
    } else {
      userStats.streak = 1;
    }
    userStats.lastActive = today;
  }

  // Record active minutes
  userStats.totalMinutes += Math.floor(Math.random() * 5) + 2; // Simulated active studying minutes per action

  userStats.recentActivity.unshift({
    id: Math.random().toString(36).slice(2, 9),
    type,
    description,
    timestamp: new Date().toISOString(),
    documentName: docName,
  });

  // Keep max 20 events
  if (userStats.recentActivity.length > 20) {
    userStats.recentActivity = userStats.recentActivity.slice(0, 20);
  }

  analytics[email] = userStats;
  writeDb("analytics", analytics);
}


/* ==========================================================
   API ROUTES
   ========================================================== */

// 1. AUTHENTICATION API
app.post("/api/auth/signup", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const users = readDb("users");
  if (users[email.toLowerCase()]) {
    return res.status(400).json({ error: "User already exists with this email." });
  }

  users[email.toLowerCase()] = { name, password };
  writeDb("users", users);

  // Set default analytics
  const analytics = readDb("analytics");
  analytics[email.toLowerCase()] = {
    streak: 1,
    lastActive: new Date().toISOString().split("T")[0],
    totalMinutes: 0,
    totalQuizzesTaken: 0,
    averageQuizScore: 0,
    flashcardsLearnedCount: 0,
    recentActivity: [
      {
        id: "signup_act",
        type: "upload",
        description: "Created account",
        timestamp: new Date().toISOString(),
        documentName: "Initial Setup",
      },
    ],
  };
  writeDb("analytics", analytics);

  res.json({ email, name, isLoggedIn: true });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const users = readDb("users");
  const user = users[email.toLowerCase()];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  res.json({ email, name: user.name, isLoggedIn: true });
});

app.post("/api/auth/google", (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Google authentication payload missing." });
  }

  const users = readDb("users");
  if (!users[email.toLowerCase()]) {
    users[email.toLowerCase()] = { name, password: Math.random().toString(36) }; // Random pw for sign-in
    writeDb("users", users);
  }

  const user = users[email.toLowerCase()];
  res.json({ email, name: user.name, isLoggedIn: true });
});


// 2. DOCUMENT MANAGEMENT API
app.post("/api/docs/upload", upload.single("file"), async (req, res) => {
  try {
    const userEmail = req.headers["user-email"] as string || "anonymous";
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Invalid file format. Only PDF files are supported." });
    }

    // Parse PDF
    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();

    const docId = Math.random().toString(36).slice(2, 11);
    const docName = req.file.originalname;

    const documents = readDb("documents");
    documents[docId] = {
      id: docId,
      name: docName,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      textLength: result.text.length,
      text: result.text,
      user_email: userEmail,
    };
    writeDb("documents", documents);

    trackActivity(userEmail, "upload", docName, `Uploaded document "${docName}"`);

    // Return the document info (omitting the full raw text in summary)
    res.json({
      id: docId,
      name: docName,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      textLength: result.text.length,
    });
  } catch (err: any) {
    console.error("PDF Parse error:", err);
    res.status(500).json({ error: `Failed to process PDF: ${err.message}` });
  }
});

app.get("/api/docs", (req, res) => {
  const userEmail = req.headers["user-email"] as string || "anonymous";
  const docs = readDb("documents");
  
  // Filter by user email
  const docMetadataList = Object.values(docs)
    .filter((d: any) => d.user_email === userEmail)
    .map((d: any) => ({
      id: d.id,
      name: d.name,
      size: d.size,
      uploadedAt: d.uploadedAt,
      textLength: d.textLength,
    }));

  res.json(docMetadataList);
});

app.delete("/api/docs/:id", (req, res) => {
  const { id } = req.params;
  const userEmail = req.headers["user-email"] as string || "anonymous";
  const docs = readDb("documents");

  if (!docs[id]) {
    return res.status(404).json({ error: "Document not found." });
  }

  const docName = docs[id].name;
  delete docs[id];
  writeDb("documents", docs);

  // Clean summaries, quizzes, flashcards
  const summaries = readDb("summaries");
  delete summaries[id];
  writeDb("summaries", summaries);

  const quizzes = readDb("quizzes");
  delete quizzes[id];
  writeDb("quizzes", quizzes);

  const flashcards = readDb("flashcards");
  delete flashcards[id];
  writeDb("flashcards", flashcards);

  trackActivity(userEmail, "upload", docName, `Deleted document "${docName}"`);

  res.json({ success: true, message: "Document removed successfully." });
});


// 3. AI STUDY INTEGRATION API (SUMMARIZE, QUIZ, FLASHCARDS, CHAT)

// Smart Summary Generator
app.post("/api/study/summarize", async (req, res) => {
  try {
    const { documentId } = req.body;
    const userEmail = req.headers["user-email"] as string || "anonymous";
    if (!documentId) {
      return res.status(400).json({ error: "Document ID is required." });
    }

    const docs = readDb("documents");
    const doc = docs[documentId];
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    const summaries = readDb("summaries");
    if (summaries[documentId]) {
      return res.json(summaries[documentId]);
    }

    // Lazy load Gemini
    const ai = getGeminiClient();

    // Prepare content (truncate to avoid token sizing if extremely huge, normal size works directly with model)
    const contentText = doc.text.slice(0, 80000);

    const prompt = `
      Create a highly structured study plan and summarize the following study material. 
      You MUST generate results strictly conformant to the requested JSON response schema.

      Study Material Content:
      ---
      ${contentText}
      ---
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert academic curriculum designer and summary generator. Take study notes or textbooks and output extremely detailed, accurate summaries includingshort summary, detailed summary, key concepts, detailed definitions, important exam notes, and core formulas (with details and explanation). Generate all fields based on the provided material.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shortSummary: {
              type: Type.STRING,
              description: "A solid, high-level (3-4 sentences) executive summary of the content.",
            },
            detailedSummary: {
              type: Type.STRING,
              description: "An elaborately styled, comprehensive deep-dive detailed study summary (can use bullet points and subsections).",
            },
            keyConcepts: {
              type: Type.ARRAY,
              description: "Core key concepts explained in detail.",
              items: {
                type: Type.OBJECT,
                properties: {
                  concept: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ["concept", "explanation"],
              },
            },
            definitions: {
              type: Type.ARRAY,
              description: "Key terminology definitions or vocabulary keywords.",
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                },
                required: ["term", "definition"],
              },
            },
            examNotes: {
              type: Type.ARRAY,
              description: "Important high-yield exam notes, crucial hints, or study tips.",
              items: { type: Type.STRING },
            },
            formulas: {
              type: Type.ARRAY,
              description: "Core algebraic / physical formulas or equations found in the context. Leave empty if there are none.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the formula/equation." },
                  formula: { type: Type.STRING, description: "LaTeX or text representation of the mathematical formula." },
                  description: { type: Type.STRING, description: "Detailed description of parts and applications." },
                },
                required: ["name", "formula", "description"],
              },
            },
          },
          required: ["shortSummary", "detailedSummary", "keyConcepts", "definitions", "examNotes", "formulas"],
        },
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Empty response generated by Gemini.");
    }

    const summaryObj = JSON.parse(outputText);
    summaryObj.documentId = documentId;

    summaries[documentId] = summaryObj;
    writeDb("summaries", summaries);

    trackActivity(userEmail, "summary", doc.name, `Generated summary for "${doc.name}"`);

    res.json(summaryObj);
  } catch (err: any) {
    console.error("AI Summarize error:", err);
    res.status(500).json({ error: `AI summarization failed: ${err.message}` });
  }
});

// Smart Quiz Generator
app.post("/api/study/quiz", async (req, res) => {
  try {
    const { documentId } = req.body;
    const userEmail = req.headers["user-email"] as string || "anonymous";
    if (!documentId) {
      return res.status(400).json({ error: "Document ID is required." });
    }

    const docs = readDb("documents");
    const doc = docs[documentId];
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    const quizzes = readDb("quizzes");
    if (quizzes[documentId]) {
      return res.json(quizzes[documentId]);
    }

    const ai = getGeminiClient();
    const contentText = doc.text.slice(0, 60000);

    const prompt = `
      Analyze the study material below and generate a balanced, fully comprehensive quiz.
      The quiz MUST contain 5 Multiple Choice Questions (mcq), 3 True/False questions (tf), and 2 Fill in the Blanks questions (blank).
      For MCQ questions, options MUST be an array of exactly 4 strings.
      For TF questions, the correctAnswer MUST be specifically "true" or "false".
      Include detailed, friendly educational explanation for every question.
      
      Study material:
      ---
      ${contentText}
      ---
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert exam designer. Task: Create the academic quiz content in structured JSON as requested. Every question must have an ID, type, question body, correctAnswer, and comprehensive explanation.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique question ID like q1, q2, etc." },
              type: { type: Type.STRING, description: "Must be 'mcq', 'tf', or 'blank'." },
              question: { type: Type.STRING, description: "The quiz question itself." },
              options: {
                type: Type.ARRAY,
                description: "List of 4 candidate options. Only valid and required for MCQ types.",
                items: { type: Type.STRING },
              },
              correctAnswer: { type: Type.STRING, description: "For mcq, exact matching option string. For tf, 'true' or 'false'. For blank, exact direct keyword/phrase response." },
              explanation: { type: Type.STRING, description: "Thorough explanation of why the answer is correct." },
            },
            required: ["id", "type", "question", "correctAnswer", "explanation"],
          },
        },
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Empty response generated by Gemini.");
    }

    const quizQuestions = JSON.parse(outputText);
    quizzes[documentId] = quizQuestions;
    writeDb("quizzes", quizzes);

    trackActivity(userEmail, "quiz", doc.name, `Generated a 10-question study quiz on "${doc.name}"`);

    res.json(quizQuestions);
  } catch (err: any) {
    console.error("AI Quiz error:", err);
    res.status(500).json({ error: `AI quiz generation failed: ${err.message}` });
  }
});

// Flashcard Generator
app.post("/api/study/flashcards", async (req, res) => {
  try {
    const { documentId } = req.body;
    const userEmail = req.headers["user-email"] as string || "anonymous";
    if (!documentId) {
      return res.status(400).json({ error: "Document ID is required." });
    }

    const docs = readDb("documents");
    const doc = docs[documentId];
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    const flashcardsDb = readDb("flashcards");
    if (flashcardsDb[documentId]) {
      return res.json(flashcardsDb[documentId]);
    }

    const ai = getGeminiClient();
    const contentText = doc.text.slice(0, 60000);

    const prompt = `
      Identify the 10 most crucial, high-yield learning concepts, terminologies, or core questions from the text below, and generate a deck of flashcards.
      Each flashcard must contain an id, a clear and challenging question, and a detailed, easy-to-remember explanatory answer. Set 'learned' to false by default.

      Study material:
      ---
      ${contentText}
      ---
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional deck builder for study systems like Anki. Your job is to create smart, active-recall flashcard questions and answers in JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
              learned: { type: Type.BOOLEAN },
            },
            required: ["id", "question", "answer", "learned"],
          },
        },
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Empty response generated by Gemini.");
    }

    const cards = JSON.parse(outputText);
    flashcardsDb[documentId] = cards;
    writeDb("flashcards", flashcardsDb);

    trackActivity(userEmail, "flashcard", doc.name, `Generated 10 flashcards for "${doc.name}"`);

    res.json(cards);
  } catch (err: any) {
    console.error("AI Flashcard error:", err);
    res.status(500).json({ error: `Flashcard generation failed: ${err.message}` });
  }
});

// Update Flashcard Status
app.post("/api/study/flashcards/update", (req, res) => {
  const { documentId, cardId, learned } = req.body;
  const userEmail = req.headers["user-email"] as string || "anonymous";
  if (!documentId || !cardId) {
    return res.status(400).json({ error: "Document ID and Card ID are required." });
  }

  const flashcardsDb = readDb("flashcards");
  if (!flashcardsDb[documentId]) {
    return res.status(404).json({ error: "Flashcards not found for this document." });
  }

  flashcardsDb[documentId] = flashcardsDb[documentId].map((card: any) => {
    if (card.id === cardId) {
      return { ...card, learned };
    }
    return card;
  });

  writeDb("flashcards", flashcardsDb);

  // Update learner analytics counter
  if (learned) {
    const analytics = readDb("analytics");
    if (analytics[userEmail]) {
      analytics[userEmail].flashcardsLearnedCount = (analytics[userEmail].flashcardsLearnedCount || 0) + 1;
      writeDb("analytics", analytics);
    }
    const docs = readDb("documents");
    const docName = docs[documentId]?.name || "Document";
    trackActivity(userEmail, "flashcard", docName, `Marked flashcard in "${docName}" as Learned`);
  }

  res.json({ success: true, cards: flashcardsDb[documentId] });
});

// Chat with PDF (RAG Implementation)
app.post("/api/study/chat", async (req, res) => {
  try {
    const { documentId, message, chatHistory = [] } = req.body;
    const userEmail = req.headers["user-email"] as string || "anonymous";

    if (!documentId || !message) {
      return res.status(400).json({ error: "Document ID and message prompt are required." });
    }

    const docs = readDb("documents");
    const doc = docs[documentId];
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    // Lazy load Gemini
    const ai = getGeminiClient();

    // 1. Text Chunking for RAG
    const chunks = chunkText(doc.text, 1500, 300);

    // 2. Simple Similarity Match
    const relevantChunks = findRelevantChunks(message, chunks, 5);
    const contextText = relevantChunks.join("\n\n---\n\n");

    // 3. Construct Chat History Array
    const queryHistoryPrompt = chatHistory
      .slice(-6) // Take last 6 messages
      .map((m: any) => `${m.role === "user" ? "Student" : "Assistant"}: ${m.content}`)
      .join("\n");

    const prompt = `
      You are an expert academic AI Study Buddy.
      The student is asking a question about the document '${doc.name}'.
      You MUST formulate your response ONLY using the extracted contextual document chunks listed below.
      If the answer is NOT present or cannot be inferred from the context context, state nicely that you cannot find this in the document, but do not make up any answers.
      Provide detailed, complete answers, formatting with clean markdown bullet points where appropriate. Mention source references or contextual lines from the text where relevant.

      === DOCUMENT EXTRACT CONTEXT ===
      ${contextText}
      ================================

      === RECENT CHAT DIALOGUE ===
      ${queryHistoryPrompt}
      ============================

      Student Question: ${message}
      Study Buddy Response:
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite, patient AI Tutor who guides students. Answer questions precisely, referencing details from the text context, and support with educational summaries, steps, and key findings. Keep responses friendly and markdown-based.",
      },
    });

    const replyText = response.text || "I was unable to search this in the document text.";

    // Track active chat history database (for auditing if needed)
    const chats = readDb("chats");
    const docChats = chats[documentId] || [];
    docChats.push(
      { id: Math.random().toString(36).slice(2, 9), role: "user", content: message, timestamp: new Date().toISOString() },
      { id: Math.random().toString(36).slice(2, 9), role: "model", content: replyText, timestamp: new Date().toISOString(), sources: relevantChunks.map(c => c.slice(0, 150) + "...") }
    );
    chats[documentId] = docChats;
    writeDb("chats", chats);

    trackActivity(userEmail, "chat", doc.name, `Asked AI Study Buddy: "${message.slice(0, 45)}..."`);

    res.json({
      answer: replyText,
      sources: relevantChunks.map((chunk, idx) => `Segment ${idx + 1}: "... ${chunk.slice(0, 200).replace(/\s+/g, " ").trim()}..."`),
    });
  } catch (err: any) {
    console.error("AI Chat error:", err);
    res.status(500).json({ error: `AI Search & Chat failed: ${err.message}` });
  }
});

// AI Voice TTS Generation (Returns base64 audio to play)
app.post("/api/study/voice-tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text payload is required for Speech synthesization." });
    }

    const ai = getGeminiClient();

    // Limit text size for TTS limit
    const cleanText = text.replace(/[*#_\\`\-]/g, "").slice(0, 400);

    const promptText = `Please speak this study note clearly: ${cleanText}`;

    // Synthesize using gemini-3.1-flash-tts-preview
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" }, // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          },
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    let base64Audio = "";

    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Audio = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Audio) {
      throw new Error("No inline audio data generated by Gemini voice engine");
    }

    res.json({ base64Audio });
  } catch (err: any) {
    console.error("AI TTS error:", err);
    res.status(500).json({ error: `Audio voice synthesis failed: ${err.message}` });
  }
});

// Get User Analytics
app.get("/api/study/analytics", (req, res) => {
  const userEmail = req.headers["user-email"] as string || "anonymous";
  const analytics = readDb("analytics");
  const stats = analytics[userEmail] || {
    streak: 0,
    lastActive: "",
    totalMinutes: 0,
    totalQuizzesTaken: 0,
    averageQuizScore: 0,
    flashcardsLearnedCount: 0,
    recentActivity: [],
  };

  res.json(stats);
});

// Update Quiz Score
app.post("/api/study/quiz/score", (req, res) => {
  const { score, total, documentId } = req.body;
  const userEmail = req.headers["user-email"] as string || "anonymous";

  if (score === undefined || total === undefined) {
    return res.status(400).json({ error: "Score and total count are required." });
  }

  const docs = readDb("documents");
  const docName = docs[documentId]?.name || "Document Study";

  const analytics = readDb("analytics");
  const userStats = analytics[userEmail] || {
    streak: 0,
    lastActive: "",
    totalMinutes: 0,
    totalQuizzesTaken: 0,
    averageQuizScore: 0,
    flashcardsLearnedCount: 0,
    recentActivity: [],
  };

  const percentage = Math.round((score / total) * 100);
  
  // Calculate rolling quiz average
  const currentTotalQuizzes = userStats.totalQuizzesTaken || 0;
  const currentAvgScore = userStats.averageQuizScore || 0;
  
  const newTotalQuizzes = currentTotalQuizzes + 1;
  const newAvgScore = Math.round(((currentAvgScore * currentTotalQuizzes) + percentage) / newTotalQuizzes);

  userStats.totalQuizzesTaken = newTotalQuizzes;
  userStats.averageQuizScore = newAvgScore;

  analytics[userEmail] = userStats;
  writeDb("analytics", analytics);

  trackActivity(userEmail, "quiz", docName, `Completed Quiz on "${docName}" scored ${score}/${total} (${percentage}%)`);

  res.json({ success: true, stats: userStats });
});

/* ==========================================================
   VITE MIDDLEWARE AND SPA FALLBACK
   ========================================================== */

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
    console.log("Vite development server middleware integrated.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
      console.log("Serving compiled production files from:", distPath);
    } else {
      console.warn("Production 'dist' build directory does not exist yet. Ensure to run npm run build before running node startServer.");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Study Buddy server strictly listening on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
