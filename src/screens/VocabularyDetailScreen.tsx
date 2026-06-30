import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Bookmark, CheckCircle2, Volume2 } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { api, unwrap } from '../api';
import { Button, Card, Empty, Loading, Pill } from '../components';
import { colors, fonts } from '../theme';
import { useAuth } from '../auth-context';

interface VocabularyDetailScreenProps {
  route: any;
  navigation: any;
}

export function VocabularyDetailScreen({ route, navigation }: VocabularyDetailScreenProps) {
  const { id } = route.params;
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vocabulary', id],
    queryFn: async () => unwrap<any>(await api.get(`/vocabularies/${id}`)),
  });

  const action = useMutation({
    mutationFn: async (path: string) => api.post(`/vocabularies/${id}/${path}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vocabulary', id] });
      qc.invalidateQueries({ queryKey: ['vocabularies'] });
    },
    onError: (e: any) => Alert.alert('Oops', e.userMessage),
  });

  if (isLoading) return <Loading />;
  if (!data) return <Empty title="Word not found" />;

  const v = data.vocabulary || data;
  const status = data.userProgress?.status || 'new';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <ArrowLeft size={18} color={colors.secondary} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      
      <Card>
        <View style={styles.between}>
          <View style={styles.row}>
            <Pill color={colors.blue} background={colors.blueSoft}>
              {(v.type || 'word').replace('_', ' ')}
            </Pill>
            {v.level ? <Pill>{v.level}</Pill> : null}
          </View>
          {status !== 'new' ? (
            <Pill color={colors.secondary} background="#F1F5F9">
              {status}
            </Pill>
          ) : null}
        </View>

        <View style={styles.audioRow}>
          <View>
            <Text style={styles.detailWord}>{v.text}</Text>
            {v.phonetic ? (
              <Text style={styles.detailPhonetic}>{v.phonetic}</Text>
            ) : null}
          </View>
          <Pressable
            style={styles.audio}
            onPress={() => (v.audioUrl ? null : Speech.speak(v.text, { language: 'en-US' }))}
          >
            <Volume2 size={23} color={colors.blue} />
          </Pressable>
        </View>

        {user ? (
          <View style={styles.actions}>
            <Button
              title={status === 'saved' ? 'Saved' : 'Save'}
              variant={status === 'saved' ? 'soft' : 'white'}
              icon={<Bookmark size={16} color={colors.pinkDark} />}
              onPress={() => action.mutate('save')}
            />
            <Button
              title="Known"
              variant="white"
              icon={<CheckCircle2 size={16} color={colors.blue} />}
              onPress={() => action.mutate('mark-known')}
            />
            <Button
              title="Difficult"
              variant="white"
              icon={<AlertTriangle size={16} color={colors.amber} />}
              onPress={() => action.mutate('mark-difficult')}
            />
          </View>
        ) : null}

        <View style={styles.divider} />
        
        <Text style={styles.section}>Meanings</Text>
        
        {v.meanings?.map((m: any, i: number) => (
          <View style={styles.meaningBox} key={i}>
            <Text style={styles.meaningDetail}>
              {i + 1}. {m.meaningVi}
            </Text>
            {m.meaningEn ? (
              <Text style={styles.meaningEn}>{m.meaningEn}</Text>
            ) : null}
            {m.note ? <Text style={styles.note}>Note: {m.note}</Text> : null}
            {m.examples?.map((ex: any, j: number) => (
              <View style={styles.example} key={j}>
                <Text style={styles.exampleEn}>{ex.exampleEn}</Text>
                {ex.exampleVi ? (
                  <Text style={styles.meaningEn}>{ex.exampleVi}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </Card>
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
  row: {
    flexDirection: 'row',
    gap: 7,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.secondary,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 22,
  },
  detailWord: {
    fontFamily: fonts.bold,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -1,
  },
  detailPhonetic: {
    fontFamily: fonts.medium,
    color: colors.secondary,
    fontSize: 16,
  },
  audio: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 24,
  },
  section: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 14,
  },
  meaningBox: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 12,
  },
  meaningDetail: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
  },
  meaningEn: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.secondary,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 3,
  },
  note: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.pinkDark,
    marginTop: 7,
  },
  example: {
    backgroundColor: colors.white,
    borderRadius: 13,
    padding: 12,
    marginTop: 10,
  },
  exampleEn: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },
});
