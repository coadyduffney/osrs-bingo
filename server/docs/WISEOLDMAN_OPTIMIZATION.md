# WiseOldMan API Optimization

## Problem
When tracking XP for multiple users in an event, making individual API calls to update each player leads to:
- **Rate limiting**: WOM API has a limit of 20 requests per 60 seconds (100 with API key)
- **Slow performance**: Each update takes time, and with delays to respect rate limits, it can take several minutes for large events
- **Poor user experience**: Users have to wait a long time for tracking to start

## Solution: WiseOldMan Groups
We now use the WiseOldMan Groups feature to optimize batch updates:

### How it Works
1. **Event Start**: When tracking starts, we create a WiseOldMan Group containing all event participants
2. **Batch Updates**: Instead of calling `/players/{username}` for each user, we call `/groups/{id}/update-all` once
3. **Single API Call**: One request updates all players in the group simultaneously
4. **Cleanup**: The group is stored with the event and can be reused for refresh operations

### Benefits
- ✅ **No Rate Limiting**: One API call regardless of player count (10 players or 100 players)
- ✅ **Fast Performance**: Seconds instead of minutes
- ✅ **Better UX**: Near-instant tracking start
- ✅ **Scalable**: Works efficiently even with large events

### Implementation Details

#### Database Schema
The `EventDocument` now includes:
```typescript
womGroupId?: number; // WiseOldMan group ID for batch updates
womVerificationCode?: string; // For deleting the group later
```

#### API Endpoints Used
- `POST /groups` - Create a new group with participants
- `POST /groups/{id}/update-all` - Update all group members in one call
- `GET /groups/{id}` - Get group details
- `DELETE /groups/{id}` - Clean up group after event ends

#### Service Methods
```typescript
// Create a group for tracking
await womService.createGroup(eventName, usernames);

// Update all members (single API call)
await womService.batchUpdatePlayers(usernames, groupId);

// Fallback to individual updates if group fails
await womService.batchUpdatePlayers(usernames); // No groupId
```

### Rate Limiting Strategy
- **With Group**: 1 request per event (no rate limiting issues)
- **Without Group** (fallback): 3-second delay between individual updates
- **API Key**: Consider getting a WOM API key for 100 requests/min limit

### Code Example
```typescript
// Before (slow, rate-limited)
for (const username of usernames) {
  await womService.updatePlayer(username);
  await delay(1000); // Wait to avoid rate limit
}

// After (fast, no rate limiting)
const group = await womService.createGroup('Event Name', usernames);
await womService.updateGroup(group.id); // Updates all players at once
```

## Configuration
Set these environment variables for better performance:
```env
WOM_API_KEY=your_api_key_here  # Optional: Increases rate limit to 100/min
WOM_USER_AGENT=your_app_name   # Required: Helps WOM identify your app
```

## Future Improvements
- Store verification code to delete groups after events end
- Automatically clean up old groups
- Add retry logic for group creation failures
- Monitor WOM API usage and health
