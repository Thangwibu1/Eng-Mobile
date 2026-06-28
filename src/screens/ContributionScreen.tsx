import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Check, PlusCircle, Sparkles, Trash2, X } from 'lucide-react-native';
import { api, unwrap } from '../api';
import { useAuth } from '../auth-context';
import { Button, Card, Empty, Input, Loading, Pill, ScreenTitle } from '../components';
import { colors, fonts } from '../theme';

type Tab = 'my' | 'vocab' | 'reading' | 'review' | 'history' | 'topics';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const types = [
  ['single_word', 'Single Word'],
  ['compound_word', 'Compound'],
  ['collocation', 'Collocation'],
  ['phrasal_verb', 'Phrasal Verb'],
  ['idiom', 'Idiom'],
  ['fixed_phrase', 'Fixed Phrase'],
];

const parsePayload = (item: any) => {
  try {
    return typeof item.payloadJson === 'string'
      ? JSON.parse(item.payloadJson)
      : item.payload || item.payloadJson || {};
  } catch {
    return {};
  }
};

interface ContributionScreenProps {
  navigation: any;
}

export function ContributionScreen({ navigation }: ContributionScreenProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('my');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['contributions'],
    queryFn: async () => unwrap<any[]>(await api.get('/contributions')),
    enabled: !!user,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => unwrap<any[]>(await api.get('/topics')),
  });

  const process = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) =>
      api.post(`/contributions/${id}/${action}`, {
        adminNote: notes[id] || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contributions'] }),
    onError: (e: any) => Alert.alert('Review failed', e.userMessage),
  });

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color={colors.secondary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <ScreenTitle
          title="Contributions"
          subtitle="Log in to enrich the community dictionary and reading library."
        />
        <Empty
          title="Log In Required"
          text="Your submissions and review history are tied to your account."
        />
        <Button
          title="Log In"
          variant="blue"
          onPress={() => navigation.navigate('Login')}
        />
      </ScrollView>
    );
  }

  const isAdmin = user.role === 'admin';
  const pending = list.filter((x: any) => x.status === 'pending');
  const history = list.filter((x: any) => x.status !== 'pending');

  const tabsList: any[] = [
    ['my', `My (${list.length})`],
    ['vocab', 'Add Vocabulary'],
    ['reading', 'Submit Reading'],
    ...(isAdmin
      ? [
          ['review' as Tab, `Review (${pending.length})`],
          ['history' as Tab, `History (${history.length})`],
          ['topics' as Tab, 'Topics'],
        ]
      : []),
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.back} onPress={() => navigation.goBack()}>
        <ArrowLeft size={18} color={colors.secondary} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      
      <ScreenTitle
        title="Contributions"
        subtitle="Help expand the dictionary and submit readings for community practice."
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {tabsList.map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tab, tab === id && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === id && { color: colors.white }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'my' && (
        isLoading ? (
          <Loading />
        ) : list.length ? (
          <ContributionList items={list} />
        ) : (
          <Empty
            title="No contributions yet"
            text="Use the tabs above to submit your first item."
          />
        )
      )}

      {tab === 'vocab' && <VocabularyForm onDone={() => setTab('my')} />}
      {tab === 'reading' && <ReadingForm onDone={() => setTab('my')} />}
      
      {tab === 'review' && (
        <ContributionList
          items={pending}
          admin
          notes={notes}
          setNotes={setNotes}
          process={process}
        />
      )}
      
      {tab === 'history' && <ContributionList items={history} />}
      {tab === 'topics' && <TopicManager topics={topics} />}
    </ScrollView>
  );
}

interface ChoiceProps {
  items: any[];
  value: string;
  onChange: (val: string) => void;
  color?: string;
}

function Choice({ items, value, onChange, color = colors.pink }: ChoiceProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.choiceScroll}
    >
      {items.map((x: any) => {
        const id = Array.isArray(x) ? x[0] : x;
        const label = Array.isArray(x) ? x[1] : x;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={[styles.choice, value === id && { backgroundColor: color }]}
          >
            <Text
              style={[
                styles.choiceText,
                value === id && { color: colors.white },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.field}>{label}</Text>
      {children}
    </View>
  );
}

function VocabularyForm({ onDone }: any) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [type, setType] = useState('single_word');
  const [level, setLevel] = useState('A1');
  const [meaning, setMeaning] = useState('');
  const [exampleEn, setExampleEn] = useState('');
  const [exampleVi, setExampleVi] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      api.post('/contributions', {
        type: 'vocabulary',
        action: 'create',
        payload: {
          text: text.trim(),
          normalizedText: text.trim().toLowerCase(),
          type,
          level,
          meanings: [
            {
              meaningVi: meaning.trim(),
              examples: exampleEn
                ? [
                    {
                      exampleEn: exampleEn.trim(),
                      exampleVi: exampleVi.trim() || undefined,
                    },
                  ]
                : [],
            },
          ],
          forms: [],
          components: [],
          topicIds: [],
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contributions'] });
      Alert.alert('Submitted', 'Your vocabulary is waiting for admin review.');
      onDone();
    },
    onError: (e: any) => Alert.alert('Submission failed', e.userMessage),
  });

  return (
    <Card>
      <View style={styles.formTitle}>
        <PlusCircle size={22} color={colors.pinkDark} />
        <Text style={styles.heading}>Contribute Vocabulary</Text>
      </View>
      
      <Field label="WORD OR PHRASE">
        <Input placeholder="e.g. break a leg" value={text} onChangeText={setText} />
      </Field>
      <Field label="VOCABULARY TYPE">
        <Choice items={types} value={type} onChange={setType} />
      </Field>
      <Field label="CEFR LEVEL">
        <Choice items={levels} value={level} onChange={setLevel} color={colors.blue} />
      </Field>
      <Field label="VIETNAMESE MEANING">
        <Input placeholder="e.g. chúc may mắn" value={meaning} onChangeText={setMeaning} />
      </Field>
      <Field label="EXAMPLE SENTENCE (ENGLISH, OPTIONAL)">
        <Input
          placeholder="You have a show tonight? Break a leg!"
          value={exampleEn}
          onChangeText={setExampleEn}
        />
      </Field>
      <Field label="VIETNAMESE TRANSLATION">
        <Input
          placeholder="Bạn diễn tối nay à? Chúc may mắn nhé!"
          value={exampleVi}
          onChangeText={setExampleVi}
        />
      </Field>
      
      <Button
        title={submit.isPending ? 'Submitting...' : 'Submit Vocabulary'}
        disabled={!text.trim() || !meaning.trim() || submit.isPending}
        onPress={() => submit.mutate()}
      />
    </Card>
  );
}

function ReadingForm({ onDone }: any) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [level, setLevel] = useState('A1');
  const [time, setTime] = useState('5');
  const [items, setItems] = useState<any[]>([]);
  const [aiAssisted, setAiAssisted] = useState(false);

  const analyze = useMutation({
    mutationFn: async () =>
      unwrap<any>(
        await api.post('/contributions/readings/ai-analyze', {
          title: title.trim(),
          content: body.trim(),
          level,
          mode: 'coverage',
        })
      ),
    onSuccess: (d) => {
      setItems(d.items || []);
      setAiAssisted(true);
    },
    onError: (e: any) => Alert.alert('AI analysis failed', e.userMessage),
  });

  const submit = useMutation({
    mutationFn: () => {
      const aiMatchedItems = items.filter((x) => x.status === 'matched');
      const aiMissingItems = items.filter((x) => x.status === 'missing');
      return api.post('/contributions', {
        type: aiAssisted ? 'reading_with_ai_vocabulary' : 'reading',
        action: 'create',
        payload: {
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          bodyText: body.trim(),
          level,
          estimatedReadingTimeMinutes: Number(time) || 5,
          spans: [],
          vocabularyMap: {},
          aiAssisted,
          aiMatchedItems,
          aiMissingItems,
          suggestedVocabularyItems: items,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contributions'] });
      Alert.alert('Submitted', 'Your reading is waiting for admin review.');
      onDone();
    },
    onError: (e: any) => Alert.alert('Submission failed', e.userMessage),
  });

  return (
    <Card>
      <View style={styles.formTitle}>
        <BookOpen size={22} color={colors.pinkDark} />
        <Text style={styles.heading}>Contribute Reading Article</Text>
      </View>
      
      <Field label="TITLE">
        <Input placeholder="e.g. The Science of Memory" value={title} onChangeText={setTitle} />
      </Field>
      <Field label="SHORT SUMMARY">
        <Input placeholder="What is this article about?" value={subtitle} onChangeText={setSubtitle} />
      </Field>
      <Field label="CEFR LEVEL">
        <Choice items={levels} value={level} onChange={setLevel} color={colors.blue} />
      </Field>
      <Field label="ESTIMATED TIME (MINUTES)">
        <Input keyboardType="number-pad" value={time} onChangeText={setTime} />
      </Field>
      <Field label="ARTICLE BODY">
        <Input
          placeholder="Write the full English article here..."
          multiline
          value={body}
          onChangeText={setBody}
          style={styles.largeInput}
        />
      </Field>
      
      <Button
        title={analyze.isPending ? 'Analyzing vocabulary...' : 'Use AI to analyze vocabulary'}
        variant="soft"
        icon={<Sparkles size={17} color={colors.pinkDark} />}
        disabled={body.trim().length < 50 || analyze.isPending}
        onPress={() => analyze.mutate()}
      />
      
      {aiAssisted ? (
        <SuggestionEditor items={items} setItems={setItems} />
      ) : null}
      
      <Button
        title={submit.isPending ? 'Submitting...' : 'Submit Reading Article'}
        disabled={!title.trim() || !body.trim() || submit.isPending}
        onPress={() => submit.mutate()}
        style={styles.submitBtn}
      />
    </Card>
  );
}

function SuggestionEditor({ items, setItems }: any) {
  const changeMeaning = (item: any, index: number, value: string) => {
    const next = [...items];
    next[index] = item.suggestedVocabulary
      ? {
          ...item,
          suggestedVocabulary: {
            ...item.suggestedVocabulary,
            meaningVi: value,
          },
        }
      : { ...item, meaningVi: value };
    setItems(next);
  };

  return (
    <View style={styles.suggestions}>
      <Text style={styles.heading}>AI Vocabulary ({items.length})</Text>
      <Text style={styles.small}>
        Matched words link to the database; missing words will be proposed for creation.
      </Text>
      
      {items.map((item: any, index: number) => {
        const vocabulary = item.suggestedVocabulary || item.vocabulary || item;
        return (
          <View style={styles.suggestion} key={item.clientId || index}>
            <View style={styles.between}>
              <Text style={styles.suggestionWord}>
                {vocabulary.text || item.text}
              </Text>
              <View style={styles.row}>
                <Pill
                  color={item.status === 'matched' ? colors.green : colors.amber}
                  background={item.status === 'matched' ? '#ECFDF5' : '#FFF8E6'}
                >
                  {item.status}
                </Pill>
                <Pressable
                  onPress={() =>
                    setItems(items.filter((_: any, i: number) => i !== index))
                  }
                >
                  <X size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
            <Input
              placeholder="Vietnamese meaning"
              value={vocabulary.meaningVi || item.meaningVi || ''}
              onChangeText={(value) => changeMeaning(item, index, value)}
            />
          </View>
        );
      })}
    </View>
  );
}

function ContributionList({
  items,
  admin,
  notes,
  setNotes,
  process: processMutation,
}: any) {
  if (!items.length) {
    return (
      <Empty
        title={admin ? 'Review queue empty' : 'Nothing here yet'}
        text={
          admin
            ? 'No submissions are pending review.'
            : 'Create a contribution using another tab.'
        }
      />
    );
  }

  return (
    <View style={styles.listContainer}>
      {items.map((item: any) => {
        const p = parsePayload(item);
        const id = item._id || item.id;
        const isVocab = item.type === 'vocabulary';
        return (
          <Card key={id} style={styles.listItemCard}>
            <View style={styles.between}>
              <Pill
                color={
                  item.status === 'approved'
                    ? colors.green
                    : item.status === 'rejected'
                    ? colors.danger
                    : colors.blue
                }
                background={
                  item.status === 'approved'
                    ? '#ECFDF5'
                    : item.status === 'rejected'
                    ? '#FFF1F2'
                    : colors.blueSoft
                }
              >
                {item.status || 'pending'}
              </Pill>
              <Text style={styles.date}>
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
              </Text>
            </View>

            <Text style={styles.itemTitle}>{isVocab ? p.text : p.title}</Text>
            <Text style={styles.small}>
              {isVocab
                ? `${p.type?.replace('_', ' ')} • ${p.level} • ${
                    p.meanings?.[0]?.meaningVi || ''
                  }`
                : `${p.level} • ${p.estimatedReadingTimeMinutes || 5} min • ${
                    p.subtitle || ''
                  }`}
            </Text>

            {p.aiAssisted ? <Pill>✨ AI Assisted</Pill> : null}
            {!isVocab && p.bodyText ? (
              <Text numberOfLines={5} style={styles.bodyText}>
                {p.bodyText}
              </Text>
            ) : null}

            {p.aiMatchedItems?.length || p.aiMissingItems?.length ? (
              <View style={styles.aiCounts}>
                <Text style={styles.match}>
                  {p.aiMatchedItems?.length || 0} matched
                </Text>
                <Text style={styles.missing}>
                  {p.aiMissingItems?.length || 0} missing
                </Text>
              </View>
            ) : null}

            {item.submittedBy ? (
              <Text style={styles.submitter}>
                By {item.submittedBy.displayName || item.submittedBy.username} •{' '}
                {item.submittedBy.email}
              </Text>
            ) : null}

            {item.adminNote ? (
              <View style={styles.note}>
                <Text style={styles.noteTitle}>Admin feedback</Text>
                <Text style={styles.small}>{item.adminNote}</Text>
              </View>
            ) : null}

            {admin ? (
              <>
                <Input
                  placeholder="Review feedback / admin note..."
                  value={notes[id] || ''}
                  onChangeText={(v: string) =>
                    setNotes({ ...notes, [id]: v })
                  }
                  style={styles.reviewInput}
                />
                <View style={styles.reviewActions}>
                  <Button
                    title="Approve"
                    variant="blue"
                    icon={<Check size={16} color={colors.white} />}
                    onPress={() => processMutation.mutate({ id, action: 'approve' })}
                  />
                  <Button
                    title="Reject"
                    variant="danger"
                    icon={<X size={16} color={colors.danger} />}
                    onPress={() => processMutation.mutate({ id, action: 'reject' })}
                  />
                </View>
              </>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

function TopicManager({ topics }: any) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api.post('/topics', {
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      setName('');
      setDescription('');
      qc.invalidateQueries({ queryKey: ['topics'] });
    },
    onError: (e: any) => Alert.alert('Cannot create topic', e.userMessage),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/topics/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['topics'] }),
    onError: (e: any) => Alert.alert('Cannot delete topic', e.userMessage),
  });

  return (
    <View style={styles.topicManager}>
      <Card>
        <Text style={styles.heading}>Add New Topic</Text>
        <Field label="TOPIC NAME">
          <Input
            placeholder="e.g. Travel & Holiday"
            value={name}
            onChangeText={setName}
          />
        </Field>
        <Field label="DESCRIPTION">
          <Input
            placeholder="Topic context description..."
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </Field>
        <Button
          title="Create Topic"
          disabled={!name.trim() || create.isPending}
          onPress={() => create.mutate()}
        />
      </Card>
      
      <Card>
        <Text style={styles.heading}>Existing Topics</Text>
        {topics.length ? (
          topics.map((t: any) => (
            <View style={styles.topic} key={t.id}>
              <View style={styles.flexOne}>
                <Text style={styles.topicName}>{t.name}</Text>
                <Text style={styles.small}>{t.description}</Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert('Delete topic', `Delete “${t.name}”?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => remove.mutate(t.id),
                    },
                  ])
                }
              >
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.small}>No topics found.</Text>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 80,
  },
  flexOne: {
    flex: 1,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
  },
  backText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.secondary,
  },
  tabs: {
    gap: 7,
    paddingBottom: 18,
  },
  tab: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabOn: {
    backgroundColor: colors.pink,
  },
  tabText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.secondary,
  },
  choiceScroll: {
    gap: 7,
  },
  choice: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  choiceText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.secondary,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  field: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.secondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  formTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.ink,
  },
  largeInput: {
    minHeight: 180,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 15,
  },
  suggestions: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    marginVertical: 18,
    paddingTop: 18,
    gap: 10,
  },
  suggestion: {
    backgroundColor: '#F8FAFC',
    borderRadius: 17,
    padding: 13,
    gap: 9,
  },
  suggestionWord: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.pinkDark,
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  small: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.secondary,
    lineHeight: 17,
  },
  date: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: colors.muted,
  },
  itemTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
    marginTop: 14,
    marginBottom: 4,
  },
  bodyText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 19,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 13,
    marginTop: 12,
  },
  aiCounts: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  match: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.green,
  },
  missing: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.amber,
  },
  submitter: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: colors.muted,
    marginTop: 10,
  },
  note: {
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    padding: 12,
    marginVertical: 10,
  },
  noteTitle: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.ink,
  },
  listContainer: {
    gap: 12,
  },
  listItemCard: {
    marginBottom: 10,
  },
  reviewInput: {
    marginTop: 12,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  topicManager: {
    gap: 13,
  },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topicName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
  },
});
