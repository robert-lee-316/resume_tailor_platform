# GuruCorp Resume Builder — component architecture

This is a **structural refactor** of the uploaded `GuruCorp_Editor_Justify_Layout_Fix_Patch(1).zip`. It preserves the same inputs, actions, HTML class names, CSS, Word template workflow, endpoints and local-storage keys. It does not change resume formatting defaults or the FastAPI engine.

## Responsibility map

```text
frontend/
├── app/
│   ├── page.tsx                      # App entrypoint/provider only
│   ├── globals.css                   # Original stylesheet, unchanged
│   └── achievement-rich-input.tsx    # Existing rich-text achievement editor
├── components/
│   ├── ResumeStudio.tsx              # Layout composition, file inputs, mobile switch
│   ├── layout/
│   │   ├── Sidebar.tsx               # Left navigation
│   │   └── TopBar.tsx                # Brand, save indicator, download actions
│   ├── editor/
│   │   └── ResumeEditor.tsx          # Content navigation and section routing
│   ├── sections/
│   │   ├── PersonalSection.tsx       # Identity and previous-resume upload
│   │   ├── SummarySection.tsx        # Summary, bold, undo/redo
│   │   ├── ExperienceSection.tsx     # Jobs, dates, rich bullets and reordering
│   │   ├── EducationSection.tsx      # School, location and dates
│   │   ├── SkillsSection.tsx         # Categories, keyword tags and drag/drop
│   │   ├── StylesSection.tsx         # Resume typography and shared headings
│   │   ├── TemplateSection.tsx       # Template library, upload and validation
│   │   └── ExportSection.tsx         # PDF/DOCX and backup/autosave
│   ├── preview/
│   │   ├── DocumentPreview.tsx       # Preview toolbar, PDF iframe, rendering status
│   │   └── InstantResumePreview.tsx  # Instant HTML approximation
│   ├── dialogs/
│   │   └── ResumeImportDialog.tsx    # Review imported resume data
│   ├── feedback/
│   │   └── Toast.tsx                 # Notifications
│   └── common/
│       ├── Field.tsx
│       ├── TextArea.tsx
│       ├── BoldPreview.tsx
│       ├── SectionIntro.tsx
│       ├── FieldTag.tsx
│       └── SkillKeywordEditor.tsx
├── context/
│   └── ResumeBuilderContext.tsx      # Typed provider + useResumeBuilder() hook
├── hooks/
│   └── useResumeBuilderController.ts # Existing state, effects, API calls, autosave
└── lib/                              # Existing models, formats, persistence
```

## How to edit a feature

- **Skills chips/UI**: edit `components/sections/SkillsSection.tsx` and `components/common/SkillKeywordEditor.tsx`.
- **Summary bold/editing UI**: edit `components/sections/SummarySection.tsx`.
- **Experience bullets**: edit `components/sections/ExperienceSection.tsx` and existing `app/achievement-rich-input.tsx`.
- **Instant vs Exact PDF display**: edit `components/preview/DocumentPreview.tsx` / `InstantResumePreview.tsx`.
- **Style settings**: edit `components/sections/StylesSection.tsx`; data structures are in `lib/styles.ts`.
- **API requests, autosave, state actions**: edit `hooks/useResumeBuilderController.ts`; keep DOM markup out of the controller.
- **Backend DOCX/PDF rendering**: `backend/app/engine.py` (not changed by this refactor).

The controller intentionally remains the single state coordinator during this **behavior-preserving** refactor. Components access its typed actions using `useResumeBuilder()` rather than accepting enormous prop lists. A future, separate change can split the controller into domain-specific hooks once integration tests run reliably.

## Installation

For an existing project that matches the uploaded patch, extract the **refactor patch** into the project root, allowing `frontend/app/page.tsx` to be replaced and the new `frontend/components`, `frontend/context`, and `frontend/hooks` folders to be created. The original `globals.css` is included unchanged for reference/compatibility.

Restart the frontend, then test personal details, summary bold/undo, experience drag/drop, category tags/reordering, template switching, instant/exact PDF, Word/PDF export, and autosave.

```bash
cd frontend
npm install
npm run typecheck
npm run dev
```

**Validation status**: New TS/TSX files have been syntax-parsed and local imports resolved. The existing style/template-library Node checks passed. This container could not fetch npm dependencies, so a full Next.js build is **not** claimed.
