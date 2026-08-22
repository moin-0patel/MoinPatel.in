import { readFileSync, writeFileSync } from 'node:fs'
const p = 'src/styles/globals.css'
let s = readFileSync(p, 'utf8')

const oldMobile = `  background: linear-gradient(
    to bottom,
    oklch(from var(--color-base) l c h / 0) 0%,
    oklch(from var(--color-base) l c h / 0.55) 14%,
    oklch(from var(--color-base) l c h / 0.94) 30%,
    oklch(from var(--color-base) l c h / 0.94) 80%,
    oklch(from var(--color-base) l c h / 0.6) 92%,
    oklch(from var(--color-base) l c h / 0) 100%
  );`

const newMobile = `  background: linear-gradient(
    to bottom,
    oklch(from var(--color-base) l c h / 0) 0%,
    oklch(from var(--color-base) l c h / 0.35) 16%,
    oklch(from var(--color-base) l c h / 0.9) 32%,
    oklch(from var(--color-base) l c h / 0.9) 74%,
    oklch(from var(--color-base) l c h / 0.4) 88%,
    oklch(from var(--color-base) l c h / 0) 100%
  );`

const oldDesktop = `    background: linear-gradient(
      to right,
      oklch(from var(--color-base) l c h / 0.95) 0%,
      oklch(from var(--color-base) l c h / 0.93) 38%,
      oklch(from var(--color-base) l c h / 0.72) 52%,
      oklch(from var(--color-base) l c h / 0.4) 64%,
      oklch(from var(--color-base) l c h / 0.12) 74%,
      oklch(from var(--color-base) l c h / 0) 82%
    );`

const newDesktop = `    background: linear-gradient(
      to right,
      oklch(from var(--color-base) l c h / 0.95) 0%,
      oklch(from var(--color-base) l c h / 0.92) 40%,
      oklch(from var(--color-base) l c h / 0.74) 50%,
      oklch(from var(--color-base) l c h / 0.38) 57%,
      oklch(from var(--color-base) l c h / 0.12) 64%,
      oklch(from var(--color-base) l c h / 0) 70%
    );`

for (const [a, b] of [[oldMobile, newMobile], [oldDesktop, newDesktop]]) {
  if (!s.includes(a)) throw new Error('stop list not found')
  s = s.replace(a, b)
}
writeFileSync(p, s, 'utf8')
console.log('retuned scrim stops')
