# bird.fast as X Fetcher

We use bird.fast (@steipete/bird) CLI for fetching bookmarks from X/Twitter. It talks to X's private GraphQL endpoints using browser session cookies — free, no API key needed, but fragile (undocumented API can break anytime). Chosen over X API v2 ($100/mo) and manual export for zero-cost, near-real-time fetching. Breakage risk is acceptable for a personal tool.
