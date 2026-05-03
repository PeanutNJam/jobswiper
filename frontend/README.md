# Frontend - JobSwiper Mobile App

React Native + Expo mobile application for job matching (Tinder-style interface).

## Stack
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Target**: iOS (with Android support)
- **UI Pattern**: Swipe-based matching
- **State Management**: Zustand

## Project Structure

```
frontend/
├── src/
│   ├── screens/           # Screen components
│   ├── components/        # Reusable UI components
│   ├── services/          # API services
│   ├── hooks/             # Custom React hooks
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript types
│   ├── utils/             # Helper functions
│   ├── navigation/        # Navigation configuration
│   └── assets/            # Images, fonts, etc.
├── App.tsx
├── app.json               # Expo config
├── package.json
└── tsconfig.json
```

## Getting Started

### Install dependencies
```bash
npm install
```

### Run on iOS simulator
```bash
npm run ios
```

### Run on Android emulator
```bash
npm run android
```

### Run on web (development only)
```bash
npm run web
```

## Environment Variables

Create `.env` file in this directory:

```
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_API_TIMEOUT=30000
```

## Key Features (To be implemented)

- [ ] User authentication (Login/Register/Social auth)
- [ ] Swipe interface for job matching
- [ ] User profile management
- [ ] Job/Employer profile management
- [ ] Match history & analytics
- [ ] In-app messaging
- [ ] Push notifications
- [ ] Offline support
