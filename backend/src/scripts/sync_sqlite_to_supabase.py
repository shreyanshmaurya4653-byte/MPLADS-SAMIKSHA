import sqlite3, psycopg2, socket, time
from urllib.parse import urlparse
from psycopg2.extras import execute_values
from pathlib import Path

env_p = Path('backend/.env')
db_url = ''
for line in open(env_p):
    if line.startswith('DATABASE_URL='):
        db_url = line.split('=', 1)[1].strip().strip('\"\'')

p = urlparse(db_url)
hostaddr = socket.gethostbyname(p.hostname)
conn_pg = psycopg2.connect(db_url, hostaddr=hostaddr, sslmode='require', connect_timeout=15)
cur_pg = conn_pg.cursor()

conn_sq = sqlite3.connect('database/mplads.db')
cur_sq = conn_sq.cursor()

# 1. Sync Alerts
cur_sq.execute('SELECT work_id, alert_type, severity, title, description, status FROM alerts')
alerts_tuples = cur_sq.fetchall()
if alerts_tuples:
    execute_values(cur_pg, """
        INSERT INTO public.alerts (work_id, alert_type, severity, title, description, status)
        VALUES %s
    """, alerts_tuples, page_size=1000)
    conn_pg.commit()
    print(f'Synced {len(alerts_tuples)} alerts to Supabase.')

# 2. Check counts in Supabase
for t in ['works', 'risk_assessments', 'expenditures', 'alerts']:
    cur_pg.execute(f'SELECT count(1) FROM public.{t}')
    print(f'Supabase {t}: {cur_pg.fetchone()[0]:,} rows')

conn_sq.close()
conn_pg.close()
