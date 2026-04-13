// User state stored in KV
export interface UserState {
  phone: string;
  name: string;
  createdAt: string;
  streak: number;
  lastActiveDate: string;
  isPro: boolean;
  currentTopic: string | null;
  teachingPhase: TeachingPhase;
  conversationHistory: ConversationEntry[];
}

export type TeachingPhase = 
  | "idle"
  | "awaiting_topic"
  | "assessing_prior_knowledge"
  | "teaching"
  | "awaiting_confidence_rating"
  | "quiz"
  | "awaiting_quiz_answer"
  | "feynman_challenge"
  | "awaiting_feynman"
  | "false_confidence_check";

// Topic mastery stored per user
export interface TopicMastery {
  topic: string;
  subject: string;
  status: MasteryStatus;
  selfRating: number;
  actualScore: number;
  lastReviewed: string;
  nextReview: string;
  masteryScore: number;
  falseConfidenceDetected: boolean;
}

export type MasteryStatus = 
  | "unconscious_incompetence"  // Don't know you don't know
  | "conscious_incompetence"    // Know you don't know
  | "conscious_competence"     // Know you know
  | "unconscious_competence";   // Auto - mastered

export interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// Request types
export interface TwilioWebhookBody {
  Body: string;
  From: string;
  ProfileName: string;
  MessageSid: string;
  AccountSid: string;
}

export interface GeminiRequest {
  contents: Array<{
    parts: Array<{ text: string }>;
  >>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text: string }>;
    };
  }>;
  error?: {
    message: string;
  };
}