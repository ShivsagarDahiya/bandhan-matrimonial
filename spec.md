# Bandhan Matrimonial

## Current State
Full-featured matrimonial app with swipe discovery, stories, chat, WebRTC calls, privacy/premium settings, and Instagram-style stories with add story upload. Toast notifications appear throughout the app. Browse screen shows profile cards in a static layout. No notification bell icon exists in the header.

## Requested Changes (Diff)

### Add
- **Notification Bell Icon**: Bell icon in the top-right header area, to the LEFT of any call/ring icon. Clicking it opens a dropdown panel showing: pending match requests (with profile photo + name + "wants to connect"), new mutual matches ("You matched with [name]"), and story comment/like notifications. Shows unread count badge. Marks as read when dropdown is opened. Polls every 5 seconds. Looks like Instagram notification panel.
- **Browse Screen Auto-Scroll**: Profile cards in Browse page auto-scroll horizontally right to left (like a carousel), pausing on hover/touch.

### Modify
- **Toast messages**: Remove all `toast()` / `sonner` calls from the app EXCEPT those triggered directly by register or login actions. Only show toasts for successful registration and successful/failed login.

### Remove
- All non-auth toast calls throughout the app (match request sent, profile saved, story posted, etc.)

## Implementation Plan
1. Create a `NotificationBell` component: polls `getMatchRequests()` and `getMutualMatches()` every 5 seconds, derives notification items (pending requests, new accepted matches), shows unread badge count, renders dropdown list with avatars, timestamps, and notification text.
2. Add `NotificationBell` to the app header (top-right, left of call icon) -- visible on all authenticated screens.
3. In `BrowsePage.tsx`: wrap profile cards in a horizontal scroll container with CSS animation that auto-scrolls right to left, pauses on hover.
4. Audit all files for `toast(` calls -- keep only those inside login/register handlers, remove all others.
