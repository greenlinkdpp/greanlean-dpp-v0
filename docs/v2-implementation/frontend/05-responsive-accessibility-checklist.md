# Responsive and Accessibility Checklist

## Responsive QA

| Width | Horizontal overflow | Card behavior | Navigation |
|---:|---|---|---|
| 375 px | None | Stacked | Horizontal, touch-scrollable |
| 390 px | None | Stacked | Horizontal, touch-scrollable |
| 430 px | None | Stacked | Horizontal, touch-scrollable |
| 768 px | None | Two/four-column where suitable | Sticky anchors |
| 1024 px | None | Expanded grid | Sticky anchors |
| 1440 px | None | Full constrained layout | Sticky anchors |

Identifiers use safe wrapping. Documents use responsive cards rather than wide tables. QR remains a fixed, legible image with an accessible label. No raw JSON is used as the primary interface.

## Accessibility

- [x] One descriptive page heading and ordered semantic section headings.
- [x] Skip link to the Passport content.
- [x] Keyboard-reachable language, audience and anchor navigation.
- [x] Visible focus rings.
- [x] Minimum 44 px primary navigation targets.
- [x] Alerts use `role="alert"` and retain explicit text.
- [x] SOC/SOH use accessible meter semantics.
- [x] Carbon bars expose a descriptive accessible label.
- [x] Status meaning is present in text and not conveyed by color alone.
- [x] Restrained high-contrast palette and reduced-motion support from existing tokens.
- [x] Collapsed technical details use native `details`/`summary` behavior.

Browser automation found zero critical accessibility or responsive issues. A full external WCAG certification audit is outside this stage.
