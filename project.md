# Clawppy: AI WhatsApp Tutor for Indian Students

## Project Overview

### What is Clawppy?

Clawppy is an AI-powered teaching assistant that lives inside WhatsApp. It helps Indian students (Grades 9–12, CBSE) learn actively through intelligent assessment, personalized planning, and interactive teaching. It detects what a student truly understands, identifies false confidence, and uses the Feynman technique to lock in learning.

### Why WhatsApp?

- 500M+ Indians use WhatsApp
- Zero app install friction
- Students already live there
- Internet is cheap, phones are basic

### Core Philosophy

Clawppy teaches to make students **capable of answering any question**:
- Intelligent assessment (not just quiz)
- Build mental models
- Teaching to solve problems, not just content
- Confidence building through mastery

---

## New Learning Flow

### Phase 1: Onboarding (One-time)

1. **Introduction Message**
   - Clawppy introduces itself
   - Explains what it does
   - Shows syllabus options (CBSE Class 9-12)

2. **Syllabus Selection**
   - User selects their class/board (CBSE 9, 10, 11, 12)
   - Stored permanently - user never selects again

3. **Learning Plan Message**
   - Explains what Clawppy will do
   - Starts assessment test

### Phase 2: Intelligent Assessment

**Goal**: Understand the user, not quiz them.

The assessment identifies:
- What the user **actually knows** (can solve problems)
- What the user **thinks they know but don't** (false confidence)
- What the user **knows they don't know** (conscious incompetence)
- What the user **doesn't know they don't know** (blind spots)

**Method**: Interactive conversation with probing questions, not multiple choice quizzes.

### Phase 3: Understanding Visualization

After assessment, show a simple visual graph:
- Categories: Known, False Confidence, Unknown (Aware), Unknown (Blind Spots)
- Simple pie/bar representation
- This helps students see their true state

### Phase 4: Personalized Teaching

Based on assessment results:
1. **Create Learning Plan** - Prioritize topics based on gaps
2. **Interactive Chat Teaching** - Not content dumping
   - Build mental models
   - Teach problem-solving approach
   - Give confidence through mastery
3. **Not bluff content** - Make students capable

### Phase 5: Feynman Validation

After teaching a topic:
1. Ask user to explain simply (Feynman technique)
2. Evaluate understanding
3. Fix gaps identified
4. Report progress to main agent
5. Main agent updates learning plan

### Phase 6: Continuous Loop

- After Feynman, move to next topic
- Plan updates based on results
- Continue learning until mastery

---

## Technical Architecture

### Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Messaging | Twilio WhatsApp API | Official, legal, reliable |
| Backend | Cloudflare Workers | Free tier, serverless, auto-scaling |
| Database | Cloudflare KV | Key-value storage for user state |
| AI | MiniMax M2.5 Free (via OpenCode Zen) | High reasoning, good Hindi/English mix |
| Payments | Razorpay / Cashfree UPI | Indian-friendly, easy webhooks |

### Data Flow

```
Student → WhatsApp → Twilio Webhook → Cloudflare Worker
                                              ↓
                                      Cloudflare KV
                                      (user state, knowledge map)
                                              ↓
                                      MiniMax M2.5 API
                                      (assessment, teaching, evaluation)
                                              ↓
                                      Twilio → WhatsApp → Student
```

---

## User Flow (New)

### First-Time User

```
Student sends "Hi"
    ↓
Clawppy: "Hi! I'm Clawppy, your AI study buddy on WhatsApp 📚

I don't just give answers - I teach you HOW to solve problems.

Select your board:
1. CBSE Class 9
2. CBSE Class 10
3. CBSE Class 11
4. CBSE Class 12"

Student replies "3" (for Class 11)
    ↓
Clawppy: "Great! Class 11 saved! 🎉

Now let me understand where you stand. I'll ask you some questions to figure out what you really know, what you think you know but don't, and what you don't know.

Let's start with [Topic]..."

[Assessment begins - interactive questions, not quiz]
    ↓
After assessment:
Clawppy shows simple graph:
📊 YOUR UNDERSTANDING
━━━━━━━━━━━━━━━━━━━━━━
✅ Know: 35%
🎭 False Confidence: 20%
🟡 Unknown (Aware): 15%
❓ Blind Spots: 30%
    ↓
Based on graph, creates learning plan:
"Your plan:
1. Fill blind spots in [Topic A]
2. Fix false confidence in [Topic B]
3. Build on what you know in [Topic C]

Let's start with Topic A..."

[Interactive teaching begins]
```

### Returning User

```
Student sends any message
    ↓
Clawppy checks: Do they have syllabus? Yes
    ↓
Check: Any pending topics? Yes - continue from where left off
    ↓
"No pending topics! Want to:
1. Continue learning [Next Topic]
2. Review [Previous Topic]
3. Practice questions
4. Check progress"
```

---

## Commands

| Command | Function |
|---------|----------|
| /map | Show understanding graph |
| /plan | Show current learning plan |
| /streak | Show current streak |
| /progress | Show detailed progress report |
| /practice [topic] | Generate practice questions |
| /reset | Reset and start over (rare) |
| /upgrade | Show Pro features |

---

## Monetization

### Freemium Model

| Plan | Price | Features |
|------|-------|----------|
| Free | ₹0 | 10 topics, basic graph, streak resets |
| Pro | ₹49/month | Unlimited topics, detailed analytics, streak protection, PDF export |

### Exam Packs (One-time)

| Pack | Price |
|------|-------|
| JEE Calculus | ₹99 |
| NEET Biology | ₹99 |
| CBSE Class 12 Physics | ₹99 |

---

## Development Roadmap

### Phase 1: Foundation
- [x] Cloudflare Worker setup
- [x] Twilio webhook receiver
- [ ] Connect MiniMax M2.5 Free (remove fallback)
- [ ] Basic onboarding flow

### Phase 2: Assessment System
- [ ] Intelligent assessment questions (not quiz)
- [ ] User understanding categorization
- [ ] Simple graph visualization

### Phase 3: Teaching Engine
- [ ] Learning plan generator
- [ ] Interactive chat teaching
- [ ] Mental model builder
- [ ] Problem-solving approach teaching

### Phase 4: Feynman Integration
- [ ] Feynman evaluation
- [ ] Gap detection and fixing
- [ ] Progress reporting to main agent
- [ ] Plan updates

### Phase 5: Engagement
- [ ] Streak tracking
- [ ] Interactive buttons
- [ ] Commands implementation

### Phase 6: Monetization
- [ ] Payment integration
- [ ] Pro features
- [ ] Exam packs

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Daily Active Users | >60% of signups |
| Topics completed per user/week | >5 |
| Feynman pass rate | >70% |
| False confidence detection | >80% |
| Free → Pro conversion | >5% |

---

## Future Features (V2)

- Voice notes support
- Group mode (teacher + students)
- NCERT PDF ingestion
- Mock tests with timed conditions
- Leaderboard
- WhatsApp Channels integration