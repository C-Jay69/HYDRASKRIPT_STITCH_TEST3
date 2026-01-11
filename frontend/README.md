# HydraSkript Frontend-Backend Integration

This directory contains the frontend integration code for connecting the HydraSkript Next.js frontend to the Express.js backend.

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### 3. Backend Setup
Make sure the backend is running first:
```bash
cd ../backend
npm install
npm run dev
```

## Integration Architecture

### API Client (`lib/api.ts`)
- Centralized HTTP client for all backend API calls
- WebSocket connection management for real-time updates
- Authentication token handling
- Request/response interceptors

### React Hooks
- `useAuth.ts` - Authentication state management
- `useGeneration.ts` - Generation task management and WebSocket updates
- `useCredits.ts` - Credit balance and transaction management
- `useLogicGuard.ts` - Logic Guard alerts and integrity monitoring
- `useLibrary.ts` - Library data management (universes, books, styles)

### Integration Features

#### Real-time Generation Progress
```typescript
const { generateChapter, activeTasks } = useGeneration();

// Start generation
const result = await generateChapter({
  bookId: 'book_123',
  chapterIndex: 3,
  prompt: 'Continue the story...',
  context: 'Previous chapter context'
});

// Monitor progress via WebSocket
console.log('Active tasks:', activeTasks);
```

#### Credit Management
```typescript
const { balance, canAfford, getGenerationCost } = useCredits();

// Check if user can afford generation
const cost = getGenerationCost('chapter');
if (canAfford(cost)) {
  // Proceed with generation
}
```

#### Logic Guard Integration
```typescript
const { alerts, startScan, applyQuickFix } = useLogicGuard();

// Check for continuity issues
await startScan();

// Apply suggested fixes
await applyQuickFix(alertId, 'timeline_fix');
```

#### Library Management
```typescript
const { createUniverse, createBook, setCurrentBook } = useLibrary();

// Create new universe
const universe = await createUniverse({
  name: 'Mystical Realms',
  description: 'A world of magic and wonder',
  globalLore: { setting: 'Ancient forest realm' },
  globalCharacters: [{ name: 'Elias', traits: ['curious'] }]
});

// Create new book
const book = await createBook({
  title: 'The Weeping Woods',
  genre: 'Fantasy',
  targetLength: 75000,
  universeId: universe.id
});
```

## Integration with Existing Frontend

### Button Integration
Update existing buttons to use the backend integration:

```html
<!-- Before -->
<button class="flex items-center gap-2 bg-primary px-4 py-2 rounded-lg">
  <span class="material-symbols-outlined">colors_spark</span>
  <span>Ask AI to Write...</span>
</button>

<!-- After -->
<button class="flex items-center gap-2 bg-primary px-4 py-2 rounded-lg" 
        onclick="window.hydraSkript.handleGenerateClick(this)">
  <span class="material-symbols-outlined">colors_spark</span>
  <span>Ask AI to Write...</span>
</button>
```

### Credit Display Integration
Add credit balance display to existing UI:

```html
<div data-credit-balance class="text-sm text-text-light dark:text-white">
  Credits: Loading...
</div>
```

### Progress Bar Integration
Add generation progress tracking:

```html
<div class="w-full bg-gray-200 rounded-full h-2">
  <div data-generation-progress class="bg-blue-600 h-2 rounded-full" style="width: 0%"></div>
</div>
```

### Logic Guard Alerts Integration
Display Logic Guard alerts:

```html
<div data-logic-guard-alerts class="space-y-2">
  <!-- Alerts will be populated here -->
</div>
```

## API Endpoints Used

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get user profile

### Generation
- `POST /generate/chapter` - Generate chapter content
- `POST /generate/book` - Generate full book
- `POST /generate/style` - Train writing style

### Credits
- `GET /credits/balance` - Get credit balance
- `POST /credits/purchase` - Purchase credits
- `POST /credits/upgrade` - Upgrade subscription

### Queue
- `GET /queue/status/:taskId` - Get task status
- `POST /queue/cancel/:taskId` - Cancel task

### Media
- `POST /media/audiobook` - Generate audiobook
- `POST /media/cover-art` - Generate cover art

### Library
- `GET /library/universes` - Get user universes
- `POST /library/universes` - Create universe
- `GET /library/books` - Get user books
- `POST /library/books` - Create book
- `GET /library/styles` - Get user styles
- `POST /library/styles` - Create style

## WebSocket Events

### Client → Server
- `authenticate` - Authenticate WebSocket connection
- `subscribe_task` - Subscribe to task updates
- `unsubscribe_task` - Unsubscribe from task updates

### Server → Client
- `generation_update` - Task progress update
- `generation_completed` - Task completed
- `generation_failed` - Task failed
- `credit_balance_update` - Credit balance changed
- `logic_guard_alert` - New Logic Guard alert

## Error Handling

All API calls include comprehensive error handling:

```typescript
try {
  const result = await hydraAPI.generateChapter(params);
  // Success
} catch (error) {
  if (error.message.includes('Insufficient credits')) {
    // Handle credit insufficient error
  } else if (error.message.includes('Logic Guard')) {
    // Handle Logic Guard conflicts
  } else {
    // Handle other errors
  }
}
```

## Testing Integration

### Manual Testing
1. Start backend server
2. Start frontend development server
3. Test user authentication
4. Test credit purchases and balance updates
5. Test chapter generation with Logic Guard
6. Test real-time progress updates via WebSocket
7. Test audiobook generation
8. Test cover art generation

### Automated Testing
```bash
npm test
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check backend WebSocket server is running
   - Verify WebSocket URL in environment variables
   - Check firewall/proxy settings

2. **Authentication Errors**
   - Verify JWT token is stored in localStorage
   - Check token expiration
   - Verify backend authentication middleware

3. **Credit Balance Not Updating**
   - Check WebSocket connection for real-time updates
   - Verify credit transaction API calls
   - Check Redis connection for queue processing

4. **Generation Tasks Not Starting**
   - Verify sufficient credits
   - Check Logic Guard conflicts
   - Verify Redis queue connection

### Debug Mode
Enable debug logging:
```javascript
localStorage.setItem('hydraDebug', 'true');
```

This will enable detailed console logging for all API calls and WebSocket events.