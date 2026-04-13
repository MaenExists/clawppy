# Clawppy - Development Plan

## What I've Built So Far

### 1. Project Structure
- Cloudflare Workers backend with TypeScript
- Twilio WhatsApp webhook integration (`/webhook` endpoint)
- Health check endpoint (`/health`)
- KV Namespace for user state storage

### 2. Core Features Implemented

#### Onboarding Flow ✅
- Introduction message with CBSE syllabus options (Class 9-12)
- Syllabus selection stored permanently in user state
- Confirmation message after selection

#### Assessment System ✅
- Interactive assessment with probing questions (not multiple choice)
- 5 questions to understand user's true knowledge level
- Calculates:
  - What they actually know
  - What they think they know but don't (false confidence)
  - What they know they don't know
  - What they don't know they don't know (blind spots)

#### Understanding Visualization ✅
- Simple text-based graph showing understanding breakdown
- Categories: Actually Know, Don't Know You Know, Unknown Aware, Blind Spots

#### Learning Plan ✅
- Auto-generated learning plan based on assessment results
- Prioritized topics (high/medium/low)
- Actionable next steps

#### Teaching Phase (Basic) ✅
- Interactive teaching prompt system
- Feynman evaluation after teaching

#### Commands ✅
- `/map` - Show understanding graph
- `/streak` - Show current streak
- `/plan` - Show learning plan
- `/progress` - Detailed progress report
- `/reset` - Reset and start over
- `/upgrade` - Show Pro features

### 3. Tech Stack ✅
- Cloudflare Workers (serverless)
- Cloudflare KV (database)
- MiniMax M2.5 Free via OpenCode Zen API
- Environment variables for API key (stored in .env, not committed)
- Proper error handling (no fallbacks - proper error propagation)

### 4. Git Setup ✅
- Initial commit to GitHub: https://github.com/MaenExists/clawppy
- .gitignore configured to exclude .env files

---

## What's Left to Do

### Phase 2: Enhanced Teaching System (Priority: High)

#### 2.1 Interactive Teaching Engine
- [ ] Create proper teaching flow that teaches problem-solving approach
- [ ] Build mental models instead of content dumping
- [ ] Add sub-topic breakdown for each topic
- [ ] Add progress tracking within topics
- [ ] Make teaching adaptive based on user responses

#### 2.2 Feynman Integration (Full)
- [ ] Complete Feynman evaluation with proper JSON parsing
- [ ] Gap detection from Feynman results
- [ ] Fix gaps and re-teach functionality
- [ ] Progress reporting to main agent
- [ ] Update learning plan based on Feynman results

#### 2.3 Topic Management
- [ ] Add real topic selection (Math, Physics, Chemistry, Biology, etc.)
- [ ] CBSE syllabus-aligned topic mapping
- [ ] Subtopic progression system

### Phase 3: Engagement Features (Priority: Medium)

#### 3.1 Streak System
- [ ] Proper daily streak tracking
- [ ] Midnight IST reset logic
- [ ] Streak display in responses

#### 3.2 Interactive Buttons
- [ ] Add Twilio interactive buttons for:
  - Continue/Review/Practice/Progress options
  - Topic selection
  - Yes/No confirmations

#### 3.3 Commands Enhancement
- [ ] `/practice [topic]` - Generate practice questions
- [ ] `/review [topic]` - Review specific topic

### Phase 4: Monetization (Priority: Low)

#### 4.1 Payment Integration
- [ ] Razorpay account setup
- [ ] Payment link generation
- [ ] Webhook handler for payment confirmation
- [ ] Pro feature flags in user state

#### 4.2 Pro Features
- [ ] Unlimited questions
- [ ] Detailed analytics
- [ ] Streak protection
- [ ] PDF export

#### 4.3 Exam Packs
- [ ] JEE Calculus pack
- [ ] NEET Biology pack
- [ ] Generate via AI based on syllabus

### Phase 5: Production Ready (Priority: High)

#### 5.1 Deploy to Production
- [ ] Create real KV namespace in Cloudflare
- [ ] Deploy via `wrangler deploy`
- [ ] Set secrets via `wrangler secret put OPENCODE_API_KEY`
- [ ] Configure Twilio webhook to production URL

#### 5.2 Error Handling & Logging
- [ ] Add proper error logging
- [ ] Input sanitization
- [ ] Rate limiting to prevent abuse

#### 5.3 Testing
- [ ] Test with real WhatsApp messages
- [ ] Test full user flow with real device
- [ ] Test edge cases

---

## Current Known Issues

1. **Assessment timing**: Sometimes the final graph generation takes long - need to optimize
2. **Real topics**: Currently uses placeholder "First Topic" - needs real topic selection
3. **Teaching content**: Basic prompts, needs more comprehensive teaching approach
4. **Graph visualization**: Text-based only, could be improved with more formatting

---

## API Key Management

- **Stored in**: `.env` file (local), Cloudflare Secrets (production)
- **Key**: `sk-qjx6TwcivpebIZHCgTTIUF50fYYbieTY71wqijjBhXDxcWw7e8gU4Hdd1Cr3nTnf`
- **Model**: MiniMax M2.5 Free via OpenCode Zen
- **Never commit to Git** - excluded via .gitignore

---

## Testing Notes

- Local dev runs on port 8919
- Use different phone numbers for testing different user flows
- Health check: `curl http://localhost:8919/health`
- Webhook test: `curl -X POST http://localhost:8919/webhook -d "Body=hi" -d "From=+919999999999" -d "ProfileName=Test"`

---

## Next Immediate Steps

1. Test the full assessment → graph → teaching → feynman flow
2. Add real topic selection after syllabus
3. Enhance teaching prompts for better content
4. Deploy to production
5. Connect Twilio WhatsApp

---

## Project Files Structure

```
Clawppy/
├── .env                    # API keys (not committed)
├── .gitignore             # Excludes .env
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── wrangler.toml          # Cloudflare config
├── project.md             # Project specification
├── PLAN.md               # This file
└── src/
    ├── index.ts           # Main worker entry
    ├── types.ts           # TypeScript interfaces
    ├── handlers/
    │   └── message.ts     # Message processing logic
    └── utils/
        ├── kv.ts          # KV database operations
        └── gemini.ts      # AI API calls
```