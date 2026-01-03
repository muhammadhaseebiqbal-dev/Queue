# Changelog

## [3.1.0] - 2026-01-03

### Added
- **Chat Performance**:
    - **Pagination**: Implemented lazy loading for chat history. Chats now load the last 20 messages instantly.
    - **Scroll-to-History**: Older messages are automatically fetched when scrolling to the top of the chat.
    - **Database Indexing**: Added indexing to message timestamps for faster retrieval.
    - **Visual Loader**: Added a loading spinner at the top of the chat list effectively communicating background fetching.
- **Explore Assistants Page**:
    - **"All" Category**: Added a new default "All" filter to browse all assistants.
    - **UI Refinement**: Renamed "Explore GPTs" to "**Explore Assistants**" and removed gradient headers for a cleaner look.
    - **Grid Layout**: Updated to a wider, 2-column dominant grid to prevent text truncation.

### Changed
- **Sidebar**:
    - **"Explore more" Button**: Renamed from "Explore GPTs" and restyled to match the compact look of assistant list items.
    - **Compact List Items**: Reduced padding and icon size for both Assistants and Projects lists to match a sleek, modern aesthetic (ChatGPT-style).
    - **Spacing**: Optimized vertical spacing between lists and buttons.
- **Project UI**:
    - **"Create Project" Modal**: Completely redesigned with a modern 2-column layout, improved typography, and a cleaner icon picker.
    - **Project List**: Styled project items to match the new compact assistant list style.

### Fixed
- **PDF Parsing Error**: Resolved server crash (`PDFDocument: stream must have data`) by adding buffer validation before parsing.
- **Filtering Logic**: Fixed issue where "Explore Assistants" filters were not strictly respecting categories.
