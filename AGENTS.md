# Next.js 16 Coding Guidelines

## Important Notes
- Next.js 16 uses `proxy.ts` (not `middleware.ts`) for route protection
- Export a function named `proxy` (not `middleware`)
- Proxy runs on Node.js runtime (not Edge)
- Tailwind CSS v4 uses PostCSS plugin, no tailwind.config file needed
- Use `@/*` path alias for `src/*`

## File Conventions
- Pages go in `src/app/` following the App Router convention
- API routes go in `src/app/api/`
- Components go in `src/components/`
- Utilities go in `src/lib/`
- Types go in `src/types/`
- Custom hooks go in `src/hooks/`
