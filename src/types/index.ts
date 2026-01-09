export interface Feed {
  name: string;
  url: string;
  type?: string;
  region?: string;
}

export interface NewsItem {
  source: string;
  title: string;
  link: string;
  pubDate: Date;
  isAlert: boolean;
  monitorColor?: string;
  tier?: number;
}

export type VelocityLevel = 'normal' | 'elevated' | 'spike';
export type SentimentType = 'negative' | 'neutral' | 'positive';
export type DeviationLevel = 'normal' | 'elevated' | 'spike' | 'quiet';

export interface VelocityMetrics {
  sourcesPerHour: number;
  level: VelocityLevel;
  trend: 'rising' | 'stable' | 'falling';
  sentiment: SentimentType;
  sentimentScore: number;
}

export interface ClusteredEvent {
  id: string;
  primaryTitle: string;
  primarySource: string;
  primaryLink: string;
  sourceCount: number;
  topSources: Array<{ name: string; tier: number; url: string }>;
  allItems: NewsItem[];
  firstSeen: Date;
  lastUpdated: Date;
  isAlert: boolean;
  monitorColor?: string;
  velocity?: VelocityMetrics;
}

export interface Sector {
  symbol: string;
  name: string;
}

export interface Commodity {
  symbol: string;
  name: string;
  display: string;
}

export interface MarketSymbol {
  symbol: string;
  name: string;
  display: string;
}

export interface MarketData {
  symbol: string;
  name: string;
  display: string;
  price: number | null;
  change: number | null;
}

export interface CryptoData {
  name: string;
  symbol: string;
  price: number;
  change: number;
}

export interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  keywords: string[];
  subtext?: string;
  agencies?: string[];
  level?: 'low' | 'elevated' | 'high';
  description?: string;
  status?: string;
}

export interface StrategicWaterway {
  id: string;
  name: string;
  lat: number;
  lon: number;
  description?: string;
}

export interface APTGroup {
  id: string;
  name: string;
  aka: string;
  sponsor: string;
  lat: number;
  lon: number;
}

export interface ConflictZone {
  id: string;
  name: string;
  coords: [number, number][];
  center: [number, number];
  intensity?: 'high' | 'medium' | 'low';
  parties?: string[];
  casualties?: string;
  displaced?: string;
  keywords?: string[];
  startDate?: string;
  location?: string;
  description?: string;
  keyDevelopments?: string[];
}

export interface MilitaryBase {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'us-nato' | 'china' | 'russia';
}

export interface UnderseaCable {
  id: string;
  name: string;
  points: [number, number][];
  major?: boolean;
}

export interface ShippingChokepoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  desc: string;
}

export interface CyberRegion {
  id: string;
  group: string;
  aka: string;
  sponsor: string;
}

export interface NuclearFacility {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'plant' | 'enrichment' | 'weapons';
  status: 'active' | 'contested' | 'inactive';
}

export interface Earthquake {
  id: string;
  place: string;
  magnitude: number;
  lat: number;
  lon: number;
  depth: number;
  time: Date;
  url: string;
}

export interface Monitor {
  id: string;
  keywords: string[];
  color: string;
  name?: string;
  lat?: number;
  lon?: number;
}

export interface PanelConfig {
  name: string;
  enabled: boolean;
  priority?: number;
}

export interface MapLayers {
  conflicts: boolean;
  bases: boolean;
  cables: boolean;
  hotspots: boolean;
  nuclear: boolean;
  sanctions: boolean;
  earthquakes: boolean;
  weather: boolean;
  economic: boolean;
  countries: boolean;
}

export interface PredictionMarket {
  title: string;
  yesPrice: number;
  volume?: number;
}

export interface AppState {
  currentView: 'global' | 'us';
  mapZoom: number;
  mapPan: { x: number; y: number };
  mapLayers: MapLayers;
  panels: Record<string, PanelConfig>;
  monitors: Monitor[];
  allNews: NewsItem[];
  isLoading: boolean;
}

export type FeedCategory = 'politics' | 'tech' | 'finance' | 'gov' | 'intel';
