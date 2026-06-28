import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, RotateCw } from 'lucide-react-native';
import { api, unwrap } from '../api';
import { Button, Card, Empty, Loading, Pill } from '../components';
import { colors, fonts } from '../theme';

interface ReviewScreenProps {
  route: any;
  navigation: any;
}

export function ReviewScreen({ route, navigation }: ReviewScreenProps) {
  const { id } = route.params;
  const [index, setIndex] = useState(0);
  const [flip, setFlip] = useState(false);
  const [complete, setComplete] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['deck', id],
    queryFn: async () => unwrap<any>(await api.get(`/flashcard-decks/${id}`)),
  });

  const review = useMutation({
    mutationFn: async (rating: string) =>
      api.post(`/flashcard-decks/${id}/review`, {
        deckId: id,
        cardId: data.cards[index].id,
        vocabularyId: data.cards[index].vocabularyId,
        rating,
      }),
    onSuccess: () => {
      setFlip(false);
      if (index < data.cards.length - 1) {
        setIndex((v) => v + 1);
      } else {
        setComplete(true);
      }
    },
  });

  if (isLoading) return <Loading />;
  if (!data?.cards?.length) return <Empty title="No cards to review" />;

  if (complete) {
    return (
      <View style={styles.completePage}>
        <View style={styles.trophy}>
          <Award size={42} color={colors.pinkDark} />
        </View>
        <Text style={styles.congrats}>Congratulations! 🎉</Text>
        <Text style={styles.desc}>
          You completed all {data.cards.length} cards in {data.deck.name}.
        </Text>
        <Button title="Back to Deck" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const c = data.cards[index];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.between}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color={colors.secondary} />
          <Text style={styles.backText}>Exit Review</Text>
        </Pressable>
        <Text style={styles.count}>
          Card {index + 1} of {data.cards.length}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progress,
            { width: `${(index / data.cards.length) * 100}%` },
          ]}
        />
      </View>

      <Pressable onPress={() => setFlip(!flip)}>
        <Card style={[styles.flipCard, flip ? styles.pinkBorder : {}]}>
          <Pill>{flip ? 'Answer' : 'Question'}</Pill>
          <View style={styles.cardCenter}>
            <Text style={styles.reviewWord}>{c.front}</Text>
            {flip ? (
              <>
                <Text style={styles.reviewBack}>{c.back}</Text>
                {c.example ? <Text style={styles.example}>“{c.example}”</Text> : null}
              </>
            ) : (
              <Text style={styles.hint}>TAP TO REVEAL MEANING</Text>
            )}
          </View>
          <View style={styles.rotate}>
            <RotateCw size={16} color={colors.blue} />
            <Text style={styles.flipText}>Flip Card</Text>
          </View>
        </Card>
      </Pressable>

      {flip ? (
        <>
          <Text style={styles.rateLabel}>RATE YOUR RECALL DIFFICULTY</Text>
          <View style={styles.ratings}>
            {[
              ['again', '#FFF1F6', colors.pinkDark],
              ['hard', '#FFFBEA', '#A16207'],
              ['good', colors.blueSoft, colors.blue],
              ['easy', '#EAF7FF', '#168DE5'],
            ].map(([r, b, cColor]) => (
              <Pressable
                key={r}
                onPress={() => review.mutate(r)}
                style={[styles.rating, { backgroundColor: b }]}
              >
                <Text style={[styles.ratingText, { color: cColor }]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.flipHint}>
          <Text style={styles.rateLabel}>FLIP CARD TO RATE AND ADVANCE</Text>
        </View>
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
  count: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: colors.pink,
  },
  flipCard: {
    height: 330,
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinkBorder: {
    borderColor: colors.pink,
  },
  cardCenter: {
    alignItems: 'center',
  },
  reviewWord: {
    fontFamily: fonts.bold,
    fontSize: 38,
    color: colors.ink,
    textAlign: 'center',
  },
  reviewBack: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.pinkDark,
    textAlign: 'center',
    marginTop: 8,
  },
  hint: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1,
    marginTop: 9,
  },
  rotate: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  flipText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.blue,
  },
  rateLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.secondary,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 22,
  },
  ratings: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 11,
  },
  rating: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
  },
  ratingText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  flipHint: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 8,
    marginTop: 16,
  },
  completePage: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  trophy: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  congrats: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.ink,
    textAlign: 'center',
  },
  desc: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 18,
    marginTop: 5,
    textAlign: 'center',
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
