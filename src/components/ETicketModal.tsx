import { CheckCircle2, Printer, X, XCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { Booking } from '../types';

interface ETicketModalProps {
  booking: Booking;
  onClose: () => void;
}

export function ETicketModal({ booking, onClose }: ETicketModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const payload = JSON.stringify({
      ref: booking.booking_ref,
      trip: `${booking.outbound_trip?.origin} -> ${booking.outbound_trip?.destination}`,
      date: booking.outbound_trip?.departure_date,
      time: booking.outbound_trip?.departure_time,
      pax: booking.total_passengers,
      status: booking.status,
    });
    QRCode.toDataURL(payload, {
      width: 180,
      margin: 2,
      color: { dark: '#0B3C6F', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [booking]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="eticket-title">
      <div className="modal-dialog">
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 id="eticket-title" style={{ fontSize: '1.25rem' }}>
            Boat Boarding E-Ticket
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
              <Printer size={16} aria-hidden="true" />
              <span>Print E-Ticket</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label="Close e-ticket"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="eticket-shell">
          <div className="eticket-header">
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Tingloy Sea Connect E-Ticket</div>
              <div className="tabular-nums" style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: 2 }}>
                {booking.booking_ref}
              </div>
            </div>
            <span
              className={`status-tag ${
                booking.status === 'confirmed' ? 'status-good' : 'status-suspended'
              }`}
            >
              {booking.status === 'confirmed' ? (
                <CheckCircle2 size={15} aria-hidden="true" />
              ) : (
                <XCircle size={15} aria-hidden="true" />
              )}
              <span>{booking.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</span>
            </span>
          </div>

          <div className="eticket-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Outbound Crossing
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 2 }}>
                  {booking.outbound_trip?.origin} &rarr; {booking.outbound_trip?.destination}
                </div>
                <div className="meta-line" style={{ marginTop: 4 }}>
                  <span className="tabular-nums">{booking.outbound_trip?.departure_date}</span>
                  <span>&middot;</span>
                  <span className="tabular-nums">
                    {booking.outbound_trip?.departure_time} &ndash; {booking.outbound_trip?.arrival_time}
                  </span>
                  <span>&middot;</span>
                  <span>{booking.outbound_trip?.operator_name}</span>
                </div>
                <div className="meta-line" style={{ marginTop: 2 }}>
                  <span>Vessel: {booking.outbound_trip?.boat_name}</span>
                  <span>&middot;</span>
                  <span className="tabular-nums">Reg: {booking.outbound_trip?.registration_code}</span>
                  <span>&middot;</span>
                  <span>Contact: {booking.outbound_trip?.contact_number}</span>
                </div>
              </div>

              {booking.return_trip && (
                <div
                  style={{
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-hairline)',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Return Crossing
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 2 }}>
                    {booking.return_trip.origin} &rarr; {booking.return_trip.destination}
                  </div>
                  <div className="meta-line" style={{ marginTop: 4 }}>
                    <span className="tabular-nums">{booking.return_trip.departure_date}</span>
                    <span>&middot;</span>
                    <span className="tabular-nums">
                      {booking.return_trip.departure_time} &ndash; {booking.return_trip.arrival_time}
                    </span>
                    <span>&middot;</span>
                    <span>{booking.return_trip.boat_name}</span>
                  </div>
                </div>
              )}

              <div
                style={{
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-hairline)',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Primary Contact &amp; Payment Summary
                </div>
                <div className="meta-line" style={{ marginTop: 4 }}>
                  <span>{booking.contact_name}</span>
                  <span>&middot;</span>
                  <span>{booking.contact_phone}</span>
                  <span>&middot;</span>
                  <span className="tabular-nums">
                    Total Fare: ₱{Number(booking.total_fare).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                  }}
                >
                  Passenger Manifest ({booking.total_passengers})
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Full Name</th>
                        <th>Type</th>
                        <th>Age</th>
                        <th>Emergency Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booking.passengers.map((p, idx) => (
                        <tr key={p.id ?? idx}>
                          <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                          <td style={{ textTransform: 'capitalize' }}>{p.passenger_type}</td>
                          <td className="tabular-nums">{p.age}</td>
                          <td className="tabular-nums">{p.emergency_contact}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="qr-box">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for booking ${booking.booking_ref}`}
                  width={168}
                  height={168}
                />
              ) : (
                <div style={{ width: 168, height: 168, display: 'grid', placeItems: 'center' }}>
                  Generating QR...
                </div>
              )}
              <div
                className="tabular-nums"
                style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: 8, color: 'var(--ocean-deep)' }}
              >
                {booking.booking_ref}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Present this QR code at the Mabini or Tingloy pier check-in desk 20 minutes before
                departure. Wear your life jacket throughout the trip.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
