# agentic-qa-system

A chat system that reads your docs and answers questions with sources.

## features

- Real-time streaming answers (word by word)
- Saves conversations automatically
- Add docs via URL and search them
- Dark theme with glass UI
- Quick setup

## stack

Backend: FastAPI + LangChain + Pinecone + Supabase + OpenRouter
Frontend: Next.js + React + TypeScript + Tailwind

## setup

### 1. Get API keys

- Supabase: https://supabase.com (get URL + Service Role Key)
- Pinecone: https://pinecone.io (get API Key + Environment)
- OpenRouter: https://openrouter.ai (get API Key)

### 2. Backend

```bash
cd backend

# Create .env file with your keys
SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
PINECONE_API_KEY=your-key
PINECONE_ENVIRONMENT=your-env
PINECONE_INDEX_NAME=your-index
OPENROUTER_API_KEY=your-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
BACKEND_PORT=8000

# Install and run
pip install -r requirements.txt
python main.py
```

Backend runs at http://localhost:8000

### 3. Frontend

```bash
cd frontend

# Create .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Install and run
npm install
npm run dev
```

Frontend runs at http://localhost:3000

## how to use

1. **Add documents**: Click Ingest button, paste a URL, click submit
2. **Ask questions**: Type in chat box and press Enter
3. **Toggle streaming**: Click "Streaming" button to turn on/off
4. **Conversations save**: Reload page, same conversation loads

## api endpoints

### POST /api/chat
Ask a question (wait for full answer)

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is Python?",
    "conversation_id": "optional"
  }'
```

### POST /api/chat/stream
Ask a question (streaming, word by word)

```bash
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is Python?",
    "conversation_id": "optional"
  }'
```

### GET /api/chat/history/{conversation_id}
Get all messages from a conversation

```bash
curl http://localhost:8000/api/chat/history/conversation-id-123
```

### POST /api/ingest
Add a document

```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source_url": "https://docs.example.com"
  }'
```

## database tables

**conversations**: stores one conversation (id, title, created_at)

**message**: stores all messages (conversation_id, role, content, citations)

**ingestion_jobs**: tracks document processing (source_url, status, error)

## troubleshooting

**"I can't connect to backend"**
- Check backend is running: `python main.py`
- Check frontend .env.local has right URL
- Check port 8000 is not used by something else

**"I ask a question but get no answer"**
- Add a document first (click Ingest)
- Check your OpenRouter key works
- Check Pinecone has data

**"Streaming doesn't work"**
- Check backend is running
- Try switching to non-streaming mode
- Check network logs in browser

**"Frontend won't start"**
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

**"Conversation disappeared"**
- Same tab = same conversation (normal)
- New tab = new conversation (normal)
- Browser storage cleared = lost (normal)

## deploy

### Backend (Railway, Render, etc)

1. Push to GitHub
2. Set environment variables on hosting platform
3. Run: `pip install -r requirements.txt && python main.py`

### Frontend (Vercel, Netlify, etc)

1. Push to GitHub
2. Set: `NEXT_PUBLIC_API_BASE_URL=your-backend-url`
3. Deploy

## what's next

- Add login (multiple users)
- Conversation list on sidebar
- Upload files (not just URLs)
- Pick AI model at runtime
- Show token usage

## notes

- Conversations saved in Supabase (you control it)
- Needs internet (for AI and vector search)
- One person per chat session
- Streaming is default, toggle anytime
