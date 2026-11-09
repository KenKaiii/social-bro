# Social-Bro

Search YouTube, TikTok & Instagram from one place. Find content, grab transcripts, repurpose scripts.

> [!TIP]
> **Want to build your own apps with AI?** A free 7-day build challenge and 20+ step-by-step projects are in my free community: **[skool.com/raid](https://www.skool.com/raid)**

## What It Does

- **Unified Search** - Query all platforms at once, filter by creator with @username
- **Content Repurposing** - Extract YouTube transcripts and generate shorter versions for other platforms
- **Hook Generator** - AI-powered opening lines to grab attention
- **Search History** - Save and revisit your searches

## Prerequisites

- Node.js 18+
- Docker

## Setup

```bash
# Clone it
git clone https://github.com/KenKaiii/social-bro.git
cd social-bro

# Install deps
npm install

# Set up env
cp .env.example .env
# Edit .env with your secrets (generate with: openssl rand -base64 32)

# Start database
docker compose up -d

# Run migrations
npm run db:migrate

# Start the app
npm run dev
```

Open [localhost:3000](http://localhost:3000) and you're good.

## Tech Stack

Next.js 16 • React 19 • PostgreSQL • Prisma • TailwindCSS • NextAuth

## Author

Built by [Ken](https://github.com/KenKaiii) — subscribe to [YouTube](https://youtube.com/@kenkaidoesai) and join the [free Skool community](https://www.skool.com/raid) for a 7-day build challenge and 20+ step-by-step projects.

## License

MIT
