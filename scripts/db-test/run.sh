#!/usr/bin/env bash
# Every migration, the seed, and the behaviour tests, on a throwaway Postgres.
#
#   bash scripts/db-test/run.sh
#
# Needs a local Postgres 15+ (initdb, pg_ctl, psql on PATH or in PGBIN). Nothing
# touches a real project: the cluster lives in a temp directory and is deleted
# afterwards. Supabase's own pieces are stubbed — see stubs.sql.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"
bin="${PGBIN:-$(pg_config --bindir 2>/dev/null || echo /usr/lib/postgresql/16/bin)}"
work="$(mktemp -d)"
port="${PGPORT_TEST:-54329}"

# initdb refuses to run as root; so does every sensible database.
as=""
if [ "$(id -u)" = "0" ]; then
  as="runuser -u postgres --"
  chown postgres "$work"
fi

cleanup() { $as "$bin/pg_ctl" -D "$work/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT

$as "$bin/initdb" -D "$work/data" -U postgres -A trust >/dev/null
$as "$bin/pg_ctl" -D "$work/data" -o "-p $port -k $work -c listen_addresses=''" -l "$work/log" start >/dev/null

psql() { $as "$bin/psql" -h "$work" -p "$port" -U postgres -d basic -v ON_ERROR_STOP=1 -q "$@"; }
$as "$bin/createdb" -h "$work" -p "$port" -U postgres basic

cp "$here/stubs.sql" "$work/stubs.sql" && chmod a+r "$work/stubs.sql"
psql -f "$work/stubs.sql"

for migration in "$root"/supabase/migrations/*.sql; do
  # The two extensions are stubbed as schemas; creating the real ones would fail.
  sed -e 's/^create extension if not exists pg_cron;//' \
      -e 's/^create extension if not exists pg_net;//' "$migration" > "$work/m.sql"
  chmod a+r "$work/m.sql"
  if psql -f "$work/m.sql" >/dev/null 2>"$work/err"; then
    echo "  ok   $(basename "$migration")"
  else
    echo "  FAIL $(basename "$migration")"; cat "$work/err"; exit 1
  fi
done

cp "$root/supabase/seed.sql" "$work/seed.sql" && chmod a+r "$work/seed.sql"
if psql -f "$work/seed.sql" >/dev/null 2>"$work/err"; then echo "  ok   seed.sql"; else echo "  FAIL seed.sql"; cat "$work/err"; exit 1; fi

cp "$here/tests.sql" "$work/tests.sql" && chmod a+r "$work/tests.sql"
echo
psql -f "$work/tests.sql" > "$work/out" 2>&1 || true
sed -e 's/^psql:[^:]*:[0-9]*: //' -e 's/^NOTICE:  //' "$work/out" | grep -v -e '^ *create_secret' -e '^-*$' -e '^ [0-9a-f-]\{36\}$' -e '^(1 row)$'

passed=$(grep -c '  ok   ' "$work/out" || true)
failed=$(grep -c -e '  FAIL ' -e 'ERROR:' "$work/out" || true)
echo
if [ "$failed" = "0" ]; then echo "all $passed checks passed"; else echo "$failed failed, $passed passed"; exit 1; fi
