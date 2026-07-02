import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Bookmark, CheckCircle2, Layers, Search, Sparkles, Volume2 } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { api, unwrap } from '../api';
import { useAuth } from '../auth-context';
import { Button, Card, Empty, Loading, Pill, SearchBox } from '../components';
import { colors, fonts } from '../theme';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const getMeaningVi = (item: any) =>
  item?.meanings?.find((meaning: any) => meaning?.meaningVi?.trim())?.meaningVi?.trim()
  || item?.meaningVi?.trim()
  || '';

const getMeaningEn = (item: any) =>
  item?.meanings?.find((meaning: any) => meaning?.meaningEn?.trim())?.meaningEn?.trim()
  || item?.meaningEn?.trim()
  || '';

const getSynonyms = (item: any): string[] => {
  const fromMeanings = item?.meanings?.flatMap((m: any) => m?.synonyms || []) || [];
  const direct = item?.synonyms || [];
  return [...new Set([...fromMeanings, ...direct])].filter(Boolean).slice(0, 6) as string[];
};

const getAntonyms = (item: any): string[] => {
  const fromMeanings = item?.meanings?.flatMap((m: any) => m?.antonyms || []) || [];
  const direct = item?.antonyms || [];
  return [...new Set([...fromMeanings, ...direct])].filter(Boolean).slice(0, 6) as string[];
};

interface LookupScreenProps {
  navigation: any;
}

export function LookupScreen({ navigation }: LookupScreenProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [result, setResult] = useState<any>(null);
  const [similar, setSimilar] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [deckId, setDeckId] = useState('');
  const debouncedQuery = useDebouncedValue(query, 450);
  const searchSequence = useRef(0);
  const skipNextDebouncedSearch = useRef(false);
  const selectedVocabularyId = useRef<string | null>(null);

  const { data: decks } = useQuery({
    queryKey: ['decks'],
    queryFn: async () => unwrap<any>(await api.get('/flashcard-decks')),
    enabled: !!user,
  });

  const performSearch = useCallback(async (rawQuery: string) => {
    const word = rawQuery.trim();
    if (!word) return;

    const sequence = ++searchSequence.current;
    selectedVocabularyId.current = null;
    setSubmitted(word);
    setLoading(true);
    setResult(null);
    setSimilar([]);
    setSuggestions([]);

    try {
      const searchData = unwrap<any>(
        await api.get('/vocabularies/search', {
          params: { q: word, limit: 10 },
        })
      );
      if (sequence !== searchSequence.current) return;

      const items = searchData?.results || [];
      setSuggestions(searchData?.suggestions || []);
      // Keep all matches in the list until the user explicitly selects one.
      setSimilar(items);
    } catch (e: any) {
      if (sequence === searchSequence.current) {
        Alert.alert('Search failed', e.userMessage);
      }
    } finally {
      if (sequence === searchSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipNextDebouncedSearch.current) {
      skipNextDebouncedSearch.current = false;
      return;
    }

    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      searchSequence.current += 1;
      setSubmitted('');
      setResult(null);
      setSimilar([]);
      setSuggestions([]);
      setLoading(false);
      return;
    }
    performSearch(trimmed);
  }, [debouncedQuery, performSearch]);

  const runSearch = () => performSearch(query);

  const ai = useMutation({
    mutationFn: async () =>
      unwrap<any>(await api.post('/vocabularies/ai-define', { text: submitted })),
    onSuccess: setResult,
    onError: (e: any) => Alert.alert('AI definition failed', e.userMessage),
  });

  const vocabAction = useMutation({
    mutationFn: async (path: string) =>
      api.post(`/vocabularies/${result.id || result._id}/${path}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocabularies'] }),
    onError: (e: any) => Alert.alert('Action failed', e.userMessage),
  });

  const add = useMutation({
    mutationFn: async () =>
      api.post(`/flashcard-decks/${deckId}/cards`, {
        vocabularyId: result.id || result._id,
      }),
    onSuccess: () => {
      Alert.alert('Added', 'Vocabulary added to your deck.');
      qc.invalidateQueries({ queryKey: ['decks'] });
    },
    onError: (e: any) => Alert.alert('Cannot add card', e.userMessage),
  });

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <ArrowLeft size={18} color={colors.secondary} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.titleRow}>
        <View style={styles.searchIcon}>
          <Search size={22} color={colors.white} />
        </View>
        <View>
          <Text style={styles.title}>Vocabulary Lookup</Text>
          <Text style={styles.subtitle}>Search any word or phrase</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.flexOne}>
          <SearchBox
            autoFocus
            placeholder="e.g. curious, vertical farming..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={runSearch}
            returnKeyType="search"
          />
        </View>
        <Button title="Search" variant="blue" onPress={runSearch} />
      </View>

      {loading ? (
        <Loading label="Searching dictionary database..." />
      ) : result ? (
        <ResultCard
          v={result}
          user={user}
          decks={decks?.myDecks || []}
          deckId={deckId}
          setDeckId={setDeckId}
          onAction={(x: string) => vocabAction.mutate(x)}
          onAdd={() => add.mutate()}
          onOpen={() =>
            navigation.navigate('VocabularyDetail', {
              id: result.id || result._id,
            })
          }
          onSearch={(word: string) => {
            skipNextDebouncedSearch.current = true;
            setQuery(word);
            performSearch(word);
          }}
        />
      ) : submitted ? (
        <>
          {similar.length ? (
            <>
              <Text style={styles.section}>Search results</Text>
              {similar.map((v) => {
                const meaningVi = getMeaningVi(v);
                return (
                <Pressable
                  key={v.id || v._id}
                  onPress={async () => {
                    const vocabularyId = v.id || v._id;
                    selectedVocabularyId.current = vocabularyId;
                    if (v.text !== query) {
                      skipNextDebouncedSearch.current = true;
                      setQuery(v.text);
                    }
                    setSubmitted(v.text);
                    setResult(v);
                    setSimilar([]);
                    setSuggestions([]);
                    try {
                      const detail = unwrap<any>(
                        await api.get(`/vocabularies/${vocabularyId}`)
                      );
                      if (selectedVocabularyId.current !== vocabularyId) return;
                      setResult(detail?.vocabulary || detail || v);
                    } catch {
                      // Keep the search result as a fallback.
                    }
                  }}
                >
                  <Card style={styles.cardMargin}>
                    <View style={styles.between}>
                      <Text style={styles.wordSmall}>{v.text}</Text>
                      <MatchBadge matchType={v.matchType} />
                    </View>
                    {meaningVi ? <Text style={styles.meaning}>{meaningVi}</Text> : null}
                  </Card>
                </Pressable>
                );
              })}
            </>
          ) : (
            <>
              <Empty
                title={`“${submitted}” isn't in the dictionary`}
                text="Let AI draft a definition for you."
              />
              {suggestions.length ? (
                <View style={styles.suggestionBox}>
                  <Text style={styles.suggestionLabel}>DID YOU MEAN?</Text>
                  <View style={styles.suggestionList}>
                    {suggestions.map((suggestion) => (
                      <Pressable
                        key={suggestion}
                        style={styles.suggestionChip}
                        onPress={() => {
                          if (suggestion !== query) {
                            skipNextDebouncedSearch.current = true;
                            setQuery(suggestion);
                          }
                          performSearch(suggestion);
                        }}
                      >
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}

          {!similar.length ? (
            <Button
              title={ai.isPending ? 'AI is defining...' : 'Define with AI'}
              icon={<Sparkles size={17} color={colors.white} />}
              disabled={ai.isPending}
              onPress={() => ai.mutate()}
            />
          ) : null}
        </>
      ) : (
        <Card style={styles.welcome}>
          <Text style={styles.emoji}>🔎</Text>
          <Text style={styles.welcomeTitle}>What would you like to learn?</Text>
          <Text style={styles.subtitle}>
            Type a word above, then select a result to see meanings, examples,
            learning actions, and deck tools.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

function ResultCard({
  v,
  user,
  decks,
  deckId,
  setDeckId,
  onAction,
  onAdd,
  onOpen,
  onSearch,
}: any) {
  const m = v.meanings?.[0] || {};
  const meaningVi = getMeaningVi(v);
  const meaningEn = getMeaningEn(v);
  
  return (
    <Card>
      <View style={styles.between}>
        <View>
          <Text style={styles.word}>{v.text}</Text>
          {v.phonetic ? <Text style={styles.phonetic}>{v.phonetic}</Text> : null}
        </View>
        <Pressable
          style={styles.audio}
          onPress={() => Speech.speak(v.text, { language: 'en-US' })}
        >
          <Volume2 size={22} color={colors.blue} />
        </Pressable>
      </View>

      <View style={styles.tags}>
        <Pill color={colors.blue} background={colors.blueSoft}>
          {(v.type || 'word').replace('_', ' ')}
        </Pill>
        {v.level ? <Pill>{v.level}</Pill> : null}
        {v.partOfSpeech ? (
          <Pill color={colors.secondary} background="#F1F5F9">
            {v.partOfSpeech}
          </Pill>
        ) : null}
      </View>

      {meaningVi || meaningEn ? <View style={styles.divider} /> : null}

      {meaningVi ? <Text style={styles.meaningBig}>{meaningVi}</Text> : null}

      {meaningEn ? <Text style={styles.meaningEn}>{meaningEn}</Text> : null}
      
      {m.examples?.[0] || v.exampleEn ? (
        <View style={styles.example}>
          <Text style={styles.exampleEn}>
            “{m.examples?.[0]?.exampleEn || v.exampleEn}”
          </Text>
          <Text style={styles.meaningEn}>
            {m.examples?.[0]?.exampleVi || v.exampleVi}
          </Text>
        </View>
      ) : null}

      {getSynonyms(v).length > 0 && (
        <View style={styles.synSection}>
          <Text style={styles.synLabel}>SYNONYMS</Text>
          <View style={styles.chipRow}>
            {getSynonyms(v).map((word: string) => (
              <Pressable
                key={word}
                onPress={() => onSearch?.(word)}
                style={styles.synChip}
              >
                <Text style={styles.synChipText}>{word}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {getAntonyms(v).length > 0 && (
        <View style={styles.synSection}>
          <Text style={styles.synLabel}>ANTONYMS</Text>
          <View style={styles.chipRow}>
            {getAntonyms(v).map((word: string) => (
              <Pressable
                key={word}
                onPress={() => onSearch?.(word)}
                style={styles.antChip}
              >
                <Text style={styles.antChipText}>{word}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {user ? (
        <>
          <View style={styles.actions}>
            <Button
              title="Save"
              variant="soft"
              icon={<Bookmark size={16} color={colors.pinkDark} />}
              onPress={() => onAction('save')}
            />
            <Button
              title="Known"
              variant="white"
              icon={<CheckCircle2 size={16} color={colors.blue} />}
              onPress={() => onAction('mark-known')}
            />
            <Button
              title="Difficult"
              variant="white"
              icon={<AlertTriangle size={16} color={colors.amber} />}
              onPress={() => onAction('mark-difficult')}
            />
          </View>
          
          {decks.length ? (
            <>
              <Text style={styles.deckLabel}>ADD TO FLASHCARD DECK</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.deckContainer}
              >
                {decks.map((d: any) => (
                  <Pressable
                    key={d.id || d._id}
                    onPress={() => setDeckId(d.id || d._id)}
                    style={[
                      styles.deck,
                      deckId === (d.id || d._id) && styles.deckOn,
                    ]}
                  >
                    <Layers
                      size={14}
                      color={
                        deckId === (d.id || d._id)
                          ? colors.white
                          : colors.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.deckText,
                        deckId === (d.id || d._id) && { color: colors.white },
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
                disabled={!deckId}
                onPress={onAdd}
              />
            </>
          ) : null}
        </>
      ) : null}

      <Button
        title="View full details"
        variant="white"
        style={styles.openBtn}
        onPress={onOpen}
      />
    </Card>
  );
}

function MatchBadge({ matchType }: { matchType?: 'exact' | 'prefix' | 'fuzzy' }) {
  if (!matchType) return null;
  const config = {
    exact: { label: 'Exact', color: colors.green, background: '#ECFDF5' },
    prefix: { label: 'Prefix', color: colors.blue, background: colors.blueSoft },
    fuzzy: { label: 'Similar', color: colors.amber, background: '#FFF8E6' },
  }[matchType];
  return (
    <Pill color={config.color} background={config.background}>
      {config.label}
    </Pill>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 70,
  },
  flexOne: {
    flex: 1,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  backText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.secondary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  searchIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  welcome: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emoji: {
    fontSize: 42,
  },
  welcomeTitle: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.ink,
    marginVertical: 8,
  },
  section: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.ink,
    marginVertical: 13,
  },
  cardMargin: {
    marginBottom: 10,
  },
  wordSmall: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.pinkDark,
  },
  meaning: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
  suggestionBox: {
    backgroundColor: '#FFF8E6',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  suggestionLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.amber,
    letterSpacing: 1,
    marginBottom: 8,
  },
  suggestionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  suggestionChip: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#A16207',
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  word: {
    fontFamily: fonts.bold,
    fontSize: 34,
    color: colors.pinkDark,
  },
  phonetic: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
  },
  audio: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tags: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
    marginTop: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEF2F6',
    marginVertical: 18,
  },
  meaningBig: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.ink,
    lineHeight: 25,
  },
  meaningEn: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  example: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    padding: 13,
    marginTop: 14,
  },
  exampleEn: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginVertical: 17,
  },
  deckLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.secondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  deckContainer: {
    gap: 7,
  },
  deck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  deckOn: {
    backgroundColor: colors.pink,
  },
  deckText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.secondary,
  },
  openBtn: {
    marginTop: 14,
  },
  synSection: {
    marginTop: 14,
  },
  synLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.secondary,
    letterSpacing: 1,
    marginBottom: 7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  synChip: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  synChipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.blue,
  },
  antChip: {
    backgroundColor: '#FFF1F2',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  antChipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#F43F5E',
  },
});
