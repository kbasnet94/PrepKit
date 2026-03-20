import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { getGuideBySlug, getRelatedGuides } from "@/lib/guides";
import type { Guide, GuideImage, GuideSourceRef } from "@/lib/guides";
import { GuideFeedback } from "@/components/GuideFeedback";
import { useGuideStore } from "@/contexts/GuideStoreContext";
import { recordGuideView } from "@/lib/guide-views";

const RISK_COLORS: Record<string, string> = {
  low: "#2D6A4F",
  medium: "#8E6B3E",
  high: "#C0392B",
};

const RISK_BG: Record<string, string> = {
  low: "#2D6A4F10",
  medium: "#8E6B3E18",
  high: "#C0392B12",
};

const RISK_LABELS: Record<string, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

const LAYER_LABELS: Record<string, string> = {
  action_card: "Action Card",
  scenario_guide: "Scenario Guide",
  reference_guide: "Reference Guide",
  preparedness: "Preparedness Guide",
};

const CATEGORY_LABELS: Record<string, string> = {
  natural_disasters: "Natural Disasters",
  medical_safety: "Medical Safety",
  water_food: "Water, Food & Sanitation",
  preparedness: "Preparedness",
  communication: "Communication",
  navigation: "Navigation & Rescue",
  power_utilities_home_safety: "Power & Home Safety",
  shelter_fire_warmth: "Shelter, Fire & Warmth",
  weather_environment: "Weather & Environment",
  core_skills: "Core Skills",
};

function formatCategory(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

function Section({
  label,
  icon,
  children,
  delay = 0,
  styles,
  C,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
  delay?: number;
  styles: ReturnType<typeof makeStyles>;
  C: typeof Colors.light;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(240)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={14} color={C.textTertiary} />
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      {children}
    </Animated.View>
  );
}

function StepList({ steps, styles, C }: { steps: string[]; styles: ReturnType<typeof makeStyles>; C: typeof Colors.light }) {
  return (
    <View style={styles.stepList}>
      {steps.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>{i + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

function BulletList({ items, color, styles }: { items: string[]; color: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={[styles.bullet, { backgroundColor: color }]} />
          <Text style={[styles.bulletText, { color }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function OptionBox({
  label,
  text,
  accent,
  styles,
}: {
  label: string;
  text: string;
  accent: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[styles.optionBox, accent ? styles.optionBoxAccent : styles.optionBoxMuted]}>
      <Text style={[styles.optionLabel, accent ? styles.optionLabelAccent : styles.optionLabelMuted]}>
        {label}
      </Text>
      <Text style={styles.optionText}>{text}</Text>
    </View>
  );
}

function SourceRefItem({ item, styles, C }: { item: GuideSourceRef; styles: ReturnType<typeof makeStyles>; C: typeof Colors.light }) {
  const canOpen = !!item.url;
  return (
    <Pressable
      style={({ pressed }) => [styles.refItem, pressed && { opacity: 0.7 }]}
      onPress={() => (canOpen ? Linking.openURL(item.url) : undefined)}
    >
      <View style={styles.refBody}>
        <Text style={styles.refProvider}>{item.organization}</Text>
        <Text style={styles.refTitle}>{item.title}</Text>
        {item.whyUseful ? (
          <Text style={styles.refWhy}>{item.whyUseful}</Text>
        ) : null}
      </View>
      {canOpen ? (
        <Ionicons name="open-outline" size={14} color={C.textTertiary} />
      ) : null}
    </Pressable>
  );
}

function RelatedGuideRow({ guide, styles, C }: { guide: Guide; styles: ReturnType<typeof makeStyles>; C: typeof Colors.light }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.relatedRow, pressed && { opacity: 0.7 }]}
      onPress={() => router.push({ pathname: "/guides/[slug]", params: { slug: guide.slug } })}
    >
      <View style={styles.relatedLeft}>
        <Text style={styles.relatedTitle}>{guide.title}</Text>
        <Text style={styles.relatedLayer}>
          {LAYER_LABELS[guide.layer] ?? guide.layer}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
    </Pressable>
  );
}

// ─── Image lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({
  image,
  onClose,
}: {
  image: GuideImage;
  onClose: () => void;
}) {
  const { width, height } = Dimensions.get("window");
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Image
            source={{ uri: image.storageUrl! }}
            style={{ width: width - 32, height: height * 0.6, borderRadius: 8 }}
            contentFit="contain"
            cachePolicy="disk"
            accessibilityLabel={image.altText}
          />
          {image.caption ? (
            <Text
              style={{
                color: "rgba(255,255,255,0.85)",
                textAlign: "center",
                marginTop: 12,
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                paddingHorizontal: 16,
              }}
            >
              {image.caption}
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          style={{ position: "absolute", top: 52, right: 20, padding: 8 }}
          onPress={onClose}
          hitSlop={12}
        >
          <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Single image tile ────────────────────────────────────────────────────────

function GuideImageTile({
  image,
  styles,
}: {
  image: GuideImage;
  styles: ReturnType<typeof makeStyles>;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!image.storageUrl) return null;

  return (
    <>
      <Pressable
        onPress={() => setLightboxOpen(true)}
        style={({ pressed }) => [styles.imageTile, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={`View image: ${image.caption || image.altText}`}
      >
        <Image
          source={{ uri: image.storageUrl }}
          style={styles.imageTileImg}
          contentFit="cover"
          cachePolicy="disk"
          accessibilityLabel={image.altText}
        />
        {image.caption ? (
          <Text style={styles.imageCaption}>{image.caption}</Text>
        ) : null}
      </Pressable>
      {lightboxOpen && (
        <ImageLightbox image={image} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

// ─── Gallery section (images with associatedStepIndex === null) ───────────────

function ImageGallery({
  images,
  styles,
}: {
  images: GuideImage[];
  styles: ReturnType<typeof makeStyles>;
}) {
  const galleryImages = images.filter((img) => img.associatedStepIndex === null && img.storageUrl);
  if (galleryImages.length === 0) return null;

  return (
    <View style={styles.galleryRow}>
      {galleryImages.map((img) => (
        <GuideImageTile key={img.key} image={img} styles={styles} />
      ))}
    </View>
  );
}

// ─── Inline step image (shown after a specific step) ─────────────────────────

function StepImage({
  stepIndex,
  images,
  styles,
}: {
  stepIndex: number;
  images: GuideImage[];
  styles: ReturnType<typeof makeStyles>;
}) {
  const match = images.find((img) => img.associatedStepIndex === stepIndex && img.storageUrl);
  if (!match) return null;
  return <GuideImageTile image={match} styles={styles} />;
}

// ─── StepList with inline images ─────────────────────────────────────────────

function StepListWithImages({
  steps,
  images,
  styles,
  C,
}: {
  steps: string[];
  images: GuideImage[];
  styles: ReturnType<typeof makeStyles>;
  C: typeof Colors.light;
}) {
  const hasStepImages = images.some((img) => img.associatedStepIndex !== null && img.storageUrl);

  if (!hasStepImages) {
    return <StepList steps={steps} styles={styles} C={C} />;
  }

  return (
    <View style={styles.stepList}>
      {steps.map((step, i) => (
        <View key={i}>
          <View style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
          <StepImage stepIndex={i} images={images} styles={styles} />
        </View>
      ))}
    </View>
  );
}

function NotFoundScreen({ styles, C }: { styles: ReturnType<typeof makeStyles>; C: typeof Colors.light }) {
  return (
    <View style={styles.notFound}>
      <Ionicons name="document-outline" size={48} color={C.textTertiary} />
      <Text style={styles.notFoundTitle}>Guide not found</Text>
      <Pressable onPress={() => router.back()} style={styles.notFoundBack}>
        <Text style={styles.notFoundBackText}>Go back</Text>
      </Pressable>
    </View>
  );
}

export default function GuideDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const { getOnlineGuide, fetchOnlineGuides, downloadedCategories, onlineFetchingCategories } = useGuideStore();
  const guide = slug ? (getGuideBySlug(slug) ?? getOnlineGuide(slug)) : undefined;
  const related = guide ? getRelatedGuides(guide) : [];

  useEffect(() => {
    if (slug) {
      recordGuideView(slug);
    }
  }, [slug]);

  useEffect(() => {
    if (!guide) return;
    const isDownloaded = downloadedCategories.has(guide.category);
    const isFetching = onlineFetchingCategories.has(guide.category);
    const isPlanned = guide.contentStatus === "metadata_only";
    
    // If not downloaded, not fetching, not planned, and has no content - fetch it!
    if (!isDownloaded && !isFetching && !isPlanned && guide.steps.length === 0 && !guide.preferredOption) {
      fetchOnlineGuides(guide.category);
    }
  }, [guide, downloadedCategories, onlineFetchingCategories, fetchOnlineGuides]);

  if (!guide) return <NotFoundScreen styles={styles} C={C} />;

  const isMedical = guide.category === "medical_safety" || guide.cardType === "medical_safety";
  const isHigh = guide.riskLevel === "high";
  const isPlanned = guide.contentStatus === "metadata_only";
  const needsReview = guide.contentStatus === "needs_source_review";
  const hasContent =
    guide.steps.length > 0 ||
    guide.preferredOption ||
    guide.warnings.length > 0 ||
    guide.whatNotToDo.length > 0 ||
    guide.redFlags.length > 0;

  let delayOffset = 100;
  function nextDelay(step = 40) {
    const d = delayOffset;
    delayOffset += step;
    return d;
  }

  return (
    <View style={[styles.container, { paddingTop: isWeb ? insets.top + 67 : insets.top }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={C.accent} />
        </Pressable>
        <View style={[styles.riskBadge, { backgroundColor: RISK_BG[guide.riskLevel] }]}>
          <View style={[styles.riskDot, { backgroundColor: RISK_COLORS[guide.riskLevel] }]} />
          <Text style={[styles.riskBadgeText, { color: RISK_COLORS[guide.riskLevel] }]}>
            {RISK_LABELS[guide.riskLevel]}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isWeb ? 34 + 84 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(0).duration(220)}>
          <Text style={styles.title}>{guide.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaCategory}>{formatCategory(guide.category)}</Text>
            <Text style={styles.metaSep}>·</Text>
            <Text style={styles.metaType}>{LAYER_LABELS[guide.layer] ?? guide.layer}</Text>
          </View>
        </Animated.View>

        {needsReview ? (
          <Animated.View entering={FadeInDown.delay(40).duration(220)} style={styles.reviewNotice}>
            <Ionicons name="information-circle-outline" size={16} color="#8E6B3E" />
            <Text style={styles.reviewNoticeText}>
              Sources for this guide are under review. Content may be updated.
            </Text>
          </Animated.View>
        ) : null}

        {isPlanned ? (
          <Animated.View entering={FadeInDown.delay(40).duration(220)} style={styles.plannedNotice}>
            <Ionicons name="time-outline" size={16} color={C.textTertiary} />
            <Text style={styles.plannedNoticeText}>
              This guide is planned and will be available in a future update.
            </Text>
          </Animated.View>
        ) : null}

        {guide.summary ? (
          <Animated.View entering={FadeInDown.delay(60).duration(220)} style={styles.summaryBox}>
            <Text style={styles.summaryText}>{guide.summary}</Text>
          </Animated.View>
        ) : null}

        {/* Gallery images (associatedStepIndex === null, storageUrl set) */}
        {guide.images && guide.images.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(70).duration(220)}>
            <ImageGallery images={guide.images} styles={styles} />
          </Animated.View>
        ) : null}

        {isHigh && isMedical ? (
          <Animated.View entering={FadeInDown.delay(80).duration(220)} style={styles.medicalNotice}>
            <Ionicons name="warning-outline" size={16} color="#C0392B" />
            <Text style={styles.medicalNoticeText}>
              This guidance is for emergency field use only. Seek professional medical help as soon as possible.
            </Text>
          </Animated.View>
        ) : null}

        {!isPlanned && hasContent ? (
          <>
            {guide.whenToUse ? (
              <Section label="When to use" icon="time-outline" delay={nextDelay()} styles={styles} C={C}>
                <Text style={styles.bodyText}>{guide.whenToUse}</Text>
              </Section>
            ) : null}

            {guide.preferredOption ? (
              <Section label="Best option" icon="checkmark-circle-outline" delay={nextDelay()} styles={styles} C={C}>
                <OptionBox label="Preferred" text={guide.preferredOption} accent styles={styles} />
                {guide.fallbackOption ? (
                  <OptionBox label="Fallback" text={guide.fallbackOption} accent={false} styles={styles} />
                ) : null}
              </Section>
            ) : null}

            {guide.steps.length > 0 ? (
              <Section label="Steps" icon="list-outline" delay={nextDelay()} styles={styles} C={C}>
                <StepListWithImages
                  steps={guide.steps}
                  images={guide.images ?? []}
                  styles={styles}
                  C={C}
                />
              </Section>
            ) : null}

            {guide.redFlags.length > 0 ? (
              <Section label="Red flags — seek help immediately" icon="alert-circle-outline" delay={nextDelay()} styles={styles} C={C}>
                <View style={styles.redFlagsBox}>
                  <BulletList items={guide.redFlags} color="#C0392B" styles={styles} />
                </View>
              </Section>
            ) : null}

            {guide.warnings.length > 0 ? (
              <Section label="Warnings" icon="warning-outline" delay={nextDelay()} styles={styles} C={C}>
                <View style={styles.warningsBox}>
                  <BulletList items={guide.warnings} color="#C0392B" styles={styles} />
                </View>
              </Section>
            ) : null}

            {guide.whatNotToDo.length > 0 ? (
              <Section label="What not to do" icon="close-circle-outline" delay={nextDelay()} styles={styles} C={C}>
                <View style={styles.dontBox}>
                  <BulletList items={guide.whatNotToDo} color="#8E6B3E" styles={styles} />
                </View>
              </Section>
            ) : null}

            {guide.preparednessTips.length > 0 ? (
              <Section label="Preparedness tips" icon="shield-checkmark-outline" delay={nextDelay()} styles={styles} C={C}>
                <View style={styles.tipsBox}>
                  <BulletList items={guide.preparednessTips} color={C.accent} styles={styles} />
                </View>
              </Section>
            ) : null}

            {guide.limitations.length > 0 ? (
              <Section label="Limitations" icon="information-circle-outline" delay={nextDelay()} styles={styles} C={C}>
                <BulletList items={guide.limitations} color={C.textSecondary} styles={styles} />
              </Section>
            ) : null}

            {guide.sourceReferences.length > 0 ? (
              <Section label="Sources" icon="book-outline" delay={nextDelay()} styles={styles} C={C}>
                <View style={styles.refList}>
                  {guide.sourceReferences.map((r, i) => (
                    <SourceRefItem key={i} item={r} styles={styles} C={C} />
                  ))}
                </View>
              </Section>
            ) : null}
          </>
        ) : null}

        {related.length > 0 ? (
          <Section label="Related guides" icon="layers-outline" delay={nextDelay()} styles={styles} C={C}>
            <View style={styles.relatedList}>
              {related.map((g) => (
                <RelatedGuideRow key={g.id} guide={g} styles={styles} C={C} />
              ))}
            </View>
          </Section>
        ) : null}

        <GuideFeedback guideId={guide.id} guideSlug={guide.slug} />
      </ScrollView>
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: C.accentSurface,
    },
    riskBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    riskDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    riskBadgeText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
      gap: 16,
    },
    title: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: C.text,
      letterSpacing: -0.4,
      marginBottom: 6,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaCategory: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.accent,
    },
    metaSep: {
      fontSize: 13,
      color: C.textTertiary,
    },
    metaType: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textTertiary,
    },
    summaryBox: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
    },
    summaryText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.text,
      lineHeight: 22,
    },
    medicalNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: "#C0392B0C",
      borderRadius: 10,
      padding: 12,
    },
    medicalNoticeText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "#C0392B",
      lineHeight: 19,
    },
    reviewNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: C.warningSurface,
      borderRadius: 10,
      padding: 12,
    },
    reviewNoticeText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "#8E6B3E",
      lineHeight: 19,
    },
    plannedNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: C.surface,
      borderRadius: 10,
      padding: 12,
    },
    plannedNoticeText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      lineHeight: 19,
    },
    section: {
      gap: 10,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: C.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    bodyText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: C.text,
      lineHeight: 22,
    },
    optionBox: {
      borderRadius: 12,
      padding: 13,
      marginBottom: 6,
      gap: 4,
    },
    optionBoxAccent: {
      backgroundColor: C.accentSurface,
    },
    optionBoxMuted: {
      backgroundColor: C.surface,
    },
    optionLabel: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    optionLabelAccent: {
      color: C.accent,
    },
    optionLabelMuted: {
      color: C.textTertiary,
    },
    optionText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.text,
      lineHeight: 20,
    },
    stepList: {
      gap: 10,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    stepNum: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: C.accentSurface,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 1,
    },
    stepNumText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: C.accent,
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: C.text,
      lineHeight: 21,
    },
    bulletList: {
      gap: 8,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    bullet: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginTop: 8,
      flexShrink: 0,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      lineHeight: 21,
    },
    warningsBox: {
      backgroundColor: "#C0392B08",
      borderRadius: 10,
      padding: 12,
    },
    redFlagsBox: {
      backgroundColor: "#C0392B10",
      borderRadius: 10,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: "#C0392B",
    },
    dontBox: {
      backgroundColor: "#8E6B3E0A",
      borderRadius: 10,
      padding: 12,
    },
    tipsBox: {
      backgroundColor: C.accentSurface,
      borderRadius: 10,
      padding: 12,
    },
    refList: {
      gap: 6,
    },
    refItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: C.surface,
      borderRadius: 10,
      padding: 12,
      gap: 12,
    },
    refBody: {
      flex: 1,
      gap: 2,
    },
    refProvider: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: C.accent,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    refTitle: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.text,
    },
    refWhy: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      marginTop: 2,
      lineHeight: 17,
    },
    relatedList: {
      gap: 6,
    },
    relatedRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 10,
      padding: 12,
      gap: 10,
    },
    relatedLeft: {
      flex: 1,
      gap: 2,
    },
    relatedTitle: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: C.text,
    },
    relatedLayer: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
    },
    notFound: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    notFoundTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: C.text,
    },
    notFoundBack: {
      marginTop: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: C.accentSurface,
      borderRadius: 20,
    },
    notFoundBackText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: C.accent,
    },
    // ── Image gallery ────────────────────────────────────────────────────────
    galleryRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    imageTile: {
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: C.surface,
      // single image: full width; multiple: roughly half-width (flex handles it)
      flex: 1,
      minWidth: 140,
    },
    imageTileImg: {
      width: "100%",
      aspectRatio: 4 / 3,
    },
    imageCaption: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: C.textSecondary,
      paddingHorizontal: 8,
      paddingVertical: 6,
      lineHeight: 17,
    },
  });
}
