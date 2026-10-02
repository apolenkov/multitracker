## ADDED Requirements

### Requirement: P01 Colored coherent static tracker

The prototype SHALL retain all eleven routes, RU/EN, light/dark/system themes,
independent RUB/USD base and display currencies, hidden balances and fictional
financial fixtures. Light SHALL be the initial theme and monochrome SHALL be an
explicit preference. The Bentley adaptation SHALL preserve colored assets,
8px controls, 12px content panels and visible text weights of at least 400,
without imposing literal monochrome or square geometry. Nested identical panels
SHALL NOT obscure task hierarchy.

#### Scenario: Open the new presentation

- **WHEN** a visitor opens a fresh prototype tab
- **THEN** the colored light presentation is shown with warm moss canvas #F3F1E8,
  Race Green hero/action #394D45, secondary teal zones, blush selection and
  colored asset symbols
- **AND** main content does not receive unsolicited initial keyboard focus
- **AND** switching theme, language or currency retains labelled demo-only quantities.

### Requirement: P02 Responsive hierarchy and operable controls

The prototype SHALL use consistent SVG icons, identifiable native selects and
8px control radii. Interactive hit areas SHALL be at least 44 CSS px in both
dimensions, including labelled checkbox/radio targets. Wide overview SHALL place its summary left of its chart;
at widths at or below 1279 CSS px its positions table SHALL use the full available
content width. Labels, amounts and actions SHALL remain readable and operable.
Topbar language/theme/display-currency controls SHALL have visible captions;
search placeholders SHALL be short and SHALL NOT replace accessible labels.
The FORM-028 cash/catalog entry SHALL open a native dialog rather than an
inline expansion that displaces the underlying overview content.

#### Scenario: Use a narrow control

- **GIVEN** a 320 CSS px viewport and either supported language
- **WHEN** a visitor uses a select, opens a disclosure or reaches a form action
- **THEN** the arrow and label do not overlap, text is not clipped and the action
  can be reached by scrolling, keyboard and an unobstructed hit target
- **AND** required fields and errors remain discoverable.

#### Scenario: Edit then clear additional information

- **GIVEN** an edit form starts with meaningful optional information
- **WHEN** the visitor clears its last meaningful field
- **THEN** focus remains in that visible field until an explicit collapse
- **AND** nonempty information or errors prevent hiding their group.

#### Scenario: Open and close the cash catalog

- **GIVEN** overview content positions and the catalog trigger are recorded
- **WHEN** a visitor opens FORM-028 at 375 or 1440 CSS px
- **THEN** the labelled native dialog opens without shifting the background layout
  as the former 684px inline expansion did
- **AND** catalog search/reset and buy/opening entry actions remain operable
- **WHEN** the visitor presses Escape or the close button
- **THEN** the dialog closes and focus returns to its initiating trigger.

### Requirement: P03 Complete observed inventory coverage

The delivery SHALL include observed evidence for exactly the 135 stable FORM-ID
entries of docs/design/form-inventory.md. Each entry SHALL be reached through its
real route, dialog, variant or disclosure; a parent route capture SHALL NOT count
as observing its child forms. Routes SHALL cover 375/1440 × RU/EN × light/dark;
forms SHALL be opened at 375/1440, with narrow controls inspected at 320 CSS px.
Applicable language, theme, currency, privacy and state contexts SHALL follow
the inventory. All mandatory final observations SHALL pass; FAIL, NOT VERIFIED,
missing entries or family-level substitutes SHALL NOT satisfy completion.

#### Scenario: Audit an inventory item

- **GIVEN** an inventory ID and its applicable contexts
- **WHEN** the visitor follows the recorded entry path and opens its actual state
- **THEN** evidence records roles/names, open/expanded, bounds, clipping, hit targets,
  keyboard and focus, plus expected and observed consequences of applicable actions
- **AND** validation, corrected save, cancellation and repeat actions are observed
  where applicable, while exclusions are explained per assertion rather than per ID.

### Requirement: P04 Reproducible DOM evidence and bounded correction

DOM evidence SHALL distinguish visible eligible controls from hidden, disabled,
inert and modal-background nodes. Suspicions SHALL be adjudicated against actual
states and actions. PNG, DOM and snapshot SHALL represent one captured state,
not three independent observations. Evidence SHALL record source input hashes
and remain in ignored docs/audits/2026-09-30-product-ui/.

#### Scenario: Correct an observed problem

- **WHEN** an audit identifies a confirmed obstruction, clipping or focus failure
- **THEN** the responsible area is corrected and affected states are observed again
- **AND** final evidence is bound to the delivered source hashes and retains the
  original failure as history without relabelling it PASS.

### Requirement: P05 Delivery checks and review

Delivery SHALL pass npm run check, a preserved UI suite with at least 68 PASS
and no FAIL/NOT VERIFIED, strict OpenSpec validation and Google DESIGN.md lint
with zero errors. Warnings SHALL be addressed or explained. One independent final
review SHALL verify standards, specification coverage and corrections. Draft PR3
SHALL have a verified actual GitHub Actions run for its delivered commit.

#### Scenario: Report completion honestly

- **WHEN** the implementer presents the prototype
- **THEN** exact current check results, 135-ID coverage and one review decision are
  stated separately from historical checks and user visual approval
- **AND** no real API/data/credential service, PWA, merge or financial implementation
  is introduced or claimed.
