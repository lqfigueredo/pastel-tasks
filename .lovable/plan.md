

## SimpleTask Manager — Implementation Plan

### Design System
- **Palette**: Mint & Cream pastels — mint green (#E0F2F1, #B2DFDB), cream yellow (#FFF9C4), light sage (#DCEDC8), with neutral grays for text
- **Style**: Clean, minimal, rounded cards, subtle shadows, no visual clutter
- **Navigation**: Sidebar with "Minhas Tarefas", "Equipe", "Configurações"

### Backend (Supabase / Lovable Cloud)
- **Auth**: Email/password login & signup
- **Database tables**:
  - `profiles` — user info, linked to auth.users
  - `user_roles` — admin/user roles (enum-based, secure)
  - `teams` — team entity (max 5 members)
  - `team_members` — join table user↔team
  - `task_statuses` — customizable statuses (default: Backlog, Em Desenvolvimento, Concluída)
  - `tasks` — title, description, start_date, end_date, estimated_delivery_date, status_id, team_id, created_by
  - `task_assignees` — multiple assignees per task
  - `task_comments` — comment text, user_id, timestamp, type (normal/justification)
  - `task_attachments` — file references (PDFs/images in Supabase Storage)
  - `delivery_date_logs` — old_date, new_date, justification_comment_id, changed_by, timestamp
- **Storage bucket**: `task-attachments` (public read for team members)
- **RLS**: Users see only their team's tasks; admins manage users

### Pages & Features

1. **Login/Signup** — Simple email/password form, pastel themed
2. **Dashboard (Kanban)** — Three default columns (Backlog, Em Desenvolvimento, Concluída) + custom statuses. Drag-and-drop task cards between columns. Each card shows title, assignees (avatars), delivery date
3. **Task Detail (slide-over/modal)** — Full description, dates, assignees selector, attachments upload (PDF/images), comment feed with user+timestamp. **Key rule**: changing estimated delivery date triggers mandatory justification modal
4. **Team View** — See team members, their tasks, filter by person
5. **Settings/Admin** — Admin: manage users (add/remove from team), manage custom statuses. All users: profile settings
6. **Sidebar Navigation** — Collapsible, with icons for Minhas Tarefas, Equipe, Configurações

### Key Business Rules
- Delivery date change → mandatory justification comment (logged separately)
- Comment history auto-records user + datetime
- Custom status creation (simple text + color)
- Team limited to 5 members

