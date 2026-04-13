import { Env, UserState, TeachingPhase, AssessmentResult, TopicMastery } from "../types";
import { getOrCreateUser, updateStreak, saveUser, getTopicMastery, saveTopicMastery, getAllTopics, calculateNextReview, determineMasteryStatus } from "../utils/kv";
import { 
  callAI, 
  buildIntroPrompt, 
  buildSyllabusOptionsPrompt, 
  buildAssessmentPrompt,
  buildGraphPrompt,
  buildLearningPlanPrompt,
  buildTeachingPrompt,
  buildFeynmanPrompt,
  buildContinuePrompt
} from "../utils/gemini";

export async function processMessage(
  message: string,
  from: string,
  profileName: string,
  env: Env
): Promise<string> {
  const user = await getOrCreateUser(from, profileName, env);
  await updateStreak(user, env);
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Commands - always available
  if (lowerMessage === "/map") {
    return await handleKnowledgeMap(user, env);
  }
  
  if (lowerMessage === "/streak") {
    return handleStreak(user);
  }
  
  if (lowerMessage === "/plan") {
    return handleLearningPlan(user, env);
  }
  
  if (lowerMessage === "/progress") {
    return handleProgress(user, env);
  }
  
  if (lowerMessage === "/reset") {
    return handleReset(user, env);
  }
  
  if (lowerMessage === "/upgrade") {
    return handleUpgradePrompt(user);
  }
  
  // Check if user is in the middle of onboarding flow (has teachingPhase but no syllabus)
  if (user.teachingPhase === "awaiting_syllabus_selection") {
    return await handleSyllabusSelection(user, message, env);
  }
  
  // New user - no syllabus selected
  if (!user.syllabus) {
    return handleOnboarding(user, message, env);
  }
  
  // Route based on teaching phase
  switch (user.teachingPhase) {
    case "awaiting_syllabus_selection":
      return await handleSyllabusSelection(user, message, env);
      
    case "assessment_intro":
      return await handleAssessmentIntro(user, message, env);
      
    case "assessing":
      return await handleAssessment(user, message, env);
      
    case "showing_graph":
      return await handleGraphResponse(user, message, env);
      
    case "awaiting_topic_selection":
      return await handleTopicSelection(user, message, env);
      
    case "teaching":
      return await handleTeaching(user, message, env);
      
    case "feynman_challenge":
      return await handleFeynman(user, message, env);
      
    case "awaiting_continue":
      return await handleContinueChoice(user, message, env);
      
    default:
      return handleIdle(user, message, env);
  }
}

function handleStreak(user: UserState): string {
  if (user.streak === 0) {
    return "🔥 Start your streak today! Just chat with me.";
  }
  return `🔥 Streak: ${user.streak} day${user.streak > 1 ? "s" : ""} 🔥\n\nKeep it going!`;
}

function handleUpgradePrompt(user: UserState): string {
  if (user.isPro) {
    return "✨ You're already a Pro member!";
  }
  return `🚀 Go Pro - ₹49/month\n\nUnlimited topics, detailed analytics, streak protection.\n\nReply "YES" to get payment link.`;
}

async function handleKnowledgeMap(user: UserState, env: Env): Promise<string> {
  const topics = await getAllTopics(user.phone, env);
  
  if (!user.assessmentResults) {
    return `📊 YOUR PROGRESS\n\nNo assessment yet. Start by saying "hi"!`;
  }
  
  const ar = user.assessmentResults;
  return `📊 YOUR UNDERSTANDING
━━━━━━━━━━━━━━━━━━━━━━
✅ Actually Know: ${ar.actualKnown || 0}%
🎭 Don't Know You Know: ${ar.falseConfidence || 0}%
🟡 Don't Know (Aware): ${ar.unknownAware || 0}%
❓ Blind Spots: ${ar.blindSpots || 0}%

🔥 Streak: ${user.streak} days
📚 Topics Completed: ${topics.length}`;
}

async function handleLearningPlan(user: UserState, env: Env): Promise<string> {
  if (!user.learningPlan || user.learningPlan.length === 0) {
    return "No learning plan yet. Start learning by saying 'hi'!";
  }
  
  let plan = "📋 YOUR LEARNING PLAN\n\n";
  user.learningPlan.forEach((item, i) => {
    plan += `${i + 1}. ${item.topic} - ${item.priority} priority\n`;
    if (item.reason) plan += `   → ${item.reason}\n`;
  });
  
  return plan;
}

async function handleProgress(user: UserState, env: Env): Promise<string> {
  const topics = await getAllTopics(user.phone, env);
  const mastered = topics.filter(t => t.masteryScore >= 85).length;
  const learning = topics.filter(t => t.masteryScore >= 50 && t.masteryScore < 85).length;
  
  let progress = "📈 YOUR PROGRESS\n\n";
  progress += `🔥 Streak: ${user.streak} days\n`;
  progress += `📚 Topics Mastered: ${mastered}\n`;
  progress += `📖 Topics Learning: ${learning}\n`;
  
  if (user.assessmentResults) {
    const ar = user.assessmentResults;
    progress += `\n📊 Understanding:\n`;
    progress += `  ✅ Know: ${ar.actualKnown}%\n`;
    progress += `  🎭 False Confidence: ${ar.falseConfidence}%\n`;
    progress += `  🟡 Unknown Aware: ${ar.unknownAware}%\n`;
    progress += `  ❓ Blind Spots: ${ar.blindSpots}%\n`;
  }
  
  return progress;
}

async function handleReset(user: UserState, env: Env): Promise<string> {
  user.syllabus = undefined;
  user.assessmentResults = undefined;
  user.learningPlan = [];
  user.teachingPhase = "idle";
  user.currentTopic = null;
  await saveUser(user, env);
  
  return "🔄 Reset complete! Say 'hi' to start fresh.";
}

// ============== ONBOARDING ==============

async function handleOnboarding(user: UserState, message: string, env: Env): Promise<string> {
  // First message - send introduction
  const lowerMessage = message.toLowerCase().trim();
  
  if (lowerMessage === "hi" || lowerMessage === "hello" || lowerMessage === "start" || user.teachingPhase === "idle") {
    user.teachingPhase = "awaiting_syllabus_selection";
    await saveUser(user, env);
    
    try {
      const intro = await callAI(buildIntroPrompt(user.name), env, 0.8);
      const options = await callAI(buildSyllabusOptionsPrompt(), env, 0.5);
      return `${intro}\n\n${options}`;
    } catch (e) {
      // Fallback if API fails - should not happen with real API
      return `Hi! I'm Clawppy, your AI study buddy 📚

I teach you HOW to solve problems, not just give answers.

Select your class:
1. CBSE Class 9
2. CBSE Class 10
3. CBSE Class 11
4. CBSE Class 12
5. NEET/JEE Prep`;
    }
  }
  
  return "Say 'hi' to get started!";
}

async function handleSyllabusSelection(user: UserState, message: string, env: Env): Promise<string> {
  const choice = message.trim();
  
  const syllabusOptions: Record<string, string> = {
    "1": "CBSE Class 9",
    "2": "CBSE Class 10",
    "3": "CBSE Class 11",
    "4": "CBSE Class 12",
    "5": "NEET/JEE Prep",
    "6": "CBSE Class 11 Science",
    "7": "CBSE Class 12 Science",
    "9": "CBSE Class 9",
    "10": "CBSE Class 10",
    "11": "CBSE Class 11",
    "12": "CBSE Class 12"
  };
  
  const syllabus = syllabusOptions[choice] || choice;
  
  // Store syllabus permanently
  user.syllabus = syllabus;
  user.teachingPhase = "assessment_intro";
  await saveUser(user, env);
  
  try {
    const planMsg = await callAI(`Generate a friendly message that:
1. Confirms "${syllabus}" is saved
2. Explains what assessment will do (understand what they know, don't know, think they know)
3. Says it will take 5-10 minutes
4. Asks if they're ready to start
5. Keep it under 80 words, friendly tone`, env, 0.7);
    return planMsg;
  } catch (e) {
    return `Great! ${syllabus} saved! 🎉

Now I'll understand where you stand. I'll ask you some questions to figure out:
- What you actually know
- What you think you know but don't
- What you don't know

This takes 5-10 minutes. Ready? Reply "yes" to start!`;
  }
}

// ============== ASSESSMENT ==============

async function handleAssessmentIntro(user: UserState, message: string, env: Env): Promise<string> {
  const lower = message.toLowerCase().trim();
  
  if (lower !== "yes" && lower !== "start" && lower !== "ready") {
    return "Just say 'yes' or 'start' when you're ready to begin!";
  }
  
  // Start assessment
  user.teachingPhase = "assessing";
  user.assessmentData = {
    questionsAsked: 0,
    answers: [],
    topic: "General Understanding" // Will be set based on syllabus
  };
  await saveUser(user, env);
  
  try {
    const question = await callAI(
      buildAssessmentPrompt("General", user.syllabus || "CBSE", 1, []),
      env,
      0.8
    );
    return `Let's start! 🎯\n\n${question}`;
  } catch (e) {
    return `Let's start! I'll ask you some questions to understand where you stand.\n\nFirst question: Can you tell me about a topic you've studied recently? What did you learn, and how well do you think you understand it?`;
  }
}

async function handleAssessment(user: UserState, message: string, env: Env): Promise<string> {
  if (!user.assessmentData) {
    user.teachingPhase = "assessment_intro";
    await saveUser(user, env);
    return "Let's start fresh. Say 'yes' to begin assessment!";
  }
  
  // Store answer
  user.assessmentData.answers.push(message);
  user.assessmentData.questionsAsked += 1;
  
  const questionCount = user.assessmentData.questionsAsked;
  
  // After 5 questions, show results and graph
  if (questionCount >= 5) {
    // Calculate assessment results based on answers
    user.assessmentResults = calculateAssessmentResults(user.assessmentData.answers);
    user.teachingPhase = "showing_graph";
    await saveUser(user, env);
    
    try {
      const graph = await callAI(buildGraphPrompt(user.assessmentResults), env, 0.5);
      const plan = await callAI(buildLearningPlanPrompt(user.assessmentResults, "Current Topic"), env, 0.7);
      return `${graph}\n\n${plan}\n\nShall we start learning? Reply "yes" to begin!`;
    } catch (e) {
      return formatAssessmentResults(user.assessmentResults);
    }
  }
  
  // Continue with more questions
  await saveUser(user, env);
  
  try {
    const question = await callAI(
      buildAssessmentPrompt("General", user.syllabus || "CBSE", questionCount + 1, user.assessmentData.answers),
      env,
      0.8
    );
    return `${question}`;
  } catch (e) {
    const followUps = [
      "Can you tell me more about that? Why do you think that's the case?",
      "How would you approach solving a problem on this topic?",
      "What examples can you think of where this applies?",
      "What part of this do you feel most confident about?",
      "Is there anything that confuses you about this?"
    ];
    return followUps[questionCount % followUps.length];
  }
}

function calculateAssessmentResults(answers: string[]): AssessmentResult {
  // Simple algorithm - in production would use AI to analyze
  // For now, simulate based on confidence indicators in answers
  
  const total = answers.length;
  let actualKnown = 30;
  let falseConfidence = 20;
  let unknownAware = 20;
  let blindSpots = 30;
  
  // Adjust based on answer content analysis
  const confidentWords = ["know", "understand", "sure", "confident", "can explain"];
  const uncertainWords = ["not sure", "maybe", "think", "probably", "don't know"];
  
  answers.forEach(answer => {
    const lower = answer.toLowerCase();
    if (confidentWords.some(w => lower.includes(w))) {
      actualKnown += 5;
      blindSpots -= 5;
    }
    if (uncertainWords.some(w => lower.includes(w))) {
      unknownAware += 5;
      actualKnown -= 5;
    }
  });
  
  // Normalize to 100%
  const totalPercent = actualKnown + falseConfidence + unknownAware + blindSpots;
  return {
    actualKnown: Math.round((actualKnown / totalPercent) * 100),
    falseConfidence: Math.round((falseConfidence / totalPercent) * 100),
    unknownAware: Math.round((unknownAware / totalPercent) * 100),
    blindSpots: Math.round((blindSpots / totalPercent) * 100)
  };
}

function formatAssessmentResults(ar: AssessmentResult): string {
  return `📊 YOUR UNDERSTANDING
━━━━━━━━━━━━━━━━━━━━━━
✅ Actually Know: ${ar.actualKnown}%
🎭 Don't Know You Know: ${ar.falseConfidence}%
🟡 Don't Know (Aware): ${ar.unknownAware}%
❓ Blind Spots: ${ar.blindSpots}%

📋 YOUR PLAN:
1. Fill blind spots in key topics
2. Fix false confidence with proper understanding
3. Build on what you know

Ready to start learning? Reply "yes"!`;
}

async function handleGraphResponse(user: UserState, message: string, env: Env): Promise<string> {
  const lower = message.toLowerCase().trim();
  
  if (lower !== "yes" && lower !== "start" && lower !== "continue") {
    return "Just say 'yes' or 'start' to begin learning!";
  }
  
  // Start by asking for topic selection
  user.teachingPhase = "awaiting_topic_selection";
  user.currentTopic = null; // Will be set when user chooses
  user.learningPlan = user.learningPlan || [];
  
  // Add default topics to plan if empty (based on syllabus)
  if (user.learningPlan.length === 0) {
    const topics = getTopicsForSyllabus(user.syllabus);
    const topTopics = Object.entries(topics).slice(0, 5);
    user.learningPlan = topTopics.map(([k, v]) => ({
      topic: v,
      priority: k === "1" ? "high" : k === "2" ? "high" : "medium",
      reason: "Essential for your syllabus"
    }));
  }
  
  await saveUser(user, env);
  
  // Get topic list based on syllabus
  const topics = getTopicsForSyllabus(user.syllabus);
  const topicList = Object.entries(topics).slice(0, 5).map(([k, v]) => `${k}. ${v}`).join("\n");
  
  return `Great! Let's start learning! 🎯\n\nBased on your ${user.syllabus || "CBSE"} syllabus, here are topics we can cover:\n\n${topicList}\n\nWhat would you like to learn first?\n\nJust reply with the number or the topic name!`;
}

// ============== TOPIC SELECTION ==============

// CBSE Class 11 Math topics mapping
const CBSE_CLASS_11_TOPICS: Record<string, string> = {
  "1": "Algebra",
  "2": "Number Systems",
  "3": "Geometry",
  "4": "Statistics",
  "5": "Probability",
  "algebra": "Algebra",
  "number": "Number Systems",
  "numbers": "Number Systems",
  "geometry": "Geometry",
  "statistics": "Statistics",
  "probability": "Probability",
  "sets": "Sets",
  "relations": "Relations & Functions",
  "trigonometry": "Trigonometry",
  "limits": "Limits & Derivatives",
  "permutations": "Permutations & Combinations",
  "binomial": "Binomial Theorem",
  "sequences": "Sequences & Series"
};

// CBSE Class 11 Science topics
const CBSE_CLASS_11_SCIENCE_TOPICS: Record<string, string> = {
  "1": "Physics - Motion",
  "2": "Physics - Laws of Motion",
  "3": "Physics - Work & Energy",
  "4": "Chemistry - States of Matter",
  "5": "Chemistry - Chemical Bonding",
  "6": "Chemistry - Thermodynamics",
  "7": "Biology - Cell Structure",
  "8": "Biology - Cell Division",
  "9": "Biology - Nutrition",
  "10": "Biology - Respiration"
};

// NEET/JEE topics  
const NEET_JEE_TOPICS: Record<string, string> = {
  "1": "JEE - Calculus",
  "2": "JEE - Coordinate Geometry",
  "3": "JEE - Complex Numbers",
  "4": "NEET - Human Anatomy",
  "5": "NEET - Plant Diversity",
  "6": "NEET - Body Fluids",
  "7": "JEE - Thermodynamics",
  "8": "NEET - Ecology"
};

// Get topics based on syllabus
function getTopicsForSyllabus(syllabus: string | undefined): Record<string, string> {
  if (!syllabus) return CBSE_CLASS_11_TOPICS;
  
  const lower = syllabus.toLowerCase();
  if (lower.includes("science")) return CBSE_CLASS_11_SCIENCE_TOPICS;
  if (lower.includes("neet") || lower.includes("jee")) return NEET_JEE_TOPICS;
  
  // Default to Math topics
  return CBSE_CLASS_11_TOPICS;
}

async function handleTopicSelection(user: UserState, message: string, env: Env): Promise<string> {
  const lower = message.toLowerCase().trim();
  
  // Get topics based on syllabus
  const topics = getTopicsForSyllabus(user.syllabus);
  
  // Try to match a topic from the message
  let selectedTopic: string | null = null;
  
  // Check for number input
  if (topics[lower]) {
    selectedTopic = topics[lower];
  }
  
  // Check if they typed the topic name
  for (const [key, topic] of Object.entries(topics)) {
    if (lower.includes(key) && key.length > 2) {
      selectedTopic = topic;
      break;
    }
  }
  
  // If still no match, check their learning plan
  if (!selectedTopic && user.learningPlan) {
    for (const item of user.learningPlan) {
      if (lower.includes(item.topic.toLowerCase())) {
        selectedTopic = item.topic;
        break;
      }
    }
  }
  
  // If still no match, ask again
  if (!selectedTopic) {
    const topicList = Object.entries(topics).slice(0, 5).map(([k, v]) => `${k}. ${v}`).join("\n");
    return `I didn't catch that. Which topic would you like to learn?\n\n${topicList}\n\nOr just say the topic name!`;
  }
  
  // Topic selected - start teaching
  user.currentTopic = selectedTopic;
  user.teachingPhase = "teaching";
  await saveUser(user, env);
  
  // AI generates the teaching content
  const teaching = await callAI(
    buildTeachingPrompt(selectedTopic, "Introduction", [], 30),
    env,
    0.7
  );
  return `Let's learn ${selectedTopic}! 🎯\n\n${teaching}\n\nWhen you're ready, try to explain it back to me in simple terms - like you're teaching a 5-year-old!`;
}

// ============== TEACHING ==============

async function handleTeaching(user: UserState, message: string, env: Env): Promise<string> {
  // User responded to teaching - move to Feynman
  user.teachingPhase = "feynman_challenge";
  await saveUser(user, env);
  
  try {
    const feynmanPrompt = await callAI(
      buildFeynmanPrompt(user.currentTopic || "this topic", message),
      env,
      0.5
    );
    
    // Parse result
    let result;
    try {
      result = JSON.parse(feynmanPrompt);
    } catch (e) {
      result = { passed: true, score: 80, feedback: "Good attempt!" };
    }
    
    if (result.passed) {
      // Move to awaiting_continue state
      user.teachingPhase = "awaiting_continue";
      user.currentTopic = null;
      await saveUser(user, env);
      
      return `✅ Great job! Score: ${result.score}%\n\n${result.feedback}\n\nYou're ready for the next topic! What would you like to learn next?\n\n1. Next topic\n2. Review\n3. Practice\n4. Progress`;
    } else {
      // Continue teaching to fix gaps
      user.teachingPhase = "teaching";
      await saveUser(user, env);
      
      return `📝 Keep learning! Score: ${result.score}%\n\n${result.feedback}\n\nLet me explain this differently...`;
    }
  } catch (e) {
    // Move to continue state even on error (fail open)
    user.teachingPhase = "awaiting_continue";
    user.currentTopic = null;
    await saveUser(user, env);
    
    return `Good attempt! Now can you explain it even more simply? Like you're teaching a 5-year-old?`;
  }
}

// ============== FEYNMAN ==============

async function handleFeynman(user: UserState, message: string, env: Env): Promise<string> {
  // Evaluate Feynman response
  try {
    const result = await callAI(
      buildFeynmanPrompt(user.currentTopic || "the topic", message),
      env,
      0.5
    );
    
    let evaluation;
    try {
      evaluation = JSON.parse(result);
    } catch (e) {
      evaluation = { passed: true, score: 85, feedback: "Good explanation!" };
    }
    
    // Update topic mastery if exists
    if (user.currentTopic) {
      const mastery = await getTopicMastery(user.phone, user.currentTopic, env);
      if (mastery) {
        mastery.masteryScore = evaluation.score;
        mastery.status = evaluation.passed ? "conscious_competence" : "conscious_incompetence";
        await saveTopicMastery(mastery, env);
      }
    }
    
    if (evaluation.passed) {
      // Move to next topic or ask what to do
      user.teachingPhase = "awaiting_continue";
      user.currentTopic = null;
      await saveUser(user, env);
      
      return `✅ Excellent! Score: ${evaluation.score}%\n\n${evaluation.feedback}\n\n🎉 Great progress! What's next?\n1. Continue to next topic\n2. Review what we learned\n3. Practice questions\n4. Check your progress (/map)`;
    } else {
      // Continue teaching the gap
      user.teachingPhase = "teaching";
      await saveUser(user, env);
      
      return `📝 Let's fix those gaps!\n\n${evaluation.feedback}\n\nLet me explain this part again with a different approach...`;
    }
  } catch (e) {
    // If AI fails, still continue
    user.teachingPhase = "awaiting_continue";
    await saveUser(user, env);
    
    return `Good try! Let's continue learning.\n\nWhat's next?
1. Next topic
2. Review
3. Practice
4. Check progress`;
  }
}

async function handleContinueChoice(user: UserState, message: string, env: Env): Promise<string> {
  const lower = message.toLowerCase().trim();
  
  // If they try to explain a topic, treat it as a Feynman attempt
  if (lower.length > 20 || lower.includes("explain") || lower.includes("like") || lower.includes("means")) {
    user.teachingPhase = "feynman_challenge";
    await saveUser(user, env);
    
    // Re-use the Feynman handler
    return await handleFeynman(user, message, env);
  }
  
  if (lower.includes("1") || lower.includes("next") || lower.includes("continue") || lower === "ok" || lower === "yes") {
    user.teachingPhase = "awaiting_topic_selection";
    user.currentTopic = null;
    await saveUser(user, env);
    
    return `Great! Pick your next topic:\n\n1. 📐 Algebra\n2. 🔢 Number Systems\n3. 📐 Geometry\n4. 📊 Statistics\n5. 🎲 Probability\n\nJust reply with 1-5 or the topic name!`;
  }
  
  if (lower.includes("2") || lower.includes("review")) {
    return "You learned Algebra - the basics of using letters to represent unknown numbers (like x + 5 = 10, find x)";
  }
  
  if (lower.includes("3") || lower.includes("practice")) {
    return "Here's a practice question:\n\nIf 3x + 7 = 22, what is x?\n\nHint: First subtract 7 from both sides!\n\nReply with your answer!";
  }
  
  if (lower.includes("4") || lower.includes("map") || lower.includes("progress") || lower.includes(" /")) {
    return await handleKnowledgeMap(user, env);
  }
  
  // Default - ask them to choose
  return `Just reply with 1, 2, 3, or 4:\n\n1. Next topic\n2. Review\n3. Practice\n4. Progress`;
}

// ============== IDLE STATE ==============

async function handleIdle(user: UserState, message: string, env: Env): Promise<string> {
  const lower = message.toLowerCase().trim();
  
  // Check if returning user with active plan
  if (user.learningPlan && user.learningPlan.length > 0) {
    return await handleContinueChoice(user, "1", env);
  }
  
  // New topic request
  if (lower.includes("learn") || lower.includes("start") || lower.includes("study")) {
    user.teachingPhase = "assessment_intro";
    await saveUser(user, env);
    return "Let's start fresh! Say 'yes' to begin the assessment.";
  }
  
  // Check if it's a question - use Socratic approach
  const questionWords = ["what", "how", "why", "when", "where", "which", "who", "?"];
  if (questionWords.some(w => lower.includes(w))) {
    try {
      const response = await callAI(
        `You are Clawppy, a study buddy. A student asks: "${message}"
        
Respond with a guiding question that helps them think, not give the answer.
Keep it short and friendly.`,
        env,
        0.8
      );
      return response;
    } catch (e) {
      return "That's a great question! Let me ask you this: What do you think might be the answer?";
    }
  }
  
  return `I'm here to help you learn! 📚

You have ${user.syllabus} saved.

What would you like to do?
- Say "learn" to start a new topic
- Say "/map" to see your progress
- Ask me anything!`;
}