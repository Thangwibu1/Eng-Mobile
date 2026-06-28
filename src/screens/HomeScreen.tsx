import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Award, BookOpen, Bookmark, Flame, Layers, Volume2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import { api, unwrap } from '../api';
import { useAuth } from '../auth-context';
import { Button, Card, Pill } from '../components';
import { colors, fonts } from '../theme';

const bunny = require('../../assets/bunny_reading.png');

interface HomeScreenProps {
  navigation: any;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => unwrap<any>(await api.get('/me/stats')),
    enabled: !!user,
  });

  const { data: streak } = useQuery({
    queryKey: ['streak'],
    queryFn: async () => unwrap<any>(await api.get('/me/streak')),
    enabled: !!user,
  });

  const recent = stats?.recentWords?.length
    ? stats.recentWords
    : [
        { text: 'curious', type: 'adjective' },
        { text: 'explore', type: 'verb' },
        { text: 'journey', type: 'noun' },
        { text: 'delicious', type: 'adjective' },
      ];

  const currentStreak = streak?.currentStreak ?? stats?.readingStreak ?? 0;

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      {user && (
        <Card style={styles.streakCard}>
          <View style={styles.streakTop}>
            <View style={styles.flameCircle}>
              <Flame size={26} color={colors.amber} fill={colors.amber} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.eyebrow}>YOUR STREAK</Text>
              <Text style={styles.streakTitle}>
                {currentStreak > 0 ? "You're on fire! 🔥" : "Start your streak! 🎯"}
              </Text>
              <Text style={styles.mutedText}>
                {currentStreak} day streak • Best: {streak?.bestStreak ?? 0} days
              </Text>
            </View>
          </View>

          {streak?.week?.length ? (
            <View style={styles.weekContainer}>
              {streak.week.map((d: any, i: number) => (
                <View key={d.date || i} style={styles.dayColumn}>
                  <View
                    style={[
                      styles.dayCircle,
                      d.active && styles.dayCircleActive,
                      d.label === 'Today' && !d.active && styles.dayCircleToday,
                    ]}
                  >
                    <Text style={[styles.dayMark, d.active && styles.activeDayMark]}>
                      {d.active ? '✓' : i + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.dayLabel,
                      d.label === 'Today' && styles.todayLabel,
                    ]}
                  >
                    {d.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      )}

      {/* Hero Welcome Section */}
      <View style={styles.heroCard}>
        <Image source={bunny} style={styles.bunnyImage} />
        <View style={styles.flexOne}>
          <Text style={styles.greetingText}>
            Good morning, {user?.displayName || user?.username || 'Alex'}! ☀️
          </Text>
          <Text style={styles.heroTitle}>
            Let's make today a great day to learn English!
          </Text>
          <Text style={styles.mutedText}>
            Study a little every day, and you'll go far.
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title="Continue Learning"
              onPress={() => navigation.navigate('Readings')}
            />
            <Button
              title="Study Plan"
              variant="white"
              onPress={() => navigation.navigate('Flashcards')}
            />
          </View>
        </View>
      </View>

      {/* Daily Goal Progress */}
      <Card style={styles.goalCard}>
        <View style={styles.flexOne}>
          <Text style={styles.eyebrow}>TODAY'S GOAL</Text>
          <Text>
            <Text style={styles.goalNumber}>{currentStreak ? 15 : 0}</Text>
            <Text style={styles.mutedText}> / 20 min</Text>
          </Text>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: currentStreak ? '75%' : '3%' },
              ]}
            />
          </View>
        </View>
        <View style={styles.awardCircle}>
          <Award size={27} color={colors.amber} />
        </View>
      </Card>

      <Text style={styles.sectionHeader}>Your progress</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.metricsContainer}
      >
        <MetricCard
          icon={<Bookmark size={22} color={colors.amber} />}
          bg="#FEF9E6"
          label="Vocabulary"
          value={stats?.vocabularyLearned ?? 0}
          note={`+${stats?.vocabularyWeeklyIncrement ?? 0} this week`}
        />
        <MetricCard
          icon={<BookOpen size={22} color={colors.blue} />}
          bg={colors.blueSoft}
          label="Reading Streak"
          value={`${currentStreak} days`}
          note="Keep it up! 🔥"
        />
        <MetricCard
          icon={<Layers size={22} color={colors.pinkDark} />}
          bg={colors.pinkSoft}
          label="Flashcard Reviews"
          value={stats?.flashcardReviewsTotal ?? 0}
          note={`+${stats?.flashcardReviewsToday ?? 0} today`}
        />
      </ScrollView>

      {/* Recent Words Card */}
      <Card>
        <View style={styles.headerBetween}>
          <View style={styles.headingTitleRow}>
            <View style={[styles.roundIconBox, styles.pinkIconBg]}>
              <Bookmark size={19} color={colors.pinkDark} />
            </View>
            <Text style={styles.cardTitle}>Recent Words</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Dictionary')}>
            <Text style={styles.linkText}>View all</Text>
          </Pressable>
        </View>
        
        <View style={styles.wordGrid}>
          {recent.slice(0, 4).map((word: any) => (
            <Pressable
              key={word.text}
              onPress={() => Speech.speak(word.text, { language: 'en-US' })}
              style={styles.wordCard}
            >
              <View>
                <Text style={styles.wordText}>{word.text}</Text>
                <Text style={styles.wordType}>{word.type}</Text>
              </View>
              <Volume2 size={16} color={colors.pink} />
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Featured Reading Card */}
      <Card style={styles.featuredReadingCard}>
        <View style={styles.headingTitleRow}>
          <View style={[styles.roundIconBox, styles.blueIconBg]}>
            <BookOpen size={19} color={colors.blue} />
          </View>
          <Text style={styles.cardTitle}>Featured Reading</Text>
        </View>
        <Text style={styles.articleTitle}>A Day in the Life of a Traveler</Text>
        <Pill color={colors.pinkDark} background={colors.pinkSoft}>Elementary</Pill>
        <Text style={styles.articleExcerpt}>
          Every morning, I pack my bag and set off on a new adventure. I love to explore new places, try delicious food, and meet interesting people along the journey.
        </Text>
        <Button
          title="Continue Reading  ›"
          variant="blue"
          onPress={() => navigation.navigate('Readings')}
        />
      </Card>
    </ScrollView>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string | number;
  note: string;
}

function MetricCard({ icon, bg, label, value, note }: MetricCardProps) {
  return (
    <Card style={styles.metricCard}>
      <View style={[styles.metricIconContainer, { backgroundColor: bg }]}>
        {icon}
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricNote}>{note}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 110,
    gap: 17,
  },
  flexOne: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: colors.pinkSoft,
    borderRadius: 28,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FAD2E2',
  },
  bunnyImage: {
    width: 105,
    height: 125,
    resizeMode: 'contain',
  },
  greetingText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.pinkDark,
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 25,
    color: colors.ink,
    marginVertical: 5,
  },
  mutedText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.secondary,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 13,
  },
  streakCard: {
    gap: 14,
    backgroundColor: '#FFFDF4',
  },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flameCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3D4',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: colors.pink,
  },
  dayMark: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
  },
  activeDayMark: {
    color: '#A16207',
  },
  dayLabel: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: colors.muted,
  },
  todayLabel: {
    color: colors.pinkDark,
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.muted,
  },
  streakTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.ink,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  goalNumber: {
    fontFamily: fonts.bold,
    fontSize: 25,
    color: colors.pinkDark,
  },
  progressBarTrack: {
    height: 9,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginTop: 7,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.pink,
    borderRadius: 9,
  },
  awardCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.ink,
    marginTop: 4,
  },
  metricsContainer: {
    gap: 12,
  },
  metricCard: {
    width: 180,
    padding: 16,
  },
  metricIconContainer: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.secondary,
  },
  metricValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.ink,
    marginVertical: 2,
  },
  metricNote: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.pinkDark,
  },
  headerBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },
  roundIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinkIconBg: {
    backgroundColor: colors.pinkSoft,
  },
  blueIconBg: {
    backgroundColor: colors.blueSoft,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
  },
  linkText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.blue,
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  wordCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
  },
  wordType: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: colors.muted,
    fontStyle: 'italic',
  },
  featuredReadingCard: {
    backgroundColor: '#F1F9FF',
  },
  articleTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 8,
  },
  articleExcerpt: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 20,
    marginVertical: 14,
  },
});
