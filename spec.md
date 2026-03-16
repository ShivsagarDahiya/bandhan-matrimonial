# Bandhan Matrimonial

## Current State
Authentication via Internet Identity is failing with "unexpected token" errors on page load due to two bugs:
1. `useEffect` has `authClient` in its dependency array, causing re-initialization loop
2. `derivationOrigin` not passed at login time
3. Corrupted localStorage delegation tokens not being cleared on auth errors

## Requested Changes (Diff)

### Add
- Try/catch around `isAuthenticated()` call to catch "unexpected token" / JSON parse errors from corrupted stored delegation
- Auto-clear corrupted II localStorage keys when auth check fails
- Cache `derivationOrigin` in a ref, pass it at login time

### Modify
- `useInternetIdentity.ts`: useEffect now uses empty deps `[]` + `initializedRef` to ensure single initialization
- `login()`: reads `derivationOriginRef.current` and passes it in `AuthClientLoginOptions`
- `handleLoginSuccess`: takes the client as param to avoid stale closure

### Remove
- `authClient` from useEffect dependency array (was causing re-init loop)

## Implementation Plan
- Fix useInternetIdentity.ts with all three changes above
