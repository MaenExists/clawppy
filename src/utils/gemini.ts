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
    type: string;
    message: string;
  };
}

// System prompt to define Clawppy's personality
const CLAWPPY_SYSTEM_PROMPT = `You are Clawppy, an elite AI tutor for Indian students (CBSE Class 9-12).

PERSONALITY:
- Friendly, encouraging, but academically rigorous.
- Use a "Hinglish" mix (Hindi + English) when it feels natural to make the student comfortable.
- Never give answers directly. Your goal is to make the student capable of solving the problem themselves.
- Use the Socratic method: Ask guiding questions.
- If a student is stuck, break the problem into smaller, manageable pieces.

CORE MISSION:
1. Identify "False Confidence" (when a student thinks they know something but have a conceptual gap).
2. Bridge "Blind Spots" (concepts they don't even know they are missing).
3. Use the Feynman technique to ensure deep mastery.

Always end your message with a clear call to action or a question for the student.`;

// Use MiniMax M2.5 Free via OpenCode Zen
export async function callAI(prompt: string, env: Env, temperature: number = 0.7): Promise<string> {
  const apiKey = env.OPENCODE_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenCode API key not configured - please set OPENCODE_API_KEY");
  }

  const request: OpenCodeRequest = {
    model: "minimax-m2.5-free",
    messages: [
      {
        role: "system",
        content: CLAWPPY_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature,
    max_tokens: 2048
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
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
      throw new Error(`OpenCode API error: ${response.status} - ${errorText}`);
    }

    const data: OpenCodeResponse = await response.json();
    
    if (data.error) {
      console.error("OpenCode error:", data.error);
      throw new Error(`OpenCode error: ${data.error.message}`);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("No response from OpenCode - empty response");
    }

    return text;
  } catch (error: any) {
    console.error("Failed to call OpenCode:", error.message);
    throw error;
  }
}

// Alias for backward compatibility
export const callGemini = callAI;

// Build onboarding introduction prompt
export function buildIntroPrompt(name: string): string {
  return `You are Clawppy, an AI study buddy for Indian students (CBSE Class 9-12).

Your name is Clawppy (like "claw" + "ppy" - friendly and helpful).

Your task is to introduce yourself to a new student. Keep it:
- Short and friendly (under 100 words)
- Explain you don't give answers - you teach HOW to solve
- Mention you help with CBSE syllabus (Class 9-12)
- End by asking which class they're in
- Use some emojis but not too many
- In Hindi-English mix if natural

Write the introduction message.`;
}

// Build syllabus selection prompt
export function buildSyllabusOptionsPrompt(): string {
  return `Generate a message that shows CBSE syllabus options for the user to choose.

Format as numbered list with class options:
1. CBSE Class 9
2. CBSE Class 10
3. CBSE Class 11
4. CBSE Class 12
5. NEET/JEE Prep
6. CBSE Class 11 Science
7. CBSE Class 12 Science

Keep it short and friendly.`;
}

// Build assessment prompt - intelligent questions, not quiz
export function buildAssessmentPrompt(topic: string, userLevel: string, questionNumber: number, previousAnswers: string[]): string {
  const prevContext = previousAnswers.length > 0 
    ? `\nPrevious interaction:\n${previousAnswers.map((a, i) => `${i+1}. ${a}`).join("\n")}`
    : "";

  return `You are conducting an interactive assessment for a CBSE ${userLevel} student on the topic: "${topic}".

MISSION: 
Don't just test facts. Test depth. We need to see if they actually understand the logic or just memorized it.

This is question ${questionNumber} of 5.

STRATEGY:
- If they answered previous questions well, make this one harder or conceptual.
- If they struggled, ask a fundamental question to find where the breakdown is.
- Use a scenario-based question (e.g., "What happens if we change X in this formula?").

${prevContext}

Ask ONE sharp, open-ended question. No multiple choice. Keep it conversational.`;
}

// Build assessment analysis prompt
export function buildAssessmentAnalysisPrompt(answers: string[]): string {
  return `Analyze these 5 assessment answers from a student. 
  
Answers:
${answers.map((a, i) => `${i+1}. ${a}`).join("\n")}

Categorize their knowledge into 4 buckets (must sum to 100%):
1. Actually Know: Correct answers with clear logic.
2. False Confidence: Answers given with confidence but contain conceptual errors.
3. Unknown (Aware): Student admitted they don't know or gave very vague answers.
4. Blind Spots: Subtle misconceptions revealed in their logic.

Also identify the top 3 sub-topics they need to work on.

Respond ONLY in JSON:
{
  "actualKnown": number,
  "falseConfidence": number,
  "unknownAware": number,
  "blindSpots": number,
  "topGaps": ["gap1", "gap2", "gap3"]
}`;
}

// Build understanding graph prompt
export function buildGraphPrompt(assessmentResults: any): string {
  return `Generate a simple text-based visualization of a student's understanding.

Data:
- Actually Know: ${assessmentResults.actualKnown || 0}%
- False Confidence: ${assessmentResults.falseConfidence || 0}%
- Unknown Aware: ${assessmentResults.unknownAware || 0}%
- Blind Spots: ${assessmentResults.blindSpots || 0}%

Format as:
📊 YOUR UNDERSTANDING
━━━━━━━━━━━━━━━━━━━━━━
✅ Know: XX%
🎭 Don't Know You Know: XX%
🟡 Don't Know (Aware): XX%
❓ Blind Spots: XX%

Keep it simple and visual.`;
}

// Build learning plan prompt
export function buildLearningPlanPrompt(assessmentResults: any, topic: string): string {
  return `Based on the assessment results, create a learning plan for "${topic}".

Assessment:
- Know: ${assessmentResults.actualKnown || 0}%
- False Confidence: ${assessmentResults.falseConfidence || 0}%
- Unknown Aware: ${assessmentResults.unknownAware || 0}%
- Blind Spots: ${assessmentResults.blindSpots || 0}%

Create a prioritized learning plan:
1. What to tackle first (blind spots)
2. What to fix (false confidence)
3. What to build on (what they know)

Format as numbered list with brief explanations.
Keep it actionable.`;
}

// Build teaching prompt - interactive, not content bluff
export function buildTeachingPrompt(topic: string, subtopic: string, gaps: string[], currentUnderstanding: number): string {
  return `You are teaching a CBSE student about "${topic}" - specifically "${subtopic}".

Their current understanding level: ${currentUnderstanding}%

Known gaps to address: ${gaps.join(", ") || "none identified yet"}

Teaching approach (IMPORTANT):
- NOT content dumping or bluff
- Build mental models they can use to solve ANY similar problem
- Teach the PROBLEM-SOLVING APPROACH, not just the answer
- Use simple examples they can relate to
- Give them CONFIDENCE through mastery
- At the end, ask them to try a problem themselves

Keep explanation under 150 words. Make them feel capable.`;
}

// Build Feynman evaluation prompt
export function buildFeynmanPrompt(concept: string, userExplanation: string): string {
  return `You are evaluating a CBSE student's Feynman technique attempt.

Concept they need to explain: ${concept}

Student's explanation:
"${userExplanation}"

Evaluate:
1. Can a 10-year-old understand it? (simplicity)
2. Are core concepts accurate? (accuracy)
3. Did they use too much jargon? (clarity)

Respond in JSON:
{
  "score": 0-100,
  "passed": true/false,
  "feedback": "what they did well and what to improve",
  "gaps": ["specific gap 1", "gap 2"],
  "nextSteps": "what to do next"
}

Only return JSON.`;
}

// Build review/continuation prompt
export function buildContinuePrompt(hasPlan: boolean, nextTopic: string | null): string {
  if (!hasPlan) {
    return `Generate a friendly message asking what the student wants to learn next.
    
Options:
- Start a new topic
- Continue from where they left
- Practice questions
- Check their progress

Keep it short and give numbered options.`;
  }

  return `Generate a message for a returning student.

They have a learning plan in progress.
Next topic to cover: ${nextTopic || "continue from plan"}

Options to show:
1. Continue learning
2. Review previous topic
3. Practice questions
4. Check progress (/map)

Keep it short and friendly.`;
}

// Build practice questions prompt
export function buildPracticePrompt(topic: string, subtopic: string, difficulty: string = "medium"): string {
  return `Generate 3 practice questions for CBSE "${topic}" - ${subtopic}.

Difficulty: ${difficulty}

Include:
- 1 conceptual question (check understanding)
- 1 application question (use concepts to solve)
- 1 problem-solving question (multi-step)

Format as numbered list with options (a-d).
Include answer key at the end.
Mark correct answer with *.`;
}