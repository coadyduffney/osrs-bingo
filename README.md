# OSRS Bingo - Clan Event Manager# React + TypeScript + Vite



A web application for creating and managing Old School RuneScape clan bingo-style events.This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.



## FeaturesCurrently, two official plugins are available:



- **User Authentication**: Secure login system for event organizers and participants- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh

- **Event Management**: Create and customize bingo events with flexible board sizes- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

- **Customizable Bingo Boards**: Support for 5x5, 7x7, 9x9, and 10x10 grids

- **Task Management**: Create custom task lists with point values## React Compiler

- **Team System**: Organize players into teams and manage memberships

- **Event Sharing**: Generate shareable links to invite playersThe React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

- **Real-time Progress**: Track team progress and scores

## Expanding the ESLint configuration

## Technology Stack

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

- **Frontend**: React 18 with TypeScript

- **Build Tool**: Vite```js

- **Routing**: React Router v6export default defineConfig([

- **Styling**: CSS3 with CSS Grid for bingo boards  globalIgnores(['dist']),

  {

## Getting Started    files: ['**/*.{ts,tsx}'],

    extends: [

### Prerequisites      // Other configs...



- Node.js 18 or higher      // Remove tseslint.configs.recommended and replace with this

- npm 8 or higher      tseslint.configs.recommendedTypeChecked,

      // Alternatively, use this for stricter rules

### Installation      tseslint.configs.strictTypeChecked,

      // Optionally, add this for stylistic rules

1. Clone the repository:      tseslint.configs.stylisticTypeChecked,

```bash

git clone <repository-url>      // Other configs...

cd osrs-bingo    ],

```    languageOptions: {

      parserOptions: {

2. Install dependencies:        project: ['./tsconfig.node.json', './tsconfig.app.json'],

```bash        tsconfigRootDir: import.meta.dirname,

npm install      },

```      // other options...

    },

3. Start the development server:  },

```bash])

npm run dev```

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

4. Open your browser and navigate to `http://localhost:5173`

```js

## Available Scripts// eslint.config.js

import reactX from 'eslint-plugin-react-x'

- `npm run dev` - Start development serverimport reactDom from 'eslint-plugin-react-dom'

- `npm run build` - Build for production

- `npm run preview` - Preview production buildexport default defineConfig([

- `npm run lint` - Run ESLint  globalIgnores(['dist']),

  {

## Project Structure    files: ['**/*.{ts,tsx}'],

    extends: [

```      // Other configs...

osrs-bingo/      // Enable lint rules for React

├── src/      reactX.configs['recommended-typescript'],

│   ├── components/       # Reusable React components      // Enable lint rules for React DOM

│   │   └── BingoBoard.tsx      reactDom.configs.recommended,

│   ├── pages/           # Page components    ],

│   │   ├── Home.tsx    languageOptions: {

│   │   ├── CreateEvent.tsx      parserOptions: {

│   │   ├── EventView.tsx        project: ['./tsconfig.node.json', './tsconfig.app.json'],

│   │   └── Login.tsx        tsconfigRootDir: import.meta.dirname,

│   ├── App.tsx          # Main app component with routing      },

│   ├── main.tsx         # Application entry point      // other options...

│   └── index.css        # Global styles    },

├── public/              # Static assets  },

├── index.html          # HTML template])

├── package.json        # Project dependencies```

├── tsconfig.json       # TypeScript configuration
└── vite.config.ts      # Vite configuration
```

## Roadmap

### Phase 1: Core Functionality (Current)
- [x] Project scaffolding
- [x] Basic routing and navigation
- [x] Event creation form
- [x] Dynamic bingo board component
- [x] Backend API setup
- [x] REST API endpoints
- [ ] Frontend-Backend integration
- [ ] Database setup

### Phase 2: User Features
- [ ] User authentication & authorization
- [ ] Event CRUD operations
- [ ] Task management system
- [ ] Team creation and management
- [ ] Event invitation system

### Phase 3: Advanced Features
- [ ] Real-time updates (WebSockets)
- [ ] Task completion tracking
- [ ] Point calculation and leaderboards
- [ ] Image uploads for task verification
- [ ] Event templates

### Phase 4: Polish
- [ ] Responsive mobile design
- [ ] Dark/light theme toggle
- [ ] Notification system
- [ ] Export event results
- [ ] Admin dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Inspired by the OSRS community's clan bingo events
- Built with modern web technologies
