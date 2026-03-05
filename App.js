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
  CheckCircle, Circle, Flame, Moon, Sun, Plus, Trash2, Copy, Save, Eraser
} from 'lucide-react-native';

export default function App() {
  const systemTheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemTheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  // --- ALL STATE ---
  const [inputText, setInputText] = useState('');
  const [newNote, setNewNote] = useState('');
  const [journalText, setJournalText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);

  // --- LOAD DATA ON START ---
  useEffect(() => {
    const loadAllData = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem('tasks');
        const savedHabits = await AsyncStorage.getItem('habits');
        const savedJournal = await AsyncStorage.getItem('journal');
        
        if (savedTasks) setTasks(JSON.parse(savedTasks));
        if (savedJournal) setJournalText(savedJournal);
        
        if (savedHabits) {
          let parsedHabits = JSON.parse(savedHabits);
          const today = new Date().toDateString();
          // Reset habits for the new day
          const updated = parsedHabits.map(h => 
            h.lastResetDate !== today ? { ...h, completed: false, lastResetDate: today } : h
          );
          setHabits(updated);
        }
      } catch (e) { console.log("Load Error"); }
    };
    loadAllData();
  }, []);

  // --- SOUND LOGIC ---
  const playSuccessSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(require('./assets/success.wav'));
      await sound.playAsync();
    } catch (e) { console.log("Success sound missing"); }
  };

  const playUndoSound = async () => {
    try {
      // If you don't have undo.mp3 yet, this will fail safely without crashing
      const { sound } = await Audio.Sound.createAsync(require('./assets/shame-1.mp3'));
      await sound.playAsync();
    } catch (e) { console.log("Undo sound file missing in assets"); }
  };

  // --- PROGRESS CALCULATION ---
  const totalItems = tasks.length + habits.length;
  const completedItems = tasks.filter(t => t.completed).length + habits.filter(h => h.completed).length;
  const progress = totalItems === 0 ? 0 : (completedItems / totalItems) * 100;

  // --- HANDLERS ---
  const handleCreate = async (type) => {
    if (!inputText.trim()) return;
    const cleanContent = inputText.trim();

    if (type === 'task') {
      const updated = [...tasks, { id: Date.now(), text: cleanContent, completed: false }];
      setTasks(updated);
      await AsyncStorage.setItem('tasks', JSON.stringify(updated));
    } else {
      const updated = [...habits, { 
        id: Date.now(), text: cleanContent, completed: false, streak: 0, 
        lastResetDate: new Date().toDateString(), lastCompletedDate: '' 
      }];
      setHabits(updated);
      await AsyncStorage.setItem('habits', JSON.stringify(updated));
    }
    // FIX: Input reset happens after storage is set
    setInputText(''); 
  };

  const toggleHabit = async (id) => {
    const today = new Date().toDateString();
    const yesterday = new Date(); 
    yesterday.setDate(yesterday.getDate() - 1);
    
    const updated = habits.map(h => {
      if (h.id === id && !h.completed) {
        playSuccessSound();
        const isContinuous = h.lastCompletedDate === yesterday.toDateString();
        return { ...h, completed: true, streak: isContinuous ? h.streak + 1 : 1, lastCompletedDate: today };
      }
      return h;
    });
    setHabits(updated);
    await AsyncStorage.setItem('habits', JSON.stringify(updated));
  };

  const undoHabit = async (id) => {
    playUndoSound();
    const updated = habits.map(h => 
      h.id === id ? { ...h, completed: false, streak: Math.max(0, h.streak - 1) } : h
    );
    setHabits(updated);
    await AsyncStorage.setItem('habits', JSON.stringify(updated));
    Alert.alert("Undo", "Habit status reversed.");
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

  // --- JOURNAL LOGIC ---
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
    // FIX: Removes timestamps like "--- 3/5/2026, 3:00 PM ---" from the clipboard string
    const cleanText = journalText.replace(/--- .*? ---/g, '').trim();
    await Clipboard.setStringAsync(cleanText);
    Alert.alert("Copied", "Journal history copied (dates hidden)!");
  };

  const clearJournal = () => {
    Alert.alert("Clear Journal", "Delete all entries permanently?", [
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
          
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>FocusFlow</Text>
              <Text style={{color: '#888'}}>Keep pushing forward.</Text>
            </View>
            <TouchableOpacity onPress={() => setIsDark(!isDark)} style={styles.iconBtn}>
              {isDark ? <Sun color="#F6B93B" size={26} /> : <Moon color="#55BCF6" size={26} />}
            </TouchableOpacity>
          </View>

          {/* PROGRESS */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={[styles.progressText, {color: theme.text}]}>{Math.round(progress)}% Daily Progress</Text>
          </View>

          <Text style={styles.sectionHeader}>Habits (Hold to Undo)</Text>
          {habits.map(h => (
            <TouchableOpacity 
              key={h.id} 
              onPress={() => !h.completed && toggleHabit(h.id)} 
              onLongPress={() => h.completed && undoHabit(h.id)}
              style={[styles.card, { backgroundColor: theme.card }]}
            >
              <Flame size={20} color={h.completed ? "#FF4500" : "#888"} />
              <Text style={[styles.cardText, { color: theme.text, textDecorationLine: h.completed ? 'line-through' : 'none' }]}>{h.text}</Text>
              <Text style={{color: '#888', marginRight: 10, fontWeight: 'bold'}}>{h.streak}🔥</Text>
              <TouchableOpacity onPress={() => deleteItem(h.id, 'habit')}><Trash2 size={18} color="#FF5252" /></TouchableOpacity>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionHeader}>Tasks</Text>
          {tasks.filter(t => !t.completed).map(t => (
            <TouchableOpacity key={t.id} onPress={() => toggleTask(t.id)} style={[styles.card, { backgroundColor: theme.card }]}>
              <Circle size={20} color="#55BCF6" />
              <Text style={[styles.cardText, { color: theme.text }]}>{t.text}</Text>
              <TouchableOpacity onPress={() => deleteItem(t.id, 'task')}><Trash2 size={18} color="#FF5252" /></TouchableOpacity>
            </TouchableOpacity>
          ))}

          {tasks.some(t => t.completed) && <Text style={[styles.sectionHeader, { color: '#888' }]}>Completed</Text>}
          {tasks.filter(t => t.completed).map(t => (
            <TouchableOpacity key={t.id} onPress={() => toggleTask(t.id)} style={[styles.card, { backgroundColor: theme.card, opacity: 0.5 }]}>
              <CheckCircle size={20} color="#7ED321" />
              <Text style={[styles.cardText, { color: theme.text, textDecorationLine: 'line-through' }]}>{t.text}</Text>
              <TouchableOpacity onPress={() => deleteItem(t.id, 'task')}><Trash2 size={18} color="#FF5252" /></TouchableOpacity>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionHeader}>Journal Log</Text>
          <View style={[styles.journalBox, { backgroundColor: theme.card }]}>
            <ScrollView style={{maxHeight: 180}} nestedScrollEnabled={true}>
              <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>{journalText || "No logs yet."}</Text>
            </ScrollView>
            <View style={styles.journalActions}>
              <TouchableOpacity onPress={copyCleanJournal} style={styles.actionBtn}>
                <Copy size={16} color="#55BCF6" /><Text style={styles.actionTxt}>Copy Clean</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearJournal} style={styles.actionBtn}>
                <Eraser size={16} color="#FF5252" /><Text style={[styles.actionTxt, {color: '#FF5252'}]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.noteInputWrapper, { backgroundColor: theme.card }]}>
            <TextInput multiline placeholder="Log a note..." placeholderTextColor="#888" style={[styles.noteInput, { color: theme.text }]} value={newNote} onChangeText={setNewNote} />
            <TouchableOpacity onPress={saveJournalEntry} style={styles.saveBtn}><Save color="white" size={20} /></TouchableOpacity>
          </View>
          <View style={{height: 120}} />
        </ScrollView>

        {/* INPUT BAR */}
        <View style={[styles.inputBar, { backgroundColor: theme.card }]}>
          <TextInput style={[styles.mainInput, { backgroundColor: theme.bg, color: theme.text }]} placeholder="New goal..." placeholderTextColor="#888" value={inputText} onChangeText={setInputText} />
          <TouchableOpacity onPress={() => handleCreate('task')} style={[styles.addBtn, {backgroundColor: '#55BCF6'}]}><Text style={styles.btnTxt}>Task</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => handleCreate('habit')} style={[styles.addBtn, {backgroundColor: '#FF4500', marginLeft: 8}]}><Text style={styles.btnTxt}>Habit</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const lightTheme = { bg: '#F8F9FA', text: '#1A1A1A', card: '#FFFFFF' };
const darkTheme = { bg: '#0F0F0F', text: '#FFFFFF', card: '#1C1C1E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 50, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900' },
  progressContainer: { marginBottom: 20 },
  progressBarBg: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#7ED321' },
  progressText: { fontSize: 12, fontWeight: 'bold', marginTop: 5, alignSelf: 'flex-end' },
  sectionHeader: { fontSize: 11, fontWeight: 'bold', color: '#55BCF6', marginTop: 25, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, marginBottom: 10, elevation: 3 },
  cardText: { flex: 1, marginLeft: 15, fontSize: 16 },
  journalBox: { padding: 15, borderRadius: 18, marginBottom: 15 },
  journalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15, borderTopWidth: 0.5, borderTopColor: '#444', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionTxt: { color: '#55BCF6', marginLeft: 5, fontWeight: 'bold', fontSize: 13 },
  noteInputWrapper: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 15 },
  noteInput: { flex: 1, minHeight: 40 },
  saveBtn: { backgroundColor: '#7ED321', padding: 10, borderRadius: 10 },
  inputBar: { flexDirection: 'row', padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20 },
  mainInput: { flex: 1, padding: 12, borderRadius: 12, marginRight: 8 },
  addBtn: { paddingHorizontal: 15, height: 45, borderRadius: 12, justifyContent: 'center' },
  btnTxt: { color: 'white', fontWeight: 'bold' }
});