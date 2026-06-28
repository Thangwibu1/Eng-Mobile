import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Edit2, Layers, RefreshCw, Sparkles, X } from 'lucide-react-native';
import { api, unwrap } from '../api';
import { Button, Card, Empty, Input, Loading, Pill } from '../components';
import { colors, fonts } from '../theme';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const types = [
  'single_word',
  'compound_word',
  'collocation',
  'phrasal_verb',
  'idiom',
  'fixed_phrase',
  'sentence_pattern',
];

interface AdminReadingAiPanelProps {
  readingId: string;
  reading: any;
}

export function AdminReadingAiPanel({ readingId, reading }: AdminReadingAiPanelProps) {
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [editing, setEditing] = useState<any>(null);
  const [rejecting, setRejecting] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-ai-suggestions', readingId, status],
    queryFn: async () =>
      unwrap<any[]>(
        await api.get(`/admin/readings/${readingId}/ai-suggestions`, {
          params: status === 'all' ? {} : { status },
        })
      ),
    enabled: reading.aiAnalysisStatus !== 'not_started',
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['reading', readingId] });
    qc.invalidateQueries({ queryKey: ['admin-ai-suggestions', readingId] });
  };

  const analyze = useMutation({
    mutationFn: (force: boolean) =>
      api.post(`/admin/readings/${readingId}/ai-analyze`, { force }),
    onSuccess: refresh,
    onError: (e: any) => Alert.alert('AI analysis failed', e.userMessage),
  });

  const reprocess = useMutation({
    mutationFn: () => api.post(`/admin/readings/${readingId}/reprocess`),
    onSuccess: () => {
      refresh();
      Alert.alert('Done', 'Reading spans were reprocessed.');
    },
    onError: (e: any) => Alert.alert('Reprocess failed', e.userMessage),
  });

  const act = useMutation({
    mutationFn: ({
      id,
      action,
      note,
    }: {
      id: string;
      action: string;
      note?: string;
    }) =>
      action === 'reject'
        ? api.post(`/admin/ai-vocabulary-suggestions/${id}/reject`, {
            adminNote: note,
          })
        : api.post(`/admin/ai-vocabulary-suggestions/${id}/approve`),
    onSuccess: () => {
      setRejecting(null);
      setRejectNote('');
      refresh();
    },
    onError: (e: any) => Alert.alert('Action failed', e.userMessage),
  });

  const state = reading.aiAnalysisStatus || 'not_started';

  return (
    <Card style={styles.panel}>
      <View style={styles.headingRow}>
        <Sparkles size={23} color={colors.pinkDark} />
        <View style={styles.flexOne}>
          <Text style={styles.heading}>AI Vocabulary Analysis</Text>
          <Text style={styles.sub}>
            Extract, verify, edit, and import vocabulary.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={state === 'not_started' ? 'Extract with AI' : 'Analyze Changes'}
          icon={<Sparkles size={15} color={colors.white} />}
          disabled={analyze.isPending || state === 'processing'}
          onPress={() => analyze.mutate(false)}
        />
        {state === 'completed' ? (
          <Button
            title="Force Re-analyze"
            variant="white"
            icon={<RefreshCw size={15} color={colors.secondary} />}
            onPress={() => analyze.mutate(true)}
          />
        ) : null}
        <Button
          title="Reprocess Spans"
          variant="blue"
          icon={<Layers size={15} color={colors.white} />}
          onPress={() =>
            Alert.alert(
              'Reprocess spans',
              'Update highlights from approved vocabulary?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reprocess', onPress: () => reprocess.mutate() },
              ]
            )
          }
        />
      </View>

      <View style={styles.stats}>
        <View>
          <Text style={styles.label}>STATUS</Text>
          <Text style={styles.value}>{state.replace('_', ' ')}</Text>
        </View>
        <View>
          <Text style={styles.label}>LAST ANALYZED</Text>
          <Text style={styles.value}>
            {reading.aiAnalyzedAt
              ? new Date(reading.aiAnalyzedAt).toLocaleDateString()
              : 'Never'}
          </Text>
        </View>
      </View>

      {reading.aiAnalysisError ? (
        <Text style={styles.error}>{reading.aiAnalysisError}</Text>
      ) : null}

      {state !== 'not_started' ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {['pending', 'approved', 'rejected', 'all'].map((x) => (
              <Pressable
                key={x}
                onPress={() => setStatus(x)}
                style={[styles.tab, status === x && styles.tabOn]}
              >
                <Text
                  style={[
                    styles.tabText,
                    status === x && { color: colors.white },
                  ]}
                >
                  {x}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {isLoading ? (
            <Loading />
          ) : items.length ? (
            items.map((x: any) => (
              <Suggestion
                key={x.id}
                item={x}
                onEdit={() => setEditing(x)}
                onApprove={() => act.mutate({ id: x.id, action: 'approve' })}
                onReject={() => {
                  setRejecting(x);
                  setRejectNote('');
                }}
              />
            ))
          ) : (
            <Empty title="No suggestions" text="Nothing in this category." />
          )}
        </>
      ) : null}

      <EditSuggestion
        item={editing}
        close={() => setEditing(null)}
        readingId={readingId}
      />
      <RejectSuggestion
        item={rejecting}
        note={rejectNote}
        setNote={setRejectNote}
        close={() => setRejecting(null)}
        submit={() =>
          act.mutate({
            id: rejecting.id,
            action: 'reject',
            note: rejectNote.trim() || undefined,
          })
        }
      />
    </Card>
  );
}

interface SuggestionProps {
  item: any;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function Suggestion({ item, onEdit, onApprove, onReject }: SuggestionProps) {
  return (
    <View style={styles.item}>
      <View style={styles.between}>
        <View>
          <Text style={styles.itemWord}>{item.text}</Text>
          <Text style={styles.type}>
            {item.type?.replace('_', ' ')} • {item.level}
          </Text>
        </View>
        <Pill
          color={
            item.status === 'approved'
              ? colors.green
              : item.status === 'rejected'
              ? colors.danger
              : colors.pinkDark
          }
          background={
            item.status === 'approved'
              ? '#ECFDF5'
              : item.status === 'rejected'
              ? '#FFF1F2'
              : colors.pinkSoft
          }
        >
          {item.status}
        </Pill>
      </View>
      
      <Text style={styles.meaning}>{item.meaningVi}</Text>
      {item.exampleEn ? (
        <Text style={styles.example}>
          “{item.exampleEn}” → {item.exampleVi}
        </Text>
      ) : null}
      
      <View style={styles.badges}>
        <Pill
          color={item.confidence >= 0.8 ? colors.green : colors.amber}
          background={item.confidence >= 0.8 ? '#ECFDF5' : '#FFF8E6'}
        >
          {Math.round(item.confidence * 100)}% confidence
        </Pill>
        <Pill color={colors.secondary} background="#F1F5F9">
          {item.duplicateStatus?.replaceAll('_', ' ')}
        </Pill>
      </View>
      
      <View style={styles.itemActions}>
        {item.status !== 'approved' ? (
          <Button
            title="Approve"
            variant="blue"
            icon={<Check size={14} color={colors.white} />}
            onPress={onApprove}
          />
        ) : null}
        <Button
          title="Edit"
          variant="white"
          icon={<Edit2 size={14} color={colors.secondary} />}
          onPress={onEdit}
        />
        {item.status !== 'rejected' ? (
          <Button
            title="Reject"
            variant="danger"
            icon={<X size={14} color={colors.danger} />}
            onPress={onReject}
          />
        ) : null}
      </View>
    </View>
  );
}

function EditSuggestion({ item, close, readingId }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (item) setForm({ ...item });
  }, [item]);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/ai-vocabulary-suggestions/${item.id}`, {
        text: form.text,
        type: form.type,
        level: form.level,
        meaningVi: form.meaningVi,
        exampleEn: form.exampleEn || null,
        exampleVi: form.exampleVi || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['admin-ai-suggestions', readingId],
      });
      close();
    },
    onError: (e: any) => Alert.alert('Update failed', e.userMessage),
  });

  if (!item) return null;

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.between}>
            <Text style={styles.modalTitle}>Edit Suggestion</Text>
            <Pressable onPress={close}>
              <X size={22} color={colors.secondary} />
            </Pressable>
          </View>
          
          <Text style={styles.label}>WORD / PHRASE</Text>
          <Input
            value={form.text || ''}
            onChangeText={(v) => setForm({ ...form, text: v })}
          />
          
          <Text style={styles.label}>TYPE</Text>
          <ScrollView horizontal contentContainerStyle={styles.optionContainer}>
            {types.map((x) => (
              <Pressable
                key={x}
                onPress={() => setForm({ ...form, type: x })}
                style={[styles.option, form.type === x && styles.optionOn]}
              >
                <Text
                  style={[
                    styles.optionText,
                    form.type === x && { color: colors.white },
                  ]}
                >
                  {x.replace('_', ' ')}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          
          <Text style={styles.label}>LEVEL</Text>
          <View style={styles.levelContainer}>
            {levels.map((x) => (
              <Pressable
                key={x}
                onPress={() => setForm({ ...form, level: x })}
                style={[styles.option, form.level === x && styles.optionOn]}
              >
                <Text
                  style={[
                    styles.optionText,
                    form.level === x && { color: colors.white },
                  ]}
                >
                  {x}
                </Text>
              </Pressable>
            ))}
          </View>
          
          <Text style={styles.label}>VIETNAMESE MEANING</Text>
          <Input
            value={form.meaningVi || ''}
            onChangeText={(v) => setForm({ ...form, meaningVi: v })}
          />
          
          <Text style={styles.label}>ENGLISH EXAMPLE</Text>
          <Input
            value={form.exampleEn || ''}
            onChangeText={(v) => setForm({ ...form, exampleEn: v })}
          />
          
          <Text style={styles.label}>VIETNAMESE EXAMPLE</Text>
          <Input
            value={form.exampleVi || ''}
            onChangeText={(v) => setForm({ ...form, exampleVi: v })}
          />
          
          <Button
            title={save.isPending ? 'Saving...' : 'Save Changes'}
            disabled={save.isPending}
            onPress={() => save.mutate()}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function RejectSuggestion({ item, note, setNote, close, submit }: any) {
  if (!item) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.centerOverlay}>
        <View style={styles.rejectBox}>
          <View style={styles.between}>
            <Text style={styles.modalTitle}>Reject “{item.text}”?</Text>
            <Pressable onPress={close}>
              <X size={22} color={colors.secondary} />
            </Pressable>
          </View>
          <Text style={styles.sub}>
            Add optional feedback for this AI suggestion.
          </Text>
          <Input
            placeholder="Why is this suggestion rejected?"
            value={note}
            onChangeText={setNote}
            multiline
            style={styles.textArea}
          />
          <View style={styles.actions}>
            <Button title="Cancel" variant="white" onPress={close} />
            <Button title="Reject Suggestion" variant="danger" onPress={submit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  panel: {
    marginTop: 25,
    backgroundColor: '#F8FAFC',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
  },
  sub: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.secondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginVertical: 16,
  },
  stats: {
    flexDirection: 'row',
    gap: 30,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 5,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  error: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.danger,
    backgroundColor: '#FFF1F2',
    padding: 12,
    borderRadius: 13,
    marginTop: 10,
  },
  tabs: {
    gap: 7,
    marginVertical: 15,
  },
  tab: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E8EDF3',
  },
  tabOn: {
    backgroundColor: colors.pink,
  },
  tabText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.secondary,
    textTransform: 'capitalize',
  },
  item: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemWord: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.pinkDark,
  },
  type: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  meaning: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 9,
  },
  example: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.secondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: '#0F172A99',
    justifyContent: 'flex-end',
  },
  centerOverlay: {
    flex: 1,
    backgroundColor: '#0F172A99',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 40,
  },
  rejectBox: {
    backgroundColor: colors.white,
    borderRadius: 25,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.ink,
  },
  option: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  optionOn: {
    backgroundColor: colors.pink,
  },
  optionText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: colors.secondary,
  },
  optionContainer: {
    gap: 6,
  },
  levelContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
