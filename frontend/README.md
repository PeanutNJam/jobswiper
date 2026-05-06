# Frontend - JobSwiper Mobile App

React Native + Expo mobile application for job matching (Tinder-style interface).

## Stack
- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Target**: iOS (with Android support)
- **UI Pattern**: Swipe-based matching
- **State Management**: Zustand
- **Navigation**: React Navigation bottom tabs
- **Icons**: Hugeicons React Native

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
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_API_TIMEOUT=30000
```

## Key Features

- User authentication and session restore
- Job seeker swipe deck for job discovery
- Employer swipe deck for applicant review
- Profile editing with photo uploads and skill chips
- Employer job creation with required skills
- Employer job analytics for swipes, interested applicants, and matches
- Employer conversations grouped by job post
- In-app chat with WebSocket updates
- Profile popups from chat headers and conversation avatars
- Push notification registration

## Main Screens

- `AuthScreen`: login, registration, and user type selection.
- `OnboardingScreen`: initial profile setup.
- `SwipeScreen`: job seeker job discovery.
- `CandidatesScreen`: employer applicant review for candidates who swiped right on employer jobs.
- `MatchesScreen`: conversations; employers see an accordion grouped by job post.
- `ConversationScreen`: real-time chat and matched profile popup.
- `ProfileScreen`: profile editing plus employer job posting and job analytics.

## Useful Commands

```bash
npm install
npm start
npm run ios
npm run android
npm run web
npx tsc --noEmit
```
