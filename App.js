import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, useColorScheme, Modal, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import { 
  Home, BookOpen, User, Plus, X, Flame, Circle, CheckCircle, Sun, Moon, Save, Trash2, Copy, Eraser, Wind
} from 'lucide-react-native';

export default function App() {
  const systemTheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemTheme === 'dark');
  const [activeTab, setActiveTab] = useState('Home');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // States
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [journalText, setJournalText] = useState('');
  const [inputText, setInputText] = useState(''); 
  const [newNote, setNewNote] = useState('');
  
  // Meditation Timer State
  const [seconds, setSeconds] = useState(600);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => { loadData(); }, []);

  // Timer Logic
  useEffect(() => {
    let interval = null;
    if (isTimerActive && seconds > 0) {
      interval = setInterval(() => setSeconds(s => s - 1), 1000);
    } else if (seconds === 0) {
      setIsTimerActive(false);
      playSound(true);
      Alert.alert("Namaste", "Session complete.");
    }
    return () => clearInterval(interval);
  }, [isTimerActive, seconds]);

  const loadData = async () => {
    try {
      const t = await AsyncStorage.getItem('tasks');
      const h = await AsyncStorage.getItem('habits');
      const j = await AsyncStorage.getItem('journal');
      if (t) setTasks(JSON.parse(t));
      if (h) setHabits(JSON.parse(h));
      if (j) setJournalText(j);
    } catch (e) { console.error("Load error", e); }
  };

  const playSound = async (isSuccess = true) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        isSuccess ? require('./assets/success.mp3') : require('./assets/undo.mp3')
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) await sound.unloadAsync();
      });
    } catch (e) { console.log("Sound file missing in assets"); }
  };

  const progress = useMemo(() => {
    const total = tasks.length + habits.length;
    if (total === 0) return 0;
    const completed = tasks.filter(t => t.completed).length + habits.filter(h => h.completed).length;
    return (completed / total) * 100;
  }, [tasks, habits]);

  // Actions
  const handleAddItem = async (type) => {
    if (!inputText.trim()) return;
    const newItem = { id: Date.now().toString(), text: inputText, completed: false };
    if (type === 'task') {
      const updated = [...tasks, newItem];
      setTasks(updated);
      await AsyncStorage.setItem('tasks', JSON.stringify(updated));
    } else {
      const updated = [...habits, { ...newItem, streak: 0 }];
      setHabits(updated);
      await AsyncStorage.setItem('habits', JSON.stringify(updated));
    }
    setInputText('');
    setShowAddModal(false);
    playSound(true);
  };

  const toggleTask = async (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    await AsyncStorage.setItem('tasks', JSON.stringify(updated));
    playSound(true);
  };

  const completeHabit = async (id) => {
    const updated = habits.map(h => {
      if (h.id === id && !h.completed) {
        playSound(true);
        return { ...h, completed: true, streak: h.streak + 1 };
      }
      return h;
    });
    setHabits(updated);
    await AsyncStorage.setItem('habits', JSON.stringify(updated));
  };

  const undoHabit = async (id) => {
    const updated = habits.map(h => {
      if (h.id === id && h.completed) {
        playSound(false);
        return { ...h, completed: false, streak: Math.max(0, h.streak - 1) };
      }
      return h;
    });
    setHabits(updated);
    await AsyncStorage.setItem('habits', JSON.stringify(updated));
  };

  const deleteItem = async (id, type) => {
    playSound(false);
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

  // Journal Actions
  const saveJournal = async () => {
    if (!newNote.trim()) return;
    const timestamp = new Date().toLocaleString();
    const fullEntry = journalText ? `${journalText}\n\n[${timestamp}]\n${newNote}` : `[${timestamp}]\n${newNote}`;
    setJournalText(fullEntry);
    await AsyncStorage.setItem('journal', fullEntry);
    setNewNote('');
    playSound(true);
  };

  const copyJournal = async () => {
    const cleanText = journalText.replace(/\[.*?\]/g, '').trim();
    await Clipboard.setStringAsync(cleanText);
    Alert.alert("Copied", "Journal copied without timestamps.");
  };

  const clearJournal = () => {
    Alert.alert("Clear", "Delete all entries?", [
      { text: "Cancel" },
      { text: "Delete", onPress: async () => { setJournalText(''); await AsyncStorage.removeItem('journal'); playSound(false); }}
    ]);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>FocusFlow</Text>
        <TouchableOpacity onPress={() => setIsDark(!isDark)}>
          {isDark ? <Sun color="#F6B93B" size={26} /> : <Moon color="#55BCF6" size={26} />}
        </TouchableOpacity>
      </View>

      {/* --- HOME TAB --- */}
      {activeTab === 'Home' && (
        <View style={{flex: 1}}>
          <View style={styles.progressSection}>
            <View style={styles.progressContainer}><View style={[styles.progressBarFill, { width: `${progress}%` }]} /></View>
            <Text style={[styles.progressText, {color: theme.text}]}>{Math.round(progress)}% Complete</Text>
          </View>
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionLabel}>Habits (Hold to Undo)</Text>
            {habits.map(h => (
              <TouchableOpacity key={h.id} onPress={() => !h.completed && completeHabit(h.id)} onLongPress={() => h.completed && undoHabit(h.id)} style={[styles.card, {backgroundColor: theme.card}]}>
                {h.completed ? <CheckCircle size={24} color="#7ED321" /> : <Flame size={24} color="#888" />}
                <Text style={[styles.cardText, {color: theme.text, textDecorationLine: h.completed ? 'line-through' : 'none'}]}>{h.text}</Text>
                <Text style={styles.streakText}>{h.streak}🔥</Text>
                <TouchableOpacity onPress={() => deleteItem(h.id, 'habit')}><Trash2 size={18} color="#FF5252" /></TouchableOpacity>
              </TouchableOpacity>
            ))}
            <Text style={styles.sectionLabel}>Tasks</Text>
            {tasks.map(t => (
              <TouchableOpacity key={t.id} onPress={() => toggleTask(t.id)} style={[styles.card, {backgroundColor: theme.card}]}>
                {t.completed ? <CheckCircle size={24} color="#7ED321" /> : <Circle size={24} color="#55BCF6" />}
                <Text style={[styles.cardText, {color: theme.text, textDecorationLine: t.completed ? 'line-through' : 'none'}]}>{t.text}</Text>
                <TouchableOpacity onPress={() => deleteItem(t.id, 'task')}><Trash2 size={18} color="#FF5252" /></TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* --- ZEN TAB --- */}
      {activeTab === 'Zen' && (
        <View style={styles.tabContent}>
          <View style={[styles.timerCircle, {borderColor: isTimerActive ? '#55BCF6' : '#444'}]}>
            <Text style={[styles.timerText, {color: theme.text}]}>{formatTime(seconds)}</Text>
            <Wind color="#55BCF6" size={20} />
          </View>
          <View style={styles.timerControls}>
            <TouchableOpacity style={[styles.playBtn, {backgroundColor: isTimerActive ? '#FF5252' : '#55BCF6'}]} onPress={() => setIsTimerActive(!isTimerActive)}>
              <Text style={styles.btnTxt}>{isTimerActive ? "Pause" : "Start Session"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {setSeconds(600); setIsTimerActive(false);}} style={styles.resetBtn}><Text style={{color: '#888'}}>Reset</Text></TouchableOpacity>
          </View>
          <Text style={styles.sectionLabel}>WPI Soundscapes</Text>
          {['Deep Breath', 'Peaceful Mind', 'Ocean Focus'].map((s, i) => (
            <View key={i} style={[styles.card, {backgroundColor: theme.card}]}>
              <Text style={{color: theme.text, flex: 1}}>{s}</Text>
              <Plus size={18} color="#55BCF6" />
            </View>
          ))}
        </View>
      )}

      {/* --- JOURNAL TAB --- */}
      {activeTab === 'Journal' && (
        <View style={styles.tabContent}>
          <View style={[styles.journalDisplay, {backgroundColor: theme.card}]}>
            <ScrollView><Text style={{color: theme.text, padding: 15}}>{journalText || "Log your journey..."}</Text></ScrollView>
            <View style={styles.journalFooter}>
              <TouchableOpacity onPress={copyJournal} style={styles.jBtn}><Copy size={16} color="#55BCF6" /><Text style={styles.jBtnTxt}>Copy</Text></TouchableOpacity>
              <TouchableOpacity onPress={clearJournal} style={styles.jBtn}><Eraser size={16} color="#FF5252" /><Text style={[styles.jBtnTxt, {color: '#FF5252'}]}>Clear</Text></TouchableOpacity>
            </View>
          </View>
          <TextInput multiline value={newNote} onChangeText={setNewNote} placeholder="Type here..." placeholderTextColor="#888" style={[styles.journalInput, {backgroundColor: theme.card, color: theme.text}]} />
          <TouchableOpacity style={styles.saveBtn} onPress={saveJournal}><Save color="white" size={20}/><Text style={styles.btnTxt}>Save Entry</Text></TouchableOpacity>
        </View>
      )}

      {/* --- PROFILE TAB --- */}
      {activeTab === 'Profile' && (
        <View style={styles.center}><User size={50} color="#888" /><Text style={{color: theme.text, marginTop: 10}}>Friend Feed Coming Soon</Text></View>
      )}

      {/* FAB & MODAL */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}><Plus color="white" size={32} /></TouchableOpacity>
      
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <TextInput style={[styles.modalInput, {backgroundColor: theme.bg, color: theme.text}]} placeholder="Goal name..." placeholderTextColor="#888" value={inputText} onChangeText={setInputText} autoFocus />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => handleAddItem('task')} style={[styles.choiceBtn, {backgroundColor: '#55BCF6'}]}><Text style={styles.btnTxt}>+ Task</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleAddItem('habit')} style={[styles.choiceBtn, {backgroundColor: '#FF4500'}]}><Text style={styles.btnTxt}>+ Habit</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn}><X color="#888" size={30}/></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TAB BAR */}
      <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
        <TabItem label="Home" icon={<Home color={activeTab === 'Home' ? '#55BCF6' : '#888'} />} onPress={() => setActiveTab('Home')} active={activeTab === 'Home'} />
        <TabItem label="Zen" icon={<Wind color={activeTab === 'Zen' ? '#55BCF6' : '#888'} />} onPress={() => setActiveTab('Zen')} active={activeTab === 'Zen'} />
        <TabItem label="Journal" icon={<BookOpen color={activeTab === 'Journal' ? '#55BCF6' : '#888'} />} onPress={() => setActiveTab('Journal')} active={activeTab === 'Journal'} />
        <TabItem label="Feed" icon={<User color={activeTab === 'Profile' ? '#55BCF6' : '#888'} />} onPress={() => setActiveTab('Profile')} active={activeTab === 'Profile'} />
      </View>
    </View>
  );
}

// Sub-component to prevent focus loss issues
const TabItem = ({label, icon, onPress, active}) => (
  <TouchableOpacity onPress={onPress} style={styles.tabItem}>
    {icon}
    <Text style={[styles.tabLabel, {color: active ? '#55BCF6' : '#888'}]}>{label}</Text>
  </TouchableOpacity>
);

const lightTheme = { bg: '#F2F4F7', text: '#1A1A1A', card: '#FFFFFF' };
const darkTheme = { bg: '#0A0A0A', text: '#FFFFFF', card: '#1C1C1E' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '900' },
  progressSection: { paddingHorizontal: 25, marginVertical: 10 },
  progressContainer: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#7ED321' },
  progressText: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  tabContent: { flex: 1, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#55BCF6', marginTop: 15, marginBottom: 8, textTransform: 'uppercase' },
  card: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 10, alignItems: 'center' },
  cardText: { flex: 1, marginLeft: 12, fontSize: 15 },
  streakText: { marginRight: 10, fontSize: 12, fontWeight: 'bold', color: '#888' },
  fab: { position: 'absolute', right: 25, bottom: 110, backgroundColor: '#55BCF6', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 10, zIndex: 10 },
  tabBar: { flexDirection: 'row', height: 90, borderTopLeftRadius: 30, borderTopRightRadius: 30, justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20 },
  tabItem: { alignItems: 'center' },
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 30, borderRadius: 25 },
  modalInput: { padding: 18, borderRadius: 15, fontSize: 16, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  choiceBtn: { flex: 0.48, padding: 18, borderRadius: 15, alignItems: 'center' },
  btnTxt: { color: 'white', fontWeight: 'bold' },
  closeBtn: { alignSelf: 'center', marginTop: 30 },
  journalDisplay: { borderRadius: 15, flex: 0.6, marginBottom: 15 },
  journalFooter: { flexDirection: 'row', justifyContent: 'space-around', padding: 10, borderTopWidth: 0.5, borderTopColor: '#444' },
  jBtn: { flexDirection: 'row', alignItems: 'center' },
  jBtnTxt: { fontSize: 12, marginLeft: 5, fontWeight: 'bold' },
  journalInput: { padding: 15, borderRadius: 15, height: 100, textAlignVertical: 'top', marginBottom: 10 },
  saveBtn: { backgroundColor: '#7ED321', padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  timerCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 3, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginVertical: 30 },
  timerText: { fontSize: 44, fontWeight: 'bold' },
  timerControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  playBtn: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, marginRight: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});