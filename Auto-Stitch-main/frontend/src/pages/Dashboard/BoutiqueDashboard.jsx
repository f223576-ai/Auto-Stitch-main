import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Store, Package, ShoppingCart, TrendingUp, Users, User, Star,
  Plus, Settings, BarChart2, Bell, ChevronRight, ArrowUpRight,
  Clock, DollarSign, CheckCircle, AlertCircle, RotateCcw as Loader,
  Sparkles, MessageSquare
} from 'lucide-react';
import API_URL from '../../config/api';
import VisitingCard from '../../components/VisitingCard';
import './Dashboard.css';

const ShieldCheck = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <path d="m9 12 2 2 4-4"></path>
  </svg>
);

export function BoutiqueDashboard({ user }) {
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, activeProducts: 0, reputation: 4.8 });
  const [boutiqueData, setBoutiqueData] = useState(null);
  const [cardForm, setCardForm] = useState({
    visible: false,
    image: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: ''
  });
  const [cardMessage, setCardMessage] = useState('');
  const [cardError, setCardError] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeBids, setActiveBids] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Boutique Dashboard — Auto Stitch';
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, bidsRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/boutique`, { withCredentials: true }),
        axios.get(`${API_URL}/api/orders/boutique`, { withCredentials: true }),
        axios.get(`${API_URL}/api/bids/my-bids`, { withCredentials: true }),
        axios.get(`${API_URL}/api/products/my-products`, { withCredentials: true })
      ]);

      if (statsRes.data.success) {
        setStats({
          totalRevenue: statsRes.data.stats.revenue || 0,
          totalOrders: statsRes.data.stats.totalOrders || 0,
          activeProducts: statsRes.data.stats.totalProducts || 0,
          reputation: 4.8
        });
        const boutique = statsRes.data.boutique;
        setBoutiqueData(boutique);
        const card = boutique?.visitingCard;
        if (card) {
          setCardForm({
            visible: card.visible === true,
            image: card.image || '',
            street: card.address?.street || '',
            city: card.address?.city || '',
            province: card.address?.province || '',
            postalCode: card.address?.postalCode || '',
            phone: card.contact?.phone || '',
            email: card.contact?.email || ''
          });
        }
      }

      if (ordersRes.data.success) setRecentOrders(ordersRes.data.orders?.slice(0, 3) || []);
      if (bidsRes.data.success) setActiveBids(bidsRes.data.bids?.slice(0, 2) || []);
      if (productsRes.data.success) setProducts(productsRes.data.products?.slice(0, 5) || []);

    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const BOUTIQUE_STATS_CARDS = [
    { label: 'Total Revenue', value: `PKR ${stats.totalRevenue.toLocaleString()}`, trend: '+12%', icon: <DollarSign size={20} /> },
    { label: 'Total Orders', value: stats.totalOrders.toString(), trend: '+5', icon: <ShoppingCart size={20} /> },
    { label: 'Active Products', value: stats.activeProducts.toString(), trend: '0', icon: <Package size={20} /> },
    { label: 'Reputation', value: stats.reputation.toString(), trend: '+0.1', icon: <Star size={20} /> },
  ];

  const isProfileComplete = boutiqueData?.address?.street && boutiqueData?.address?.city && boutiqueData?.address?.province && boutiqueData?.contact?.phone;
  const isVerified = boutiqueData?.isApproved;

  const getStatusDisplay = () => {
    if (isVerified) return { text: 'Verified & Active — Global visibility enabled.', color: '#2e7d32', icon: <CheckCircle size={16} style={{ marginRight: '8px' }} /> };
    if (isProfileComplete) return { text: 'Pending Admin Verification — You will be notified soon.', color: '#f57c00', icon: <Clock size={16} style={{ marginRight: '8px' }} /> };
    return { text: 'Profile Incomplete (100% required) — Add address & phone in Settings.', color: '#d32f2f', icon: <AlertCircle size={16} style={{ marginRight: '8px' }} /> };
  };

  const statusDisplay = getStatusDisplay();

  const updateCardField = (field, value) => {
    setCardForm((prev) => ({ ...prev, [field]: value }));
    setCardMessage('');
    setCardError('');
  };

  const handleCardPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('image', file);
    setUploadingCard(true);
    setCardError('');
    try {
      const res = await axios.post(`${API_URL}/api/upload`, uploadData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        updateCardField('image', res.data.url);
      }
    } catch (err) {
      setCardError(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploadingCard(false);
    }
  };

  const persistVisitingCard = async (form, message) => {
    setCardMessage('');
    setCardError('');
    setSavingCard(true);
    try {
      const res = await axios.put(`${API_URL}/api/boutiques/visiting-card`, {
        visible: form.visible === true,
        image: form.image,
        address: {
          street: form.street,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode
        },
        contact: {
          phone: form.phone,
          email: form.email
        }
      }, { withCredentials: true });
      setCardMessage(message || res.data.message || 'Visiting card saved');
      setCardForm((prev) => ({ ...prev, visible: res.data.visitingCard?.visible === true }));
      setBoutiqueData((prev) => ({ ...prev, visitingCard: res.data.visitingCard }));
      return true;
    } catch (err) {
      setCardError(err.response?.data?.message || 'Could not save visiting card');
      return false;
    } finally {
      setSavingCard(false);
    }
  };

  const saveVisitingCard = (e) => {
    e.preventDefault();
    persistVisitingCard(cardForm, 'Visiting card saved');
  };

  const handleCardVisibility = async (visible) => {
    const previous = cardForm.visible;
    const nextForm = { ...cardForm, visible };
    setCardForm(nextForm);
    const saved = await persistVisitingCard(
      nextForm,
      visible ? 'Visiting card is now visible' : 'Visiting card is now hidden'
    );
    if (!saved) {
      setCardForm((prev) => ({ ...prev, visible: previous }));
    }
  };

  const cardAddressLines = [
    cardForm.street,
    [cardForm.city, cardForm.province].filter(Boolean).join(', '),
    cardForm.postalCode
  ].filter(Boolean);

  if (loading) {
    return (
      <div className="dashboard-page flex-center" style={{ minHeight: '80vh' }}>
        <Loader className="spinner" size={48} />
      </div>
    );
  }

  return (
    <div className="dashboard-page page-enter">
      <div className="container dashboard-container" style={{ justifyContent: 'center', display: 'block' }}>
        <main className="dashboard-main" style={{ flex: 1, width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          
          <div className="dashboard-section" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="dashboard-section-title">Boutique Executive Suite</h2>
            <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.85rem', marginLeft: 'auto', marginRight: 'auto', maxWidth: '600px' }}>
              Welcome back, {user?.name || 'Partner'}. Manage your boutique's operations, track performance, and engage with customization bids in our premium management environment.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="welcome-banner glass-card" style={{ 
            marginBottom: '3rem', 
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '3.5rem 2.5rem',
            flexDirection: 'column',
            textAlign: 'center',
            gap: '2rem'
          }}>
            <div className="welcome-content" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div className="avatar avatar-xl" style={{ background: '#000', color: '#fff', margin: '0 auto' }}>
                <Store size={32} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="welcome-greeting" style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem', fontWeight: '700', marginBottom: '1rem' }}>Official Partner</p>
                <h1 className="welcome-name" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '3rem', margin: '1rem 0' }}>{user?.name}'s Boutique</h1>
                <p className="welcome-sub text-muted" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1.2rem', color: statusDisplay.color, fontWeight: '600' }}>
                  {statusDisplay.icon}
                  {statusDisplay.text}
                </p>
              </div>
            </div>
            <div className="welcome-actions" style={{ justifyContent: 'center', width: '100%', gap: '2rem', marginTop: '1.5rem' }}>
              <Link to="/dashboard" className="btn-white-outline" style={{ 
                background: 'transparent', color: '#666', border: 'none', padding: '0 20px', height: '50px', 
                display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '0',
                fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase'
              }}>
                <User size={14} /> Customer View
              </Link>
              
              {isVerified ? (
                <Link to="/boutique/products/new" className="btn-white-outline" style={{ 
                  background: '#fff', color: '#000', border: '1px solid #000', padding: '0 35px', height: '50px', 
                  display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '0',
                  fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase'
                }}>
                  <Plus size={16} /> Add Product
                </Link>
              ) : (
                <div title="Profile must be 100% complete and verified by admin first" style={{ cursor: 'not-allowed', opacity: 0.5 }}>
                  <span className="btn-white-outline" style={{ 
                    background: '#f5f5f5', color: '#999', border: '1px solid #ddd', padding: '0 35px', height: '50px', 
                    display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '0', pointerEvents: 'none',
                    fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase'
                  }}>
                    <Plus size={16} /> Add Product (Locked)
                  </span>
                </div>
              )}

              <Link to="/boutique/settings" className="btn-white-outline" style={{ 
                background: '#fff', color: '#000', border: '1px solid #000', padding: '0 35px', height: '50px', 
                display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '0',
                fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase'
              }}>
                <Settings size={16} /> Settings
              </Link>
            </div>
          </div>

          {/* Monochrome Black & White Stats Grid */}
          <div className="dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
            {BOUTIQUE_STATS_CARDS.map((s) => (
              <div key={s.label} className="dash-stat-card glass-card" style={{ 
                background: '#ffffff', border: '1px solid #000000', padding: '2rem', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div className="dash-stat-icon" style={{ background: '#000000', color: '#ffffff', borderRadius: '0', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </div>
                <div style={{ marginTop: '1.2rem' }}>
                  <p className="dash-stat-value" style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif', color: '#000000', margin: '0 0 4px 0' }}>{s.value}</p>
                  <p className="dash-stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '700', color: '#666666', margin: '0 0 6px 0' }}>{s.label}</p>
                  <p className="dash-stat-trend" style={{ fontSize: '0.75rem', margin: 0, color: '#000000', fontWeight: 500 }}>
                    {s.trend} <span style={{ opacity: 0.6 }}>performance index</span>
                  </p>
                </div>
              </div>
            ))}
            
            {/* New Marketplace Alert Card */}
            <Link to="/boutique/bids" className="dash-stat-card glass-card" style={{ 
              background: '#ffffff', color: '#000000', border: '1px solid #000000', padding: '2rem', textDecoration: 'none', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div className="dash-stat-icon" style={{ background: '#000000', color: '#ffffff', borderRadius: '0', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} />
              </div>
              <div style={{ marginTop: '1.2rem' }}>
                <p className="dash-stat-value" style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif', color: '#000000', margin: '0 0 4px 0' }}>NEW</p>
                <p className="dash-stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '700', color: '#666666', margin: '0 0 6px 0' }}>Marketplace Requests</p>
                <p className="dash-stat-trend" style={{ fontSize: '0.78rem', margin: 0, color: '#000000', fontWeight: 500 }}>
                  View live customization bids <ArrowUpRight size={12} />
                </p>
              </div>
            </Link>

            {/* Messaging Suite Alert Card */}
            <Link to="/chat" className="dash-stat-card glass-card" style={{ 
              background: '#ffffff', color: '#000000', border: '1px solid #000000', padding: '2rem', textDecoration: 'none', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div className="dash-stat-icon" style={{ background: '#000000', color: '#ffffff', borderRadius: '0', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={20} />
              </div>
              <div style={{ marginTop: '1.2rem' }}>
                <p className="dash-stat-value" style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif', color: '#000000', margin: '0 0 4px 0' }}>CHAT</p>
                <p className="dash-stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '700', color: '#666666', margin: '0 0 6px 0' }}>Messaging Suite</p>
                <p className="dash-stat-trend" style={{ fontSize: '0.78rem', margin: 0, color: '#000000', fontWeight: 500 }}>
                  Connect with customers directly <ArrowUpRight size={12} />
                </p>
              </div>
            </Link>

            {/* Analytics & Payouts KPI Card */}
            <Link to="/boutique/analytics" className="dash-stat-card glass-card" style={{ 
              background: '#ffffff', color: '#000000', border: '1px solid #000000', padding: '2rem', textDecoration: 'none', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div className="dash-stat-icon" style={{ background: '#000000', color: '#ffffff', borderRadius: '0', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={20} />
              </div>
              <div style={{ marginTop: '1.2rem' }}>
                <p className="dash-stat-value" style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif', color: '#000000', margin: '0 0 4px 0' }}>ANALYTICS</p>
                <p className="dash-stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '700', color: '#666666', margin: '0 0 6px 0' }}>Performance & Payouts</p>
                <p className="dash-stat-trend" style={{ fontSize: '0.78rem', margin: 0, color: '#000000', fontWeight: 500 }}>
                  View store sales & payouts <ArrowUpRight size={12} />
                </p>
              </div>
            </Link>
          </div>

          <section className="dash-section" style={{ marginBottom: '4rem' }}>
            <div className="visiting-card-heading">
              <div>
                <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem' }}>Visiting Card</h2>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>Add a photo, address, and contact details for your public boutique page</p>
              </div>
              <label className="visiting-card-toggle">
                <span>
                  <strong>{cardForm.visible ? 'Visible' : 'Hidden'}</strong>
                  Show on your boutique page
                </span>
                <span className="switch">
                  <input
                    type="checkbox"
                    checked={cardForm.visible}
                    onChange={(e) => handleCardVisibility(e.target.checked)}
                    disabled={savingCard || uploadingCard}
                    aria-label="Show visiting card"
                  />
                  <span className="slider" />
                </span>
              </label>
            </div>
            <div className="visiting-card-editor">
              <form className="visiting-card-form" onSubmit={saveVisitingCard}>
                <label className="span-2">
                  Photo
                  <div className="visiting-card-photo-field">
                    {cardForm.image ? (
                      <img src={cardForm.image} alt="" />
                    ) : (
                      <span className="visiting-card-photo-placeholder">Photo</span>
                    )}
                    <span className="visiting-card-upload">
                      {uploadingCard ? 'Uploading…' : 'Choose photo'}
                      <input type="file" accept="image/*" onChange={handleCardPhoto} disabled={uploadingCard} />
                    </span>
                  </div>
                </label>
                <label className="span-2">
                  Street
                  <input type="text" value={cardForm.street} onChange={(e) => updateCardField('street', e.target.value)} required />
                </label>
                <label>
                  City
                  <input type="text" value={cardForm.city} onChange={(e) => updateCardField('city', e.target.value)} required />
                </label>
                <label>
                  Province
                  <input type="text" value={cardForm.province} onChange={(e) => updateCardField('province', e.target.value)} />
                </label>
                <label>
                  Postal code
                  <input type="text" value={cardForm.postalCode} onChange={(e) => updateCardField('postalCode', e.target.value)} />
                </label>
                <label>
                  Phone
                  <input type="tel" value={cardForm.phone} onChange={(e) => updateCardField('phone', e.target.value)} required />
                </label>
                <label className="span-2">
                  Email
                  <input type="email" value={cardForm.email} onChange={(e) => updateCardField('email', e.target.value)} />
                </label>
                <div className="visiting-card-actions">
                  <button type="submit" className="btn-black" disabled={savingCard || uploadingCard} style={{ padding: '12px 24px' }}>
                    {savingCard ? 'Saving…' : 'Save visiting card'}
                  </button>
                  {cardMessage && <p className="visiting-card-note success">{cardMessage}</p>}
                  {cardError && <p className="visiting-card-note error">{cardError}</p>}
                </div>
              </form>
              <VisitingCard
                name={boutiqueData?.name}
                image={cardForm.image}
                addressLines={cardAddressLines}
                phone={cardForm.phone}
                email={cardForm.email}
              />
            </div>
          </section>

          <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem' }}>
            {/* Recent Orders/Sales */}
            <div className="dash-section">
              <div className="dash-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                  <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem' }}>Latest Sales</h2>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Real-time order tracking and management</p>
                </div>
                <Link to="/boutique/orders" className="btn btn-link btn-sm" style={{ fontWeight: '600' }}>
                  View Registry <ChevronRight size={14} />
                </Link>
              </div>
              <div className="orders-list glass-card" style={{ borderRadius: '0', background: 'transparent', border: 'none' }}>
                {recentOrders.length === 0 ? (
                  <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>No sales recorded yet.</p>
                ) : (
                  recentOrders.map((sale, i) => (
                    <div key={sale._id} className="order-item" style={{ 
                      padding: '1.5rem 0', borderBottom: i < recentOrders.length - 1 ? '1px solid #eee' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div className="order-info" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div className="order-date-box" style={{ textAlign: 'center', minWidth: '60px' }}>
                          <p style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>{new Date(sale.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="order-id" style={{ fontSize: '0.7rem', color: '#999', marginBottom: '2px' }}>{sale._id.slice(-8).toUpperCase()}</p>
                          <p className="order-name" style={{ fontWeight: '600', fontSize: '0.9rem' }}>{sale.items[0]?.name || 'Auto Stitch Order'}</p>
                          <p className="order-boutique text-muted" style={{ fontSize: '0.8rem' }}>Customer: {sale.customer?.name}</p>
                        </div>
                      </div>
                      <div className="order-meta" style={{ textAlign: 'right' }}>
                        <p className="order-amount" style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '5px' }}>PKR {sale.total.toLocaleString()}</p>
                        <span className={`status-badge status-${sale.status}`} style={{ 
                          fontSize: '0.6rem', padding: '4px 10px', background: '#f0f0f0', textTransform: 'uppercase', letterSpacing: '0.1em' 
                        }}>
                          {sale.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Bids */}
            <div className="dash-quick">
              <div className="dash-section-header" style={{ marginBottom: '2rem' }}>
                <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem' }}>Active Bids</h2>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>Direct customization requests from customers</p>
              </div>
              <div className="quick-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {activeBids.length === 0 ? (
                  <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>No active bids.</p>
                ) : (
                  activeBids.map((bid) => (
                    <div key={bid._id} className="quick-action-card glass-card" style={{ 
                      cursor: 'default', padding: '1.5rem', background: 'rgba(255,255,255,0.4)',
                      border: '1px solid rgba(0,0,0,0.05)', borderRadius: '0'
                    }}>
                      <div className="flex-between" style={{ marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', color: '#999' }}>{bid._id.slice(-6).toUpperCase()}</span>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Active
                        </p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p className="quick-action-label" style={{ fontWeight: '600', fontSize: '1rem' }}>{bid.request?.product || 'Custom Request'}</p>
                        <p className="quick-action-desc text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Customer: {bid.request?.customer?.name}</p>
                        
                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', marginBottom: '1rem' }}>
                          <div className="flex-between" style={{ fontSize: '0.75rem', marginBottom: '5px' }}>
                            <span>My Bid:</span>
                            <span style={{ fontWeight: '700' }}>PKR {bid.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/boutique/bids" className="btn-black btn-sm" style={{ width: '100%', fontSize: '0.7rem', letterSpacing: '0.1em', background: '#000', color: '#fff', textAlign: 'center', display: 'block', padding: '10px 0' }}>
                        UPDATE PROPOSAL
                      </Link>
                    </div>
                  ))
                )}
                <Link to="/boutique/bids" className="btn btn-outline btn-sm" style={{ width: '100%', height: '50px', borderRadius: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  VIEW ALL REQUESTS
                </Link>
              </div>
            </div>
          </div>

          {/* Digital Showroom Section (New real data section) */}
          <div className="dash-section" style={{ marginTop: '5rem', borderTop: '1px solid #eee', paddingTop: '4rem' }}>
            <div className="dash-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
              <div>
                <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '2.2rem' }}>Digital Showroom</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Manage your live product catalogue and inventory</p>
              </div>
              <Link to="/boutique/products" className="btn btn-link" style={{ fontWeight: '600' }}>Manage Entire Catalogue <ChevronRight size={14} /></Link>
            </div>
            <div className="products-registry glass-card" style={{ borderRadius: '0', padding: '1rem', background: '#fff' }}>
              {products.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <Package size={48} className="text-muted" style={{ marginBottom: '1rem' }} />
                  <p>Your showroom is empty.</p>
                </div>
              ) : (
                products.map((p, i) => (
                  <div key={p._id} className="product-registry-row" style={{ 
                    display: 'grid', gridTemplateColumns: '80px 1.5fr 1fr 1fr 1fr 1fr 100px', 
                    alignItems: 'center', padding: '1.5rem', gap: '1rem',
                    borderBottom: i < products.length - 1 ? '1px solid #f5f5f5' : 'none'
                  }}>
                    <img src={p.images?.[0] || 'https://via.placeholder.com/60x80'} alt={p.name} style={{ width: '60px', height: '80px', objectFit: 'cover' }} />
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#999' }}>{p.category}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: '500', fontSize: '0.85rem' }}>PKR {p.price.toLocaleString()}</p>
                      <p style={{ fontSize: '0.65rem', color: '#999', textTransform: 'uppercase' }}>Price</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: '500', fontSize: '0.85rem', color: p.stock < 5 ? '#f57c00' : 'inherit' }}>{p.stock}</p>
                      <p style={{ fontSize: '0.65rem', color: '#999', textTransform: 'uppercase' }}>Stock</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: '500', fontSize: '0.85rem' }}>{p.views || 0}</p>
                      <p style={{ fontSize: '0.65rem', color: '#999', textTransform: 'uppercase' }}>Views</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: '500', fontSize: '0.85rem' }}>{p.soldCount || 0}</p>
                      <p style={{ fontSize: '0.65rem', color: '#999', textTransform: 'uppercase' }}>Sold</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        fontSize: '0.6rem', padding: '4px 10px', background: p.status === 'approved' ? '#e8f5e9' : '#fff3e0', 
                        color: p.status === 'approved' ? '#2e7d32' : '#f57c00', textTransform: 'uppercase', letterSpacing: '0.1em' 
                      }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default BoutiqueDashboard;
