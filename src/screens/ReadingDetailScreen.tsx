import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Bookmark, CheckCircle2, Eye, Layers, Clock } from 'lucide-react-native';
import { api, unwrap } from '../api';
import { useAuth } from '../auth-context';
import { Button, Card, Empty, Loading, Pill } from '../components';
import { colors, fonts } from '../theme';
import { AdminReadingAiPanel } from './AdminReadingAiPanel';

interface ReadingDetailScreenProps {
  route: any;
  navigation: any;
}

export function ReadingDetailScreen({ route, navigation }: ReadingDetailScreenProps) {
  const { id } = route.params;
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<any>(null);
  const [selectedDeck, setSelectedDeck] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reading', id],
    queryFn: async () => unwrap<any>(await api.get(`/readings/${id}`)),
  });

  const complete = useMutation({
    mutationFn: async () =>
      api.post(`/readings/${id}/progress`, {
        readingId: id,
        progressPercent: 100,
        lastPositionIndex: data?.reading?.spans?.length || 0,
      }),
    onSuccess: () => setDone(true),
    onError: (e: any) => Alert.alert('Oops', e.userMessage),
  });

  const { data: decks } = useQuery({
    queryKey: ['decks'],
    queryFn: async () => unwrap<any>(await api.get('/flashcard-decks')),
    enabled: !!user,
  });

  const wordAction = useMutation({
    mutationFn: (path: string) =>
      api.post(`/vocabularies/${picked.id || picked._id}/${path}`),
    onSuccess: () => Alert.alert('Updated', 'Your vocabulary progress was updated.'),
    onError: (e: any) => Alert.alert('Action failed', e.userMessage),
  });

  const addDeck = useMutation({
    mutationFn: () =>
      api.post(`/flashcard-decks/${selectedDeck}/cards`, {
        vocabularyId: picked.id || picked._id,
      }),
    onSuccess: () => Alert.alert('Added', 'Word added to your flashcard deck.'),
    onError: (e: any) => Alert.alert('Cannot add', e.userMessage),
  });

  if (isLoading) return <Loading />;
  if (!data) return <Empty title="Reading not found" />;

  const r = data.reading || data;
  const vocabularyMap = data.vocabularyMap || {};
  const completed = data.userProgress?.completedAt || done;

  const tapWord = async (span: any, v: any) => {
    setPicked(v);
    if (user) {
      api.post(`/readings/${id}/lookups`, {
        readingId: id,
        vocabularyId: v.id || v._id,
        readingSpanId: span._id || String(span.orderIndex),
        lookupText: span.text,
      }).catch(() => {});
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <ArrowLeft size={18} color={colors.secondary} />
        <Text style={styles.backText}>Back to Readings</Text>
      </Pressable>
      
      <View style={styles.head}>
        <View style={styles.meta}>
          {r.level ? <Pill>{r.level}</Pill> : null}
          <Clock size={14} color={colors.secondary} />
          <Text style={styles.metaText}>
            {r.estimatedReadingTimeMinutes || 5} min read
          </Text>
          {data.userProgress?.lookupCount ? (
            <>
              <Eye size={14} color={colors.blue} />
              <Text style={[styles.metaText, { color: colors.blue }]}>
                {data.userProgress.lookupCount} lookups
              </Text>
            </>
          ) : null}
        </View>
        <Text style={styles.detailTitle}>{r.title}</Text>
        {r.subtitle ? <Text style={styles.detailSubtitle}>{r.subtitle}</Text> : null}
      </View>

      <Card style={styles.article}>
        <Text style={styles.articleText}>
          {[...(r.spans || [])]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((span: any, i: number) => {
              const v = span.vocabularyId ? vocabularyMap[span.vocabularyId] : null;
              return v && span.isClickable ? (
                <Text
                  key={i}
                  onPress={() => tapWord(span, v)}
                  style={[
                    styles.highlight,
                    {
                      backgroundColor:
                        v.type === 'idiom'
                          ? colors.pinkSoft
                          : v.type === 'collocation'
                          ? colors.cream
                          : colors.blueSoft,
                    },
                  ]}
                >
                  {span.text}
                </Text>
              ) : (
                <Text key={i}>{span.text}</Text>
              );
            })}
        </Text>
      </Card>

      {picked ? (
        <Card style={styles.lookup}>
          <View style={styles.between}>
            <View>
              <Text style={styles.lookupWord}>{picked.text}</Text>
              {picked.phonetic ? (
                <Text style={styles.phonetic}>{picked.phonetic}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => setPicked(null)}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.lookupMeaning}>
            {picked.meanings?.[0]?.meaningVi || picked.meaningVi}
          </Text>
          {picked.meanings?.[0]?.meaningEn ? (
            <Text style={styles.detailSubtitle}>{picked.meanings[0].meaningEn}</Text>
          ) : null}

          {user ? (
            <>
              <View style={styles.wordActions}>
                <Button
                  title="Save"
                  variant="soft"
                  icon={<Bookmark size={14} color={colors.pinkDark} />}
                  onPress={() => wordAction.mutate('save')}
                />
                <Button
                  title="Known"
                  variant="white"
                  icon={<CheckCircle2 size={14} color={colors.blue} />}
                  onPress={() => wordAction.mutate('mark-known')}
                />
                <Button
                  title="Hard"
                  variant="white"
                  icon={<AlertTriangle size={14} color={colors.amber} />}
                  onPress={() => wordAction.mutate('mark-difficult')}
                />
              </View>

              {decks?.myDecks?.length ? (
                <>
                  <Text style={styles.deckLabel}>ADD TO FLASHCARD DECK</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.deckContainer}
                  >
                    {decks.myDecks.map((d: any) => (
                      <Pressable
                        key={d.id || d._id}
                        onPress={() => setSelectedDeck(d.id || d._id)}
                        style={[
                          styles.deckChip,
                          selectedDeck === (d.id || d._id) && styles.deckChipOn,
                        ]}
                      >
                        <Layers
                          size={13}
                          color={
                            selectedDeck === (d.id || d._id)
                              ? colors.white
                              : colors.secondary
                          }
                        />
                        <Text
                          style={[
                            styles.deckText,
                            selectedDeck === (d.id || d._id) && {
                              color: colors.white,
                            },
                          ]}
                        >
                          {d.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Button
                    title="Add to selected deck"
                    variant="blue"
                    disabled={!selectedDeck}
                    onPress={() => addDeck.mutate()}
                  />
                </>
              ) : null}
            </>
          ) : (
            <Text style={styles.loginHint}>
              Log in to save words or add them to decks.
            </Text>
          )}

          <Button
            title="Open dictionary entry"
            variant="white"
            onPress={() =>
              navigation.navigate('VocabularyDetail', {
                id: picked.id || picked._id,
              })
            }
          />
        </Card>
      ) : null}

      {user ? (
        <View style={styles.completedContainer}>
          {completed ? (
            <View style={styles.completed}>
              <CheckCircle2 size={20} color={colors.blue} />
              <Text style={styles.completedText}>Completed Reading!</Text>
            </View>
          ) : (
            <Button
              title="Mark as Completed"
              onPress={() => complete.mutate()}
              disabled={complete.isPending}
            />
          )}
        </View>
      ) : null}

      {user?.role === 'admin' ? (
        <AdminReadingAiPanel readingId={id} reading={r} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 110,
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.secondary,
  },
  back: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 18,
  },
  backText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.secondary,
  },
  head: {
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 22,
  },
  detailTitle: {
    fontFamily: fonts.bold,
    fontSize: 31,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -1,
    marginTop: 15,
    lineHeight: 38,
  },
  detailSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  article: {
    padding: 24,
  },
  articleText: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: colors.ink,
    lineHeight: 34,
    textAlign: 'justify',
  },
  highlight: {
    fontFamily: fonts.bold,
    color: colors.ink,
  },
  lookup: {
    marginTop: 15,
    borderColor: '#FAD2E2',
    gap: 12,
  },
  lookupWord: {
    fontFamily: fonts.bold,
    fontSize: 25,
    color: colors.pinkDark,
  },
  phonetic: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  lookupMeaning: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
    marginVertical: 12,
  },
  close: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.muted,
  },
  wordActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 13,
  },
  deckLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.secondary,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 7,
  },
  deckContainer: {
    gap: 6,
    marginBottom: 9,
  },
  deckChip: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  deckChipOn: {
    backgroundColor: colors.pink,
  },
  deckText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.secondary,
  },
  loginHint: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.secondary,
    textAlign: 'center',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  completedContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  completed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.blueSoft,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  completedText: {
    fontFamily: fonts.bold,
    color: colors.blue,
  },
});
