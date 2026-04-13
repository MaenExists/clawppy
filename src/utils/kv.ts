import { Env, UserState, TopicMastery, MasteryStatus, TeachingPhase } from "./types";

const USER_PREFIX = "user:";
const TOPIC_PREFIX = "topic:";

// Get user from KV
export async function getUser(phone: string, env: Env): Promise<UserState | null> {
  const key = `${USER_PREFIX}${phone}`;
  const data = await env.CLAWPPY_KV.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

// Save user to KV
export async function saveUser(user: UserState, env: Env): Promise<void> {
  const key = `${USER_PREFIX}${user.phone}`;
  await env.CLAWPPY_KV.put(key, JSON.stringify(user));
}

// Get or create user
export async function getOrCreateUser(phone: string, name: string, env: Env): Promise<UserState> {
  let user = await getUser(phone, env);
  
  if (!user) {
    const today = new Date().toISOString().split("T")[0];
    user = {
      phone,
      name,
      createdAt: new Date().toISOString(),
      streak: 0,
      lastActiveDate: today,
      isPro: false,
      currentTopic: null,
      teachingPhase: "idle",
      conversationHistory: []
    };
    await saveUser(user, env);
  }
  
  return user;
}

// Update streak - call on every message
export async function updateStreak(user: UserState, env: Env): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = getYesterday();
  
  if (user.lastActiveDate === today) {
    return user.streak; // Already active today
  }
  
  if (user.lastActiveDate === yesterday) {
    user.streak += 1; // Continue streak
  } else {
    user.streak = 1; // Reset streak
  }
  
  user.lastActiveDate = today;
  await saveUser(user, env);
  return user.streak;
}

function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

// Topic mastery operations
export async function getTopicMastery(phone: string, topic: string, env: Env): Promise<TopicMastery | null> {
  const key = `${TOPIC_PREFIX}${phone}:${topic}`;
  const data = await env.CLAWPPY_KV.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

export async function saveTopicMastery(mastery: TopicMastery, env: Env): Promise<void> {
  const key = `${TOPIC_PREFIX}${mastery.phone}:${mastery.topic}`;
  await env.CLAWPPY_KV.put(key, JSON.stringify(mastery));
}

export async function getAllTopics(phone: string, env: Env): Promise<TopicMastery[]> {
  const list = await env.CLAWPPY_KV.list({ prefix: `${TOPIC_PREFIX}${phone}:` });
  const topics: TopicMastery[] = [];
  
  for (const key of list.keys) {
    const data = await env.CLAWPPY_KV.get(key.name);
    if (data) {
      topics.push(JSON.parse(data));
    }
  }
  
  return topics;
}

// Calculate next review date based on mastery score
export function calculateNextReview(masteryScore: number): string {
  const now = new Date();
  let daysUntilReview: number;
  
  if (masteryScore > 85) {
    daysUntilReview = 7;
  } else if (masteryScore >= 60) {
    daysUntilReview = 3;
  } else {
    daysUntilReview = 1;
  }
  
  now.setDate(now.getDate() + daysUntilReview);
  return now.toISOString();
}

// Determine mastery status from scores
export function determineMasteryStatus(selfRating: number, actualScore: number): MasteryStatus {
  // False confidence: high self-rating but low actual score
  if (selfRating >= 7 && actualScore < 50) {
    return "unconscious_incompetence";
  }
  
  // Underconfident mastery: low self-rating but high actual score
  if (selfRating <= 3 && actualScore > 70) {
    return "unconscious_competence";
  }
  
  if (actualScore >= 85) {
    return "conscious_competence";
  }
  
  if (actualScore >= 50) {
    return "conscious_incompetence";
  }
  
  return "unconscious_incompetence";
}

// Check if topic is due for review
export function isTopicDueForReview(mastery: TopicMastery): boolean {
  const now = new Date();
  const nextReview = new Date(mastery.nextReview);
  return now >= nextReview;
}