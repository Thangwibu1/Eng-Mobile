import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Check, PlusCircle, Sparkles, Trash2, X, Tag, Info, HelpCircle } from 'lucide-react-native';
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

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeAllAnnotations(
  content: string,
  aiSuggestions: any[],
  manualMatched: any[],
  manualMissing: any[]
) {
  const manualList = [...manualMatched, ...manualMissing];
  const occupiedRanges = manualList.map((item) => ({
    start: item.start,
    end: item.end,
  }));

  const annotations = [...manualList];

  const addAnnotationIfNoOverlap = (start: number, end: number, sugg: any) => {
    const overlap = occupiedRanges.some((r) => start < r.end && end > r.start);
    if (!overlap) {
      annotations.push({
        ...sugg,
        start,
        end,
      });
      occupiedRanges.push({ start, end });
      return true;
    }
    return false;
  };

  // Sort AI suggestions by text length descending
  const sortedAiSuggs = [...aiSuggestions].sort((a, b) => {
    const textA = a.suggestedVocabulary?.text || a.text || '';
    const textB = b.suggestedVocabulary?.text || b.text || '';
    return textB.length - textA.length;
  });

  for (const sugg of sortedAiSuggs) {
    const suggText = sugg.suggestedVocabulary?.text || sugg.text || '';
    const suggNorm = normalizeText(suggText);
    if (!suggNorm) continue;

    // Check if duplicate exists in manual (by normalizedText)
    const duplicateInManual = manualList.some(
      (m) => normalizeText(m.text) === suggNorm
    );
    if (duplicateInManual) continue;

    // Search for occurrences in content
    const escapedText = suggText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexStr = `\\b${escapedText}\\b`;
    let regex: RegExp;
    try {
      regex = new RegExp(regexStr, 'gi');
    } catch (e) {
      regex = new RegExp(escapedText, 'gi');
    }

    let match;
    while ((match = regex.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      addAnnotationIfNoOverlap(start, end, sugg);
    }
  }

  return annotations.sort((a, b) => a.start - b.start);
}

function buildTextSegments(content: string, annotations: any[]) {
  const segments: Array<{
    type: 'text' | 'annotation';
    text: string;
    start: number;
    end: number;
    annotation?: any;
  }> = [];

  let lastIndex = 0;
  for (const ann of annotations) {
    if (ann.start > lastIndex) {
      segments.push({
        type: 'text',
        text: content.substring(lastIndex, ann.start),
        start: lastIndex,
        end: ann.start,
      });
    }
    segments.push({
      type: 'annotation',
      text: content.substring(ann.start, ann.end),
      start: ann.start,
      end: ann.end,
      annotation: ann,
    });
    lastIndex = ann.end;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      text: content.substring(lastIndex),
      start: lastIndex,
      end: content.length,
    });
  }

  return segments;
}

function tokenize(segmentText: string, segmentStart: number) {
  const tokenRegex = /(\s+|[a-zA-Z0-9'-]+|[^\s\w]+)/g;
  const tokens = [];
  let match;
  while ((match = tokenRegex.exec(segmentText)) !== null) {
    tokens.push({
      text: match[0],
      start: segmentStart + match.index,
      end: segmentStart + match.index + match[0].length,
      isWord: /\w+/.test(match[0]),
    });
  }
  return tokens;
}

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
      {tab === 'reading' && <ReadingForm onDone={() => setTab('my')} topics={topics} />}
      
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

function ReadingForm({ onDone, topics }: any) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [level, setLevel] = useState('A1');
  const [time, setTime] = useState('5');
  const [items, setItems] = useState<any[]>([]);
  const [aiAssisted, setAiAssisted] = useState(false);

  // Manual annotation states
  const [readingMode, setReadingMode] = useState<'edit' | 'annotate'>('edit');
  const [manualMatchedItems, setManualMatchedItems] = useState<any[]>([]);
  const [manualMissingItems, setManualMissingItems] = useState<any[]>([]);

  // Active word selection offsets
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState('');

  // Lookup & popovers
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  // Form states for adding new vocabulary manually
  const [formType, setFormType] = useState('single_word');
  const [formLevel, setFormLevel] = useState('A1');
  const [formMeaning, setFormMeaning] = useState('');
  const [formExampleEn, setFormExampleEn] = useState('');
  const [formExampleVi, setFormExampleVi] = useState('');
  const [formTopics, setFormTopics] = useState<string[]>([]);

  // Filter for annotation panel
  const [panelFilter, setPanelFilter] = useState<'all' | 'manual' | 'ai' | 'matched' | 'missing'>('all');

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
        type: (aiAssisted || manualMissingItems.length > 0) ? 'reading_with_ai_vocabulary' : 'reading',
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
          manualMatchedItems,
          manualMissingItems,
          suggestedVocabularyItems: items,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contributions'] });
      Alert.alert('Submitted', 'Your reading is waiting for admin review.');
      setTitle('');
      setSubtitle('');
      setBody('');
      setTime('5');
      setItems([]);
      setAiAssisted(false);
      setManualMatchedItems([]);
      setManualMissingItems([]);
      setReadingMode('edit');
      onDone();
    },
    onError: (e: any) => Alert.alert('Submission failed', e.userMessage),
  });

  const handleWordTap = (t: { text: string; start: number; end: number }) => {
    if (selectionStart === null) {
      setSelectionStart(t.start);
      setSelectionEnd(t.end);
      setSelectedText(t.text);
    } else {
      if (t.start === selectionStart) {
        setSelectionStart(null);
        setSelectionEnd(null);
        setSelectedText('');
      } else if (t.start < selectionStart) {
        setSelectionStart(t.start);
        setSelectionEnd(t.end);
        setSelectedText(t.text);
      } else {
        setSelectionEnd(t.end);
        const rangeText = body.substring(selectionStart, t.end);
        setSelectedText(rangeText);
      }
    }
  };

  const handleLookup = async () => {
    if (!selectedText.trim()) return;
    setLookupLoading(true);
    try {
      const res = await api.post('/vocabularies/lookup', { text: selectedText.trim() });
      const data = unwrap<any>(res);
      setLookupResult(data);
      if (data.status === 'matched') {
        setIsLookupOpen(true);
      } else {
        setFormType('single_word');
        setFormLevel(level);
        setFormMeaning('');
        setFormExampleEn('');
        setFormExampleVi('');
        setFormTopics([]);
        setIsFormModalOpen(true);
      }
    } catch (e: any) {
      Alert.alert('Lookup failed', e.userMessage || 'Could not connect to lookup service.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddManually = async () => {
    if (!selectedText.trim()) return;
    setLookupLoading(true);
    try {
      const res = await api.post('/vocabularies/lookup', { text: selectedText.trim() });
      const data = unwrap<any>(res);
      setLookupResult(data);
    } catch {
      setLookupResult({ status: 'missing', suggestions: [] });
    } finally {
      setLookupLoading(false);
      setFormType('single_word');
      setFormLevel(level);
      setFormMeaning('');
      setFormExampleEn('');
      setFormExampleVi('');
      setFormTopics([]);
      setIsFormModalOpen(true);
    }
  };

  const handleConfirmLookup = () => {
    if (!lookupResult?.vocabulary || selectionStart === null || selectionEnd === null) return;
    const vocab = lookupResult.vocabulary;
    const hasOverlap = [...manualMatchedItems, ...manualMissingItems].some(
      (ann) => selectionStart < ann.end && selectionEnd > ann.start
    );
    if (hasOverlap) {
      Alert.alert('Error', 'Selection overlaps with an existing annotation.');
      return;
    }

    setManualMatchedItems((prev) => [
      ...prev,
      {
        source: 'manual',
        status: 'matched',
        text: selectedText,
        normalizedText: normalizeText(selectedText),
        start: selectionStart,
        end: selectionEnd,
        vocabularyId: vocab.id || vocab._id,
        matchMethod: 'normalized_text',
        type: vocab.type,
        level: vocab.level,
        meaningVi: vocab.meanings?.[0]?.meaningVi || vocab.meaningVi,
      },
    ]);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectedText('');
    setIsLookupOpen(false);
    setLookupResult(null);
  };

  const handleChooseSuggestion = (vocab: any) => {
    if (selectionStart === null || selectionEnd === null) return;
    const hasOverlap = [...manualMatchedItems, ...manualMissingItems].some(
      (ann) => selectionStart < ann.end && selectionEnd > ann.start
    );
    if (hasOverlap) {
      Alert.alert('Error', 'Selection overlaps with an existing annotation.');
      return;
    }

    setManualMatchedItems((prev) => [
      ...prev,
      {
        source: 'manual',
        status: 'matched',
        text: selectedText,
        normalizedText: normalizeText(selectedText),
        start: selectionStart,
        end: selectionEnd,
        vocabularyId: vocab.id || vocab._id,
        matchMethod: 'selected_suggestion',
        type: vocab.type,
        level: vocab.level,
        meaningVi: vocab.meanings?.[0]?.meaningVi || vocab.meaningVi || '',
      },
    ]);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectedText('');
    setIsFormModalOpen(false);
    setLookupResult(null);
  };

  const handleSaveManualForm = () => {
    if (!formMeaning.trim() || selectionStart === null || selectionEnd === null) return;
    const hasOverlap = [...manualMatchedItems, ...manualMissingItems].some(
      (ann) => selectionStart < ann.end && selectionEnd > ann.start
    );
    if (hasOverlap) {
      Alert.alert('Error', 'Selection overlaps with an existing annotation.');
      return;
    }

    const newVocab = {
      text: selectedText.trim(),
      normalizedText: normalizeText(selectedText),
      type: formType,
      level: formLevel,
      meanings: [
        {
          meaningVi: formMeaning.trim(),
          examples: formExampleEn.trim()
            ? [
                {
                  exampleEn: formExampleEn.trim(),
                  exampleVi: formExampleVi.trim() || undefined,
                },
              ]
            : [],
        },
      ],
      forms: [],
      components: [],
      topicIds: formTopics,
    };

    setManualMissingItems((prev) => [
      ...prev,
      {
        source: 'manual',
        status: 'missing',
        text: selectedText,
        normalizedText: normalizeText(selectedText),
        start: selectionStart,
        end: selectionEnd,
        suggestedVocabulary: newVocab,
      },
    ]);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectedText('');
    setIsFormModalOpen(false);
    setLookupResult(null);
  };

  const annotations = computeAllAnnotations(body, items, manualMatchedItems, manualMissingItems);
  const segments = buildTextSegments(body, annotations);

  const renderUnannotatedSegment = (segmentText: string, segmentStart: number) => {
    const tokens = tokenize(segmentText, segmentStart);
    return tokens.map((t, idx) => {
      if (!t.isWord) {
        return <Text key={idx} style={styles.normalText}>{t.text}</Text>;
      }
      const isSelected = selectionStart !== null && selectionEnd !== null && t.start >= selectionStart && t.end <= selectionEnd;
      return (
        <Text
          key={idx}
          onPress={() => handleWordTap(t)}
          style={[
            styles.selectableWord,
            isSelected && styles.wordSelected,
          ]}
        >
          {t.text}
        </Text>
      );
    });
  };

  const getFilteredAnnotations = () => {
    const manualList = [...manualMatchedItems, ...manualMissingItems];
    if (panelFilter === 'manual') return manualList;
    if (panelFilter === 'ai') return items;
    if (panelFilter === 'matched') {
      return [...items.filter(x => x.status === 'matched'), ...manualMatchedItems];
    }
    if (panelFilter === 'missing') {
      return [...items.filter(x => x.status === 'missing'), ...manualMissingItems];
    }
    return [...manualList, ...items];
  };

  const filteredAnnotations = getFilteredAnnotations();

  if (readingMode === 'annotate') {
    return (
      <View style={{ gap: 15 }}>
        <Card>
          <View style={styles.between}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.heading}>Annotate Reading</Text>
              <Text style={styles.small}>
                Title: {title} • CEFR: {level}
              </Text>
              <Text style={styles.small}>
                Tap starting and ending words to select phrases to annotate manually.
              </Text>
            </View>
            <Button
              title="Edit text"
              variant="white"
              onPress={() => setReadingMode('edit')}
            />
          </View>
        </Card>

        <Card style={{ padding: 18 }}>
          <Text style={styles.paragraphText}>
            {segments.map((seg, sIdx) => {
              if (seg.type === 'annotation') {
                const isManualMatched = seg.annotation.source === 'manual' && seg.annotation.status === 'matched';
                const isManualMissing = seg.annotation.source === 'manual' && seg.annotation.status === 'missing';
                const isAiMatched = seg.annotation.status === 'matched' && seg.annotation.source !== 'manual';
                
                const highlightBg = isManualMatched
                  ? '#D1FAE5'
                  : isManualMissing
                  ? '#FEF3C7'
                  : isAiMatched
                  ? '#E0F2FE'
                  : '#FFE4E6';
                  
                const highlightText = isManualMatched
                  ? '#047857'
                  : isManualMissing
                  ? '#B45309'
                  : isAiMatched
                  ? '#0369A1'
                  : '#BE123C';

                return (
                  <Text
                    key={sIdx}
                    style={[
                      styles.annotationText,
                      { backgroundColor: highlightBg, color: highlightText }
                    ]}
                  >
                    {seg.text}
                  </Text>
                );
              } else {
                return renderUnannotatedSegment(seg.text, seg.start);
              }
            })}
          </Text>
        </Card>

        {/* Annotations List Panel */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.heading}>Annotations ({filteredAnnotations.length})</Text>
            <Text style={styles.small}>Filter & manage items in this article.</Text>
          </View>

          <View style={styles.panelFilters}>
            {(['all', 'manual', 'ai', 'matched', 'missing'] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => setPanelFilter(f)}
                style={[
                  styles.tab,
                  panelFilter === f && { backgroundColor: colors.pink },
                  { paddingVertical: 6, paddingHorizontal: 10 }
                ]}
              >
                <Text style={[styles.tabText, panelFilter === f && { color: colors.white }]}>
                  {f.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView style={styles.panelList} nestedScrollEnabled>
            {filteredAnnotations.map((item: any, idx: number) => {
              const isManual = item.source === 'manual';
              const text = item.text;
              const vocabulary = item.suggestedVocabulary || item;
              const meaning = vocabulary.meaningVi || (isManual ? '(no meaning)' : '');
              const label = `${item.status} • ${isManual ? 'manual' : 'AI'}`;
              
              return (
                <View key={idx} style={styles.panelItem}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.panelItemWord}>{text}</Text>
                    {meaning ? <Text style={styles.panelItemMeaning}>{meaning}</Text> : null}
                    <Text style={styles.small}>{label} [{item.start}-{item.end}]</Text>
                  </View>
                  {isManual ? (
                    <Pressable
                      onPress={() => {
                        if (item.status === 'matched') {
                          setManualMatchedItems(manualMatchedItems.filter((_, i) => i !== manualMatchedItems.indexOf(item)));
                        } else {
                          setManualMissingItems(manualMissingItems.filter((_, i) => i !== manualMissingItems.indexOf(item)));
                        }
                      }}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setItems(items.filter((x) => x !== item));
                      }}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              );
            })}
            {filteredAnnotations.length === 0 ? (
              <Text style={[styles.small, { textAlign: 'center', marginVertical: 10 }]}>
                No annotations found for this filter.
              </Text>
            ) : null}
          </ScrollView>
        </View>

        <Button
          title={submit.isPending ? 'Submitting...' : 'Submit Reading Article'}
          disabled={submit.isPending}
          onPress={() => submit.mutate()}
          style={styles.submitBtn}
        />

        {/* Floating Selection Toolbar Overlay */}
        {selectionStart !== null && selectionEnd !== null ? (
          <View style={styles.toolbar}>
            <Text style={styles.toolbarText} numberOfLines={1}>
              Selected: "{selectedText}"
            </Text>
            <View style={styles.toolbarActions}>
              <Pressable style={styles.toolbarBtn} onPress={handleLookup} disabled={lookupLoading}>
                <Text style={styles.toolbarBtnText}>
                  {lookupLoading ? '...' : 'Lookup'}
                </Text>
              </Pressable>
              <Pressable style={styles.toolbarBtn} onPress={handleAddManually} disabled={lookupLoading}>
                <Text style={styles.toolbarBtnText}>Add Manual</Text>
              </Pressable>
              <Pressable
                style={[styles.toolbarBtn, styles.toolbarBtnCancel]}
                onPress={() => {
                  setSelectionStart(null);
                  setSelectionEnd(null);
                  setSelectedText('');
                }}
              >
                <Text style={styles.toolbarBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Dictionary Lookup Popover Modal */}
        <Modal
          visible={isLookupOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setIsLookupOpen(false);
            setLookupResult(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.between}>
                <Text style={styles.modalTitle}>Dictionary Entry Matched</Text>
                <Pressable
                  onPress={() => {
                    setIsLookupOpen(false);
                    setLookupResult(null);
                  }}
                >
                  <X size={20} color={colors.secondary} />
                </Pressable>
              </View>

              {lookupResult?.vocabulary ? (
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.lookupWord}>{lookupResult.vocabulary.text}</Text>
                  <Text style={styles.small}>
                    Type: {lookupResult.vocabulary.type} • Level: {lookupResult.vocabulary.level}
                  </Text>
                  <Text style={styles.lookupMeaning}>
                    {lookupResult.vocabulary.meanings?.[0]?.meaningVi || lookupResult.vocabulary.meaningVi}
                  </Text>
                  {lookupResult.vocabulary.meanings?.[0]?.meaningEn ? (
                    <Text style={styles.small}>
                      Definition (EN): {lookupResult.vocabulary.meanings[0].meaningEn}
                    </Text>
                  ) : null}
                </ScrollView>
              ) : null}

              <View style={styles.modalActions}>
                <Button
                  title="Confirm Match & Annotate"
                  variant="blue"
                  onPress={handleConfirmLookup}
                />
                <Button
                  title="Cancel"
                  variant="white"
                  onPress={() => {
                    setIsLookupOpen(false);
                    setLookupResult(null);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Manual Vocabulary Entry Modal */}
        <Modal
          visible={isFormModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setIsFormModalOpen(false);
            setLookupResult(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.between}>
                <Text style={styles.modalTitle}>Manual Annotation Form</Text>
                <Pressable
                  onPress={() => {
                    setIsFormModalOpen(false);
                    setLookupResult(null);
                  }}
                >
                  <X size={20} color={colors.secondary} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.small}>Selected text range: "{selectedText}"</Text>

                {/* Fuzzy suggestions from Lookup */}
                {lookupResult?.suggestions && lookupResult.suggestions.length > 0 ? (
                  <View style={{ marginVertical: 10 }}>
                    <Text style={styles.field}>MATCHED SUGGESTIONS (CLICK TO LINK)</Text>
                    <Text style={styles.small}>We found similar records. Click one to link directly instead of creating a new word:</Text>
                    <View style={{ marginTop: 8 }}>
                      {lookupResult.suggestions.map((vocab: any, index: number) => (
                        <Pressable
                          key={vocab.id || index}
                          onPress={() => handleChooseSuggestion(vocab)}
                          style={styles.suggestionChip}
                        >
                          <Text style={styles.suggestionChipText}>{vocab.text}</Text>
                          <Text style={styles.small}>
                            {vocab.level} • {vocab.type} • {vocab.meanings?.[0]?.meaningVi || vocab.meaningVi}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                <Field label="WORD TYPE">
                  <Choice items={types} value={formType} onChange={setFormType} />
                </Field>

                <Field label="CEFR LEVEL">
                  <Choice items={levels} value={formLevel} onChange={setFormLevel} color={colors.blue} />
                </Field>

                <Field label="VIETNAMESE MEANING">
                  <Input
                    placeholder="e.g. Chúc may mắn"
                    value={formMeaning}
                    onChangeText={setFormMeaning}
                  />
                </Field>

                <Field label="EXAMPLE SENTENCE (ENGLISH, OPTIONAL)">
                  <Input
                    placeholder="e.g. He likes vertical farming."
                    value={formExampleEn}
                    onChangeText={setFormExampleEn}
                  />
                </Field>

                <Field label="VIETNAMESE TRANSLATION">
                  <Input
                    placeholder="e.g. Anh ấy thích canh tác thẳng đứng."
                    value={formExampleVi}
                    onChangeText={setFormExampleVi}
                  />
                </Field>

                {topics && topics.length > 0 ? (
                  <Field label="TOPICS">
                    <View style={styles.topicsContainer}>
                      {topics.map((t: any) => {
                        const isSelected = formTopics.includes(t.id);
                        return (
                          <Pressable
                            key={t.id}
                            onPress={() => {
                              if (isSelected) {
                                setFormTopics(formTopics.filter(id => id !== t.id));
                              } else {
                                setFormTopics([...formTopics, t.id]);
                              }
                            }}
                            style={[styles.topicChip, isSelected && styles.topicChipSelected]}
                          >
                            <Text style={[styles.topicChipText, isSelected && { color: colors.white }]}>
                              {t.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Field>
                ) : null}
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="Save Vocabulary Suggestion"
                  variant="blue"
                  disabled={!formMeaning.trim()}
                  onPress={handleSaveManualForm}
                />
                <Button
                  title="Cancel"
                  variant="white"
                  onPress={() => {
                    setIsFormModalOpen(false);
                    setLookupResult(null);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

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
        title="Preview & Annotate"
        disabled={!title.trim() || !body.trim()}
        onPress={() => setReadingMode('annotate')}
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

            {p.manualMatchedItems && p.manualMatchedItems.length > 0 ? (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEF2F6', paddingTop: 8 }}>
                <Text style={styles.field}>MANUALLY MATCHED ({p.manualMatchedItems.length})</Text>
                {p.manualMatchedItems.map((m: any, idx: number) => (
                  <Text key={idx} style={styles.small}>
                    • <Text style={{ fontWeight: 'bold', color: colors.green }}>{m.text}</Text> ({m.level}) - {m.meaningVi || `(id: ${m.vocabularyId})`}
                  </Text>
                ))}
              </View>
            ) : null}

            {p.manualMissingItems && p.manualMissingItems.length > 0 ? (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEF2F6', paddingTop: 8 }}>
                <Text style={styles.field}>MANUALLY ADDED ({p.manualMissingItems.length})</Text>
                {p.manualMissingItems.map((m: any, idx: number) => {
                  const sv = m.suggestedVocabulary || {};
                  return (
                    <Text key={idx} style={styles.small}>
                      • <Text style={{ fontWeight: 'bold', color: colors.amber }}>{sv.text || m.text}</Text> ({sv.level || 'A1'}) - {sv.meanings?.[0]?.meaningVi || 'Chưa có nghĩa'}
                    </Text>
                  );
                })}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 12,
  },
  modalScroll: {
    marginVertical: 12,
  },
  lookupWord: {
    fontFamily: fonts.bold,
    fontSize: 25,
    color: colors.pinkDark,
  },
  lookupMeaning: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
    marginVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  toolbar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    zIndex: 999,
  },
  toolbarText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.white,
    flex: 1,
    marginRight: 10,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 6,
  },
  toolbarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.pink,
  },
  toolbarBtnText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.white,
  },
  toolbarBtnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  paragraphText: {
    fontSize: 16,
    lineHeight: 28,
    color: colors.ink,
    textAlign: 'justify',
  },
  annotationText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  selectableWord: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  wordSelected: {
    backgroundColor: 'rgba(254, 158, 199, 0.3)',
    borderRadius: 4,
  },
  panel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  panelFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  panelList: {
    maxHeight: 200,
  },
  panelItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  panelItemWord: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.pinkDark,
  },
  panelItemMeaning: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.secondary,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginVertical: 8,
  },
  topicChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  topicChipSelected: {
    backgroundColor: colors.pink,
  },
  topicChipText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.secondary,
  },
  suggestionChip: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    marginBottom: 6,
  },
  suggestionChipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
  },
  normalText: {
    fontSize: 16,
  },
});
