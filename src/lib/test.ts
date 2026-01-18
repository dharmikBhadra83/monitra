import { ChatOpenAI, tools } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});

const productUrl = "https://www.flipkart.com/apple-iphone-16-black-128-gb/p/itmb07d67f995271".trim();


const prompt = `
Extract product data from the search results.

Return ONLY valid JSON:
{
  "name": string | null,
  "brand": string | null,
  "price": {
    "amount": string | null,
    "currency": string | null
  },
  "image_url": string | null
}

Rules:
- No explanations
- Use null if unknown
- Currency must be ISO (INR, USD)
`;

const response = await model.invoke(
  [
    { role: "system", content: prompt },
    { role: "user", content: `Extract product data from this URL: ${productUrl}` },
  ],
  {
    tools: [
      tools.webSearch({
        filters: {
          allowedDomains: ["www.flipkart.com"],
        },
      }),
    ],
  }
);

console.log(response.content);