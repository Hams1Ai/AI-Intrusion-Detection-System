# AI Intrusion Detection System - Design Guidelines

## Design Approach
**Cyberpunk Security Dashboard Theme**: A futuristic, neon-themed SOC (Security Operations Center) analyst interface inspired by hacking dashboards and sci-fi control panels. Think Tron meets modern security monitoring systems.

## Typography
- **Primary Font**: Orbitron (Google Fonts) - futuristic, tech-focused
- **Headings**: Bold weight, uppercase for titles like "AI INTRUSION DETECTION SYSTEM"
- **Body Text**: Regular weight for descriptions and feedback messages
- **Numbers/Stats**: Tabular figures, large sizes for emphasis on scores and metrics

## Layout System
**Tailwind Spacing**: Use units of 2, 4, 6, and 8 for consistent rhythm (p-4, m-6, gap-8, etc.)

**Structure**:
- Full-width header with title and status indicator
- Central game panel (max-w-4xl centered)
- 2x2 grid for session statistics
- Vertical flow: Header → Flow Analysis Panel → Action Buttons → Feedback Panel → Stats Grid

## Color System (Semantic)
- **Background**: Deep space dark (#02040a or similar near-black)
- **Normal Traffic**: Green accents for "NORMAL" badges
- **Attack Traffic**: Red accents for "ATTACK" badges  
- **Risk Score**: Yellow/amber for numerical indicators
- **Action - Ignore**: Blue with shield icon
- **Action - Block**: Red with cross/X icon
- **Neon Borders**: Cyan, purple, and blue gradients
- **Success Feedback**: Green panels/titles
- **Error Feedback**: Red panels/titles
- **RL Agent Match**: Green badge when user matches agent recommendation
- **RL Agent Differ**: Yellow badge when user differs from agent

## Component Library

### Header
- Title centered or left-aligned: "AI INTRUSION DETECTION SYSTEM"
- Status pill on right: "ONLINE" with green glow effect
- Minimal padding, prominent positioning

### RL Interactive Analyzer Panel
- Glowing card with neon gradient border
- **Flow ID**: Large, prominent display (e.g., "Flow #57397")
- **Classification Badge**: Pill-shaped, bold text
  - Green background for "NORMAL" 
  - Red background for "ATTACK"
- **Risk Score**: Right-aligned, large number (0.00–1.00) in yellow/amber

### Action Buttons
- Two large, equal-width buttons side by side
- **IGNORE**: Blue theme, shield icon
- **BLOCK**: Red theme, cross/X icon  
- Hover effects: slight glow, scale transform
- Disabled state during submission (reduced opacity)
- Smooth transitions (200-300ms)

### Decision Feedback Panel
**Correct Decision Card**:
- Green title/border
- Encouraging message with points shown
- Display: "Your action: [Action]"
- Display: "RL agent recommends: [Action]"
- Agreement badge (green "Matches Agent" or yellow "Different from Agent")

**Incorrect Decision Card**:
- Red title/border
- Explanatory penalty message with negative points
- Same action comparison layout as correct card

### Session Stats Section
- Title: "★ SESSION STATS" with star icon
- 2x2 grid of stat cards with glowing effects
- Each card shows:
  - Label (uppercase)
  - Large number/percentage
- Stats: TOTAL SCORE, CORRECT, TOTAL FLOWS, ACCURACY
- Cards have subtle blur and box-shadow for depth

### Load New Flow Button
- Large, prominent glowing button
- Text: "LOAD NEW FLOW"
- Pulsing glow or animated gradient border
- Positioned below action buttons

## Visual Effects
- **Blur**: Apply backdrop-blur to panels for glassmorphism effect
- **Glow**: Box-shadow with neon colors on borders and important elements
- **Gradients**: Multi-color gradients (cyan → purple → blue) on borders
- **Transitions**: Smooth 200-300ms transitions on all interactive elements
- **Hover States**: Slight scale (1.02-1.05) and increased glow intensity

## Responsive Behavior
- Desktop: Multi-column layouts where appropriate
- Tablet/Mobile: Stack to single column
- Stats grid: 2x2 on desktop, 2x1 or 1x4 on mobile
- Action buttons: Side-by-side on desktop, stack on narrow screens

## Images
**No hero images required** - this is a functional dashboard/game interface focused on data visualization and interaction. All visual impact comes from neon styling, gradients, and typography.

## Animations
**Minimal and purposeful only**:
- Button hover: scale + glow
- Panel transitions: fade in feedback panels
- Score updates: brief highlight flash on stat change
- Status indicator: subtle pulse on "ONLINE" badge
- Avoid distracting scroll animations or excessive motion