#!/bin/sh
set -eu
cd /home/llai/bible-baseball
docker compose exec -T app node scripts/backup.mjs
if ! crontab -l 2>/dev/null | grep -q '# bible-baseball-backup'; then
  { crontab -l 2>/dev/null || true; printf '%s\n' '20 19 * * * cd /home/llai/bible-baseball && /usr/bin/docker compose exec -T app node scripts/backup.mjs >> /home/llai/bible-baseball/data/backup.log 2>&1 # bible-baseball-backup'; } | crontab -
fi
echo 'Backup tested; daily backup scheduled (19:20 server time).'
