import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import { api, unwrap } from '../api';
import { Button, Card, Empty, Loading, Pill } from '../components';
import { colors, fonts } from '../theme';

interface DeckDetailScreenProps {
  route: any;
  navigation: any;
}

export function DeckDetailScreen({ route, navigation }: DeckDetailScreenProps) {
  const { id } = route.params;
  
  const { data, isLoading } = useQuery({
    queryKey: ['deck', id],
    queryFn: async () => unwrap<any>(await api.get(`/flashcard-decks/${id}`)),
  });

  if (isLoading) return <Loading />;
  if (!data) return <Empty title="Deck not found" />;

  const { deck, cards } = data;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <ArrowLeft size={18} color={colors.secondary} />
        <Text style={styles.backText}>Back to Decks</Text>
      </Pressable>

      <Card>
        <View style={styles.between}>
          <Pill
            color={deck.visibility === 'public' ? colors.blue : colors.secondary}
            background={
              deck.visibility === 'public' ? colors.blueSoft : '#F1F5F9'
            }
          >
            {deck.visibility === 'public' ? '🌍 Public' : '🔒 Private'}
          </Pill>
          <Text style={styles.count}>{cards.length} cards</Text>
        </View>
        <Text style={styles.detailTitle}>{deck.name}</Text>
        {deck.description ? <Text style={styles.desc}>{deck.description}</Text> : null}
        {cards.length ? (
          <Button
            title="Start Review  ▶"
            variant="blue"
            onPress={() => navigation.navigate('Review', { id })}
          />
        ) : null}
      </Card>

      <Text style={styles.section}>Cards in Deck ({cards.length})</Text>

      {cards.length ? (
        cards.map((c: any) => (
          <Card key={c.id} style={styles.cardMargin}>
            <Text style={styles.side}>FRONT</Text>
            <Text style={styles.front}>{c.front}</Text>
            <View style={styles.line} />
            <Text style={styles.side}>BACK</Text>
            <Text style={styles.backWord}>{c.back}</Text>
            {c.example ? <Text style={styles.example}>“{c.example}”</Text> : null}
          </Card>
        ))
      ) : (
        <Empty
          title="No cards in this deck yet"
          text="Save words from Search or a Reading."
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  detailTitle: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.ink,
    marginTop: 17,
    marginBottom: 2,
  },
  desc: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 12,
  },
  count: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
  },
  section: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.ink,
    marginVertical: 18,
  },
  cardMargin: {
    marginBottom: 12,
  },
  side: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1,
  },
  front: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.ink,
    marginTop: 3,
  },
  line: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  backWord: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.pinkDark,
    marginTop: 3,
  },
  example: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
    fontStyle: 'italic',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    textAlign: 'center',
  },
});
