# MetroFlow

A web-based metro/subway map editor that allows you to create and edit transit maps with an intuitive interface.

## Features

- Create and edit metro/subway maps
- Add major and minor stations
- Create track connections with automatic curve handling
- Snap-to-grid functionality
- Station name positioning with collision avoidance
- Undo/Redo support
- Import/Export maps as JSON
- Customizable styles (colors, sizes, etc.)

## Project Structure

```
src/
├── js/
│   ├── core/           # Core functionality
│   │   ├── connection.js   # Connection between stations
│   │   ├── map.js         # Main map handling
│   │   ├── segment.js     # Track segments
│   │   ├── station.js     # Station implementation
│   │   └── track.js       # Track management
│   ├── editor/        # Editor UI components
│   │   ├── contextmenu.js # Right-click menu
│   │   ├── editor.js      # Main editor
│   │   ├── interaction.js # User interactions
│   │   ├── sidebar.js     # Side panel
│   │   └── toolbar.js     # Top toolbar
│   ├── utils/         # Utility functions
│   │   ├── revision.js    # Undo/Redo
│   │   ├── serialize.js   # Save/Load
│   │   ├── snap.js        # Grid snapping
│   │   ├── styles.js      # Visual styles
│   │   └── util.js        # Common utilities
│   ├── main.js       # Application entry
│   └── metroflow.js  # Main module exports
├── css/              # Stylesheets
└── maps/             # Example maps
```

## Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/metroflow.git
   cd metroflow
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## Dependencies

- Paper.js - Vector graphics scripting
- jQuery - DOM manipulation
- jQuery UI - User interface components
- UUID - Unique identifier generation

## Development Guidelines

1. **File Organization**

   - Core logic goes in `src/js/core/`
   - UI components go in `src/js/editor/`
   - Utilities go in `src/js/utils/`

2. **Code Style**

   - Use ES6+ features
   - Follow modular design patterns
   - Keep files focused on single responsibilities

3. **Adding Features**

   - Add new core functionality in appropriate core/ directory
   - Add new UI components in editor/
   - Update metroflow.js exports if needed

4. **Testing**
   - Test new features in development environment
   - Verify undo/redo functionality
   - Check mobile/responsive behavior

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## License

[Add your license here]
