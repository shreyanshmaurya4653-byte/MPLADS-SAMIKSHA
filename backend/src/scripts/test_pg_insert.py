import os, sys, time, socket
import psycopg2
from psycopg2.extras import execute_values
from urllib.parse import urlparse
from pathlib import Path

env_p = Path('backend/.env')
db_url = ''
for line in open(env_p):
    if line.startswith('DATABASE_URL='):
        db_url = line.split('=', 1)[1].strip().strip('\"\'')

p = urlparse(db_url)
print('Resolving host:', p.hostname)
hostaddr = socket.gethostbyname(p.hostname)
print('Resolved IPv4:', hostaddr)

t0 = time.time()
conn = psycopg2.connect(db_url, hostaddr=hostaddr, sslmode='require', connect_timeout=10)
print(f'Connected to Supabase in {time.time()-t0:.2f}s')

cur = conn.cursor()
cur.execute("""
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'public.works'::regclass
""")
print('Constraints on works:')
for r in cur.fetchall():
    print(' ', r)

cur.execute("""
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'public.projects'::regclass
""")
print('Constraints on projects:')
for r in cur.fetchall():
    print(' ', r)

conn.close()
