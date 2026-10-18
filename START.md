# Jak zacząć (dla Hani)

1. Rozpakuj ten folder tam, gdzie ma być projekt (np. `~/Projekty/ogarnij-zycie`).
2. W terminalu wejdź do folderu i zrób z niego repozytorium:
   ```
   cd ~/Projekty/ogarnij-zycie
   git init
   git add .
   git commit -m "Plan i projekt aplikacji"
   ```
3. Uruchom Claude Code w tym folderze: `claude`
4. Napisz pierwszą wiadomość:

   > Przeczytaj CLAUDE.md, docs/PLAN.md i docs/DESIGN.md. Zaczynamy etap 0. Najpierw powiedz, co zrobisz w tym etapie i czego potrzebujesz ode mnie w Firebase.

Claude sam zatrzyma się na końcu etapu i poprosi o sprawdzenie. Kolejny etap zaczyna się dopiero, gdy napiszesz „akceptuję”.
