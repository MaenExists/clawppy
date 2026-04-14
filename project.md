# Clawppy: AI WhatsApp Tutor for Indian Students

## Project Overview

### What is Clawppy?

Clawppy is an AI-powered teaching assistant that lives inside WhatsApp. It helps Indian students (Grades 9–12, CBSE) learn actively through intelligent assessment, personalized planning, and interactive teaching. It detects what a student truly understands, identifies false confidence, and uses the Feynman technique to lock in learning.

### Why WhatsApp?

- 500M+ Indians use WhatsApp
- Zero app install friction
- Students already live there
- Meta WhatsApp Cloud API provides rich interactive features (buttons, lists)

### Core Philosophy

Clawppy teaches to make students **capable of answering any question**:
- **Intelligent Assessment**: Goes beyond quizzes to identify blind spots and false confidence.
- **Mental Models**: Focuses on "how to think" rather than "what to memorize."
- **Feynman Validation**: Ensures mastery by asking students to explain concepts simply.
- **Socratic Method**: Guides students to answers through probing questions.

---

## The Learning Journey

### Phase 1: Onboarding (One-time)
1. **Introduction**: Clawppy introduces its unique "learning, not telling" approach.
2. **Syllabus Selection**: User selects Class 9, 10, 11, 12, or NEET/JEE via WhatsApp Buttons.
3. **Commitment**: Explains the 5-10 minute assessment process.

### Phase 2: Knowledge Mapping (Assessment)
- **Interactive Probing**: 5 open-ended questions designed to test depth.
- **AI Analysis**: Analyzes responses to categorize knowledge into:
  - **Actually Know**: Correct and confident.
  - **False Confidence**: Confident but conceptually wrong.
  - **Unknown (Aware)**: Student knows they are struggling.
  - **Blind Spots**: Student doesn't realize they have a misconception.

### Phase 3: Visualization & Planning
- **The Graph**: Text-based visualization of the knowledge map.
- **Learning Plan**: Prioritized topics based on the assessment results.

### Phase 4: Active Learning
- **Socratic Teaching**: Short, interactive bursts of information followed by "check-for-understanding" questions.
- **Feynman Challenge**: Student explains the concept back to Clawppy.
- **Gap Filling**: Clawppy specifically targets the gaps identified in the Feynman attempt.

---

## Technical Architecture

### Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Messaging | Meta WhatsApp Cloud API | Official, interactive features, direct Meta integration |
| Backend | Cloudflare Workers | Serverless, high performance, global edge |
| Database | Cloudflare KV | Fast key-value storage for user state & mastery |
| AI | MiniMax M2.5 Free (via OpenCode Zen) | High reasoning capabilities, excellent code/logic |
| Payments | Razorpay | Indian-friendly UPI/Card payments |

### Project Structure
- `src/index.ts`: Entry point, Meta Webhook handler.
- `src/handlers/message.ts`: Core state machine for the learning flow.
- `src/utils/kv.ts`: Database abstraction for user and topic data.
- `src/utils/gemini.ts`: AI prompt engineering and API integration.
- `src/types.ts`: TypeScript definitions for state and responses.

---

## Commands

| Command | Function |
|---------|----------|
| `/map` | Show understanding graph |
| `/plan` | Show current learning plan |
| `/streak` | Show current streak |
| `/progress` | Detailed progress report |
| `/reset` | Clear syllabus and start over |
| `/upgrade` | Pro features and payment link |

---

## Monetization

- **Free Tier**: 5 topics, basic graph, daily streak tracking.
- **Pro Tier (₹49/month)**: Unlimited topics, deep analytics, PDF summary of learning, streak protection.

---

## Roadmap

### Completed ✅
- Cloudflare Worker & KV Foundation
- Meta Webhook Integration
- Basic Onboarding & Command System
- Feynman Evaluation Logic

### In Progress 🏗️
- **AI Assessment Analysis**: Moving from placeholder logic to deep AI response analysis.
- **Rich UX**: Implementing Meta Buttons for better conversion and engagement.
- **Topic Expansion**: Full syllabus mapping for Class 9-12.

### Upcoming 🚀
- Razorpay Payment Webhooks
- PDF Progress Reports
- Voice Note Support (Speech-to-Text)
