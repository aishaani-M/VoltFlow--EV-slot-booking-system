from flask import Flask, render_template, request, jsonify, session
import sqlite3, hashlib, os, json, random, string
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'voltflow_secret_key_2024'
DATABASE = 'database.db'

# ── DB HELPERS ───────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def hash_pw(pw): return hashlib.sha256(pw.encode()).hexdigest()
def gen_ref(): return 'EV' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def init_db():
    conn = get_db(); c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        phone TEXT, vehicle_type TEXT DEFAULT 'car', vehicle_model TEXT, vehicle_number TEXT,
        role TEXT DEFAULT 'user',
        wallet_points INTEGER DEFAULT 0,
        station_id INTEGER DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, address TEXT NOT NULL, city TEXT NOT NULL,
        state TEXT DEFAULT '', country TEXT DEFAULT 'India',
        lat REAL NOT NULL, lng REAL NOT NULL,
        total_chargers INTEGER DEFAULT 0, available_chargers INTEGER DEFAULT 0,
        rating REAL DEFAULT 4.0, amenities TEXT, image_url TEXT,
        description TEXT DEFAULT '',
        contact_phone TEXT DEFAULT '', contact_email TEXT DEFAULT '',
        operating_hours TEXT DEFAULT '24/7',
        station_type TEXT DEFAULT 'public',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS chargers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL, charger_type TEXT NOT NULL,
        power_kw REAL NOT NULL, price_per_kwh REAL NOT NULL,
        status TEXT DEFAULT 'available',
        FOREIGN KEY (station_id) REFERENCES stations(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL, station_id INTEGER NOT NULL, charger_id INTEGER NOT NULL,
        booking_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL,
        duration_hours REAL NOT NULL, total_amount REAL NOT NULL,
        status TEXT DEFAULT 'upcoming', booking_ref TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (station_id) REFERENCES stations(id),
        FOREIGN KEY (charger_id) REFERENCES chargers(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
        amount REAL NOT NULL, payment_method TEXT NOT NULL,
        status TEXT DEFAULT 'pending', transaction_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL, station_id INTEGER NOT NULL,
        rating INTEGER NOT NULL, comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (station_id) REFERENCES stations(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        points INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        points_required INTEGER NOT NULL DEFAULT 2000,
        discount_percent INTEGER DEFAULT 100,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (station_id) REFERENCES stations(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL,
        name TEXT NOT NULL, email TEXT, phone TEXT,
        role TEXT DEFAULT 'operator',
        shift TEXT DEFAULT 'day',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (station_id) REFERENCES stations(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        model TEXT NOT NULL, number TEXT,
        vehicle_type TEXT DEFAULT 'car',
        color TEXT DEFAULT '',
        is_primary INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    # Migrate existing DB: add missing columns
    try: c.execute("ALTER TABLE users ADD COLUMN vehicle_type TEXT DEFAULT 'car'")
    except: pass
    try: c.execute("ALTER TABLE users ADD COLUMN wallet_points INTEGER DEFAULT 0")
    except: pass
    try: c.execute("ALTER TABLE bookings ADD COLUMN worker_id INTEGER DEFAULT NULL")
    except: pass
    for col, default in [('state',"''"), ('country',"'India'"), ('description',"''"),
                          ('contact_phone',"''"), ('contact_email',"''"),
                          ('operating_hours',"'24/7'"), ('station_type',"'public'")]:
        try: c.execute(f"ALTER TABLE stations ADD COLUMN {col} TEXT DEFAULT {default}")
        except: pass

    conn.commit()
    c.execute("SELECT COUNT(*) FROM users")
    if c.fetchone()[0] == 0:
        _seed(c); conn.commit()
    conn.close()

def _seed(c):
    # Station owner demo — owns station 1
    c.execute("INSERT INTO users (name,email,password,phone,vehicle_model,vehicle_number,role,station_id) VALUES (?,?,?,?,?,?,?,?)",
              ('Station Owner','station@voltflow.com',hash_pw('station123'),'9999999999','','','station_admin',1))
    # Demo EV user
    c.execute("INSERT INTO users (name,email,password,phone,vehicle_model,vehicle_number,role) VALUES (?,?,?,?,?,?,?)",
              ('Demo User','demo@voltflow.com',hash_pw('demo123'),'9876543210','Tata Nexon EV','DL-01-EV-2024','user'))

    stations = [
        ('PowerGrid Station Alpha','Connaught Place, Block A','New Delhi',28.6315,77.2167,8,6,4.8,'["WiFi","Cafe","Restroom","Parking"]'),
        ('GreenCharge Hub Central','Bandra West, Linking Road','Mumbai',19.0596,72.8295,6,4,4.6,'["WiFi","Restaurant","Restroom"]'),
        ('ElectraBay Station','MG Road, Indiranagar','Bengaluru',12.9716,77.6099,10,7,4.9,'["WiFi","Cafe","Shopping","Restroom","Parking"]'),
        ('VoltPoint Express','Anna Nagar, 2nd Avenue','Chennai',13.0827,80.2707,5,3,4.5,'["WiFi","Restroom","Parking"]'),
        ('ChargeZone Hyderabad','HITEC City, Madhapur','Hyderabad',17.4435,78.3772,12,9,4.7,'["WiFi","Cafe","Restroom","Parking","EV Store"]'),
        ('NexCharge Kolkata','Park Street, Theatre Road','Kolkata',22.5573,88.3559,4,2,4.3,'["WiFi","Restroom"]'),
        ('SunCharge Pune','Koregaon Park, Lane 6','Pune',18.5362,73.8927,7,5,4.6,'["WiFi","Cafe","Restroom","Parking"]'),
        ('TurboCharge Ahmedabad','Satellite Road, Jodhpur','Ahmedabad',23.0225,72.5714,6,4,4.4,'["WiFi","Restaurant","Parking"]'),
    ]
    for s in stations:
        c.execute("INSERT INTO stations (name,address,city,lat,lng,total_chargers,available_chargers,rating,amenities) VALUES (?,?,?,?,?,?,?,?,?)", s)

    charger_types = [('CCS',150,18),('CHAdeMO',100,15),('Type 2',22,10),('Tesla',250,22)]
    for sid in range(1, 9):
        for ct in charger_types:
            c.execute("INSERT INTO chargers (station_id,charger_type,power_kw,price_per_kwh,status) VALUES (?,?,?,?,?)",
                      (sid, ct[0], ct[1], ct[2], 'available'))

    # Demo workers for station 1
    workers = [
        ('Rahul Sharma','rahul@voltflow.com','9876500001','operator','day'),
        ('Priya Singh','priya@voltflow.com','9876500002','technician','day'),
        ('Amit Patel','amit@voltflow.com','9876500003','operator','night'),
        ('Sneha Gupta','sneha@voltflow.com','9876500004','supervisor','day'),
    ]
    for w in workers:
        c.execute("INSERT INTO workers (station_id,name,email,phone,role,shift) VALUES (1,?,?,?,?,?)", w)

    # Demo vehicles for user 2 (Demo User)
    c.execute("INSERT INTO vehicles (user_id,model,number,vehicle_type,color,is_primary) VALUES (2,'Tata Nexon EV','DL-01-EV-2024','suv','White',1)")
    c.execute("INSERT INTO vehicles (user_id,model,number,vehicle_type,color,is_primary) VALUES (2,'Ather 450X','DL-05-EQ-7890','scooter','Green',0)")

# ── PAGE ROUTE ───────────────────────────────────────────────────────────────

@app.route('/')
def index(): return render_template('index.html')

@app.route('/preview')
def preview(): return render_template('preview.html')

# ── AUTH ─────────────────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=? AND password=?",
                        (data.get('email',''), hash_pw(data.get('password','')))).fetchone()
    conn.close()
    if user:
        session['user_id'] = user['id']
        session['role']    = user['role']
        session['station_id'] = user['station_id']
        return jsonify({'success': True, 'user': {
            'id': user['id'], 'name': user['name'], 'email': user['email'],
            'role': user['role'], 'station_id': user['station_id']
        }})
    # Demo fallback — any unknown creds → demo user
    conn2 = get_db()
    demo = conn2.execute("SELECT * FROM users WHERE id=2").fetchone()
    conn2.close()
    if demo:
        session['user_id']   = demo['id']
        session['role']      = demo['role']
        session['station_id'] = None
        return jsonify({'success': True, 'user': {
            'id': demo['id'], 'name': demo['name'], 'email': demo['email'],
            'role': demo['role'], 'station_id': None
        }})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    reg_type = data.get('register_type', 'user')
    try:
        conn = get_db()
        if reg_type == 'station':
            # Station owner registration
            conn.execute("INSERT INTO users (name,email,password,phone,role) VALUES (?,?,?,?,?)",
                         (data['name'], data['email'], hash_pw(data['password']),
                          data.get('phone',''), 'station_admin'))
            conn.commit()
            user = conn.execute("SELECT * FROM users WHERE email=?", (data['email'],)).fetchone()
            # Create the station
            conn.execute("""INSERT INTO stations (name,address,city,lat,lng,total_chargers,
                            available_chargers,amenities) VALUES (?,?,?,?,?,0,0,'[]')""",
                         (data.get('station_name','My Station'), data.get('station_address',''),
                          data.get('station_city',''), float(data.get('station_lat',0)),
                          float(data.get('station_lng',0))))
            conn.commit()
            sid = conn.execute("SELECT id FROM stations ORDER BY id DESC LIMIT 1").fetchone()['id']
            conn.execute("UPDATE users SET station_id=? WHERE id=?", (sid, user['id']))
            conn.commit()
            session['user_id'] = user['id']
            session['role'] = 'station_admin'
            session['station_id'] = sid
            conn.close()
            return jsonify({'success': True, 'user': {'id': user['id'], 'name': user['name'],
                            'email': user['email'], 'role': 'station_admin', 'station_id': sid}})
        else:
            # Regular user registration
            vtype = data.get('vehicle_type', 'car')
            conn.execute("""INSERT INTO users (name,email,password,phone,vehicle_type,
                            vehicle_model,vehicle_number) VALUES (?,?,?,?,?,?,?)""",
                         (data['name'], data['email'], hash_pw(data['password']),
                          data.get('phone',''), vtype,
                          data.get('vehicle_model',''), data.get('vehicle_number','')))
            conn.commit()
            user = conn.execute("SELECT * FROM users WHERE email=?", (data['email'],)).fetchone()
            session['user_id'] = user['id']
            session['role'] = 'user'
            session['station_id'] = None
            conn.close()
            return jsonify({'success': True, 'user': {'id': user['id'], 'name': user['name'],
                            'email': user['email'], 'role': 'user', 'station_id': None}})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already exists'}), 400

@app.route('/api/logout', methods=['POST'])
def logout(): session.clear(); return jsonify({'success': True})

@app.route('/api/session')
def check_session():
    if 'user_id' in session:
        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE id=?", (session['user_id'],)).fetchone()
        conn.close()
        if user:
            return jsonify({'logged_in': True, 'user': {
                'id': user['id'], 'name': user['name'], 'email': user['email'],
                'role': user['role'], 'station_id': user['station_id']
            }})
    return jsonify({'logged_in': False})

# ── STATIONS ─────────────────────────────────────────────────────────────────

def _station_row(s, chargers):
    return {
        'id': s['id'], 'name': s['name'], 'address': s['address'],
        'city': s['city'], 'state': s['state'] or '', 'country': s['country'] or 'India',
        'lat': s['lat'], 'lng': s['lng'],
        'total_chargers': s['total_chargers'], 'available_chargers': s['available_chargers'],
        'rating': s['rating'], 'amenities': json.loads(s['amenities'] or '[]'),
        'description': s['description'] or '',
        'contact_phone': s['contact_phone'] or '', 'contact_email': s['contact_email'] or '',
        'operating_hours': s['operating_hours'] or '24/7',
        'station_type': s['station_type'] or 'public',
        'chargers': [{'id': c['id'], 'type': c['charger_type'], 'power_kw': c['power_kw'],
                      'price_per_kwh': c['price_per_kwh'], 'status': c['status']} for c in chargers]
    }

@app.route('/api/stations')
def get_stations():
    conn = get_db()
    charger_type = request.args.get('charger_type')
    city         = request.args.get('city')
    q = "SELECT * FROM stations WHERE status='active'"
    params = []
    if city: q += " AND city LIKE ?"; params.append(f'%{city}%')
    rows = conn.execute(q, params).fetchall()
    result = []
    for s in rows:
        chargers = conn.execute("SELECT * FROM chargers WHERE station_id=?", (s['id'],)).fetchall()
        if charger_type and not any(c['charger_type']==charger_type for c in chargers): continue
        result.append(_station_row(s, chargers))
    conn.close()
    return jsonify(result)

@app.route('/api/stations/<int:sid>')
def get_station(sid):
    conn = get_db()
    s = conn.execute("SELECT * FROM stations WHERE id=?", (sid,)).fetchone()
    if not s: conn.close(); return jsonify({'error':'Not found'}), 404
    chargers = conn.execute("SELECT * FROM chargers WHERE station_id=?", (sid,)).fetchall()
    reviews  = conn.execute("""SELECT r.*, u.name as user_name FROM reviews r
                               JOIN users u ON r.user_id=u.id
                               WHERE r.station_id=? ORDER BY r.created_at DESC""", (sid,)).fetchall()
    conn.close()
    data = _station_row(s, chargers)
    data['reviews'] = [{'id': r['id'], 'user_name': r['user_name'], 'rating': r['rating'],
                         'comment': r['comment'], 'created_at': r['created_at']} for r in reviews]
    return jsonify(data)

@app.route('/api/stations', methods=['POST'])
def add_station():
    if session.get('role') not in ('admin','station_admin'):
        return jsonify({'error':'Unauthorized'}), 403
    data = request.get_json(); conn = get_db()
    conn.execute("""INSERT INTO stations (name,address,city,state,country,lat,lng,
                    total_chargers,available_chargers,amenities,description,
                    contact_phone,contact_email,operating_hours,station_type)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                 (data['name'],data['address'],data['city'],
                  data.get('state',''),data.get('country','India'),
                  data['lat'],data['lng'],
                  data.get('total_chargers',0),data.get('available_chargers',0),
                  json.dumps(data.get('amenities',[])),
                  data.get('description',''),
                  data.get('contact_phone',''),data.get('contact_email',''),
                  data.get('operating_hours','24/7'),data.get('station_type','public')))
    conn.commit()
    sid = conn.execute("SELECT id FROM stations ORDER BY id DESC LIMIT 1").fetchone()['id']
    # Auto-add chargers if provided
    chargers_data = data.get('chargers', [])
    for ch in chargers_data:
        for _ in range(int(ch.get('count', 1))):
            conn.execute("INSERT INTO chargers (station_id,charger_type,power_kw,price_per_kwh) VALUES (?,?,?,?)",
                         (sid, ch['charger_type'], float(ch['power_kw']), float(ch['price_per_kwh'])))
    if chargers_data:
        total = conn.execute("SELECT COUNT(*) FROM chargers WHERE station_id=?", (sid,)).fetchone()[0]
        conn.execute("UPDATE stations SET total_chargers=?,available_chargers=? WHERE id=?", (total,total,sid))
        conn.commit()
    conn.close()
    return jsonify({'success': True, 'station_id': sid})

@app.route('/api/stations/<int:sid>', methods=['PUT'])
def update_station(sid):
    role = session.get('role')
    if role == 'station_admin' and session.get('station_id') != sid:
        return jsonify({'error':'Unauthorized'}), 403
    if role not in ('admin','station_admin'):
        return jsonify({'error':'Unauthorized'}), 403
    data = request.get_json(); conn = get_db()
    conn.execute("""UPDATE stations SET name=?,address=?,city=?,state=?,country=?,
                    available_chargers=?,status=?,description=?,contact_phone=?,
                    contact_email=?,operating_hours=?,station_type=?,amenities=? WHERE id=?""",
                 (data['name'],data['address'],data['city'],
                  data.get('state',''),data.get('country','India'),
                  data.get('available_chargers', 0), data.get('status','active'),
                  data.get('description',''),data.get('contact_phone',''),
                  data.get('contact_email',''),data.get('operating_hours','24/7'),
                  data.get('station_type','public'),
                  json.dumps(data.get('amenities',[])),
                  sid))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/stations/<int:sid>', methods=['DELETE'])
def delete_station(sid):
    if session.get('role') not in ('admin','station_admin'):
        return jsonify({'error':'Unauthorized'}), 403
    conn = get_db()
    conn.execute("UPDATE stations SET status='inactive' WHERE id=?", (sid,))
    conn.commit(); conn.close()
    return jsonify({'success': True})

# ── BOOKINGS ─────────────────────────────────────────────────────────────────

@app.route('/api/bookings')
def get_bookings():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    conn = get_db()
    bookings = conn.execute("""
        SELECT b.*, s.name as station_name, s.city, s.address,
               c.charger_type, c.power_kw, c.price_per_kwh
        FROM bookings b
        JOIN stations s ON b.station_id=s.id
        JOIN chargers c ON b.charger_id=c.id
        WHERE b.user_id=? ORDER BY b.created_at DESC
    """, (session['user_id'],)).fetchall()
    conn.close()
    return jsonify([dict(b) for b in bookings])

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    data = request.get_json(); conn = get_db()
    charger = conn.execute("SELECT * FROM chargers WHERE id=?", (data['charger_id'],)).fetchone()
    if not charger: conn.close(); return jsonify({'error':'Charger not found'}), 404
    duration = float(data['duration_hours'])
    total = round(charger['power_kw'] * charger['price_per_kwh'] * duration / 100 * 10, 2)
    ref = gen_ref()
    conn.execute("""INSERT INTO bookings (user_id,station_id,charger_id,booking_date,
                    start_time,end_time,duration_hours,total_amount,booking_ref)
                    VALUES (?,?,?,?,?,?,?,?,?)""",
                 (session['user_id'],data['station_id'],data['charger_id'],
                  data['booking_date'],data['start_time'],data['end_time'],duration,total,ref))
    conn.execute("UPDATE chargers SET status='booked' WHERE id=?", (data['charger_id'],))
    conn.commit()
    bid = conn.execute("SELECT id FROM bookings WHERE booking_ref=?", (ref,)).fetchone()['id']
    conn.close()
    return jsonify({'success':True,'booking_ref':ref,'total_amount':total,'booking_id':bid})

@app.route('/api/bookings/<int:bid>/cancel', methods=['POST'])
def cancel_booking(bid):
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    conn = get_db()
    booking = conn.execute("SELECT * FROM bookings WHERE id=? AND user_id=?",
                           (bid, session['user_id'])).fetchone()
    if not booking: conn.close(); return jsonify({'error':'Not found'}), 404
    conn.execute("UPDATE bookings SET status='cancelled' WHERE id=?", (bid,))
    conn.execute("UPDATE chargers SET status='available' WHERE id=?", (booking['charger_id'],))
    conn.commit(); conn.close()
    return jsonify({'success': True})

# ── PAYMENTS ─────────────────────────────────────────────────────────────────

@app.route('/api/payments', methods=['POST'])
def process_payment():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    data = request.get_json()
    txn = 'TXN' + ''.join(random.choices(string.digits, k=10)); conn = get_db()
    conn.execute("INSERT INTO payments (booking_id,user_id,amount,payment_method,status,transaction_id) VALUES (?,?,?,?,?,?)",
                 (data['booking_id'],session['user_id'],data['amount'],
                  data.get('payment_method','card'),'success',txn))
    conn.execute("UPDATE bookings SET status='upcoming' WHERE id=?", (data['booking_id'],))
    # Award wallet points based on vehicle type
    user = conn.execute("SELECT vehicle_type, wallet_points FROM users WHERE id=?", (session['user_id'],)).fetchone()
    vtype = user['vehicle_type'] if user else 'car'
    pts = 50 if vtype == 'scooter' else 80
    new_total = (user['wallet_points'] or 0) + pts
    conn.execute("UPDATE users SET wallet_points=? WHERE id=?", (new_total, session['user_id']))
    conn.execute("INSERT INTO wallet_transactions (user_id,points,type,description) VALUES (?,?,?,?)",
                 (session['user_id'], pts, 'earned', f'Booking {data["booking_id"]} – {vtype} charge (+{pts} pts)'))
    conn.commit(); conn.close()
    return jsonify({'success':True,'transaction_id':txn,'points_earned':pts,'total_points':new_total})

# ── PROFILE ───────────────────────────────────────────────────────────────────

@app.route('/api/profile')
def get_profile():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    conn = get_db()
    user = conn.execute("SELECT id,name,email,phone,vehicle_type,vehicle_model,vehicle_number,wallet_points,role,station_id,created_at FROM users WHERE id=?",
                        (session['user_id'],)).fetchone()
    total_bookings = conn.execute("SELECT COUNT(*) FROM bookings WHERE user_id=?", (session['user_id'],)).fetchone()[0]
    total_spent    = conn.execute("SELECT SUM(amount) FROM payments WHERE user_id=? AND status='success'",
                                  (session['user_id'],)).fetchone()[0] or 0
    vehicles = [dict(v) for v in conn.execute("SELECT * FROM vehicles WHERE user_id=? ORDER BY is_primary DESC, created_at DESC",
                                               (session['user_id'],)).fetchall()]
    conn.close()
    return jsonify({**dict(user), 'total_bookings': total_bookings, 'total_spent': round(total_spent, 2), 'vehicles': vehicles})

@app.route('/api/profile', methods=['PUT'])
def update_profile():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    data = request.get_json(); conn = get_db()
    conn.execute("UPDATE users SET name=?,phone=?,vehicle_model=?,vehicle_number=? WHERE id=?",
                 (data['name'],data['phone'],data['vehicle_model'],data['vehicle_number'],session['user_id']))
    conn.commit(); conn.close()
    return jsonify({'success': True})

# ── ADMIN / PLATFORM STATS (accessible by station_admin) ─────────────────────

@app.route('/api/admin/stats')
def admin_stats():
    if session.get('role') not in ('admin','station_admin'):
        return jsonify({'error':'Unauthorized'}), 403
    conn = get_db()
    total_stations  = conn.execute("SELECT COUNT(*) FROM stations WHERE status='active'").fetchone()[0]
    total_users     = conn.execute("SELECT COUNT(*) FROM users WHERE role='user'").fetchone()[0]
    total_bookings  = conn.execute("SELECT COUNT(*) FROM bookings").fetchone()[0]
    total_revenue   = conn.execute("SELECT SUM(amount) FROM payments WHERE status='success'").fetchone()[0] or 0
    recent_bookings = conn.execute("""
        SELECT b.*, u.name as user_name, s.name as station_name
        FROM bookings b JOIN users u ON b.user_id=u.id JOIN stations s ON b.station_id=s.id
        ORDER BY b.created_at DESC LIMIT 10""").fetchall()
    all_stations = conn.execute("SELECT * FROM stations WHERE status='active'").fetchall()
    stations_list = []
    for s in all_stations:
        chargers = conn.execute("SELECT * FROM chargers WHERE station_id=?", (s['id'],)).fetchall()
        stations_list.append(_station_row(s, chargers))
    conn.close()
    return jsonify({'total_stations': total_stations, 'total_users': total_users,
                    'total_bookings': total_bookings, 'total_revenue': round(total_revenue,2),
                    'recent_bookings': [dict(b) for b in recent_bookings],
                    'all_stations': stations_list})

# ── STATION ADMIN APIs ────────────────────────────────────────────────────────

@app.route('/api/station-admin/stats')
def station_admin_stats():
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    sid = session.get('station_id')
    if not sid: return jsonify({'error':'No station assigned'}), 400
    conn = get_db()
    station   = conn.execute("SELECT * FROM stations WHERE id=?", (sid,)).fetchone()
    chargers  = conn.execute("SELECT * FROM chargers WHERE station_id=?", (sid,)).fetchall()
    bookings  = conn.execute("""
        SELECT b.*, u.name as user_name, c.charger_type
        FROM bookings b
        JOIN users u ON b.user_id=u.id
        JOIN chargers c ON b.charger_id=c.id
        WHERE b.station_id=? ORDER BY b.created_at DESC""", (sid,)).fetchall()
    revenue   = conn.execute("""SELECT SUM(p.amount) FROM payments p
                                JOIN bookings b ON p.booking_id=b.id
                                WHERE b.station_id=? AND p.status='success'""", (sid,)).fetchone()[0] or 0
    total_bk  = len(bookings)
    upcoming  = sum(1 for b in bookings if b['status']=='upcoming')
    completed = sum(1 for b in bookings if b['status']=='completed')
    cancelled = sum(1 for b in bookings if b['status']=='cancelled')

    # Revenue by day (last 7 days)
    daily = conn.execute("""
        SELECT DATE(p.created_at) as day, SUM(p.amount) as total
        FROM payments p JOIN bookings b ON p.booking_id=b.id
        WHERE b.station_id=? AND p.status='success'
          AND p.created_at >= DATE('now','-7 days')
        GROUP BY day ORDER BY day""", (sid,)).fetchall()

    conn.close()
    return jsonify({
        'station': _station_row(station, chargers),
        'total_bookings': total_bk,
        'upcoming': upcoming, 'completed': completed, 'cancelled': cancelled,
        'revenue': round(revenue, 2),
        'daily_revenue': [{'day': r['day'], 'total': r['total']} for r in daily],
        'bookings': [dict(b) for b in bookings[:20]],
        'chargers': [{'id': c['id'], 'type': c['charger_type'], 'power_kw': c['power_kw'],
                      'price_per_kwh': c['price_per_kwh'], 'status': c['status']} for c in chargers]
    })

@app.route('/api/station-admin/chargers', methods=['POST'])
def add_charger():
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    sid  = session.get('station_id')
    data = request.get_json(); conn = get_db()
    conn.execute("INSERT INTO chargers (station_id,charger_type,power_kw,price_per_kwh) VALUES (?,?,?,?)",
                 (sid, data['charger_type'], data['power_kw'], data['price_per_kwh']))
    total = conn.execute("SELECT COUNT(*) FROM chargers WHERE station_id=?", (sid,)).fetchone()[0]
    avail = conn.execute("SELECT COUNT(*) FROM chargers WHERE station_id=? AND status='available'", (sid,)).fetchone()[0]
    conn.execute("UPDATE stations SET total_chargers=?,available_chargers=? WHERE id=?", (total,avail,sid))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/station-admin/chargers/<int:cid>', methods=['DELETE'])
def remove_charger(cid):
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    sid = session.get('station_id'); conn = get_db()
    conn.execute("DELETE FROM chargers WHERE id=? AND station_id=?", (cid, sid))
    total = conn.execute("SELECT COUNT(*) FROM chargers WHERE station_id=?", (sid,)).fetchone()[0]
    avail = conn.execute("SELECT COUNT(*) FROM chargers WHERE station_id=? AND status='available'", (sid,)).fetchone()[0]
    conn.execute("UPDATE stations SET total_chargers=?,available_chargers=? WHERE id=?", (total,avail,sid))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/station-admin/create-station', methods=['POST'])
def station_admin_create_station():
    """Allow a station_admin who doesn't have a station yet to create one from their dashboard."""
    if session.get('role') != 'station_admin':
        return jsonify({'error':'Unauthorized'}), 403
    if session.get('station_id'):
        return jsonify({'error':'You already have a station'}), 400
    data = request.get_json(); conn = get_db()
    conn.execute("""INSERT INTO stations (name,address,city,state,country,lat,lng,
                    total_chargers,available_chargers,amenities,description,
                    contact_phone,contact_email,operating_hours,station_type)
                    VALUES (?,?,?,?,?,?,?,0,0,?,?,?,?,?,?)""",
                 (data['name'],data['address'],data['city'],
                  data.get('state',''),data.get('country','India'),
                  float(data.get('lat',0)),float(data.get('lng',0)),
                  json.dumps(data.get('amenities',[])),
                  data.get('description',''),
                  data.get('contact_phone',''),data.get('contact_email',''),
                  data.get('operating_hours','24/7'),data.get('station_type','public')))
    conn.commit()
    sid = conn.execute("SELECT id FROM stations ORDER BY id DESC LIMIT 1").fetchone()['id']
    # Add chargers
    chargers_data = data.get('chargers', [])
    for ch in chargers_data:
        for _ in range(int(ch.get('count', 1))):
            conn.execute("INSERT INTO chargers (station_id,charger_type,power_kw,price_per_kwh) VALUES (?,?,?,?)",
                         (sid, ch['charger_type'], float(ch['power_kw']), float(ch['price_per_kwh'])))
    total = conn.execute("SELECT COUNT(*) FROM chargers WHERE station_id=?", (sid,)).fetchone()[0]
    avail = conn.execute("SELECT COUNT(*) FROM chargers WHERE station_id=? AND status='available'", (sid,)).fetchone()[0]
    conn.execute("UPDATE stations SET total_chargers=?,available_chargers=? WHERE id=?", (total,avail,sid))
    conn.execute("UPDATE users SET station_id=? WHERE id=?", (sid, session['user_id']))
    conn.commit()
    session['station_id'] = sid
    conn.close()
    return jsonify({'success': True, 'station_id': sid})

# ── STATION BOOKING MANAGEMENT ───────────────────────────────────────────────

@app.route('/api/station-admin/bookings/<int:bid>/accept', methods=['POST'])
def accept_booking(bid):
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    conn = get_db()
    conn.execute("UPDATE bookings SET status='upcoming' WHERE id=?", (bid,))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/station-admin/bookings/<int:bid>/complete', methods=['POST'])
def complete_booking(bid):
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    conn = get_db()
    booking = conn.execute("SELECT * FROM bookings WHERE id=?", (bid,)).fetchone()
    if booking:
        conn.execute("UPDATE bookings SET status='completed' WHERE id=?", (bid,))
        conn.execute("UPDATE chargers SET status='available' WHERE id=?", (booking['charger_id'],))
        sid = booking['station_id']
        avail = conn.execute("SELECT COUNT(*) FROM chargers WHERE station_id=? AND status='available'", (sid,)).fetchone()[0]
        conn.execute("UPDATE stations SET available_chargers=? WHERE id=?", (avail, sid))
    conn.commit(); conn.close()
    return jsonify({'success': True})

# ── REVIEWS ───────────────────────────────────────────────────────────────────

@app.route('/api/reviews', methods=['POST'])
def add_review():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    data = request.get_json(); conn = get_db()
    conn.execute("INSERT INTO reviews (user_id,station_id,rating,comment) VALUES (?,?,?,?)",
                 (session['user_id'],data['station_id'],data['rating'],data.get('comment','')))
    avg = conn.execute("SELECT AVG(rating) FROM reviews WHERE station_id=?", (data['station_id'],)).fetchone()[0]
    conn.execute("UPDATE stations SET rating=? WHERE id=?", (round(avg,1), data['station_id']))
    conn.commit(); conn.close()
    return jsonify({'success': True})

# ── WALLET ────────────────────────────────────────────────────────────────────

@app.route('/api/wallet')
def get_wallet():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    conn = get_db()
    user = conn.execute("SELECT wallet_points, vehicle_type FROM users WHERE id=?", (session['user_id'],)).fetchone()
    txns = conn.execute("SELECT * FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
                        (session['user_id'],)).fetchall()
    offers = conn.execute("""SELECT o.*, s.name as station_name FROM offers o
                            JOIN stations s ON o.station_id=s.id
                            WHERE o.is_active=1 ORDER BY o.points_required""").fetchall()
    conn.close()
    pts_per_charge = 50 if (user['vehicle_type'] or 'car') == 'scooter' else 80
    return jsonify({
        'points': user['wallet_points'] or 0,
        'vehicle_type': user['vehicle_type'] or 'car',
        'pts_per_charge': pts_per_charge,
        'transactions': [dict(t) for t in txns],
        'offers': [dict(o) for o in offers]
    })

@app.route('/api/wallet/redeem', methods=['POST'])
def redeem_offer():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    data = request.get_json(); conn = get_db()
    offer = conn.execute("SELECT * FROM offers WHERE id=? AND is_active=1", (data['offer_id'],)).fetchone()
    if not offer: conn.close(); return jsonify({'error':'Offer not found'}), 404
    user = conn.execute("SELECT wallet_points FROM users WHERE id=?", (session['user_id'],)).fetchone()
    if (user['wallet_points'] or 0) < offer['points_required']:
        conn.close(); return jsonify({'error':'Not enough points'}), 400
    new_pts = user['wallet_points'] - offer['points_required']
    conn.execute("UPDATE users SET wallet_points=? WHERE id=?", (new_pts, session['user_id']))
    conn.execute("INSERT INTO wallet_transactions (user_id,points,type,description) VALUES (?,?,?,?)",
                 (session['user_id'], -offer['points_required'], 'redeemed', f'Redeemed: {offer["title"]}'))
    conn.commit(); conn.close()
    return jsonify({'success': True, 'remaining_points': new_pts})

# ── STATION OFFERS ────────────────────────────────────────────────────────────

@app.route('/api/station-admin/offers')
def get_station_offers():
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    sid = session.get('station_id')
    conn = get_db()
    offers = conn.execute("SELECT * FROM offers WHERE station_id=? ORDER BY created_at DESC", (sid,)).fetchall()
    conn.close()
    return jsonify([dict(o) for o in offers])

@app.route('/api/station-admin/offers', methods=['POST'])
def create_offer():
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    sid = session.get('station_id'); data = request.get_json(); conn = get_db()
    conn.execute("INSERT INTO offers (station_id,title,description,points_required,discount_percent) VALUES (?,?,?,?,?)",
                 (sid, data['title'], data.get('description',''),
                  int(data.get('points_required',2000)), int(data.get('discount_percent',100))))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/station-admin/offers/<int:oid>', methods=['DELETE'])
def delete_offer(oid):
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    conn = get_db()
    conn.execute("DELETE FROM offers WHERE id=? AND station_id=?", (oid, session.get('station_id')))
    conn.commit(); conn.close()
    return jsonify({'success': True})

# ── WORKERS ──────────────────────────────────────────────────────────────────

@app.route('/api/station-admin/workers')
def get_workers():
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    sid = session.get('station_id')
    if not sid: return jsonify([])  
    conn = get_db()
    workers = conn.execute("SELECT * FROM workers WHERE station_id=? ORDER BY created_at DESC", (sid,)).fetchall()
    result = []
    for w in workers:
        # Stats per worker
        handled = conn.execute("SELECT COUNT(*) FROM bookings WHERE station_id=? AND worker_id=?", (sid, w['id'])).fetchone()[0]
        revenue = conn.execute("""SELECT COALESCE(SUM(p.amount),0) FROM payments p
                                  JOIN bookings b ON p.booking_id=b.id
                                  WHERE b.station_id=? AND b.worker_id=? AND p.status='success'""",
                               (sid, w['id'])).fetchone()[0]
        completed = conn.execute("SELECT COUNT(*) FROM bookings WHERE station_id=? AND worker_id=? AND status='completed'",
                                 (sid, w['id'])).fetchone()[0]
        result.append({**dict(w), 'bookings_handled': handled, 'revenue': round(revenue,2), 'completed': completed})
    conn.close()
    return jsonify(result)

@app.route('/api/station-admin/workers', methods=['POST'])
def add_worker():
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    sid = session.get('station_id'); data = request.get_json(); conn = get_db()
    conn.execute("INSERT INTO workers (station_id,name,email,phone,role,shift) VALUES (?,?,?,?,?,?)",
                 (sid, data['name'], data.get('email',''), data.get('phone',''),
                  data.get('role','operator'), data.get('shift','day')))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/station-admin/workers/<int:wid>', methods=['PUT'])
def update_worker(wid):
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    data = request.get_json(); conn = get_db()
    conn.execute("UPDATE workers SET name=?,email=?,phone=?,role=?,shift=?,status=? WHERE id=? AND station_id=?",
                 (data['name'],data.get('email',''),data.get('phone',''),
                  data.get('role','operator'),data.get('shift','day'),
                  data.get('status','active'), wid, session.get('station_id')))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/station-admin/workers/<int:wid>', methods=['DELETE'])
def delete_worker(wid):
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    conn = get_db()
    conn.execute("DELETE FROM workers WHERE id=? AND station_id=?", (wid, session.get('station_id')))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/station-admin/bookings/<int:bid>/assign', methods=['POST'])
def assign_booking(bid):
    if session.get('role') not in ('station_admin','admin'):
        return jsonify({'error':'Unauthorized'}), 403
    data = request.get_json(); conn = get_db()
    conn.execute("UPDATE bookings SET worker_id=? WHERE id=? AND station_id=?",
                 (data['worker_id'], bid, session.get('station_id')))
    conn.commit(); conn.close()
    return jsonify({'success': True})

# ── VEHICLES ─────────────────────────────────────────────────────────────────

@app.route('/api/vehicles')
def get_vehicles():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    conn = get_db()
    vehicles = [dict(v) for v in conn.execute("SELECT * FROM vehicles WHERE user_id=? ORDER BY is_primary DESC, created_at DESC",
                                               (session['user_id'],)).fetchall()]
    conn.close()
    return jsonify(vehicles)

@app.route('/api/vehicles', methods=['POST'])
def add_vehicle():
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    data = request.get_json(); conn = get_db()
    # If first vehicle, make it primary
    count = conn.execute("SELECT COUNT(*) FROM vehicles WHERE user_id=?", (session['user_id'],)).fetchone()[0]
    is_primary = 1 if count == 0 else (1 if data.get('is_primary') else 0)
    if is_primary:
        conn.execute("UPDATE vehicles SET is_primary=0 WHERE user_id=?", (session['user_id'],))
    conn.execute("INSERT INTO vehicles (user_id,model,number,vehicle_type,color,is_primary) VALUES (?,?,?,?,?,?)",
                 (session['user_id'], data['model'], data.get('number',''),
                  data.get('vehicle_type','car'), data.get('color',''), is_primary))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/vehicles/<int:vid>', methods=['DELETE'])
def delete_vehicle(vid):
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    conn = get_db()
    conn.execute("DELETE FROM vehicles WHERE id=? AND user_id=?", (vid, session['user_id']))
    # If deleted was primary, promote next one
    remaining = conn.execute("SELECT id FROM vehicles WHERE user_id=? ORDER BY created_at ASC LIMIT 1",
                              (session['user_id'],)).fetchone()
    if remaining:
        conn.execute("UPDATE vehicles SET is_primary=1 WHERE id=?", (remaining['id'],))
    conn.commit(); conn.close()
    return jsonify({'success': True})

@app.route('/api/vehicles/<int:vid>/primary', methods=['POST'])
def set_primary_vehicle(vid):
    if 'user_id' not in session: return jsonify({'error':'Unauthorized'}), 401
    conn = get_db()
    conn.execute("UPDATE vehicles SET is_primary=0 WHERE user_id=?", (session['user_id'],))
    conn.execute("UPDATE vehicles SET is_primary=1 WHERE id=? AND user_id=?", (vid, session['user_id']))
    conn.commit(); conn.close()
    return jsonify({'success': True})

init_db()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
