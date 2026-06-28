import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, Clock } from 'lucide-react-native';
import { api, unwrap } from '../api';
import { Button, Card, Empty, Loading, Pill, ScreenTitle, SearchBox } from '../components';
import { colors, fonts } from '../theme';

const levels = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface ReadingsScreenProps {
  navigation: any;
}

export function ReadingsScreen({ navigation }: ReadingsScreenProps) {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [topicId, setTopicId] = useState('');
  const [page, setPage] = useState(1);

  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => unwrap<any[]>(await api.get('/topics')),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['readings', search, level, topicId, page],
    queryFn: async () =>
      unwrap<any>(
        await api.get('/readings', {
          params: {
            search,
            level: level || undefined,
            topicId: topicId || undefined,
            page,
            limit: 12,
          },
        })
      ),
  });

  const items = data?.items || [];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScreenTitle
        title="Readings"
        subtitle="Read naturally and tap highlighted words to learn in context."
      />
      <SearchBox
        placeholder="Search articles by title..."
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <Text style={styles.label}>LEVEL</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {levels.map((l) => (
          <Pressable
            key={l}
            onPress={() => {
              setLevel(l);
              setPage(1);
            }}
            style={[styles.chip, level === l && styles.chipOn]}
          >
            <Text style={[styles.chipText, level === l && { color: colors.white }]}>
              {l || 'All Levels'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {topics?.length ? (
        <>
          <Text style={styles.label}>TOPIC</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Pressable
              onPress={() => {
                setTopicId('');
                setPage(1);
              }}
              style={[styles.chip, !topicId && styles.topicOn]}
            >
              <Text style={[styles.chipText, !topicId && { color: colors.white }]}>
                All Topics
              </Text>
            </Pressable>
            {topics.map((t: any) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  setTopicId(t.id);
                  setPage(1);
                }}
                style={[styles.chip, topicId === t.id && styles.topicOn]}
              >
                <Text
                  style={[
                    styles.chipText,
                    topicId === t.id && { color: colors.white },
                  ]}
                >
                  {t.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={styles.listHead}>
        <Text style={styles.result}>{data?.total ?? items.length} readings</Text>
        <Text style={styles.metaText}>
          Page {data?.page || page} / {data?.totalPages || 1}
        </Text>
      </View>

      {isLoading ? (
        <Loading label="Finding good reads..." />
      ) : items.length ? (
        items.map((r: any) => (
          <Pressable
            key={r.id || r._id}
            onPress={() => navigation.navigate('ReadingDetail', { id: r.id || r._id })}
          >
            <Card style={styles.cardMargin}>
              <View style={styles.between}>
                {r.level ? (
                  <Pill
                    color={
                      r.level.startsWith('A') ? colors.green : colors.pinkDark
                    }
                    background={
                      r.level.startsWith('A') ? '#ECFDF5' : colors.pinkSoft
                    }
                  >
                    {r.level}
                  </Pill>
                ) : (
                  <View />
                )}
                <View style={styles.meta}>
                  <Clock size={14} color={colors.secondary} />
                  <Text style={styles.metaText}>
                    {r.estimatedReadingTimeMinutes || 5} min read
                  </Text>
                </View>
              </View>
              
              <Text style={styles.title}>{r.title}</Text>
              {r.subtitle ? <Text style={styles.subtitle}>{r.subtitle}</Text> : null}
              
              <View style={styles.foot}>
                <View style={styles.meta}>
                  <BookOpen size={16} color={colors.pink} />
                  <Text style={styles.context}>Context-ready</Text>
                </View>
                <View style={styles.start}>
                  <Text style={styles.startText}>Start Reading</Text>
                  <ChevronRight size={17} color={colors.white} />
                </View>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Empty
          title="No readings available"
          text="Try adjusting your search filters."
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

const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 110,
  },
  cardMargin: {
    marginBottom: 14,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.secondary,
    marginVertical: 12,
  },
  chips: {
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  chipOn: {
    backgroundColor: colors.pink,
  },
  topicOn: {
    backgroundColor: colors.blue,
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.secondary,
  },
  listHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  result: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.ink,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
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
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
    lineHeight: 25,
    marginTop: 15,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 19,
    marginTop: 6,
  },
  foot: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  context: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.secondary,
  },
  start: {
    backgroundColor: colors.blue,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.white,
  },
});
