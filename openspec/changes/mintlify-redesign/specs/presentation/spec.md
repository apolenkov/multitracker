## ADDED Requirements

### Requirement: M01 Coherent Mintlify presentation
The prototype SHALL use the owner-selected Mintlify-inspired presentation across
all eleven existing routes, while retaining all demo scenarios, labels, RU/EN,
independent base/display currencies and hidden balances. It SHALL load local fonts.

#### Scenario: Open and navigate the prototype
- **WHEN** a new visitor opens the prototype
- **THEN** the light theme is shown without an initial dark canvas
- **AND** all existing routes and actions remain reachable on mobile and desktop.

### Requirement: M02 Accessible theme variants
The prototype SHALL offer light, dark and system appearance, clear content layers,
readable financial values and keyboard focus. Ordinary text SHALL meet 4.5:1 contrast.

#### Scenario: Change system appearance
- **GIVEN** system appearance is selected
- **WHEN** the operating system changes between light and dark
- **THEN** app surfaces, native control color scheme and browser theme color agree
- **AND** explicit light or dark selection remains independent of the OS setting.

### Requirement: M03 Representative workflow fidelity
The redesigned overview and operation form SHALL preserve financial quantities,
validation, visible mandatory fields and demo-only outcomes at 375 and 1440 px.

#### Scenario: Enter an operation
- **WHEN** a visitor opens the operation form and submits invalid values
- **THEN** labelled errors are shown and saving is prevented
- **WHEN** the visitor enters valid sample values and saves
- **THEN** a demo result is announced, the dialog closes and focus returns
- **AND** no real user data, files, credentials or external services are used.
