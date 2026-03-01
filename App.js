import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { useAppStore } from './store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const store = useAppStore();
  const [newTodo, setNewTodo] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  
  // Calculate current progress percentage
  const progress = store.getProgress();

  async function playSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/buttons/sounds/button-10.mp3' } 
      );
      await sound.playAsync();
    } catch (error) {
      console.log("Sound error:", error);
    }
  }

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Enable notifications for reminders!');
      }
    })();
  }, []);

  const scheduleReminder = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Focusflow Reminder 🎯",
        body: "Check your habits and finish your progress bar!",
      },
      trigger: { seconds: 5 }, 
    });
    Alert.alert("Reminder Set", "Notification in 5 seconds!");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Focusflow</Text>
          <TouchableOpacity onPress={scheduleReminder} style={styles.bellBtn}>
            <Text>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* PROGRESS BAR */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.label}>Today's Focus</Text>
            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
        
        {/* HABITS SECTION */}
        <View style={styles.section}>
          <Text style={styles.label}>Habits(Long press to undo)</Text>
          {store.habits.map(h => (
            <View key={h.id} style={styles.itemRow}>
              <TouchableOpacity 
                onLongPress={() => { store.undoHabit(h.id); playSound(); }}
                onPress={() => { store.toggleHabit(h.id); playSound(); }} 
                style={[styles.card, h.lastCompleted === new Date().toISOString().split('T')[0] && styles.done]}
              >
                <Text style={styles.cardText}>{h.title} (🔥 {h.streak})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => store.deleteHabit(h.id)} style={styles.delBtn}>
                <Text style={styles.delText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TextInput 
            style={styles.input} 
            placeholder="+ New Habit" 
            onSubmitEditing={(e) => { store.addHabit(e.nativeEvent.text); e.currentTarget.clear(); }}
          />
        </View>

        {/* TODO SECTION */}
        <View style={styles.section}>
          <Text style={styles.label}>Tasks</Text>
          {store.todos.map(t => (
            <View key={t.id} style={styles.itemRow}>
              <TouchableOpacity onPress={() => { store.toggleTodo(t.id); playSound(); }} style={styles.todo}>
                <View style={[styles.circle, t.completed && styles.circleFilled]} />
                <Text style={[styles.todoText, t.completed && styles.strike]}>{t.task}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => store.deleteTodo(t.id)}>
                <Text style={styles.delText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TextInput 
            style={styles.input} 
            placeholder="Add a task..." 
            value={newTodo}
            onChangeText={setNewTodo}
            onSubmitEditing={() => { if(newTodo) { store.addTodo(newTodo); setNewTodo(''); } }}
          />
        </View>

        {/* JOURNAL SECTION */}
        <View style={styles.section}>
          <Text style={styles.label}>Journal</Text>
          <TextInput 
            style={styles.journalInput} 
            multiline 
            placeholder="What's on your mind?" 
            value={currentNote}
            onChangeText={setCurrentNote}
          />
          <TouchableOpacity 
            onPress={() => { store.saveNote(currentNote); setCurrentNote(''); playSound(); }} 
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>Save Entry</Text>
          </TouchableOpacity>

          {store.notes.map(n => (
            <View key={n.id} style={styles.noteCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteDate}>{n.date}</Text>
                <Text style={styles.noteText}>{n.text}</Text>
              </View>
              <TouchableOpacity onPress={() => store.deleteNote(n.id)}>
                <Text style={styles.delText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 25 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#1A1A1A' },
  bellBtn: { backgroundColor: '#E0E0E0', padding: 8, borderRadius: 10 },
  progressSection: { marginBottom: 30, backgroundColor: '#FFF', padding: 20, borderRadius: 20, elevation: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressText: { fontWeight: 'bold', color: '#007AFF' },
  progressBarBg: { height: 10, backgroundColor: '#EEE', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#007AFF' },
  section: { marginBottom: 35 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  card: { flex: 1, backgroundColor: '#FFF', padding: 18, borderRadius: 15, elevation: 3 },
  done: { backgroundColor: '#D4EDDA' },
  cardText: { fontSize: 16, fontWeight: '600' },
  delBtn: { marginLeft: 15, padding: 5 },
  delText: { color: '#FF5252', fontSize: 20, fontWeight: 'bold' },
  todo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#007AFF', marginRight: 12 },
  circleFilled: { backgroundColor: '#007AFF' },
  todoText: { fontSize: 16 },
  strike: { textDecorationLine: 'line-through', color: '#BBB' },
  input: { borderBottomWidth: 1, borderColor: '#DDD', paddingVertical: 10, marginTop: 5 },
  journalInput: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, height: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 12, marginTop: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  noteCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  noteDate: { fontSize: 10, color: '#AAA' },
  noteText: { fontSize: 14, color: '#333' }
});