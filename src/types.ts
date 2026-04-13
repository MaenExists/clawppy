// User state stored in KV
export interface UserState {
  phone: string;
  name: string;
  createdAt: string;
  streak: number;
  lastActiveDate: string;
  isPro: boolean;
  syllabus?: string;  // CBSE Class 9-12, stored permanently after selection
  currentTopic: string | null;
  teachingPhase: TeachingPhase;
  conversationHistory: ConversationEntry[];
  assessmentData?: AssessmentData;
  assessmentResults?: AssessmentResult;
  learningPlan?: LearningPlanItem[];
}

export type TeachingPhase = 
  | "idle"
  | "awaiting_syllabus_selection"
  | "assessment_intro"
  | "assessing"
  | "showing_graph"
  | "awaiting_topic_selection"  // NEW: user chooses topic to learn
  | "teaching"
  | "feynman_challenge"
  | "awaiting_continue";

export interface AssessmentData {
  questionsAsked: number;
  answers: string[];
  topic: string;
}

export interface AssessmentResult {
  actualKnown: number;       // What they actually know
  falseConfidence: number;   // Think they know but don't
  unknownAware: number;      // Know they don't know
  blindSpots: number;        // Don't know they don't know
}

export interface LearningPlanItem {
  topic: string;
  priority: "high" | "medium" | "low";
  reason?: string;
  completed?: boolean;
}

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

export interface OpenCodeMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenCodeRequest {
  model: string;
  messages: OpenCodeMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface OpenCodeResponse {
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