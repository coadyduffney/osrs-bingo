# ImgBB Setup (2 Minutes - Super Easy!)

ImgBB is even simpler than Imgur - just get an API key and you're done! No OAuth, no complicated setup.

## Step 1: Get Your API Key (1 minute)

1. Go to: **https://api.imgbb.com/**
2. Click **"Get API Key"** button
3. **Sign up** with email or use your social login (Google, Facebook, etc.)
4. After signing in, you'll immediately see your API key:
   ```
   Your API key: abc123def456789xyz
   ```
5. **Copy the API key**

That's it! No application registration, no OAuth setup needed.

## Step 2: Add to .env File (30 seconds)

Open `h:\code-repos\osrs-bingo\.env` and add this line at the end:

```properties
# ImgBB API for image uploads (FREE - 100 uploads/hour)
VITE_IMGBB_API_KEY=paste_your_api_key_here
```

Replace `paste_your_api_key_here` with the API key you copied.

## Step 3: Restart Dev Server (30 seconds)

```bash
# Stop the server (Ctrl+C)
npm run dev
```

## Step 4: Test It!

1. Go to your event
2. Click a task
3. Upload an image
4. Click "Mark Complete"
5. Check browser console - you should see: `Image uploaded successfully via imgbb`

## What You Get

**ImgBB Free Tier:**
- ✅ **100 uploads per hour** (resets every hour)
- ✅ **Unlimited storage**
- ✅ **No bandwidth limits**
- ✅ **No credit card** required
- ✅ **Forever free**
- ✅ **Simpler than Imgur** (just API key, no OAuth)

**Perfect for your use case!** Unless you have 100+ users uploading images in the same hour, you'll never hit the limit.

## Comparison

| Feature | ImgBB | Imgur | Firebase Storage |
|---------|-------|-------|------------------|
| **Free uploads** | 100/hour | 12,500/day | 5 GB total |
| **Setup complexity** | ⭐ API Key only | ⭐⭐ OAuth setup | ⭐⭐⭐ Billing setup |
| **Credit card required** | ❌ No | ❌ No | ✅ Yes |
| **Setup time** | 2 minutes | 5 minutes | 15+ minutes |
| **Registration URL** | Works! ✅ | Redirects ❌ | Complex |

## Troubleshooting

**"ImgBB API key not configured" error:**
- Make sure you added `VITE_IMGBB_API_KEY` to `.env`
- Make sure you restarted the dev server
- Check for typos in the variable name

**Upload still fails:**
- Check browser console for specific error
- Make sure your API key is correct
- Try a smaller image (< 5MB)
- Check you haven't exceeded 100 uploads/hour

## Rate Limit Info

If you somehow hit the 100 uploads/hour limit:
- Wait for the next hour (limit resets)
- Or upgrade to ImgBB paid plan ($4/month for 500/hour)
- Or switch to Firebase Storage (enable Blaze plan)

But realistically, for a bingo app, you won't hit this limit! 🎉

## Alternative: Firebase Storage

If you prefer Firebase Storage and have a credit card:
1. Go to Firebase Console
2. Click "Upgrade project" to Blaze plan
3. Add credit card (free tier is generous, set budget alert to $0)
4. Enable Storage
5. The app will automatically use Firebase instead

The code supports both! ImgBB is prioritized if configured.
