const OpenAI = require('openai');
const { z } = require('zod');
const Product = require('../models/Product');
const Boutique = require('../models/Boutique');

// Regions supported by the Customize form (frontend/src/pages/Customize/Customize.jsx).
// Kept in sync manually — if you add a region there, add it here too.
const CUSTOMIZABLE_REGIONS = ['neckline', 'sleeves', 'hemline', 'embroidery', 'collar'];

const planSchema = z.object({
  selectedRegions: z.array(z.enum(CUSTOMIZABLE_REGIONS)).min(1),
  description: z.string().max(500).optional().default(''),
  budget: z.number().positive().optional(),
});

// Extracts a "[[PLAN]]{...}[[/PLAN]]" block the model emits once a
// customization plan is finalized. Returns { cleanReply, plan }.
// `plan` is null if no block was found or it failed validation.
function extractPlan(rawReply) {
  const match = rawReply.match(/\[\[PLAN\]\]([\s\S]*?)\[\[\/PLAN\]\]/);
  if (!match) {
    return { cleanReply: rawReply.trim(), plan: null };
  }

  const cleanReply = (rawReply.slice(0, match.index) + rawReply.slice(match.index + match[0].length)).trim();

  try {
    const parsed = JSON.parse(match[1]);
    const result = planSchema.safeParse(parsed);
    if (!result.success) {
      return { cleanReply, plan: null };
    }
    return { cleanReply, plan: result.data };
  } catch {
    return { cleanReply, plan: null };
  }
}

// @desc    Get chatbot response (RAG + customization advisor, multi-turn)
// @route   POST /api/chatbot
// @access  Public (optionalAuth — works for guests, personalized if logged in)
const getChatbotResponse = async (req, res) => {
  try {
    const { message, history, context } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ success: false, message: 'Groq API Key missing. Please check backend .env file.' });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    // --- 1. Lightweight RAG: search DB for relevant products/boutiques ---
    const keywords = message.split(' ').filter((word) => word.length > 3);
    let dbContext = '';

    if (keywords.length > 0) {
      const productQuery = {
        $or: [
          { name: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } },
          { category: { $regex: keywords.join('|'), $options: 'i' } },
        ],
      };
      const boutiqueQuery = {
        $or: [
          { name: { $regex: keywords.join('|'), $options: 'i' } },
          { description: { $regex: keywords.join('|'), $options: 'i' } },
        ],
      };

      const [products, boutiques] = await Promise.all([
        Product.find(productQuery).limit(5).select('name description price category').lean(),
        Boutique.find(boutiqueQuery).limit(3).select('name description').lean(),
      ]);

      if (products.length > 0) {
        dbContext += '\nRelevant Products found in our database:\n';
        products.forEach((p) => {
          dbContext += `- ${p.name}: ${p.price} PKR, Category: ${p.category}. ${(p.description || '').substring(0, 100)}...\n`;
        });
      }
      if (boutiques.length > 0) {
        dbContext += '\nRelevant Boutiques found in our database:\n';
        boutiques.forEach((b) => {
          dbContext += `- ${b.name}: ${(b.description || '').substring(0, 100)}...\n`;
        });
      }
    }

    // --- 2. Page context (e.g. which product the user is currently viewing) ---
    let pageContext = 'The user is not currently viewing a specific product.';
    if (context?.productId) {
      pageContext = `The user is currently viewing this product: "${context.productName || 'Unnamed product'}" (id: ${context.productId}).`;
    }
    if (req.user) {
      pageContext += ` The user is logged in as "${req.user.name || req.user.email}".`;
    }

    // --- 3. System prompt: customization advisor persona ---
    const systemPrompt = `You are "Stitchie", the AI assistant for Auto Stitch, a premium custom-tailoring fashion marketplace in Pakistan.

Auto Stitch lets customers request PART-LEVEL garment customization. Customers pick which parts of a garment to customize, describe what they want, and boutiques then bid to make it. The only customizable regions are exactly these five: neckline, sleeves, hemline, embroidery, collar. Do not invent other regions.

Your two jobs:
1. General help: answer questions about products, boutiques, Virtual Try-On (upload a photo to preview clothes), and how the platform works. Use the "Relevant Products/Boutiques" context below if present.
2. Customization advisor (your main job): help users figure out and finalize a customization plan.
   - If the user clearly knows what they want, quickly confirm the specific regions and details, ask about budget if missing, and move to finalize.
   - If the user seems unsure or asks "what is customization" / "what can I change" type questions, explain simply: e.g. "neckline" = the cut around the neck (round, boat, V-neck), "sleeves" = full/half/sleeveless style, "hemline" = the bottom edge length/cut, "embroidery" = decorative stitch work/patterns, "collar" = collar style. Suggest a couple of popular combinations for the occasion they mention (e.g. formal shalwar kameez, wedding wear, casual kurta) to help them decide.
   - Ask at most ONE clarifying question per reply. Don't interrogate — keep it conversational.
   - Only finalize a plan once the user has picked at least one region AND given some description of what they want, AND has confirmed they're ready (e.g. "yes", "that's it", "book it", "haan theek hai"). Never finalize on your own guess.
   - When finalizing, append EXACTLY one machine-readable block at the very end of your reply, on its own, in this exact format (valid JSON, double-quoted keys/strings, regions from the allowed list only):
[[PLAN]]{"selectedRegions":["neckline","embroidery"],"description":"short summary of what the user wants","budget":5000}[[/PLAN]]
     Omit "budget" entirely if the user never mentioned one. This block is stripped before the user sees your message, so don't reference it in your visible reply — just write a normal friendly closing line before it, like confirming you're preparing their request.

Style:
- The user may write in English, Urdu, or Hinglish (Roman Urdu mixed with English) — reply naturally in whichever style they use.
- Be warm, concise (2-4 sentences, excluding the plan block), and fashion-savvy. Use PKR for prices.
- Never fabricate specific boutique names/prices that aren't in the provided context.

Context:
${pageContext}
${dbContext || 'No specific products or boutiques matched this query.'}`;

    // --- 4. Build multi-turn message list (last 10 turns from client) ---
    const trimmedHistory = Array.isArray(history)
      ? history
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...trimmedHistory,
        { role: 'user', content: message },
      ],
    });

    const rawReply = completion.choices[0].message.content;
    const { cleanReply, plan } = extractPlan(rawReply);

    const responsePlan = plan
      ? {
          ...plan,
          productId: context?.productId || null,
          productName: context?.productName || null,
        }
      : null;

    res.json({ success: true, reply: cleanReply, plan: responsePlan });
  } catch (error) {
    console.error('Groq Chatbot Error:', error);
    res.status(500).json({ success: false, message: 'I am having trouble stitching together an answer right now. Please try again later.' });
  }
};

module.exports = { getChatbotResponse };