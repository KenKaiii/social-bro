# Social-Bro

Search YouTube, TikTok & Instagram from one place. Find content, grab transcripts, repurpose scripts.

> [!TIP]
> **Want to build your own apps with AI?**
> - **Raid+:** make money with AI, a sellable app in 30 days, live every Thursday: [skool.com/kenkai](https://www.skool.com/kenkai)
> - **Want it built for you?** [work.kenkais.com](https://work.kenkais.com/)

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

Built by [Ken](https://github.com/KenKaiii) — subscribe to [YouTube](https://youtube.com/@kenkaidoesai).

Want to make money with AI? [Raid+](https://www.skool.com/kenkai) gets you a sellable app in 30 days, live every Thursday. Want it built for you? [work.kenkais.com](https://work.kenkais.com/).

## License

MIT
