# Database Query Portal - Frontend

A modern React-based web interface for the Database Query Portal, providing developers and managers with an intuitive way to submit, review, and manage database queries and scripts.

## Features 

### 🚀 Core Functionality
- **Query Submission**: Submit SQL queries or JavaScript scripts with rich documentation
- **Approval Dashboard**: Manager interface for reviewing and approving queries
- **My Submissions**: Track your query history with advanced filtering
- **Audit Trail**: Complete audit log for administrators
- **Multi-Database Support**: PostgreSQL and MongoDB with context-aware examples

### 🎨 User Experience
- **Toast Notifications**: Elegant slide-in notifications for all actions
- **Dark Mode Support**: Seamless light/dark theme switching
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Live status updates and notifications
- **Advanced Filtering**: Multi-criteria filtering with status counters

### 🔒 Security & Validation
- **Input Validation**: Comprehensive client-side and server-side validation
- **Size Limits**: DoS protection with configurable input size limits
- **Single Statement Validation**: Prevents multiple SQL/MongoDB statements in Query mode
- **File Upload Security**: Secure script file handling with type validation

### 📊 Data Management
- **Professional Filtering**: Advanced filtering with status counters and pagination
- **Result Display**: Rich result visualization for queries and scripts
- **Export Capabilities**: Download scripts and results
- **Audit Logging**: Complete action tracking

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with Rolldown
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: React hooks and context
- **HTTP Client**: Axios with interceptors
- **Testing**: Jest + React Testing Library
- **Code Quality**: ESLint + TypeScript strict mode

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=Database Query Portal
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/          # Header, navigation components
│   │   └── ui/              # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx    # Toast notification system
│   │       ├── Select.tsx
│   │       ├── TextArea.tsx
│   │       ├── FileUpload.tsx
│   │       ├── StatusBadge.tsx
│   │       └── ResultDisplay.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx        # Query submission
│   │   ├── ApprovalDashboardPage.tsx # Manager approval interface
│   │   ├── MySubmissionsPage.tsx    # User's query history
│   │   ├── AuditPage.tsx           # Admin audit logs
│   │   └── LoginPage.tsx           # Authentication
│   ├── context/
│   │   ├── AuthContext.tsx         # Authentication state
│   │   └── ThemeContext.tsx        # Dark mode theme
│   ├── services/
│   │   └── api.ts                  # API client with interceptors
│   ├── types/
│   │   └── index.ts                # TypeScript type definitions
│   └── utils/
│       └── formatResult.ts         # Result formatting utilities
├── public/                         # Static assets
└── tests/                         # Test files
```

## Key Components

### Toast Notification System
```typescript
// Usage example
const { showSuccess, showError } = useToast();

// Show success notification
showSuccess('Query approved successfully!');

// Show error notification  
showError('Failed to approve query');
```

**Features:**
- Slides in from top-right corner
- Auto-dismisses after 3 seconds
- Manual close option
- Support for success, error, warning, info types
- Dark mode compatible

### Advanced Filtering
```typescript
// Professional filtering with status counters
const statusCounts = {
  PENDING: 5,
  EXECUTED: 12,
  FAILED: 2,
  REJECTED: 3
};
```

### Input Validation
```typescript
// Size limits for security
const MAX_QUERY_SIZE = 50000;      // 50KB
const MAX_SCRIPT_SIZE = 5000000;   // 5MB
const MAX_COMMENTS_SIZE = 2000;    // 2KB

// Multiple statement validation
// Prevents: "SELECT * FROM users; SELECT * FROM orders"
// Allows: "SELECT * FROM users" or "SELECT * FROM users;"
```

## Pages Overview

### 📝 Dashboard Page (`/`)
- **Purpose**: Submit new queries and scripts
- **Features**: 
  - Database type selection (PostgreSQL/MongoDB)
  - Instance and database selection
  - Query vs Script mode with context-aware documentation
  - Real-time validation with character counters
  - File upload for scripts with size validation
  - Prefill support for modifying existing queries

### ✅ Approval Dashboard (`/approval`)
- **Purpose**: Manager interface for reviewing queries
- **Features**:
  - Status overview with counters
  - Advanced filtering (status, type, pagination)
  - Detailed query preview with syntax highlighting
  - One-click approve/reject with toast notifications
  - Script download capability
  - Execution result display

### 📋 My Submissions (`/my-submissions`)
- **Purpose**: Track personal query history
- **Features**:
  - Professional filtering with status counters
  - Real-time status updates
  - Modify and resubmit functionality
  - Result viewing and export
  - Comprehensive query details

### 🔍 Audit Page (`/audit`) - Admin Only
- **Purpose**: System-wide audit trail
- **Features**:
  - Complete action logging
  - Advanced filtering by user, query, database
  - Pagination for large datasets
  - Detailed action history

### 🔐 Login Page (`/login`)
- **Purpose**: User authentication
- **Features**:
  - JWT-based authentication
  - Remember me functionality
  - Error handling with validation
  - Automatic redirect after login

## Validation & Security

### Input Size Limits
- **Query Text**: 50KB (prevents DoS attacks)
- **Script Files**: 5MB (configurable)
- **Comments**: 2KB (sufficient for descriptions)
- **Database Names**: 100 characters
- **Pod IDs**: 50 characters

### Multiple Statement Prevention
```javascript
// ❌ Rejected in Query mode
"SELECT * FROM users; SELECT * FROM orders"
"db.users.find({}); db.orders.find({})"

// ✅ Allowed in Query mode  
"SELECT * FROM users"
"SELECT * FROM users;"
"db.users.find({})"
"db.users.find({});"

// ✅ Multiple statements allowed in Script mode
```

### File Upload Security
- **File Type Validation**: Only `.js` files allowed
- **Size Limits**: 5MB maximum
- **Content Validation**: Checks for empty files and whitespace-only content
- **Virus Scanning**: Server-side validation

## API Integration

### Authentication
```typescript
// Automatic token management
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      await refreshToken();
    }
    return Promise.reject(error);
  }
);
```

### Error Handling
```typescript
// Consistent error handling across the app
try {
  await queriesApi.submit(queryData);
  showSuccess('Query submitted successfully!');
} catch (error) {
  showError(error.response?.data?.message || 'Failed to submit query');
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- DashboardPage.test.tsx
```

**Test Coverage:**
- Component rendering and interactions
- Form validation and submission
- API integration and error handling
- Authentication flows
- Toast notifications
- Filtering and pagination

## Performance Optimizations

- **Code Splitting**: Dynamic imports for large components
- **Lazy Loading**: Route-based code splitting
- **Memoization**: React.memo for expensive components
- **Debounced Search**: Prevents excessive API calls
- **Optimized Builds**: Vite with Rolldown for fast builds

## Accessibility

- **ARIA Labels**: Comprehensive screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG AA compliant colors
- **Focus Management**: Proper focus handling in modals
- **Semantic HTML**: Proper heading hierarchy and landmarks

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: ES2020, CSS Grid, Flexbox, CSS Custom Properties

## Deployment

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to static hosting (Netlify, Vercel, etc.)
# Upload dist/ folder contents
```

## Contributing

1. Follow TypeScript strict mode
2. Use Tailwind CSS for styling
3. Write tests for new components
4. Follow existing code patterns
5. Update documentation for new features

## Recent Updates

### v2.1.0 - Toast Notifications & UX Improvements
- ✅ Added elegant toast notification system
- ✅ Replaced browser alerts with slide-in notifications
- ✅ Enhanced approval dashboard UX
- ✅ Added auto-dismiss and manual close options

### v2.0.0 - Security & Validation Overhaul
- ✅ Comprehensive input validation and size limits
- ✅ Multiple statement prevention for Query mode
- ✅ DoS protection with configurable limits
- ✅ Enhanced file upload security

### v1.9.0 - Professional Filtering
- ✅ Advanced filtering with status counters
- ✅ Real-time status updates
- ✅ Improved pagination and sorting
- ✅ Enhanced user experience
