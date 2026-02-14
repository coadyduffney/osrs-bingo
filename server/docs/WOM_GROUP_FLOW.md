# WiseOldMan Group Update Flow Verification

## Expected Flow (Updated Implementation)

### 1. Event Tracking Start
```typescript
// Step 1: Create WOM Group with all members
const womGroup = await womService.createGroup("OSRS Bingo - EventName", ["Player1", "Player2", "Player3", "Player4"]);

// Expected Response Structure:
// {
//   group: {
//     id: 12345,
//     name: "OSRS Bingo - EventName",
//     memberCount: 4,
//     ...
//   }
// }
// Our code now extracts: womGroup = response.data.group || response.data

// Step 2: Batch update all players in the group (SINGLE API CALL)
await womService.batchUpdatePlayers(usernames, womGroup.id);
// This calls: POST /groups/12345/update-all
// Expected response: { message: "...", count: 4 }

// Step 3: Wait for WOM to process
await sleep(3000);

// Step 4: Get individual snapshots for baseline
for (each player) {
  const snapshot = await womService.getLatestSnapshot(player.rsn);
  // This uses the data that was just updated via the group
}
```

## Verification Checklist

✅ **Group Creation Response Handling**
- Extract from `response.data.group` or fallback to `response.data`
- Log success with group ID and name
- Return null on failure

✅ **Group Update Call**
- Use correct endpoint: `POST /groups/{groupId}/update-all`
- Log the API call being made
- Log the full response
- Handle 429 errors specifically (shouldn't happen with group updates)
- Return null on failure to trigger fallback

✅ **Batch Update Logic**
- Check if groupId is provided and valid
- Call `updateGroup(groupId)` for batch update
- Only fallback to individual updates if group update fails
- Log which method is being used

✅ **Rate Limiting Prevention**
- Group update = 1 API call (no rate limiting)
- Individual fallback = 3 second delay between each player

## Common Issues & Solutions

### Issue 1: "Created WOM group undefined"
**Cause**: Response structure not parsed correctly
**Solution**: Extract from `response.data.group`
**Status**: ✅ Fixed

### Issue 2: Still getting 429 errors after group creation
**Cause**: Group ID was undefined, fell back to individual updates
**Solution**: Properly extract group ID from response
**Status**: ✅ Fixed

### Issue 3: Group update endpoint returns error
**Cause**: Could be invalid group ID or WOM API issue
**Solution**: Added detailed logging and fallback mechanism
**Status**: ✅ Handled

## Testing the Fix

Expected log output on success:
```
📋 Starting tracking for 4 players...
✅ Group created successfully: ID=12345, Name=OSRS Bingo - EventName
✅ Created WOM group 12345 for batch tracking
🔄 Updating all 4 players via group 12345...
   Players: Player1, Player2, Player3, Player4
📡 Calling WOM API: POST /groups/12345/update-all
✅ WOM Response: { message: '...', count: 4 }
✅ Updated 4 players in a single request
✅ Tracking started for event xyz with 4 players
```

Expected log output if group update fails (fallback):
```
📋 Starting tracking for 4 players...
✅ Group created successfully: ID=12345, Name=OSRS Bingo - EventName
✅ Created WOM group 12345 for batch tracking
🔄 Updating all 4 players via group 12345...
   Players: Player1, Player2, Player3, Player4
📡 Calling WOM API: POST /groups/12345/update-all
❌ Failed to update group 12345: ...
⚠️  Group update failed, falling back to individual updates
✅ Updated Player1 (1/4)
✅ Updated Player2 (2/4)
✅ Updated Player3 (3/4)
✅ Updated Player4 (4/4)
```

## Key Improvements in This Fix

1. **Response Parsing**: Correctly extracts group from nested structure
2. **Detailed Logging**: Every step is logged for debugging
3. **Error Context**: 429 errors are specifically identified
4. **Graceful Fallback**: Individual updates if group method fails
5. **Validation**: Logs group ID before using it
