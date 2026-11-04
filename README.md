# Sweet Race — Convite da Maria Heloísa

Convite game estático (HTML + CSS + JS, sem build). Publique a raiz do repositório (GitHub Pages, Netlify, Vercel…) e abra `index.html`.

## Fluxo
Capa → vídeo de abertura → Candy Match → Sweet Factory → Candy Kart Race → "Você conseguiu!" → vídeo do envelope → informações → presentes.

## Configurar (topo de `js/app.js`)
- `SR.config.rsvp.whatsapp` — número com DDI+DDD, só dígitos (ex.: `5585999999999`). As confirmações chegam por WhatsApp.
- `SR.config.local.mapa` — link exato do endereço no Google Maps (hoje faz busca por "Buffet Encanto Mágico").
- `SR.config.music` — caminho da música (`assets/musica.mp3`).
- `ORDER` — ordem dos jogos.

## Ajustes dos jogos
- `js/match.js`: `GOAL` (pontos) e `MOVES` (jogadas)
- `js/factory.js`: `GOAL` (doces), `TIME` (segundos)
- `js/race.js`: `LENGTH` (comprimento), `BASE` (velocidade)

Atalhos para testar: `index.html#match`, `#factory`, `#race`, `#found`, `#env`, `#info`, `#gifts`.
