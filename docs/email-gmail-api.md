# Mail via de Gmail-API instellen

Railway's Hobby-abonnement blokkeert SMTP, maar de Gmail-API werkt over HTTPS en verstuurt
als pokemonmarketintel@gmail.com zelf. De backend en analysis gebruiken de API zodra
`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` en `GMAIL_REFRESH_TOKEN` gezet zijn; anders vallen ze
terug op SMTP. Limiet: ongeveer 500 mails per dag (gewoon Gmail-account).

Eenmalig, ingelogd als **pokemonmarketintel@gmail.com** (ongeveer 10 minuten):

## 1. Google Cloud-project en Gmail-API
1. Ga naar https://console.cloud.google.com en maak een project, bijvoorbeeld "TCG Pulse Mail".
2. Menu → **APIs en services → Bibliotheek**, zoek **Gmail API** en klik **Inschakelen**.

## 2. Toestemmingsscherm (Google Auth Platform)
1. Menu → **Google Auth Platform** (heette eerder "OAuth-toestemmingsscherm") → **Aan de slag**.
2. App-naam "TCG Pulse", ondersteunings-e-mail pokemonmarketintel@gmail.com.
3. Doelgroep: **Extern**. Contactgegevens: hetzelfde adres. Akkoord en **Maken**.
4. Tab **Doelgroep** → **App publiceren** (status wordt "In productie").
   Belangrijk: in de status "Testen" verloopt de refresh-token na 7 dagen en stopt de mail.
   Google vraagt geen verificatie zolang alleen jij inlogt; je ziet straks wel een waarschuwing.

## 3. OAuth-client
1. Tab **Clients** → **Client maken**. Type: **Webapplicatie**, naam "TCG Pulse".
2. Bij **Geautoriseerde omleidings-URI's**: `https://developers.google.com/oauthplayground`
3. **Maken**. Kopieer de **Client-ID** en het **Clientgeheim** (bewaar ze even, niet delen).

## 4. Refresh-token ophalen
1. Ga naar https://developers.google.com/oauthplayground
2. Tandwiel rechtsboven → vink **Use your own OAuth credentials** aan → vul Client-ID en
   Clientgeheim in.
3. Links bij "Step 1", typ in het vak onderaan: `https://www.googleapis.com/auth/gmail.send`
   → **Authorize APIs**.
4. Log in met pokemonmarketintel@gmail.com. Bij "Google heeft deze app niet geverifieerd":
   **Geavanceerd → Ga naar TCG Pulse (onveilig)** (het is je eigen app) → **Doorgaan**.
5. "Step 2" → **Exchange authorization code for tokens** → kopieer de **Refresh token**.

## 5. In Railway zetten
Bij **pokemon-market-intel** (backend) én **analysis**, tab Variables:
- `GMAIL_CLIENT_ID` = Client-ID
- `GMAIL_CLIENT_SECRET` = Clientgeheim
- `GMAIL_REFRESH_TOKEN` = Refresh token

Railway rolt de services dan opnieuw uit. Testen: "Wachtwoord vergeten?" op de inlogpagina.
In de backend-logs staat dan "Email sent via Gmail API".

## Als het stopt
- `invalid_grant` in de logs: de token is ingetrokken of verlopen (app stond nog op "Testen",
  of het Google-wachtwoord is gewijzigd). Herhaal stap 4 en vervang `GMAIL_REFRESH_TOKEN`.
- Intrekken kan altijd via https://myaccount.google.com/permissions
