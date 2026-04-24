# Agent Room Verification Checklist

## Commands

```bash
npm run lint
npm run build
npm run dev
```

## Routes

- `/dashboard`
- `/rooms`
- `/rooms/fofit`
- `/rooms/fofit/agents`
- `/rooms/fofit/tasks`
- `/rooms/fofit/activity`
- `/rooms/fofit/workflows`
- `/rooms/fofit/approvals`
- `/integrations`
- `/agents`
- `/settings`

## Browser QA

- No blank pages.
- No Next.js error overlay.
- No obvious console errors.
- Sidebar/topbar remain usable.
- Approval buttons update local state.
- Mobile sidebar opens as a drawer.
- Task board scrolls horizontally on small screens.
- Text remains readable and contained.
