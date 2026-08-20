const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper: split a base64 data URL like "data:image/png;base64,AAAA..."
// into { mimeType, data }
function parseDataUrl(dataUrl) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

// Helper: fetch a garment image (could be a Cloudinary URL, or already
// a base64 data URL) and normalize it into { mimeType, data }.
async function normalizeGarmentImage(garmentImage) {
  if (garmentImage.startsWith('data:')) {
    return parseDataUrl(garmentImage);
  }
  const response = await fetch(garmentImage);
  if (!response.ok) {
    throw new Error(`Failed to fetch garment image (status ${response.status})`);
  }
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return { mimeType: contentType, data: base64 };
}

// @desc    Generate a virtual try-on image (person wearing the garment)
// @route   POST /api/tryon/generate
// @access  Public (tighten to `protect` middleware if you want to require login)
const generateTryOn = async (req, res) => {
  try {
    const { userPhoto, garmentImage } = req.body;

    if (!userPhoto || !garmentImage) {
      return res.status(400).json({
        success: false,
        message: 'Both userPhoto and garmentImage are required',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY is missing in backend/.env',
      });
    }

    const personPart = parseDataUrl(userPhoto);
    if (!personPart) {
      return res.status(400).json({
        success: false,
        message: 'userPhoto must be a base64 data URL (e.g. data:image/png;base64,...)',
      });
    }

    const garmentPart = await normalizeGarmentImage(garmentImage);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const prompt = `From Image 1, use the exact clothing, including its specific fit type (e.g., loose, baggy, oversized, tailored, slim-fit), its volume, drape, color, and pattern. From Image 2, use the exact person, including their face, body shape, pose, and every aspect of their physical appearance. Also, use the exact background, environment, lighting, and overall composition from Image 2.
Seamlessly merge the clothing from Image 1 onto the person in Image 2. The new outfit must appear as a genuine, unedited photograph of the person in Image 2 wearing the new clothes.
Ensure the clothing realistically drapes and conforms to the person's body and pose, with natural folds, wrinkles, and shadows that are consistent with the fabric type and the lighting in Image 2. Crucially, the new clothing must maintain its original volume and fitting style as seen in Image 1, not conforming unnaturally tightly to the body in Image 2 if it was originally a looser fit. The lighting and shadows on the clothing must match the ambient lighting of the background in Image 2. Do not introduce any new light sources or colors.
Preserve the sharpness, detail, and resolution of the original person and background in Image 2. The final result should not be blurry, smoothed, or reduced in quality. The body's proportions must remain normal and realistic without any distortion or awkward appearance.
The final output should be a single, cohesive, photorealistic image that looks like a high-quality photograph taken in one shot. Consider every request as new and dont take any reference from the previous images. If models in the first image are wearing multiple clothes, use the outermost layer of clothing for the try-on. If the models are turning or not facing the camera, ensure the final image shows the person facing the camera directly. End result should be strictly a single image, that looks like a high-quality photograph taken in one shot.`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: garmentPart.mimeType, data: garmentPart.data } },
      { inlineData: { mimeType: personPart.mimeType, data: personPart.data } },
    ]);

    const parts = result?.response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart) {
      const textPart = parts.find((p) => p.text);
      return res.status(502).json({
        success: false,
        message: 'The AI model did not return an image. Please try a different photo.',
        modelText: textPart?.text || null,
      });
    }

    const resultDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

    res.json({ success: true, image: resultDataUrl });
  } catch (error) {
    console.error('Try-on generation error:', error);
    const isQuotaError = error?.status === 429 || /quota exceeded|rate limit/i.test(error?.message || '');
    res.status(isQuotaError ? 503 : 500).json({
      success: false,
      message: isQuotaError
        ? 'Virtual try-on AI quota is unavailable. Please enable Gemini billing or use an API key with image-generation quota.'
        : 'Server error while generating try-on image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = { generateTryOn };