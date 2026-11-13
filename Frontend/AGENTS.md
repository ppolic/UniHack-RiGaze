# Frontend Agent Guidelines - EcoMutare

This is an Expo/React Native mobile and web application for **EcoMutare**, built for Timișoara during UniHack (The Bloom / Green Mobility track).
Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## UI/UX Design Skill (Mandatory for all UI tasks)
Whenever working on any frontend screen, component, styling, layout, or user interaction:
👉 **Activate and strictly adhere to `.agents/skills/user-interface-unihack/SKILL.md`**.

### Core UI/UX Directives:
1. **Map-first experience:** Keep map navigation front and center.
2. **Clear comparison:** Display duration, price, CO2 savings, and Eco-points prominently.
3. **Accessibility & Safety:** Support low-floor transit, wheelchair filtering, helmet notices (<16 yrs), and age restrictions (<14 yrs).
4. **Resilient Offline/Demo Mode:** Maintain built-in mock fallback for Timișoara routes so the app never fails during live presentations.
5. **Design System:** Use tokens from `@/theme/` (colors, spacing, typography) and common reusable components in `@/components/common/`.

---

## Expo Development Rules

- Expo ships breaking changes every SDK release. This project uses Expo SDK 58.
- Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Run typecheck (`npx tsc --noEmit`) before declaring any task done.
