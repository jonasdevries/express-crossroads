# express-crossroads

Een minimalistische maar moderne **Express + TypeScript** boilerplate, geïnspireerd door [deze blogpost](https://medium.com/@gabrieldrouin/node-js-2025-guide-how-to-setup-express-js-with-typescript-eslint-and-prettier-b342cd21c30d).  
Focus: snelle DX (developer experience), strikte typechecks, consistente code-stijl (ESLint + Prettier) en duidelijke projectstructuur.

---

## ✨ Features

- **Express.js** met gescheiden `app` en `server` bootstrap
- **TypeScript** (strikte instellingen + `tsc --noEmit` typecheck)
- **ESLint** (TypeScript rules) + **Prettier** voor consistente formatting
- Hot-reload tijdens development met **tsx** (snelle TS runner)
- Klaar voor productie build naar `dist/`
- Basis **/health** endpoint en foutafhandeling middleware
- ESM-vriendelijk (Node 20+ / 22 LTS)

---

## ✅ Vereisten

- **Node.js 20+** (aanrader: **22 LTS**)
- **npm** (of pnpm/yarn, pas de scripts naar wens aan)

---

## 🚀 Snel starten

```bash
# 1) Dependencies
npm install

# 2) Kopieer env vars
cp .env.example .env

# 3) Development (hot reload)
npm run dev

# 4) Typecheck + build
npm run typecheck
npm run build

# 5) Start productie build
npm start
```

Standaard draait de server op `http://localhost:3000` (pas `PORT` aan via `.env`).

---

## 📁 Projectstructuur

```txt
.
├─ src/
│  ├─ app.ts               # Express app (routes, middleware)
│  ├─ server.ts            # Bootstrapping (luisteren op poort)
│  ├─ routes/
│  │  └─ index.ts          # /api routes (voorbeeld)
│  ├─ middlewares/
│  │  ├─ error.ts          # Error handler
│  │  └─ notFound.ts       # 404 handler
│  └─ config/
│     └─ env.ts            # Env loading/validatie
├─ .eslint.config.js       # ESLint config
├─ .prettierrc             # Prettier config
├─ tsconfig.json           # TypeScript config
├─ .env.example            # Voorbeeld env vars
├─ package.json
└─ README.md
```

> Tip: wil je path-aliassen? Voeg in `tsconfig.json` toe:
>
> ```json
> "compilerOptions": {
>   "baseUrl": ".",
>   "paths": { "@/*": ["src/*"] }
> }
> ```

---

## 🔧 NPM scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --check .",
    "format:write": "prettier --write .",
    "test": "vitest"
  }
}
```

> Gebruik je geen Vitest? Verwijder of pas het `test` script aan.

---

## 🔐 Configuratie (.env)

`./.env.example`:

```dotenv
# Server
PORT=3000
NODE_ENV=development

# Logging (optioneel)
LOG_LEVEL=info
```

Kopieer naar `.env` en pas waarden aan.

---

## 🧭 API voorbeeld

**Health check**

```bash
curl http://localhost:3000/health
# -> {"status":"ok","uptime":123.45}
```

**Basis route (voorbeeld)**

```bash
curl http://localhost:3000/api
# -> {"message":"express-crossroads api"}
```

---

## 🧹 Codekwaliteit

- **ESLint** controleert code-smells en TS-regels.
- **Prettier** formatteert consequent.
- **TypeScript** strict mode houdt types strak.

Aanrader: pre-commit hooks met Husky + lint-staged:

```bash
npm i -D husky lint-staged
npx husky init
```

`.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run typecheck
npm run format:write
```

---

## 🧪 Testing (optioneel)

Met **Vitest**:

```bash
npm run test
```

Voorbeeld `sum.spec.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sum } from "@/utils/sum";

describe("sum", () => {
  it("adds two numbers", () => {
    expect(sum(1, 2)).toBe(3);
  });
});
```

---

## 🚢 Deploy

Minimalistische aanpak (bijv. op een VM/Container):

```bash
npm ci
npm run build
NODE_ENV=production PORT=3000 node dist/server.js
```

- Zorg dat je process manager gebruikt (pm2/systemd) en logs bewaakt.
- Stel een reverse proxy in (Nginx/Caddy) voor TLS en gzip.

---

## 📚 Bronnen

- Inspiratie: blog “Node.js 2025 guide: setup Express.js with TypeScript, ESLint & Prettier”
- Express: https://expressjs.com/
- TypeScript: https://www.typescriptlang.org/
- ESLint: https://eslint.org/
- Prettier: https://prettier.io/
- tsx runner: https://github.com/privatenumber/tsx

---

## 📝 Licentie

MIT — gebruik, kopieer en pas aan voor je eigen projecten.
