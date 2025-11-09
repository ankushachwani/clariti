# 🌿 Clariti

**From chaos to clarity, one day at a time.**

Clariti is an AI-powered productivity platform for college students that transforms scattered academic tasks into clear, actionable priorities with a beautiful nature-inspired interface.

## ✨ Features

### 🎯 Smart Task Management
- **AI-Powered Prioritization**: Cohere AI intelligently analyzes and prioritizes tasks based on deadline proximity, importance, and context
- **Multi-Source Aggregation**: Automatically syncs tasks from Canvas, Gmail, Google Calendar, Discord, Slack, and Notion
- **Smart Filtering**: Filter tasks by status, priority, source, and date with beautiful animated UI
- **Duplicate Prevention**: Intelligent deduplication ensures each task appears only once, even across multiple syncs

### 📅 Dashboard & Calendar
- **Daily Brief**: Morning overview with your highest-priority tasks and completion progress
- **Tasks Due Today**: Real-time counter with timezone-aware calculations
- **Interactive Calendar**: Visual month view with all deadlines, events, and color-coded task sources
- **Priority Tasks Widget**: Quick access to your top 5 most important items

### 🔗 Seamless Integrations

#### Education
- **Canvas LMS**: Assignments, grades, course announcements, due dates, and modules

#### Communication & Collaboration
- **Gmail**: Academic emails and professor announcements (AI-filtered for importance)
- **Discord**: Course server announcements and important messages
- **Slack**: Team project communications, starred items, and reminders

#### Productivity
- **Google Calendar**: Events, meetings, and deadlines
- **Notion**: Personal notes and task databases

### 🤖 AI Capabilities
- Automatic task extraction from messages and emails
- Intelligent priority scoring (0-10 scale) based on:
  - Deadline urgency
  - Course importance
  - Assignment weight
  - Historical patterns
- Smart filtering of noise (only imports actionable items)
- Task summarization and description enhancement

### 🎨 Design System
- **EarthTone Theme**: Nature-inspired color palette with forest greens, moss, cream, sage, and earth browns
- **Organic Animations**: Smooth transitions powered by Framer Motion
- **Responsive Layout**: Beautiful on desktop, tablet, and mobile
- **Custom Typography**: Merriweather serif for headings, Open Sans for body text

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router), React 18, TypeScript |
| **Styling** | TailwindCSS with custom EarthTone palette |
| **Animation** | Framer Motion 12.x |
| **Database** | PostgreSQL with Prisma ORM |
| **AI** | Cohere API |
| **Authentication** | NextAuth.js with Google OAuth2 |
| **Icons** | Lucide React |
| **Calendar** | React Calendar |
| **Deployment** | Vercel |

## 🚀 Quick Start

```bash
git clone https://github.com/ankushachwani/clariti.git
cd clariti
npm install
cp .env.example .env
# Add your API keys to .env
npx prisma generate && npx prisma db push
npm run dev
```

**Required Setup:**
- PostgreSQL database
- Google OAuth (sign-in)
- Cohere API key (AI prioritization)
- Canvas/Discord/Slack/Notion tokens (optional integrations)

Check `.env.example` for all variables.

## 📁 Project Structure

```
clariti/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # NextAuth.js authentication
│   │   │   └── [...nextauth]/
│   │   ├── ai/                   # AI processing endpoints
│   │   ├── integrations/         # Integration OAuth & sync
│   │   │   ├── canvas/
│   │   │   ├── discord/
│   │   │   ├── gmail/
│   │   │   ├── google-calendar/
│   │   │   ├── notion/
│   │   │   ├── slack/
│   │   │   └── sync/            # Unified sync endpoint
│   │   ├── tasks/               # Task CRUD operations
│   │   │   └── [id]/
│   │   ├── user/                # User settings & notifications
│   │   └── cron/                # Scheduled jobs (prioritization)
│   ├── auth/                    # Auth pages
│   │   └── signin/
│   ├── dashboard/               # Main dashboard
│   ├── tasks/                   # Task management page
│   ├── calendar/                # Calendar view
│   ├── profile/                 # Profile & integrations
│   ├── onboarding/              # First-time setup
│   ├── globals.css              # Global styles + EarthTone theme
│   ├── layout.tsx               # Root layout with navbar
│   ├── page.tsx                 # Landing page
│   └── providers.tsx            # Client-side providers
├── components/
│   ├── dashboard/               # Dashboard widgets
│   │   ├── DailyBrief.tsx
│   │   └── PriorityTasks.tsx
│   ├── tasks/
│   │   └── TasksList.tsx        # Main task list with filters
│   ├── calendar/
│   │   └── CalendarView.tsx     # Interactive calendar
│   ├── profile/
│   │   ├── ProfileSettings.tsx
│   │   ├── IntegrationsPanel.tsx
│   │   └── NotificationSettings.tsx
│   ├── layout/
│   │   └── Navbar.tsx           # Navigation bar
│   └── shared/                  # Reusable components
│       ├── OrganicCard.tsx      # Animated card wrapper
│       ├── LeafButton.tsx       # Nature-themed button
│       └── PageTransition.tsx   # Page animations
├── lib/
│   ├── ai/
│   │   └── cohere.ts            # Cohere AI client & helpers
│   ├── auth/
│   │   └── auth-options.ts      # NextAuth configuration
│   ├── integrations/            # Integration API clients
│   │   ├── canvas.ts
│   │   ├── discord.ts
│   │   ├── gmail.ts
│   │   ├── google-calendar.ts
│   │   ├── notion.ts
│   │   └── slack.ts
│   ├── utils/
│   │   └── date-utils.ts        # Timezone helpers
│   └── prisma.ts                # Prisma client singleton
├── prisma/
│   └── schema.prisma            # Database schema
├── types/
│   ├── index.ts                 # Shared TypeScript types
│   └── next-auth.d.ts           # NextAuth type extensions
├── public/                      # Static assets
├── tailwind.config.ts           # TailwindCSS + custom colors
└── package.json
```

## 💻 Usage

1. Sign in with Google
2. Connect integrations in Profile
3. Click "Sync All" on Tasks page
4. Check Dashboard for prioritized tasks

**Daily:** Mark tasks complete, check priority tasks widget  
**Weekly:** Review calendar, sync integrations

## 🛠️ Development

```bash
npm run dev          # Start dev server
npx prisma studio    # View database
npm run build        # Production build
```

**Key APIs:**
- `PATCH /api/tasks/[id]` - Update task
- `POST /api/integrations/sync` - Sync all
- `POST /api/cron/prioritize` - Re-prioritize (requires CRON_SECRET)

## 🚀 Deploy

**Vercel:**
1. Push to GitHub
2. Import to Vercel (auto-detects Next.js)
3. Add environment variables
4. Update OAuth redirect URLs to production domain

**Database:** Railway, Supabase, or Vercel Postgres

## 🎨 EarthTone Design

Nature-inspired color palette with organic animations:
- **Forest Green** (#2D5B3D) - Primary
- **Moss Green** (#8FBC8F) - Accents  
- **Cream White** (#FFF8DC) - Backgrounds
- **Earth Brown** (#4A4A3A) - Text
- **Sunset Coral** (#FF6B6B) - High priority
- **Sunflower Yellow** (#FFD700) - Medium priority

Typography: Merriweather (serif), Open Sans (sans-serif)

## 🗺️ Roadmap

**Current (v1.0)**
- ✅ AI prioritization with Cohere
- ✅ 6 integrations (Canvas, Gmail, Calendar, Discord, Slack, Notion)
- ✅ Dashboard, tasks, calendar views
- ✅ EarthTone design system
- ✅ Duplicate prevention & timezone handling

**Future**
- [ ] Chrome extension
- [ ] Mobile app
- [ ] Study analytics
- [ ] Group collaboration
- [ ] Grade predictions

## 👥 Team

Built by Ankush, Anthony, and Linus

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

**Clariti** - One screen. One day. Total clarity.
