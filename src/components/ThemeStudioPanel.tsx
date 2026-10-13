import React, { useState, useEffect } from 'react';
import { Restaurant, Category, MenuItem, MenuThemeId, MenuThemeConfig } from '../types';
import {
  MENU_THEME_PRESETS,
  ALL_THEME_IDS,
  getAllowedThemesForRestaurant,
  canRestaurantCustomizeTheme,
  getMergedThemeConfig,
  buildSavedThemeConfig,
  ThemePresetConfig,
} from '../lib/themes';
import { api } from '../lib/api';
import { useToast } from './Toast';
import { CustomerThemedMenuBody } from './CustomerThemedMenuBody';
import {
  Palette, Check, Lock, Eye, RotateCcw, Save, Layout,
  Type, Image as ImageIcon, Sliders, Crown, ExternalLink, Smartphone
} from 'lucide-react';

interface ThemeStudioPanelProps {
  restaurant: Restaurant;
  categories: Category[];
  items: MenuItem[];
  isAdminOverride?: boolean;
  onUpdated: (updated: Restaurant) => void;
  onNavigate?: (path: string) => void;
}

export const ThemeStudioPanel: React.FC<ThemeStudioPanelProps> = ({
  restaurant,
  categories,
  items,
  isAdminOverride = false,
  onUpdated,
}) => {
  const { showToast } = useToast();

  const allowedThemes = getAllowedThemesForRestaurant(restaurant);
  const canCustomize = isAdminOverride || canRestaurantCustomizeTheme(restaurant);

  const initialTheme: MenuThemeId =
    restaurant.active_theme && ALL_THEME_IDS.includes(restaurant.active_theme)
      ? restaurant.active_theme
      : allowedThemes[0] || 'classic';

  const [selectedTheme, setSelectedTheme] = useState<MenuThemeId>(initialTheme);

  // Per-theme draft configs in memory so all 5 themes can be customized independently
  const [draftConfigs, setDraftConfigs] = useState<Record<MenuThemeId, ThemePresetConfig>>(() => {
    const map = {} as Record<MenuThemeId, ThemePresetConfig>;
    for (const tid of ALL_THEME_IDS) {
      map[tid] = getMergedThemeConfig(tid, restaurant.theme_config, restaurant);
    }
    return map;
  });

  const config = draftConfigs[selectedTheme] || getMergedThemeConfig(selectedTheme, restaurant.theme_config, restaurant);

  const updateCurrentThemeConfig = (updater: Partial<MenuThemeConfig> | ((prev: ThemePresetConfig) => ThemePresetConfig)) => {
    setDraftConfigs(prev => {
      const current = prev[selectedTheme] || getMergedThemeConfig(selectedTheme, restaurant.theme_config, restaurant);
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return {
        ...prev,
        [selectedTheme]: next,
      };
    });
  };

  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'banner' | 'colors' | 'layout' | 'visibility'>('banner');
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewCat, setPreviewCat] = useState<string>('all');
  const [previewVegOnly, setPreviewVegOnly] = useState(false);
  const [previewCart, setPreviewCart] = useState<Record<string, number>>({});

  // Re-initialize when switching restaurant
  useEffect(() => {
    const nextTheme: MenuThemeId =
      restaurant.active_theme && ALL_THEME_IDS.includes(restaurant.active_theme)
        ? restaurant.active_theme
        : allowedThemes[0] || 'classic';
    setSelectedTheme(nextTheme);
    const map = {} as Record<MenuThemeId, ThemePresetConfig>;
    for (const tid of ALL_THEME_IDS) {
      map[tid] = getMergedThemeConfig(tid, restaurant.theme_config, restaurant);
    }
    setDraftConfigs(map);
  }, [restaurant.id, restaurant.active_theme]);

  // Sync live draft customization to localStorage so "Open Live QR Menu Preview" in a new window reflects unsaved edits immediately
  useEffect(() => {
    if (!restaurant) return;
    try {
      const payload = JSON.stringify({
        themeId: selectedTheme,
        config,
        updatedAt: Date.now(),
      });
      if (restaurant.slug) localStorage.setItem(`qr_theme_live_draft_${restaurant.slug}`, payload);
      if (restaurant.id) localStorage.setItem(`qr_theme_live_draft_${restaurant.id}`, payload);
    } catch {
      // ignore storage quota errors
    }
  }, [restaurant?.slug, restaurant?.id, selectedTheme, config]);

  const handleSelectThemeCard = (themeId: MenuThemeId) => {
    const isUnlocked = isAdminOverride || allowedThemes.includes(themeId);
    if (!isUnlocked) {
      showToast(
        `The "${MENU_THEME_PRESETS[themeId].name}" theme is currently turned OFF for this restaurant. Enable it from Super Admin or upgrade plan.`,
        'error'
      );
      return;
    }
    setSelectedTheme(themeId);
  };

  const handleResetToPresetDefaults = () => {
    const presetDefaults = MENU_THEME_PRESETS[selectedTheme].defaultConfig;
    updateCurrentThemeConfig({
      ...presetDefaults,
      promo_image: restaurant.cover_image || presetDefaults.promo_image,
    });
    showToast(`Reset "${MENU_THEME_PRESETS[selectedTheme].name}" to its default design settings`, 'info');
  };

  const handleSaveAndPublishTheme = async (themeToPublish?: MenuThemeId) => {
    const targetTheme = themeToPublish || selectedTheme;
    const isUnlocked = isAdminOverride || allowedThemes.includes(targetTheme);
    if (!isUnlocked) {
      showToast('This theme is turned OFF for your restaurant. Contact Admin or upgrade plan.', 'error');
      return;
    }

    try {
      setSaving(true);
      const targetConfig = draftConfigs[targetTheme] || getMergedThemeConfig(targetTheme, restaurant.theme_config, restaurant);

      // Build unified theme_config that preserves per-theme customizations for all 5 themes
      let mergedByTheme: Partial<Record<MenuThemeId, Partial<MenuThemeConfig>>> = {
        ...(restaurant.theme_config?.by_theme || {}),
      };
      for (const tid of ALL_THEME_IDS) {
        if (draftConfigs[tid]) {
          const { by_theme: _bt, _theme_id: _tid, ...cleanCfg } = draftConfigs[tid] as any;
          mergedByTheme[tid] = cleanCfg;
        }
      }

      const savedThemeConfig = buildSavedThemeConfig(
        targetTheme,
        targetConfig,
        {
          ...(restaurant.theme_config || {}),
          by_theme: mergedByTheme,
        }
      );

      const payload = {
        active_theme: targetTheme,
        theme_config: savedThemeConfig,
      };
      const res = await api.updateRestaurantProfile(payload, restaurant.id);
      const updatedRest = res?.restaurant || res || {
        ...restaurant,
        active_theme: targetTheme,
        theme_config: savedThemeConfig,
      };
      onUpdated(updatedRest);
      showToast(
        `Saved & Activated "${MENU_THEME_PRESETS[targetTheme].name}" with your customizations on the live QR menu!`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to save theme settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Fallback sample categories & items so Live Preview works even if restaurant has no items yet or in Admin view
  const previewCategories: Category[] =
    categories && categories.length > 0
      ? categories
      : ([
          { id: 'cat-1', restaurant_id: restaurant.id, name: 'Signatures', sort_order: 1 },
          { id: 'cat-2', restaurant_id: restaurant.id, name: 'Artisan Mains', sort_order: 2 },
          { id: 'cat-3', restaurant_id: restaurant.id, name: 'Beverages', sort_order: 3 },
        ] as unknown as Category[]);

  const previewItems: MenuItem[] =
    items && items.length > 0
      ? items
      : ([
          {
            id: 'sample-1',
            restaurant_id: restaurant.id,
            category_id: previewCategories[0].id,
            name: 'Artisan Truffle Sourdough Pizza',
            description: 'Hand-stretched crust, roasted wild mushrooms, fresh Fior di Latte mozzarella & white truffle oil.',
            price: 399,
            discount_price: 329,
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
            is_veg: true,
            is_bestseller: true,
            is_available: true,
            prep_time: 15,
            weight: '320g',
            spicy_level: 1,
          },
          {
            id: 'sample-2',
            restaurant_id: restaurant.id,
            category_id: previewCategories[0].id,
            name: 'Smoky Peri-Peri Grilled Paneer Bowl',
            description: 'Char-grilled cottage cheese cubes, herbed rice, flame-roasted peppers & house peri-peri glaze.',
            price: 299,
            discount_price: 259,
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
            is_veg: true,
            is_bestseller: true,
            is_available: true,
            prep_time: 12,
            weight: '280g',
            spicy_level: 2,
          },
          {
            id: 'sample-3',
            restaurant_id: restaurant.id,
            category_id: previewCategories[1]?.id || previewCategories[0].id,
            name: 'Belgian Dark Chocolate Hazelnut Frappe',
            description: 'Velvety single-origin espresso blended with roasted Piedmont hazelnuts and 70% dark cocoa.',
            price: 229,
            discount_price: 199,
            image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
            is_veg: true,
            is_bestseller: false,
            is_available: true,
            prep_time: 8,
            weight: '350ml',
            spicy_level: 0,
          },
        ] as unknown as MenuItem[]);

  const filteredPreviewItems = previewItems.filter(item => {
    if (previewVegOnly && !item.is_veg) return false;
    if (previewCat !== 'all' && item.category_id !== previewCat) return false;
    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const bestsellersPreview = previewItems.filter(i => i.is_bestseller);

  const previewUrl = `/menu/${restaurant.slug}/table/1?preview_theme=${selectedTheme}`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-700/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" /> Menu Theme Studio (All 5 Themes Customizable)
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-[10px] uppercase tracking-wider">
              Unlocked Themes: {allowedThemes.length} / 5
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Customer QR Menu Themes & Live Customization
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Select any of your enabled themes below to preview its live interactive design, customize banners, brand colors, fonts, and card layout, or open the full QR menu preview in a new window.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Eye className="w-4 h-4 text-orange-400" />
            <span>Open Live QR Menu Preview</span>
            <ExternalLink className="w-3.5 h-3.5 text-orange-300" />
          </a>
          <button
            type="button"
            onClick={() => handleSaveAndPublishTheme()}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-[#ff4d2e]/30 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Publishing...' : `Save & Publish "${MENU_THEME_PRESETS[selectedTheme].name}"`}</span>
          </button>
        </div>
      </div>

      {/* 1. FIVE SELECTABLE MENU THEMES GALLERY */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              1. Select Customer Menu Theme ({allowedThemes.length} of 5 Enabled for Restaurant)
            </h3>
            <p className="text-xs text-slate-500">
              Click any theme card below to see its live interactive preview and customize its colors, banner, and layout.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <span>
              Editing Preview:{' '}
              <strong className="text-indigo-600">
                {MENU_THEME_PRESETS[selectedTheme]?.name}
              </strong>
            </span>
            <span>•</span>
            <span>
              Live on QR Menu:{' '}
              <strong className="text-emerald-600">
                {MENU_THEME_PRESETS[restaurant.active_theme || 'classic']?.name}
              </strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {ALL_THEME_IDS.map(themeId => {
            const preset = MENU_THEME_PRESETS[themeId];
            const isUnlocked = isAdminOverride || allowedThemes.includes(themeId);
            const isCurrentlyActive = (restaurant.active_theme || 'classic') === themeId;
            const isSelected = selectedTheme === themeId;
            const cardCfg = draftConfigs[themeId] || preset.defaultConfig;

            return (
              <div
                key={themeId}
                onClick={() => handleSelectThemeCard(themeId)}
                className={`rounded-3xl p-4 border-2 transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'border-[#ff4d2e] bg-orange-50/40 shadow-xl ring-2 ring-[#ff4d2e]/20'
                    : isUnlocked
                      ? 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                      : 'border-slate-200 bg-slate-100/80 opacity-75'
                }`}
              >
                <div>
                  {/* Miniature Visual Theme Preview Header reflecting customized colors */}
                  <div
                    style={{ backgroundColor: cardCfg.background_color || preset.swatches.bg }}
                    className="h-28 rounded-2xl p-3 border border-black/10 mb-3 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        style={{ backgroundColor: cardCfg.primary_color || preset.swatches.primary }}
                        className="px-2 py-0.5 rounded-full text-[9px] font-black text-white uppercase tracking-wider"
                      >
                        {preset.id === 'classic'
                          ? 'Theme 1'
                          : preset.id === 'hot_ready'
                            ? 'Theme 2'
                            : preset.id === 'premium_cafe'
                              ? 'Theme 3'
                              : preset.id === 'modern_app'
                                ? 'Theme 4'
                                : 'Theme 5'}
                      </span>
                      <div className="flex items-center gap-1">
                        {[
                          cardCfg.primary_color || preset.swatches.primary,
                          cardCfg.secondary_color || preset.swatches.secondary || '#1E293B',
                          cardCfg.background_color || preset.swatches.bg,
                          cardCfg.accent_color || preset.swatches.accent,
                        ].map((hex, i) => (
                          <span
                            key={i}
                            style={{ backgroundColor: hex }}
                            className="w-3 h-3 rounded-full border border-black/20"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Mini UI Wireframe inside card */}
                    <div
                      style={{
                        backgroundColor: cardCfg.card_color || preset.swatches.card,
                        color: cardCfg.text_color || preset.swatches.text,
                      }}
                      className="rounded-xl p-2 border border-black/5 shadow-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] font-black truncate">{restaurant.name}</div>
                        <div className="text-[8px] opacity-60 truncate">{cardCfg.promo_title || preset.referenceStyle}</div>
                      </div>
                      <span
                        style={{ backgroundColor: cardCfg.primary_color || preset.swatches.primary }}
                        className="px-2 py-0.5 rounded-full text-[8px] font-bold text-white shrink-0"
                      >
                        + ADD
                      </span>
                    </div>

                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px] flex flex-col items-center justify-center text-white p-2 text-center">
                        <Lock className="w-5 h-5 text-amber-400 mb-1" />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          Turned OFF by Admin
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Theme Title & Reference Info */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
                      {preset.badgeText}
                    </span>
                    <div className="flex items-center gap-1">
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-black text-[9px] uppercase">
                          Previewing
                        </span>
                      )}
                      {isCurrentlyActive && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Live
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="font-black text-base text-slate-900">{preset.name}</h4>
                  <p className="text-[11px] font-bold text-slate-600 mt-0.5">{preset.tagline}</p>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                  {isUnlocked ? (
                    <>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedTheme(themeId);
                          handleSaveAndPublishTheme(themeId);
                        }}
                        disabled={saving}
                        className={`w-full py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          isCurrentlyActive
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isCurrentlyActive ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Active on QR Menu
                          </>
                        ) : (
                          <>Activate "{preset.name}"</>
                        )}
                      </button>
                      <a
                        href={`/menu/${restaurant.slug}/table/1?preview_theme=${themeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>New Tab Preview</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[11px] text-center flex items-center justify-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      <span>Theme Turned OFF</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CUSTOMIZATION & REAL LIVE INTERACTIVE PREVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Theme Customization Controls for ALL 5 Themes */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#ff4d2e]" />
                  <span>Customize "{MENU_THEME_PRESETS[selectedTheme].name}"</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#ff4d2e] font-black text-[10px] uppercase">
                  Live Editing
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every change below updates the live mobile preview on the right immediately and applies to "{MENU_THEME_PRESETS[selectedTheme].name}" when saved.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToPresetDefaults}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveAndPublishTheme(selectedTheme)}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {/* Quick Theme Switcher Pills inside Customizer so user can customize all 5 themes seamlessly */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[11px] font-black uppercase text-slate-400 mr-1 shrink-0">Editing Theme:</span>
            {ALL_THEME_IDS.map(tid => {
              const isUnlocked = isAdminOverride || allowedThemes.includes(tid);
              const isSel = selectedTheme === tid;
              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => handleSelectThemeCard(tid)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                    isSel
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isUnlocked
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-50 text-slate-400 opacity-60'
                  }`}
                >
                  <span
                    style={{ backgroundColor: MENU_THEME_PRESETS[tid].swatches.primary }}
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                  />
                  <span>{MENU_THEME_PRESETS[tid].name}</span>
                  {!isUnlocked && <Lock className="w-3 h-3" />}
                </button>
              );
            })}
          </div>

          {!canCustomize ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
              <Lock className="w-8 h-8 text-amber-600 mx-auto" />
              <h4 className="font-black text-sm text-amber-950">
                Theme Customization Turned OFF for This Plan
              </h4>
              <p className="text-xs text-amber-800 max-w-md mx-auto">
                Ask the Super Admin to enable "Owner Can Edit Theme" or upgrade to Growth/Pro to unlock custom colors, promotional banners, and layout controls.
              </p>
            </div>
          ) : (
            <>
              {/* Customization Sub-Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-100 p-1.5 rounded-2xl">
                {[
                  { id: 'banner', label: 'Promo & Banner', icon: ImageIcon },
                  { id: 'colors', label: 'Brand Colors', icon: Palette },
                  { id: 'layout', label: 'Fonts & Layout', icon: Type },
                  { id: 'visibility', label: 'Card Visibility', icon: Layout },
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSubTab(tab.id as any)}
                      className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                        activeSubTab === tab.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#ff4d2e]" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* SUB-TAB 1: PROMO & BANNER */}
              {activeSubTab === 'banner' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Promo Badge Text
                      </label>
                      <input
                        type="text"
                        value={config.promo_badge}
                        onChange={e => updateCurrentThemeConfig({ promo_badge: e.target.value })}
                        placeholder="e.g. HOT-N-READY DEAL 🔥"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Banner Call-to-Action Button
                      </label>
                      <input
                        type="text"
                        value={config.promo_cta_text}
                        onChange={e => updateCurrentThemeConfig({ promo_cta_text: e.target.value })}
                        placeholder="e.g. ORDER NOW"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Promotional Headline Title
                    </label>
                    <input
                      type="text"
                      value={config.promo_title}
                      onChange={e => updateCurrentThemeConfig({ promo_title: e.target.value })}
                      placeholder="e.g. Oven-Hot Combos Ready in Minutes!"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Promotional Subtitle / Description
                    </label>
                    <textarea
                      rows={2}
                      value={config.promo_subtitle}
                      onChange={e => updateCurrentThemeConfig({ promo_subtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Promotional Banner Image URL
                    </label>
                    <input
                      type="text"
                      value={config.promo_image}
                      onChange={e => updateCurrentThemeConfig({ promo_image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Featured Rail Title
                      </label>
                      <input
                        type="text"
                        value={config.editorial_title}
                        onChange={e => updateCurrentThemeConfig({ editorial_title: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Featured Rail Subtitle
                      </label>
                      <input
                        type="text"
                        value={config.editorial_subtitle}
                        onChange={e => updateCurrentThemeConfig({ editorial_subtitle: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: BRAND COLORS */}
              {activeSubTab === 'colors' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { key: 'primary_color', label: 'Primary Brand / CTA' },
                      { key: 'secondary_color', label: 'Header / Secondary' },
                      { key: 'background_color', label: 'Page Background' },
                      { key: 'card_color', label: 'Menu Card Surface' },
                      { key: 'text_color', label: 'Primary Text' },
                      { key: 'accent_color', label: 'Badge / Accent' },
                    ].map(c => (
                      <div key={c.key} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                          {c.label}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(config as any)[c.key] || '#EA580C'}
                            onChange={e => updateCurrentThemeConfig({ [c.key]: e.target.value })}
                            className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={(config as any)[c.key] || ''}
                            onChange={e => updateCurrentThemeConfig({ [c.key]: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: FONTS & LAYOUT */}
              {activeSubTab === 'layout' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Typography Font Family
                    </label>
                    <select
                      value={config.font_family}
                      onChange={e => updateCurrentThemeConfig({ font_family: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                    >
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Geometric)</option>
                      <option value="Cormorant Garamond">Cormorant Garamond (Editorial Cafe Serif)</option>
                      <option value="Playfair Display">Playfair Display (Luxury Bistro Serif)</option>
                      <option value="DM Sans">DM Sans (Clean Mobile App)</option>
                      <option value="Space Grotesk">Space Grotesk (Contemporary Tech)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Button Shape Style
                    </label>
                    <select
                      value={config.button_style}
                      onChange={e => updateCurrentThemeConfig({ button_style: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                    >
                      <option value="pill">Pill Capsule (Full Rounded)</option>
                      <option value="rounded">Modern Rounded (12px)</option>
                      <option value="sharp">Architectural Sharp (6px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Menu Card Style
                    </label>
                    <select
                      value={config.card_style}
                      onChange={e => updateCurrentThemeConfig({ card_style: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                    >
                      <option value="elevated">Soft Elevated Shadow</option>
                      <option value="bordered">Refined Editorial Border</option>
                      <option value="glass">Translucent Glassmorphism</option>
                      <option value="minimal">Minimalist Flat Divider</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Header Alignment
                    </label>
                    <select
                      value={config.header_layout}
                      onChange={e => updateCurrentThemeConfig({ header_layout: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white"
                    >
                      <option value="split">Split Logo & Details</option>
                      <option value="centered">Centered Crest & Title</option>
                      <option value="editorial">Editorial Magazine Header</option>
                      <option value="minimal">Compact Mobile App Bar</option>
                    </select>
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: CARD & SECTION VISIBILITY */}
              {activeSubTab === 'visibility' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'show_hero_banner', label: 'Show Promotional Hero Banner' },
                    { key: 'show_bestsellers', label: 'Show Featured / Bestsellers Rail' },
                    { key: 'show_search_bar', label: 'Show Search & Veg Filter Bar' },
                    { key: 'show_dietary_badges', label: 'Show Veg / Non-Veg Indicators' },
                    { key: 'show_prep_time', label: 'Show Preparation Time (mins)' },
                    { key: 'show_spicy_indicator', label: 'Show Spicy Level Indicator' },
                    { key: 'show_weight', label: 'Show Portion Weight / Serving' },
                  ].map(toggle => (
                    <label
                      key={toggle.key}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50"
                    >
                      <span className="text-xs font-bold text-slate-800">{toggle.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean((config as any)[toggle.key])}
                        onChange={e =>
                          updateCurrentThemeConfig({ [toggle.key]: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#ff4d2e] rounded cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right 5 Columns: REAL Interactive Mobile Theme Preview rendering actual CustomerThemedMenuBody */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[390px] flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#ff4d2e]" />
              <span>Live Interactive Preview: {MENU_THEME_PRESETS[selectedTheme].name}</span>
            </span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-black text-[#ff4d2e] hover:underline flex items-center gap-1"
            >
              <span>Full Screen</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="w-full max-w-[390px] rounded-[42px] border-[10px] border-slate-900 bg-white shadow-2xl overflow-hidden relative">
            {/* Phone Notch */}
            <div className="bg-slate-900 text-white px-5 py-1.5 flex items-center justify-between text-[10px] font-bold">
              <span>9:41</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] uppercase tracking-wider">
                {MENU_THEME_PRESETS[selectedTheme].name}
              </span>
              <span>5G • 100%</span>
            </div>

            {/* Scrollable Real Customer Menu Theme Body */}
            <div className="h-[640px] overflow-y-auto overflow-x-hidden relative">
              <CustomerThemedMenuBody
                themeId={selectedTheme}
                restaurant={restaurant}
                categories={previewCategories}
                items={previewItems}
                filteredDishes={filteredPreviewItems}
                recommendedDishes={bestsellersPreview}
                selectedTableNumber={1}
                language="en"
                setLanguage={() => {}}
                t={{
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
                  viewOrder: 'View Order',
                  addMoreItems: 'Add More Items',
                  specialInstructions: 'Special instructions...',
                  close: 'Close',
                  orderSuccess: 'Order placed successfully',
                }}
                selectedCategory={previewCat}
                setSelectedCategory={setPreviewCat}
                searchQuery={previewSearch}
                setSearchQuery={setPreviewSearch}
                vegOnlyFilter={previewVegOnly}
                setVegOnlyFilter={setPreviewVegOnly}
                getItemQuantityInCart={id => previewCart[id] || 0}
                openCustomization={item => {
                  setPreviewCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
                  showToast(`Added ${item.name} to preview tray`, 'info');
                }}
                handleQuickAdd={item => {
                  setPreviewCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
                  showToast(`Added ${item.name} to preview tray`, 'info');
                }}
                handleQuickServiceAlert={type => {
                  showToast(`Preview: Service alert sent (${type})`, 'info');
                }}
                callingWaiter={false}
                setShowAssistanceModal={() => showToast('Preview: Call waiter dialog opened', 'info')}
                setShowCartModal={() => showToast('Preview: Cart drawer opened', 'info')}
                fetchRecentOrders={() => {}}
                setShowRecentOrdersModal={() => showToast('Preview: Recent orders modal opened', 'info')}
                recentOrders={[]}
                totalItemCount={Object.values(previewCart).reduce((a, b) => a + b, 0)}
                grandTotal={Object.entries(previewCart).reduce((sum, [id, qty]) => {
                  const it = previewItems.find(i => i.id === id);
                  return sum + (it ? (it.discount_price || it.price) * qty : 0);
                }, 0)}
                configOverride={config}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-semibold mt-2.5 text-center max-w-[360px]">
            Click categories, add items, or change any color/font/banner on the left to see instant live updates above.
          </p>
        </div>
      </div>
    </div>
  );
};
