import { MenuThemeId, MenuThemeConfig, Restaurant, SubscriptionPlan } from '../types';

export type ThemePresetConfig = Required<Omit<MenuThemeConfig, '_theme_id' | 'by_theme'>>;

export interface ThemePresetDefinition {
  id: MenuThemeId;
  name: string;
  tagline: string;
  referenceStyle: string;
  description: string;
  minPlan: SubscriptionPlan;
  badgeText: string;
  swatches: {
    bg: string;
    primary: string;
    secondary?: string;
    accent: string;
    card: string;
    text: string;
  };
  defaultConfig: ThemePresetConfig;
}

export const MENU_THEME_PRESETS: Record<MenuThemeId, ThemePresetDefinition> = {
  classic: {
    id: 'classic',
    name: 'Classic Restaurant',
    tagline: 'Trusted Multi-Cuisine QR Ordering',
    referenceStyle: 'Default RestoQR Experience',
    description:
      'Preserves the complete signature RestoQR layout with hero cover banner, floating restaurant identity card, chef recommendations rail, category pills, and sticky bottom cart bar.',
    minPlan: 'starter',
    badgeText: 'Default • All Plans',
    swatches: {
      bg: '#F8FAFC',
      primary: '#EA580C',
      accent: '#1E293B',
      card: '#FFFFFF',
      text: '#0F172A',
    },
    defaultConfig: {
      primary_color: '#EA580C',
      secondary_color: '#0F172A',
      background_color: '#F8FAFC',
      card_color: '#FFFFFF',
      text_color: '#0F172A',
      accent_color: '#F97316',
      font_family: 'Plus Jakarta Sans',
      button_style: 'rounded',
      card_style: 'elevated',
      header_layout: 'split',
      category_layout: 'pills',
      banner_style: 'hero_overlay',
      image_aspect: 'square',
      spacing_density: 'comfortable',
      promo_badge: 'CHEF SPECIAL',
      promo_title: 'Freshly Prepared at Your Table',
      promo_subtitle: 'Scan, customize your dish, and send directly to our kitchen.',
      promo_cta_text: 'Explore Bestsellers',
      promo_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
      editorial_title: 'Chef Recommended & Bestsellers',
      editorial_subtitle: 'Most loved dishes ordered by our guests today',
      show_hero_banner: true,
      show_promo_section: false,
      show_bestsellers: true,
      show_ratings: true,
      show_prep_time: true,
      show_dietary_badges: true,
      show_spicy_indicator: true,
      show_weight: true,
      show_search_bar: true,
    },
  },
  hot_ready: {
    id: 'hot_ready',
    name: 'Hot & Ready',
    tagline: 'High-Conversion Fast Casual & Pizza App',
    referenceStyle: 'Little Caesars App Design',
    description:
      'Warm orange & cream palette with bold promotional hero deal banner, visual horizontal food category icons, popular item showcase cards, high-contrast ADD buttons, and mobile bottom navigation.',
    minPlan: 'growth',
    badgeText: 'Growth & Pro',
    swatches: {
      bg: '#FFF8F1',
      primary: '#FF5A00',
      accent: '#231F20',
      card: '#FFFFFF',
      text: '#1C1917',
    },
    defaultConfig: {
      primary_color: '#FF5A00',
      secondary_color: '#231F20',
      background_color: '#FFF8F1',
      card_color: '#FFFFFF',
      text_color: '#1C1917',
      accent_color: '#FF7A2F',
      font_family: 'Plus Jakarta Sans',
      button_style: 'pill',
      card_style: 'elevated',
      header_layout: 'split',
      category_layout: 'icons',
      banner_style: 'split_card',
      image_aspect: 'square',
      spacing_density: 'comfortable',
      promo_badge: 'HOT-N-READY DEAL 🔥',
      promo_title: 'Oven-Hot Combos Ready in Minutes!',
      promo_subtitle: 'Loaded toppings, molten cheese & signature sides served piping hot to your table.',
      promo_cta_text: 'ORDER NOW',
      promo_image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=80',
      editorial_title: 'Popular Right Now',
      editorial_subtitle: 'Fan-favorite picks flying out of our kitchen',
      show_hero_banner: true,
      show_promo_section: true,
      show_bestsellers: true,
      show_ratings: true,
      show_prep_time: true,
      show_dietary_badges: true,
      show_spicy_indicator: true,
      show_weight: true,
      show_search_bar: true,
    },
  },
  premium_cafe: {
    id: 'premium_cafe',
    name: 'Premium Cafe',
    tagline: 'Editorial Botanical & Artisanal Bistro',
    referenceStyle: 'Bean & Bloom Multi-Screen Design',
    description:
      'Refined warm cream canvas with deep forest green & champagne gold accents, editorial serif typography, large artisanal photography, seasonal curated collections, and serene visual hierarchy.',
    minPlan: 'growth',
    badgeText: 'Growth & Pro',
    swatches: {
      bg: '#FBF8F3',
      primary: '#1B3B2B',
      accent: '#C8A265',
      card: '#FFFFFF',
      text: '#1C2822',
    },
    defaultConfig: {
      primary_color: '#1B3B2B',
      secondary_color: '#2C4A3B',
      background_color: '#FBF8F3',
      card_color: '#FFFFFF',
      text_color: '#1C2822',
      accent_color: '#C8A265',
      font_family: 'Cormorant Garamond',
      button_style: 'pill',
      card_style: 'bordered',
      header_layout: 'editorial',
      category_layout: 'tabs',
      banner_style: 'hero_overlay',
      image_aspect: 'portrait',
      spacing_density: 'spacious',
      promo_badge: 'SEASONAL ROAST & BAKE',
      promo_title: 'Handcrafted Moments, Poured with Care',
      promo_subtitle: 'Single-origin specialty brews, artisanal viennoiserie, and botanical plates crafted daily.',
      promo_cta_text: 'Discover the Collection',
      promo_image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80',
      editorial_title: 'House Signatures & Reserve',
      editorial_subtitle: 'Curated by our head barista and pastry chef',
      show_hero_banner: true,
      show_promo_section: true,
      show_bestsellers: true,
      show_ratings: true,
      show_prep_time: true,
      show_dietary_badges: true,
      show_spicy_indicator: false,
      show_weight: true,
      show_search_bar: true,
    },
  },
  modern_app: {
    id: 'modern_app',
    name: 'Modern Ordering App',
    tagline: 'Sleek Product-Focused Mobile Commerce',
    referenceStyle: 'Six-Screen Coffee Ordering App',
    description:
      'Dark espresso header with warm caramel accents, 2-column mobile product cards, instant size/quantity selectors, live order tracker pill, and ultra-responsive native app feel.',
    minPlan: 'growth',
    badgeText: 'Growth & Pro',
    swatches: {
      bg: '#F9F9F9',
      primary: '#C67C4E',
      accent: '#1E1E1E',
      card: '#FFFFFF',
      text: '#242424',
    },
    defaultConfig: {
      primary_color: '#C67C4E',
      secondary_color: '#1E1E1E',
      background_color: '#F9F9F9',
      card_color: '#FFFFFF',
      text_color: '#242424',
      accent_color: '#EDD6C8',
      font_family: 'DM Sans',
      button_style: 'rounded',
      card_style: 'elevated',
      header_layout: 'minimal',
      category_layout: 'pills',
      banner_style: 'compact_promo',
      image_aspect: 'square',
      spacing_density: 'compact',
      promo_badge: 'PROMO',
      promo_title: 'Buy 1 Get 1 Special Offer',
      promo_subtitle: 'Exclusive table-order perks on handcrafted drinks and signature mains.',
      promo_cta_text: 'Claim Offer',
      promo_image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1000&auto=format&fit=crop&q=80',
      editorial_title: 'Featured Creations',
      editorial_subtitle: 'Tap + to add directly or customize size & extras',
      show_hero_banner: true,
      show_promo_section: true,
      show_bestsellers: true,
      show_ratings: true,
      show_prep_time: true,
      show_dietary_badges: true,
      show_spicy_indicator: true,
      show_weight: false,
      show_search_bar: true,
    },
  },
  custom_brand: {
    id: 'custom_brand',
    name: 'Custom Brand Theme',
    tagline: 'Fully Bespoke White-Label Design Studio',
    referenceStyle: 'Custom Brand Architecture',
    description:
      'Complete creative control over brand colors, typography, button geometry, card elevation, banner style, category navigation, and section visibility tailored to your restaurant identity.',
    minPlan: 'pro',
    badgeText: 'Pro & Custom Plan',
    swatches: {
      bg: '#FAF7F2',
      primary: '#9A3412',
      accent: '#D97706',
      card: '#FFFFFF',
      text: '#1C1917',
    },
    defaultConfig: {
      primary_color: '#9A3412',
      secondary_color: '#1C1917',
      background_color: '#FAF7F2',
      card_color: '#FFFFFF',
      text_color: '#1C1917',
      accent_color: '#D97706',
      font_family: 'Playfair Display',
      button_style: 'pill',
      card_style: 'elevated',
      header_layout: 'centered',
      category_layout: 'pills',
      banner_style: 'split_card',
      image_aspect: 'landscape',
      spacing_density: 'comfortable',
      promo_badge: 'HOUSE EXCLUSIVE',
      promo_title: 'Crafted to Perfection, Served at Your Table',
      promo_subtitle: 'Experience our signature culinary creations curated with locally sourced ingredients.',
      promo_cta_text: 'View Signature Dishes',
      promo_image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
      editorial_title: 'Chef’s Tasting Selection',
      editorial_subtitle: 'Handpicked favorites from our kitchen',
      show_hero_banner: true,
      show_promo_section: true,
      show_bestsellers: true,
      show_ratings: true,
      show_prep_time: true,
      show_dietary_badges: true,
      show_spicy_indicator: true,
      show_weight: true,
      show_search_bar: true,
    },
  },
};

export const ALL_THEME_IDS: MenuThemeId[] = [
  'classic',
  'hot_ready',
  'premium_cafe',
  'modern_app',
  'custom_brand',
];

export function getDefaultAllowedThemesForPlan(plan?: SubscriptionPlan): MenuThemeId[] {
  switch (plan) {
    case 'pro':
    case 'custom':
      return ['classic', 'hot_ready', 'premium_cafe', 'modern_app', 'custom_brand'];
    case 'growth':
      return ['classic', 'hot_ready', 'premium_cafe', 'modern_app'];
    case 'starter':
    default:
      return ['classic'];
  }
}

export function getAllowedThemesForRestaurant(restaurant?: Partial<Restaurant> | null): MenuThemeId[] {
  if (!restaurant) return ['classic'];
  if (Array.isArray(restaurant.allowed_themes) && restaurant.allowed_themes.length > 0) {
    const valid = restaurant.allowed_themes.filter((t): t is MenuThemeId =>
      ALL_THEME_IDS.includes(t as MenuThemeId)
    );
    if (valid.length > 0) {
      return valid;
    }
  }
  return getDefaultAllowedThemesForPlan(restaurant.plan);
}

export function canRestaurantCustomizeTheme(restaurant?: Partial<Restaurant> | null): boolean {
  if (!restaurant) return false;
  if (typeof restaurant.can_customize_theme === 'boolean') {
    return restaurant.can_customize_theme;
  }
  return true;
}

export function getEffectiveActiveTheme(
  restaurant?: Partial<Restaurant> | null,
  previewOverride?: string | null
): MenuThemeId {
  if (previewOverride && ALL_THEME_IDS.includes(previewOverride as MenuThemeId)) {
    return previewOverride as MenuThemeId;
  }
  const allowed = getAllowedThemesForRestaurant(restaurant);
  const requested = restaurant?.active_theme || allowed[0] || 'classic';
  if (allowed.includes(requested)) {
    return requested;
  }
  return allowed[0] || 'classic';
}

export function getMergedThemeConfig(
  themeId: MenuThemeId,
  customConfig?: MenuThemeConfig | null,
  restaurant?: Partial<Restaurant> | null
): ThemePresetConfig {
  const preset = MENU_THEME_PRESETS[themeId] || MENU_THEME_PRESETS.classic;
  const base: ThemePresetConfig = { ...preset.defaultConfig };
  if (restaurant?.cover_image) {
    base.promo_image = restaurant.cover_image;
  }
  if (!customConfig) return base;

  // 1. Check if there is a per-theme customization saved for this specific themeId
  const perThemeCustom = customConfig.by_theme?.[themeId];
  if (perThemeCustom && typeof perThemeCustom === 'object') {
    const cleanEntries = Object.entries(perThemeCustom).filter(
      ([k, v]) => k !== 'by_theme' && k !== '_theme_id' && v !== undefined && v !== null && v !== ''
    );
    return {
      ...base,
      ...Object.fromEntries(cleanEntries),
    } as ThemePresetConfig;
  }

  // 2. Fallback: only apply top-level customConfig if it belongs to this themeId
  const topLevelThemeId = customConfig._theme_id || restaurant?.active_theme || 'classic';
  if (topLevelThemeId === themeId) {
    const cleanTopEntries = Object.entries(customConfig).filter(
      ([k, v]) => k !== 'by_theme' && k !== '_theme_id' && v !== undefined && v !== null && v !== ''
    );
    return {
      ...base,
      ...Object.fromEntries(cleanTopEntries),
    } as ThemePresetConfig;
  }

  return base;
}

export function buildSavedThemeConfig(
  themeId: MenuThemeId,
  currentConfig: Partial<MenuThemeConfig>,
  existingThemeConfig?: MenuThemeConfig | null
): MenuThemeConfig {
  const cleanCurrent: Record<string, any> = {};
  Object.entries(currentConfig).forEach(([k, v]) => {
    if (k !== 'by_theme' && k !== '_theme_id' && v !== undefined) {
      cleanCurrent[k] = v;
    }
  });

  const prevByTheme =
    existingThemeConfig?.by_theme && typeof existingThemeConfig.by_theme === 'object'
      ? { ...existingThemeConfig.by_theme }
      : {};

  // Also preserve previous top-level config under its _theme_id if it wasn't in by_theme yet
  if (existingThemeConfig?._theme_id && !prevByTheme[existingThemeConfig._theme_id]) {
    const prevTop: Record<string, any> = {};
    Object.entries(existingThemeConfig).forEach(([k, v]) => {
      if (k !== 'by_theme' && k !== '_theme_id' && v !== undefined) {
        prevTop[k] = v;
      }
    });
    prevByTheme[existingThemeConfig._theme_id] = prevTop;
  }

  return {
    ...(cleanCurrent as MenuThemeConfig),
    _theme_id: themeId,
    by_theme: {
      ...prevByTheme,
      [themeId]: cleanCurrent,
    },
  };
}

