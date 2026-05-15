# JetKöy

Arnavutköy bölgesinde çalışan şoförler için özel iş paslaşma ve dayanışma uygulaması.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/mobile run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required env: `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with Expo Router
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcrypt password hashing
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for all API endpoints)
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, jobs, commissions)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, jobs, wallet, admin)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware + requireAdmin
- `artifacts/mobile/app/` — Expo Router screens
- `artifacts/mobile/contexts/AuthContext.tsx` — Auth state + AsyncStorage persistence
- `artifacts/mobile/constants/colors.ts` — Dark theme design tokens

## Architecture decisions

- JWT bearer tokens stored in AsyncStorage for persistent sessions (no re-login)
- VIP users see jobs immediately; non-VIP users have a 10-second delay (filtered client-side by createdAt)
- 10 TL credit deducted automatically when grabbing a job; blocked if balance < 10
- Passenger phone is masked (***) until a job is successfully grabbed
- Commission records created automatically when a job is grabbed
- Admin panel only visible in tab bar when `user.isAdmin === true`

## Product

- **Kayıt/Giriş**: Ad-soyad, telefon, plaka, şifre ile kayıt. JWT token ile kalıcı oturum.
- **İş Havuzu**: Şoförler iş paylaşır, listedeki işleri "İŞİ KAP" butonuyla kapar.
- **Gizlilik**: İş kapatılana kadar yolcu telefonu *** ile gizlenir. Kaptıktan sonra "Tıkla Ara" ve "Navigasyona Git" butonları açılır.
- **Kredi Sistemi**: 1 Kredi = 1 TL. İş kaptıkça 10 TL düşer. Yetersiz bakiyede işlem engellenir.
- **Cüzdan**: Alacak komisyonlar ve borçlu komisyonlar ayrı tablolarda gösterilir.
- **VIP**: VIP şoförler işleri anında görür, diğerleri 10 saniye gecikmeli görür.
- **Admin Paneli**: Tüm kullanıcıları listele, kredi ekle, VIP yap/kaldır.

## User preferences

- Karanlık tema (dark mode only)
- Türkçe UI metinleri
- Emoji kullanılmaz

## Gotchas

- `Appearance.setColorScheme` only works on native; on web, wrapped in `typeof` check
- `pnpm approve-builds` needed for `bcrypt` native binaries after fresh install
- VIP delay logic is server-side filtered (createdAt + 10s check in GET /jobs)
- Admin user must be set manually in DB: `UPDATE users SET is_admin = true WHERE phone = '...'`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
