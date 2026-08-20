import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessageSquare, X, Send, Minus, Sparkles, Scissors } from 'lucide-react';
import { motion } from 'framer-motion';
import API_URL from '../../config/api';
import './Chatbot.css';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hello! I'm Stitchie, your fashion assistant. Ask me anything, or tell me how you'd like to customize a garment and I'll help you plan it out.",
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [productContext, setProductContext] = useState(null); // { productId, productName }
  const scrollRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Detect if the user is currently on a product page (/products/:id) so the
  // chatbot can tie a finalized customization plan to that product.
  useEffect(() => {
    const match = location.pathname.match(/^\/products\/([^/]+)/);
    if (!match) {
      setProductContext(null);
      return;
    }
    const productId = match[1];

    let cancelled = false;
    axios
      .get(`${API_URL}/api/products/${productId}`)
      .then(({ data }) => {
        if (cancelled) return;
        const product = data?.data || data?.product || data;
        if (product?.name) {
          setProductContext({ productId, productName: product.name });
        } else {
          setProductContext({ productId, productName: null });
        }
      })
      .catch(() => {
        if (!cancelled) setProductContext({ productId, productName: null });
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const goFillCustomizationForm = (plan) => {
    const productId = plan.productId || productContext?.productId || null;
    const productName = plan.productName || productContext?.productName || null;

    sessionStorage.setItem(
      'stitchie_plan',
      JSON.stringify({
        selectedRegions: plan.selectedRegions,
        description: plan.description,
        budget: plan.budget,
      })
    );

    const params = new URLSearchParams();
    if (productId) params.set('id', productId);
    if (productName) params.set('name', productName);
    const query = params.toString();

    setIsOpen(false);
    navigate(`/customize${query ? `?${query}` : ''}`);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    // Send only role/content for the last 10 turns (server also caps this).
    const history = nextMessages
      .slice(0, -1)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-10);

    try {
      const { data } = await axios.post(
        `${API_URL}/api/chatbot`,
        {
          message: userMsg.content,
          history,
          context: productContext || {},
        },
        { withCredentials: true }
      );

      if (data.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply, plan: data.plan || null }]);
      } else {
        throw new Error('Failed to get reply');
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, I'm having a bit of trouble connecting. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        drag
        dragConstraints={{ left: -window.innerWidth + 80, right: 0, top: -window.innerHeight + 80, bottom: 0 }}
        dragElastic={0.1}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9, cursor: 'grabbing' }}
        className="chatbot-toggle"
        onClick={() => setIsOpen(true)}
        style={{ cursor: 'grab', touchAction: 'none' }}
      >
        <MessageSquare size={24} />
        <span className="toggle-badge">AI</span>
      </motion.button>
    );
  }

  return (
    <div className={`chatbot-window ${isMinimized ? 'minimized' : ''}`}>
      <header className="chatbot-header">
        <div className="header-info">
          <div className="bot-avatar">
            <Sparkles size={18} fill="currentColor" />
          </div>
          <div>
            <h3>Stitchie</h3>
            <p>AI Couture Assistant</p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsMinimized(!isMinimized)}><Minus size={18} /></button>
          <button onClick={() => setIsOpen(false)}><X size={18} /></button>
        </div>
      </header>

      {!isMinimized && (
        <>
          <div className="chatbot-messages" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                <div className="bubble-content">
                  {msg.content}
                  {msg.plan && (
                    <div className="plan-card">
                      <div className="plan-card-title">
                        <Scissors size={14} />
                        <span>Customization plan ready</span>
                      </div>
                      <ul className="plan-card-regions">
                        {msg.plan.selectedRegions.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                      {msg.plan.budget && <div className="plan-card-budget">Budget: ~{msg.plan.budget} PKR</div>}
                      <button type="button" className="plan-card-cta" onClick={() => goFillCustomizationForm(msg.plan)}>
                        Fill customization form &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-bubble assistant">
                <div className="bubble-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <form className="chatbot-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={!input.trim() || isLoading}>
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}