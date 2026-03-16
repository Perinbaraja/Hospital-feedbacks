import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Monitor, ExternalLink, QrCode as QrIcon } from 'lucide-react';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AdminTvMonitor = () => {
    const { user } = useAuth();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const hospitalId = params.get('hospitalId');
    
    // Fallback to user's hospital if not in URL (Standard Admin case)
    const effectiveHospitalId = hospitalId || user?.hospital?._id || user?.hospital;
    const hQuery = effectiveHospitalId ? `?hospitalId=${effectiveHospitalId}` : '';
    
    const [hospital, setHospital] = useState(null);
    const [tvUrl, setTvUrl] = useState('');

    useEffect(() => {
        const fetchHospital = async () => {
            try {
                // If we don't have effectiveHospitalId yet, wait for user/params to load
                if (!effectiveHospitalId) return;

                const query = `?hospitalId=${effectiveHospitalId}`;
                const { data } = await API.get(`/hospital${query}`);
                setHospital(data);
            } catch (error) {
                console.error('Failed to load hospital data', error);
            }
        };
        fetchHospital();
        
        // Construct full URL for QR code
        const baseUrl = window.location.origin;
        if (effectiveHospitalId) {
            setTvUrl(`${baseUrl}/tv-dashboard?hospitalId=${effectiveHospitalId}`);
        }
    }, [effectiveHospitalId]);

    const handleOpenTv = () => {
        window.open(tvUrl, '_blank');
        toast.success('TV Dashboard launched in new tab');
    };

    return (
        <div className="admin-tv-monitor">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h2 className="page-title text-colorful">TV Monitor Control</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Launch and monitor the hospital feedback display screen.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Status: Ready</span>
                </div>
            </div>

            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '4rem 2rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '20px', 
                        background: 'rgba(12, 166, 120, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        marginBottom: '1.5rem'
                    }}>
                        <Monitor size={40} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Display on Large Screen</h3>
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', marginBottom: '2.5rem' }}>
                        Click the button below to open the TV Dashboard. You can then move that window to your hospital's TV or monitor screen and press F11 for full-screen.
                    </p>
                    <button className="btn-primary" onClick={handleOpenTv} style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                        <ExternalLink size={20} /> Open TV Screen
                    </button>
                </div>

                <div className="card" style={{ padding: '2rem', textAlign: 'center', borderLeft: '4px solid var(--vibrant-violet)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--vibrant-violet)' }}>
                        <QrIcon size={20} />
                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>QR Code Login</h3>
                    </div>
                    <div style={{ 
                        background: 'white', 
                        padding: '1.5rem', 
                        borderRadius: '1rem', 
                        border: '1px solid #e2e8f0', 
                        display: 'inline-block',
                        marginBottom: '1.5rem'
                    }}>
                        <QRCode 
                            value={tvUrl} 
                            size={200}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            viewBox={`0 0 256 256`}
                        />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Scan this code with a smart TV or tablet to open the dashboard directly.
                    </p>
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
                        <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: '#64748b' }}>{tvUrl}</code>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '2rem', borderLeft: '4px solid var(-- accent)' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 TV Setup Tips
                </h4>
                <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '1.25rem' }}>
                    <li>Use a <b>dedicated PC or Chromebox</b> connected to your TV via HDMI.</li>
                    <li>Ensure the device has a <b>stable internet connection</b>.</li>
                    <li>Press <b>F11</b> on your keyboard to enter full-screen mode in the browser.</li>
                    <li>The display will <b>automatically update every 10 seconds</b> when new feedback arrives.</li>
                </ul>
            </div>
        </div>
    );
};

export default AdminTvMonitor;
