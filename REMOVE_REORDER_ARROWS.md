GuruCorp — Remove Reorder Arrow Buttons

This patch removes the Up/Down arrow buttons from:
1. Work Experience > Achievements
2. Skills & Expertise > Skill categories

Drag-and-drop via grip handles remains enabled for both.
Bold, delete, add bullet, add skill keyword and delete category are unchanged.
No backend or Word template modifications required.

Install:
Extract this ZIP at your GuruCorp project root and overwrite:
  frontend/app/page.tsx
  frontend/app/globals.css
Restart the frontend using npm run dev (or start-gurucorp.bat).
