---
title: EdTech Hub Evidence Library Demo — Architecture
aliases: [EdTech Hub Evidence Library Demo — Architecture]
linter-yaml-title-alias: EdTech Hub Evidence Library Demo — Architecture
date created: Saturday, March 21st 2026, 5:29:33 pm
date modified: Sunday, March 22nd 2026, 8:54:53 am
---

# EdTech Hub Evidence Library Demo — Architecture

## Overview

This demo reimagines the EdTech Hub Evidence Library with AI-powered search, discovery, and interaction. It scrapes 50 documents from the existing library, enriches them with embeddings and AI summaries, and provides three distinct AI-powered interfaces.

## Data Pipeline

### Stage 1: Document Scraping (`scripts/scrape.ts`)

1. **Downloads the bulk RIS export** from the EdTech Hub's Supabase storage (~7,800 entries)
2. **Filters for documents with abstracts** (>30 chars) — yields ~3,400 candidates
3. **Fetches individual document pages** from `docs.edtechhub.org/lib/{KEY}`
4. **Parses the Next.js RSC payload** (React Server Components embed JSON data in `self.__next_f.push()` calls)
5. **Extracts metadata**: title, abstractNote, creators, itemType, date, DOI, tags, collections, institution
6. **Filters for substantive content** (abstract > 30 chars, not boilerplate)
7. **Inserts into Neon Postgres** `documents` table

**Output**: 50 documents with rich metadata in the database.

### Stage 2: Content Enrichment (`scripts/scrape-content.ts`)

For each document missing full text:

1. **Fetches the EdTech Hub page** and parses RSC data for attachment/source URLs
2. **Tries downloading PDFs** from EdTech Hub download URLs (`/lib/{KEY}/download/{ATTACH_KEY}/{filename}.pdf`)
   - Validates that the response is a real PDF (checks for `%PDF-` header) — many "download" URLs redirect to HTML pages
   - Parses PDF text using `pdf-parse` library
3. **Tries scraping the original source URL** (World Bank, UNICEF, GPE, etc.) as a web page
   - Strips HTML tags, scripts, styles, nav, footer
   - Extracts text from `<main>` or `<article>` elements when available
4. **Falls back to abstract** as minimal content if all else fails
5. **Stores full text** (up to 50K chars) in `documents.full_text`

**Challenge**: Most source pages are JS-rendered SPAs (React, Angular) that return empty HTML to server-side `fetch()`. A production system would use Playwright or a headless browser for these.

### Stage 3: Embedding Generation (`scripts/embed.ts`)

For each document in the database:

1. **Builds a text blob** from: title + abstract + full_text (if available)
2. **Chunks the text** into ~400-word segments with 50-word overlap
   - Short documents (< 400 words) become a single chunk
   - Full PDF documents may produce 5–50+ chunks
3. **Generates vector embeddings** using OpenAI `text-embedding-3-small` (1536 dimensions)
   - Input text is truncated to 8,000 characters per chunk
4. **Stores chunks + vectors** in the `embeddings` table with pgvector
5. **Generates an AI summary** using GPT-4.1-mini
   - 2-3 sentence plain-language summary for policymakers
   - Stored in `documents.ai_summary`

**Output**: 71 embeddings (50 documents, some with multiple chunks) + 48 AI summaries.

### Database Schema

```
documents
├── id (TEXT PK)          — EdTech Hub key (e.g., B77WZW29)
├── title, abstract       — From RIS/RSC scrape
├── authors (JSONB)       — [{firstName, lastName}]
├── item_type, date_published, doi, url, rights
├── tags (TEXT[])          — Filtered keywords
├── collections (JSONB)   — Topic hierarchy
├── institution (TEXT[])
├── full_text (TEXT)       — Scraped PDF/web content (up to 50K chars)
├── ai_summary (TEXT)      — GPT-4.1-mini generated summary
└── created_at

embeddings
├── id (SERIAL PK)
├── document_id → documents(id)
├── chunk_index (INTEGER)
├── chunk_text (TEXT)      — The text chunk
└── embedding (vector(1536)) — OpenAI text-embedding-3-small
    └── HNSW index for cosine similarity search
```

## AI Features

### 1. Evidence Finder (Semantic Search)

- **What it does**: Takes a natural language query, converts it to a vector, and finds the most semantically similar document chunks in the database
- **How it works**:
  1. User enters a query (e.g., "What works for girls' education with mobile phones?")
  2. Query is embedded using `text-embedding-3-small`
  3. pgvector performs cosine similarity search across all 71 chunks
  4. Results are deduplicated by document and ranked by similarity
  5. Each result shows a similarity score (% match)
- **Endpoint**: `GET /api/search?q={query}`

### 2. Document Q&A (Chat with a Single Document)

- **What it does**: Lets users ask questions about a specific document using RAG
- **How it works**:
  1. User asks a question on a document's detail page
  2. Question is embedded and matched against chunks from THAT document only
  3. Top 5 most relevant chunks are retrieved
  4. Chunks + question are sent to GPT-4.1-mini as context
  5. Response streams back in real-time
- **Endpoint**: `POST /api/chat` with `{ documentId, mode: "doc" }`

### 3. Repository Explorer (Chat Across All Documents)

- **What it does**: Synthesizes evidence across the entire 50-document corpus
- **How it works**:
  1. User asks a question (from the home page or by switching to "All docs" mode)
  2. Question is embedded and matched against ALL chunks in the database
  3. Top 8 most relevant chunks (from potentially different documents) are retrieved
  4. GPT-4.1-mini synthesizes an answer citing which documents support each point
  5. Response streams back in real-time
- **Endpoint**: `POST /api/chat` with `{ mode: "all" }`

### 4. Relevance Explainer

- **What it does**: Explains WHY a document matched (or didn't match well) a search query
- **How it works**:
  1. User clicks the "% match" badge on a search result
  2. A modal opens and sends the query, document title, matched chunk, and similarity score to GPT-4.1-mini
  3. The AI generates a 2-3 sentence explanation of the relevance
- **Triggered by**: Clicking the similarity badge in search results

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 16 (App Router, React Server Components) |
| Styling | Tailwind CSS 4 + EdTech Hub color palette |
| Database | Neon Postgres + pgvector |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Chat/Summaries | OpenAI GPT-4.1-mini |
| PDF Parsing | pdf-parse v1 |
| Font | Montserrat (matching EdTech Hub) |

## Color Palette (from EdTech Hub)

| Color | Hex | Usage |
|-------|-----|-------|
| Cream | `#F4F2EE` | Page background |
| Cream dark | `#EAE9E5` | Card backgrounds, secondary |
| Charcoal | `#11181C` | Nav, footer, primary text |
| Sky blue | `#5CACFD` | Primary accent, buttons, links |
| Blue dark | `#3B8DE8` | Hover states, type badges |
| Orange-red | `#DC3900` | Relevance scores, alerts |
| Gray | `#71717A` | Secondary text |
| Gray light | `#A1A1AA` | Tertiary text, labels |
