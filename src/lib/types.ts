export interface ProductDNA {
    name: string;
    brand: string;
    price: number;
    currency: string;
    category: string;
    features: string[];
    description?: string;
    imageUrl?: string;
    url: string;
    verifiedByAI?: boolean; // Whether AI verified the price and currency match
}

export interface CompetitorProduct {
    name: string;
    brand: string;
    price: number;
    currency: string;
    url: string;
    imageUrl?: string;
    similarityScore: number; // 0 to 1
    matchReason: string;
}

export interface IntelligenceReport {
    targetProduct: ProductDNA;
    competitors: CompetitorProduct[];
    marketAveragePrice: number;
    pricePosition: 'higher' | 'lower' | 'average';
    analysisDate: string;
}
