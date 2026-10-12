import React from 'react';
import { Restaurant, Category, MenuItem, Order, MenuThemeId, MenuThemeConfig } from '../types';
import { getMergedThemeConfig, MENU_THEME_PRESETS, ALL_THEME_IDS, ThemePresetConfig } from '../lib/themes';
import {
  Search, Flame, Clock, Sparkles, Utensils, BellRing, MapPin,
  Plus, ShoppingBag, X, Star, Eye, SlidersHorizontal, Wifi, QrCode, ChevronRight
} from 'lucide-react';

interface CustomerThemedMenuBodyProps {
  themeId: MenuThemeId;
  restaurant: Restaurant;
  categories?: Category[];
  items?: MenuItem[];
  filteredDishes?: MenuItem[];
  recommendedDishes?: MenuItem[];
  selectedTableNumber?: number;
  language?: 'en' | 'hi' | 'mr';
  setLanguage?: (lang: 'en' | 'hi' | 'mr') => void;
  t?: Record<string, string>;
  selectedCategory?: string;
  setSelectedCategory?: (cat: string) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  vegOnlyFilter?: boolean;
  setVegOnlyFilter?: React.Dispatch<React.SetStateAction<boolean>> | ((updater: boolean | ((p: boolean) => boolean)) => void);
  getItemQuantityInCart?: (itemId: string) => number;
  openCustomization?: (item: MenuItem) => void;
  handleQuickAdd?: (item: MenuItem) => void;
  handleQuickServiceAlert?: (type: 'water' | 'bill' | 'waiter') => void;
  callingWaiter?: boolean;
  setShowAssistanceModal?: (show: boolean) => void;
  setShowCartModal?: (show: boolean) => void;
  fetchRecentOrders?: () => void;
  setShowRecentOrdersModal?: (show: boolean) => void;
  recentOrders?: Order[];
  totalItemCount?: number;
  grandTotal?: number;
  previewModeTheme?: MenuThemeId | null;
  onSelectPreviewTheme?: (theme: MenuThemeId) => void;
  configOverride?: MenuThemeConfig | null;
}

export const CustomerThemedMenuBody: React.FC<CustomerThemedMenuBodyProps> = ({
  themeId,
  restaurant,
  categories = [],
  items = [],
  filteredDishes = [],
  recommendedDishes = [],
  selectedTableNumber,
  language = 'en',
  setLanguage = () => {},
  t = {},
  selectedCategory = 'all',
  setSelectedCategory = () => {},
  searchQuery = '',
  setSearchQuery = () => {},
  vegOnlyFilter = false,
  setVegOnlyFilter = () => {},
  getItemQuantityInCart = () => 0,
  openCustomization = () => {},
  handleQuickAdd = () => {},
  handleQuickServiceAlert = () => {},
  callingWaiter = false,
  setShowAssistanceModal = () => {},
  setShowCartModal = () => {},
  fetchRecentOrders = () => {},
  setShowRecentOrdersModal = () => {},
  recentOrders = [],
  totalItemCount = 0,
  grandTotal = 0,
  previewModeTheme,
  onSelectPreviewTheme,
  configOverride,
}) => {
  const safeCategories = categories || [];
  const safeItems = items || [];
  const safeFilteredDishes = filteredDishes || [];
  const safeRecommendedDishes = recommendedDishes || [];
  const safeRecentOrders = recentOrders || [];
  const safeT = {
    table: 'Table',
    callWaiter: 'Call Waiter',
    vegOnly: 'Veg Only',
    all: 'All',
    recommended: 'Recommended',
    bestseller: 'Bestseller',
    prepTime: 'mins',
    add: 'ADD',
    searchPlaceholder: 'Search dishes...',
    wifi: 'WiFi',
    ...t,
  };

  // Ensure scoped variables are guaranteed defined arrays and objects
  categories = safeCategories;
  items = safeItems;
  filteredDishes = safeFilteredDishes;
  recommendedDishes = safeRecommendedDishes;
  t = safeT;

  const baseCfg = getMergedThemeConfig(themeId, restaurant?.theme_config, restaurant);
  const cfg: ThemePresetConfig = configOverride
    ? ({
        ...baseCfg,
        ...Object.fromEntries(
          Object.entries(configOverride).filter(
            ([k, v]) => k !== 'by_theme' && k !== '_theme_id' && v !== undefined && v !== null && v !== ''
          )
        ),
      } as ThemePresetConfig)
    : baseCfg;

  const activeOrders = safeRecentOrders.filter(o => o && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  const latestActive = activeOrders[0];

  const getCategoryThumb = (catId: string): string => {
    const match = safeItems.find(i => i && i.category_id === catId && i.image);
    return match?.image || restaurant?.logo || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80';
  };

  const buttonRadiusClass =
    cfg.button_style === 'pill'
      ? 'rounded-full'
      : cfg.button_style === 'sharp'
        ? 'rounded-lg'
        : 'rounded-xl';

  const cardStyleClass =
    cfg.card_style === 'bordered'
      ? 'border border-stone-200/90 shadow-none'
      : cfg.card_style === 'glass'
        ? 'backdrop-blur-md bg-white/85 border border-white/60 shadow-lg'
        : cfg.card_style === 'minimal'
          ? 'border-b border-stone-200/70 rounded-none shadow-none'
          : 'shadow-md border border-black/5';

  // Preview switcher bar if user opened with ?preview_theme=
  const renderPreviewTopBar = () => {
    if (!previewModeTheme || !onSelectPreviewTheme) return null;
    return (
      <div className="sticky top-0 z-50 bg-slate-950 text-white px-3 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
            <Eye className="w-3 h-3" /> Live Theme Preview
          </span>
          <span className="text-slate-300 font-semibold hidden sm:inline">
            {restaurant.name} ({MENU_THEME_PRESETS[themeId]?.name})
          </span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {ALL_THEME_IDS.map(id => (
            <button
              key={id}
              onClick={() => onSelectPreviewTheme(id)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                themeId === id
                  ? 'bg-white text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {MENU_THEME_PRESETS[id].name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // THEME 1: CLASSIC RESTAURANT (Fully Customizable Default Restaurant Theme)
  // ============================================================================
  if (themeId === 'classic') {
    const primary = cfg.primary_color || '#EA580C';
    const secondary = cfg.secondary_color || '#0F172A';
    const bg = cfg.background_color || '#F8FAFC';
    const cardBg = cfg.card_color || '#FFFFFF';
    const textColor = cfg.text_color || '#0F172A';
    const accent = cfg.accent_color || '#F59E0B';

    return (
      <div
        style={{
          backgroundColor: bg,
          color: textColor,
          fontFamily: `'${cfg.font_family || 'Plus Jakarta Sans'}', sans-serif`,
        }}
        className="min-h-screen pb-40"
      >
        {renderPreviewTopBar()}

        {/* 1. Large Restaurant Cover Image Banner */}
        <div
          style={{ backgroundColor: secondary }}
          className="relative h-60 sm:h-76 w-full overflow-hidden"
        >
          <img
            src={cfg.promo_image || restaurant.cover_image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200'}
            alt={restaurant.name}
            className="w-full h-full object-cover opacity-85 scale-105 transition-transform duration-700 hover:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/35" />

          {/* Top Floating Controls */}
          <div className="absolute top-3 inset-x-3 max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-1.5 z-10">
            <div className="px-2.5 py-1.5 rounded-full bg-black/55 backdrop-blur-md text-white text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-lg border border-white/15 shrink-0">
              <QrCode className="w-3.5 h-3.5 shrink-0" style={{ color: primary }} />
              <span>{selectedTableNumber ? `${t.table} #${selectedTableNumber}` : 'Dine-In'}</span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button
                onClick={() => {
                  fetchRecentOrders();
                  setShowRecentOrdersModal(true);
                }}
                style={{ backgroundColor: primary }}
                className={`px-2.5 sm:px-3 py-1.5 ${buttonRadiusClass} text-white text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 transition border border-white/20 shadow-lg cursor-pointer active:scale-95`}
              >
                <Utensils className="w-3.5 h-3.5 text-white shrink-0" />
                <span>
                  {latestActive ? `Current Order #${latestActive.order_number}` : 'Current Order'}
                </span>
                {activeOrders.length > 0 && (
                  <span
                    style={{ color: primary }}
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white animate-pulse"
                  >
                    {activeOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowAssistanceModal(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[11px] sm:text-xs font-bold flex items-center gap-1 hover:bg-black/70 transition border border-white/15 shadow-lg cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
                <span>{t.callWaiter}</span>
              </button>

              <div className="relative flex items-center gap-0.5 bg-black/50 backdrop-blur-md p-0.5 rounded-full border border-white/15 text-white text-[10px] sm:text-xs font-bold shadow-lg">
                {(['en', 'hi', 'mr'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    style={language === lang ? { backgroundColor: primary } : undefined}
                    className={`px-2 py-0.5 rounded-full transition cursor-pointer ${
                      language === lang ? 'text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिं' : 'मरा'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Banner Text Overlay when Show Hero Banner is ON */}
          {cfg.show_hero_banner && (
            <div className="absolute bottom-14 inset-x-4 max-w-2xl mx-auto z-10 text-white">
              <span
                style={{ backgroundColor: primary }}
                className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow"
              >
                {cfg.promo_badge || ' Table QR Ordering'}
              </span>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight mt-1 drop-shadow">
                {cfg.promo_title || `Welcome to ${restaurant.name}`}
              </h2>
              {cfg.promo_subtitle && (
                <p className="text-xs text-white/85 line-clamp-1 mt-0.5 max-w-lg">
                  {cfg.promo_subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 2. Overlapping Restaurant Profile Card */}
        <div className="max-w-2xl mx-auto px-3 sm:px-4 -mt-10 relative z-10">
          <div
            style={{ backgroundColor: cardBg, color: textColor }}
            className={`rounded-3xl p-4 sm:p-6 ${cardStyleClass}`}
          >
            <div
              className={`flex ${
                cfg.header_layout === 'centered'
                  ? 'flex-col items-center text-center'
                  : 'items-start justify-between'
              } gap-4`}
            >
              <div className="flex-1">
                <div
                  style={{ backgroundColor: `${primary}18`, color: primary, borderColor: `${primary}40` }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-black text-xs tracking-wider uppercase border mb-2"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>{t.table} {selectedTableNumber || 'DINE-IN'}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {restaurant.name}
                </h1>

                <div
                  className={`flex flex-wrap items-center gap-2 mt-1.5 ${
                    cfg.header_layout === 'centered' ? 'justify-center' : ''
                  }`}
                >
                  <span
                    style={{ color: primary, backgroundColor: `${primary}12` }}
                    className="text-xs font-bold px-2.5 py-0.5 rounded-md"
                  >
                    {restaurant.cuisine_type || 'Artisan Cafe'}
                  </span>
                  {restaurant.rating && (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                      ★ {restaurant.rating}
                    </span>
                  )}
                </div>
              </div>

              <img
                src={restaurant.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'}
                alt={restaurant.name}
                style={{ borderColor: primary }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 shadow-md shrink-0"
              />
            </div>

            {restaurant.description && (
              <p className="text-xs opacity-75 mt-3 leading-relaxed">
                {restaurant.description}
              </p>
            )}

            <div className="mt-4 pt-3 border-t border-black/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs opacity-75">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: primary }} />
                <span className="truncate">{restaurant.address}, {restaurant.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" style={{ color: primary }} />
                <span>{restaurant.opening_time} - {restaurant.closing_time}</span>
              </div>
              {restaurant.wifi_info && (
                <div className="flex items-center gap-2 col-span-1 sm:col-span-2 p-2.5 rounded-2xl bg-black/5">
                  <Wifi className="w-4 h-4 shrink-0" style={{ color: primary }} />
                  <span className="font-semibold text-xs">
                    {t.wifi}: <code className="font-mono font-bold">{restaurant.wifi_info}</code>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2.5 Table Quick Actions Strip */}
        <div className="max-w-2xl mx-auto px-3 sm:px-4 mt-4">
          <div
            style={{ backgroundColor: cardBg, color: textColor }}
            className={`rounded-3xl p-3.5 sm:p-4 ${cardStyleClass} space-y-3`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  style={{ backgroundColor: `${primary}18`, color: primary }}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                >
                  🛎️
                </span>
                <div className="truncate">
                  <span className="text-xs font-extrabold">Table Quick Actions</span>
                  <span className="text-[10px] opacity-60 ml-1.5">Table #{selectedTableNumber || 'Dine-in'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickServiceAlert('water')}
                disabled={callingWaiter}
                className="py-2.5 px-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-black transition flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span className="text-base">💧</span>
                <span className="text-[11px]">Need Water</span>
              </button>

              <button
                onClick={() => handleQuickServiceAlert('bill')}
                disabled={callingWaiter}
                className="py-2.5 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-black transition flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span className="text-base">🧾</span>
                <span className="text-[11px]">Request Bill</span>
              </button>

              <button
                onClick={() => setShowAssistanceModal(true)}
                className="py-2.5 px-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black transition flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <span className="text-base">🛎️</span>
                <span className="text-[11px]">Call Waiter</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Search & Veg Toggle Filter */}
        {cfg.show_search_bar && (
          <div className="max-w-2xl mx-auto px-4 mt-5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  style={{ backgroundColor: cardBg, color: textColor }}
                  className={`w-full pl-10 pr-4 py-2.5 ${buttonRadiusClass} border border-black/10 text-xs font-medium shadow-xs focus:outline-none`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setVegOnlyFilter(prev => !prev)}
                style={
                  vegOnlyFilter
                    ? { backgroundColor: '#16A34A', color: '#FFFFFF' }
                    : { backgroundColor: cardBg, color: textColor }
                }
                className={`px-3.5 py-2.5 ${buttonRadiusClass} border border-black/10 text-xs font-bold flex items-center gap-1.5 transition shadow-xs shrink-0 cursor-pointer`}
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${vegOnlyFilter ? 'border-white' : 'border-emerald-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${vegOnlyFilter ? 'bg-white' : 'bg-emerald-600'}`} />
                </span>
                <span>{t.vegOnly}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. Horizontal Scrollable Category Tabs */}
        <div
          id="customer-menu-items-section"
          style={{ backgroundColor: bg }}
          className="sticky top-0 z-20 backdrop-blur-md pt-4 pb-3 border-b border-black/10 mt-3"
        >
          <div className="max-w-2xl mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory('recommended')}
              style={
                selectedCategory === 'recommended'
                  ? { backgroundColor: primary, color: '#FFFFFF' }
                  : { backgroundColor: cardBg, color: textColor }
              }
              className={`px-4 py-2 ${buttonRadiusClass} text-xs font-extrabold whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 border border-black/10 cursor-pointer`}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: selectedCategory === 'recommended' ? '#FDE047' : accent }} />
              <span>Recommended ({recommendedDishes.length})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('all')}
              style={
                selectedCategory === 'all'
                  ? { backgroundColor: primary, color: '#FFFFFF' }
                  : { backgroundColor: cardBg, color: textColor }
              }
              className={`px-4 py-2 ${buttonRadiusClass} text-xs font-extrabold whitespace-nowrap transition-all shadow-xs border border-black/10 cursor-pointer`}
            >
              {t.all} ({items.length})
            </button>

            {categories.map(cat => {
              const count = items.filter(i => i.category_id === cat.id).length;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={
                    active
                      ? { backgroundColor: primary, color: '#FFFFFF' }
                      : { backgroundColor: cardBg, color: textColor }
                  }
                  className={`px-4 py-2 ${buttonRadiusClass} text-xs font-extrabold whitespace-nowrap transition-all shadow-xs border border-black/10 cursor-pointer`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Recommended Highlights Carousel */}
        {cfg.show_bestsellers && (selectedCategory === 'all' || selectedCategory === 'recommended') && recommendedDishes.length > 0 && !searchQuery && (
          <div className="max-w-2xl mx-auto px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4" style={{ color: primary }} />
                <span>{cfg.editorial_title || t.recommended}</span>
              </h2>
              <span
                style={{ color: primary, backgroundColor: `${primary}15` }}
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              >
                {cfg.editorial_subtitle || 'Top Picks'}
              </span>
            </div>

            <div className="flex gap-3.5 overflow-x-auto pb-3 pt-1 no-scrollbar">
              {recommendedDishes.map(item => {
                const qty = getItemQuantityInCart(item.id);
                const hasDiscount = item.discount_price && item.discount_price > 0 && item.discount_price < item.price;
                const displayPrice = hasDiscount ? item.discount_price : item.price;
                return (
                  <div
                    key={`rec-${item.id}`}
                    onClick={() => openCustomization(item)}
                    style={{ backgroundColor: cardBg, color: textColor }}
                    className={`w-60 shrink-0 rounded-3xl p-3 ${cardStyleClass} flex flex-col justify-between cursor-pointer group`}
                  >
                    <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-slate-100 mb-2.5">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        {cfg.show_dietary_badges && (
                          <span className={`w-4 h-4 rounded bg-white/90 border flex items-center justify-center ${item.is_veg ? 'border-emerald-600' : 'border-rose-600'}`}>
                            <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          </span>
                        )}
                        {item.is_bestseller && (
                          <span
                            style={{ backgroundColor: accent }}
                            className="px-2 py-0.5 rounded-full text-white font-black text-[9px] uppercase tracking-wider shadow"
                          >
                            Bestseller
                          </span>
                        )}
                      </div>
                      {cfg.show_prep_time && item.prep_time && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white font-bold text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" style={{ color: primary }} />
                          {item.prep_time}m
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm tracking-tight line-clamp-1">{item.name}</h3>
                      <p className="text-[11px] opacity-70 line-clamp-2 mt-0.5 leading-snug">{item.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black font-mono">₹{displayPrice}</span>
                        {hasDiscount && (
                          <span className="text-[10px] opacity-50 line-through font-mono">₹{item.price}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleQuickAdd(item);
                        }}
                        style={{ backgroundColor: primary }}
                        className={`px-3 py-1.5 ${buttonRadiusClass} text-white font-black text-[11px] uppercase tracking-wider shadow-xs cursor-pointer`}
                      >
                        {qty > 0 ? `Added (${qty})` : 'ADD +'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Food Items List */}
        <div className="max-w-2xl mx-auto px-4 mt-6 space-y-4">
          {filteredDishes.map(item => {
            const qty = getItemQuantityInCart(item.id);
            const hasDiscount = item.discount_price && item.discount_price > 0 && item.discount_price < item.price;
            const displayPrice = hasDiscount ? item.discount_price : item.price;
            const hasOptions = (item.sizes && item.sizes.length > 0) || (item.add_ons && item.add_ons.length > 0);

            return (
              <div
                key={item.id}
                onClick={() => openCustomization(item)}
                style={{ backgroundColor: cardBg, color: textColor }}
                className={`rounded-3xl p-4 sm:p-5 ${cardStyleClass} flex gap-4 items-center justify-between transition cursor-pointer group ${
                  !item.is_available ? 'opacity-60' : ''
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    {cfg.show_dietary_badges && (
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${item.is_veg ? 'border-emerald-600' : 'border-rose-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      </span>
                    )}
                    {item.is_bestseller && (
                      <span
                        style={{ backgroundColor: `${accent}25`, color: primary }}
                        className="px-2 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider"
                      >
                        ★ {t.bestseller}
                      </span>
                    )}
                    {cfg.show_prep_time && item.prep_time && (
                      <span className="text-[10px] font-semibold opacity-60">
                        {item.prep_time} {t.prepTime}
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-base tracking-tight">{item.name}</h3>
                  {cfg.show_weight && item.weight && (
                    <span className="text-[11px] font-semibold opacity-60">{item.weight}</span>
                  )}
                  <p className="text-xs opacity-70 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>

                  <div className="mt-3 flex items-center gap-2.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-black font-mono">₹{displayPrice}</span>
                      {hasDiscount && (
                        <span className="text-xs opacity-50 line-through font-mono">₹{item.price}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center shrink-0">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden relative shadow-inner bg-slate-100">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {item.is_available && (
                    <div className="-mt-4 z-10">
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleQuickAdd(item);
                          }}
                          style={{ color: primary, borderColor: `${primary}40`, backgroundColor: cardBg }}
                          className={`px-5 py-2 ${buttonRadiusClass} font-black text-xs uppercase tracking-wider shadow-md border transition active:scale-95 cursor-pointer`}
                        >
                          {t.add} +
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            if (hasOptions) {
                              openCustomization(item);
                            } else {
                              setShowCartModal(true);
                            }
                          }}
                          style={{ backgroundColor: primary }}
                          className={`px-4 py-2 ${buttonRadiusClass} text-white font-black text-xs uppercase tracking-wider shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1`}
                        >
                          <span>{qty} IN CART</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // THEME 2: HOT & READY (Reference: Little Caesars Mobile App UI)
  // ============================================================================
  if (themeId === 'hot_ready') {
    const primary = cfg.primary_color || '#FF5A1F';
    const secondary = cfg.secondary_color || '#18181B';
    const bg = cfg.background_color || '#FAF4EC';
    const cardBg = cfg.card_color || '#FFFFFF';
    const textColor = cfg.text_color || '#1E1B18';
    const heroDish = recommendedDishes[0] || items[0];
    const heroPrice = heroDish ? (heroDish.discount_price || heroDish.price) : 199;

    return (
      <div
        style={{
          backgroundColor: bg,
          color: textColor,
          fontFamily: `'${cfg.font_family || 'Plus Jakarta Sans'}', sans-serif`,
        }}
        className="min-h-screen pb-40"
      >
        {renderPreviewTopBar()}

        {/* Little Caesars Style Top Header Bar */}
        <header
          style={{ backgroundColor: bg }}
          className="sticky top-0 z-30 px-4 py-3 border-b border-black/10 backdrop-blur-md bg-opacity-95"
        >
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img
                src={restaurant.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120'}
                alt={restaurant.name}
                style={{ borderColor: primary }}
                className="w-10 h-10 rounded-full object-cover border-2 shadow-sm shrink-0"
              />
              <div className="hidden sm:block">
                <div className="text-xs font-black leading-tight">{restaurant.name}</div>
                <div style={{ color: primary }} className="text-[10px] font-bold">
                  {selectedTableNumber ? `Table #${selectedTableNumber}` : 'Dine-In Menu'}
                </div>
              </div>
            </div>

            <div
              style={{ backgroundColor: cardBg, color: textColor }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-black/10 shadow-xs min-w-0"
            >
              <MapPin className="w-4 h-4 shrink-0" style={{ color: primary }} />
              <span className="text-xs font-extrabold truncate max-w-[180px] sm:max-w-[260px]">
                {selectedTableNumber
                  ? `${restaurant.name} • Table #${selectedTableNumber}`
                  : restaurant.address || restaurant.city || restaurant.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setVegOnlyFilter(p => !p)}
                style={
                  vegOnlyFilter
                    ? { backgroundColor: '#16A34A', color: '#FFFFFF' }
                    : { backgroundColor: cardBg, color: textColor }
                }
                className="px-2.5 py-1.5 rounded-full text-[10px] font-black border border-black/10 transition cursor-pointer flex items-center gap-1"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                <span>VEG</span>
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-3 space-y-6">
          {/* Dark Charcoal "Hot-N-Ready" Hero Banner Card */}
          {cfg.show_hero_banner && (
            <div
              onClick={() => {
                if (heroDish) openCustomization(heroDish);
              }}
              style={{ backgroundColor: secondary }}
              className="relative rounded-[28px] overflow-hidden text-white p-5 sm:p-6 shadow-xl flex items-center justify-between gap-3 cursor-pointer group"
            >
              <div
                style={{ background: `radial-gradient(circle at 80% 50%, ${primary}55 0%, transparent 70%)` }}
                className="absolute inset-0 pointer-events-none"
              />

              <div className="relative z-10 flex-1 space-y-2.5 pr-2">
                <div
                  style={{ color: primary, fontFamily: `'Playfair Display', Georgia, serif` }}
                  className="text-xl sm:text-2xl font-black italic tracking-tight drop-shadow"
                >
                  {cfg.promo_badge || 'Hot-N-Ready'}
                </div>

                <div className="inline-flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl p-1.5 pr-3.5 shadow-lg">
                  <span
                    style={{ backgroundColor: primary }}
                    className="px-2.5 py-1.5 rounded-xl text-white font-black text-sm sm:text-base font-mono shadow"
                  >
                    ₹{heroPrice}
                  </span>
                  <div className="text-left">
                    <div className="text-[11px] sm:text-xs font-extrabold text-white leading-tight line-clamp-1">
                      {cfg.promo_title || heroDish?.name || 'Fresh Oven Specials'}
                    </div>
                    <div style={{ color: primary }} className="text-[9px] font-bold uppercase tracking-wider">
                      {cfg.promo_cta_text || 'Tap to Order Now'}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-stone-300 line-clamp-2 max-w-xs leading-relaxed">
                  {cfg.promo_subtitle}
                </p>
              </div>

              <div
                style={{ borderColor: `${primary}66` }}
                className="relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 shadow-2xl shrink-0 group-hover:scale-105 transition-transform duration-500"
              >
                <img
                  src={cfg.promo_image || heroDish?.image || restaurant.cover_image}
                  alt={cfg.promo_title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Search Input Bar */}
          {cfg.show_search_bar && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                style={{ backgroundColor: cardBg, color: textColor }}
                className={`w-full pl-11 pr-9 py-3 ${buttonRadiusClass} border border-black/10 text-xs font-bold shadow-xs focus:outline-none`}
              />
            </div>
          )}

          {/* Little Caesars Style Vertical Pill Categories */}
          <div id="customer-menu-items-section">
            <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-2 pt-1">
              {[
                { id: 'all', name: t.all || 'All Food', thumb: heroDish?.image || restaurant.logo },
                ...(recommendedDishes.length > 0
                  ? [{ id: 'recommended', name: 'Hot Picks', thumb: recommendedDishes[0]?.image || restaurant.logo }]
                  : []),
                ...categories.map(c => ({ id: c.id, name: c.name, thumb: getCategoryThumb(c.id) })),
              ].map(cat => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={isActive ? { backgroundColor: primary, color: '#FFFFFF' } : { color: textColor }}
                    className={`flex flex-col items-center justify-between p-2 rounded-[26px] min-w-[76px] max-w-[84px] shrink-0 transition-all cursor-pointer ${
                      isActive ? 'shadow-lg -translate-y-0.5' : 'bg-transparent hover:bg-black/5'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 transition ${
                        isActive ? 'bg-white border-white shadow-md' : 'bg-white border-black/10 shadow-xs'
                      }`}
                    >
                      <img
                        src={cat.thumb || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200'}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-extrabold mt-2 pb-1 truncate w-full text-center">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Popular Food 2-Column Product Grid */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight">
                {selectedCategory === 'all'
                  ? (cfg.editorial_title || 'Popular Food')
                  : selectedCategory === 'recommended'
                    ? 'Hot & Ready Bestsellers'
                    : categories.find(c => c.id === selectedCategory)?.name || 'Menu'}
              </h2>
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{ color: primary }}
                  className="text-xs font-extrabold hover:underline cursor-pointer"
                >
                  See all
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {filteredDishes.map(item => {
                const qty = getItemQuantityInCart(item.id);
                const hasDiscount = item.discount_price && item.discount_price > 0 && item.discount_price < item.price;
                const displayPrice = hasDiscount ? item.discount_price : item.price;
                return (
                  <div
                    key={item.id}
                    onClick={() => openCustomization(item)}
                    style={{ backgroundColor: cardBg, color: textColor }}
                    className={`rounded-[24px] p-3 ${cardStyleClass} transition flex flex-col justify-between cursor-pointer group ${
                      !item.is_available ? 'opacity-60' : ''
                    }`}
                  >
                    <div>
                      <div className="relative h-32 sm:h-36 w-full rounded-2xl overflow-hidden bg-black/5 mb-2.5">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {cfg.show_dietary_badges && (
                          <span
                            className={`absolute top-2 left-2 w-4 h-4 rounded bg-white/95 flex items-center justify-center border shadow-xs ${
                              item.is_veg ? 'border-emerald-600' : 'border-rose-600'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          </span>
                        )}
                        {item.is_bestseller && (
                          <span
                            style={{ backgroundColor: primary }}
                            className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-white font-black text-[9px] uppercase shadow"
                          >
                            Hot
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-sm line-clamp-1 leading-snug">{item.name}</h3>

                      {(cfg.show_prep_time || cfg.show_weight) && (
                        <div className="flex items-center gap-1 text-[11px] opacity-60 font-semibold mt-0.5">
                          <span>🔥</span>
                          <span>
                            {cfg.show_weight && item.weight
                              ? item.weight
                              : cfg.show_prep_time && item.prep_time
                                ? `${item.prep_time} mins prep`
                                : 'Freshly prepared'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-1 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-black text-base">₹{displayPrice}</span>
                        {hasDiscount && (
                          <span className="text-[10px] opacity-50 line-through font-mono ml-1">₹{item.price}</span>
                        )}
                      </div>

                      {item.is_available && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleQuickAdd(item);
                          }}
                          style={{ backgroundColor: primary }}
                          className={`${
                            qty > 0 ? `px-3 h-9 ${buttonRadiusClass}` : `w-9 h-9 ${buttonRadiusClass}`
                          } text-white font-black text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 transition cursor-pointer shrink-0`}
                        >
                          {qty > 0 ? <span>{qty} +</span> : <ShoppingBag className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // THEME 3: PREMIUM CAFE (Reference: Bean & Bloom Multi-Screen Design)
  // ============================================================================
  if (themeId === 'premium_cafe') {
    const primary = cfg.primary_color || '#1B3B2B';
    const secondary = cfg.secondary_color || '#2C4C3E';
    const bg = cfg.background_color || '#F5EFE6';
    const cardBg = cfg.card_color || '#FBF8F2';
    const textColor = cfg.text_color || '#1C2822';
    const accent = cfg.accent_color || '#C8A265';

    return (
      <div
        style={{ backgroundColor: bg, color: textColor }}
        className="min-h-screen pb-40"
      >
        {renderPreviewTopBar()}

        {/* Bean & Bloom Editorial Top Header */}
        <header className="px-4 pt-5 pb-4 border-b border-black/10" style={{ backgroundColor: bg }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <img
                  src={restaurant.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'}
                  alt={restaurant.name}
                  style={{ borderColor: primary }}
                  className="w-9 h-9 rounded-full object-cover border"
                />
                <span
                  style={{ fontFamily: `'${cfg.font_family || 'Cormorant Garamond'}', Georgia, serif`, color: primary }}
                  className="text-sm font-bold uppercase tracking-[0.22em]"
                >
                  {restaurant.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: primary }}
                  className={`px-3 py-1 ${buttonRadiusClass} text-[10px] uppercase tracking-widest font-semibold text-white`}
                >
                  {selectedTableNumber ? `Table ${selectedTableNumber}` : 'Dine-In'}
                </span>
                <button
                  onClick={() => setVegOnlyFilter(p => !p)}
                  style={
                    vegOnlyFilter
                      ? { backgroundColor: primary, color: '#FFFFFF' }
                      : { backgroundColor: cardBg, color: primary }
                  }
                  className={`px-2.5 py-1 ${buttonRadiusClass} border border-black/15 text-[10px] font-semibold cursor-pointer`}
                >
                  Veg
                </button>
              </div>
            </div>

            <div className="text-center py-3 px-2">
              <p className="text-[10px] uppercase tracking-[0.28em] font-semibold opacity-70">
                {restaurant.cuisine_type || 'Specialty Coffee & Artisanal Bakery'}
              </p>
              <h1
                style={{ fontFamily: `'${cfg.font_family || 'Cormorant Garamond'}', Georgia, serif`, color: primary }}
                className="text-3xl sm:text-4xl font-bold leading-tight mt-1"
              >
                {cfg.editorial_title || 'Freshly brewed coffee & Artisanal pastries'}
              </h1>
              {cfg.editorial_subtitle && (
                <p className="text-xs opacity-75 max-w-md mx-auto mt-1 leading-relaxed">
                  {cfg.editorial_subtitle}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 pt-4 space-y-6">
          {/* Bean & Bloom Warm Sand "Morning Special" Banner Card */}
          {cfg.show_hero_banner && (
            <div
              style={{ backgroundColor: cardBg, borderColor: `${primary}25` }}
              className={`rounded-[26px] overflow-hidden border p-5 flex items-center justify-between gap-4 ${cardStyleClass}`}
            >
              <div className="flex-1 space-y-2">
                <span
                  style={{ color: primary, borderColor: `${primary}40` }}
                  className="inline-block text-[10px] font-bold uppercase tracking-[0.22em] border-b pb-0.5"
                >
                  {cfg.promo_badge || 'Morning Special'}
                </span>
                <h2
                  style={{ fontFamily: `'${cfg.font_family || 'Cormorant Garamond'}', Georgia, serif`, color: primary }}
                  className="text-2xl sm:text-3xl font-bold leading-tight"
                >
                  {cfg.promo_title}
                </h2>
                <p className="text-xs opacity-80 leading-relaxed">
                  {cfg.promo_subtitle}
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => setSelectedCategory('recommended')}
                    style={{ backgroundColor: primary }}
                    className={`px-5 py-2 ${buttonRadiusClass} text-white text-xs font-semibold tracking-wider uppercase hover:opacity-95 transition cursor-pointer`}
                  >
                    {cfg.promo_cta_text || 'Order Now'}
                  </button>
                </div>
              </div>
              <div
                style={{ borderColor: bg }}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 shadow-md shrink-0"
              >
                <img
                  src={cfg.promo_image || restaurant.cover_image}
                  alt={cfg.promo_title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Search Bar */}
          {cfg.show_search_bar && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search specialty drinks, pastries, plates..."
                style={{ backgroundColor: cardBg, color: textColor }}
                className={`w-full pl-11 pr-4 py-2.5 ${buttonRadiusClass} border border-black/15 text-xs focus:outline-none`}
              />
            </div>
          )}

          {/* Bean & Bloom Pill Category Selector */}
          <div id="customer-menu-items-section" className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', name: 'All Offerings' },
              { id: 'recommended', name: 'Signatures' },
              ...categories.map(c => ({ id: c.id, name: c.name })),
            ].map(tab => {
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  style={
                    active
                      ? { backgroundColor: primary, color: '#FFFFFF' }
                      : { backgroundColor: cardBg, color: primary }
                  }
                  className={`px-4 py-2 ${buttonRadiusClass} text-xs font-semibold tracking-wide whitespace-nowrap border border-black/10 transition cursor-pointer shadow-2xs`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Bean & Bloom 2-Column Circular Photo Product Cards */}
          <div>
            <div className="flex items-baseline justify-between mb-3.5 border-b border-black/10 pb-2">
              <h2
                style={{ fontFamily: `'${cfg.font_family || 'Cormorant Garamond'}', Georgia, serif`, color: primary }}
                className="text-2xl font-bold"
              >
                {selectedCategory === 'all'
                  ? 'Specialty Drinks & Artisanal Kitchen'
                  : selectedCategory === 'recommended'
                    ? 'House Signatures'
                    : categories.find(c => c.id === selectedCategory)?.name || 'Menu'}
              </h2>
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: secondary || accent }}>
                {filteredDishes.length} Items
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredDishes.map(item => {
                const qty = getItemQuantityInCart(item.id);
                const hasDiscount = item.discount_price && item.discount_price > 0 && item.discount_price < item.price;
                const displayPrice = hasDiscount ? item.discount_price : item.price;
                return (
                  <div
                    key={item.id}
                    onClick={() => openCustomization(item)}
                    style={{ backgroundColor: cardBg, color: textColor }}
                    className={`rounded-[24px] p-4 ${cardStyleClass} transition flex flex-col items-center text-center justify-between cursor-pointer group`}
                  >
                    <div className="w-full flex flex-col items-center">
                      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-black/5 border-2 border-black/10 shadow-md mb-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      </div>

                      <h3
                        style={{ fontFamily: `'${cfg.font_family || 'Cormorant Garamond'}', Georgia, serif`, color: primary }}
                        className="text-lg font-bold leading-snug line-clamp-1"
                      >
                        {item.name}
                      </h3>
                      <p className="text-[11px] opacity-75 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="w-full mt-3 pt-2.5 border-t border-black/10 flex items-center justify-between gap-2">
                      <div className="text-left">
                        <span className="font-serif text-base font-bold" style={{ color: primary }}>₹{displayPrice}</span>
                        {hasDiscount && (
                          <span className="text-[10px] opacity-50 line-through ml-1">₹{item.price}</span>
                        )}
                      </div>

                      {item.is_available && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleQuickAdd(item);
                          }}
                          style={{ backgroundColor: primary }}
                          className={`px-3.5 py-1.5 ${buttonRadiusClass} text-white text-[11px] font-semibold tracking-wider uppercase shadow-xs hover:opacity-95 active:scale-95 transition cursor-pointer`}
                        >
                          {qty > 0 ? `Added (${qty})` : '+ Add'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // THEME 4: MODERN ORDERING APP (Reference: Six-Screen Coffee Ordering Design)
  // ============================================================================
  if (themeId === 'modern_app') {
    const primary = cfg.primary_color || '#C67C4E';
    const secondary = cfg.secondary_color || '#131313';
    const bg = cfg.background_color || '#F9F9F9';
    const cardBg = cfg.card_color || '#FFFFFF';
    const textColor = cfg.text_color || '#242424';
    const accent = cfg.accent_color || '#ED5151';

    return (
      <div
        style={{
          backgroundColor: bg,
          color: textColor,
          fontFamily: `'${cfg.font_family || 'DM Sans'}', sans-serif`,
        }}
        className="min-h-screen pb-40"
      >
        {renderPreviewTopBar()}

        {/* Dark Espresso App Header */}
        <div
          style={{ backgroundColor: secondary }}
          className="text-white px-4 pt-5 pb-20 rounded-b-[32px]"
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-stone-400 font-medium">Location / Table</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-sm text-white">
                    {restaurant.name} • {selectedTableNumber ? `Table #${selectedTableNumber}` : 'Dine-In'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <img
                  src={restaurant.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120'}
                  alt={restaurant.name}
                  className="w-10 h-10 rounded-xl object-cover border border-white/15"
                />
              </div>
            </div>

            {cfg.show_search_bar && (
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className={`w-full pl-10 pr-4 py-3.5 ${buttonRadiusClass} bg-white/10 border border-white/10 text-xs text-white placeholder-stone-400 focus:outline-none`}
                  />
                </div>
                <button
                  onClick={() => setVegOnlyFilter(p => !p)}
                  style={vegOnlyFilter ? { backgroundColor: '#16A34A' } : { backgroundColor: primary }}
                  className={`p-3.5 ${buttonRadiusClass} text-white text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="text-[11px] font-extrabold">{vegOnlyFilter ? 'Veg ✓' : 'Veg'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-14 space-y-5">
          {/* Overlapping Promo Card */}
          {cfg.show_hero_banner && (
            <div className="relative h-36 sm:h-44 rounded-3xl overflow-hidden shadow-xl border border-white/20">
              <img
                src={cfg.promo_image || restaurant.cover_image}
                alt={cfg.promo_title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent p-5 flex flex-col justify-between">
                <span
                  style={{ backgroundColor: accent }}
                  className="self-start px-2.5 py-1 rounded-lg text-white font-extrabold text-[11px] tracking-wide shadow"
                >
                  {cfg.promo_badge || 'Promo'}
                </span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white max-w-xs leading-tight">
                    <span className="bg-black/80 px-2 py-0.5 rounded box-decoration-clone">
                      {cfg.promo_title}
                    </span>
                  </h2>
                  <p className="text-[11px] text-white/85 mt-1.5 line-clamp-1">{cfg.promo_subtitle}</p>
                </div>
              </div>
            </div>
          )}

          {/* Horizontal Category Pills */}
          <div id="customer-menu-items-section" className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'all', name: 'All Items' },
              { id: 'recommended', name: cfg.editorial_title || 'Popular' },
              ...categories.map(c => ({ id: c.id, name: c.name })),
            ].map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={
                    active
                      ? { backgroundColor: primary, color: '#FFFFFF' }
                      : { backgroundColor: cardBg, color: textColor }
                  }
                  className={`px-4 py-2.5 ${buttonRadiusClass} text-xs font-bold whitespace-nowrap transition cursor-pointer border border-black/10 ${
                    active ? 'shadow-md' : ''
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* 2-Column Product-Focused Mobile Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {filteredDishes.map(item => {
              const qty = getItemQuantityInCart(item.id);
              const hasDiscount = item.discount_price && item.discount_price > 0 && item.discount_price < item.price;
              const displayPrice = hasDiscount ? item.discount_price : item.price;
              return (
                <div
                  key={item.id}
                  onClick={() => openCustomization(item)}
                  style={{ backgroundColor: cardBg, color: textColor }}
                  className={`rounded-2xl p-2.5 ${cardStyleClass} flex flex-col justify-between cursor-pointer group hover:shadow-md transition`}
                >
                  <div>
                    <div className="relative h-32 sm:h-36 w-full rounded-xl overflow-hidden bg-black/5 mb-2.5">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-black/55 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span>{restaurant.rating || 4.8}</span>
                      </div>
                      {cfg.show_dietary_badges && (
                        <span
                          className={`absolute top-1.5 right-1.5 w-4 h-4 rounded bg-white flex items-center justify-center border ${
                            item.is_veg ? 'border-emerald-600' : 'border-rose-600'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                    <p className="text-[11px] opacity-60 line-clamp-1 mt-0.5">
                      {item.sizes && item.sizes.length > 0
                        ? item.sizes.map(s => s.name).slice(0, 3).join(' • ')
                        : item.description || 'Freshly prepared'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-base font-extrabold">₹{displayPrice}</span>
                      {hasDiscount && (
                        <span className="text-[10px] opacity-50 line-through ml-1">₹{item.price}</span>
                      )}
                    </div>
                    {item.is_available && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleQuickAdd(item);
                        }}
                        style={{ backgroundColor: primary }}
                        className={`w-8 h-8 ${buttonRadiusClass} text-white flex items-center justify-center font-black text-sm shadow-sm active:scale-95 transition cursor-pointer`}
                      >
                        {qty > 0 ? qty : <Plus className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // THEME 5: CUSTOM BRAND THEME (Fully Configurable White-Label Theme)
  // ============================================================================
  const primary = cfg.primary_color || '#4F46E5';
  const secondary = cfg.secondary_color || '#1E1B4B';
  const bg = cfg.background_color || '#F5F3FF';
  const cardBg = cfg.card_color || '#FFFFFF';
  const textColor = cfg.text_color || '#1E1B4B';

  return (
    <div
      style={{
        backgroundColor: bg,
        color: textColor,
        fontFamily: `'${cfg.font_family || 'Plus Jakarta Sans'}', sans-serif`,
      }}
      className="min-h-screen pb-40"
    >
      {renderPreviewTopBar()}

      {/* Configurable Brand Header */}
      <header
        style={{ backgroundColor: secondary }}
        className="text-white px-4 py-5 shadow-md"
      >
        <div
          className={`max-w-2xl mx-auto flex ${
            cfg.header_layout === 'centered'
              ? 'flex-col items-center text-center gap-3'
              : 'items-center justify-between gap-4'
          }`}
        >
          <div className={`flex items-center gap-3.5 ${cfg.header_layout === 'centered' ? 'flex-col' : ''}`}>
            <img
              src={restaurant.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200'}
              alt={restaurant.name}
              style={{ borderColor: primary }}
              className="w-14 h-14 rounded-2xl object-cover border-2 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span
                  style={{ backgroundColor: primary }}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                >
                  {selectedTableNumber ? `Table #${selectedTableNumber}` : 'Dine-In'}
                </span>
                <span className="text-xs text-stone-300">{restaurant.cuisine_type}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mt-1 text-white">{restaurant.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchRecentOrders();
                setShowRecentOrdersModal(true);
              }}
              style={{ backgroundColor: primary }}
              className={`px-3.5 py-2 ${buttonRadiusClass} text-white text-xs font-bold cursor-pointer`}
            >
              {latestActive ? `Order #${latestActive.order_number}` : 'My Orders'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-6">
        {/* Custom Brand Promotional Banner */}
        {cfg.show_hero_banner && (
          <div
            style={{ backgroundColor: secondary }}
            className="rounded-3xl overflow-hidden shadow-lg text-white grid grid-cols-1 sm:grid-cols-12"
          >
            <div className="sm:col-span-7 p-6 flex flex-col justify-between space-y-3">
              <div>
                <span
                  style={{ backgroundColor: primary }}
                  className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white"
                >
                  {cfg.promo_badge}
                </span>
                <h2 className="text-2xl font-bold mt-2.5 leading-tight">{cfg.promo_title}</h2>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">{cfg.promo_subtitle}</p>
              </div>
              <div>
                <button
                  onClick={() => setSelectedCategory('recommended')}
                  style={{ backgroundColor: primary }}
                  className={`px-5 py-2.5 ${buttonRadiusClass} text-white text-xs font-bold uppercase tracking-wider cursor-pointer`}
                >
                  {cfg.promo_cta_text}
                </button>
              </div>
            </div>
            <div className="sm:col-span-5 h-44 sm:h-auto">
              <img
                src={cfg.promo_image || restaurant.cover_image}
                alt={cfg.promo_title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Search & Veg Filter */}
        {cfg.show_search_bar && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                style={{ backgroundColor: cardBg, color: textColor }}
                className={`w-full pl-10 pr-4 py-3 ${buttonRadiusClass} border border-black/10 text-xs focus:outline-none`}
              />
            </div>
            <button
              onClick={() => setVegOnlyFilter(p => !p)}
              style={vegOnlyFilter ? { backgroundColor: '#16A34A', color: '#fff' } : { backgroundColor: cardBg, color: textColor }}
              className={`px-4 py-3 ${buttonRadiusClass} border border-black/10 text-xs font-bold cursor-pointer`}
            >
              {t.vegOnly}
            </button>
          </div>
        )}

        {/* Categories */}
        <div id="customer-menu-items-section" className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', name: t.all },
            { id: 'recommended', name: cfg.editorial_title || 'Recommended' },
            ...categories.map(c => ({ id: c.id, name: c.name })),
          ].map(cat => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={active ? { backgroundColor: primary, color: '#FFFFFF' } : { backgroundColor: cardBg, color: textColor }}
                className={`px-4 py-2 ${buttonRadiusClass} text-xs font-bold whitespace-nowrap border border-black/10 transition cursor-pointer`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Dishes */}
        <div className={cfg.category_layout === 'icons' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5' : 'space-y-3.5'}>
          {filteredDishes.map(item => {
            const qty = getItemQuantityInCart(item.id);
            const hasDiscount = item.discount_price && item.discount_price > 0 && item.discount_price < item.price;
            const displayPrice = hasDiscount ? item.discount_price : item.price;
            return (
              <div
                key={item.id}
                onClick={() => openCustomization(item)}
                style={{ backgroundColor: cardBg, color: textColor }}
                className={`rounded-2xl p-4 ${cardStyleClass} flex items-center justify-between gap-4 cursor-pointer transition`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {cfg.show_dietary_badges && (
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                          item.is_veg ? 'border-emerald-600' : 'border-rose-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      </span>
                    )}
                    {item.is_bestseller && (
                      <span
                        style={{ backgroundColor: primary }}
                        className="px-2 py-0.5 rounded-full text-white text-[9px] font-bold uppercase"
                      >
                        Signature
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base truncate">{item.name}</h3>
                  <p className="text-xs opacity-70 line-clamp-2 mt-0.5">{item.description}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="font-mono font-bold text-base">₹{displayPrice}</span>
                    {hasDiscount && (
                      <span className="text-xs opacity-50 line-through font-mono">₹{item.price}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center shrink-0">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-stone-100">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  {item.is_available && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleQuickAdd(item);
                      }}
                      style={{ backgroundColor: primary }}
                      className={`-mt-3 px-4 py-1.5 ${buttonRadiusClass} text-white text-xs font-bold shadow cursor-pointer`}
                    >
                      {qty > 0 ? `${qty} Added +` : '+ ADD'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
