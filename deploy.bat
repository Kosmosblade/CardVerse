@echo off
git add src/pages/DeckBuilder.jsx
git commit -m "feat(deckbuilder): send fetched card info to Discord webhook"
git push origin main
vercel --prod
pause
