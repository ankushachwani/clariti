# Clariti – AI Productivity Web App for College Students  
### HackUMass Project – Full App Development Prompt

---

## 🚨 Problem Statement
College students face severe **information overload**. Academic content and tasks come from countless scattered sources:

- Canvas / LMS notifications  
- Gmail emails  
- Discord / Slack server announcements  
- PDFs, documents, class notes  
- Personal to-do lists, calendars  
- Class attendance / assignment history  

Students struggle to identify:  
✅ What is important?  
✅ What needs to be done **today**?  
✅ What am I missing?  

Clariti solves this by transforming chaos into clarity.

---

## 🎯 Mission
Create a **web-based AI assistant** that:
- Centralizes course + personal productivity data
- Summarizes large sources of text with **Cohere API**
- Presents **ONE actionable daily brief** with highest-priority tasks
- Automates organization + reminders
- Boosts focus while reducing overwhelm

> “Turn scattered information into calm, clear priorities students can act on.”

---

## 🧠 Core Features

### ✅ Smart Data Aggregation
Securely sign in with:
- Canvas / LMS ➝ assignments + grades + attendance + class events
- Gmail ➝ academic emails, professor announcements
- Discord ➝ course server announcements
- Slack ➝ team project communications
- Notion ➝ personal notes and tasks
- Calendar (Google/Microsoft) ➝ meetings + deadlines

### ✅ AI-Powered Summarization & Prioritization
Using **Cohere API**, generate:
- Short task summaries
- Priority scores based on:
  - Deadline urgency
  - Submission status
  - Class weight/importance
  - Missed assignments or attendance warnings

Example alert:
> “You’ve missed two lectures in CS220 — next one is tomorrow at 10am. Make sure to attend!”

### ✅ Daily Debrief Dashboard
Every morning:
→ Greeting based on user time zone  
→ Motivational 4–5 word message  
→ # tasks due today  
→ % completed today  
→ Priority Tasks list  
→ “View More” linking to original source  

---

## 💻 Web App UI Structure

### 🏠 Home (Dashboard)
- Dynamic greeting based on time + user timezone
- Motivational message (“Lock in!”, “Focus up!”)

**Daily Snapshot**
- Tasks due today (count)
- Completed today (count)
- Progress bar (Completed %)

**Priority Tasks**
- List view; swipe/checkbox to complete
- Expand task for details + source link
- Add/Delete/Edit manual tasks

---

### ✅ Tasks Page
- View ALL tasks from every connected app
- Filter:
  - High priority
  - Due today
  - Due this week
  - Overdue
- Quick sync button with integrations

---

### 📆 Calendar View
- Monthly/Weekly toggle
- Tasks appear as dots/tags on each day
- Click to expand daily agenda
- Sync with user’s external calendar(s)

---

### 👤 Profile / Settings Page
- Name, Email, Academic Year
- Theme toggle: Light / Dark
- 🔗 Integrations Management
  - Connect / Disconnect: Canvas / Notion / Gmail / Slack / Discord / Calendar
- Notification Preferences
  - Daily Brief
  - Assignment Reminder Alerts
  - Attendance Alerts

---

## 🔐 Authentication Requirements
- OAuth2 for Gmail, Calendar
- OAuth2 or API tokens for Canvas / Discord / Slack
- Secure session management
- Per-user encrypted data storage

---

## 🧩 Integrations (MVP Ranking)
1. Canvas  
2. Gmail  
3. Calendar  
4. Slack  
5. Discord  
6. Notion  

Backend service checks for updates hourly.

---

## 🤖 AI + Backend Logic

### Prioritization Algorithm Inputs
| Factor | Weight |
|--------|-------|
| Deadline proximity | High |
| Course importance | Medium |
| Assignment % weight | High |
| Past completion of coursework | Medium |
| Attendance consistency | Medium |
| Inbox importance classification | Low–Medium |

### Cohere API Use Cases
- Extract key task info from emails + announcements
- Summarize long content into 1 actionable step
- Generate urgency scoring and reminders

Example Prompt:
> “Summarize this Canvas update into a single action-item with urgency score out of 10.”

---

## ✅ Development To-Dos
- Create Canvas “Teacher” dev account
- Add fake students: **Ankush, Anthony, Linus**
- Build backend callbacks for Canvas + Gmail ingestion
- Implement AI processing using Cohere
- Build Dashboard UI → priority task layout

---

## 🏗️ Tech Stack

| Layer | Technology |
|------|-----------|
| Frontend | React / Next.js, TailwindCSS |
| Backend | Node.js + Express (or Supabase / Firebase) |
| AI | Cohere API |
| Database | PostgreSQL / MongoDB |
| Scheduling | CRON / Serverless triggers |
| Auth | OAuth2 + JWT |

---

## 📌 Stretch Features
- Chrome extension to detect assignment info
- Auto-tagging tasks by class
- Group project collaboration views
- Study analytics
- Attendance risk prediction model

---

## 🚀 Success Metrics
- Reduce unseen overdue tasks by 50%
- Increase student clarity + productivity satisfaction
- Track daily active engagement trends

---

## 🌟 Differentiator
Other tools make lists.
**Clariti tells you what matters.**

> One screen. One day. Total clarity.

---

## 🔥 Pitch Slogan
**Clariti — From chaos to clarity, one day at a time.**
