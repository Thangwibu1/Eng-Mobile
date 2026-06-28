import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, ChevronRight } from 'lucide-react-native';
import { api, unwrap } from '../api';
import { Button, Card, Empty, Loading, Pill, ScreenTitle, SearchBox } from '../components';
import { colors, fonts } from '../theme';
import { useAuth } from '../auth-context';

const types = [
  ['', 'All'],
  ['single_word', 'Words'],
  ['collocation', 'Collocations'],
  ['phrasal_verb', 'Phrasal verbs'],
  ['idiom', 'Idioms'],
];

const levels = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface DictionaryScreenProps {
  navigation: any;
}

export function DictionaryScreen({ navigation }: DictionaryScreenProps) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [level, setLevel] = useState('');
  const [topicId, setTopicId] = useState('');
  const [page, setPage] = useState(1);

  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => unwrap<any[]>(await api.get('/topics')),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vocabularies', search, type, level, topicId, page],
    queryFn: async () =>
      unwrap<any>(
        await api.get('/vocabularies', {
          params: {
            search: search || undefined,
            type: type || undefined,
            level: level || undefined,
            topicId: topicId || undefined,
            page,
            limit: 12,
          },
        })
      ),
  });

  const items = data?.items || data || [];

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenTitle
        title="Dictionary"
        subtitle="Explore words, phrases, and expressions for every level."
      />
      <SearchBox
        placeholder="Search vocabulary..."
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <Text style={styles.filterLabel}>VOCABULARY TYPE</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {types.map(([v, l]) => (
          <Chip
            key={v}
            text={l}
            active={type === v}
            color={colors.pink}
            onPress={() => {
              setType(v);
              setPage(1);
            }}
          />
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>CEFR LEVEL</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {levels.map((v) => (
          <Chip
            key={v}
            text={v || 'All Levels'}
            active={level === v}
            color={colors.blue}
            onPress={() => {
              setLevel(v);
              setPage(1);
            }}
          />
        ))}
      </ScrollView>

      {topics?.length ? (
        <>
          <Text style={styles.filterLabel}>TOPIC</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              text="All Topics"
              active={!topicId}
              color={colors.green}
              onPress={() => {
                setTopicId('');
                setPage(1);
              }}
            />
            {topics.map((t: any) => (
              <Chip
                key={t.id}
                text={t.name}
                active={topicId === t.id}
                color={colors.green}
                onPress={() => {
                  setTopicId(t.id);
                  setPage(1);
                }}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.resultHead}>
        <Text style={styles.resultTitle}>
          {data?.total ?? items.length} results
        </Text>
        <Text style={styles.muted}>
          Page {data?.page || page} / {data?.totalPages || 1}
        </Text>
      </View>

      {isLoading ? (
        <Loading label="Searching dictionary..." />
      ) : items.length ? (
        items.map((v: any) => (
          <VocabCard
            key={v.id || v._id}
            v={v}
            onPress={() =>
              navigation.navigate('VocabularyDetail', { id: v.id || v._id })
            }
            onLogin={() => navigation.navigate('Login')}
          />
        ))
      ) : (
        <Empty
          title="No matching words"
          text="Try changing your search or filters."
        />
      )}

      {(data?.totalPages || 1) > 1 ? (
        <View style={styles.pagination}>
          <Button
            title="‹ Previous"
            variant="white"
            disabled={page <= 1}
            onPress={() => setPage((p) => p - 1)}
          />
          <Button
            title="Next ›"
            variant="blue"
            disabled={page >= data.totalPages}
            onPress={() => setPage((p) => p + 1)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

interface ChipProps {
  text: string;
  active: boolean;
  color: string;
  onPress: () => void;
}

function Chip({ text, active, color, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? color : '#F1F5F9' },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? colors.white : colors.secondary },
        ]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

interface VocabCardProps {
  v: any;
  onPress: () => void;
  onLogin: () => void;
}

function VocabCard({ v, onPress, onLogin }: VocabCardProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  const save = useMutation({
    mutationFn: () => api.post(`/vocabularies/${v.id || v._id}/save`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocabularies'] }),
    onError: (e: any) => Alert.alert('Cannot save', e.userMessage),
  });

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.cardMargin}>
        <View style={styles.between}>
          <Pill
            color={v.type === 'idiom' ? colors.pinkDark : colors.blue}
            background={v.type === 'idiom' ? colors.pinkSoft : colors.blueSoft}
          >
            {(v.type || 'word').replace('_', ' ')}
          </Pill>
          {v.level ? (
            <Pill color={colors.green} background="#ECFDF5">
              {v.level}
            </Pill>
          ) : null}
        </View>
        <Text style={styles.word}>{v.text}</Text>
        {v.phonetic ? <Text style={styles.phonetic}>{v.phonetic}</Text> : null}
        <Text style={styles.meaning}>
          {v.meanings?.[0]?.meaningVi || v.meaningVi || 'Chưa có nghĩa'}
        </Text>
        {v.meanings?.[0]?.meaningEn ? (
          <Text style={styles.meaningEn}>{v.meanings[0].meaningEn}</Text>
        ) : null}
        
        <View style={styles.cardFoot}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              user ? save.mutate() : onLogin();
            }}
            style={styles.save}
          >
            <Bookmark
              size={17}
              color={v.userStatus === 'saved' ? colors.pink : colors.muted}
              fill={v.userStatus === 'saved' ? colors.pink : 'transparent'}
            />
            <Text style={styles.saveText}>SAVE</Text>
          </Pressable>
          <View style={styles.detail}>
            <Text style={styles.detailText}>DETAILS</Text>
            <ChevronRight size={16} color={colors.blue} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 110,
  },
  cardMargin: {
    marginBottom: 12,
  },
  chips: {
    gap: 8,
    paddingBottom: 3,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  filterLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.secondary,
    marginTop: 17,
    marginBottom: 9,
  },
  resultHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  resultTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.ink,
  },
  muted: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.muted,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  word: {
    fontFamily: fonts.bold,
    fontSize: 23,
    color: colors.ink,
    marginTop: 16,
  },
  phonetic: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  meaning: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.ink,
    marginTop: 12,
    lineHeight: 21,
  },
  meaningEn: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 3,
  },
  cardFoot: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 17,
    paddingTop: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  save: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  saveText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.secondary,
    letterSpacing: 0.8,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.blue,
    letterSpacing: 0.8,
  },
});
