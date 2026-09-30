## ADDED Requirements

### Requirement: D01 Markets and Following
The prototype SHALL show searchable sample markets and a following list, with
asset classes, market indices, movers and asset details. Values SHALL be clearly
identified as fictional and SHALL respect display currency and hidden balances.

#### Scenario: Browse a sample asset
- **GIVEN** a user opens Markets
- **WHEN** they filter a class, search a symbol and open its row
- **THEN** matching sample assets and a labelled detail dialog are shown
- **AND** an unmatched query has a useful empty state.

### Requirement: D02 Alert forms
The prototype SHALL allow a user to preview creating, editing, pausing and
deleting price alerts for sample assets, without sending notifications.
Rules SHALL specify direction, currency and one-time or repeating behaviour.

#### Scenario: Validate and close an alert draft
- **GIVEN** the sample alert dialog is open
- **WHEN** the user enters an invalid threshold
- **THEN** a labelled error prevents saving
- **WHEN** they enter a valid threshold and save
- **THEN** the dialog closes and a demonstration result is announced.

### Requirement: D03 Analytics
The prototype SHALL expose portfolio performance, allocation by class, sector,
geography and location, fees, benchmark comparison, risk, valuation multiples,
asset comparison and trade decision examples. Illustrative metrics SHALL NOT
be presented as calculations of the user's actual portfolio or investment advice.
Trade counts, exchange usage, net investments, cashflows and realised/unrealised
results SHALL be available as explicitly separate illustrative measures.

#### Scenario: Change analytical view
- **GIVEN** Analytics is open
- **WHEN** the user selects a different analysis and period
- **THEN** the corresponding example and explanation become visible
- **AND** unavailable metrics are explained rather than fabricated as real results.

### Requirement: D04 Updates and Calendar
The prototype SHALL show a calendar, sample project announcements, movement
explanations, insider activity, daily and weekly recaps and crypto signals.

#### Scenario: Open an event and preview a reminder
- **GIVEN** Events is open
- **WHEN** the user selects an event and configures a reminder
- **THEN** the dialog validates the draft, announces a sample result and closes
- **AND** no external calendar, notification, audio or AI service is invoked.

### Requirement: D05 Appearance and widgets
The prototype SHALL offer a monochrome mode and a configurable widget preview.

#### Scenario: Preview an appearance option
- **GIVEN** Settings is open
- **WHEN** the user enables monochrome or selects a widget layout
- **THEN** the app or its labelled widget preview changes accordingly
- **AND** no operating-system widget is installed.

### Requirement: D06 Navigation and safety
All added screens SHALL support RU/EN, dark/light/system themes, 375 and 1440 px,
keyboard focus, Escape for dialogs and back/forward navigation. The prototype
SHALL NOT include eToro authentication, trading, payments or service connections.

#### Scenario: Navigate with unsaved dialog
- **GIVEN** a sample dialog is open on a new screen
- **WHEN** the user presses Escape or leaves the section
- **THEN** the dialog closes without preserving its unsaved draft
- **AND** returning to the section keeps only explicitly retained demo settings.

### Requirement: D07 Coherent responsive presentation
The prototype SHALL use distinct surfaces and a functional action accent in both
themes, a consistent SVG icon system, and four equal mobile navigation items.
All 135 inventory items SHALL receive recommendations from four independent
design lenses before consolidated implementation. Optional form fields MAY be
disclosed, but required fields and validation errors SHALL remain discoverable.

#### Scenario: Complete a compact operation form
- **GIVEN** the user opens any supported operation type
- **WHEN** they edit required fields and optional expenses
- **THEN** task-specific groups and labels identify each financial quantity
- **AND** nonzero values and errors in optional fields keep their group open.

#### Scenario: Use conflict and reminder controls on mobile
- **GIVEN** the viewport is 375 pixels wide
- **WHEN** the user opens a sync conflict or configures an event reminder
- **THEN** both conflict versions and radio labels remain readable
- **AND** changing to a reminder form focuses its first field and returning
  restores focus to the reminder action.
