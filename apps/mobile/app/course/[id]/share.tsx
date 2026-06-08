/**
 * app/course/[id]/share.tsx
 *
 * Share screen layout:
 * ┌────────────────────────────┐
 * │  Header (back + title)     │
 * ├────────────────────────────┤
 * │  Template carousel (peek)  │
 * │  · dots indicator          │
 * │  · template name           │
 * ├────────────────────────────┤
 * │  Platform selector         │
 * ├────────────────────────────┤
 * │  Link copy | CTA button    │
 * └────────────────────────────┘
 */

import React, {
  useRef, useState, useCallback, useEffect,
} from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, useWindowDimensions, Alert,
  NativeSyntheticEvent, NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import type ViewShotType from 'react-native-view-shot';

import { MOCK_COURSE } from '@/data/mockCourse';
import { useCourseStore } from '@/store/useCourseStore';
import { useCaptureAndShare, type Platform_ } from '@/hooks/useCaptureAndShare';
import { THEME } from '@/constants/theme';

import { TemplateStory,      STORY_W,       STORY_H       } from '@/components/share-templates/TemplateStory';
import { TemplateMinimal,    MINIMAL_W,     MINIMAL_H     } from '@/components/share-templates/TemplateMinimal';
import { TemplateTransparent,TRANSPARENT_W, TRANSPARENT_H } from '@/components/share-templates/TemplateTransparent';
import { TemplateDetail,     DETAIL_W,      DETAIL_H      } from '@/components/share-templates/TemplateDetail';
import { TemplateBg,         BG_W,          BG_H          } from '@/components/share-templates/TemplateBg';

// ── Template config ────────────────────────────────────────────────────────────

const TEMPLATES = [
  { key: 'story',       label: '스토리',   desc: '9:16 · 배경 포함',  w: STORY_W,       h: STORY_H,       transparent: false },
  { key: 'minimal',     label: '미니멀',   desc: '1:1 · 심플',        w: MINIMAL_W,     h: MINIMAL_H,     transparent: false },
  { key: 'transparent', label: '코스만',   desc: '9:16 · 투명 배경', w: TRANSPARENT_W, h: TRANSPARENT_H, transparent: true  },
  { key: 'detail',      label: '상세',     desc: '9:16 · 장소 목록', w: DETAIL_W,      h: DETAIL_H,      transparent: false },
  { key: 'bg',          label: '배경 포함', desc: '9:16 · 블러 배경', w: BG_W,          h: BG_H,          transparent: false },
] as const;

type TemplateKey = typeof TEMPLATES[number]['key'];

// ── Platform config ────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform_; emoji: string; label: string }[] = [
  { id: 'ig-story', emoji: '📸', label: 'IG 스토리' },
  { id: 'ig-feed',  emoji: '🖼️', label: 'IG 피드'  },
  { id: 'message',  emoji: '💬', label: '메시지'    },
  { id: 'save',     emoji: '💾', label: '저장'      },
];

const CTA_LABEL: Record<Platform_, string> = {
  'ig-story': '스토리에 공유',
  'ig-feed':  '피드에 공유',
  'message':  '메시지로 보내기',
  'save':     '갤러리에 저장',
};

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: SCREEN_W } = useWindowDimensions();

  const course = useCourseStore(s => s.courses.find(c => c.id === id)) ?? MOCK_COURSE;

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [platform, setPlatform] = useState<Platform_>('ig-story');
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const selectedTemplate = TEMPLATES[selectedIdx];

  // One ViewShot ref per template
  const vsRefs = useRef<(ViewShotType | null)[]>([]);
  const setVsRef = (i: number) => (ref: ViewShotType | null) => {
    vsRefs.current[i] = ref;
  };

  const { execute, copyLink } = useCaptureAndShare(
    { current: vsRefs.current[selectedIdx] },
    selectedTemplate.transparent,
  );

  // ── Carousel scroll → snap ──────────────────────────────────────────────────

  // Card visible width + gap
  const CARD_GAP    = 16;
  const PEEK        = 32; // how much of adjacent cards is visible
  const CARD_W      = SCREEN_W - PEEK * 2;
  const scrollRef   = useRef<ScrollView>(null);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (CARD_W + CARD_GAP));
    setSelectedIdx(Math.max(0, Math.min(TEMPLATES.length - 1, idx)));
  }, [CARD_W, CARD_GAP]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleShare = async () => {
    setLoading(true);
    try {
      await execute(platform);
      if (platform === 'save') {
        Alert.alert('저장 완료', '갤러리에 저장되었습니다 ✓');
      }
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '공유에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    await copyLink(course.id);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>공유하기</Text>
        <Text style={styles.headerHint}>← 넘겨보기 →</Text>
      </View>

      {/* ── Carousel ─────────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_W + CARD_GAP}
        snapToAlignment="center"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentInset={{ left: PEEK, right: PEEK }}
        contentContainerStyle={[
          styles.carouselContent,
          { paddingHorizontal: PEEK - CARD_GAP / 2 },
        ]}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.carousel}
      >
        {TEMPLATES.map((tpl, i) => {
          const isSelected = i === selectedIdx;
          return (
            <TouchableOpacity
              key={tpl.key}
              activeOpacity={1}
              onPress={() => {
                setSelectedIdx(i);
                scrollRef.current?.scrollTo({ x: i * (CARD_W + CARD_GAP), animated: true });
              }}
              style={[
                styles.cardWrap,
                { width: CARD_W, marginHorizontal: CARD_GAP / 2 },
                isSelected ? styles.cardSelected : styles.cardDim,
              ]}
            >
              <ViewShot ref={setVsRef(i)} style={styles.viewShot}>
                {tpl.key === 'story'       && <TemplateStory       course={course} />}
                {tpl.key === 'minimal'     && <TemplateMinimal     course={course} />}
                {tpl.key === 'transparent' && <TemplateTransparent course={course} showCheckerboard />}
                {tpl.key === 'detail'      && <TemplateDetail      course={course} />}
                {tpl.key === 'bg'          && <TemplateBg          course={course} />}
              </ViewShot>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {TEMPLATES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === selectedIdx && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Template name */}
      <View style={styles.templateInfo}>
        <Text style={styles.templateName}>{selectedTemplate.label}</Text>
        <Text style={styles.templateDesc}>{selectedTemplate.desc}</Text>
      </View>

      {/* ── Platform selector ────────────────────────────────────────────── */}
      <View style={styles.platformSection}>
        <Text style={styles.platformTitle}>어디에 공유할까요?</Text>
        <View style={styles.platformRow}>
          {PLATFORMS.map(p => {
            const active = p.id === platform;
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.platformBtn}
                onPress={() => setPlatform(p.id)}
              >
                <View style={[
                  styles.platformIcon,
                  active && styles.platformIconActive,
                ]}>
                  <Text style={styles.platformEmoji}>{p.emoji}</Text>
                </View>
                <Text style={[
                  styles.platformLabel,
                  active && styles.platformLabelActive,
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Bottom actions ────────────────────────────────────────────────── */}
      <View style={styles.bottomRow}>
        <TouchableOpacity style={styles.linkBtn} onPress={handleCopyLink}>
          <Text style={styles.linkBtnText}>
            {linkCopied ? '복사됨 ✓' : '🔗 링크 복사'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
          onPress={handleShare}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={THEME.white} size="small" />
            : <Text style={styles.ctaBtnText}>{CTA_LABEL[platform]}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.gray50 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: THEME.white,
    borderBottomWidth: 1, borderBottomColor: THEME.gray100,
  },
  backBtn: { padding: 4, minWidth: 32 },
  backArrow: { fontSize: 28, color: THEME.ink, lineHeight: 32 },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '600', color: THEME.ink,
  },
  headerHint: { fontSize: 11, color: THEME.gray400, minWidth: 80, textAlign: 'right' },

  // Carousel
  carousel: { marginTop: 20 },
  carouselContent: { alignItems: 'center' },
  cardWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardSelected: { transform: [{ scale: 1 }] },
  cardDim: { opacity: 0.65, transform: [{ scale: 0.96 }] },
  viewShot: { borderRadius: 16, overflow: 'hidden' },

  // Dots
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 6, marginTop: 16,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: THEME.gray200,
  },
  dotActive: {
    width: 18, backgroundColor: THEME.coral,
  },

  // Template info
  templateInfo: { alignItems: 'center', marginTop: 8, gap: 2 },
  templateName: { fontSize: 14, fontWeight: '700', color: THEME.ink },
  templateDesc: { fontSize: 11, color: THEME.gray400 },

  // Platform
  platformSection: {
    marginTop: 20, paddingHorizontal: 20,
  },
  platformTitle: { fontSize: 12, color: THEME.gray400, marginBottom: 12 },
  platformRow: { flexDirection: 'row', justifyContent: 'space-between' },
  platformBtn: { alignItems: 'center', gap: 6 },
  platformIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: THEME.gray100,
    alignItems: 'center', justifyContent: 'center',
  },
  platformIconActive: { backgroundColor: THEME.coralLight },
  platformEmoji: { fontSize: 22 },
  platformLabel: { fontSize: 11, color: THEME.gray500 },
  platformLabelActive: { color: THEME.coral, fontWeight: '600' },

  // Bottom
  bottomRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    backgroundColor: THEME.white,
    borderTopWidth: 1, borderTopColor: THEME.gray100,
    marginTop: 'auto',
  },
  linkBtn: {
    height: 44, paddingHorizontal: 16,
    borderWidth: 1, borderColor: THEME.gray200,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  linkBtnText: { fontSize: 13, color: THEME.gray600 } as any,
  ctaBtn: {
    flex: 1, height: 44, borderRadius: 12,
    backgroundColor: THEME.coral,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: THEME.white },
});
