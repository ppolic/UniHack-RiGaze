---
name: ecomutare-design-system
description: Apply the official EcoMutare design system when creating or updating Expo and React Native mobile or web screens, components, and theme tokens.
---

# EcoMutare design system

EcoMutare supports sustainable urban mobility in Timisoara. Communicate ecology, vitality, trust and clarity. Keep maps central to route planning; preserve the established architecture and layouts.

## Official palette

| Color | Value | Semantic role |
|---|---|---|
| Primary Green | #237A50 | Primary actions, active states, success: `primary`, `success` |
| Forest Green | #164D3B | Headings, primary text, dark surfaces: `textPrimary`, `primaryDark`, `surfaceDark` |
| Vital Lime | #D3EF6A | Points, rewards, achievements: `accent`, `rewardBackground` |
| Fresh Petrol | #287C86 | Transit and route information: `secondary`, `info` |
| Natural White | #F7F9F3 | Main background: `background` |
| Soft Mint | #E8F3EB | Secondary surfaces and subtle selection: `surfaceMuted`, `primaryLight` |
| Surface White | #FFFFFF | Cards and inputs: `surface`; inverse text: `textInverse` |
| Warning | #925410 | Safety notices and cautions: `warning` |
| Error | #AE353D | Validation and destructive actions: `danger` |

Use predominantly light surfaces, green for hierarchy/actions, and restrained lime highlights for rewards. White is the card surface; mint groups or highlights content. Use reward badges for points and warning badges for actual cautions. Supporting neutrals and status tints belong in the shared theme.

## Accessibility and contrast

- Meet WCAG AA: 4.5:1 for normal text; 3:1 for large text (18pt regular or 14pt bold). Captions, placeholders and badge labels require normal-text contrast.
- Meaningful control boundaries, essential graphics and focus indicators require 3:1 against adjacent colors. Decorative separators may use `border`; inputs and outlined buttons use `controlBorder`.
- Use white text on Primary Green, Forest Green, Petrol and Error fills. Use Forest Green text on light surfaces and Vital Lime backgrounds.
- Never use Vital Lime as small text on white or mint. Lime text on Forest Green can highlight point totals after contrast verification.
- Use `textSecondary` and `textMuted` for supporting text and placeholders without reducing opacity. Use `textInverse` or `textOnDark` on dark surfaces.
- Verify actual pairs: Petrol text on Soft Mint fails 4.5:1; use `infoLight` or Forest Green text instead. Prefer opaque fills behind critical text. Check compositing and pressed opacity separately.
- Never convey success, warning, error or selection through color alone. Preserve meaningful labels, icons, textual errors and structural selection indicators.
- Preserve visible keyboard focus, screen-reader labels, reduced-motion support and usable touch targets. Check native and web controls; platform defaults vary. Disabled controls have contrast exemptions, but unselected content is not disabled.

## Shared components and tokens

Use `Frontend/src/theme/colors.ts` or `@/theme/colors`. Use shared `spacing`, `borderRadius`, `shadows` and `typography`. Never hardcode brand colors in screens/components or introduce competing palettes. Add semantic tokens centrally when necessary and preserve existing exported names.

`src/constants/theme.ts` bridges Expo starter consumers to shared light/dark tokens; retain its exports. Main screens use the light palette directly, so do not claim automatic dark-mode support for them.

- Buttons: Primary Green main actions, Petrol secondary filled actions, inverse text; outlined/subtle buttons use Forest Green text. Preserve callbacks and loading/disabled feedback.
- Inputs: white fill, readable placeholders, control borders; Error borders accompanied by explanatory text. Retain native focus feedback.
- Cards: white fill, shared spacing/radius/shadows; mint selection with a green border. Preserve interactive affordances.
- Badges: semantic success, warning, alert, info, neutral and reward variants. Reward uses Forest Green on lime. Keep descriptive labels.
- Retain existing typography and layouts; avoid decorative gradients, glass effects and unnecessary dependencies.

## Feature guidance

- Maps and routes: use `modes` tokens consistently. Modes may share brand hues, so retain mode names/icons, A/B labels and route summaries. Keep selected routes readable, labels opaque and transit information Petrol. Palette work must preserve marker positions, icons, map behavior and route calculations; coordinate behavioral changes with FE1.
- Login/register: Natural White background, white form cards, Forest headings and green actions. Preserve authentication, validation and keyboard behavior.
- Profile/preferences: white cards, mint grouping/avatar surfaces, dark labels and green active controls. Preserve preference state and accessible switch labels.
- Rewards/history: lime point badges with Forest text; Forest summary cards may use lime totals and white/mint supporting text. Keep dates and metrics legible. Never imply demo rewards are verified partnerships.
- Green Intelligence: Forest banners with white/mint text, white metric cards and Petrol information. Keep simulation notices visible and pair priority/status colors with labels and scores. Preserve data provenance.

## Workflow and verification

Read `Frontend/AGENTS.md`, the UniHack UI skill and relevant current code first. Do not change navigation, API contracts, shared state logic or FE1 behavior unless explicitly authorized. Palette migration does not authorize layout redesign or dependencies.

Run the installed TypeScript compiler with `--noEmit --incremental false`. Search components/screens for literal hex/RGB values and inspect configuration and image assets for remaining overrides. Calculate foreground/background contrast, inspect the diff for unrelated changes and separate automated results from manual mobile/web verification. Compilation and token math do not prove rendered accessibility.
