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

# Read 5000 works from SQLite
conn_sq = sqlite3.connect('database/mplads.db')
cur_sq = conn_sq.cursor()
cur_sq.execute('''
    SELECT id, title, description, category, constituency_id, district_id, state_id,
           implementing_agency, estimated_cost, sanctioned_amount, released_amount,
           expenditure, physical_progress, payment_utilization, start_date, expected_completion,
           status, house_type, mp_name
    FROM works LIMIT 5000
''')
works_tuples = cur_sq.fetchall()

cur_sq.execute('''
    SELECT work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
           progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
    FROM risk_assessments LIMIT 5000
''')
risks_tuples = cur_sq.fetchall()
conn_sq.close()

print(f'Fetched {len(works_tuples)} works from SQLite cache.')

t0 = time.time()
insert_works_sql = '''
    INSERT INTO public.works (
        id, title, description, category, constituency_id, district_id, state_id,
        implementing_agency, estimated_cost, sanctioned_amount, released_amount,
        expenditure, physical_progress, payment_utilization, start_date, expected_completion,
        status, house_type, mp_name
    ) VALUES %s
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        state_id = EXCLUDED.state_id,
        sanctioned_amount = EXCLUDED.sanctioned_amount;
'''
execute_values(cur_pg, insert_works_sql, works_tuples, page_size=2500)

insert_risks_sql = '''
    INSERT INTO public.risk_assessments (
        work_id, risk_score, risk_level, delay_probability, cost_overrun_risk,
        progress_gap_score, agency_concentration_score, duplicate_risk_score, recommendations
    ) VALUES %s
    ON CONFLICT (work_id) DO UPDATE SET
        risk_score = EXCLUDED.risk_score,
        risk_level = EXCLUDED.risk_level;
'''
execute_values(cur_pg, insert_risks_sql, risks_tuples, page_size=2500)

conn_pg.commit()
print(f'✔ Inserted {len(works_tuples)} works + risks to Supabase in {time.time()-t0:.2f}s!')

cur_pg.execute('SELECT count(1) FROM public.works')
print('Total works in Supabase:', cur_pg.fetchone()[0])
conn_pg.close()
