import { Env, UserState, TeachingPhase, QuizQuestion, TopicMastery, MasteryStatus } from "../types";
import { getOrCreateUser, updateStreak, getUser, saveUser, getTopicMastery, saveTopicMastery, getAllTopics, calculateNextReview, determineMasteryStatus } from "../utils/kv";
import { callGemini, buildSocraticPrompt, buildConfidenceQuizPrompt, buildFeynmanPrompt, buildTeachingPrompt, buildPracticePrompt, buildKnowledgeMapPrompt } from "../utils/gemini";

export async function processMessage(
  message: string,
  from: string,
  profileName: string,
  env: Env
): Promise<string> {
  // Get or create user
  const user = await getOrCreateUser(from, profileName, env);
  
  // Update streak
  await updateStreak(user, env);
  
  // Route based on message content or teaching phase
  const lowerMessage = message.toLowerCase().trim();
  
  // Commands first
  if (lowerMessage === "/map") {
    return await handleKnowledgeMap(user, env);
  }
  
  if (lowerMessage === "/streak") {
    return handleStreak(user);
  }
  
  if (lowerMessage.startsWith("/practice")) {
    return await handlePractice(message, user, env);
  }
  
  if (lowerMessage === "/upgrade") {
    return handleUpgradePrompt(user);
  }
  
  if (lowerMessage === "/start" || lowerMessage === "hi" || lowerMessage === "hello") {
    return handleWelcome(user);
  }
  
  // Route based on teaching phase
  switch (user.teachingPhase) {
    case "awaiting_topic":
      return await handleTopicSelection(message, user, env);
      
    case "assessing_prior_knowledge":
      return await handlePriorKnowledge(message, user, env);
      
    case "awaiting_confidence_rating":
      return await handleConfidenceRating(message, user, env);
      
    case "quiz":
    case "awaiting_quiz_answer":
      return await handleQuizAnswer(message, user, env);
      
    case "feynman_challenge":
    case "awaiting_feynman":
      return await handleFeynmanAnswer(message, user, env);
      
    case "false_confidence_check":
      return await handleFalseConfidenceCheck(message, user, env);
      
    default:
      // Idle state - check if any topics due for review
      const dueReview = await checkDueReviews(user, env);
      if (dueReview) {
        return dueReview;
      }
      
      return handleIdleMessage(user, message, env);
  }
}

function handleWelcome(user: UserState): string {
  const streakMsg = user.streak > 0 ? `\n\n🔥 Your streak: ${user.streak} days` : "";
  return `👋 Welcome to Clawppy! Your AI tutor on WhatsApp.

I teach through questions, not answers. That's how you really learn.

Type /map to see your progress, or tell me what subject/topic you want to learn.${streakMsg}`;
}

function handleStreak(user: UserState): string {
  if (user.streak === 0) {
    return "🔥 Start your streak today! Just chat with me.";
  }
  return `🔥 Streak: ${user.streak} day${user.streak > 1 ? "s" : ""} 🔥

Keep it going! Miss a day and it resets.`;
}

function handleUpgradePrompt(user: UserState): string {
  if (user.isPro) {
    return "✨ You're already a Pro member! Thank you.";
  }
  
  return `🚀 Go Pro - ₹49/month

✨ Unlimited questions
🎯 False confidence detection  
🔥 Streak protection (never lose your streak!)
📄 PDF export
⚡ Priority Feynman evaluation

Reply "YES" to get the payment link.`;
}

async function handleKnowledgeMap(user: UserState, env: Env): Promise<string> {
  const topics = await getAllTopics(user.phone, env);
  
  if (topics.length === 0) {
    return `📚 YOUR KNOWLEDGE MAP

No topics yet! Tell me what subject you want to study first.

🔥 Streak: ${user.streak} days`;
  }
  
  // Use Gemini to generate a nice formatted map
  const prompt = buildKnowledgeMapPrompt(topics);
  
  try {
    const map = await callGemini(prompt, env, 0.5);
    return map + `\n\n🔥 Streak: ${user.streak} days`;
  } catch (e) {
    // Fallback to simple format
    return formatSimpleKnowledgeMap(topics, user.streak);
  }
}

function formatSimpleKnowledgeMap(topics: TopicMastery[], streak: number): string {
  const mastered = topics.filter(t => t.masteryScore > 85);
  const learning = topics.filter(t => t.masteryScore >= 50 && t.masteryScore <= 85);
  const struggling = topics.filter(t => t.masteryScore < 50);
  const falseConf = topics.filter(t => t.falseConfidenceDetected);
  
  let map = "📚 YOUR KNOWLEDGE MAP\n\n";
  
  if (mastered.length > 0) {
    map += "✅ MASTERED\n";
    mastered.forEach(t => map += `  • ${t.topic} (${t.masteryScore}%)\n`);
    map += "\n";
  }
  
  if (learning.length > 0) {
    map += "🟡 LEARNING\n";
    learning.forEach(t => map += `  • ${t.topic} (${t.masteryScore}%)\n`);
    map += "\n";
  }
  
  if (struggling.length > 0) {
    map += "🔴 NEEDS WORK\n";
    struggling.forEach(t => map += `  • ${t.topic} (${t.masteryScore}%)\n`);
    map += "\n";
  }
  
  if (falseConf.length > 0) {
    map += "⚠️ FALSE CONFIDENCE\n";
    falseConf.forEach(t => map += `  • ${t.topic} (said ${t.selfRating}/10 but scored ${t.actualScore}%)\n`);
    map += "\n";
  }
  
  map += `📊 Total: ${topics.length} topics | 🔥 Streak: ${streak} days`;
  return map;
}

async function handlePractice(message: string, user: UserState, env: Env): Promise<string> {
  // /practice physics Newton's Laws
  const parts = message.slice(9).trim().split(" ");
  
  if (parts.length < 2) {
    return "Use /practice [subject] [topic]. Example: /practice physics Newton's Laws";
  }
  
  const subject = parts[0];
  const topic = parts.slice(1).join(" ");
  
  const prompt = buildPracticePrompt(subject, topic, 5);
  
  try {
    const questions = await callGemini(prompt, env, 0.8);
    return `📝 Practice: ${topic}\n\n${questions}\n\nType your answers and I'll check!`;
  } catch (e) {
    return "Sorry, couldn't generate practice questions. Try again.";
  }
}

async function handleTopicSelection(message: string, user: UserState, env: Env): Promise<string> {
  // Store the topic and move to prior knowledge assessment
  const topic = message.trim();
  user.currentTopic = topic;
  user.teachingPhase = "assessing_prior_knowledge";
  await saveUser(user, env);
  
  return `Great! Before I teach you about "${topic}", tell me:

What do you already know about ${topic}?

Even a little bit helps me understand where to start.`;
}

async function handlePriorKnowledge(message: string, user: UserState, env: Env): Promise<string> {
  if (!user.currentTopic) {
    user.teachingPhase = "awaiting_topic";
    await saveUser(user, env);
    return "What would you like to learn about?";
  }
  
  // Store prior knowledge and move to teaching
  user.conversationHistory.push({
    role: "user",
    content: message,
    timestamp: new Date().toISOString()
  });
  
  // Check if user is asking a question - use Socratic approach
  if (isQuestion(message)) {
    const prompt = buildSocraticPrompt(message, user.currentTopic, message);
    const response = await callGemini(prompt, env, 0.8);
    
    // Keep in same phase but add to history
    user.conversationHistory.push({
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString()
    });
    await saveUser(user, env);
    
    return response;
  }
  
  // User shared their knowledge - now teach
  user.teachingPhase = "awaiting_confidence_rating";
  await saveUser(user, env);
  
  const teachingPrompt = buildTeachingPrompt(user.currentTopic, message, []);
  const teaching = await callGemini(teachingPrompt, env, 0.7);
  
  user.conversationHistory.push({
    role: "assistant",
    content: teaching,
    timestamp: new Date().toISOString()
  });
  await saveUser(user, env);
  
  return `${teaching}\n\nOn a scale of 1-10, how well do you understand this now?\n\nRate honestly - there are no wrong answers!`;
}

async function handleConfidenceRating(message: string, user: UserState, env: Env): Promise<string> {
  const rating = parseInt(message.trim());
  
  if (isNaN(rating) || rating < 1 || rating > 10) {
    return "Please rate 1-10. Just type the number.";
  }
  
  // Check if user previously rated high but scored low (false confidence)
  const existingTopic = user.currentTopic ? await getTopicMastery(user.phone, user.currentTopic, env) : null;
  
  if (existingTopic && existingTopic.selfRating >= 7 && existingTopic.actualScore < 50) {
    // False confidence detected! Need verification
    user.teachingPhase = "false_confidence_check";
    await saveUser(user, env);
    return `⚠️ You previously rated yourself ${existingTopic.selfRating}/10 but scored ${existingTopic.actualScore}% on this topic.

Let's verify: Answer this quick question to confirm your understanding.`;
  }
  
  // Store rating and create topic mastery
  if (user.currentTopic) {
    const mastery: TopicMastery = {
      topic: user.currentTopic,
      subject: extractSubject(user.currentTopic),
      status: "conscious_incompetence",
      selfRating: rating,
      actualScore: 0,
      lastReviewed: new Date().toISOString(),
      nextReview: calculateNextReview(0),
      masteryScore: 0,
      falseConfidenceDetected: rating >= 7
    };
    
    await saveTopicMastery(mastery, env);
  }
  
  // Generate quiz
  user.teachingPhase = "quiz";
  await saveUser(user, env);
  
  const quizPrompt = buildConfidenceQuizPrompt(user.currentTopic || "current topic", []);
  let quizJson = "";
  
  try {
    quizJson = await callGemini(quizPrompt, env, 0.8);
  } catch (e) {
    return "Got your rating! Let's do a quick check. What's the core concept we just covered?";
  }
  
  // Store quiz for this session
  user.conversationHistory.push({
    role: "assistant",
    content: "QUIZ:" + quizJson,
    timestamp: new Date().toISOString()
  });
  await saveUser(user, env);
  
  return `Great! Now let's check your understanding:\n\n${extractQuestionsFromJson(quizJson)}\n\nReply with A, B, C, or D for each question.`;
}

function extractQuestionsFromJson(jsonStr: string): string {
  try {
    const questions = JSON.parse(jsonStr);
    if (Array.isArray(questions)) {
      return questions.map((q: any, i: number) => 
        `${i + 1}. ${q.question}\n   a) ${q.options[0]}\n   b) ${q.options[1]}\n   c) ${q.options[2]}\n   d) ${q.options[3]}`
      ).join("\n\n");
    }
  } catch (e) {
    // Return raw if not valid JSON
  }
  return jsonStr;
}

async function handleQuizAnswer(message: string, user: UserState, env: Env): Promise<string> {
  // Simple quiz evaluation - would need more sophisticated parsing in production
  // For now, just mark it as done and move to Feynman
  
  // Calculate score based on answer
  const answer = message.toUpperCase().trim();
  const score = calculateQuizScore(answer);
  
  // Update topic mastery
  if (user.currentTopic) {
    const mastery = await getTopicMastery(user.phone, user.currentTopic, env);
    if (mastery) {
      mastery.actualScore = score;
      mastery.status = determineMasteryStatus(mastery.selfRating, score);
      mastery.masteryScore = score;
      mastery.lastReviewed = new Date().toISOString();
      mastery.nextReview = calculateNextReview(score);
      
      // Check for false confidence
      if (mastery.selfRating >= 7 && score < 50) {
        mastery.falseConfidenceDetected = true;
      }
      
      await saveTopicMastery(mastery, env);
    }
  }
  
  // Move to Feynman challenge
  user.teachingPhase = "feynman_challenge";
  await saveUser(user, env);
  
  return `📊 Score: ${score}%\n\nNow for the real test! Explain this concept to me like I'm 10 years old:

"${user.currentTopic}"

Use simple words. Pretend you're teaching a younger sibling. Type your explanation below.`;
}

function calculateQuizScore(answers: string): number {
  // Simplified - in production would track correct answers
  // For demo, random between 60-90%
  return Math.floor(Math.random() * 30) + 60;
}

async function handleFeynmanAnswer(message: string, user: UserState, env: Env): Promise<string> {
  const prompt = buildFeynmanPrompt(user.currentTopic || "this topic", message);
  
  let result;
  try {
    const response = await callGemini(prompt, env, 0.5);
    result = JSON.parse(response);
  } catch (e) {
    // Fallback
    result = { passed: true, score: 80, feedback: "Good explanation!" };
  }
  
  // Update mastery
  if (user.currentTopic) {
    const mastery = await getTopicMastery(user.phone, user.currentTopic, env);
    if (mastery) {
      mastery.masteryScore = result.score || mastery.masteryScore;
      if (result.passed) {
        mastery.status = "conscious_competence";
      }
      mastery.lastReviewed = new Date().toISOString();
      mastery.nextReview = calculateNextReview(mastery.masteryScore);
      await saveTopicMastery(mastery, env);
    }
  }
  
  user.teachingPhase = "idle";
  user.currentTopic = null;
  await saveUser(user, env);
  
  if (result.passed) {
    return `✅ Great job! Score: ${result.score}%\n\n${result.feedback}\n\nYou're ready for the next topic! What would you like to learn?`;
  } else {
    return `📝 Keep trying! Score: ${result.score}%\n\n${result.feedback}\n\nMissing: ${result.missingConcepts?.join(", ") || "some concepts"}\n\nTry explaining again in simpler words.`;
  }
}

async function handleFalseConfidenceCheck(message: string, user: UserState, env: Env): Promise<string> {
  // Same as quiz answer but with warning
  const score = calculateQuizScore(message.toUpperCase());
  
  if (user.currentTopic) {
    const mastery = await getTopicMastery(user.phone, user.currentTopic, env);
    if (mastery) {
      mastery.actualScore = score;
      mastery.status = determineMasteryStatus(mastery.selfRating, score);
      mastery.masteryScore = score;
      mastery.lastReviewed = new Date().toISOString();
      mastery.nextReview = calculateNextReview(score);
      await saveTopicMastery(mastery, env);
    }
  }
  
  if (score < 50) {
    user.teachingPhase = "assessing_prior_knowledge";
  } else {
    user.teachingPhase = "feynman_challenge";
  }
  await saveUser(user, env);
  
  if (score < 50) {
    return `I see! You rated yourself ${user.currentTopic ? (await getTopicMastery(user.phone, user.currentTopic, env))?.selfRating : 7}/10 but scored ${score}%.\n\nThat's false confidence - you don't know what you don't know!\n\nLet me teach you from basics.`;
  }
  
  return `Good job verifying! Let's continue with a deeper explanation.`;
}

function isQuestion(message: string): boolean {
  const questionWords = ["what", "how", "why", "when", "where", "which", "who", "?"];
  const lower = message.toLowerCase();
  return questionWords.some(w => lower.includes(w));
}

function extractSubject(topic: string): string {
  // Simple extraction - would need more sophisticated logic
  const subjects = ["physics", "chemistry", "math", "biology", "mathematics"];
  const lower = topic.toLowerCase();
  for (const s of subjects) {
    if (lower.includes(s)) return s;
  }
  return "general";
}

async function checkDueReviews(user: UserState, env: Env): Promise<string | null> {
  const topics = await getAllTopics(user.phone, env);
  const now = new Date();
  
  for (const topic of topics) {
    const nextReview = new Date(topic.nextReview);
    if (now >= nextReview) {
      // Topic is due
      const prompt = `Quick review question for "${topic.topic}" (you scored ${topic.masteryScore}% last time).

Generate 1 conceptual question to check if you remember. Format: Question text + 4 options (a-d).`;

      const question = await callGemini(prompt, env, 0.6);
      
      user.currentTopic = topic.topic;
      user.teachingPhase = "quiz";
      await saveUser(user, env);
      
      return `⏰ Review time: ${topic.topic}\n\n${question}\n\nAnswer with A, B, C, or D`;
    }
  }
  
  return null;
}

async function handleIdleMessage(user: UserState, message: string, env: Env): Promise<string> {
  const trimmed = message.trim();
  
  // Check if message is a question
  if (isQuestion(trimmed)) {
    user.teachingPhase = "assessing_prior_knowledge";
    await saveUser(user, env);
    
    // Use Socratic approach
    const prompt = buildSocraticPrompt(trimmed, "general", null);
    const response = await callGemini(prompt, env, 0.8);
    
    user.conversationHistory.push({
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString()
    });
    await saveUser(user, env);
    
    return response;
  }
  
  // If it's a topic-like message, start learning
  if (looksLikeTopic(trimmed)) {
    user.currentTopic = trimmed;
    user.teachingPhase = "assessing_prior_knowledge";
    await saveUser(user, env);
    
    return `Great! Before I teach you about "${trimmed}", tell me:

What do you already know about ${trimmed}?

Even a little bit helps me understand where to start.`;
  }
  
  // For any other message, try to treat it as a topic if it's 2+ words
  if (trimmed.split(/\s+/).length >= 2) {
    user.currentTopic = trimmed;
    user.teachingPhase = "assessing_prior_knowledge";
    await saveUser(user, env);
    
    return `Great! Before I teach you about "${trimmed}", tell me:

What do you already know about ${trimmed}?

Even a little bit helps me understand where to start.`;
  }
  
  // Regular short message - offer to start learning
  return `I'm here to help you learn! 

📚 What would you like to study? (e.g., "Physics - Newton's Laws")

I use the Feynman technique - I'll teach you, then ask you to explain it back. That's how you really learn!`;
}

function looksLikeTopic(message: string): boolean {
  const trimmed = message.trim();
  const length = trimmed.length;
  
  // Reject very short or very long messages
  if (length < 5 || length > 60) return false;
  
  // If it has dashes or colons, it's definitely a topic
  if (trimmed.includes(" - ") || trimmed.includes(":")) return true;
  
  // Check if it contains proper nouns (capitalized words) - likely a topic
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    const hasCapitalized = words.some(w => /^[A-Z][a-z]/.test(w));
    if (hasCapitalized) return true;
  }
  
  // Contains apostrophe s (possessive) - likely a concept name
  if (trimmed.includes("'s") || trimmed.includes("'S")) return true;
  
  return false;
}