# Profile Page — Screen Generation Prompt

## `Management-Profile-Populated`
### Module: `08-Management` (accessed from the "More" tab)

**Prompt:**

Design the seller's Profile page for Tijarah AI — a mobile B2B commerce
intelligence app. Reached from the "More" tab. This screen is account/identity
focused, not a settings dump — deep settings (notifications, team, etc.) stay as
separate rows that link out, not inline controls on this screen.
Frame: 390 × 844, 8pt grid, safe areas respected.

**Layout, top to bottom:**

**1. Header**
- Back arrow (top-left), page title "Profile" (Page title style), edit icon
  (top-right, pencil) that enables inline editing of name/business fields
- Below: circular avatar (initials-based placeholder if no photo, e.g. "MS" on a
  Neutral background — no stock photography), seller's full name (Card heading),
  business name underneath (Body, Neutral-secondary), and a small plan/tier badge
  next to the name (e.g. "Growth Plan")

**2. Account section** (Section heading: "Account")
- Rows (label left, value + chevron right, tappable to edit):
  - Email — shows current email, verified checkmark if verified
  - Phone number
  - Password & security — links to a change-password/2FA flow, no inline fields

**3. Business details section** (Section heading: "Business Details")
- Rows:
  - Business type (e.g. "Fashion & Apparel")
  - Primary market (e.g. "Pakistan")
  - Currency (e.g. "PKR")
  - Selling channels — shows Channel badges (Shopify, Daraz, Amazon) inline as
    small icons rather than text, tappable → routes to Connected Stores

**4. Subscription section** (Section heading: "Subscription")
- A compact card (not a full pricing table) showing: current plan name, renewal
  date, and a "Manage Plan" button (secondary/outline style, not Primary — this
  isn't the primary action of the screen)

**5. Quick links list** (no section heading needed, just a grouped list with
   right chevrons, each routing to its own screen):
- Connected Stores
- Team Permissions
- Notifications
- Cost & Margin Settings
- Help & Support
- Terms, Privacy & Legal

**6. Sign out**
- A full-width "Log Out" button in a lower-emphasis/Danger-outline style (text is
  Danger token, background stays neutral/white — this should read as a clear but
  non-alarming action, not a red block button)

**7. Footer**
- Small centered Caption text: app version number (e.g. "Tijarah AI v1.2.0")

**Style constraints:**
- Calm, credible B2B tone — same visual language as the rest of the app, no
  gradients, no glow, no decorative icons beyond the avatar/channel badges
- List rows use consistent height and the 4/8/12/16/24/32 spacing scale, with
  subtle dividers instead of heavy card borders between rows (this page reads
  more like a settings list than a stack of dashboard cards)
- Only one Primary-colored element on the entire screen at most (if any) — this
  is a low-stakes navigational/account screen, not a decision screen, so nothing
  should compete visually the way the Home dashboard's insight card does
- Reuse the same avatar/initials treatment anywhere else a user identity appears
  in the app (e.g. Team Permissions screen) for consistency
