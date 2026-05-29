<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Dev servers: ONE vertical at a time

Never run more than one vertical's dev server at once. Each `dev` script reserves a 6 GB Node heap (`--max-old-space-size=6144`) on top of turbopack workers, the React Compiler, and the Supabase Docker container. Launching several in parallel (e.g. via `turbo run dev` across apps) saturates RAM and freezes the machine.

Use the interactive launcher — it kills any running dev server before starting the chosen one, so the single-vertical rule is enforced automatically:

```bash
npm run dev              # menu: pick a vertical
npm run dev animeklash   # launch one directly by name
```

It wraps `scripts/dev.ts`. The per-app scripts still exist (`dev:musiklash` → :3000, `dev:animeklash` → :3001, `dev:demoklash` → :3002, `dev:movieklash` → :3003) but DON'T chain them — they don't kill siblings.

All verticals share the same code via the `klash-*` packages, so validating on one applies to the others — there's almost never a reason to run them simultaneously. If dev processes linger after a crash: `pkill -9 -f next-server`.
