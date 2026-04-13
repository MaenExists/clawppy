import { Env } from "../types";

const OPENCODE_ZEN_URL = "https://opencode.ai/zen/v1/chat/completions";

interface OpenCodeMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenCodeRequest {
  model: string;
  messages: OpenCodeMessage[];
  temperature: number;
  max_tokens: number;
}

interface OpenCodeResponse {
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

// Use OpenCode Zen with MiniMax M2.5
export async function callAI(prompt: string, env: Env, temperature: number = 0.7): Promise<string> {
  const apiKey = env.OPENCODE_API_KEY;
  
  if (!apiKey) {
    // Return fallback response instead of error
    console.warn("OpenCode API key not configured, using fallback");
    return getFallbackResponse(prompt);
  }

  const request: OpenCodeRequest = {
    model: "minimax-m2.5",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature,
    max_tokens: 2048
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(OPENCODE_ZEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenCode API error:", response.status, errorText);
      // Return fallback instead of throwing
      return getFallbackResponse(prompt);
    }

    const data: OpenCodeResponse = await response.json();
    
    if (data.error) {
      console.error("OpenCode error:", data.error);
      return getFallbackResponse(prompt);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return getFallbackResponse(prompt);
    }

    return text;
  } catch (error: any) {
    console.error("Failed to call OpenCode:", error.message);
    return getFallbackResponse(prompt);
  }
}

// Fallback responses when AI is unavailable
function getFallbackResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("socratic") || lower.includes("question")) {
    return "That's a great question! Let me ask you this: What do you think happens when you push an object?";
  }
  
  if (lower.includes("teach") || lower.includes("explain")) {
    return "Let me explain! Think of force like a push or pull. When you push a shopping cart, it moves because you're applying force to it. The more force you apply, the faster it moves!";
  }
  
  if (lower.includes("quiz")) {
    return "1. What is Force equals?\n   a) mass × acceleration\n   b) mass + acceleration\n   c) mass / acceleration\n   d) mass - acceleration";
  }
  
  if (lower.includes("feynman")) {
    return "Great try! Try explaining it like you're teaching a 10-year-old: 'Force is like a push or pull that makes things move or stop. When you kick a ball, you're putting force on it!'";
  }
  
  return "I'm here to help you learn! Let's explore this together.";
}

// Alias for backward compatibility
export const callGemini = callAI;

// Socratic prompting - never give direct answers
export function buildSocraticPrompt(
  userMessage: string,
  topic: string,
  userPriorKnowledge: string | null
): string {
  return `You are Clawppy, an AI tutor for Indian students (Grades 9-12, NEET/JEE prep).

CORE RULE: Never give direct answers. Always teach through questions.

Current topic: ${topic}

${userPriorKnowledge ? `Student's prior knowledge: ${userPriorKnowledge}` : ""}

Student asks: "${userMessage}"

Respond with a Socratic question that:
1. Connects to what they might already know
2. Breaks the problem into smaller pieces
3. Guides them to discover the answer themselves

Keep it short (1-2 sentences), friendly, and in Hindi-English mix if appropriate.
Response in English.`;
}

// Build confidence calibration quiz prompt
export function buildConfidenceQuizPrompt(topic: string, concepts: string[]): string {
  return `Generate 3 quick quiz questions to check understanding of "${topic}".

Concepts to test: ${concepts.join(", ")}

Format as JSON array:
[
  {
    "question": "question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correctIndex": 0,
    "explanation": "brief explanation"
  }
]

Only return the JSON, no other text. Questions should be conceptual (not just recall).`;
}

// Feynman evaluation prompt
export function buildFeynmanPrompt(concept: string, userExplanation: string): string {
  return `You are evaluating a student's ability to explain a concept simply (Feynman technique).

Concept: ${concept}

Student's explanation:
"${userExplanation}"

Evaluate based on:
1. Simplicity (no jargon, easy to understand)
2. Core concepts present (accuracy)
3. Gaps or misconceptions

Respond in JSON:
{
  "score": 0-100,
  "feedback": "specific feedback on what's good and what's missing",
  "missingConcepts": ["concept1", "concept2"],
  "passed": true/false
}

Only return JSON.`;
}

// Teaching prompt after quiz
export function buildTeachingPrompt(topic: string, userAttempt: string, gaps: string[]): string {
  return `Teach the concept of "${topic}" to a student.

The student tried: "${userAttempt}"

Known gaps to address: ${gaps.join(", ")}

Rules:
1. Start from what they already know
2. Build up gradually
3. Use simple examples
4. At the end, ask "Does this make sense?"
5. Do NOT give the final answer to any problem - let them work through it

Keep explanation under 150 words.
Use Hindi-English mix if it helps understanding.`;
}

// Generate practice questions
export function buildPracticePrompt(subject: string, topic: string, count: number = 5): string {
  return `Generate ${count} practice questions for ${subject} - ${topic}.

Include:
- 2 easy questions (conceptual)
- 2 medium questions (application)
- 1 hard question (analysis)

Format as numbered list with options (a, b, c, d).
Include answer key at the end.
Mark the correct answer with *.`;
}

// Knowledge map generation
export function buildKnowledgeMapPrompt(topics: any[]): string {
  return `Generate a knowledge map for the student based on their topic progress.

Topics:
${topics.map(t => `- ${t.topic} (${t.subject}): score ${t.masteryScore}%, status ${t.status}, false confidence: ${t.falseConfidenceDetected}`).join("\n")}

Format as:
📚 YOUR KNOWLEDGE MAP

✅ MASTERED (score > 85%)
- topic1
- topic2

🟡 LEARNING (score 50-85%)
- topic3

🔴 NEEDS WORK (score < 50%)
- topic4

⚠️ FALSE CONFIDENCE DETECTED
- topic5 (rated high but scored low)

Total topics: X | Streak: Y days
`;
}