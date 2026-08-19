# Home Executive Dashboard — Screen Generation Prompt

## `Home-ExecutiveDashboard-Populated`
### Module: `02-Home`

**Prompt:**

Design the main Home tab of Tijarah AI — a mobile B2B commerce intelligence app.
This is the screen a seller opens every day. It must prioritize decisions, not
display every metric available. Frame: 390 × 844, 8pt grid, safe areas respected.

**Top bar:**
- Left: Store selector (shows "All Stores" by default, tappable to filter by
  Shopify / Daraz / Amazon using Channel badges)
- Right: Date-range selector (e.g. "Last 7 days ▾") + a notification bell icon
  with a small unread-count dot

**Above-the-fold order (strict — do not reorder):**

1. **Business health summary** — a single Business health score component near
   the top: a compact score/status (e.g. "Healthy" / "Needs attention") with one
   short supporting line, not a big illustrated gauge.

2. **True-profit card** — the True-profit card component, showing true profit for
   the selected period in PKR, with a small comparison vs. previous period
   (Metric card with comparison pattern). Clearly label if any part of the number
   is estimated (e.g. small "Estimated" tag) vs. confirmed.

3. **Most important action** — one AI insight card, visually the largest and most
   prominent element on the screen (this is the single primary action of the
   screen). Structure exactly as:
   - Agent identity badge (which agent generated this — e.g. Profit Agent)
   - Title in seller-friendly language: "Three products are generating revenue
     but losing money"
   - Business-impact label: "Estimated loss: Rs. 18,400 this month"
   - One-line cause: "Primary cause: Daraz fees and discounting reduced margins
     below zero."
   - Action row: "Review products" (primary), "Apply suggested prices",
     "Ask Tijarah", "Dismiss" (dismiss and apply-prices are lower emphasis than
     "Review products")
   - A small "Why this?" link
   - Priority/severity badge in the corner (e.g. High)

4. **Estimated business impact strip** — a compact row summarizing total
   estimated impact across all open insights this period (e.g. "Rs. 42,100 at
   risk across 4 insights") — this is a summary strip, not another full card.

5. **Revenue / Orders / Margin** — a row of 3 Metric cards with comparison,
   side by side or in a 3-column grid: Revenue, Orders, Net Margin %. Each shows
   the period value + up/down comparison. Do not use red/danger color for a
   decline unless it represents an actual problem — a filtered or expected
   decline stays neutral.

6. **Inventory risks** — a short horizontal or stacked list (max 3 visible) of
   Inventory-risk rows, e.g. "Blue Hoodie — stockout in 6 days", with a "View
   all" link if more exist.

7. **Customer sentiment** — one compact Sentiment summary component: overall
   trend (up/down/flat) + one flagged theme, e.g. "Sizing complaints increased
   this week."

8. **Recent agent activity** — a short list (2–3 items) of recently completed or
   automated agent actions, each with Agent identity badge + one-line result,
   e.g. "Operations Agent flagged 5 delayed orders — 2 hours ago."

**Below the fold (scrollable, in this order):**

9. **Feature graphs strip** — a section heading "Your Business at a Glance" followed
   by 4 compact trend cards in a 2×2 grid, one for each core AI feature. Each card is
   small (not a full analytics chart) and tappable → opens that agent's detail screen:
   - **True Profit** — small sparkline/line chart of profit over the selected period +
     current value + up/down %. Uses AI Insight or Success/Danger token depending on
     trend direction.
   - **Inventory Health** — small bar or dot chart showing stock status distribution
     (healthy / low / at-risk) + count of at-risk SKUs, e.g. "3 products at risk."
   - **Operations** — small trend line of exceptions/cancellations over the period +
     current count, e.g. "12 exceptions this week."
   - **Customer Sentiment** — small trend line of sentiment score + current rating
     trend, e.g. "4.3★ · improving."
   Each card: Card heading, mini chart, one Caption line, Agent identity badge in the
   corner. Keep charts minimal — axis labels and gridlines are optional/light, the
   point is a quick visual trend, not detailed analysis.

10. **All insights feed** — section heading "All Insights" + a vertical list of
    3–4 additional AI insight cards (same structure as the primary card in item 3,
    but in a smaller/compact variant — title, business-impact label, severity badge,
    single primary action button instead of a full action row). End the list with a
    "View all insights" link that routes to the Insights tab.

**Bottom navigation:**
Fixed 5-item bar: Home (active), Insights, Ask Tijarah (center, visually raised/
prominent button — not a plain tab), Operations, More.

**Style constraints:**
- Calm, financially credible B2B tone — closer to a banking/finance app than a
  consumer dashboard. No decorative AI gradients, no glow effects, no glossy
  chatbot imagery.
- Cards use consistent padding from the 4/8/12/16/24/32 spacing scale, subtle
  borders, no heavy shadows.
- Use no more than the 6 defined type styles (Display metric, Page title,
  Section heading, Card heading, Body, Caption/label).
- All currency in PKR, realistic commerce numbers (not round demo numbers like
  10,000 — use numbers like 18,400 / 42,100 / 6,250 for credibility).
- Semantic color tokens only: Success (healthy/profitable), Warning (attention
  needed), Danger (loss-making/urgent), AI Insight (for agent-generated cards),
  Neutral (everything else). Don't invent new colors.
- Every insight card must visually distinguish "estimated" values from
  "confirmed" values (e.g. a small outlined "Est." tag) — this is a trust
  requirement, not optional styling.

**Do not include on this screen:** large/detailed charts (full profit waterfall,
full forecast charts with axes and tooltips — those belong on detail screens, not
Home; the graphs strip here is mini/sparkline-only), a chat input box (Ask Tijarah
is a nav button here, not inline chat), or more than one large primary insight
card — everything else stays compact/summarized with "view all" links to detail
screens.
