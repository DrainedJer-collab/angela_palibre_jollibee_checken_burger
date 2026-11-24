import bcrypt from 'bcryptjs';
import { db, initializeSchema } from './connection.js';

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addDaysTimestamp(base: Date, days: number, timeStr = '09:00:00'): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return `${d.toISOString().slice(0, 10)} ${timeStr}`;
}

export function seedDatabase(forceReset = false): void {
  initializeSchema();

  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count > 0 && !forceReset) {
    return;
  }

  const runSeed = db.transaction(() => {
    if (forceReset) {
      db.exec(`
        DELETE FROM passengers;
        DELETE FROM bookings;
        DELETE FROM feedback;
        DELETE FROM announcements;
        DELETE FROM trips;
        DELETE FROM boats;
        DELETE FROM operators;
        DELETE FROM safety_guidelines;
        DELETE FROM settings;
        DELETE FROM users;
        DELETE FROM sqlite_sequence;
      `);
    }

    const today = new Date();

    // 1. Settings
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      'peak_day_threshold',
      '65'
    );

    // 2. Users (visitor, operators, admin)
    const visitorHash = bcrypt.hashSync('Visitor123!', 10);
    const operatorHash = bcrypt.hashSync('Operator123!', 10);
    const adminHash = bcrypt.hashSync('Admin123!', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const visitor1Id = Number(
      insertUser.run(
        'Camille Mendoza',
        'visitor@tingloy.ph',
        '0917-555-0101',
        visitorHash,
        'visitor',
        addDaysTimestamp(today, -18)
      ).lastInsertRowid
    );
    const visitor2Id = Number(
      insertUser.run(
        'Rafael Dizon',
        'rafael.dizon@example.ph',
        '0918-555-0144',
        visitorHash,
        'visitor',
        addDaysTimestamp(today, -12)
      ).lastInsertRowid
    );
    const visitor3Id = Number(
      insertUser.run(
        'Tricia Villanueva',
        'tricia.v@example.ph',
        '0927-555-0188',
        visitorHash,
        'visitor',
        addDaysTimestamp(today, -7)
      ).lastInsertRowid
    );

    const opUser1Id = Number(
      insertUser.run(
        'Capt. Mateo Alvarez',
        'operator@tingloy.ph',
        '0917-821-4401',
        operatorHash,
        'operator',
        addDaysTimestamp(today, -45)
      ).lastInsertRowid
    );
    const opUser2Id = Number(
      insertUser.run(
        'Elena Macalalad',
        'sanjuan.coop@tingloy.ph',
        '0918-402-7712',
        operatorHash,
        'operator',
        addDaysTimestamp(today, -40)
      ).lastInsertRowid
    );
    const opUser3Id = Number(
      insertUser.run(
        'Capt. Danilo Reyes',
        'anilao.express@tingloy.ph',
        '0920-915-3309',
        operatorHash,
        'operator',
        addDaysTimestamp(today, -35)
      ).lastInsertRowid
    );
    const opUser4Id = Number(
      insertUser.run(
        'Marco Bautista',
        'maricaban.sunrise@tingloy.ph',
        '0915-773-2094',
        operatorHash,
        'operator',
        addDaysTimestamp(today, -3)
      ).lastInsertRowid
    );

    const adminId = Number(
      insertUser.run(
        'Hon. Lauro Alvarez (Tourism Office)',
        'admin@tingloy.ph',
        '(043) 406-8800',
        adminHash,
        'admin',
        addDaysTimestamp(today, -60)
      ).lastInsertRowid
    );

    // 3. Operators (3 verified, 1 pending)
    const insertOp = db.prepare(`
      INSERT INTO operators (user_id, business_name, owner_name, contact_number, port_location, permit_number, description, verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const op1Id = Number(
      insertOp.run(
        opUser1Id,
        'Masasa Wave Sea Transport',
        'Capt. Mateo Alvarez',
        '0917-821-4401',
        'Mabini Port (Anilao) & Brgy. San Juan Landing',
        'MARINA-BTG-2026-014',
        'Family-run licensed passenger banca fleet serving Mabini Port to Barangay San Juan and Masasa Beach since 2016 with certified life vests and VHF marine radio.',
        1,
        addDaysTimestamp(today, -45)
      ).lastInsertRowid
    );

    const op2Id = Number(
      insertOp.run(
        opUser2Id,
        'San Juan Island Hopper Coop',
        'Elena Macalalad',
        '0918-402-7712',
        'Mabini Port (Talaga) & Tingloy Port',
        'MARINA-BTG-2026-028',
        'Barangay San Juan community boat cooperative providing equitable livelihood trips, scheduled island shuttles, and coastal clean-up support.',
        1,
        addDaysTimestamp(today, -40)
      ).lastInsertRowid
    );

    const op3Id = Number(
      insertOp.run(
        opUser3Id,
        'Anilao–Tingloy Outrigger Express',
        'Capt. Danilo Reyes',
        '0920-915-3309',
        'Mabini Port (Anilao) Pier 2',
        'MARINA-BTG-2026-033',
        'Twin-engine double-outrigger passenger vessels offering punctual morning and afternoon crossings between Anilao and Tingloy.',
        1,
        addDaysTimestamp(today, -35)
      ).lastInsertRowid
    );

    const op4Id = Number(
      insertOp.run(
        opUser4Id,
        'Maricaban Sunrise Boat Services',
        'Marco Bautista',
        '0915-773-2094',
        'Mabini Port (Anilao)',
        'MARINA-BTG-2026-089',
        'Newly registered coastal shuttle awaiting Barangay San Juan and Municipal Tourism Office safety inspection.',
        0,
        addDaysTimestamp(today, -3)
      ).lastInsertRowid
    );

    // 4. Boats (8 boats across 4 operators)
    const insertBoat = db.prepare(`
      INSERT INTO boats (operator_id, boat_name, registration_code, boat_type, capacity, life_jackets_count, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const b1 = Number(
      insertBoat.run(op1Id, 'M/B Masasa Pearl I', 'BTG-TIN-101', 'Large Outrigger Motorbanca', 32, 36, 'active').lastInsertRowid
    );
    const b2 = Number(
      insertBoat.run(op1Id, 'M/B San Juan Breeze', 'BTG-TIN-102', 'Medium Outrigger Motorbanca', 24, 28, 'active').lastInsertRowid
    );
    const b3 = Number(
      insertBoat.run(op2Id, 'M/B Batalang Bato', 'BTG-TIN-201', 'Community Ferry Banca', 36, 40, 'active').lastInsertRowid
    );
    const b4 = Number(
      insertBoat.run(op2Id, 'M/B Sampaguita Star', 'BTG-TIN-202', 'Outrigger Passenger Banca', 22, 26, 'active').lastInsertRowid
    );
    const b5 = Number(
      insertBoat.run(op3Id, 'M/B Verde Channel', 'BTG-TIN-301', 'Twin-Engine Express Banca', 30, 34, 'active').lastInsertRowid
    );
    const b6 = Number(
      insertBoat.run(op3Id, 'M/B Maricaban Pride', 'BTG-TIN-302', 'Twin-Engine Express Banca', 28, 32, 'active').lastInsertRowid
    );
    const b7 = Number(
      insertBoat.run(op4Id, 'M/B Sunrise Voyager', 'BTG-TIN-401', 'Outrigger Motorbanca', 20, 22, 'active').lastInsertRowid
    );
    const b8 = Number(
      insertBoat.run(op4Id, 'M/B Coral Runner', 'BTG-TIN-402', 'Outrigger Motorbanca', 18, 20, 'maintenance').lastInsertRowid
    );

    // 5. Trips (30+ trips across the next 14 days + a few for pending op4)
    const insertTrip = db.prepare(`
      INSERT INTO trips (
        operator_id, boat_id, origin, destination, departure_date,
        departure_time, arrival_time, adult_fare, child_fare, infant_fare,
        total_capacity, seats_available, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tripIds: { id: number; opId: number; date: string; adult: number; child: number; infant: number; origin: string; dest: string }[] = [];

    const addSeedTrip = (
      opId: number,
      boatId: number,
      origin: string,
      dest: string,
      dayOffset: number,
      depTime: string,
      arrTime: string,
      adultFare: number,
      cap: number,
      seats: number,
      status: 'scheduled' | 'full' | 'delayed' | 'cancelled' = 'scheduled',
      notes = ''
    ) => {
      const dateStr = addDays(today, dayOffset);
      const childFare = Math.round(adultFare * 0.75);
      const infantFare = 0;
      const res = insertTrip.run(
        opId,
        boatId,
        origin,
        dest,
        dateStr,
        depTime,
        arrTime,
        adultFare,
        childFare,
        infantFare,
        cap,
        seats,
        status,
        notes
      );
      const id = Number(res.lastInsertRowid);
      tripIds.push({ id, opId, date: dateStr, adult: adultFare, child: childFare, infant: infantFare, origin, dest });
      return id;
    };

    const MABINI_ANILAO = 'Mabini Port (Anilao)';
    const MABINI_TALAGA = 'Mabini Port (Talaga)';
    const TINGLOY_MASASA = 'Tingloy / Masasa Beach (Brgy. San Juan)';

    // Seed trips across days 0..13 (plus day -2..-1 for historical analytics)
    for (let d = -2; d <= 13; d++) {
      if (d % 2 === 0 || d <= 4) {
        addSeedTrip(op1Id, b1, MABINI_ANILAO, TINGLOY_MASASA, d, '07:00', '07:50', 180, 32, 32, 'scheduled', 'Morning direct crossing; boarding 20 mins prior.');
        addSeedTrip(op1Id, b1, TINGLOY_MASASA, MABINI_ANILAO, d, '15:30', '16:20', 180, 32, 32, 'scheduled', 'Afternoon return from Brgy. San Juan.');
      }
      if (d >= 0) {
        addSeedTrip(op2Id, b3, MABINI_TALAGA, TINGLOY_MASASA, d, '08:30', '09:20', 160, 36, 36, 'scheduled', 'Community cooperative regular ferry.');
        addSeedTrip(op2Id, b4, TINGLOY_MASASA, MABINI_TALAGA, d, '16:00', '16:50', 160, 22, 22, 'scheduled', 'Return shuttle to Talaga Port.');
      }
      if (d % 2 === 1 || d <= 3) {
        addSeedTrip(op3Id, b5, MABINI_ANILAO, TINGLOY_MASASA, d, '10:00', '10:45', 200, 30, 30, 'scheduled', 'Express twin-engine crossing.');
        addSeedTrip(op3Id, b6, TINGLOY_MASASA, MABINI_ANILAO, d, '14:00', '14:45', 200, 28, 28, 'scheduled', 'Afternoon express return.');
      }
    }

    // Add an extra mid-day trip on day 2 (peak weekend day) and a cancelled trip for KPI realism
    addSeedTrip(op1Id, b2, MABINI_ANILAO, TINGLOY_MASASA, 2, '11:30', '12:20', 180, 24, 24, 'scheduled', 'Peak-day supplementary trip.');
    addSeedTrip(op3Id, b6, MABINI_ANILAO, TINGLOY_MASASA, 1, '16:30', '17:15', 200, 28, 28, 'cancelled', 'Cancelled due to late-afternoon Amihan swell forecast.');
    // Pending operator trip (hidden from public until verified)
    addSeedTrip(op4Id, b7, MABINI_ANILAO, TINGLOY_MASASA, 2, '09:15', '10:05', 175, 20, 20, 'scheduled', 'Pending permit verification.');

    // 6. Bookings + Passengers (24 bookings across dates, creating realistic analytics and a peak-day overcrowding alert!)
    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        booking_ref, user_id, trip_id, return_trip_id, trip_type,
        adults, children, infants, total_passengers, total_fare,
        contact_name, contact_phone, contact_email, status, created_at, cancelled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPassenger = db.prepare(`
      INSERT INTO passengers (booking_id, full_name, age, passenger_type, emergency_contact)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateSeats = db.prepare(`
      UPDATE trips
      SET seats_available = MAX(0, seats_available - ?),
          status = CASE WHEN (seats_available - ?) <= 0 AND status = 'scheduled' THEN 'full' ELSE status END
      WHERE id = ?
    `);

    let refCounter = 1;
    const sampleNames = [
      'Jhazlyne Velasquez', 'Ella Mae Alonzo', 'Reimel Angela Briones', 'Jane Princess Casanova',
      'Gelsey Hana Coz', 'Ana Flor Dimaano', 'Cara Lizzie Indicio', 'Jenelle Magnaye',
      'Karen Margareth Manalo', 'Joy Mapa', 'Jane Ocampo', 'Mica Jane Palompon',
      'Stephanie Sumaylo', 'Liam Santos', 'Noah Garcia', 'Sofia Reyes',
      'Lucas Bautista', 'Mia Mendoza', 'Gabriel Cruz', 'Isabella Torres',
      'Mateo Ramos', 'Chloe Navarro', 'Ethan Aquino', 'Hannah Pascual',
      'Diego Morales', 'Alyssa Castillo', 'Adrian Lim', 'Katrina Ong',
      'Marco Villanueva', 'Bea Tolentino', 'Paolo Mercado', 'Clarisse Tan'
    ];
    let nameCursor = 0;

    const createSeedBooking = (
      userId: number,
      outboundTripId: number,
      returnTripId: number | null,
      adults: number,
      children: number,
      infants: number,
      contactName: string,
      contactPhone: string,
      contactEmail: string,
      status: 'confirmed' | 'cancelled',
      createdDaysOffset: number
    ) => {
      const outTrip = db.prepare('SELECT * FROM trips WHERE id = ?').get(outboundTripId) as {
        adult_fare: number;
        child_fare: number;
        infant_fare: number;
      };
      let fare = adults * outTrip.adult_fare + children * outTrip.child_fare + infants * outTrip.infant_fare;
      if (returnTripId) {
        const retTrip = db.prepare('SELECT * FROM trips WHERE id = ?').get(returnTripId) as {
          adult_fare: number;
          child_fare: number;
          infant_fare: number;
        };
        fare += adults * retTrip.adult_fare + children * retTrip.child_fare + infants * retTrip.infant_fare;
      }
      const totalPax = adults + children + infants;
      const ref = `TSC-2026-${String(refCounter++).padStart(6, '0')}`;
      const createdAt = addDaysTimestamp(today, createdDaysOffset, '10:15:00');
      const cancelledAt = status === 'cancelled' ? addDaysTimestamp(today, createdDaysOffset, '14:20:00') : null;

      const bId = Number(
        insertBooking.run(
          ref,
          userId,
          outboundTripId,
          returnTripId,
          returnTripId ? 'round-trip' : 'one-way',
          adults,
          children,
          infants,
          totalPax,
          fare,
          contactName,
          contactPhone,
          contactEmail,
          status,
          createdAt,
          cancelledAt
        ).lastInsertRowid
      );

      for (let i = 0; i < adults; i++) {
        const pName = sampleNames[nameCursor++ % sampleNames.length];
        insertPassenger.run(bId, pName, 21 + ((i * 5) % 28), 'adult', contactPhone);
      }
      for (let i = 0; i < children; i++) {
        const pName = `${sampleNames[nameCursor++ % sampleNames.length].split(' ')[0]} Jr.`;
        insertPassenger.run(bId, pName, 6 + (i % 5), 'child', contactPhone);
      }
      for (let i = 0; i < infants; i++) {
        insertPassenger.run(bId, `Baby ${contactName.split(' ')[0]}`, 1, 'infant', contactPhone);
      }

      if (status === 'confirmed') {
        updateSeats.run(totalPax, totalPax, outboundTripId);
        if (returnTripId) {
          updateSeats.run(totalPax, totalPax, returnTripId);
        }
      }
    };

    const getTripFor = (dayOffset: number, opId: number, fromMabini = true) => {
      const dateStr = addDays(today, dayOffset);
      return tripIds.find(
        (t) =>
          t.date === dateStr &&
          t.opId === opId &&
          (fromMabini ? t.origin.startsWith('Mabini') : !t.origin.startsWith('Mabini'))
      )?.id;
    };

    // Historical & current bookings across days -2..7
    const bookingsSpec: Array<[number, number, number, number | null, number, number, number, 'confirmed' | 'cancelled', number]> = [
      // [userId, dayOffset, opId, returnOpId, adults, children, infants, status, createdOffset]
      [visitor1Id, -2, op1Id, op1Id, 3, 1, 0, 'confirmed', -4],
      [visitor2Id, -2, op2Id, null, 4, 0, 1, 'confirmed', -4],
      [visitor3Id, -1, op3Id, op3Id, 2, 0, 0, 'confirmed', -3],
      [visitor1Id, -1, op1Id, null, 5, 2, 0, 'confirmed', -3],
      [visitor2Id, 0, op1Id, op1Id, 4, 1, 0, 'confirmed', -2],
      [visitor3Id, 0, op2Id, null, 6, 0, 0, 'confirmed', -2],
      [visitor1Id, 0, op3Id, op3Id, 2, 1, 1, 'confirmed', -1],
      [visitor2Id, 1, op1Id, null, 5, 0, 0, 'confirmed', -2],
      [visitor3Id, 1, op2Id, op2Id, 3, 2, 0, 'confirmed', -1],
      [visitor1Id, 1, op3Id, null, 4, 0, 0, 'cancelled', -1],
      // Day 2: Peak-day overcrowding group (>65 passengers total across operators!)
      [visitor1Id, 2, op1Id, op1Id, 18, 4, 1, 'confirmed', -3],
      [visitor2Id, 2, op2Id, op2Id, 20, 4, 0, 'confirmed', -2],
      [visitor3Id, 2, op3Id, null, 18, 3, 1, 'confirmed', -1],
      [visitor2Id, 2, op1Id, null, 8, 2, 0, 'confirmed', 0],
      // Days 3..7
      [visitor1Id, 3, op1Id, op1Id, 3, 0, 0, 'confirmed', -1],
      [visitor3Id, 3, op2Id, null, 5, 1, 0, 'confirmed', 0],
      [visitor2Id, 4, op1Id, null, 4, 2, 0, 'confirmed', 0],
      [visitor1Id, 4, op2Id, op2Id, 2, 0, 0, 'confirmed', 0],
      [visitor3Id, 5, op3Id, op3Id, 6, 1, 1, 'confirmed', 0],
      [visitor2Id, 6, op2Id, null, 4, 0, 0, 'cancelled', 0],
      [visitor1Id, 6, op1Id, op1Id, 3, 1, 0, 'confirmed', 0],
      [visitor3Id, 7, op3Id, null, 5, 0, 0, 'confirmed', 0],
    ];

    for (const [uId, dayOff, oId, retOpId, a, c, inf, st, crOff] of bookingsSpec) {
      const outId = getTripFor(dayOff, oId, true);
      const retId = retOpId ? getTripFor(dayOff, retOpId, false) ?? null : null;
      if (!outId) continue;
      const contact =
        uId === visitor1Id
          ? ['Camille Mendoza', '0917-555-0101', 'visitor@tingloy.ph']
          : uId === visitor2Id
          ? ['Rafael Dizon', '0918-555-0144', 'rafael.dizon@example.ph']
          : ['Tricia Villanueva', '0927-555-0188', 'tricia.v@example.ph'];
      createSeedBooking(uId, outId, retId, a, c, inf, contact[0], contact[1], contact[2], st, crOff);
    }

    // 7. Announcements (5 announcements)
    const insertAnn = db.prepare(`
      INSERT INTO announcements (author_id, operator_id, title, message, severity, sea_condition, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAnn.run(
      adminId,
      null,
      'Afternoon Northeast Swell Advisory (Amihan)',
      'Moderate waves (1.2m–1.8m) expected along the Maricaban Strait after 3:00 PM. Morning trips operate normally; passengers are advised to board early and wear life vests at all times.',
      'caution',
      'Caution',
      1,
      addDaysTimestamp(today, 0, '06:30:00')
    );

    insertAnn.run(
      adminId,
      null,
      'Barangay San Juan Coastal Clean-Up & "Basura Mo Bitbitin Mo"',
      'All Masasa Beach visitors are reminded to bring reusable water containers and carry out non-biodegradable waste. Segregated bins are stationed near the Barangay San Juan landing.',
      'info',
      'Good',
      1,
      addDaysTimestamp(today, -1, '08:00:00')
    );

    insertAnn.run(
      opUser3Id,
      op3Id,
      'Late-Afternoon Express Trip Cancelled (Tomorrow 4:30 PM)',
      'Anilao–Tingloy Outrigger Express 4:30 PM departure from Mabini Port is cancelled due to forecasted swell. Morning 10:00 AM and 2:00 PM departures remain on schedule.',
      'suspended',
      'Suspended',
      0,
      addDaysTimestamp(today, -1, '16:15:00')
    );

    insertAnn.run(
      opUser1Id,
      op1Id,
      'Boarding Gate Reminder at Mabini Port (Anilao)',
      'Confirmed e-ticket holders for Masasa Wave Sea Transport must check in at Pier 1 at least 20 minutes prior to departure for Philippine Coast Guard manifest verification.',
      'info',
      'Good',
      1,
      addDaysTimestamp(today, -2, '07:45:00')
    );

    insertAnn.run(
      adminId,
      null,
      'Peak Weekend Carrying Capacity Notice for Masasa Beach',
      'High visitor volume is projected this coming weekend. Please pre-book verified boat slots online to avoid port congestion and support Barangay San Juan sustainable tourism guidelines.',
      'info',
      'Good',
      1,
      addDaysTimestamp(today, -3, '11:00:00')
    );

    // 8. Feedback (15 entries across verified operators)
    const insertFeedback = db.prepare(`
      INSERT INTO feedback (user_id, operator_id, booking_id, rating, comment, visitor_name, created_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?)
    `);

    const feedbackRows: Array<[number | null, number, number, string, string, number]> = [
      [visitor1Id, op1Id, 5, 'Very organized boarding at Anilao! Life jackets were clean and fitted properly before departure.', 'Camille Mendoza', -10],
      [visitor2Id, op1Id, 5, 'Captain Mateo kept everyone updated on wave conditions and docked smoothly near San Juan.', 'Rafael Dizon', -9],
      [visitor3Id, op1Id, 4, 'Punctual morning departure. E-ticket QR scanning at the pier was super fast compared to texting on Facebook.', 'Tricia Villanueva', -8],
      [null, op1Id, 5, 'Clean banca and courteous crew. They reminded everyone not to throw trash overboard.', 'Mark Anthony Cruz', -6],
      [null, op1Id, 4, 'Smooth ride to Masasa! Would appreciate slightly shaded waiting seats at the landing.', 'Bianca Robles', -4],
      [visitor2Id, op2Id, 5, 'Supporting the Barangay San Juan coop directly felt great. Very affordable fare and transparent schedule.', 'Rafael Dizon', -11],
      [visitor3Id, op2Id, 5, 'Spacious boat with plenty of life vests for kids. Crew helped our senior companions disembark safely.', 'Tricia Villanueva', -7],
      [null, op2Id, 4, 'Reliable cooperative ferry from Talaga Port. Clear fare matrix with zero hidden charges.', 'Jerome Evangelista', -5],
      [null, op2Id, 5, 'Loved the briefing on Masasa Beach eco-rules and coral reef safety before we arrived.', 'Patricia Gomez', -3],
      [null, op2Id, 4, 'Good communication when departure shifted by 10 minutes for Coast Guard clearance.', 'Kenneth Bautista', -2],
      [visitor1Id, op3Id, 5, 'Fastest crossing! Twin-engine outrigger handled the afternoon chop comfortably.', 'Camille Mendoza', -12],
      [visitor3Id, op3Id, 4, 'Slightly higher fare than standard bancas but worth it for the speed and stability.', 'Tricia Villanueva', -6],
      [null, op3Id, 5, 'Professional crew and clear safety demonstration prior to leaving Mabini Port.', 'Andrea Soriano', -5],
      [null, op3Id, 4, 'Easy online booking and quick confirmation. Return trip left right on time.', 'Christian Pangilinan', -3],
      [null, op3Id, 5, 'Verified operator badge gave our family peace of mind instead of guessing unverified boats.', 'Lorraine Vergara', -1],
    ];

    for (const [uId, opId, rating, comment, vName, dayOff] of feedbackRows) {
      insertFeedback.run(uId, opId, rating, comment, vName, addDaysTimestamp(today, dayOff, '15:00:00'));
    }

    // 9. Safety Guidelines (aligned with Barangay San Juan Sustainable Tourism Plan)
    const insertSafety = db.prepare(`
      INSERT INTO safety_guidelines (category, title, description, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    const guidelines: Array<[string, string, string, number]> = [
      [
        'Maritime Safety',
        'Mandatory Life Jacket Wearing',
        'All passengers—including adults, children, and infants—must wear Philippine Coast Guard-approved life jackets properly fastened throughout the entire crossing between Mabini Port and Tingloy.',
        1,
      ],
      [
        'Maritime Safety',
        'Strict Passenger Capacity & Manifest Verification',
        'Boats may never exceed their registered MARINA seating capacity. Every passenger must register their real full name and emergency contact for the official Coast Guard voyage manifest.',
        2,
      ],
      [
        'Maritime Safety',
        'Follow Boat Captain & Crew Safety Instructions',
        'Listen carefully to pre-departure briefings. Remain seated while the vessel is underway, keep limbs inside the hull, and follow crew guidance when boarding or disembarking at Masasa Beach.',
        3,
      ],
      [
        'Weather & Sea Conditions',
        'Weather-Related Cancellations & Advisories',
        'Trips automatically pause or suspend during PAGASA Gale Warnings, Coast Guard travel advisories, or hazardous Amihan/Habagat swells. Check Today’s Sea Status before heading to the port.',
        4,
      ],
      [
        'Environmental Stewardship',
        'Basura Mo, Bitbitin Mo & Zero Single-Use Plastics',
        'Masasa Beach and Barangay San Juan strictly enforce anti-littering and waste segregation ordinances. Bring reusable tumblers, avoid single-use plastics, and use labeled segregation bins.',
        5,
      ],
      [
        'Environmental Stewardship',
        'Coral Reef & Marine Wildlife Protection',
        'Do not step on corals, touch sea turtles, or feed fish while snorkeling. Boat operators must anchor only in designated sandy mooring zones to protect Barangay San Juan reefs.',
        6,
      ],
      [
        'Community & Cultural Respect',
        'Respect Local Ordinances & Barangay San Juan Customs',
        'Observe quiet hours in coastal sitios, dress modestly when walking through Barangay San Juan residential pathways, and support local homestays, food stalls, and cooperative boatmen.',
        7,
      ],
    ];

    for (const [cat, title, desc, order] of guidelines) {
      insertSafety.run(cat, title, desc, order);
    }
  });

  runSeed();
}

// Allow direct CLI execution via `npm run seed`
const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'));

if (isDirectExecution) {
  seedDatabase(true);
  console.log('Database seeded successfully with sample operators, boats, trips, bookings, announcements, feedback, and safety guidelines.');
}
