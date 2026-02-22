# Database Read Optimization Summary

## Issue
The application was experiencing excessive Firestore reads - over 50,000 reads in 24 hours with only 18 users.

## Root Causes Identified

### 1. **Short Cache TTLs**
- XP Progress cache: 30 seconds → Too short for slow-changing data
- Tasks cache: 60 seconds → Too short for mostly static data  
- Task completions: NO caching → Every modal open hit DB

### 2. **Duplicate Concurrent Requests**
- Multiple users viewing the same event would trigger duplicate progress queries simultaneously
- No request deduplication

### 3. **Frontend Polling/Refetching**
- Leaderboard component refetches completions every time teams array changes
- EventView refetches event data on every refreshTrigger change
- XP Progress component refetches on every eventId change without debouncing

### 4. **Missing Caching**
- Task completions endpoint had zero caching
- Every task click in modal loaded completions from DB

## Optimizations Implemented

### Backend Changes

#### 1. Increased Cache TTLs (tracking.ts)
```typescript
// Before: 30 seconds
const CACHE_TTL_MS = 30000;

// After: 5 minutes  
const CACHE_TTL_MS = 300000;
```

#### 2. Added Task Completions Caching (tasks.ts)
```typescript
// New caching for completions endpoint
const completionsCache = new Map<string, { data: any; timestamp: number }>();
const COMPLETIONS_CACHE_TTL_MS = 300000; // 5 minutes
```

#### 3. Increased Tasks Cache TTL (tasks.ts)
```typescript
// Before: 60 seconds
const TASKS_CACHE_TTL_MS = 60000;

// After: 5 minutes
const TASKS_CACHE_TTL_MS = 300000;
```

#### 4. Cache Invalidation
- Automatically invalidate completions cache when tasks are completed/uncompleted
- This ensures users always see fresh data when it actually changes

## Expected Impact

### Estimated Read Reduction

**Before (24 hours with 18 users):**
- 50,000 reads

**After optimizations:**
- XP Progress: ~96% reduction (30s → 5min = 10x less frequent)
- Task Completions: ~98% reduction (no cache → 5min cache)
- Tasks List: ~80% reduction (60s → 5min)

**Projected total:** ~10,000-15,000 reads per 24 hours (70-80% reduction)

### Read Breakdown by Collection

**playerSnapshots** - Largest contributor
- Used by: `/tracking/:eventId/progress` endpoint
- Before: Fetched every 30 seconds per active user
- After: Cached for 5 minutes, shared across users
- Reduction: ~90%

**tasks** - Second largest
- Used by: `/tasks/event/:eventId` and task modal clicks
- Before: Fetched every 60 seconds + every modal open
- After: Cached for 5 minutes
- Reduction: ~80%

**taskCompletions** - Third largest  
- Used by: Leaderboard and task detail modals
- Before: NO caching, fetched on every view
- After: Cached for 5 minutes
- Reduction: ~95%

## Additional Recommendations

### 1. Frontend Debouncing
Consider adding debouncing to frequently-called data fetches in React components:

```typescript
// Example: Debounce XP progress fetching
const debouncedFetchProgress = useMemo(
  () => debounce(fetchProgress, 1000),
  []
);
```

### 2. React Query / SWR
Consider implementing React Query or SWR for:
- Automatic request deduplication
- Client-side caching
- Background revalidation
- Reduced boilerplate

### 3. Firestore Composite Indexes
Ensure these indexes exist:
- `playerSnapshots`: `eventId` + `snapshotType`
- `tasks`: `eventId` + `isXPTask`
- `teams`: `eventId` (already exists)

### 4. Monitor Cache Hit Rates
Check server logs for cache hit/miss messages:
```
📦 Cache HIT for event xyz123
📦 Cache MISS for event xyz123
```

### 5. Scheduled Job Frequency
Review cron schedules for XP refreshes:
- `*/5` = every 5 minutes → Reasonable
- `*/1` = every minute → Too aggressive
- Recommend: Every 15-30 minutes for most events

### 6. Pagination
For events with many teams/players:
- Consider paginating leaderboard
- Lazy-load task completions (only when modal opens)

## Testing Recommendations

1. **Monitor Firestore Console**
   - Check "Usage" tab daily
   - Look for read count reduction

2. **Load Testing**
   - Simulate 20-30 concurrent users
   - Verify cache is working (check logs)

3. **Cache Invalidation Testing**
   - Complete a task → Verify completions refresh
   - Uncomplete a task → Verify completions refresh
   - Start tracking → Verify progress refreshes

## Cache Strategy Summary

| Data Type | Cache Duration | Invalidation Trigger |
|-----------|---------------|---------------------|
| XP Progress | 5 minutes | Manual refresh or scheduled update |
| Tasks List | 5 minutes | Task created/updated/deleted |
| Task Completions | 5 minutes | Task completed/uncompleted |
| Event Data | None (updates rare) | N/A |

## Estimated Cost Savings

At current Firestore pricing (~$0.06 per 100,000 reads):
- Before: 50,000 reads/day × 30 days = 1,500,000 reads/month = **~$0.90/month**
- After: 15,000 reads/day × 30 days = 450,000 reads/month = **~$0.27/month**
- **Savings: ~$0.63/month per 18 users**

(Scales with user count - at 180 users, save ~$6.30/month)

## Next Steps

1. ✅ Deploy backend caching changes
2. ⏳ Monitor read counts for 24-48 hours
3. ⏳ If still high, implement frontend debouncing
4. ⏳ Consider React Query for more aggressive client caching
5. ⏳ Review scheduled job frequencies with users
