# MindFlow

MindFlow is a visual mind map editor built for fast, manual idea structuring on an infinite canvas. The product focuses on low-friction editing, clean map-first UX, and lightweight collaboration-ready foundations without enterprise-heavy UI.

## What is included

- Dashboard for creating, opening, duplicating, and deleting maps
- Infinite-canvas editor built with React Flow / XYFlow
- Multiple layout modes: radial, right-tree, and top-down
- Contextual editing toolbars, comments, links, and rich-text side documents
- PNG, PDF, and Markdown export
- English and Russian localization
- Local browser persistence via `localStorage`

## Current status

This repository contains the current MVP frontend. There is no backend, authentication, or cloud sync yet. Mind maps are stored in the browser on the current device.

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Zustand
- XYFlow / React Flow
- `html-to-image` and `jspdf` for exports

## Project structure

- `src/app` - Next.js routes and layout
- `src/components` - dashboard, editor, nodes, popovers, modals
- `src/stores` - Zustand state stores
- `src/lib` - types, i18n, constants, local persistence API
- `src/engine` - layout engine
- `public` - static assets
- `instructions` - product and UX specification used during development

## Local development

Recommended environment:

- Node.js 20+
- npm 10+

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Quality checks:

```bash
npm run lint
npm run build
```

## Notes for publishing

- The repository is configured to ignore local build caches, local agent settings, and session logs.
- Environment files are ignored by default through `.gitignore`.
- Before public deployment, decide whether you want to keep local-only storage or add a backend for persistence and sharing.

## Deployment

The app can be deployed to platforms that support Next.js, such as Vercel.
