# Product Requirements Document
## Moin Patel — Personal Portfolio & Project Case Study Platform

| Field | Value |
|---|---|
| Document version | 1.0 |
| Date | 14 August 2026 |
| Status | Draft — pending approval from Moin Patel |
| Product owner | Moin Patel |
| Document owner | Moin Patel |
| Product name | `moin-portfolio` (working name) |
| Target release | V1 |
| Stack | React 19 · TypeScript · Vite · Supabase (PostgreSQL, Auth, Storage) · Git/GitHub · Vercel |

---

## Document Control

**Purpose.** This document is the single source of truth for the design and implementation of the platform. Any developer or AI coding agent working on the repository must read this document before making changes, and must not implement behaviour that is not specified here.

**Requirement priority labels.** Every requirement carries one of:

| Label | Meaning | Release |
|---|---|---|
| **P0** | Critical. V1 cannot ship without it. | V1 |
| **P1** | Important. Ships in V1 unless explicitly deferred by the product owner. | V1 |
| **P2** | Nice to have. Ships in V1 only if time allows. | V1 / V1.1 |
| **P3** | Future. Explicitly out of V1 scope. | V2+ |

**Requirement IDs.** Requirements use the format `FR-<AREA>-<NN>` (functional), `NFR-<AREA>-<NN>` (non-functional), `AC-<AREA>-<NN>` (acceptance criteria), `TD-<NN>` (technical decision), `R-<NN>` (risk), `Q-<NN>` (open question). IDs are permanent. If a requirement is dropped, mark it `WITHDRAWN` — do not reuse the ID.

**Missing information.** Anything not supported by the supplied source material is marked `[REQUIRES USER INPUT]` and collected in **Section 49 — Information Required From Moin**. No developer may resolve a `[REQUIRES USER INPUT]` marker by inventing content.

> ### ⚠ Source-material notice
>
> The brief refers to an attached resume. **No resume file was present in this session.** All resume-derived content in this PRD comes from the summary contained in the brief itself. Before Phase 4 (seed data), the actual resume PDF must be supplied and the seed content verified line by line against it. Until then, every seed value in Section 28 is marked **UNVERIFIED**.

---

## 1. Executive Summary

Moin Patel is an AI Developer / AI Automation Executive in Surat, Gujarat. He builds websites, internal tools, AI-powered systems, and automation workflows that reduce manual work, digitise manual processes, and turn operational data into usable information for businesses.

His current online presence does not represent this. A conventional resume site would not either, because his value is not a list of technologies — it is the ability to look at a manual business process, model it, and replace it with a system. That case has to be **shown**, project by project, in business language and technical language at the same time.

This product is therefore three things in one deployable unit:

1. **A public portfolio site** — professional identity, experience, skills, education, contact.
2. **A project case-study platform** — each project rendered as a structured case study: problem → solution → how it works → architecture → technology → business impact → challenges → lessons.
3. **A lightweight admin CMS** — Moin manages 100% of public content (projects, case studies, experience, skills, education, social links, resume, media, site settings) and reads contact messages, without touching source code or redeploying.

The backend follows the same database-first Supabase philosophy already proven on CostCraft/FoodMetrics: PostgreSQL schema defined in versioned SQL migrations, seed data in source control, Row Level Security as the real authorisation boundary, Supabase Auth for the single admin identity, Supabase Storage for media and resume, and strict separation between frontend presentation and backend data rules. The database must be reproducible from `supabase db reset` on any machine, with no undocumented dashboard-created objects.

**V1 success looks like:** a recruiter understands who Moin is within 30–60 seconds; a business owner can read one case study and understand what problem was solved and what it was worth operationally; a technical hiring manager can see the architecture and stack behind each system; and Moin can publish a new project in under ten minutes without a developer.

---

## 2. Product Vision

> **Vision statement.** A portfolio that does not describe an AI developer — it demonstrates one, by showing the real systems he has built, the real problems they replaced, and the way he thinks about business processes.

**Positioning line (approved, use verbatim in the hero):**
> "Building AI-powered systems that automate work, save time, and reduce business costs."

**The intersection the site must communicate:**

```
        Business understanding
                  +
                 AI
                  +
            Automation
                  +
         Web development
                  +
        Process optimisation
                  ↓
   Systems that replace manual work
```

**What the site must never imply.** That Moin is a theory-only AI enthusiast, a prompt hobbyist, or a template developer. Every claim on the site must trace back to a system that exists.

**Product principles.**

| # | Principle | Consequence for the build |
|---|---|---|
| 1 | Evidence over adjectives | Every capability claim links to a project. No standalone buzzword sections. |
| 2 | Business language first, technical depth second | Every case study leads with the problem in operational terms, then goes deep. |
| 3 | Honest status | In-progress work is labelled in-progress everywhere, always. |
| 4 | No invented numbers | If a metric was not measured, it is not shown. Qualitative impact statements are allowed; fabricated percentages are not. |
| 5 | Content is data, not code | Adding a project is a database row, never a commit. |
| 6 | Security at the database, not the UI | Hiding an admin button is not access control. RLS is. |
| 7 | Confidentiality by default | Employer-owned systems are publishable only with explicit permission, and only at the level of detail permitted. |

---

## 3. Goals

### 3.1 Product goals

| ID | Goal | Priority | Measure |
|---|---|---|---|
| G-01 | A recruiter can identify role, stack, experience and contact route within 60 seconds | P0 | Homepage above-fold contains name, title, positioning line, primary CTA, resume CTA |
| G-02 | Every published project is a complete case study, not a card with a link | P0 | 100% of published projects have problem, solution, how-it-works and impact populated |
| G-03 | Moin can add, edit, publish, unpublish and reorder all content without code changes | P0 | All 9 content types have working CRUD + draft/publish + sort order in `/admin` |
| G-04 | Business visitors can convert without leaving the site | P0 | Contact form stores to database; service-type captured; admin can triage |
| G-05 | The database is reproducible from migrations alone | P0 | `supabase db reset` on a clean machine produces a working, seeded local environment |
| G-06 | No unauthorised party can read or write private data | P0 | RLS test suite passes; anon role cannot read `contact_messages` or write any content table |
| G-07 | The site loads fast on mid-range Indian mobile networks | P1 | Lighthouse Performance ≥ 90 on mobile for `/` and `/projects/:slug` |
| G-08 | The site is usable by keyboard and screen reader | P1 | WCAG 2.1 AA on all public pages; zero critical axe violations |
| G-09 | Project pages produce correct link previews when shared | P1 | Per-project title, description and OG image resolve for crawlers |

### 3.2 Non-goals for V1

See Section 4.

---

## 4. Non-Goals

The following are explicitly **out of scope for V1** and must not be built, scaffolded, or partially implemented "for later". Any of them may be reconsidered in V2 only after written approval.

| ID | Non-goal | Rationale |
|---|---|---|
| NG-01 | Public user registration or visitor accounts | The only authenticated identity is the site owner. |
| NG-02 | Full CRM, lead pipeline, deal stages | Contact messages are a triage inbox, not a CRM. |
| NG-03 | Payments, invoicing, billing, e-commerce | No transactional surface in V1. |
| NG-04 | Multi-tenant architecture / multiple portfolio owners | Single-owner product. No `tenant_id` columns. |
| NG-05 | Social network features (likes, follows, comments) | Not aligned with positioning. |
| NG-06 | A large AI chatbot / "ask my portfolio" assistant | Deferred to V2 (see Section 45). Adds cost, latency, hallucination and abuse surface. |
| NG-07 | Heavy 3D / WebGL scenes | Conflicts with performance targets and the "premium, not gaming" brand direction. |
| NG-08 | Microservices, separate Node API server, custom auth | Supabase is the backend. A second backend is unjustified complexity. |
| NG-09 | Blog / CMS for long-form articles | V2. Case studies serve the V1 content need. |
| NG-10 | Newsletter, email marketing, automation drips | V2. |
| NG-11 | Internationalisation / multi-language | English only in V1. Schema must not block it later. |
| NG-12 | Server-side rendering framework migration (Next.js) | See TD-02. Prerendering covers the V1 SEO need. |

---

## 5. Target Users

| Segment | Share of value | Primary question they arrive with | What they need in the first screen |
|---|---|---|---|
| A. Recruiters / talent teams | High | "Is this person a real, hireable AI developer?" | Name, title, positioning line, experience, skills, resume, contact |
| B. Business owners / potential clients | High | "Can this person fix my manual process?" | Business-outcome language, proof of built systems, service types, contact CTA |
| C. Technical hiring managers / developers | High | "Can he actually build and reason about systems?" | Stack, architecture, workflow diagrams, GitHub, live demos, technical depth |
| D. Moin himself (admin) | Operational | "Can I publish this project right now?" | Fast, forgiving CMS with draft/publish and no deploy step |
| E. Peers / referrers | Low | "What should I introduce him as?" | Shareable link previews, clear one-line identity |

**Audience conflict and its resolution.** Segments B and C want opposite things from the same page: B wants outcomes and plain language; C wants architecture and specifics. The resolution is **layered depth** — the project card and the top third of each case study speak business; the middle and lower sections speak engineering. Neither audience is asked to scroll past content that is useless to them before reaching value: business impact appears above the fold of the case study, architecture appears immediately after, both linked from a sticky in-page navigation on desktop.

---

## 6. User Personas

### Persona 1 — Priya, Technical Recruiter (Segment A)
- **Context:** Screening 40 profiles for an AI/automation role. Opens the link from a resume or LinkedIn, on desktop, with 12 tabs open.
- **Behaviour:** Scans. Does not read. Leaves in under a minute if identity is unclear.
- **Needs:** Job title, location, years/recency of experience, stack keywords, education, downloadable resume, one-click contact.
- **Fails if:** She has to scroll to learn what he does; the resume is a broken link; the phone/email are images; the site is slow to first paint.
- **Requirements driven:** FR-HOME-02, FR-RES-03, FR-NAV-01, NFR-PERF-01.

### Persona 2 — Rakesh, Restaurant Group Owner (Segment B)
- **Context:** Runs 4 outlets. Someone forwarded the link. Opens on mobile, at night, on a 4G connection.
- **Behaviour:** Reads headlines and impact statements. Does not care about frameworks. Wants to know "has he solved something like my problem".
- **Needs:** Plain-language problem statements, before/after of a manual process, evidence the system is real, an easy way to describe his own problem.
- **Fails if:** The first thing he sees is a tech-logo wall; case studies are written for engineers; the contact form asks for a GitHub URL.
- **Requirements driven:** FR-HOME-05, FR-CASE-03, FR-CONT-02, FR-CONT-03.

### Persona 3 — Arjun, Engineering Manager (Segment C)
- **Context:** Evaluating for a junior/mid AI-automation engineering role. Wants to see whether the systems are real and reasoned.
- **Behaviour:** Goes straight to `/projects`, opens the most complex-sounding one, looks for architecture and trade-offs, checks GitHub.
- **Needs:** Data flow, chosen services and why, failure handling, what was hard, what was learned, honest status labels.
- **Fails if:** Case studies are marketing copy with no mechanism; "AI-powered" is claimed with no model, pipeline or data path named; a project claims completion without evidence.
- **Requirements driven:** FR-CASE-04, FR-CASE-05, FR-PROJ-08, FR-PROJ-11.

### Persona 4 — Moin, Site Owner (Segment D)
- **Context:** Finishes a system at work, has 20 minutes, wants it live — from a laptop or occasionally a phone.
- **Behaviour:** Writes the case study in stages. Wants to save half-finished work without publishing it.
- **Needs:** Draft state, autosave-safe forms, image upload with preview, reorder by drag or number, preview before publish, confidence that nothing leaks.
- **Fails if:** Publishing requires a deploy; a form loses content on validation error; there is no way to hide a project temporarily.
- **Requirements driven:** FR-ADM-01 … FR-ADM-14, FR-PROJ-03.

---

## 7. User Journeys

### J-01 — Recruiter: screen and contact (P0)
```
LinkedIn/resume link
  → / (hero: name, title, positioning line, photo, CTAs)
  → scans About + Experience + Skills strip
  → clicks "Download Resume" (opens PDF in new tab, logged if analytics enabled)
  → clicks "Let's Talk" → /contact
  → submits form (service type: Other)
  → sees success state with expected response time
```
**Critical moments:** hero clarity (0–5s), resume link integrity (must never 404), form success confirmation.

### J-02 — Business owner: problem recognition (P0)
```
/ → "What I Build" section (service framing, plain language)
  → "Impact / Business Value" section
  → Featured Projects → picks Recipe Costing & Restaurant Operations System
  → /projects/recipe-costing-restaurant-operations
  → reads Problem (manual spreadsheet costing) and Business Impact
  → clicks in-page "Discuss a similar system" CTA
  → /contact?service=business_process_automation (prefilled service type)
  → submits
```
**Critical moments:** the Problem section must be recognisable to a non-technical operator; the CTA must appear at the end of the case study, not only in the nav.

### J-03 — Engineer: technical verification (P0)
```
/projects (grid, status + category visible on every card)
  → opens Capiche AI Feedback Automation
  → reads How It Works + Architecture / Workflow (pipeline diagram)
  → reads Technology (OCR, Gemini 2.5 Flash, Google Sheets)
  → reads Challenges + What I Learned
  → clicks GitHub (if the project's visibility mode exposes it)
  → Next Project → Exam Build Platform (clearly badged IN PROGRESS)
```
**Critical moments:** the pipeline must be rendered as an ordered visual, not a paragraph; status badges must be unambiguous.

### J-04 — Owner: publish a new project (P0)
```
/admin/login → Supabase Auth (email + password)
  → /admin/dashboard (counts: projects, drafts, unread messages)
  → /admin/projects/new
  → fills title → slug auto-generates (editable, uniqueness checked live)
  → fills case-study fields, attaches technologies, uploads cover + gallery images with alt text
  → sets status = In Progress, publication = Draft
  → Save → returns to list, row shows DRAFT
  → later: Preview → /projects/:slug?preview=1 (admin session only)
  → sets publication = Published → appears publicly within one cache cycle
```
**Critical moments:** no data loss on validation failure; alt text required before publish; preview must not require publishing.

### J-05 — Owner: triage an enquiry (P1)
```
/admin/dashboard → "3 unread"
  → /admin/messages → filter New
  → opens message → auto-marks Read
  → clicks mailto reply → returns → marks Replied
  → archives
```

### J-06 — Unauthorised access attempt (P0, negative journey)
```
Direct navigation to /admin/projects without a session
  → route guard redirects to /admin/login with a returnTo param
  → even if the guard is bypassed in the client, every write is rejected by RLS
  → anonymous SELECT on contact_messages returns zero rows, not an error leak
```

---

## 8. Brand Positioning

### 8.1 Brand personality
Professional · intelligent · technical · modern · premium · practical · business-focused · confident. **Not** playful, not edgy, not academic, not agency-salesy.

The nearest correct reference is a well-made developer-tools product page (Linear, Supabase, Vercel docs) — restrained surfaces, precise typography, one accent used sparingly — applied to a person rather than a product.

### 8.2 Tone of voice

| Do | Don't |
|---|---|
| "Replaced a spreadsheet-based costing process with a single web application." | "Leveraged cutting-edge AI to revolutionise costing." |
| "OCR extracts the text, Gemini 2.5 Flash structures it, validation and de-duplication run before the data reaches Sheets." | "Powered by next-gen multimodal intelligence." |
| "In progress — user management and exam management are built; automated evaluation is under development." | "Coming soon!" or silence about status. |
| "Reduced spreadsheet dependency and centralised recipe information." | "Saved 40% of costs." (unmeasured) |
| Active voice, first person on About, third-neutral on case studies | Passive corporate voice, or "we" for a solo portfolio |

**Banned vocabulary (V1):** revolutionary, cutting-edge, game-changing, synergy, 10x, ninja, rockstar, guru, "AI-powered" used without naming the model or mechanism, any percentage or currency figure that has not been measured and approved by Moin.

### 8.3 Messaging hierarchy

```
Level 1 (hero, 1 line)     Building AI-powered systems that automate work,
                           save time, and reduce business costs.
Level 2 (sub-hero, 2 lines) AI Developer / AI Automation Executive · Surat, India
                           I build internal tools, web applications and automation
                           workflows that replace manual business processes.
Level 3 (section headers)  What I Build · How It Helps Businesses · Selected Work
Level 4 (proof)            Case studies with problem, mechanism and outcome
Level 5 (credentials)      Experience · Skills · Education · Resume
```

### 8.4 CTA language

| Position | Label | Destination | Priority |
|---|---|---|---|
| Hero primary | **View My Work** | `/projects` (or `#featured-projects` on home) | P0 |
| Hero secondary | **Let's Talk** | `/contact` | P0 |
| Hero tertiary | **Download Resume** | signed resume URL, new tab | P1 |
| Nav (persistent) | **Contact** | `/contact` | P0 |
| End of case study | **Discuss a similar system** | `/contact?service=<mapped>` | P1 |
| Footer | **Email me** / social icons | `mailto:` + external | P0 |

CTA rules: one primary action per viewport; button labels are verbs; the same action keeps the same label everywhere ("Let's Talk" never becomes "Get in touch" on another page).

### 8.5 Visual identity

**Direction:** Premium + futuristic + developer. Dark-first, high-contrast typography, one accent family (blue/indigo), generous spacing, restrained motion.

**Signature element (the one memorable thing):** a **process-line motif** — a thin, animated connector line with node markers that runs through "What I Build", the case-study pipeline diagrams, and the experience timeline. It encodes the actual subject matter (workflows and pipelines), so it is structural, not decorative. It is the only place where motion is allowed to be expressive; every other animation is a 150–250 ms fade/rise.

**Explicitly forbidden:** neon glow stacks, gaming aesthetics, animated gradient meshes as page backgrounds, parallax hero images, tilting 3D cards, typewriter loops cycling job titles, particle backgrounds, and full-page scroll-jacking.

Tokens are specified in Section 32.

---

## 9. Information Architecture

### 9.1 Structure

```
PUBLIC
├── /                       Home (composite: all sections, summarised)
├── /about                  Full narrative bio + approach + education
├── /experience             Full experience timeline
├── /projects               Project index (grid + filters)
├── /projects/:slug         Project case study
├── /skills                 Full categorised skills
├── /contact                Contact form + direct channels
├── /resume                 Resume viewer + download
├── /404                    Not found
└── /500                    Unexpected error boundary

ADMIN (authenticated)
├── /admin                  → redirects to /admin/dashboard or /admin/login
├── /admin/login            Supabase Auth sign-in
├── /admin/dashboard        Counts, recent messages, drafts, quick actions
├── /admin/projects         List (search, filter by state/status)
│   ├── /admin/projects/new
│   └── /admin/projects/:id/edit
├── /admin/experience       List + inline editor
├── /admin/skills           Categories + skills
├── /admin/education        List + editor
├── /admin/social-links     List + reorder
├── /admin/messages         Inbox (new/read/replied/archived)
├── /admin/media            Storage browser (project + profile buckets)
├── /admin/resume           Resume versions, upload, publish
└── /admin/settings         Profile, site settings, SEO defaults
```

### 9.2 Deviations from the proposed route list (justified)

| Change | Reason |
|---|---|
| Added `/admin/social-links` | The brief requires database-driven social links with CRUD. Burying them in `/admin/settings` mixes a list resource with a key-value resource and complicates the form. |
| Added `/admin/resume` | Resume versioning (upload, publish, retain previous) is a resource with its own list; it does not belong in a settings form. |
| `/admin/media` scoped to a browser, not an uploader | Uploads happen inside the project/profile forms where context exists. `/admin/media` exists to review and delete orphaned files. |
| `/education` has **no** public route | Education is a short block; it lives on `/about` and Home. A dedicated page would be a near-empty page and a weak SEO target. Education remains a full CRUD resource in admin. |
| Added `/404`, `/500` | Required by Section 38. |

### 9.3 Navigation model

- **Desktop header (sticky, translucent on scroll):** Logo/monogram · About · Experience · Projects · Skills · Contact · `Resume` (outline button).
- **Mobile (< 768px):** logo + hamburger → full-screen sheet, links stacked, primary CTA pinned at the bottom of the sheet, focus trapped, `Esc` and backdrop close, body scroll locked.
- **Active state:** current route underlined with the accent; on Home, section-scroll spy updates the active item.
- **Admin navigation:** persistent left sidebar on ≥1024px, collapsible; bottom tab bar on mobile with the five most-used destinations (Dashboard, Projects, Messages, Media, Settings).
- **Breadcrumbs:** admin only (`Projects / Edit / <title>`). Public site is shallow enough not to need them.

---

## 10. Complete Sitemap

| Route | Auth | Data sources | SEO indexed | Priority |
|---|---|---|---|---|
| `/` | Public | `profiles`, `projects` (featured), `experience`, `skills`, `education`, `social_links`, `site_settings` | Yes | P0 |
| `/about` | Public | `profiles`, `education`, `skills` | Yes | P0 |
| `/experience` | Public | `experience`, `experience_items`, `experience_technologies` | Yes | P0 |
| `/projects` | Public | `projects`, `project_technologies`, `technologies` | Yes | P0 |
| `/projects/:slug` | Public | `projects`, `project_images`, `project_technologies` | Yes, dynamic metadata | P0 |
| `/skills` | Public | `skill_categories`, `skills` | Yes | P1 |
| `/contact` | Public | `site_settings`, `social_links`; writes `contact_messages` | Yes | P0 |
| `/resume` | Public | `resume_versions` (published), `profiles` | Yes | P1 |
| `/404`, `/500` | Public | — | `noindex` | P0 |
| `/admin/*` | Admin | all tables | `noindex, nofollow` | P0 |

**Sitemap generation:** `sitemap.xml` is generated at build time from published projects plus the static public routes. `robots.txt` disallows `/admin`. Both are covered in Section 35.

---

## 11. Functional Requirements — Overview

| Area | Code | Requirement count | V1 |
|---|---|---|---|
| Global / navigation | NAV | 8 | P0 |
| Homepage | HOME | 12 | P0 |
| Projects | PROJ | 16 | P0 |
| Case studies | CASE | 10 | P0 |
| Experience | EXP | 7 | P0 |
| Skills | SKILL | 6 | P0/P1 |
| Education | EDU | 5 | P1 |
| Contact | CONT | 11 | P0 |
| Resume | RES | 6 | P1 |
| Admin CMS | ADM | 18 | P0 |
| Authentication | AUTH | 9 | P0 |
| Media / storage | MED | 8 | P0 |
| SEO | SEO | 9 | P1 |
| Analytics | ANA | 5 | P2 |

### 11.1 Global requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-NAV-01 | Persistent header on all public routes with links to About, Experience, Projects, Skills, Contact and a Resume action. | P0 |
| FR-NAV-02 | Header collapses to a hamburger sheet below 768px, with focus trap, `Esc` close, backdrop close and body scroll lock. | P0 |
| FR-NAV-03 | Footer on all public routes: name, positioning line, quick links, social links (from database), email, copyright year (dynamic), and a "Built with React, TypeScript and Supabase" line. | P0 |
| FR-NAV-04 | Skip-to-content link as the first focusable element on every page. | P0 |
| FR-NAV-05 | Route changes reset scroll to top and move focus to the `<h1>` of the new page. | P0 |
| FR-NAV-06 | All external links open in a new tab with `rel="noopener noreferrer"` and an accessible "(opens in a new tab)" label. | P0 |
| FR-NAV-07 | A global toast system reports success/error for every user-initiated mutation. | P0 |
| FR-NAV-08 | Unknown routes render `/404` with a link home and a link to `/projects`. | P0 |

---

## 12. Homepage Requirements

The homepage is a composite of eleven sections. Each section below specifies purpose, content, components, data source, interactions, responsive behaviour, animation, accessibility, empty state and loading state.

**Global homepage rules**
- Sections render in the documented order and are individually addressable by anchor id (`#about`, `#what-i-build`, `#impact`, `#featured-projects`, `#experience`, `#skills`, `#education`, `#contact`).
- Each section is a `<section aria-labelledby="...">` with a visible `<h2>`; the page has exactly one `<h1>` (hero).
- Every section fetches through its own hook; a failure in one section renders that section's error state and never blanks the page (React error boundary per section).
- Entry animation: opacity 0→1 with a 12px rise, 200 ms, `ease-out`, triggered once by `IntersectionObserver` at 15% visibility. Disabled entirely under `prefers-reduced-motion: reduce`.

### 12.1 Section 1 — Navigation
| Aspect | Specification |
|---|---|
| Purpose | Wayfinding + persistent access to Contact and Resume. |
| Content | Monogram "MP", 5 nav links, Resume button. |
| Components | `<Header>`, `<NavLink>`, `<MobileNavSheet>`, `<Button variant="outline">`. |
| Data | `site_settings.nav_resume_visible`, `resume_versions` (published, to enable/disable the button). |
| Interactions | Sticky from 24px scroll with backdrop blur and hairline bottom border; scroll-spy on Home. |
| Responsive | ≥1024px full nav; 768–1023px condensed nav; <768px hamburger sheet. |
| Animation | Header background/blur transition 180 ms. No hide-on-scroll (it hurts reachability). |
| A11y | `<nav aria-label="Primary">`; hamburger is a `<button aria-expanded aria-controls>`; sheet is `role="dialog" aria-modal="true"`. |
| Empty | If no published resume exists, the Resume button is not rendered (not disabled). |
| Loading | Header renders immediately; the Resume button appears after its query resolves (no layout shift — reserve width). |
| Priority | P0 |

### 12.2 Section 2 — Hero
See Section 12.12 for full hero specification (FR-HOME-02).

### 12.3 Section 3 — About (summary)
| Aspect | Specification |
|---|---|
| Purpose | Establish credibility and the business+technology combination in ~80 words. |
| Content | Short bio (`profiles.short_bio`), location, current role line, "Read more" → `/about`. Optional secondary photo. |
| Components | `<SectionHeading>`, `<Prose>`, `<TextLink>`. |
| Data | `profiles` (singleton). |
| Interactions | "Read more" navigates to `/about`. |
| Responsive | Two-column (text + photo) ≥1024px; stacked below, photo first at ≤767px only if a secondary photo exists. |
| Animation | Standard section entry. |
| A11y | Portrait `alt` from `profiles.avatar_alt`; decorative shapes `aria-hidden`. |
| Empty | If `short_bio` is null, the section is not rendered at all (no placeholder text). |
| Loading | Two skeleton text blocks at the final line-height to prevent CLS. |
| Priority | P0 |

### 12.4 Section 4 — What I Build
| Aspect | Specification |
|---|---|
| Purpose | Translate capability into four concrete build types a business can recognise. |
| Content | Four cards: **AI Automation Systems**, **Internal Web Applications**, **Business Process Automation**, **Operational Reporting & Data Tools**. Each: title, one-sentence description, 3 supporting bullets, and a link to a filtered project view where projects exist in that category. |
| Components | `<BuildTypeCard>` with the process-line motif connecting the four cards on desktop. |
| Data | Static content constants in `src/content/build-types.ts` in V1 (these are positioning statements, not user data). Category values must match the `project_category` enum so the links filter correctly. |
| Interactions | Hover: 1px border brightens, card lifts 2px. Click on the link → `/projects?category=<value>`. |
| Responsive | 4-up ≥1280px, 2-up 768–1279px, 1-up stacked below 768px. |
| Animation | Sequential entry, 60 ms stagger; the connector line draws once (`stroke-dashoffset`) — skipped under reduced motion. |
| A11y | Cards are not links; the link inside each card is the interactive element with a descriptive label. |
| Empty | N/A (static). If a category has no published projects, the card renders without its link. |
| Loading | N/A. |
| Priority | P0 |

### 12.5 Section 5 — Impact / Business Value
| Aspect | Specification |
|---|---|
| Purpose | State the business outcomes his work targets — **without fabricated numbers**. |
| Content | Six qualitative outcome statements drawn from the approved list: reduce manual work; reduce hours spent on repetitive processes; save operational costs; improve accuracy; digitise manual workflows; turn operational data into useful information. Each with one supporting clause. |
| Components | `<OutcomeList>` — icon + statement rows, not "stat counters". |
| Data | Static constants in V1. **P3:** move to `site_settings` if editing becomes frequent. |
| Interactions | None. |
| Responsive | 3×2 grid ≥1024px; 2×3 at 768–1023px; single column below. |
| Animation | Standard entry with 40 ms stagger. |
| A11y | Icons `aria-hidden`; the text carries all meaning. |
| Empty | N/A. |
| Loading | N/A. |
| Priority | P0 |
| **Constraint** | **FR-HOME-05a (P0):** This section must never display a numeric metric (%, ₹, hours saved) unless the value is stored in the database, approved by Moin, and attributable to a measured project outcome. Placeholder or illustrative numbers are prohibited. |

### 12.6 Section 6 — Featured Projects
| Aspect | Specification |
|---|---|
| Purpose | Prove the claims with real systems. |
| Content | Up to 3 featured projects as cards; "View all projects" link. |
| Components | `<ProjectCard>` (see 13.2), `<Button variant="ghost">`. |
| Data | `projects` where `publication_state='published' AND visibility_mode <> 'private' AND is_featured = true`, ordered by `sort_order, published_at desc`, limit 3, with technologies joined. |
| Interactions | Whole card is a link to `/projects/:slug`; GitHub/live-demo icon buttons inside the card stop propagation. |
| Responsive | 3-up ≥1280px; 2-up 768–1279px; 1-up below with full-width cards. |
| Animation | Entry stagger 60 ms; hover lift 2px + cover image scale 1.02 (reduced-motion: none). |
| A11y | Card link label = project title; status badge text is real text, not colour-only. |
| Empty | If zero featured projects exist, fall back to the 3 most recent published projects. If zero published projects exist, hide the section entirely and log a console warning in dev. |
| Loading | 3 `<ProjectCardSkeleton>` matching final card dimensions. |
| Priority | P0 |

### 12.7 Section 7 — Experience (summary)
| Aspect | Specification |
|---|---|
| Purpose | Show current, real employment. |
| Content | The current role rendered in full (company, role titles, location, date range, 3–5 responsibility bullets), plus a compact list of any earlier roles, plus "Full experience" → `/experience`. |
| Components | `<TimelineItem>` using the process-line motif as the timeline rail. |
| Data | `experience` + `experience_items` where published, ordered `sort_order, start_date desc`. |
| Interactions | Earlier roles expand/collapse (`<details>`-backed disclosure). |
| Responsive | Rail on the left at ≥768px; rail removed and items become cards below 768px. |
| Animation | Rail draws on entry; items fade in sequentially. |
| A11y | Dates in `<time datetime>`; "Present" announced as "to present"; disclosure buttons expose `aria-expanded`. |
| Empty | Section hidden if no published experience. |
| Loading | Two timeline skeleton rows. |
| Priority | P0 |

### 12.8 Section 8 — Skills (summary)
| Aspect | Specification |
|---|---|
| Purpose | Keyword surface for recruiters; capability surface for engineers. |
| Content | Categories as column headings with skills as chips. Core skills (`is_core = true`) shown first with a subtly stronger chip style. |
| Components | `<SkillCategoryColumn>`, `<Chip>`. |
| Data | `skill_categories` + `skills` where published, ordered by `sort_order`. |
| Interactions | None in V1 (chips are not links). **P3:** chip → filtered projects. |
| Responsive | 3 columns ≥1024px; 2 at 768–1023px; 1 below, category headings sticky within the section on mobile. |
| Animation | Chips fade in with 20 ms stagger, capped at 300 ms total. |
| A11y | Each category is a labelled list (`<ul>` with `aria-labelledby`), not a div soup. |
| Empty | Section hidden if no published skills. |
| Loading | Chip skeletons (6 per category). |
| Priority | P0 |
| **Constraint** | **FR-HOME-08a (P0):** No percentage bars, star ratings, or numeric proficiency indicators. Ordering and the `is_core` flag are the only emphasis mechanisms. |

### 12.9 Section 9 — Education
| Aspect | Specification |
|---|---|
| Purpose | Complete the recruiter checklist. |
| Content | Qualification, institution, status/date range, and grade label only where `grade_label` is populated and published. |
| Components | `<EducationCard>`. |
| Data | `education` where published, ordered `sort_order, start_date desc`. |
| Interactions | None. |
| Responsive | 2-up ≥1024px, stacked below. |
| Animation | Standard entry. |
| A11y | Dates in `<time>`; "Expected 2027" rendered as text, not implied. |
| Empty | Section hidden if empty. |
| Loading | One card skeleton. |
| Priority | P1 |

### 12.10 Section 10 — Contact CTA
| Aspect | Specification |
|---|---|
| Purpose | Convert the visit. |
| Content | Heading ("Have a manual process worth automating?"), one supporting line, primary CTA **Let's Talk** → `/contact`, secondary email link, response-time expectation `[REQUIRES USER INPUT — stated response time]`. |
| Components | `<CtaBand>` with a subtle accent gradient (single direction, low opacity). |
| Data | `profiles.email_public`, `site_settings.contact_response_note`. |
| Interactions | CTA → `/contact`; email → `mailto:`. |
| Responsive | Centred single column at all breakpoints; full-width buttons below 430px. |
| Animation | None beyond entry. |
| A11y | Contrast ≥ 4.5:1 against the gradient at its lightest point. |
| Empty | If `email_public` is null, render only the primary CTA. |
| Loading | Static text renders immediately. |
| Priority | P0 |

### 12.11 Section 11 — Footer
| Aspect | Specification |
|---|---|
| Purpose | Persistent identity, links, and legal line. |
| Content | Name + positioning line, quick links, social links (database-driven), email, `© <current year> Moin Patel`, build credit line. |
| Components | `<Footer>`, `<SocialLinkList>`. |
| Data | `social_links` where published and `show_in_footer`, `profiles`. |
| Interactions | External links per FR-NAV-06. |
| Responsive | 3 columns ≥1024px; 2 at 768–1023px; stacked below. |
| Animation | None. |
| A11y | `<footer role="contentinfo">`; icon-only links carry `aria-label` (e.g. "GitHub profile"). |
| Empty | Social column hidden if no published links. |
| Loading | Social icons appear after query resolves; reserve height. |
| Priority | P0 |

### 12.12 FR-HOME-02 — Hero (full specification, P0)

**Purpose.** In under five seconds: who he is, what he does, why it matters commercially, and where to go next.

**Content and order (mobile order shown; desktop places media right):**
1. Availability pill — only if `profiles.available_for_work = true`; text from `site_settings.availability_label`.
2. `<h1>` — **Moin Patel**
3. Role line — **AI Developer / AI Automation Executive**
4. Positioning line (display type, largest visual weight): *"Building AI-powered systems that automate work, save time, and reduce business costs."*
5. Short introduction — 2 sentences max, from `profiles.tagline` + `profiles.short_bio` first sentence.
6. Location line — Surat, Gujarat, India.
7. CTA row — **View My Work** (primary, filled) · **Let's Talk** (secondary, outline) · **Download Resume** (tertiary, text button with a download icon).
8. Social links — icon row (LinkedIn, GitHub, Email) from `social_links` where `show_in_hero`.
9. Profile photo — circular or squircle frame, `object-fit: cover`, subtle accent ring, explicit `width`/`height`.

**Data:** `profiles` (singleton), `social_links`, `resume_versions` (published exists?), `site_settings`.

**Interactions:** primary CTA scrolls to `#featured-projects` on Home (smooth, or instant under reduced motion) — a second click of the same intent in the nav goes to `/projects`. Resume opens the signed URL in a new tab.

**Responsive:**
| Breakpoint | Layout |
|---|---|
| ≥1280px | 60/40 split, text left, photo right, min-height 88vh, photo max 420px |
| 1024–1279px | 60/40, min-height 80vh, photo max 360px |
| 768–1023px | Stacked, photo above text, photo 280px, centred text |
| 430–767px | Stacked, photo 200px, left-aligned text, buttons full-width stacked |
| 375–429px | Photo 160px, `h1` scales down one step, positioning line clamps to 4 lines |

**Animation:** one orchestrated load sequence, total ≤700 ms — photo fades/scales from 0.98, then h1, role, positioning line, intro, CTAs, socials at 70 ms intervals. No looping animation. No typewriter effect. Fully disabled under reduced motion (all elements render at final state).

**Accessibility:** single `<h1>`; positioning line is a `<p>`, not a heading; CTA row is reachable in DOM order; photo `alt` = `profiles.avatar_alt` (e.g. "Moin Patel"); availability pill text is real text; contrast ≥ 7:1 for the h1 on the dark background.

**Empty states:** no avatar → render a monogram tile with the accent ring (never a broken image icon). No published resume → hide the Resume CTA. No social links → hide the icon row and increase the CTA row's bottom margin.

**Loading:** hero copy is server-independent for the static parts (name, role, positioning line may be hard-coded fallbacks in `src/content/hero.ts` used only until the query resolves); the avatar area reserves its final dimensions; no spinner in the hero.

---

## 13. Project Requirements

### 13.1 Project index — `/projects`

| ID | Requirement | Priority |
|---|---|---|
| FR-PROJ-01 | Display all projects where `publication_state = 'published'` and `visibility_mode <> 'private'`, ordered by `is_featured desc, sort_order asc, published_at desc`. | P0 |
| FR-PROJ-02 | Each project renders as a `<ProjectCard>` (spec 13.2). | P0 |
| FR-PROJ-03 | Draft, archived and private projects must never appear in any public query result — enforced by RLS, not by client filtering. | P0 |
| FR-PROJ-04 | Filter by category (chip row, multi-select, reflected in the URL as `?category=`). | P1 |
| FR-PROJ-05 | Filter by technology (`?tech=`), sourced from technologies actually attached to published projects. | P2 |
| FR-PROJ-06 | Filter by status (Completed / In Progress). | P2 |
| FR-PROJ-07 | Filters are combinable, shareable via URL, and clearable with a single "Clear filters" action. | P1 |
| FR-PROJ-08 | Each card shows an unambiguous status badge; "In Progress" must be visually and textually distinct from "Completed". | P0 |
| FR-PROJ-09 | Pagination or "Load more" once published projects exceed 12; V1 ships without it and adds it when the count crosses 9. | P2 |
| FR-PROJ-10 | Empty state when filters match nothing: "No projects match these filters" + Clear filters. Empty state when no projects exist at all: a neutral "Case studies are being added" message — never a broken grid. | P0 |
| FR-PROJ-11 | Loading state: 6 card skeletons with identical dimensions to real cards. | P0 |

### 13.2 Project card

**Contents:** cover image (16:9, lazy, `aspect-ratio` reserved), status badge (top-left over the image), category label, title (`h3`), short description (clamped to 2 lines), up to 4 technology chips + "+N" overflow, and — where the visibility mode permits — small GitHub / Live icon links.

**Rules:**
- The whole card is a single link to `/projects/:slug`; icon links inside use `stopPropagation` and their own accessible labels.
- `visibility_mode` controls what the card exposes:

| `visibility_mode` | Card links to case study | GitHub icon | Live icon |
|---|---|---|---|
| `full` | Yes | If URL present | If URL present |
| `case_study_only` | Yes | No | No |
| `github_only` | No — card links directly to GitHub | Yes | No |
| `live_demo_only` | No — card links directly to the live URL | No | Yes |
| `private` | Not rendered publicly at all | — | — |

- Hover: border brightens, 2px lift, image scale 1.02. Focus-visible: 2px accent outline with 2px offset on the card itself.
- Mobile: full-width card, image 16:9, description clamped to 3 lines, tech chips scroll horizontally without a visible scrollbar.

### 13.3 Project data model requirements

Every project supports the fields listed in the brief. Their storage is defined in Section 23; their meaning is defined here.

| Field | Type | Required | Notes |
|---|---|---|---|
| Title | text | Yes | Max 120 chars |
| Slug | text | Yes | Unique, lowercase, hyphenated, auto-generated from title, editable, immutable after first publish (P1 warning on change) |
| Short description | text | Yes | Max 200 chars — used on cards, meta descriptions and OG |
| Full description | markdown | Yes | Overview section of the case study |
| Problem | markdown | Yes for case studies | Business language |
| Solution | markdown | Yes for case studies | |
| How it works | markdown | Yes for case studies | Mechanism, step by step |
| Architecture / workflow | markdown + optional diagram image | P1 | Ordered pipeline steps stored as structured rows (see 14.4) |
| Business impact | markdown | Yes for case studies | Qualitative unless measured |
| Technologies | relation | Yes | Many-to-many with `technologies` |
| Challenges | markdown | P1 | |
| Lessons learned | markdown | P1 | |
| Images | relation | P1 | With required alt text |
| Video | url | P2 | External embed (YouTube/Vimeo) preferred over stored video — see TD-07 |
| GitHub URL | url | Optional | |
| Live demo URL | url | Optional | |
| Status | enum | Yes | `completed` \| `in_progress` \| `planned` \| `maintained` \| `archived` |
| Category | enum | Yes | `ai_automation` \| `web_application` \| `business_process_automation` \| `data_reporting` \| `other` |
| Featured | boolean | Yes | Max 3 featured enforced in the admin UI (soft), not in the database |
| Publication state | enum | Yes | `draft` \| `published` \| `archived` |
| Visibility mode | enum | Yes | See 13.2 |
| Sort order | integer | Yes | Default 0; lower sorts first |
| Client / employer | text + flag | Optional | `client_name` plus `client_disclosed` boolean; name is only rendered when `client_disclosed = true` |

### 13.4 Confidentiality control (P0)

**FR-PROJ-16.** Because several candidate projects were built for an employer, every project record carries `client_disclosed` (boolean, default `false`) and `confidentiality_note` (internal, admin-only). When `client_disclosed = false`, the public site must not render the client or employer name anywhere in that project's content, including in images. Screenshots containing employer branding, customer data, or internal pricing must not be uploaded. The admin project form displays this rule above the image uploader.

---

## 14. Case Study Requirements

### 14.1 Canonical structure

Every `/projects/:slug` page renders the following blocks in this fixed order. A block is omitted entirely (heading included) when its source field is empty — never rendered as an empty heading.

```
1  Project Hero        title, status badge, category, short description, date range, cover image, links
2  Overview            full description
3  The Problem         problem
4  The Solution        solution
5  How It Works        how_it_works
6  Architecture/Flow   pipeline steps (structured) + optional architecture diagram image
7  Technology          technologies grouped by category, with role (primary/supporting)
8  Business Impact     business_impact  (qualitative statements)
9  Screenshots         project_images where role = 'screenshot' | 'gallery'
10 Challenges          challenges
11 What I Learned      lessons_learned
12 Links               GitHub, live demo, video (subject to visibility_mode)
13 Next Project        next published project by sort order, wrapping to the first
```

### 14.2 Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-CASE-01 | Case study is fetched by `slug`; an unknown or unpublished slug renders the 404 view with a link to `/projects` (it must not reveal that a draft with that slug exists). | P0 |
| FR-CASE-02 | Markdown fields render through a sanitising renderer with a restricted node allow-list (headings h3–h4, paragraphs, lists, bold, italic, inline code, code blocks, links, blockquote). Raw HTML is disabled. | P0 |
| FR-CASE-03 | The Business Impact block appears above the fold of the scroll on desktop when the case study is short, and is always reachable from the sticky in-page nav. | P1 |
| FR-CASE-04 | Architecture/workflow pipelines render as an ordered, numbered visual sequence using the process-line motif — not as a prose paragraph. | P0 |
| FR-CASE-05 | Technology block groups by technology category and marks primary vs supporting technologies. | P1 |
| FR-CASE-06 | Sticky in-page section navigation on ≥1024px, showing only the blocks that exist, with scroll-spy highlighting. Hidden below 1024px. | P1 |
| FR-CASE-07 | Screenshots open in an accessible lightbox (focus trapped, `Esc` closes, arrow keys navigate, caption and alt text preserved). | P1 |
| FR-CASE-08 | "Next project" never links to the current project and never links to a non-published project. | P0 |
| FR-CASE-09 | A "Discuss a similar system" CTA appears after the Links block, deep-linking to `/contact` with the service type mapped from the project category. | P1 |
| FR-CASE-10 | Reading experience: max content width 72ch for prose, 1200px for media; images have captions where provided. | P1 |

### 14.3 Storage-to-render mapping

| Case study block | Storage | Render |
|---|---|---|
| Project Hero | `projects.title/status/category/summary/started_on/completed_on/cover_image_path` | `<CaseStudyHero>` |
| Overview | `projects.description_md` | `<Prose>` (markdown) |
| The Problem | `projects.problem_md` | `<Prose>` |
| The Solution | `projects.solution_md` | `<Prose>` |
| How It Works | `projects.how_it_works_md` | `<Prose>` |
| Architecture / Workflow | `project_pipeline_steps` rows + `project_images` where `role='architecture'` | `<PipelineDiagram>` + `<Figure>` |
| Technology | `project_technologies` → `technologies` | `<TechGroupList>` |
| Business Impact | `projects.business_impact_md` | `<ImpactList>` |
| Screenshots | `project_images` where `role IN ('screenshot','gallery')` ordered by `sort_order` | `<Gallery>` + `<Lightbox>` |
| Challenges | `projects.challenges_md` | `<Prose>` |
| What I Learned | `projects.lessons_md` | `<Prose>` |
| Links | `projects.github_url/live_url/video_url` + `visibility_mode` | `<LinkRow>` |
| Next Project | query: next by `(sort_order, published_at)` among published | `<NextProjectCard>` |

### 14.4 Pipeline steps (structured, P0)

Workflows such as the Capiche feedback pipeline are data, not prose. `project_pipeline_steps` stores: `step_number`, `label`, `description`, `tech_note`, `icon_key`. This makes the pipeline renderable as a diagram, reorderable in admin, and reusable in the architecture image's caption. This table is an addition to the tables listed in the brief and is justified by FR-CASE-04.

---

## 15. Experience Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-EXP-01 | `/experience` renders all published experience as a vertical timeline, newest first. | P0 |
| FR-EXP-02 | Each record shows company (linked if `company_url` present), role title(s), employment type, location, date range and current status. | P0 |
| FR-EXP-03 | Responsibilities and achievements render as two separately labelled lists sourced from `experience_items`, ordered by `sort_order`. | P0 |
| FR-EXP-04 | Technologies/tools used in a role render as chips from `experience_technologies`. | P1 |
| FR-EXP-05 | Current roles show "Present" and are visually marked as current. | P0 |
| FR-EXP-06 | Multiple concurrent role titles within one company render as a single record with the titles separated by `·`, not as duplicate companies. | P1 |
| FR-EXP-07 | Empty state: section hidden on Home; `/experience` shows a neutral message. | P1 |

**Initial record (UNVERIFIED — confirm against the resume):**
- **Company:** Bookends Private Limited `[REQUIRES USER INPUT — confirm legal entity name; other Bookends material uses "Bookends Hospitality Pvt. Ltd."]`
- **Role title:** Automation Executive · Head of Reservations · External Platform Coordinator
- **Location:** Surat, Gujarat
- **Dates:** April 2026 – Present (`is_current = true`)
- **Responsibilities (from the brief):** centralised reservation operations; external platform management (Petpooja, Zomato, Swiggy, Google Business Profile); AI-powered automation; internal web applications; reservation, feedback and reporting workflows; process optimisation; cross-functional coordination; operational efficiency.
- **Achievements:** `[REQUIRES USER INPUT — only if the resume states specific, verifiable achievements]`

---

## 16. Skills Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-SKILL-01 | Skills belong to a category; categories are managed in the database, not hard-coded. | P0 |
| FR-SKILL-02 | `/skills` groups skills by category, ordered by category `sort_order` then skill `sort_order`. | P1 |
| FR-SKILL-03 | No proficiency percentages, bars, or star ratings. `is_core` and ordering are the only emphasis mechanisms. | P0 |
| FR-SKILL-04 | An optional one-line description per skill renders as a tooltip on desktop and as visible caption text on mobile (tooltips are unreliable on touch). | P2 |
| FR-SKILL-05 | Unpublished skills and unpublished categories never appear publicly. | P0 |
| FR-SKILL-06 | A category with zero published skills is not rendered. | P1 |

**Initial categories and skills (UNVERIFIED — from the brief):**

| Category | Skills |
|---|---|
| Programming & Development | Node.js, SQL, Git, Web Application Development |
| AI & Automation | AI Automation, Workflow Automation, Business Process Automation, Operational Digitisation |
| Business Tools | Petpooja POS, Google Workspace, Microsoft Excel, Google Business Profile, Zomato Merchant, Swiggy Merchant |

`[REQUIRES USER INPUT — whether React, TypeScript, Supabase/PostgreSQL, Google Apps Script and Gemini API should appear as skills. They are implied by the projects described but are not in the supplied skills list, and this PRD does not add them without approval.]`

---

## 17. Education Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-EDU-01 | Education records render on `/about` and in the Home education section, ordered by `sort_order` then `start_date desc`. | P1 |
| FR-EDU-02 | Each record supports institution, qualification, field, location, start/end date, status, grade label, description. | P1 |
| FR-EDU-03 | Status values: `in_progress`, `expected`, `completed`. "Expected 2027" renders explicitly. | P1 |
| FR-EDU-04 | `grade_label` is free text (e.g. "70%") and is rendered only when populated **and** `show_grade = true`. | P1 |
| FR-EDU-05 | Unpublished records never render publicly. | P0 |

**Initial records (UNVERIFIED — from the brief):**
1. Bachelor of Commerce (B.Com.) — C.K. Pithawala College — Expected 2027 — status `expected`.
2. Class XII — 70% — `[REQUIRES USER INPUT — board and institution name, year]`
3. Class X — 63% — `[REQUIRES USER INPUT — board and institution name, year]`

`[REQUIRES USER INPUT — confirm whether Class X and XII percentages should be shown publicly. For a portfolio aimed at business clients, school percentages usually add nothing; the records can exist unpublished.]`

---

## 18. Contact Requirements

### 18.1 Form

| Field | Type | Required | Validation |
|---|---|---|---|
| Name | text | Yes | 2–80 chars, trimmed |
| Email | email | Yes | RFC-compatible pattern, ≤160 chars, lowercased on store |
| Company | text | No | ≤120 chars |
| Subject | text | Yes | 3–150 chars |
| Message | textarea | Yes | 20–4000 chars, live character counter from 3500 |
| Service type | select | Yes | `ai_automation` \| `web_application` \| `business_process_automation` \| `other` |
| Consent line | static text | — | "Your message is stored so Moin can reply. It is not shared or used for marketing." |
| Honeypot | hidden text | — | Must remain empty; `aria-hidden`, `tabindex="-1"`, off-screen (not `display:none`) |

### 18.2 Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-CONT-01 | Submissions are written to `contact_messages` via the anon Supabase client under an INSERT-only RLS policy. | P0 |
| FR-CONT-02 | Service type may be prefilled from `?service=` and must validate against the enum; an invalid value falls back to `other`. | P1 |
| FR-CONT-03 | Client-side validation with Zod, mirrored by database CHECK constraints; server rules are authoritative. | P0 |
| FR-CONT-04 | Errors render inline, are associated to inputs via `aria-describedby`, and focus moves to the first invalid field on submit. | P0 |
| FR-CONT-05 | The submit button shows a loading state and is disabled during submission; double submission is prevented. | P0 |
| FR-CONT-06 | Success replaces the form with a confirmation containing the expected response time and a "Send another message" action. Form values are cleared only on success. | P0 |
| FR-CONT-07 | Failure keeps all entered values, shows a non-destructive error, and offers a `mailto:` fallback with the subject and message pre-filled. | P0 |
| FR-CONT-08 | Spam protection: honeypot field + minimum time-to-submit (3s, measured client-side and re-checked by a database trigger against `created_at`) + per-IP-hash rate limit of 5 submissions/hour + 20/day enforced by a `BEFORE INSERT` trigger. | P0 |
| FR-CONT-09 | Optional Cloudflare Turnstile verification via a Supabase Edge Function, enabled by `site_settings.contact_captcha_enabled`. | P2 |
| FR-CONT-10 | The anon role must not be able to `SELECT`, `UPDATE` or `DELETE` any row in `contact_messages`. | P0 |
| FR-CONT-11 | Email notification to Moin on new message via a database webhook → Edge Function → email provider. | P2 |

### 18.3 Direct channels
`/contact` also lists email (from `profiles.email_public`), phone (only if `profiles.phone_visible = true`), location, and social links. `[REQUIRES USER INPUT — whether the phone number +91 8530537786 should be publicly displayed; publishing a personal number invites spam calls.]`

---

## 19. Resume Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-RES-01 | The resume PDF is stored in a **private** Supabase Storage bucket; the file path is recorded in `resume_versions`. | P0 |
| FR-RES-02 | Exactly one version may be `is_published = true`, enforced by a unique partial index. | P0 |
| FR-RES-03 | Public users receive a short-lived signed URL (60 s) for the published version only. Unpublished versions are unreachable by anonymous users. | P0 |
| FR-RES-04 | `/resume` embeds the PDF in a viewer with a Download button and a graceful fallback link if the browser cannot embed PDFs (common on mobile). | P1 |
| FR-RES-05 | Admin can upload a new version, publish it (automatically unpublishing the previous one) and retain history. | P0 |
| FR-RES-06 | If no published resume exists, all resume CTAs are hidden site-wide and `/resume` shows a neutral message. | P0 |

**Storage access decision.** The private-bucket + signed-URL model is chosen over a public bucket because the resume contains personal contact details that should not be permanently and anonymously crawlable at a stable URL. The anon role is granted `SELECT` on `storage.objects` **only** for the object whose path equals the currently published `resume_versions.storage_path` — see Section 26.

---

## 20. Admin Dashboard Requirements

### 20.1 Global admin requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-ADM-01 | All `/admin/*` routes require an authenticated session with a matching row in `admin_users`. | P0 |
| FR-ADM-02 | Admin layout: sidebar navigation (desktop), bottom tabs (mobile), user menu with email and Sign out. | P0 |
| FR-ADM-03 | Every list view supports: search, state filter, sort-order editing, row actions (Edit, Duplicate, Delete), and a visible state badge. | P0 |
| FR-ADM-04 | Every destructive action requires a confirmation dialog naming the record; deletes of records with children explain the cascade. | P0 |
| FR-ADM-05 | Every form: unsaved-changes guard on navigation, inline validation, disabled submit while pending, success/error toast. | P0 |
| FR-ADM-06 | Draft/Publish is a single explicit control (segmented: Draft · Published · Archived), never an ambiguous toggle. | P0 |
| FR-ADM-07 | Sort order editable numerically in V1; drag-and-drop reordering is P2. | P0 / P2 |
| FR-ADM-08 | Preview: admin can view an unpublished project at `/projects/:slug?preview=1`, which fetches with the authenticated client. Anonymous users with the same URL get 404. | P1 |
| FR-ADM-09 | Optimistic UI is not used for destructive actions; lists refetch after mutation via query invalidation. | P1 |
| FR-ADM-10 | The dashboard shows counts: published projects, drafts, unread messages, published skills/experience/education, and the current resume version. | P1 |

### 20.2 Per-resource requirements

| Resource | Route | Create | Update | Delete | Draft/Publish | Sort | Extra | Priority |
|---|---|---|---|---|---|---|---|---|
| Projects | `/admin/projects` | ✓ | ✓ | ✓ | ✓ | ✓ | slug generator, technology picker, pipeline step editor, image manager, featured toggle, visibility mode, confidentiality flags | P0 |
| Experience | `/admin/experience` | ✓ | ✓ | ✓ | ✓ | ✓ | nested responsibilities/achievements editor, technology picker | P0 |
| Skills | `/admin/skills` | ✓ | ✓ | ✓ | ✓ | ✓ | category management in the same screen | P0 |
| Education | `/admin/education` | ✓ | ✓ | ✓ | ✓ | ✓ | grade visibility toggle | P1 |
| Social links | `/admin/social-links` | ✓ | ✓ | ✓ | ✓ | ✓ | hero/footer placement toggles, URL validation | P1 |
| Messages | `/admin/messages` | — | status only | ✓ | — | — | New/Read/Replied/Archived/Spam, `mailto:` reply, admin notes | P0 |
| Media | `/admin/media` | upload | alt text | ✓ | — | — | bucket browser, orphan detection, file size display | P1 |
| Resume | `/admin/resume` | upload | publish | ✓ | ✓ | — | version history | P0 |
| Settings | `/admin/settings` | — | ✓ | — | — | — | profile singleton, SEO defaults, availability, feature flags | P0 |

### 20.3 Project editor detail (P0)
Tabbed or sectioned single form: **Basics** (title, slug, summary, category, status, dates, featured, publication state, visibility mode, sort order) · **Case Study** (all markdown fields with a live preview toggle) · **Pipeline** (ordered steps) · **Technology** (multi-select with inline "create technology") · **Media** (cover image, gallery, architecture diagram, alt text required per image) · **Links & SEO** (GitHub, live, video, SEO title/description, OG image) · **Confidentiality** (client name, disclosed flag, internal note).

Publish gate (**FR-ADM-11, P0**): a project cannot be set to `published` unless title, slug, summary, category, status and at least one of the case-study fields are populated, every attached image has alt text, and the visibility mode's required URL is present. The gate is enforced in the form and re-validated by database CHECK constraints where expressible.

---

## 21. Authentication Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | Supabase Auth email + password for a single owner account. No public sign-up UI; sign-up is disabled in the Supabase project settings. | P0 |
| FR-AUTH-02 | `/admin/login` posts credentials via `supabase.auth.signInWithPassword`. Errors are generic ("Invalid email or password") and never disclose which field was wrong. | P0 |
| FR-AUTH-03 | Sessions persist across reloads and refresh automatically (`persistSession: true`, `autoRefreshToken: true`). | P0 |
| FR-AUTH-04 | `<ProtectedRoute>` checks the session **and** admin membership before rendering; while resolving it renders a spinner, never a flash of the admin UI. | P0 |
| FR-AUTH-05 | Unauthenticated access to `/admin/*` redirects to `/admin/login?returnTo=<path>`; after login the user lands on `returnTo` if it is an internal admin path. | P0 |
| FR-AUTH-06 | Sign out clears the session, invalidates the query cache, and redirects to `/`. | P0 |
| FR-AUTH-07 | Client-side route protection is UX only. Every table's RLS must independently reject non-admin writes; this is verified by the security test suite. | P0 |
| FR-AUTH-08 | Password reset via Supabase's email flow, with the redirect URL restricted to the production and localhost origins in the Supabase auth settings. | P1 |
| FR-AUTH-09 | Admin identity is determined by membership in `admin_users`, not by an email string in frontend code and not by a user-editable JWT claim. | P0 |

**Rejected alternative.** Storing `role: 'admin'` in `user_metadata` was rejected: `user_metadata` is user-writable through the auth API and must never be used for authorisation. `app_metadata` would be acceptable but requires service-role calls to change; the `admin_users` table is simpler to reason about, inspectable in SQL, and testable with pgTAP.

---

## 22. Database Architecture

### 22.1 Architectural stance

The database is the product's backbone, not a persistence detail. The same philosophy proven on CostCraft/FoodMetrics applies here without modification:

| Principle | Application here |
|---|---|
| **Database-first** | Schema is designed before components. The frontend consumes generated types; it does not define the shape. |
| **Migration-driven** | Every schema object exists because a versioned SQL migration created it. Nothing important is created by hand in the Supabase dashboard. |
| **Reproducible** | `supabase db reset` on a clean checkout produces an identical, seeded local database. |
| **RLS as the boundary** | The frontend uses the publishable (anon) key. Authorisation lives in policies, not in components. |
| **Seeded, not fabricated** | Seed data contains real, approved portfolio content — never fake metrics, never private company data, never credentials. |
| **Clear separation** | React renders; PostgreSQL owns integrity and access; Supabase Auth owns identity; Storage owns binaries. |

**Deliberate difference from CostCraft/FoodMetrics.** CostCraft has multiple roles (R&D, Kitchen, Finance, Admin) and an approval workflow, so it needs a role table and status-transition rules. This product has exactly **one** privileged user and no workflow states beyond draft/published/archived. Therefore: no role hierarchy, no approval chain, no `tenant_id`, and no per-row ownership columns. Adding them would be unjustified complexity for a single-owner site. Everything else — migrations layout, RLS helper function pattern, seed structure, storage bucket conventions, env var handling — is kept identical so the two codebases stay mentally interchangeable.

### 22.2 Extensions and conventions

- Extensions: `pgcrypto` (UUID generation), `citext` (case-insensitive slugs/emails). No extension is enabled that is not used.
- Primary keys: `uuid` with `gen_random_uuid()` default, except `site_settings` (natural text key) and `admin_users` (`auth.users.id`).
- Timestamps: `timestamptz`, `created_at` default `now()`, `updated_at` maintained by a shared trigger function.
- Naming: snake_case, plural table names, `_id` foreign keys, `idx_<table>_<cols>` indexes, `<table>_<purpose>_check` constraints.
- Markdown columns carry the `_md` suffix so their rendering requirement is obvious at a glance.
- Soft delete is **not** used. Archive states cover the need; deletes are real deletes with confirmation.
- Enums are PostgreSQL `ENUM` types (stable, small, rarely changed). Adding a value requires a migration — which is the desired friction.

### 22.3 Enum types

| Enum | Values |
|---|---|
| `publication_state` | `draft`, `published`, `archived` |
| `project_status` | `completed`, `in_progress`, `planned`, `maintained`, `archived` |
| `project_category` | `ai_automation`, `web_application`, `business_process_automation`, `data_reporting`, `other` |
| `visibility_mode` | `full`, `case_study_only`, `github_only`, `live_demo_only`, `private` |
| `image_role` | `cover`, `gallery`, `screenshot`, `architecture`, `og` |
| `tech_category` | `language`, `framework`, `database`, `platform`, `ai_service`, `automation_tool`, `business_tool`, `devops`, `other` |
| `tech_role` | `primary`, `supporting` |
| `experience_item_type` | `responsibility`, `achievement` |
| `education_status` | `completed`, `in_progress`, `expected` |
| `message_status` | `new`, `read`, `replied`, `archived`, `spam` |
| `service_type` | `ai_automation`, `web_application`, `business_process_automation`, `other` |
| `admin_role` | `owner`, `editor` |

**Design note on separating status from publication from visibility.** The brief listed Public, Private, Case Study Only, GitHub Only, Live Demo, Draft and Archived as one set. Those are three orthogonal ideas: *how finished the work is* (`project_status`), *whether the record is live on the site* (`publication_state`), and *how much of it is exposed* (`visibility_mode`). Collapsing them into a single column would make "a completed project, published, but linking only to GitHub" unrepresentable and would force enum explosion. Three columns cover all seven requested behaviours and remain queryable.

---

## 23. Complete Database Schema

Notation: **PK** primary key · **FK** foreign key · **U** unique · **NN** not null · **D** default.

### 23.1 `profiles` — site owner identity (singleton)
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, D `gen_random_uuid()` | |
| `full_name` | text | NN | "Moin Patel" |
| `role_title` | text | NN | "AI Developer / AI Automation Executive" |
| `positioning_line` | text | NN | Hero line |
| `tagline` | text | | Sub-hero sentence |
| `short_bio` | text | | Home About section |
| `long_bio_md` | text | | `/about` |
| `location` | text | | "Surat, Gujarat, India" |
| `email_public` | citext | | |
| `phone_public` | text | | |
| `phone_visible` | boolean | NN, D `false` | Gate for FR-CONT-18.3 |
| `avatar_path` | text | | Storage path in `profile` bucket |
| `avatar_alt` | text | | Required when `avatar_path` is set (CHECK) |
| `og_image_path` | text | | Default social preview |
| `available_for_work` | boolean | NN, D `true` | |
| `published` | boolean | NN, D `true` | |
| `created_at` / `updated_at` | timestamptz | NN, D `now()` | |

Constraints: unique index enforcing a single row; `avatar_alt` NN when `avatar_path` is not null.
Indexes: none beyond the PK (single row).

### 23.2 `projects`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `slug` | citext | NN, U | CHECK lowercase-hyphen pattern, 3–80 chars |
| `title` | text | NN | ≤120 chars |
| `subtitle` | text | | |
| `summary` | text | NN | ≤200 chars — cards, meta description |
| `description_md` | text | | Overview |
| `problem_md` | text | | |
| `solution_md` | text | | |
| `how_it_works_md` | text | | |
| `architecture_md` | text | | |
| `business_impact_md` | text | | |
| `challenges_md` | text | | |
| `lessons_md` | text | | |
| `role_description` | text | | Moin's role on the project |
| `status` | project_status | NN, D `in_progress` | |
| `category` | project_category | NN | |
| `publication_state` | publication_state | NN, D `draft` | |
| `visibility_mode` | visibility_mode | NN, D `case_study_only` | |
| `is_featured` | boolean | NN, D `false` | |
| `sort_order` | integer | NN, D 0 | |
| `started_on` | date | | |
| `completed_on` | date | | CHECK ≥ `started_on` |
| `cover_image_path` | text | | |
| `cover_image_alt` | text | | NN when cover set (CHECK) |
| `github_url` | text | | CHECK `https://` prefix |
| `live_url` | text | | CHECK `https://` prefix |
| `video_url` | text | | CHECK `https://` prefix |
| `client_name` | text | | |
| `client_disclosed` | boolean | NN, D `false` | |
| `confidentiality_note` | text | | Admin-only field |
| `seo_title` | text | | ≤60 chars |
| `seo_description` | text | | ≤160 chars |
| `og_image_path` | text | | |
| `view_count` | integer | NN, D 0 | Incremented by RPC only (P2) |
| `published_at` | timestamptz | | Set by trigger on first publish |
| `created_at` / `updated_at` | timestamptz | NN, D `now()` | |

Constraints: `github_only` requires `github_url`; `live_demo_only` requires `live_url`; `completed` status requires `completed_on` (warn-level in admin, CHECK optional — see Q-14).
Indexes: `U(slug)`; `idx_projects_public (publication_state, visibility_mode, is_featured, sort_order)`; `idx_projects_category (category)`; `idx_projects_published_at (published_at DESC)`.

### 23.3 `project_images`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `project_id` | uuid | FK → `projects.id` ON DELETE CASCADE, NN |
| `storage_path` | text | NN |
| `alt_text` | text | NN (accessibility is not optional) |
| `caption` | text | |
| `role` | image_role | NN, D `gallery` |
| `width` / `height` | integer | For aspect-ratio reservation |
| `file_size_bytes` | integer | |
| `sort_order` | integer | NN, D 0 |
| `created_at` | timestamptz | NN, D `now()` |

Indexes: `idx_project_images_project (project_id, sort_order)`.

### 23.4 `project_pipeline_steps`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `project_id` | uuid | FK → `projects.id` CASCADE, NN |
| `step_number` | integer | NN |
| `label` | text | NN (e.g. "OCR extraction") |
| `description` | text | |
| `tech_note` | text | (e.g. "Gemini 2.5 Flash") |
| `icon_key` | text | |

Constraints: `U(project_id, step_number)`.

### 23.5 `technologies`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `name` | citext | NN, U |
| `slug` | citext | NN, U |
| `category` | tech_category | NN |
| `icon_key` | text | Maps to a local icon registry; no remote icon fetching |
| `color_hex` | text | CHECK `#RRGGBB` |
| `website_url` | text | |
| `sort_order` | integer | NN, D 0 |
| `published` | boolean | NN, D `true` |

### 23.6 `project_technologies`
| Column | Type | Constraints |
|---|---|---|
| `project_id` | uuid | FK → `projects.id` CASCADE, NN |
| `technology_id` | uuid | FK → `technologies.id` RESTRICT, NN |
| `tech_role` | tech_role | NN, D `primary` |
| `sort_order` | integer | NN, D 0 |

PK: composite `(project_id, technology_id)`. Index: `idx_project_tech_tech (technology_id)`.
`ON DELETE RESTRICT` on the technology side prevents silently orphaning a technology that is in use; the admin UI explains the block.

### 23.7 `experience`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `company` | text | NN |
| `company_url` | text | |
| `role_title` | text | NN |
| `employment_type` | text | e.g. "Full-time" |
| `location` | text | |
| `start_date` | date | NN |
| `end_date` | date | CHECK ≥ `start_date` |
| `is_current` | boolean | NN, D `false`; CHECK `is_current = false OR end_date IS NULL` |
| `summary_md` | text | |
| `publication_state` | publication_state | NN, D `draft` |
| `sort_order` | integer | NN, D 0 |
| `created_at` / `updated_at` | timestamptz | NN, D `now()` |

Index: `idx_experience_public (publication_state, sort_order, start_date DESC)`.

### 23.8 `experience_items`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `experience_id` | uuid | FK → `experience.id` CASCADE, NN |
| `item_type` | experience_item_type | NN |
| `content` | text | NN |
| `sort_order` | integer | NN, D 0 |

Index: `idx_experience_items (experience_id, item_type, sort_order)`.

### 23.9 `experience_technologies`
Composite PK `(experience_id, technology_id)`; FKs cascade/restrict as in 23.6; `sort_order` integer.

### 23.10 `skill_categories`
`id` uuid PK · `name` text NN U · `slug` citext NN U · `description` text · `icon_key` text · `sort_order` integer NN D 0 · `published` boolean NN D `true`.

### 23.11 `skills`
`id` uuid PK · `category_id` uuid FK → `skill_categories.id` RESTRICT NN · `name` text NN · `slug` citext NN · `description` text · `is_core` boolean NN D `false` · `sort_order` integer NN D 0 · `published` boolean NN D `true` · `created_at` timestamptz.
Constraint: `U(category_id, name)`. Index: `idx_skills_public (published, category_id, sort_order)`.
**No proficiency column exists.** This is deliberate and must not be added without an explicit product decision.

### 23.12 `education`
`id` uuid PK · `institution` text NN · `qualification` text NN · `field_of_study` text · `location` text · `start_date` date · `end_date` date · `status` education_status NN · `grade_label` text · `show_grade` boolean NN D `false` · `description` text · `publication_state` publication_state NN D `draft` · `sort_order` integer NN D 0 · timestamps.

### 23.13 `social_links`
`id` uuid PK · `platform` text NN · `label` text NN · `url` text NN (CHECK `https://` or `mailto:`) · `icon_key` text NN · `show_in_hero` boolean NN D `true` · `show_in_footer` boolean NN D `true` · `sort_order` integer NN D 0 · `published` boolean NN D `true`.

### 23.14 `contact_messages`
| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | NN, CHECK length 2–80 |
| `email` | citext | NN, CHECK email pattern, ≤160 |
| `company` | text | ≤120 |
| `subject` | text | NN, CHECK length 3–150 |
| `message` | text | NN, CHECK length 20–4000 |
| `service_type` | service_type | NN, D `other` |
| `status` | message_status | NN, D `new` |
| `source_page` | text | Path the form was submitted from |
| `ip_hash` | text | SHA-256 of client IP + server-side salt, set by trigger; the raw IP is never stored |
| `user_agent_family` | text | Coarse family only (e.g. "Chrome"), not the full UA string |
| `admin_notes` | text | |
| `created_at` | timestamptz | NN, D `now()` |
| `read_at` / `replied_at` | timestamptz | |

Indexes: `idx_messages_status (status, created_at DESC)`; `idx_messages_ip_window (ip_hash, created_at DESC)` for rate limiting.

### 23.15 `site_settings`
`key` text PK · `value` jsonb NN · `description` text · `updated_at` timestamptz NN D `now()`.

Registered keys (V1): `site_title`, `site_description`, `default_og_image_path`, `availability_label`, `contact_response_note`, `contact_captcha_enabled`, `analytics_enabled`, `nav_resume_visible`, `maintenance_mode`, `canonical_base_url`.
A key/value table is used instead of a wide singleton row because these values are heterogeneous, optional, and expected to grow; each is documented in `docs/settings.md` and typed in `src/types/settings.ts`.

### 23.16 `resume_versions`
`id` uuid PK · `storage_path` text NN U · `file_name` text NN · `version_label` text · `file_size_bytes` integer · `mime_type` text NN CHECK `= 'application/pdf'` · `is_published` boolean NN D `false` · `notes` text · `uploaded_at` timestamptz NN D `now()`.
Constraint: unique partial index on `is_published` where true (exactly one published version).

### 23.17 `admin_users`
`user_id` uuid PK FK → `auth.users.id` ON DELETE CASCADE · `email` citext NN · `display_name` text · `role` admin_role NN D `owner` · `created_at` timestamptz.
This table is the authorisation source of truth. It is seeded only in local/staging; the production row is created once, manually and documentedly, after the owner account is created.

### 23.18 `analytics_events` (P2)
`id` uuid PK · `event_type` text NN (`page_view`, `project_view`, `resume_click`, `github_click`, `linkedin_click`, `contact_submit`) · `path` text · `project_id` uuid FK → `projects.id` ON DELETE SET NULL · `referrer_host` text · `session_hash` text · `created_at` timestamptz NN D `now()`.
No IP, no cookies, no user agent string, no personal identifiers. Index on `(event_type, created_at DESC)`.

### 23.19 Functions and triggers

| Object | Type | Purpose |
|---|---|---|
| `set_updated_at()` | trigger fn | Sets `updated_at = now()` before update on every table with the column |
| `set_published_at()` | trigger fn | Sets `projects.published_at` on the first transition to `published`; never clears it |
| `is_admin()` | `SECURITY DEFINER STABLE` fn | Returns true when `auth.uid()` exists in `admin_users`. Used by every admin policy. `search_path` is pinned. Declared `SECURITY DEFINER` specifically to avoid recursive RLS evaluation on `admin_users` |
| `hash_client_ip()` | trigger fn | Hashes the forwarded client IP with a salt held in a private schema table; writes `ip_hash` |
| `enforce_contact_rate_limit()` | trigger fn | Rejects inserts exceeding 5/hour or 20/day per `ip_hash`, and inserts submitted under 3 seconds after page load |
| `increment_project_view(slug)` | `SECURITY DEFINER` RPC (P2) | Only permitted mutation path for `view_count` |

### 23.20 Views (P1)
`v_public_projects` — published, non-private projects with technologies aggregated as JSON, used by the index and home queries to avoid N+1 fetches. Views inherit the RLS of their underlying tables when created with `security_invoker = on`, which is required here.

---

## 24. Relationships

```
auth.users 1───1 admin_users

profiles (singleton)

projects 1───N project_images
projects 1───N project_pipeline_steps
projects N───N technologies      (via project_technologies)
projects 1───N analytics_events  (nullable)

experience 1───N experience_items
experience N───N technologies    (via experience_technologies)

skill_categories 1───N skills

education      (standalone)
social_links   (standalone)
contact_messages (standalone)
site_settings  (standalone, key/value)
resume_versions (standalone)
```

**Cascade policy**

| Parent → child | On delete | Rationale |
|---|---|---|
| `projects` → `project_images` | CASCADE | Images are meaningless without the project; storage objects are removed by the admin delete flow before the row is deleted. |
| `projects` → `project_pipeline_steps` | CASCADE | Same. |
| `projects` → `project_technologies` | CASCADE | Join rows only. |
| `technologies` → `project_technologies` | RESTRICT | Prevents deleting a technology still in use; admin shows which projects block it. |
| `experience` → `experience_items` | CASCADE | |
| `skill_categories` → `skills` | RESTRICT | Prevents accidental loss of skills; admin requires reassignment first. |
| `auth.users` → `admin_users` | CASCADE | |
| `projects` → `analytics_events` | SET NULL | Historical counts survive project deletion. |

**Orphaned storage objects.** Deleting a row does not delete its file. The admin delete flow removes storage objects first, then the row; `/admin/media` lists objects with no referencing row so they can be cleaned up. This is a known operational chore, not a bug (see R-09).

---

## 25. RLS Policies

**Global rules**
1. RLS is **enabled on every table in the `public` schema**, including tables with no anonymous access.
2. The frontend only ever uses the publishable/anon key. The service-role key is never present in any frontend build, environment file committed to Git, or browser-reachable code.
3. Policies are written per operation (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) — never a blanket `FOR ALL USING (true)`.
4. Admin policies are expressed as `is_admin()` in both `USING` and `WITH CHECK`.
5. Public read policies filter on publication state *inside the policy*, so a forgotten client-side filter cannot leak drafts.

### 25.1 Policy matrix

| Table | anon SELECT | anon INSERT | anon UPDATE/DELETE | admin |
|---|---|---|---|---|
| `profiles` | `published = true` | ✗ | ✗ | full |
| `projects` | `publication_state = 'published' AND visibility_mode <> 'private'` | ✗ | ✗ | full |
| `project_images` | parent project passes the public predicate | ✗ | ✗ | full |
| `project_pipeline_steps` | parent project passes the public predicate | ✗ | ✗ | full |
| `technologies` | `published = true` | ✗ | ✗ | full |
| `project_technologies` | parent project passes the public predicate | ✗ | ✗ | full |
| `experience` | `publication_state = 'published'` | ✗ | ✗ | full |
| `experience_items` | parent experience published | ✗ | ✗ | full |
| `experience_technologies` | parent experience published | ✗ | ✗ | full |
| `skill_categories` | `published = true` | ✗ | ✗ | full |
| `skills` | `published = true` AND category published | ✗ | ✗ | full |
| `education` | `publication_state = 'published'` | ✗ | ✗ | full |
| `social_links` | `published = true` | ✗ | ✗ | full |
| `contact_messages` | **✗ (no SELECT policy at all)** | ✓ (constrained) | ✗ | SELECT/UPDATE/DELETE |
| `site_settings` | ✓ but only keys on a public allow-list | ✗ | ✗ | full |
| `resume_versions` | `is_published = true` (path + metadata only) | ✗ | ✗ | full |
| `admin_users` | ✗ | ✗ | ✗ | SELECT own row; no client-side writes |
| `analytics_events` | ✗ | ✓ (constrained, P2) | ✗ | SELECT |

**Notes on specific policies**

- **`contact_messages` INSERT.** The policy permits insert by `anon` and `authenticated`, with a `WITH CHECK` that pins `status = 'new'`, forbids client-supplied `admin_notes`, `read_at`, `replied_at`, and relies on column CHECK constraints for length limits. `INSERT ... RETURNING` is avoided; the client does not read back the row. Rate limiting is enforced by trigger, which runs regardless of RLS.
- **`site_settings` SELECT.** Anonymous read is limited to an allow-list of keys (`site_title`, `site_description`, `default_og_image_path`, `availability_label`, `contact_response_note`, `nav_resume_visible`, `canonical_base_url`, `analytics_enabled`, `maintenance_mode`). Any future operational or private setting is invisible by default because it is not on the list.
- **`admin_users`.** No anonymous access. Authenticated users may read only their own row, which is what `<ProtectedRoute>` needs. There is no client-side write path; membership is granted through a migration or a documented SQL statement.
- **`resume_versions`.** Anonymous read exposes only the published row. Combined with the storage policy in Section 26, this yields exactly one downloadable resume.
- **Defence in depth.** In addition to policies, `INSERT`, `UPDATE` and `DELETE` privileges are revoked from `anon` on every table except `contact_messages` (and `analytics_events` when enabled). RLS and grants must both fail open for a leak to occur.

### 25.2 What anonymous users can and cannot do (restated for testing)

**Can:** read published projects, published project media and pipeline steps, published experience and its items, published skills and categories, published education, published social links, allow-listed site settings, published profile fields, and the published resume metadata; insert a contact message within the rate limit.

**Cannot:** read any draft or archived content; read any private project; read `contact_messages`; read `admin_users`; read non-allow-listed settings; read unpublished resume versions; modify any content row; call `increment_project_view` more than the rate-limited allowance; escalate privileges through metadata.

---

## 26. Supabase Storage Architecture

| Bucket | Public | Max size | Allowed MIME | Read | Write / Update / Delete |
|---|---|---|---|---|---|
| `profile` | Yes (public read) | 5 MB | `image/jpeg`, `image/png`, `image/webp`, `image/avif` | Anyone | `is_admin()` only |
| `projects` | Yes (public read) | 8 MB | as above + `image/svg+xml` (sanitised on upload, P1) | Anyone | `is_admin()` only |
| `resume` | **No (private)** | 10 MB | `application/pdf` | Anonymous `SELECT` limited to the object whose name equals the currently published `resume_versions.storage_path`; access is then exercised through a 60-second signed URL | `is_admin()` only |

**Path conventions**
```
profile/avatar-<uuid>.webp
profile/og-default-<uuid>.png
projects/<project_id>/cover-<uuid>.webp
projects/<project_id>/gallery-<uuid>.webp
projects/<project_id>/architecture-<uuid>.webp
resume/<uuid>.pdf            (unguessable filename, never the person's name)
```

**Rules**
- **MED-01 (P0):** Uploads happen only from authenticated admin sessions. There is no anonymous upload path anywhere in the product.
- **MED-02 (P0):** MIME type and size are validated client-side *and* constrained by bucket configuration; the bucket configuration is authoritative.
- **MED-03 (P0):** Every uploaded image must have alt text recorded in the database before the parent record can be published.
- **MED-04 (P1):** Images are converted to WebP and resized to a max edge of 1920px in the browser before upload; the original is not stored. This keeps the free-tier storage and egress footprint small and removes the dependency on paid image transformations.
- **MED-05 (P1):** `width` and `height` are captured at upload and stored so the frontend can reserve space and avoid layout shift.
- **MED-06 (P0):** SVG uploads are either disabled in V1 or sanitised; unsanitised SVG is an XSS vector when served from the same origin. Default: **disabled**.
- **MED-07 (P1):** Deleting a project deletes its storage folder first, then the row.
- **MED-08 (P2):** `/admin/media` surfaces orphaned objects (present in storage, unreferenced in the database).

**Video decision (TD-07).** Video is referenced by external URL (YouTube/Vimeo) rather than stored in Supabase. A one-minute demo video exceeds the practical free-tier egress budget quickly, and external hosts provide adaptive streaming, thumbnails and captions for free. `video_url` therefore points outward; no `video` bucket is created.

---

## 27. Migration Strategy

### 27.1 Repository layout

```
supabase/
├── config.toml
├── migrations/
│   ├── 20260815090000_enable_extensions.sql
│   ├── 20260815090100_create_enums.sql
│   ├── 20260815090200_create_core_tables.sql          profiles, site_settings, admin_users
│   ├── 20260815090300_create_project_tables.sql       projects, images, pipeline steps
│   ├── 20260815090400_create_taxonomy_tables.sql      technologies + joins
│   ├── 20260815090500_create_cv_tables.sql            experience, items, skills, education
│   ├── 20260815090600_create_contact_tables.sql       contact_messages, social_links
│   ├── 20260815090700_create_resume_tables.sql        resume_versions
│   ├── 20260815090800_create_functions_triggers.sql
│   ├── 20260815090900_create_indexes.sql
│   ├── 20260815091000_enable_rls.sql                  ENABLE + REVOKE grants
│   ├── 20260815091100_create_rls_policies.sql
│   ├── 20260815091200_create_storage_buckets.sql
│   └── 20260815091300_create_storage_policies.sql
├── seed.sql                                           entrypoint, includes seed/*.sql in order
└── seed/
    ├── 01_site_settings.sql
    ├── 02_profile.sql
    ├── 03_technologies.sql
    ├── 04_skill_categories_skills.sql
    ├── 05_experience.sql
    ├── 06_education.sql
    ├── 07_social_links.sql
    └── 08_projects.sql
```

### 27.2 Rules

| ID | Rule | Priority |
|---|---|---|
| MIG-01 | Naming: `<UTC timestamp YYYYMMDDHHMMSS>_<verb>_<subject>.sql`, generated with `supabase migration new <name>`. | P0 |
| MIG-02 | Migrations are **forward-only and immutable once applied to any shared environment**. Fixing a mistake means writing a new migration. | P0 |
| MIG-03 | Ordering is lexicographic by timestamp. Dependencies (enums before tables, tables before policies) are respected by ordering, not by hope. | P0 |
| MIG-04 | Every migration is idempotent-safe where the syntax allows (`IF NOT EXISTS`, `CREATE OR REPLACE`) but is never expected to run twice. | P1 |
| MIG-05 | Every migration is reversible in principle; a `-- DOWN` comment block documents the reversal even though Supabase CLI does not run it automatically. | P2 |
| MIG-06 | **No production schema object may be created through the Supabase dashboard.** If an emergency dashboard change is ever made, a matching migration must be committed the same day and `supabase db diff` must come back clean. | P0 |
| MIG-07 | `supabase db reset` must fully rebuild local from migrations + seed. This is verified in CI on every pull request. | P0 |
| MIG-08 | Types are regenerated (`supabase gen types typescript`) whenever the schema changes and the generated file is committed. | P0 |
| MIG-09 | Storage buckets and their policies are created by migration, not by clicking in the dashboard. | P0 |

### 27.3 Environments

| Environment | Supabase project | Migrations | Seed |
|---|---|---|---|
| Local | `supabase start` (Docker) | `supabase db reset` | Full seed |
| Staging (P2) | Separate free project | `supabase db push` from the `main` branch pre-release | Full seed |
| Production | Dedicated project | `supabase db push`, run manually and deliberately after a successful staging apply | **Content seed only on first deploy**; never re-run |

### 27.4 Command reference
`supabase init` · `supabase start` / `stop` · `supabase migration new <name>` · `supabase db reset` (local rebuild + seed) · `supabase db diff -f <name>` (capture drift) · `supabase link --project-ref <ref>` · `supabase db push` (apply to linked project) · `supabase gen types typescript --linked > src/types/database.types.ts`.

---

## 28. Seed Strategy

### 28.1 Principles

| Rule | Detail |
|---|---|
| Seed is real content | Seed files contain the actual approved portfolio content, so a fresh environment is immediately meaningful. |
| Seed is idempotent | Inserts use deterministic UUIDs and `ON CONFLICT DO NOTHING` / `DO UPDATE`, so re-running is safe locally. |
| Seed contains **no** credentials | No passwords, no API keys, no service-role key, no `auth.users` rows with known passwords. The admin user is created through the Supabase Auth UI/CLI per environment and linked into `admin_users` by a documented statement. |
| Seed contains **no** private company data | No customer records, no supplier pricing, no internal reports, no Petpooja/Zomato/Swiggy credentials or account identifiers, no restaurant financials. |
| Seed contains **no** fabricated metrics | Impact statements are qualitative unless a measured figure has been supplied and approved. |
| Seed respects confidentiality flags | Any project whose disclosure is unconfirmed is seeded with `publication_state = 'draft'`. |

### 28.2 Seed content

**Site settings** — title, description, canonical base URL `[REQUIRES USER INPUT — domain]`, availability label, contact response note `[REQUIRES USER INPUT]`.

**Profile (UNVERIFIED until the resume is supplied)** — name: Moin Patel · role title: AI Developer / AI Automation Executive · positioning line: "Building AI-powered systems that automate work, save time, and reduce business costs." · location: Surat, Gujarat, India · email: mspatel05831@gmail.com · phone: +91 8530537786 with `phone_visible = false` pending decision · avatar: `[REQUIRES USER INPUT — final profile photo]` · bios: `[REQUIRES USER INPUT — approved About copy; this PRD will not write his biography for him]`.

**Technologies** — seeded from what the described projects actually use: Node.js, SQL, Git, Google Apps Script, Gemini 2.5 Flash, OCR, Google Sheets, Petpooja POS, Google Workspace, Microsoft Excel, Google Business Profile, Zomato Merchant, Swiggy Merchant. Frontend technologies are added only after Q-05 is answered.

**Skills / categories** — exactly the three categories and their skills listed in Section 16.

**Experience** — the single Bookends record from Section 15, published.

**Education** — the three records from Section 17; Class X/XII seeded as `draft` pending Q-08.

**Social links** — LinkedIn `[REQUIRES USER INPUT — URL]`, GitHub `[REQUIRES USER INPUT — URL]`, Email (`mailto:`), published only where a URL exists.

**Projects** — three records, all seeded as **draft** until disclosure is confirmed:

| Project | Slug | Status | Category | Notes |
|---|---|---|---|---|
| Recipe Costing & Restaurant Operations System | `recipe-costing-restaurant-operations-system` | `completed` | `web_application` | Problem: manual spreadsheet-based recipe costing. Solution: centralised web application for recipe management with automated costing and pricing calculations. Impact (qualitative only): reduced spreadsheet dependency, centralised recipe information, improved consistency, faster pricing decisions. **No numeric savings.** |
| Capiche AI Feedback Automation | `capiche-ai-feedback-automation` | `completed` | `ai_automation` | Pipeline steps seeded into `project_pipeline_steps` (see 28.3). Client name seeded but `client_disclosed = false` pending Q-06. |
| Exam Build Platform | `exam-build-platform` | `in_progress` | `web_application` | Scope: user management, exam management, candidate management, automated evaluation, scalable architecture. **Must render as In Progress everywhere. Completed-state copy is prohibited.** |

### 28.3 Capiche pipeline seed (`project_pipeline_steps`)

| # | Label | Tech note |
|---|---|---|
| 1 | Scanned handwritten feedback | Physical feedback cards captured as scans |
| 2 | OCR | Text extraction from scanned images |
| 3 | Gemini 2.5 Flash | Structuring and interpretation of extracted text |
| 4 | NLP / sentiment processing | Sentiment and theme classification |
| 5 | Information extraction | Fields pulled into a consistent record shape |
| 6 | Validation | Rule checks before data is accepted |
| 7 | De-duplication | Repeat submissions collapsed |
| 8 | Google Sheets | Structured output written to the operational sheet |
| 9 | Business intelligence | Reporting and trend review on the collected data |

**Business framing to be written into the case study:** handwritten feedback previously had to be read and typed up by staff before anyone could see a trend; the automation removes the transcription step, standardises the output and makes the feedback queryable. Exact time savings are `[REQUIRES USER INPUT — only if measured]`.

---

## 29. Frontend Architecture

### 29.1 Directory structure and responsibilities

```
src/
├── app/                 Router definition, providers (Query, Auth, Toast, Helmet), error boundaries
├── components/
│   ├── ui/              Primitives only: Button, Input, Select, Textarea, Badge, Card, Chip,
│   │                    Dialog, Sheet, Toast, Skeleton, Tooltip, Tabs. No data access. No business rules.
│   ├── common/          Composed, reusable, still presentational: SectionHeading, Prose, Figure,
│   │                    EmptyState, ErrorState, LoadingState, ProjectCard, TimelineItem, PipelineDiagram
│   └── admin/           Admin-only composed components: DataTable, FormField, ImageUploader,
│                        PublishControl, SortOrderInput, ConfirmDialog
├── sections/            Homepage and page sections. Compose common components, call hooks. One file per section.
├── pages/
│   ├── public/          One component per public route
│   └── admin/           One component per admin route
├── layouts/             PublicLayout (header/footer), AdminLayout (sidebar/tabs), AuthLayout
├── hooks/               React Query hooks (useProjects, useProject, useProfile, useExperience, …),
│                        UI hooks (useReducedMotion, useMediaQuery, useScrollSpy, useUnsavedChanges),
│                        useAuth / useIsAdmin
├── lib/                 supabaseClient.ts, queryClient.ts, queryKeys.ts, env.ts, seo.ts, markdown.ts,
│                        slug.ts, image.ts (client-side resize/webp), cn.ts, dates.ts, analytics.ts
├── services/            One module per resource. The ONLY place Supabase queries are written.
│                        projects.service.ts, experience.service.ts, skills.service.ts,
│                        education.service.ts, social.service.ts, contact.service.ts,
│                        profile.service.ts, settings.service.ts, resume.service.ts, media.service.ts
├── types/               database.types.ts (generated — never hand-edited), domain.ts (mapped app types),
│                        settings.ts, forms.ts (Zod schemas + inferred types)
├── content/             Static copy constants (build types, impact statements, hero fallbacks)
├── styles/              globals.css, tokens.css, typography.css
└── main.tsx
```

### 29.2 Layering rules (non-negotiable)

```
pages/sections  →  hooks  →  services  →  supabaseClient  →  Supabase
     (JSX)        (cache)    (queries)      (transport)
```

| ID | Rule | Priority |
|---|---|---|
| FE-01 | A component in `components/` or `sections/` must never import `supabaseClient` directly. | P0 |
| FE-02 | Services contain all query construction, filtering, ordering and DTO mapping. They return domain types, not raw Supabase rows. | P0 |
| FE-03 | Hooks own caching, keys, invalidation and loading/error surfaces. They contain no query construction. | P0 |
| FE-04 | Presentational components receive data and callbacks as props and hold no business logic beyond formatting. | P0 |
| FE-05 | Public-visibility filtering exists in the service **and** in RLS. Duplication here is intentional defence. | P0 |
| FE-06 | No `any`. `strict: true` in `tsconfig`. Generated database types are the source of column types. | P0 |
| FE-07 | Route-level code splitting via `React.lazy`; the entire `/admin` tree is a separate chunk never loaded by public visitors. | P0 |
| FE-08 | Environment access goes through `lib/env.ts`, which validates required variables at startup and fails loudly in development. | P0 |

### 29.3 Libraries (V1)

| Concern | Choice | Justification |
|---|---|---|
| Routing | React Router | Standard for Vite SPAs; nested layouts and route guards map cleanly to the IA. |
| Server state | TanStack Query | Caching, invalidation, loading/error states, and request de-duplication that would otherwise be hand-rolled per section. |
| Forms | React Hook Form | Uncontrolled inputs, minimal re-renders, straightforward `aria-describedby` wiring. |
| Validation | Zod | One schema powers form validation and TypeScript types; mirrors the database CHECK constraints. |
| Styling | Tailwind CSS + CSS custom properties for tokens | Fast, consistent spacing/typography scales; tokens in CSS variables keep design values in one place and make theming inspectable. **This is an addition to the stack named in the brief — see TD-03.** |
| Primitives | Headless, accessible primitives (Radix-style) for Dialog, Sheet, Tabs, Tooltip, Select | Focus management and ARIA behaviour that is expensive and error-prone to write by hand. |
| Markdown | `react-markdown` + `remark-gfm` + sanitisation, raw HTML disabled | Case-study content is markdown; raw HTML is an injection risk. |
| Motion | CSS transitions first; a small animation library only for the process-line motif and the lightbox | Keeps the bundle small; most of the specified motion is a fade and a translate. |
| Icons | A single tree-shakeable icon set, imported per icon | Avoids shipping an entire icon font. |
| SEO | `react-helmet-async` + build-time prerender | See TD-02. |
| Testing | Vitest, Testing Library, Playwright, axe-core | Section 41. |

Any library not listed here requires justification in the pull request and an update to this section.

---

## 30. Component Architecture

### 30.1 Component contract

Every component declares a typed props interface; no implicit `any`; no default exports for shared components (named exports keep refactors honest); one component per file; co-located test file where behaviour is non-trivial.

### 30.2 Key components

| Component | Layer | Props (abridged) | Responsibility |
|---|---|---|---|
| `<Button>` | ui | `variant`, `size`, `loading`, `asChild` | Visual + loading/disabled states only |
| `<Badge>` / `<StatusBadge>` | ui / common | `status` | Renders status text + colour; text never colour-only |
| `<Chip>` | ui | `label`, `emphasis` | Technology/skill token |
| `<Skeleton>` | ui | `variant`, `count` | Shape-matched placeholders |
| `<EmptyState>` | common | `title`, `description`, `action` | The single empty-state pattern used everywhere |
| `<ErrorState>` | common | `title`, `description`, `onRetry` | The single error pattern used everywhere |
| `<SectionHeading>` | common | `eyebrow`, `title`, `description`, `id` | Consistent section headers + anchor ids |
| `<Prose>` | common | `markdown` | Sanitised markdown rendering with the typographic scale |
| `<ProjectCard>` | common | `project` | Card per 13.2, including visibility-mode link behaviour |
| `<PipelineDiagram>` | common | `steps` | Ordered process-line rendering; horizontal ≥1024px, vertical below |
| `<TimelineItem>` | common | `experience` | Timeline row with rail |
| `<Lightbox>` | common | `images`, `index`, `onClose` | Focus-trapped gallery viewer |
| `<SEO>` | common | `title`, `description`, `image`, `canonical`, `type`, `noindex` | Helmet wrapper; every page renders exactly one |
| `<ProtectedRoute>` | app | `children` | Session + admin membership gate |
| `<DataTable>` | admin | `columns`, `rows`, `onSort`, `emptyState`, `loading` | The one admin list pattern |
| `<PublishControl>` | admin | `value`, `onChange`, `blockers` | Draft/Published/Archived with publish-gate messaging |
| `<ImageUploader>` | admin | `bucket`, `pathPrefix`, `onUploaded`, `requireAlt` | Client resize → WebP → upload → record row |
| `<FormField>` | admin | `label`, `error`, `hint`, `required` | Label/description/error wiring for a11y |

### 30.3 State model

- **Server state:** TanStack Query only. No duplication into local state.
- **UI state:** local `useState` / `useReducer`. No global store in V1 — there is no cross-page UI state that justifies one.
- **Auth state:** a single `AuthProvider` exposing `session`, `isAdmin`, `loading`, `signIn`, `signOut`, subscribed to `onAuthStateChange`.
- **URL state:** filters, preview mode and `returnTo` live in the URL, not in memory, so views are shareable and back-button-correct.

---

## 31. API / Data Access Architecture

### 31.1 Supabase client

`src/lib/supabaseClient.ts` exports one browser client, created once:

- URL: `import.meta.env.VITE_SUPABASE_URL`
- Key: `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
- Auth options: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`
- Typed with the generated `Database` type so every query is column-checked at compile time.

**Prohibited:** creating additional clients per module; instantiating a service-role client anywhere in `src/`; reading environment variables outside `lib/env.ts`; committing any `.env` file other than `.env.example`.

### 31.2 Environment variables

| Variable | Where | Committed | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Local `.env.local`, Vercel env | Never (only in `.env.example` as a placeholder) | Public by nature |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Local `.env.local`, Vercel env | Never | Public by nature; safe **only** because RLS is correct |
| `SUPABASE_SERVICE_ROLE_KEY` | **Nowhere in this project's frontend.** Only in a local CLI shell or a server-side Edge Function secret if one is ever added | Never, under any circumstance | Any `VITE_`-prefixed secret is compiled into the client bundle and is therefore public |
| `SUPABASE_DB_PASSWORD` | Developer machine only, for CLI operations | Never | |
| `VITE_SITE_URL` | Build env | `.env.example` only | Canonical URL for SEO/sitemap |

`.gitignore` must include `.env`, `.env.local`, `.env.*.local`. A pre-commit secret scan (P2) is recommended.

### 31.3 Service module contract

Each service exports narrow, named functions — for example, for projects: list published projects (optionally filtered by category/technology/status), get a published project by slug, get the next published project, and the admin-only list/get/create/update/delete/reorder operations. Rules:

| ID | Rule | Priority |
|---|---|---|
| API-01 | Public list queries always select explicit column lists — never `select('*')` — so that adding an internal column cannot leak it. | P0 |
| API-02 | Public queries always include the publication/visibility predicate, even though RLS also enforces it. | P0 |
| API-03 | Related data is fetched with Supabase's embedded-select syntax or the `v_public_projects` view; N+1 fetch loops are not acceptable. | P1 |
| API-04 | Errors are caught in the service, logged with context, and re-thrown as typed application errors that hooks can map to UI states. | P0 |
| API-05 | Mutations return the updated row so the cache can be updated without a full refetch where cheap. | P1 |
| API-06 | Every list query used on a page with unbounded growth applies an explicit limit. | P1 |

### 31.4 Query keys and caching

Keys are centralised in `lib/queryKeys.ts` as a typed factory (`projects.list(filters)`, `projects.detail(slug)`, `experience.list()`, …). Defaults: `staleTime` 5 minutes for public content, 0 for admin lists; `retry: 1`; `refetchOnWindowFocus: false` on public pages, `true` on admin lists. Admin mutations invalidate both the admin key and the corresponding public key.

---

## 32. Design System

### 32.1 Colour tokens (dark-first)

| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#08090C` | Page background |
| `--bg-surface` | `#0E1015` | Cards, header on scroll |
| `--bg-surface-raised` | `#14171F` | Modals, popovers, admin sidebar |
| `--border-subtle` | `#1E222C` | Default borders |
| `--border-strong` | `#2C3240` | Hover/focus borders |
| `--text-primary` | `#F2F4F8` | Headings, body |
| `--text-secondary` | `#A8B0C0` | Supporting copy |
| `--text-muted` | `#6E7688` | Captions, meta |
| `--accent` | `#4F7DF3` | Primary actions, links, active states |
| `--accent-strong` | `#3B62D9` | Hover on primary |
| `--accent-soft` | `rgba(79,125,243,0.12)` | Chip and badge fills |
| `--indigo-deep` | `#1B1F4B` | Gradient anchor for the CTA band only |
| `--success` | `#3FBF87` | Published, success toasts |
| `--warning` | `#E0A32E` | In-progress, draft |
| `--danger` | `#E5484D` | Destructive actions, errors |
| `--focus-ring` | `#8AA9FF` | 2px outline, 2px offset |

Rules: exactly one accent hue family; gradients only in the CTA band and the process-line motif, at ≤12% opacity; status colours are never the sole carrier of meaning. Contrast: body text ≥ 7:1, secondary ≥ 4.5:1, all interactive states ≥ 3:1 against adjacent colour. A light theme is **P3** — tokens are structured so it can be added without touching components.

### 32.2 Typography

| Role | Family | Usage |
|---|---|---|
| Display | A geometric/neo-grotesque with a distinctive tighter form (e.g. Space Grotesk or similar) | `h1`, positioning line, section titles, project titles |
| Body | A highly legible UI sans (e.g. Inter) | Everything else |
| Mono | A developer mono (e.g. JetBrains Mono) | Code, technology chips, pipeline step numbers, dates in the timeline |

The display/body/mono trio is the personality carrier: display is used at large sizes with tight tracking; mono appears in small, structural roles (step numbers, dates, tech labels) so the page reads as an engineering artefact without shouting. Fonts are self-hosted (WOFF2, `font-display: swap`, subset to Latin) — no render-blocking third-party font request.

**Scale (rem, fluid via `clamp` between 375px and 1440px):** `xs .75` · `sm .875` · `base 1` · `lg 1.125` · `xl 1.25` · `2xl 1.5` · `3xl 1.875` · `4xl 2.25` · `5xl 3` · `6xl 3.75`. Line heights: 1.15 display, 1.6 body, 1.5 UI. Body measure capped at 72ch.

### 32.3 Spacing, radius, elevation
- Spacing scale (px): 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128. Section vertical padding: 96–128px desktop, 64–80px tablet, 48–64px mobile.
- Radius: `sm 6px` (chips, inputs), `md 10px` (buttons), `lg 16px` (cards), `xl 24px` (modals, hero photo frame), `full` (avatars, pills).
- Elevation: three levels only — hairline border (default), border + soft shadow (hover), border + shadow + raised surface (modal). Shadows are large-radius and low-opacity; no hard drop shadows.
- Glass: used **only** on the sticky header and the mobile nav sheet — `backdrop-filter: blur(12px)` over `--bg-base` at 72% opacity, always with a hairline border so the edge is legible. Nowhere else.

### 32.4 Component styles

| Component | Specification |
|---|---|
| **Button** | Variants: primary (accent fill), secondary (border + transparent), ghost (text), danger. Sizes: sm 36px, md 44px, lg 52px. All ≥44px touch target on mobile. Loading = spinner replaces the label, width preserved. Disabled = 45% opacity, `cursor: not-allowed`, never the only signal. |
| **Input / Textarea / Select** | 44px min height, `--bg-surface` fill, subtle border, accent border on focus + focus ring, label above, hint below, error below in `--danger` with an icon. Never rely on placeholder text as a label. |
| **Card** | `--bg-surface`, `--border-subtle`, radius lg, padding 20–24px, hover raises border and adds shadow. |
| **Badge** | Status: Completed (success soft), In Progress (warning soft), Draft (muted), Archived (muted outline), Published (success). Always text + colour. |
| **Chip** | Mono label, 28px height, radius sm, `--accent-soft` fill for core skills, transparent + border otherwise. |
| **Navigation** | See 9.3. |
| **Modal / Sheet** | Focus trapped, `Esc` to close, backdrop click to close, scroll locked, return focus to the trigger, `aria-modal`, labelled by its heading. |
| **Toast** | Top-right desktop, top-centre mobile, auto-dismiss 5s (errors 8s, or persist until dismissed), `role="status"` for success and `role="alert"` for errors, max 3 stacked, pausable on hover. |
| **Skeleton** | Matches the final element's box exactly. Subtle shimmer; static block under reduced motion. |
| **Empty state** | Icon + title + one-sentence explanation + one action. Written as an invitation ("Add your first project"), never an apology. |
| **Tooltip** | Desktop only; never carries information that exists nowhere else. |

### 32.5 Motion

| Interaction | Duration / easing |
|---|---|
| Hover / focus | 120–160 ms, `ease-out` |
| Section entry | 200 ms, `ease-out`, 12px rise, once |
| Page transition | 150 ms cross-fade |
| Modal / sheet | 200 ms in, 150 ms out |
| Process-line draw | 600 ms, once per section |
| Hero load sequence | ≤700 ms total, 70 ms stagger |

`prefers-reduced-motion: reduce` disables all transforms and draws; opacity changes are reduced to ≤100 ms or removed. **The site must be fully usable and visually complete with all animation disabled.**

### 32.6 Consistency between public site and admin

The admin uses the same tokens, typography and primitives, with three differences: denser spacing (one step down), a fixed sidebar layout, and no entry animations (they slow repetitive work). Admin must never look like an unstyled bolt-on.

---

## 33. Responsive Requirements

### 33.1 Breakpoints

| Token | Range | Target devices |
|---|---|---|
| `xs` | 320–429 | Small phones (375, 390, 414 tested) |
| `sm` | 430–767 | Large phones (430 tested) |
| `md` | 768–1023 | Tablets portrait (768) |
| `lg` | 1024–1279 | Tablets landscape, small laptops (1024) |
| `xl` | 1280–1439 | Laptops (1280) |
| `2xl` | 1440+ | Desktops (1440, 1920 tested) |

Content max-width 1280px; the layout is centred with 24px gutters (16px below 430px). Above 1920px the background extends but content does not.

### 33.2 Mobile-specific behaviour (not just shrinking)

| ID | Requirement | Priority |
|---|---|---|
| RES-01 | Navigation becomes a full-screen sheet with a pinned primary CTA; it is not a squeezed horizontal bar. | P0 |
| RES-02 | Hero reorders to photo → identity → CTAs, with full-width stacked buttons. | P0 |
| RES-03 | The case-study sticky section nav is removed below 1024px and replaced by a collapsible "Jump to" disclosure at the top. | P1 |
| RES-04 | The experience timeline drops its rail and becomes stacked cards below 768px. | P1 |
| RES-05 | Technology chip rows scroll horizontally with momentum and no visible scrollbar; they never wrap into four lines. | P1 |
| RES-06 | Admin tables become stacked record cards below 768px, with the primary action reachable without horizontal scroll. | P0 |
| RES-07 | All touch targets ≥44×44px with ≥8px separation. | P0 |
| RES-08 | Forms use appropriate `inputmode`/`autocomplete` (`email`, `name`, `organization`) so mobile keyboards are correct. | P1 |
| RES-09 | Sticky elements never consume more than 15% of viewport height on mobile. | P1 |
| RES-10 | The pipeline diagram is horizontal on ≥1024px and vertical below; it is never horizontally scrolled on mobile. | P1 |
| RES-11 | Images serve appropriate sizes via `srcset`/`sizes`; a mobile visitor never downloads a 1920px asset. | P1 |
| RES-12 | Test matrix: 1920, 1440, 1280, 1024, 768, 430, 390, 375 — plus 320px must not break layout (may compress). | P0 |

---

## 34. Accessibility

Target: **WCAG 2.1 AA** on all public pages; admin aims for the same standard, with keyboard operability as the hard requirement.

| ID | Requirement | Priority |
|---|---|---|
| A11Y-01 | Semantic landmarks on every page: `header`, `nav`, `main`, `footer`, sectioning elements with accessible names. | P0 |
| A11Y-02 | One `<h1>` per page; heading levels never skip. | P0 |
| A11Y-03 | Every interactive element is reachable and operable by keyboard in a logical order; no keyboard traps except intentional modal focus traps. | P0 |
| A11Y-04 | Visible focus indicator on every focusable element: 2px `--focus-ring` outline with 2px offset. `outline: none` without a replacement is prohibited. | P0 |
| A11Y-05 | Skip-to-content link as the first focusable element. | P0 |
| A11Y-06 | All meaningful images have descriptive `alt`; decorative images use `alt=""`; alt text is required in the database before publish. | P0 |
| A11Y-07 | Every form control has a programmatically associated `<label>`; errors are linked via `aria-describedby` and announced via a live region. | P0 |
| A11Y-08 | Colour contrast: text ≥ 4.5:1 (large text ≥ 3:1), UI boundaries ≥ 3:1. Verified per token pair, not by eye. | P0 |
| A11Y-09 | Status is never conveyed by colour alone; badges carry text. | P0 |
| A11Y-10 | `prefers-reduced-motion: reduce` removes all non-essential motion. | P0 |
| A11Y-11 | Modals/sheets: `role="dialog"`, `aria-modal="true"`, labelled, focus trapped, focus returned on close. | P0 |
| A11Y-12 | Dynamic content changes (form success, toast, filter results count) are announced through appropriate live regions. | P1 |
| A11Y-13 | Icon-only buttons have `aria-label`; icons inside labelled buttons are `aria-hidden`. | P0 |
| A11Y-14 | Text resizes to 200% without loss of content or function; no fixed-height text containers. | P1 |
| A11Y-15 | Language declared (`<html lang="en">`); page titles unique and descriptive. | P0 |
| A11Y-16 | The lightbox is fully keyboard operable (arrows, `Esc`) and announces position ("Image 2 of 5"). | P1 |
| A11Y-17 | Automated axe checks in CI on key pages, plus one manual keyboard-only and one screen-reader pass before launch. | P1 |

---

## 35. SEO

| ID | Requirement | Priority |
|---|---|---|
| SEO-01 | Every page renders a unique `<title>` (≤60 chars) and meta description (≤160 chars) through the `<SEO>` component. | P0 |
| SEO-02 | Project pages derive metadata from `seo_title`/`seo_description`, falling back to `title`/`summary`. | P0 |
| SEO-03 | Open Graph and Twitter Card tags on every page: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `twitter:card=summary_large_image`. | P1 |
| SEO-04 | OG image resolution order: project `og_image_path` → project cover → site default. Default dimensions 1200×630. | P1 |
| SEO-05 | Canonical URL on every page, built from `VITE_SITE_URL` + path, with query parameters excluded. | P1 |
| SEO-06 | `sitemap.xml` generated at build time: static routes + every published, non-private project slug, with `lastmod` from `updated_at`. | P1 |
| SEO-07 | `robots.txt` allows the public site, disallows `/admin`, and points to the sitemap. | P0 |
| SEO-08 | Structured data (JSON-LD): `Person` on `/`, `BreadcrumbList` + `CreativeWork` on project pages, `WebSite` sitewide. | P2 |
| SEO-09 | Admin routes render `noindex, nofollow`. | P0 |

**TD-02 — Crawlability of a Vite SPA.** A client-rendered SPA serves the same empty HTML shell for every route. Google generally executes JavaScript, but LinkedIn, WhatsApp, Slack and X do **not** — so a shared project link would show the site-wide default preview instead of the project's own. Since sharing project links is a primary distribution channel for a portfolio, this is a real defect, not a theoretical one.

**Decision:** keep Vite and add a **build-time prerender** step that fetches published projects with the publishable key and emits a static HTML file per route with correct meta tags, hydrating into the SPA on load. New content published from admin appears immediately in the app but its prerendered HTML refreshes on the next build; a Vercel Deploy Hook fired from the admin publish action (P2) closes that gap. Migrating to Next.js was rejected for V1: it changes the whole project structure for a benefit that prerendering delivers at this content volume. If the site later grows a blog with frequent publishing, revisit (Section 45).

---

## 36. Performance

| ID | Requirement | Target | Priority |
|---|---|---|---|
| PERF-01 | Lighthouse Performance (mobile, throttled) on `/` and `/projects/:slug` | ≥ 90 | P1 |
| PERF-02 | Largest Contentful Paint | < 2.5 s on 4G | P1 |
| PERF-03 | Cumulative Layout Shift | < 0.1 | P0 |
| PERF-04 | Interaction to Next Paint | < 200 ms | P1 |
| PERF-05 | Initial JS bundle (public site, gzipped) | < 180 KB | P1 |
| PERF-06 | The `/admin` chunk is never loaded on public routes | Verified in the network panel | P0 |
| PERF-07 | Images: WebP, correct `srcset`/`sizes`, `loading="lazy"` below the fold, `fetchpriority="high"` on the hero image only, explicit dimensions everywhere | — | P0 |
| PERF-08 | Fonts: self-hosted WOFF2, subset, preloaded for the display face only, `font-display: swap` | — | P1 |
| PERF-09 | Queries select explicit columns, apply limits, and avoid N+1; the home page issues no more than 6 requests on first load | — | P1 |
| PERF-10 | React Query `staleTime` of 5 minutes on public content prevents refetch storms during scroll | — | P1 |
| PERF-11 | Route-level code splitting for all pages; heavy components (lightbox, markdown renderer) lazily imported | — | P1 |
| PERF-12 | No dependency is added that duplicates an existing capability; bundle size is reviewed in the pull request when `package.json` changes | — | P1 |
| PERF-13 | Lighthouse CI runs on pull requests and fails the build on a >5-point regression | — | P2 |

---

## 37. Security

| ID | Requirement | Priority |
|---|---|---|
| SEC-01 | The service-role key never appears in the frontend, the repository, Vercel's client-side variables, or any `VITE_`-prefixed variable. | P0 |
| SEC-02 | RLS is enabled on every `public` table and is the authoritative authorisation mechanism; UI gating is convenience only. | P0 |
| SEC-03 | Admin identity is verified against `admin_users` on every protected route render and by every admin RLS policy. | P0 |
| SEC-04 | All user input is validated client-side (Zod) and constrained server-side (CHECK constraints, triggers). Client validation is never trusted. | P0 |
| SEC-05 | Markdown rendering disables raw HTML and sanitises output; `dangerouslySetInnerHTML` is prohibited outside the audited markdown renderer. | P0 |
| SEC-06 | SVG upload is disabled in V1 (XSS vector when served same-origin). | P0 |
| SEC-07 | Contact spam controls per FR-CONT-08; rate limiting is enforced in the database so it cannot be bypassed by calling the API directly. | P0 |
| SEC-08 | Security headers configured at the host: `Content-Security-Policy` (self + Supabase project origin + font/image sources), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` denying camera/microphone/geolocation. | P1 |
| SEC-09 | HTTPS enforced; HSTS enabled once the domain is stable. | P0 |
| SEC-10 | Supabase Auth: sign-ups disabled, password minimum length raised, leaked-password protection enabled, redirect URLs restricted to known origins, session lifetime set deliberately. | P0 |
| SEC-11 | Error messages never leak schema details, SQL, stack traces, or whether a given draft slug exists. | P0 |
| SEC-12 | Storage buckets enforce MIME and size limits server-side; the resume bucket is private with a per-object anon read policy. | P0 |
| SEC-13 | No customer data, employer credentials, POS/aggregator account identifiers, internal pricing, or restaurant financials appear anywhere in the repository, the database, seed files, screenshots, or case-study copy. | P0 |
| SEC-14 | Dependencies are pinned; `npm audit` runs in CI; a Dependabot/Renovate configuration is added. | P1 |
| SEC-15 | CSRF is not applicable to Supabase's bearer-token model, but the same-origin CSP and the absence of cookie-based mutations must be preserved. If cookie auth is ever adopted, CSRF protection becomes mandatory. | P1 |
| SEC-16 | Secrets are rotated if ever exposed; a documented rotation procedure lives in `docs/security.md`. | P1 |
| SEC-17 | Access to production Supabase is limited to the owner account with MFA enabled. | P1 |

---

## 38. Error Handling

| Scenario | User-facing behaviour | Technical behaviour | Priority |
|---|---|---|---|
| Supabase unreachable / network failure | Section-level `<ErrorState>`: "Couldn't load this section" + Retry. The rest of the page still renders. | Query retries once, then surfaces the error; logged with the query key | P0 |
| Database query error | Same as above; generic message, no SQL or schema detail | Full error logged to console in dev, to the error reporter in prod (P2) | P0 |
| Project slug not found / unpublished | `/404` view: "This project isn't available" + link to `/projects`. Identical response for "does not exist" and "exists but is a draft" | No distinguishing status codes or messages | P0 |
| Contact submission failure | Inline error above the form, values preserved, `mailto:` fallback offered | Error logged; no partial write | P0 |
| Rate limit hit | "You've sent several messages recently. Please email directly." + email link | Trigger raises a specific error code that the service maps | P0 |
| Authentication failure | "Invalid email or password" (generic) | No enumeration signal | P0 |
| Session expired mid-edit | Toast: "Your session expired. Sign in to continue." Form state preserved in memory; redirect only on confirmation | Refresh attempted first | P1 |
| Unauthorised admin access | Redirect to `/admin/login?returnTo=…`; any write attempted anyway is rejected by RLS | Rejection logged | P0 |
| Image upload failure | Row-level error next to the file, other files continue, Retry per file | Partial uploads are cleaned up | P0 |
| Invalid form data | Inline field errors, focus to first invalid field, submit stays enabled after failure | Zod errors mapped to fields | P0 |
| Empty database (fresh install) | Sections with no data are hidden; `/projects` shows a neutral empty state; the site never renders broken scaffolding | Dev-mode console warning | P0 |
| Missing project content (published with gaps) | Only populated blocks render; the case study never shows an empty heading | Publish gate should prevent this (FR-ADM-11) | P0 |
| Missing image / broken storage path | Fallback gradient tile with the project title; never a broken-image icon | `onError` handler swaps the source | P0 |
| Unexpected React error | Route-level error boundary → `/500` view with Reload and Home actions | Error boundary logs component stack | P0 |
| Maintenance mode enabled | Public routes show a maintenance notice; `/admin` still reachable | Driven by `site_settings.maintenance_mode` | P2 |

**Rule (ERR-01, P0):** every asynchronous operation resolves into exactly one of four visible states — loading, empty, error, or content. A silent no-op is a defect.

---

## 39. Loading States

| Surface | Treatment | Priority |
|---|---|---|
| Initial app load | Minimal inline shell (logo + background) rendered by `index.html`, replaced on hydration. No full-screen branded splash. | P0 |
| Homepage sections | Per-section skeletons matching final dimensions; sections appear independently as their queries resolve. | P0 |
| Project grid | 6 card skeletons with identical geometry to real cards. | P0 |
| Project detail | Hero skeleton + three prose block skeletons; the sticky nav appears only when content is known. | P0 |
| Images | Reserved aspect-ratio box with a subtle surface fill; fade in on load (`decoding="async"`). | P0 |
| Admin tables | 5 skeleton rows preserving column widths. | P0 |
| Form submission | Button enters loading state with the label replaced by a spinner; width preserved; form disabled. | P0 |
| Authentication check | Neutral centred spinner on `/admin/*` while the session resolves — never a flash of admin UI, never a flash of the login form for a signed-in user. | P0 |
| Resume/PDF | Skeleton in the viewer frame; Download button available before the embed finishes. | P1 |
| Filter changes | Existing results dim to 60% opacity rather than being replaced by skeletons (avoids jarring re-layout). | P1 |

**Rule (LOAD-01, P0):** no blank screens and no layout shift when content arrives. Skeletons must match final dimensions; if they cannot, reserve space instead.

---

## 40. Analytics

Analytics are **optional for V1 (P2)** and ship only if they can be added without collecting personal data.

| ID | Requirement | Priority |
|---|---|---|
| ANA-01 | Tracked events: page view, project view, resume click, GitHub click, LinkedIn click, contact submission. | P2 |
| ANA-02 | Storage: the `analytics_events` table (23.18), written by an INSERT-only policy with column constraints. | P2 |
| ANA-03 | No IP addresses, no cookies, no cross-site identifiers, no full user-agent strings, no fingerprinting. `session_hash` is a random per-session value held in `sessionStorage` and is not stable across visits. | P0 (if built) |
| ANA-04 | A single flag `site_settings.analytics_enabled` disables all collection at runtime. | P2 |
| ANA-05 | Admin dashboard shows 30-day counts per event type and top viewed projects. | P3 |

**Alternative:** a privacy-first hosted analytics tool (e.g. a cookieless product) satisfies ANA-01 with less code and no schema. Either path is acceptable; building both is not.

---

## 41. Testing Strategy

### 41.1 Unit tests (Vitest + Testing Library) — P1
Cover logic that can silently be wrong:
- `slug.ts` — generation, collision suffixing, validation against the database pattern.
- `dates.ts` — date-range formatting, "Present" handling, `expected` education status.
- Visibility resolution — given `publication_state` + `visibility_mode`, what does a card link to and which icons render? (Table-driven across all combinations.)
- Zod schemas — every contact-form boundary (min/max lengths, invalid emails, invalid service type).
- `markdown.ts` — raw HTML is stripped; disallowed nodes are removed; links get `rel`.
- Query-key factory — key stability and correct invalidation groupings.
- Pipeline ordering, sort-order comparators, "next project" wrap-around logic.

### 41.2 Integration tests (Vitest against a local Supabase) — P1
Run against `supabase start` with a freshly reset database:
- Each service function returns the expected shape and respects filters and limits.
- Draft, archived and private projects are absent from every public service result.
- Contact insert succeeds; a sixth insert within an hour is rejected by the trigger.
- Resume service returns only the published version and produces a working signed URL.
- Admin CRUD round-trips: create → read → update → publish → unpublish → delete.
- Storage upload/delete cycles with MIME and size rejection paths.

### 41.3 Security tests (pgTAP / SQL) — P0
Executed as the `anon` role and as a non-admin authenticated role:
- `SELECT` on `contact_messages` returns zero rows and no error leak.
- `INSERT`/`UPDATE`/`DELETE` on every content table is rejected.
- Draft/archived/private rows are invisible.
- Non-allow-listed `site_settings` keys are invisible.
- Unpublished `resume_versions` rows are invisible; the private bucket rejects unauthorised object reads.
- `admin_users` is unreadable by anon and unwritable by anyone through the API.
- A user with a session but no `admin_users` row cannot perform any admin operation.
- `is_admin()` cannot be satisfied by editing `user_metadata`.

**These tests are release-blocking.** A failing security test stops a deploy.

### 41.4 End-to-end tests (Playwright) — P1
- Home renders all populated sections; hero CTAs navigate correctly.
- Navigation works on desktop and in the mobile sheet, including keyboard operation.
- `/projects` filters update the URL and the result set; clearing restores everything.
- A project card opens the correct case study; every populated block renders; "Next project" advances.
- Contact form: validation errors, successful submission, success state, error fallback.
- Admin: login → create project as draft → confirm it is absent publicly → publish → confirm it is present → edit → delete → logout → confirm `/admin` redirects.
- Unauthorised: visiting `/admin/projects` signed out redirects to login.

### 41.5 Accessibility tests — P1
axe-core automated scans on `/`, `/projects`, `/projects/:slug`, `/contact`, `/admin/login`; zero critical/serious violations. One manual keyboard-only pass and one screen-reader pass per release.

### 41.6 Responsive tests — P0
Visual verification at 1920, 1440, 1280, 1024, 768, 430, 390, 375 for Home, `/projects`, a case study, `/contact`, and two admin screens. Playwright viewport snapshots for the top three widths (P2).

### 41.7 Performance tests — P2
Lighthouse CI on `/` and a case study, mobile profile, on every pull request to `main`.

### 41.8 Manual pre-launch checklist
Content accuracy against the resume · no fabricated metrics anywhere · in-progress projects labelled correctly · no private company data · all external links resolve · resume downloads · OG previews verified by pasting the URL into LinkedIn and WhatsApp · 404 and 500 render · favicon and manifest present.

---

## 42. Deployment Architecture

```
Local development                Repository                 Hosting                  Backend
──────────────────               ──────────                 ───────                  ───────
VS Code + Vite dev        →      GitHub (main)        →     Vercel (production)  →   Supabase (prod project)
supabase start (Docker)          feature branches     →     Vercel (preview)     →   Supabase (staging, P2)
```

| ID | Requirement | Priority |
|---|---|---|
| DEP-01 | Frontend hosted on Vercel (or an equivalent static host with SPA rewrite support), connected to GitHub with automatic deploys from `main`. | P0 |
| DEP-02 | Every pull request produces a preview deployment pointed at the staging Supabase project (or production in read-only terms until staging exists). | P1 |
| DEP-03 | Build: `npm run build` (Vite → `dist/`), including the prerender step and sitemap generation. Output directory `dist`. | P0 |
| DEP-04 | SPA rewrite: all unmatched paths serve `index.html`, except prerendered routes which serve their own HTML. | P0 |
| DEP-05 | Environment variables set per environment in the host dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL`. No secrets in the repository. | P0 |
| DEP-06 | Production and local use **separate Supabase projects**. Local development never points at production. | P0 |
| DEP-07 | Database changes reach production only via `supabase db push` from a reviewed, merged migration. Dashboard schema edits are prohibited (MIG-06). | P0 |
| DEP-08 | Seed runs once on the production project at initial setup, then never again. Content changes thereafter are made through the admin CMS. | P0 |
| DEP-09 | Custom domain with automatic HTTPS; `www` → apex (or the reverse) redirect chosen and applied consistently; `VITE_SITE_URL` matches the canonical host. `[REQUIRES USER INPUT — domain]` | P1 |
| DEP-10 | Supabase Auth redirect URLs and CORS-relevant settings updated for the production domain before launch. | P0 |
| DEP-11 | The Supabase project's region is chosen closest to the primary audience (India/Singapore) to minimise round-trip latency. | P1 |
| DEP-12 | Rollback: revert the offending commit and redeploy. Database rollbacks require a new forward migration — never an ad-hoc dashboard fix. | P0 |
| DEP-13 | **Free-tier pausing:** Supabase pauses inactive free projects. For a portfolio with sporadic traffic this can mean the site loads with empty sections at the worst possible moment. Either run production on a paid plan or add a scheduled keep-alive request; the choice must be made before launch. | P0 |

**Deployment sequence (first production release):** create the production Supabase project → apply migrations → create the owner auth user → insert the `admin_users` row → run the content seed → configure storage buckets (via migration) → upload avatar and resume through admin → set Vercel env vars → connect the domain → verify OG previews → verify RLS with the anon key from a logged-out browser.

---

## 43. Development Workflow

### 43.1 Cycle
```
Read the PRD section for the feature
  → create a feature branch  (feat/projects-admin-crud)
  → implement (migration first if the schema changes)
  → supabase db reset locally and verify
  → run unit + integration + security tests
  → self-check against the feature's acceptance criteria
  → commit with a descriptive message
  → push, open a PR, review the preview deployment
  → merge to main → automatic deploy
  → apply migrations to production deliberately
```

### 43.2 Conventions
- **Branches:** `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`.
- **Commits:** Conventional Commits (`feat(projects): add visibility mode to project card`). One logical change per commit. No "wip", "fix stuff", or "update" messages.
- **Pull requests:** state what changed, which PRD requirement IDs it satisfies, how it was tested, and whether a migration is included.
- **Never** commit `.env` files, generated `dist/`, or the service-role key.
- **Never** edit `src/types/database.types.ts` by hand — regenerate it.

### 43.3 Development phases

| Phase | Scope | Exit criteria | Priority |
|---|---|---|---|
| 1. Project initialisation | Vite + React + TS scaffold, Tailwind + tokens, ESLint/Prettier, Git, GitHub repo, `.env.example`, README skeleton | `npm run dev` serves a styled empty shell; CI runs lint and typecheck | P0 |
| 2. Supabase configuration | `supabase init`, local stack, project linked, client + `lib/env.ts`, generated types wired | Local Supabase starts; a trivial typed query succeeds | P0 |
| 3. Database schema | Enums, all tables, constraints, indexes, functions, triggers as migrations | `supabase db reset` builds the full schema with no errors | P0 |
| 4. Migrations and seed | Seed files for settings, profile, technologies, skills, experience, education, social links, projects (drafts) | A reset database contains complete, real, approved content | P0 |
| 5. RLS | Enable RLS everywhere, `is_admin()`, all policies, revoked grants, storage policies | pgTAP security suite passes | P0 |
| 6. Frontend architecture | Router, providers, layouts, service/hook skeletons, error boundaries, query keys | Every route resolves with placeholder content; layering rules enforced by lint boundaries | P0 |
| 7. Design system | Tokens, typography, primitives, skeletons, empty/error states, toast | A component gallery route (dev-only) renders every primitive in every state | P0 |
| 8. Homepage | All eleven sections with real data, responsive, animated, accessible | Home passes responsive + axe checks and renders correctly with an empty database | P0 |
| 9. Project system | Index, filters, cards, case study, pipeline diagram, gallery, next project, dynamic SEO | All project acceptance criteria pass | P0 |
| 10. Experience / Skills / Education | Public pages and sections | Acceptance criteria pass; empty states verified | P0 |
| 11. Contact system | Form, validation, insert, spam controls, success/error states | Rate limit verified by test; message appears in the database | P0 |
| 12. Supabase Auth | Login, session, `<ProtectedRoute>`, admin membership check, logout | Signed-out access to `/admin/*` always redirects; RLS rejects writes independently | P0 |
| 13. Admin dashboard | All nine resources with CRUD, draft/publish, sort order, messages inbox | Every admin acceptance criterion passes | P0 |
| 14. Storage | Buckets, upload flow with client resize, alt text enforcement, media browser, resume versions | Uploads work; unauthorised upload rejected; resume signed URL works | P0 |
| 15. SEO | `<SEO>` on every page, OG tags, canonical, sitemap, robots, prerender step | Link preview verified on LinkedIn and WhatsApp for a project URL | P1 |
| 16. Testing | Complete unit/integration/security/e2e/a11y suites, Lighthouse pass | All suites green; Lighthouse ≥ 90 mobile | P1 |
| 17. Deployment | Production Supabase, Vercel, domain, HTTPS, env separation, keep-alive decision, launch checklist | Site live on the custom domain with correct previews and passing security tests | P0 |

### 43.4 Rules for developers and AI coding agents

These rules are binding for anyone — human or AI — modifying this repository.

1. **Read this PRD before modifying the project.** If a change is not covered here, ask; do not improvise.
2. **Do not invent requirements.** Unspecified behaviour is an open question, not a licence to design.
3. **Do not remove or alter existing functionality without approval.**
4. **Never modify the database schema by hand.** Every schema change is a migration, committed to Git.
5. **Never bypass or disable RLS**, and never "temporarily" use the service-role key to make something work.
6. **Never expose secrets.** No key, password or token in code, commits, screenshots or issues.
7. **Never create fake portfolio metrics.** No invented percentages, currency figures, hours saved, or client counts.
8. **Never publish private company information** — customer data, employer credentials, internal pricing, POS/aggregator account details, or screenshots containing them.
9. **Never present an unfinished project as completed.** In-progress means in-progress in every surface.
10. **Keep components reusable** and free of hard-coded content that belongs in the database.
11. **Keep database logic out of UI components.** Services query; hooks cache; components render.
12. **Validate all user input** on the client and constrain it in the database.
13. **Test changes before declaring them complete**, including a local `supabase db reset` when migrations are involved.
14. **Never claim something is implemented unless it has been verified running.** "Should work" is not a status.
15. **Keep Git commits logical and descriptive**, one concern per commit.

---

## 44. V1 Scope

**In scope (P0/P1):** public site (Home, About, Experience, Projects, Project case studies, Skills, Contact, Resume, 404/500) · full case-study rendering including structured pipelines · project filtering by category · database-driven experience, skills, education, social links, settings · contact form with spam protection and admin triage · Supabase Auth with a single owner account · admin CMS with CRUD, draft/publish and sort order for all nine resources · Supabase Storage for avatar, project media and resume with versioning · complete RLS · migrations and seed · design system, responsive layouts, accessibility, SEO with prerendering, performance targets, error and loading states · deployment to Vercel with a custom domain.

**Deferred to V1.1 if time-constrained (P2):** technology and status filters · drag-and-drop reordering · media orphan detection · analytics · Turnstile · email notification on new messages · Lighthouse CI · structured data.

**V1 is complete when:** every P0 acceptance criterion in Section 46 passes, the security test suite passes, the site is live on the production domain, and Moin has published at least two projects entirely through the admin dashboard without developer assistance.

---

## 45. V2 Roadmap

| Feature | Priority | Notes / prerequisites |
|---|---|---|
| Blog / writing section | P3 | Reuses the markdown pipeline and publication states. If publishing becomes frequent, revisit TD-02 (SSR vs prerender). |
| Testimonials | P3 | Requires real, attributable quotes with permission. No placeholder testimonials, ever. |
| Advanced filtering + search | P3 | Full-text search over projects using PostgreSQL `tsvector`. |
| Analytics dashboard | P3 | Builds on `analytics_events`; 30-day trends, top projects, referrers. |
| AI portfolio assistant | P3 | "Ask about my work" over published case studies. Requires an Edge Function, rate limiting, cost controls and strict grounding to published content only — it must never speculate about unpublished work. |
| Services / engagement page | P3 | Only once service offerings and terms are defined by Moin. |
| Newsletter | P3 | Requires consent handling and an email provider. |
| Case-study PDF export | P3 | One-click PDF of a case study for proposals. |
| Light theme | P3 | Tokens already structured for it. |
| Multi-language (English/Gujarati/Hindi) | P3 | Schema would need per-locale content rows; do not retrofit casually. |
| Deploy hook on publish | P2 | Refreshes prerendered HTML automatically after publishing. |

**Guard rule:** no V2 feature may add columns, tables or dependencies to V1 "in preparation". Build V1 clean.

---

## 46. Acceptance Criteria

### AC-PROJ — Project management (P0)
1. Admin can create a project with title, slug, summary, category and status.
2. Slug auto-generates from the title, remains editable, and is validated for uniqueness before save.
3. Admin can edit every field of an existing project and see the change reflected publicly within one cache cycle.
4. Admin can delete a project after an explicit confirmation naming the project; its images, pipeline steps and technology links are removed with it.
5. Admin can save a project as a draft; the draft is never returned by any public query, including a direct slug visit.
6. Admin can publish a draft; it then appears on `/projects` and Home (if featured) in the correct order.
7. Admin can archive a project; archived projects disappear from public views without being deleted.
8. Project detail pages resolve by slug; an unknown or unpublished slug renders 404 with no indication that a draft exists.
9. Images can be uploaded, reordered and deleted; alt text is required before publishing.
10. GitHub and live URLs are optional; when absent, their links do not render.
11. `visibility_mode` correctly changes what the card links to and which links are exposed, for all five modes.
12. An anonymous client cannot create, update or delete a project through the API, even with a crafted request.
13. Featured projects appear on Home, limited to three, in `sort_order`.
14. In-progress projects display an "In Progress" badge everywhere they appear.

### AC-AUTH — Authentication (P0)
1. A valid owner email/password signs in and lands on `/admin/dashboard`.
2. Invalid credentials show a single generic error and no field-level enumeration.
3. The session survives a page reload and a browser restart within the session lifetime.
4. Visiting `/admin/projects` while signed out redirects to `/admin/login?returnTo=/admin/projects`; signing in returns the user there.
5. Sign out clears the session and the query cache, and redirects to `/`.
6. A user authenticated without an `admin_users` row is treated as unauthorised in both the UI and the database.
7. There is no public sign-up path anywhere in the application or the Supabase project.
8. No admin UI flashes before the session check resolves.

### AC-CONT — Contact form (P0)
1. All required fields are validated before submission; errors are inline and screen-reader announced.
2. A valid submission creates exactly one row with `status = 'new'` and the correct `service_type`.
3. `?service=ai_automation` prefills the select; an invalid value falls back to `other`.
4. A successful submission shows the confirmation state and clears the form.
5. A failed submission preserves all input and offers a `mailto:` fallback.
6. Submitting six times within an hour from the same client is rejected with a helpful message.
7. A submission with the honeypot filled is rejected and is not stored.
8. An anonymous client cannot read, update or delete any contact message.
9. Admin can filter by status and mark messages read, replied or archived.

### AC-EXP — Experience (P0)
1. Admin can create, edit, delete, draft and publish experience records with responsibilities and achievements.
2. Responsibilities and achievements are separately labelled and individually reorderable.
3. `is_current = true` renders "Present" and prevents an end date being saved.
4. Records render newest first on `/experience` and on Home.
5. Unpublished records never appear publicly.

### AC-SKILL — Skills (P0)
1. Admin can create categories and skills, publish/unpublish, and reorder both.
2. Skills group under their category in the specified order.
3. No proficiency percentage appears anywhere in the UI or the schema.
4. A category with no published skills does not render.

### AC-EDU — Education (P1)
1. Admin can create, edit, delete, publish and reorder education records.
2. `status = 'expected'` renders as "Expected <year>".
3. A grade renders only when populated **and** `show_grade` is true.

### AC-RES — Resume (P0/P1)
1. Admin can upload a PDF up to 10 MB; other MIME types are rejected with a clear message.
2. Publishing a version automatically unpublishes the previous one; exactly one is published at any time.
3. A public visitor can download the published resume through a signed URL that expires.
4. An anonymous user cannot access an unpublished version by guessing a path.
5. When no version is published, all resume CTAs are hidden and `/resume` shows a neutral message.

### AC-STORE — Storage (P0)
1. An anonymous client cannot upload to any bucket.
2. Files exceeding the size limit or the MIME allow-list are rejected server-side, not just in the UI.
3. Deleting a project removes its storage folder before the row is deleted.
4. Public images load without authentication; the resume does not.

### AC-RLS — Row Level Security (P0)
1. RLS is enabled on every table in the `public` schema.
2. The anon role can read only published, non-private content.
3. The anon role can insert only contact messages, within the rate limit.
4. The anon role receives zero rows — not an error — when querying `contact_messages`.
5. A non-admin authenticated user has exactly the same permissions as anon.
6. Every admin write path is authorised by `is_admin()`.
7. The security test suite passes in CI.

### AC-SEO — SEO (P1)
1. Every route has a unique title and meta description.
2. A project URL pasted into LinkedIn and WhatsApp shows that project's title, description and image.
3. `sitemap.xml` lists exactly the published, non-private projects plus the static routes.
4. `robots.txt` disallows `/admin` and references the sitemap.
5. Canonical URLs are absolute and query-free.

### AC-RESP — Responsive (P0)
1. Home, `/projects`, a case study, `/contact` and two admin screens render correctly at all eight test widths with no horizontal scroll.
2. The mobile navigation sheet traps focus, closes on `Esc` and on backdrop click, and locks body scroll.
3. All touch targets are ≥44px with adequate separation.
4. Admin tables are usable on a 390px screen without horizontal scrolling.

### AC-A11Y — Accessibility (P1)
1. Zero critical or serious axe violations on the five key pages.
2. The entire public site is operable by keyboard alone, including the lightbox and the mobile nav.
3. Every image has appropriate alt text; every form control has a label.
4. With `prefers-reduced-motion: reduce`, no transform animation plays and all content is visible.

### AC-CONTENT — Content integrity (P0)
1. No numeric business metric appears anywhere that Moin has not supplied and approved.
2. No project is displayed as completed unless its status is `completed`.
3. No employer or client name appears for a project with `client_disclosed = false`.
4. No private company data appears in seed files, screenshots, or case-study copy.
5. Every `[REQUIRES USER INPUT]` marker is resolved before launch — none ships to production as visible text.

---

## 47. Risks

| ID | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R-01 | Link previews break because the SPA serves a generic shell | High — undermines sharing, the main distribution channel | High if unaddressed | Build-time prerender (TD-02); verify previews as a launch gate |
| R-02 | Employer-owned project details are published without permission | Severe — professional and possibly contractual consequences | Medium | `client_disclosed` flag, drafts by default, explicit sign-off gate (Q-06), SEC-13 |
| R-03 | Single admin account is lost (password/email access) | High — no way to edit content | Low | Password manager, recovery email verified, MFA, a documented SQL procedure to add a second `admin_users` row |
| R-04 | Contact form is abused by bots | Medium — inbox noise, storage waste | High | Honeypot + timing check + database rate limit; Turnstile ready as P2 |
| R-05 | Resume PII is scraped from a public URL | Medium | Medium | Private bucket + short-lived signed URLs; phone hidden by default |
| R-06 | Fabricated or exaggerated metrics reach production | Severe — destroys credibility with exactly the audience that matters | Medium (it is the easiest mistake to make) | Explicit prohibition (Principle 4, FR-HOME-05a, AC-CONTENT-1); reviewer checks every number against a source |
| R-07 | Supabase free tier pauses the project during inactivity | High — the site appears broken to a recruiter | Medium | DEP-13: paid plan or keep-alive; monitor uptime |
| R-08 | Scope creep from V2 features (chatbot, blog) delays V1 | Medium | High | Section 4 non-goals; the V2 guard rule; PR review rejects unscoped work |
| R-09 | Orphaned storage objects accumulate | Low | Medium | Delete-before-row flow; media browser orphan view (P2) |
| R-10 | Schema drift between the dashboard and migrations | High — production becomes unreproducible | Medium | MIG-06; `supabase db diff` check in CI |
| R-11 | The portfolio launches with only three projects, two of which cannot be disclosed | High — an empty portfolio is worse than no portfolio | Medium | Resolve Q-06/Q-07 early; if disclosure is blocked, write generalised case studies with the employer anonymised and permission confirmed |
| R-12 | Content is never updated after launch because writing case studies is hard | Medium | High | The admin form's field prompts double as writing prompts; drafts make partial work safe |
| R-13 | Over-designed animation harms performance and credibility | Medium | Medium | Motion budget in 32.5; one signature element only; Lighthouse gate |

---

## 48. Technical Decisions

| ID | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| TD-01 | Supabase is the entire backend; no separate API server | The brief's stack, matches CostCraft/FoodMetrics, and a single-owner content site has no logic that needs a custom server | A Node/Express API (extra deployment, extra auth surface, no benefit) |
| TD-02 | Vite SPA + build-time prerendering for SEO/OG | Keeps the specified stack while fixing the real link-preview defect | Next.js SSR (rewrites the project for a benefit prerendering already delivers at this scale); doing nothing (broken previews) |
| TD-03 | Tailwind CSS + CSS custom properties | Consistent scales, fast iteration, tokens inspectable in one file; matches the existing team stack | Plain CSS modules (slower, more drift); CSS-in-JS (runtime cost, hydration complexity) |
| TD-04 | Admin identity via an `admin_users` table + `is_admin()` `SECURITY DEFINER` helper | Inspectable, testable, not user-writable, avoids recursive RLS | `user_metadata` role (user-writable — a security hole); hard-coded email in the frontend (unauditable, bypassable) |
| TD-05 | Status, publication state and visibility mode as three separate columns | The seven requested behaviours are three orthogonal concerns; one column would be unrepresentable and would explode | A single `status` enum |
| TD-06 | Markdown for case-study body content | Portable, diff-able, no editor lock-in, safe when raw HTML is disabled | A rich-text/block editor (heavy, schema-coupled, sanitisation burden) |
| TD-07 | Video by external URL, not Supabase Storage | Egress and bandwidth economics; free adaptive streaming and thumbnails | Storing MP4s in a bucket |
| TD-08 | Private resume bucket with per-object anon read + signed URLs | The resume contains personal contact data; a permanent public URL is crawlable forever | Public bucket (simpler, leakier); Edge Function proxy (more moving parts for the same result) — kept as a fallback |
| TD-09 | Client-side image resize to WebP before upload | Keeps storage and egress low without depending on paid image transformations | Supabase image transformations (plan-dependent); uploading originals (slow pages) |
| TD-10 | Structured `project_pipeline_steps` instead of prose workflows | Makes pipelines renderable, reorderable and consistent — central to how this portfolio proves competence | Storing the pipeline as markdown text |
| TD-11 | Rate limiting in a database trigger, not only in the client | The API endpoint is publicly reachable with the publishable key; client-side limits are decorative | Client-side throttle only |
| TD-12 | Static content constants for "What I Build" and "Impact" in V1 | These are positioning statements that change rarely; putting them in the database adds admin surface for no benefit | Full CMS-ing every word of the homepage |
| TD-13 | No global state manager | Server state is handled by React Query; there is no cross-page UI state to justify Redux/Zustand | Redux/Zustand |
| TD-14 | English only in V1 | Audience is English-reading recruiters, clients and engineers; i18n would double the content surface | Multi-language from the start |

---

## 49. Open Questions — Information Required From Moin

Ordered by how much they block. Items marked **BLOCKING** prevent a phase from completing.

| ID | Question | Blocks | Priority |
|---|---|---|---|
| Q-01 | **The resume PDF itself was not attached to this brief.** Please supply the actual file so every seeded fact can be verified line by line. | Phase 4 (seed) — **BLOCKING** | P0 |
| Q-02 | LinkedIn profile URL. | Seed, hero, footer | P0 |
| Q-03 | GitHub profile URL (and whether the project repositories are public). | Seed, hero, project links | P0 |
| Q-04 | Final profile photo — high resolution, square or 4:5, plain background preferred. Plus the alt text you want (usually just your name). | Hero — **BLOCKING** for Phase 8 | P0 |
| Q-05 | Should React, TypeScript, Supabase/PostgreSQL, Google Apps Script and Gemini API appear in the Skills section? They are implied by your projects but are not in the skills list you supplied, and this PRD will not add them unsupported. | Seed | P0 |
| Q-06 | **Can the Capiche AI Feedback Automation project be published, and may the client/brand be named?** If not, may it be published anonymised ("a multi-outlet restaurant group")? Written permission from the employer is strongly advised. | Phase 9 — **BLOCKING** for that project | P0 |
| Q-07 | Same question for the Recipe Costing & Restaurant Operations System, and for the Exam Build Platform (including who it is for). | Phase 9 — **BLOCKING** | P0 |
| Q-08 | Confirm the company's exact legal name. The brief says "Bookends Private Limited"; other material for the same group uses "Bookends Hospitality Pvt. Ltd." Which appears on your resume? | Seed, experience | P0 |
| Q-09 | Confirm the April 2026 start date and whether all three titles (Automation Executive, Head of Reservations, External Platform Coordinator) are current and concurrent. | Seed | P0 |
| Q-10 | Should the phone number +91 8530537786 be displayed publicly? Default in this PRD is hidden. | Contact page | P1 |
| Q-11 | Domain name for the site (e.g. `moinpatel.dev`, `moinpatel.in`). Needed for canonical URLs, sitemap, OG and auth redirect settings. | Phase 15/17 — **BLOCKING** for launch | P0 |
| Q-12 | The About copy — a 60–80 word short bio and a 200–300 word long bio, in your own words. This document will not write your biography for you. | Phase 8 | P0 |
| Q-13 | Screenshots for each publishable project, with any customer data, pricing, employer branding or credentials removed or blurred. | Phase 9 | P1 |
| Q-14 | Live demo URLs for any project that has one, and whether demo credentials should be provided publicly. | Phase 9 | P1 |
| Q-15 | Are there measured outcomes for any project (hours saved, error reduction, processing time)? If yes, supply the figure and how it was measured. If no, all impact statements remain qualitative — which is the default. | Case-study copy | P0 |
| Q-16 | Exam Build Platform: what is genuinely built today versus planned? The case study must reflect the real state. | Phase 9 | P0 |
| Q-17 | Which additional projects (Chucky PDF menu editor, Petpooja/menu automation, other systems) should be added, and at what visibility level? | Post-launch content | P1 |
| Q-18 | Class X and XII percentages — publish or keep as unpublished records? | Seed | P1 |
| Q-19 | Expected response time to state on the contact page ("within 24 hours", "within 2 working days"). | Contact page | P1 |
| Q-20 | Should the site show an "Available for work" pill, and with what wording? | Hero | P1 |
| Q-21 | Admin email address for the Supabase Auth owner account. Should it be your personal Gmail or a domain address once the domain exists? | Phase 12 | P1 |
| Q-22 | Do you want email notifications when someone submits the contact form (P2), or will you check the admin inbox? | Phase 11/13 | P2 |
| Q-23 | Analytics: build the minimal in-database version, use a privacy-first hosted tool, or skip for V1? | Phase 16 | P2 |
| Q-24 | Production hosting budget — this decides DEP-13 (paid Supabase plan versus keep-alive workaround). | Phase 17 | P1 |
| Q-25 | Preferred display typeface direction — confirm the display/body/mono trio in 32.2 or nominate alternatives. | Phase 7 | P2 |

---

## 50. Development Checklist

### Phase gates
- [ ] **P1** Vite + React + TS + Tailwind scaffold, ESLint/Prettier, Git, GitHub, `.env.example`, README skeleton, CI lint + typecheck
- [ ] **P2** `supabase init`, local stack running, project linked, typed client, `lib/env.ts` validation
- [ ] **P3** All enums, tables, constraints, indexes, functions and triggers created via migrations; `supabase db reset` clean
- [ ] **P4** Seed files for settings, profile, technologies, skills, experience, education, social links, projects (drafts); reset produces real content
- [ ] **P5** RLS enabled everywhere, `is_admin()`, all policies, grants revoked, storage policies; pgTAP suite green
- [ ] **P6** Router, providers, layouts, services, hooks, query keys, error boundaries; layering rules enforced
- [ ] **P7** Tokens, typography, primitives, skeletons, empty/error states, toast; dev-only component gallery
- [ ] **P8** All eleven homepage sections with real data, responsive, animated, accessible, empty-state safe
- [ ] **P9** Project index, filters, cards, case study, pipeline diagram, gallery, lightbox, next project, dynamic SEO
- [ ] **P10** Experience, Skills, Education pages and sections
- [ ] **P11** Contact form with validation, insert, honeypot, timing check, rate limit, success/error states
- [ ] **P12** Supabase Auth, login page, `<ProtectedRoute>`, admin membership check, logout, redirects
- [ ] **P13** Admin CRUD for all nine resources with draft/publish, sort order, confirmations, unsaved-changes guard
- [ ] **P14** Storage buckets, upload with client-side resize, alt-text enforcement, media browser, resume versions
- [ ] **P15** `<SEO>` everywhere, OG tags, canonical, sitemap, robots, prerender step
- [ ] **P16** Unit, integration, security, e2e, a11y and responsive tests passing; Lighthouse ≥ 90 mobile
- [ ] **P17** Production Supabase, migrations applied, owner + `admin_users` row created, seed run once, Vercel env vars, domain, HTTPS, keep-alive decision

### Content gates (all P0, verified by Moin personally)
- [ ] Resume PDF supplied and every seeded fact verified against it
- [ ] Every `[REQUIRES USER INPUT]` marker resolved
- [ ] Disclosure permission confirmed for every published project
- [ ] Zero fabricated metrics anywhere on the site
- [ ] Exam Build Platform shown as In Progress in every surface
- [ ] No employer credentials, customer data or internal pricing anywhere
- [ ] All external links open correctly; resume downloads on desktop and mobile
- [ ] OG previews verified by pasting a project URL into LinkedIn and WhatsApp

### Security gates (all P0, release-blocking)
- [ ] Service-role key absent from the repository, the bundle and the host's client variables
- [ ] RLS enabled on every `public` table; security suite green
- [ ] Anonymous client cannot read `contact_messages` or write any content table
- [ ] Draft, archived and private content invisible to anonymous requests, including by direct slug
- [ ] Storage: no anonymous upload; resume unreachable except through a signed URL for the published version
- [ ] Supabase sign-ups disabled; auth redirect URLs restricted; MFA enabled on the Supabase account
- [ ] Security headers configured; HTTPS enforced

---

## Appendix A — Requirement index by priority

**P0 (V1 critical):** FR-NAV-01…08 · FR-HOME-01…11 (all sections) · FR-PROJ-01, 02, 03, 08, 10, 11, 16 · FR-CASE-01, 02, 04, 08 · FR-EXP-01…05 · FR-SKILL-01, 03, 05 · FR-EDU-05 · FR-CONT-01, 03…08, 10 · FR-RES-01, 02, 03, 05, 06 · FR-ADM-01…06, 11 · FR-AUTH-01…07, 09 · MED-01, 02, 03, 06, 07 · MIG-01, 02, 03, 06, 07, 08, 09 · all RLS policies · SEC-01…07, 09…13 · A11Y-01…11, 13, 15 · RES-01, 02, 06, 07, 12 · ERR-01 · LOAD-01 · PERF-03, 06, 07 · SEO-01, 02, 07, 09 · DEP-01, 03…08, 10, 12, 13.

**P1 (V1 important):** FR-PROJ-04, 07 · FR-CASE-03, 05, 06, 07, 09, 10 · FR-EXP-06, 07 · FR-SKILL-06 · FR-EDU-01…04 · FR-CONT-02 · FR-RES-04 · FR-ADM-08, 09, 10 · FR-AUTH-08 · MED-04, 05 · SEO-03…06 · PERF-01, 02, 04, 05, 08…12 · A11Y-12, 14, 16, 17 · RES-03…05, 08…11 · SEC-08, 14…17 · DEP-02, 09, 11.

**P2 (nice to have):** FR-PROJ-05, 06, 09 · FR-CONT-09, 11 · FR-ADM-07 (drag-and-drop) · MED-08 · SEO-08 · PERF-13 · ANA-01, 02, 04 · MIG-05 · staging environment · deploy hook on publish.

**P3 (future):** everything in Section 45.

---

## Appendix B — Document maintenance

This PRD is versioned in the repository at `docs/PRD.md`. Any approved change to scope, schema or behaviour is made **here first**, in a pull request, with the version incremented and a changelog entry added. Code that contradicts this document is a defect in one of the two — and the disagreement must be resolved explicitly, never silently.

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 14 Aug 2026 | Pratham Gosai | Initial complete PRD |
