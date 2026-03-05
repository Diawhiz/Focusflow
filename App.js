import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, useColorScheme, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import { 
  CheckCircle, Circle, Flame, Moon, Sun, Trash2, Copy, Save, Eraser
} from 'lucide-react-native';

export default function App() {
  const systemTheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemTheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  // --- APP STATE ---
  const [inputText, setInputText] = useState('');
  const [newNote, setNewNote] = useState('');
  const [journalText, setJournalText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);

  // --- VERSION 1.1 INITIALIZATION ---
  useEffect(() => {
    const startup = async () => {
      await loadData();
    };
    startup();
  }, []);

  const loadData = async () => {
    try {
      const savedTasks = await AsyncStorage.getItem('tasks');
      const savedHabits = await AsyncStorage.getItem('habits');
      const savedJournal = await AsyncStorage.getItem('journal');
      
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      if (savedJournal) setJournalText(savedJournal);
      
      if (savedHabits) {
        let parsedHabits = JSON.parse(savedHabits);
        const today = new Date().toDateString();
        // Daily Auto-Reset Logic
        const updated = parsedHabits.map(h => 
          h.lastResetDate !== today ? { ...h, completed: false, lastResetDate: today } : h
        );
        setHabits(updated);
      }
    } catch (e) { console.log("Load Error v1.1"); }
  };

  // --- AUDIO ENGINE ---
  const playSuccessSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(require('./assets/success.wav'));
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (s) => { if (s.didJustFinish) await sound.unloadAsync(); });
    } catch (e) { console.log("Success audio missing"); }
  };

  const playUndoSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(require('./assets/shame-1.mp3'));
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (s) => { if (s.didJustFinish) await sound.unloadAsync(); });
    } catch (e) { console.log("Undo audio missing"); }
  };

  // --- LOGIC CALCULATIONS ---
  const totalItems = tasks.length + habits.length;
  const completedItems = tasks.filter(t => t.completed).length + habits.filter(h => h.completed).length;
  const progress = totalItems === 0 ? 0 : (completedItems / totalItems) * 100;

  // --- HANDLERS ---
  const handleCreate = async (type) => {
    if (!inputText.trim()) return;
    const content = inputText.trim();

    if (type === 'task') {
      const updated = [...tasks, { id: Date.now(), text: content, completed: false }];
      setTasks(updated);
      await AsyncStorage.setItem('tasks', JSON.stringify(updated));
    } else {
      const updated = [...habits, { 
        id: Date.now(), text: content, completed: false, streak: 0, 
        lastResetDate: new Date().toDateString(), lastCompletedDate: '' 
      }];
      setHabits(updated);
      await AsyncStorage.setItem('habits', JSON.stringify(updated));
    }
    setInputText(''); 
  };

  const toggleHabit = async (id) => {
    const today = new Date().toDateString();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const updated = habits.map(h => {
      if (h.id === id && !h.completed) {
        playSuccessSound();
        const continued = h.lastCompletedDate === yesterday.toDateString();
        return { ...h, completed: true, streak: continued ? h.streak + 1 : 1, lastCompletedDate: today };
      }
      return h;
    });
    setHabits(updated);
    await AsyncStorage.setItem('habits', JSON.stringify(updated));
  };

  const undoHabit = async (id) => {
    playUndoSound();
    const updated = habits.map(h => h.id === id ? { ...h, completed: false, streak: Math.max(0, h.streak - 1) } : h);
    setHabits(updated);
    await AsyncStorage.setItem('habits', JSON.stringify(updated));
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task.completed) playSuccessSound(); else playUndoSound();
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    await AsyncStorage.setItem('tasks', JSON.stringify(updated));
  };

  const deleteItem = async (id, type) => {
    playUndoSound();
    if (type === 'task') {
      const updated = tasks.filter(t => t.id !== id);
      setTasks(updated);
      await AsyncStorage.setItem('tasks', JSON.stringify(updated));
    } else {
      const updated = habits.filter(h => h.id !== id);
      setHabits(updated);
      await AsyncStorage.setItem('habits', JSON.stringify(updated));
    }
  };

  const saveJournalEntry = async () => {
    if (!newNote.trim()) return;
    const timestamp = new Date().toLocaleString();
    const updated = journalText ? `${journalText}\n\n--- ${timestamp} ---\n${newNote}` : `--- ${timestamp} ---\n${newNote}`;
    setJournalText(updated);
    setNewNote('');
    await AsyncStorage.setItem('journal', updated);
    playSuccessSound();
  };

  const copyCleanJournal = async () => {
    if (!journalText) return;
    const cleanText = journalText.replace(/--- .*? ---/g, '').trim();
    await Clipboard.setStringAsync(cleanText);
    Alert.alert("Copied", "Journal text copied without timestamps.");
  };

  const clearJournal = () => {
    Alert.alert("Clear Journal", "Wipe all entries?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setJournalText('');
        await AsyncStorage.removeItem('journal');
        playUndoSound();
      }}
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} nestedScrollEnabled={true}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>FocusFlow</Text>
              <Text style={{color: '#888'}}>Your Growth Companion</Text>
            </View>
            <TouchableOpacity onPress={() => setIsDark(!isDark)}>
              {isDark ? <Sun color="#F6B93B" size={28} /> : <Moon color="#55BCF6" size={28} />}
            </TouchableOpacity>
          </View>

          {/* PROGRESS BAR */}
          <View style={styles.progressSection}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={[styles.progressText, {color: theme.text}]}>{Math.round(progress)}% Complete</Text>
          </View>

          {/* HABITS */}
          <Text style={styles.sectionLabel}>Habits (Hold to Undo)</Text>
          {habits.map(h => (
            <TouchableOpacity 
              key={h.id} 
              onPress={() => !h.completed && toggleHabit(h.id)} 
              onLongPress={() => h.completed && undoHabit(h.id)}
              style={[styles.card, { backgroundColor: theme.card }]}
            >
              <Flame size={20} color={h.completed ? "#FF4500" : "#888"} />
              <Text style={[styles.cardText, { color: theme.text, textDecorationLine: h.completed ? 'line-through' : 'none' }]}>{h.text}</Text>
              <Text style={styles.streakLabel}>{h.streak}🔥</Text>
              <TouchableOpacity onPress={() => deleteItem(h.id, 'habit')}><Trash2 size={18} color="#FF5252" /></TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* TASKS */}
          <Text style={styles.sectionLabel}>Tasks</Text>
          {tasks.filter(t => !t.completed).map(t => (
            <TouchableOpacity key={t.id} onPress={() => toggleTask(t.id)} style={[styles.card, { backgroundColor: theme.card }]}>
              <Circle size={20} color="#55BCF6" />
              <Text style={[styles.cardText, { color: theme.text }]}>{t.text}</Text>
              <TouchableOpacity onPress={() => deleteItem(t.id, 'task')}><Trash2 size={18} color="#FF5252" /></TouchableOpacity>
            </TouchableOpacity>
          ))}

          {tasks.some(t => t.completed) && <Text style={[styles.sectionLabel, { color: '#888' }]}>Done</Text>}
          {tasks.filter(t => t.completed).map(t => (
            <TouchableOpacity key={t.id} onPress={() => toggleTask(t.id)} style={[styles.card, { backgroundColor: theme.card, opacity: 0.5 }]}>
              <CheckCircle size={20} color="#7ED321" />
              <Text style={[styles.cardText, { color: theme.text, textDecorationLine: 'line-through' }]}>{t.text}</Text>
              <TouchableOpacity onPress={() => deleteItem(t.id, 'task')}><Trash2 size={18} color="#FF5252" /></TouchableOpacity>
            </TouchableOpacity>
          ))}

          {/* JOURNAL */}
          <Text style={styles.sectionLabel}>Journal Log</Text>
          <View style={[styles.journalContainer, { backgroundColor: theme.card }]}>
            <ScrollView style={{maxHeight: 150}} nestedScrollEnabled={true}>
              <Text style={{ color: theme.text }}>{journalText || "No notes saved."}</Text>
            </ScrollView>
            <View style={styles.journalFooter}>
              <TouchableOpacity onPress={copyCleanJournal} style={styles.journalBtn}>
                <Copy size={14} color="#55BCF6" /><Text style={styles.journalBtnTxt}>Copy Clean</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearJournal} style={styles.journalBtn}>
                <Eraser size={14} color="#FF5252" /><Text style={[styles.journalBtnTxt, {color: '#FF5252'}]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.noteRow, { backgroundColor: theme.card }]}>
            <TextInput multiline placeholder="Daily thought..." placeholderTextColor="#888" style={[styles.noteInput, { color: theme.text }]} value={newNote} onChangeText={setNewNote} />
            <TouchableOpacity onPress={saveJournalEntry} style={styles.saveBtn}><Save color="white" size={20} /></TouchableOpacity>
          </View>
          <View style={{height: 200}} />
        </ScrollView>

        {/* --- VERSION 1.1 VERTICAL INPUT BAR --- */}
        <View style={[styles.footerArea, { backgroundColor: theme.card }]}>
          <TextInput 
            style={[styles.fullInput, { backgroundColor: theme.bg, color: theme.text }]} 
            placeholder="New goal..." 
            placeholderTextColor="#888" 
            value={inputText} 
            onChangeText={setInputText} 
          />
          <View style={styles.buttonStack}>
            <TouchableOpacity onPress={() => handleCreate('task')} style={[styles.bigBtn, {backgroundColor: '#55BCF6'}]}>
              <Text style={styles.btnLabel}>Add to Tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleCreate('habit')} style={[styles.bigBtn, {backgroundColor: '#FF4500'}]}>
              <Text style={styles.btnLabel}>Add to Habits</Text>
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

const lightTheme = { bg: '#F5F7FA', text: '#1A1A1A', card: '#FFFFFF' };
const darkTheme = { bg: '#0A0A0A', text: '#FFFFFF', card: '#1C1C1E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900' },
  progressSection: { marginBottom: 25 },
  progressContainer: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#7ED321' },
  progressText: { fontSize: 12, fontWeight: 'bold', marginTop: 5, alignSelf: 'flex-end' },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#55BCF6', marginTop: 20, marginBottom: 10, textTransform: 'uppercase' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, marginBottom: 10, elevation: 2 },
  cardText: { flex: 1, marginLeft: 15, fontSize: 16 },
  streakLabel: { color: '#888', marginRight: 10, fontWeight: 'bold' },
  journalContainer: { padding: 15, borderRadius: 18, marginBottom: 15 },
  journalFooter: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15, borderTopWidth: 0.5, borderTopColor: '#444', paddingTop: 10 },
  journalBtn: { flexDirection: 'row', alignItems: 'center' },
  journalBtnTxt: { color: '#55BCF6', marginLeft: 5, fontWeight: 'bold', fontSize: 12 },
  noteRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 15 },
  noteInput: { flex: 1, minHeight: 40 },
  saveBtn: { backgroundColor: '#7ED321', padding: 10, borderRadius: 10 },
  
  // v1.1 Footer Styles
  footerArea: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 25 },
  fullInput: { width: '100%', padding: 15, borderRadius: 15, fontSize: 16, marginBottom: 15 },
  buttonStack: { flexDirection: 'row', justifyContent: 'space-between' },
  bigBtn: { flex: 0.48, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnLabel: { color: 'white', fontWeight: 'bold' }
});