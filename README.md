# Clariti

**From chaos to clarity, one day at a time.**

Clariti is an AI-powered productivity assistant built specifically for college students to transform scattered academic tasks into clear, actionable priorities.

![Clariti Dashboard](https://via.placeholder.com/800x400?text=Clariti+Dashboard)

## Features

### Core Functionality

- **AI-Powered Prioritization**: Cohere AI analyzes your tasks and assignments to intelligently prioritize what matters most
- **Smart Aggregation**: Centralizes data from Canvas, Gmail, Google Calendar, Discord, Slack, and Notion
- **Daily Debrief**: Personalized morning brief with your highest-priority tasks and progress tracking
- **Calendar Integration**: Visual calendar view with all your deadlines and events in one place
- **Task Management**: Complete task list with smart filtering and completion tracking

### Integrations

#### Education
- **Canvas LMS**: Sync assignments, grades, course announcements, and due dates

#### Communication
- **Gmail**: Import academic emails and professor announcements
- **Discord**: Monitor course server announcements
- **Slack**: Track team project communications

#### Productivity
- **Google Calendar**: Sync events, meetings, and deadlines
- **Notion**: Import personal notes and task databases

### AI Capabilities

- Task summarization and action-item extraction
- Intelligent priority scoring based on:
  - Deadline proximity
  - Course importance
  - Assignment weight
  - Past completion patterns
  - Attendance consistency
- Daily motivational messages

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | PostgreSQL with Prisma ORM |
| **AI** | Cohere API |
| **Auth** | NextAuth.js with Google OAuth2 |
| **Deployment** | Vercel / Railway |

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- Google account for OAuth
- Cohere API account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/clariti.git
   cd clariti
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/clariti"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
   COHERE_API_KEY="your-cohere-api-key"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   # ... other integrations
   ```

4. **Generate NextAuth secret**
   ```bash
   openssl rand -base64 32
   ```

5. **Set up database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Integration Setup

For detailed setup instructions for each integration, see [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md)

Quick links:
- [Database Setup](./INTEGRATION_SETUP.md#database-setup)
- [Cohere AI](./INTEGRATION_SETUP.md#cohere-ai-setup)
- [Google OAuth](./INTEGRATION_SETUP.md#google-oauth-gmail--calendar)
- [Canvas LMS](./INTEGRATION_SETUP.md#canvas-lms-integration)
- [Discord](./INTEGRATION_SETUP.md#discord-integration)
- [Slack](./INTEGRATION_SETUP.md#slack-integration)
- [Notion](./INTEGRATION_SETUP.md#notion-integration)

## Project Structure

```
clariti/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── auth/            # NextAuth routes
│   │   ├── integrations/    # Integration OAuth callbacks
│   │   ├── tasks/           # Task management API
│   │   └── user/            # User settings API
│   ├── dashboard/           # Dashboard page
│   ├── tasks/               # Tasks page
│   ├── calendar/            # Calendar page
│   ├── profile/             # Profile & settings page
│   └── auth/                # Auth pages
├── components/              # React components
│   ├── dashboard/          # Dashboard components
│   ├── tasks/              # Task components
│   ├── calendar/           # Calendar components
│   ├── profile/            # Profile components
│   ├── layout/             # Layout components
│   └── shared/             # Shared components
├── lib/                     # Utility libraries
│   ├── ai/                 # Cohere AI integration
│   ├── auth/               # NextAuth configuration
│   ├── integrations/       # Integration helpers
│   ├── utils/              # Utility functions
│   └── prisma.ts           # Prisma client
├── prisma/                  # Database schema
│   └── schema.prisma
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

## Usage

### First-Time Setup

1. **Sign in with Google**
   - Click "Sign In" on the homepage
   - Authorize Gmail and Google Calendar access

2. **Connect Integrations**
   - Go to Profile > Integrations
   - Click "Connect" for each integration you want to use
   - Follow OAuth authorization flows

3. **Sync Your Data**
   - After connecting integrations, click "Sync" on the Tasks page
   - Wait for initial data import (may take a few minutes)

4. **View Your Dashboard**
   - Go to Dashboard to see your daily debrief
   - Check priority tasks and completion progress

### Daily Workflow

1. **Morning**: Check your Daily Debrief for top priorities
2. **Throughout the day**: Mark tasks as complete
3. **Evening**: Review Calendar for upcoming deadlines
4. **Weekly**: Check Tasks page with filters for planning

## Development

### Running Tests

```bash
npm run test
```

### Building for Production

```bash
npm run build
npm run start
```

### Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Generate new Prisma Client after schema changes
npx prisma generate
```

### Environment Variables

See `.env.example` for all required environment variables.

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/clariti)

### Railway

1. Connect GitHub repository
2. Add PostgreSQL database
3. Configure environment variables
4. Deploy

See [INTEGRATION_SETUP.md#deployment](./INTEGRATION_SETUP.md#deployment) for detailed instructions.

## API Documentation

### Task Endpoints

- `PATCH /api/tasks/[id]` - Update task (mark complete/incomplete)
- `DELETE /api/tasks/[id]` - Delete task

### User Endpoints

- `PATCH /api/user/settings` - Update user profile and preferences
- `PATCH /api/user/notifications` - Update notification settings

### Integration Endpoints

- `GET /api/integrations/[provider]/connect` - Initiate OAuth flow
- `GET /api/integrations/[provider]/callback` - OAuth callback
- `POST /api/integrations/sync` - Trigger sync for all integrations

## Roadmap

### MVP (Current)
- ✅ Dashboard with daily debrief
- ✅ Task management with AI prioritization
- ✅ Calendar view
- ✅ 6 core integrations
- ✅ Profile and settings

### Stretch Features
- [ ] Chrome extension for auto-detecting assignments
- [ ] Auto-tagging tasks by class/course
- [ ] Group project collaboration views
- [ ] Study analytics and insights
- [ ] Attendance risk prediction model
- [ ] Mobile app (React Native)
- [ ] Browser notifications
- [ ] Email digest

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for **HackUMass 2024**
- Powered by **Cohere AI** for intelligent task prioritization
- Inspired by the need to help college students manage information overload

## Team

- **Ankush** - Developer
- **Anthony** - Developer
- **Linus** - Developer

## Support

For questions or issues:
- Open an issue on GitHub
- Check [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md) for integration help
- Review the troubleshooting section

---

**Clariti** - One screen. One day. Total clarity.
