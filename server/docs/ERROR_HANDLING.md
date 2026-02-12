# Backend Error Handling

## Overview

The backend now has comprehensive error handling to prevent server crashes and provide graceful error responses to clients.

## Components

### 1. Async Handler Wrapper

**Location**: `src/middleware/errorHandler.ts`

```typescript
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

**Purpose**: Wraps async route handlers to automatically catch promise rejections and pass them to the error handler middleware.

**Usage**: Wrap all async route handlers with `asyncHandler()`:

```typescript
router.get('/example', asyncHandler(async (req, res) => {
  // Your async code here
  const data = await someAsyncOperation();
  res.json({ success: true, data });
}));
```

### 2. Error Handler Middleware

**Location**: `src/middleware/errorHandler.ts`

```typescript
export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`Error: ${message}`, err);
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```

**Purpose**: Centralized error handling that formats all errors consistently and includes stack traces in development mode.

**Features**:
- Consistent error response format
- Proper HTTP status codes
- Stack traces in development only
- Logs all errors to console

### 3. API Error Class

**Location**: `src/middleware/errorHandler.ts`

```typescript
export class ApiErrorClass extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}
```

**Purpose**: Custom error class for throwing API errors with specific HTTP status codes.

**Usage**:

```typescript
if (!user) {
  throw new ApiErrorClass(404, 'User not found');
}

if (!hasPermission) {
  throw new ApiErrorClass(403, 'Forbidden');
}
```

### 4. Process-Level Error Handlers

**Location**: `src/index.ts`

```typescript
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  // Log but don't crash
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Log but don't crash
});
```

**Purpose**: Catch and log errors that escape route handlers, preventing complete server crashes.

**Features**:
- Logs errors instead of crashing
- Allows server to continue running
- Provides visibility into unexpected errors

### 5. Graceful Shutdown Handlers

**Location**: `src/index.ts`

```typescript
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
```

**Purpose**: Handle shutdown signals gracefully (Ctrl+C, Docker stop, etc.)

## Error Response Format

All errors return the following JSON structure:

```json
{
  "success": false,
  "error": "Error message here",
  "stack": "Stack trace (development only)"
}
```

## Common HTTP Status Codes

- `400` - Bad Request (validation errors, missing required fields)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized/no permission)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (unexpected errors)

## Testing Error Handling

### Test 404 Error
```bash
curl http://localhost:3000/api/tasks/invalid-id
```

### Test Validation Error
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": ""}'
```

### Test Authorization Error
```bash
curl -X DELETE http://localhost:3000/api/tasks/some-id
# (without auth token)
```

## Best Practices

1. **Always use `asyncHandler`** for async route handlers
2. **Throw `ApiErrorClass`** for expected errors with specific status codes
3. **Let unexpected errors bubble up** to the error handler
4. **Include helpful error messages** for debugging
5. **Never expose sensitive information** in error messages (passwords, tokens, etc.)

## Files Updated

- ✅ `src/middleware/errorHandler.ts` - Added `asyncHandler` wrapper
- ✅ `src/index.ts` - Added process-level error handlers
- ✅ `src/routes/tasks.ts` - Wrapped all async handlers

## Files That Need Updating

The following route files should also be updated to use `asyncHandler`:

- [ ] `src/routes/auth.ts`
- [ ] `src/routes/events.ts`
- [ ] `src/routes/teams.ts`

## Migration Guide

To update a route file:

1. Import `asyncHandler`:
```typescript
import { ApiErrorClass, asyncHandler } from '../middleware/errorHandler.js';
```

2. Wrap each async route handler:
```typescript
// Before
router.get('/example', async (req, res) => {
  // code
});

// After
router.get('/example', asyncHandler(async (req, res) => {
  // code
}));
```

3. Remove try-catch blocks that just re-throw errors (they're now handled automatically)

## Benefits

✅ Server stays running even when errors occur
✅ Consistent error responses across all endpoints
✅ Better debugging with detailed error logs
✅ Graceful handling of unexpected errors
✅ Development-friendly with stack traces
✅ Production-safe without sensitive info
