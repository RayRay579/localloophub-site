import React, { ReactNode } from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const TERMS_URL = 'https://www.localloophub.com/terms.html';
const PRIVACY_URL = 'https://www.localloophub.com/privacy.html';
const SITE_URL = 'https://www.localloophub.com';
const WAITLIST_URL = 'https://www.localloophub.com/#waitlist';

const PALETTE = {
  ink: '#1f2937',
  muted: '#5b6475',
  panel: 'rgba(255,255,255,0.88)',
  panelStrong: '#ffffff',
  line: 'rgba(31, 41, 55, 0.10)',
  peach: '#ff8d69',
  peachSoft: '#ffe7dc',
  sky: '#4f8cff',
  skySoft: '#e7f0ff',
  mint: '#48c2a9',
  mintSoft: '#ddf8f2',
  butter: '#ffd97a',
  butterSoft: '#fff5d6',
  rose: '#ff6f91',
  shadow: 'rgba(26, 46, 82, 0.12)',
};

type ShellProps = {
  title: string;
  subtitle: string;
  accent?: string;
  children: ReactNode;
};

function openExternalUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

function ScreenShell({ title, subtitle, accent = PALETTE.sky, children }: ShellProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View pointerEvents="none" style={styles.atmosphere}>
        <View style={[styles.orb, styles.orbA, { backgroundColor: `${accent}22` }]} />
        <View style={[styles.orb, styles.orbB, { backgroundColor: `${PALETTE.mint}1f` }]} />
        <View style={[styles.orb, styles.orbC, { backgroundColor: `${PALETTE.peach}22` }]} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.brand}>Local Loop Hub</Text>
            <Text style={styles.heroTitle}>{title}</Text>
          </View>
          <Pressable style={styles.heroPill} onPress={() => openExternalUrl(SITE_URL)}>
            <Text style={styles.heroPillText}>Open site</Text>
          </Pressable>
        </View>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </View>

      {children}
    </ScrollView>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  tone = PALETTE.panel,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: tone }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function ActionRow({
  primaryLabel,
  primaryUrl,
  secondaryLabel,
  secondaryUrl,
}: {
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
}) {
  return (
    <View style={styles.buttonRow}>
      <Pressable style={[styles.button, styles.buttonPrimary]} onPress={() => openExternalUrl(primaryUrl)}>
        <Text style={styles.buttonPrimaryText}>{primaryLabel}</Text>
      </Pressable>
      {secondaryLabel && secondaryUrl ? (
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => openExternalUrl(secondaryUrl)}>
          <Text style={styles.buttonSecondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LegalLinks() {
  return (
    <View style={styles.legalWrap}>
      <Text style={styles.legalLabel}>Subscription links</Text>
      <View style={styles.legalRow}>
        <Pressable onPress={() => openExternalUrl(TERMS_URL)}>
          <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
        </Pressable>
        <Pressable onPress={() => openExternalUrl(PRIVACY_URL)}>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: tone }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LoopItem({
  title,
  meta,
  type,
}: {
  title: string;
  meta: string;
  type: string;
}) {
  return (
    <View style={styles.loopItem}>
      <View style={styles.loopHead}>
        <Text style={styles.loopType}>{type}</Text>
        <Text style={styles.loopMeta}>{meta}</Text>
      </View>
      <Text style={styles.loopTitle}>{title}</Text>
    </View>
  );
}

export function HomeWebScreen() {
  return (
    <ScreenShell
      title="Live local feed"
      subtitle="A web version of the same bright, map-first Local Loop feel. Short-lived neighborhood posts, clean cards, and direct actions."
      accent={PALETTE.sky}
    >
      <SectionCard
        title="Right now in your loop"
        subtitle="Core feed states from the app, translated for desktop and mobile web."
      >
        <View style={styles.statRow}>
          <Stat label="Active loops" value="18" tone={PALETTE.skySoft} />
          <Stat label="Nearby today" value="7" tone={PALETTE.mintSoft} />
          <Stat label="Trusted people" value="23" tone={PALETTE.peachSoft} />
        </View>
        <View style={styles.listGap}>
          <LoopItem title="Need jumper cables near Oak St." meta="0.6 mi • 15 min ago" type="Need" />
          <LoopItem title="Offer: free moving boxes before 5 PM" meta="1.2 mi • expires in 3h" type="Offer" />
          <LoopItem title="Info: road closure by the farmer's market" meta="0.8 mi • expires in 1h" type="Info" />
        </View>
      </SectionCard>

      <SectionCard
        title="Real actions"
        subtitle="The website mirrors the app's quick access pattern: post fast, watch the map, or join the waitlist."
        tone={PALETTE.panelStrong}
      >
        <ActionRow
          primaryLabel="Join the waitlist"
          primaryUrl={WAITLIST_URL}
          secondaryLabel="Read how it works"
          secondaryUrl={SITE_URL}
        />
      </SectionCard>
    </ScreenShell>
  );
}

export function MapWebScreen() {
  return (
    <ScreenShell
      title="Map view"
      subtitle="A browser-safe map preview that keeps the same visual rhythm as the app while avoiding native-only dependencies on web."
      accent={PALETTE.mint}
    >
      <SectionCard title="Neighborhood activity map" subtitle="This preview mirrors the in-app map card and stays web compatible.">
        <View style={styles.mapFrame}>
          <View style={[styles.mapPin, { top: 40, left: '16%', backgroundColor: PALETTE.peach }]}>
            <Text style={styles.mapPinText}>Need</Text>
          </View>
          <View style={[styles.mapPin, { top: 112, left: '58%', backgroundColor: PALETTE.sky }]}>
            <Text style={styles.mapPinText}>Info</Text>
          </View>
          <View style={[styles.mapPin, { top: 168, left: '33%', backgroundColor: PALETTE.mint }]}>
            <Text style={styles.mapPinText}>Offer</Text>
          </View>
          <View style={styles.mapRadar} />
        </View>
      </SectionCard>

      <SectionCard title="Nearby focus" subtitle="The same product logic, simplified for web: close, current, actionable.">
        <View style={styles.listGap}>
          <LoopItem title="Portable air pump available" meta="1.4 mi • posted 9 min ago" type="Offer" />
          <LoopItem title="Need help carrying groceries upstairs" meta="0.3 mi • expires in 45 min" type="Need" />
          <LoopItem title="Local school fundraiser starts at noon" meta="2.0 mi • today" type="Info" />
        </View>
      </SectionCard>
    </ScreenShell>
  );
}

export function NewLoopWebScreen() {
  return (
    <ScreenShell
      title="Post a loop"
      subtitle="A web-safe composer that keeps the same tone as the mobile app: quick categories, short copy, and no clutter."
      accent={PALETTE.peach}
    >
      <SectionCard title="Create something useful" subtitle="Start with a focused category, then move to the app for live posting.">
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: PALETTE.peachSoft }]}>
            <Text style={styles.chipText}>Need</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: PALETTE.mintSoft }]}>
            <Text style={styles.chipText}>Offer</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: PALETTE.skySoft }]}>
            <Text style={styles.chipText}>Info</Text>
          </View>
        </View>
        <View style={styles.mockInput}>
          <Text style={styles.mockLabel}>Title</Text>
          <Text style={styles.mockValue}>Need a ladder for 30 minutes near Pine Ave</Text>
        </View>
        <View style={styles.mockInput}>
          <Text style={styles.mockLabel}>Details</Text>
          <Text style={styles.mockValue}>The web app previews the flow. The native app still handles live posting, chat, and proximity tools.</Text>
        </View>
        <ActionRow
          primaryLabel="Open LocalLoop site"
          primaryUrl={SITE_URL}
          secondaryLabel="Read privacy"
          secondaryUrl={PRIVACY_URL}
        />
      </SectionCard>

      <SectionCard title="Why this works" subtitle="The website keeps the product clear without pretending the browser has every native capability.">
        <Text style={styles.bodyText}>Use the web app as a discoverable front door, then drive deeper engagement to iOS and Android for live maps, alerts, and purchases.</Text>
      </SectionCard>
    </ScreenShell>
  );
}

export function LoopPlusWebScreen() {
  return (
    <ScreenShell
      title="Loop+"
      subtitle="This tab mirrors the locked premium screen from the app, including the App Review-safe subscription links."
      accent={PALETTE.butter}
    >
      <SectionCard title="Unlock Loop+" subtitle="All premium features in one clean space." tone="rgba(255, 255, 255, 0.94)">
        <View style={styles.listGap}>
          <Text style={styles.featureLine}>• All tab: everything in one premium feed</Text>
          <Text style={styles.featureLine}>• Free: giveaways and mutual aid</Text>
          <Text style={styles.featureLine}>• Hire: quick local help and tasks</Text>
          <Text style={styles.featureLine}>• Weekly boosts: spotlight up to 3 loops per week</Text>
        </View>
        <ActionRow
          primaryLabel="Get early access"
          primaryUrl={WAITLIST_URL}
          secondaryLabel="Open main site"
          secondaryUrl={SITE_URL}
        />
        <LegalLinks />
      </SectionCard>

      <SectionCard title="What Loop+ adds" subtitle="The website keeps the message consistent even when purchases stay inside the app.">
        <View style={styles.listGap}>
          <LoopItem title="Priority visibility for urgent asks" meta="Premium" type="Boost" />
          <LoopItem title="Extra sections like Hire and Free" meta="Premium" type="Access" />
          <LoopItem title="Live proximity alerts while driving" meta="App only" type="Alerts" />
        </View>
      </SectionCard>
    </ScreenShell>
  );
}

export function ProfileWebScreen() {
  return (
    <ScreenShell
      title="Profile"
      subtitle="A web profile surface with the same sections the app uses: trust, settings, legal, and a clear path back to the main site."
      accent={PALETTE.rose}
    >
      <SectionCard title="Your loop" subtitle="Keep your neighborhood profile fresh.">
        <View style={styles.profileRow}>
          <Image source={require('../assets/images/profile-bg.png')} style={styles.profileImage} />
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>Test Neighbor</Text>
            <Text style={styles.profileHandle}>Loop+ ready • 23 trust points</Text>
            <Text style={styles.profileBody}>Local Loop on the web mirrors the same bright personality as the app while keeping legal links one tap away.</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Legal" subtitle="The same required subscription references are present on web too.">
        <LegalLinks />
        <ActionRow
          primaryLabel="Open terms"
          primaryUrl={TERMS_URL}
          secondaryLabel="Open privacy"
          secondaryUrl={PRIVACY_URL}
        />
      </SectionCard>

      <SectionCard title="About Local Loop Hub" subtitle="A working web companion, not a throwaway landing page.">
        <Text style={styles.bodyText}>This web build gives you a real, branded experience in-browser today, while the native app continues handling maps, purchases, notifications, and device-level features.</Text>
      </SectionCard>
    </ScreenShell>
  );
}

export function ModalWebScreen() {
  return (
    <ScreenShell
      title="About this web app"
      subtitle="The Expo Router web shell now reflects the live Local Loop product instead of the starter template."
      accent={PALETTE.sky}
    >
      <SectionCard title="What changed" subtitle="This route replaces the default sample modal.">
        <Text style={styles.bodyText}>The website now matches the app&apos;s visual language: bright cards, airy gradients, Loop+ messaging, and functional terms and privacy links. It is intentionally browser-safe, so native-only modules stay out of the web path.</Text>
        <ActionRow
          primaryLabel="Open Local Loop"
          primaryUrl={SITE_URL}
          secondaryLabel="Join waitlist"
          secondaryUrl={WAITLIST_URL}
        />
      </SectionCard>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f6fbff',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 16,
  },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbA: {
    width: 210,
    height: 210,
    top: 10,
    right: -40,
  },
  orbB: {
    width: 260,
    height: 260,
    bottom: 180,
    left: -80,
  },
  orbC: {
    width: 140,
    height: 140,
    top: 280,
    right: 40,
  },
  hero: {
    padding: 18,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: PALETTE.line,
    shadowColor: PALETTE.shadow,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  brand: {
    color: PALETTE.sky,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 30,
    lineHeight: 34,
    color: PALETTE.ink,
    fontWeight: '900',
    fontFamily: 'Georgia',
  },
  heroSubtitle: {
    marginTop: 10,
    color: PALETTE.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Trebuchet MS',
  },
  heroPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.skySoft,
  },
  heroPillText: {
    color: PALETTE.sky,
    fontWeight: '800',
    fontSize: 12,
  },
  card: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PALETTE.line,
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    gap: 12,
  },
  cardTitle: {
    fontSize: 22,
    lineHeight: 26,
    color: PALETTE.ink,
    fontWeight: '900',
    fontFamily: 'Georgia',
  },
  cardSubtitle: {
    color: PALETTE.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Trebuchet MS',
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 90,
    padding: 12,
    borderRadius: 18,
    minWidth: 96,
  },
  statValue: {
    fontSize: 24,
    color: PALETTE.ink,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: PALETTE.muted,
    fontWeight: '700',
  },
  listGap: {
    gap: 10,
  },
  loopItem: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.line,
    backgroundColor: 'rgba(255,255,255,0.84)',
    gap: 6,
  },
  loopHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  loopType: {
    color: PALETTE.sky,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  loopMeta: {
    color: PALETTE.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  loopTitle: {
    color: PALETTE.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  buttonPrimary: {
    backgroundColor: PALETTE.peach,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontWeight: '900',
  },
  buttonSecondary: {
    backgroundColor: PALETTE.skySoft,
  },
  buttonSecondaryText: {
    color: PALETTE.sky,
    fontWeight: '900',
  },
  legalWrap: {
    gap: 8,
    paddingTop: 4,
  },
  legalLabel: {
    color: PALETTE.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legalLink: {
    color: PALETTE.sky,
    fontSize: 13,
    fontWeight: '800',
  },
  mapFrame: {
    height: 250,
    borderRadius: 22,
    backgroundColor: '#eef7ff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79, 140, 255, 0.14)',
  },
  mapPin: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  mapPinText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  mapRadar: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    borderWidth: 14,
    borderColor: 'rgba(72, 194, 169, 0.10)',
    top: 46,
    left: '34%',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: PALETTE.ink,
    fontWeight: '800',
    fontSize: 12,
  },
  mockInput: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PALETTE.line,
    gap: 6,
  },
  mockLabel: {
    color: PALETTE.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mockValue: {
    color: PALETTE.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  bodyText: {
    color: PALETTE.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Trebuchet MS',
  },
  featureLine: {
    color: PALETTE.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 22,
  },
  profileMeta: {
    flex: 1,
    minWidth: 220,
    gap: 6,
  },
  profileName: {
    fontSize: 22,
    color: PALETTE.ink,
    fontWeight: '900',
    fontFamily: 'Georgia',
  },
  profileHandle: {
    color: PALETTE.sky,
    fontWeight: '800',
  },
  profileBody: {
    color: PALETTE.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Trebuchet MS',
  },
});
