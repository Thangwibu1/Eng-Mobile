import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus } from 'lucide-react-native';
import { api, unwrap } from '../api';
import { useAuth } from '../auth-context';
import { Button, Card, Empty, Input, Loading, Pill, ScreenTitle } from '../components';
import { colors, fonts } from '../theme';

interface FlashcardsScreenProps {
  navigation: any;
}

export function FlashcardsScreen({ navigation }: FlashcardsScreenProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');

  const { data, isLoading } = useQuery({
    queryKey: ['decks'],
    queryFn: async () => unwrap<any>(await api.get('/flashcard-decks')),
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async () =>
      api.post('/flashcard-decks', { name, description, visibility }),
    onSuccess: () => {
      setOpen(false);
      setName('');
      setDescription('');
      qc.invalidateQueries({ queryKey: ['decks'] });
    },
    onError: (e: any) => Alert.alert('Cannot create deck', e.userMessage),
  });

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <ScreenTitle
          title="Flashcards"
          subtitle="Personal decks and smart spaced repetition."
        />
        <Empty
          title="Sign in to study"
          text="Your decks and review progress will sync across devices."
        />
        <Button
          title="Log in"
          variant="blue"
          onPress={() => navigation.navigate('Login')}
        />
      </ScrollView>
    );
  }

  const mine = data?.myDecks || [];
  const publicDecks = data?.publicDecks || [];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.top}>
        <ScreenTitle
          title="Flashcard Decks"
          subtitle="Review smarter with spaced repetition."
        />
        <Pressable style={styles.add} onPress={() => setOpen(true)}>
          <Plus size={21} color={colors.white} />
        </Pressable>
      </View>

      <Text style={styles.section}>My Decks</Text>
      
      {isLoading ? (
        <Loading />
      ) : mine.length ? (
        mine.map((d: any) => (
          <Deck
            d={d}
            key={d.id || d._id}
            onPress={() => navigation.navigate('DeckDetail', { id: d.id || d._id })}
          />
        ))
      ) : (
        <Empty
          title="No decks yet"
          text="Create your first deck and start collecting words."
        />
      )}

      {publicDecks.length ? (
        <>
          <Text style={styles.section}>Explore Public Decks</Text>
          {publicDecks.map((d: any) => (
            <Deck
              d={d}
              key={d.id || d._id}
              onPress={() => navigation.navigate('DeckDetail', { id: d.id || d._id })}
            />
          ))}
        </>
      ) : null}

      <Modal visible={open} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Create a new deck</Text>
            <Text style={styles.modalSub}>
              Group vocabulary for custom reviews.
            </Text>
            
            <Input placeholder="Deck name" value={name} onChangeText={setName} />
            <Input
              placeholder="Brief description"
              value={description}
              onChangeText={setDescription}
              multiline
              style={styles.textArea}
            />

            <View style={styles.row}>
              <Button
                title="Private"
                variant={visibility === 'private' ? 'pink' : 'white'}
                onPress={() => setVisibility('private')}
              />
              <Button
                title="Public"
                variant={visibility === 'public' ? 'pink' : 'white'}
                onPress={() => setVisibility('public')}
              />
            </View>

            <View style={styles.row}>
              <Button title="Cancel" variant="white" onPress={() => setOpen(false)} />
              <Button
                title={create.isPending ? 'Creating...' : 'Create Deck'}
                disabled={!name || create.isPending}
                onPress={() => create.mutate()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

interface DeckProps {
  d: any;
  onPress: () => void;
}

function Deck({ d, onPress }: DeckProps) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.deckCard}>
        <View style={styles.between}>
          <View style={styles.deckIcon}>
            <Layers size={22} color={colors.pinkDark} />
          </View>
          <Pill
            color={d.visibility === 'public' ? colors.blue : colors.secondary}
            background={
              d.visibility === 'public' ? colors.blueSoft : '#F1F5F9'
            }
          >
            {d.visibility === 'public' ? 'Public' : 'Private'}
          </Pill>
        </View>
        <Text style={styles.deckTitle}>{d.name}</Text>
        {d.description ? <Text style={styles.desc}>{d.description}</Text> : null}
        <Text style={styles.count}>{d.cardCount || 0} cards  •  Tap to open</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 110,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  add: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.ink,
    marginVertical: 18,
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deckIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
    marginTop: 13,
  },
  desc: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 18,
    marginTop: 5,
  },
  count: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.muted,
    marginTop: 13,
  },
  overlay: {
    flex: 1,
    backgroundColor: '#0F172A88',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
    gap: 14,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 23,
    color: colors.ink,
  },
  modalSub: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
  },
  row: {
    flexDirection: 'row',
    gap: 9,
  },
  deckCard: {
    marginBottom: 13,
  },
  textArea: {
    minHeight: 70,
  },
});
