import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";
import { app } from "./firebase";

const categories = [
  "Food surplus",
  "Raw material",
  "By-product",
  "Industrial waste",
  "Packaging",
];

const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-3.8-flash" });

const jsonFrom = (text) => {
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || text;
  const start = block.indexOf("{");
  const end = block.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The AI response was not usable.");
  return JSON.parse(block.slice(start, end + 1));
};

const filePart = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("We could not read that image."));
    reader.onloadend = () =>
      resolve({
        inlineData: {
          data: String(reader.result).split(",")[1],
          mimeType: file.type,
        },
      });
    reader.readAsDataURL(file);
  });

async function ask(prompt, image) {
  const result = await model.generateContent(image ? [prompt, await filePart(image)] : prompt);
  return jsonFrom(result.response.text());
}

export async function analyseListingImage(file) {
  const result = await ask(
    `You are FoodLink's visual listing helper for Malaysian business surplus. Inspect the image only. Return JSON exactly with keys title, category, description and caution. category must be one of: ${categories.join(", ")}. title must be short, factual, and not invent brands or quantities. description: one clear sentence. caution: one short statement saying visual review only; never claim food safety, freshness, legality, or price.`,
    file,
  );
  return {
    title: String(result.title || "").slice(0, 70),
    category: categories.includes(result.category) ? result.category : "Food surplus",
    description: String(result.description || "Visual match found. Please review the details.").slice(0, 180),
    caution: String(result.caution || "Please verify the item before publishing.").slice(0, 160),
  };
}

export async function analyseSearchImage(file) {
  const result = await ask(
    `You are helping a Malaysian SME search FoodLink listings using an image. Inspect the image only. Return JSON exactly with keys query, category, summary. query must contain 2 to 6 generic supply keywords, no brands. category must be one of: All, ${categories.join(", ")}. summary must be a short practical search explanation. Do not make safety, price, or availability claims.`,
    file,
  );
  return {
    query: String(result.query || "").slice(0, 100),
    category: ["All", ...categories].includes(result.category) ? result.category : "All",
    summary: String(result.summary || "Image search is ready. Review the matches below.").slice(0, 160),
  };
}

export async function recommendSupplies(profile, listings) {
  const safeListings = listings.slice(0, 30).map((listing) => ({
    id: listing.id,
    name: listing.name,
    category: listing.category,
    area: listing.place,
    unit: listing.unit,
    price: Number(listing.price),
    remaining: Number(listing.remainingQuantity ?? listing.quantity),
  }));
  const result = await ask(
    `You are FoodLink's sourcing assistant. Suggest up to 3 suitable listing IDs for this business. Use only the supplied data. Return JSON exactly with keys recommendations and note. recommendations is an array of objects with id and reason. Do not claim stock quality, savings, distance, delivery, or safety. Business: ${JSON.stringify({ category: profile?.category, area: profile?.region, lookingFor: profile?.lookingFor })}. Listings: ${JSON.stringify(safeListings)}.`,
  );
  const allowed = new Set(safeListings.map((listing) => listing.id));
  return {
    recommendations: Array.isArray(result.recommendations)
      ? result.recommendations
          .filter((entry) => allowed.has(entry?.id))
          .slice(0, 3)
          .map((entry) => ({ id: entry.id, reason: String(entry.reason || "May suit your stated needs.").slice(0, 140) }))
      : [],
    note: String(result.note || "Suggestions use your business preferences and live listing details.").slice(0, 180),
  };
}
