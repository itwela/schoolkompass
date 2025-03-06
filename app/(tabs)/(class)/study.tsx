import { Pressable, SafeAreaView, ActivityIndicator, ScrollView, StyleSheet, View, Text, Dimensions, Modal, TextInput, Animated, Alert, Keyboard, useColorScheme } from 'react-native';
import { theme } from '@/constants/theme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useClass } from '@/contexts/ClassContext';
import { useQuizzesLocal, useStudyGuidesLocal } from '@/hooks/useDataFetch';
import React, { useRef, useState, useEffect } from 'react';
import { router } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import GoBack from '@/components/GoBack';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { replicate } from '@/constants/clients/replicateClient';
import { genTextForGuide } from '@/prompts/prompts';
import { KeyboardAvoidingView } from 'react-native';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';

export default function ClassScreen() {
  const { selectedClassId, setSelectedClassId, setCurrentStudyGuide, setCurrentQuiz} = useClass();
  const { studyGuides, loading: studyGuidesLoading, error: studyGuideError, addStudyGuide, deleteStudyGuide } = useStudyGuidesLocal(selectedClassId || '');
  const { quizzes, loading: quizzesLoading, error: quizzesError, addQuiz, deleteQuiz } = useQuizzesLocal(selectedClassId || '');
  const [studyGuideModalVisible, setStudyGuideModalVisible] = useState(false);
  const [deleteStudyGuideModalVisible, setStudyGuideDeleteModalVisible] = useState(false);
  
  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [deleteQuizModalVisible, setQuizDeleteModalVisible] = useState(false);
  
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizQuery, setNewQuizQuery] = useState('');

  const [newGuideTitle, setNewGuideTitle] = useState('');
  const [newGuideContent, setNewGuideContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [guideToDelete, setGuideToDelete] = useState<any>();
  const [editingGuide, setEditingGuide] = useState<any>(null);
  const [isEditingStudyGuide, setIsEditingStudyGuide] = useState(false);
  const [isEditingQuiz, setIsEditingQuiz] = useState(false);
  
  const deleteSlideAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const titleInputRef = useRef<TextInput>(null);
  const [studyGuidIsLoading, setStudyGuidIsLoading] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [tab, setTab] = useState('Study Guides')

  useEffect(() => {
    // Configure notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }, []);

  useEffect(() => {
    if (deleteStudyGuideModalVisible) {
      Animated.spring(deleteSlideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }).start();
    } else {
      Animated.spring(deleteSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }).start();
    }
  }, [deleteStudyGuideModalVisible]);

  const showModal = (e: any, guide?: any) => {
    if (guide) {
      setEditingGuide(guide);
      setNewGuideTitle(guide.title);
      setNewGuideContent(guide.text);
      setIsEditingStudyGuide(true);
    } else {
      setEditingGuide(null);
      setNewGuideTitle('');
      setNewGuideContent('');
      setIsEditingStudyGuide(false);
      // Keyboard.scheduleLayoutAnimation(e);
    }

    if (tab === 'Study Guides') {
      setStudyGuideModalVisible(true);
    }

    if (tab === 'Quizzes') {
      setQuizModalVisible(true);
      console.log('showing quizzes')
    }

    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start(() => {
      // Focus the input after animation completes
    });
  };

  const hideModal = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start(() => {
      setStudyGuideModalVisible(false);
      setQuizModalVisible(false);
      setNewGuideTitle('');
      setNewGuideContent('');
      setEditingGuide(null);
      setIsEditingStudyGuide(false);
    });
  };

  // REVIEW
  const structureTextToReadableContent = async () => {
    try {
      const input = {
        prompt: `
        {system_prompt}
        ${genTextForGuide}
        {system_prompt}

        |begin_of_text|
        ${newGuideContent}
        `,

        max_new_tokens: 10000,
        prompt_template: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
      };

      const output = await replicate.run("meta/meta-llama-3-8b-instruct", { input });

      if (Array.isArray(output)) {
        const formattedOutput = output
          .join('')
          .trim()
          // Keep markdown characters and basic text formatting
          .replace(/[^a-zA-Z0-9\s.,!?#*\-_\[\]()]/g, '')
          // Normalize spaces while preserving markdown line breaks
          .replace(/[ \t]+/g, ' ')
          // Ensure proper spacing after punctuation
          .replace(/([.,!?])(\w)/g, '$1 $2')
          // Preserve markdown headers
          .replace(/#+\s*/g, match => match);

        console.log("replicate works!", formattedOutput);
        setNewGuideContent(formattedOutput);
        return formattedOutput;

      } else {
        const cleanOutput = String(output)
          .replace(/[^a-zA-Z0-9\s.,!?#*\-_\[\]()]/g, '')
          .replace(/[ \t]+/g, ' ')
          .replace(/([.,!?])(\w)/g, '$1 $2')
          .replace(/#+\s*/g, match => match);

        console.log("replicate works!", cleanOutput);
        setNewGuideContent(cleanOutput);
        return cleanOutput;

      }
    } catch (error) {
      console.error("Error in testReplicate:", error);
      return null
    }
  };

  // REVIEW
  const convertTextToAudio = async (text: string) => {
    try {
      const input = {
        text: text,
        voice: "af_bella"
      };
  
      console.log("input:", input);
  
      const response = await replicate.run(
        "jaaari/kokoro-82m:f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13", 
        { input }
      );
  
      // Handle the response
      if (response && typeof response === 'object') {
        // Get the URL from the response object
        const audioUrl = response.toString();
        console.log("Audio URL:", audioUrl);
        
        if (!audioUrl) {
          throw new Error('No audio URL in response');
        }     
        // return audioUrl;

        return audioUrl;

      } else if (typeof response === 'string') {
        console.log("Direct audio URL:", response);
        return response;

      } else {
        throw new Error('Invalid response format');
      }
  
    } catch (error) {
      console.error("Error in text-to-speech conversion:", error);
      Alert.alert('Error', 'Failed to convert text to speech');
      return null;
    }

  };

  // TODO
  const audioFileHandling = async (audioUrl: string) => {
    try {
      // Generate a unique file name
      const fileName = `${newGuideTitle.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.wav`;
      const localFileUri = `${FileSystem.documentDirectory}${fileName}`;
  
      // Download the audio file from the URL to local storage
      const downloadResult = await FileSystem.downloadAsync(audioUrl, localFileUri);
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download audio file: ${downloadResult.status}`);
      }
  
      console.log("Audio file downloaded to:", localFileUri);
      return localFileUri;
    } catch (error) {
      console.error("Error handling audio file:", error);
      throw new Error('Failed to process audio file');
    }
  };

  // REVIEW
  const createTimestampsFromAudio = async (fileUri: any) => {
    const whisperInput = {
      audio: fileUri,
    };

    console.log("starting whisper")

    const whisperOutput = await replicate.run("openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e", { input: whisperInput });

    console.log("whisper output", whisperOutput);
    // TODO Parse Whisper output to get timestamps
    const timestamps = (whisperOutput as { segments: Array<{ start: number; end: number; text: string }> }).segments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text
    }));

    console.log("timestamps created", timestamps);

    return timestamps;

  };

  // STUB
  const handleNewStudyGuide = async () => {
    
    try {
      hideModal();
      setStudyGuidIsLoading(true);
  
      console.log("newGuideTitle:", newGuideTitle);
      console.log("newGuideContent:", newGuideContent);
  
      // Structure the text
      const getGoodText = await structureTextToReadableContent();
      if (!getGoodText) throw new Error("Failed to structure text");
  
      console.log("getGoodText:", getGoodText);
  
      // Get the audio URL from Replicate
      const audioUrl = await convertTextToAudio(getGoodText as string);
      if (!audioUrl) throw new Error("Failed to convert text to audio");
  
      console.log("audioUrl:", audioUrl);
  
      // Transcribe audio using the remote URL
      const getTimestamps = await createTimestampsFromAudio(audioUrl);
      if (!getTimestamps) throw new Error("Failed to create timestamps");
  
      // Download audio file locally
      const localAudioFile = await audioFileHandling(audioUrl);
      if (!localAudioFile) throw new Error("Failed to handle audio file");
  
      const newGuide = {
        id: Date.now().toString(),
        title: newGuideTitle.trim(),
        text: newGuideContent.trim(),
        audioFile: localAudioFile, // Local file URI
        timestamps: getTimestamps,
        lastModified: new Date().toLocaleDateString(),
      };
  
      await addStudyGuide(newGuide);
  
      console.log("Study guide created:", newGuide);
  
      setNewGuideTitle('');
      setNewGuideContent('');
      setSelectedFile(null);
  
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Study Guide Created",
          body: "Your study guide was created successfully!",
          data: { 
            guideId: newGuide.id,
            guideTitle: newGuideTitle,
            action: 'study_guide_created'
          },
        },
        trigger: null, // Show immediately
      });

      setStudyGuidIsLoading(false);
    } catch (error) {
      setStudyGuidIsLoading(false);
      console.error("Error creating study guide:", error);
      Alert.alert("Error", "Failed to create study guide");
    }
  };

  // STUB
  const handleNewQuiz = async () => {
    
    try {
      hideModal();
      setStudyGuidIsLoading(true);
  
      console.log("newQuiz:", newQuizTitle);
      console.log("newPromptContent:", newQuizQuery);
  
      // Give quiz questions/ study objectives to ai. The ai will take:
      // Either questions or answers or whatever and return an object that
      // will literally be the multiple choice quiz I can study.
      
      // From here its just rendering on the front end the correct answers,
      // all the answers. etc. I want to be able to toggle to see just the
      // answers, or i want to be able to have like the quiz mode where i sort of
      // try to answer the question and get feedback if its right or wrong etc. 
  
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // await Notifications.scheduleNotificationAsync({
      //   content: {
      //     title: "Quiz Created",
      //     body: "Your study guide was created successfully!",
      //     data: { 
      //       quiz: newGuide.id,
      //       guideTitle: newGuideTitle,
      //       action: 'quiz_created'
      //     },
      //   },
      //   trigger: null, // Show immediately
      // });

      // setStudyGuidIsLoading(false);
    } catch (error) {
      // setStudyGuidIsLoading(false);
      console.error("Error creating quiz:", error);
      Alert.alert("Error", "Failed to quiz");
    }
  };

  const updateStudyGuideTitle = async (guideId: string, newTitle: string) => {
    try {
      // Find the guide to update
      const guideToUpdate = studyGuides?.find(guide => guide.id === guideId);
      
      if (!guideToUpdate) {
        throw new Error('Study guide not found');
      }

      // Create updated guide object
      const updatedGuide = {
        ...guideToUpdate,
        title: newTitle.trim(),
        lastModified: new Date().toLocaleDateString()
      };

      // Update the study guide
      await addStudyGuide(updatedGuide);
      
      // Reset states
      setNewGuideTitle('');
      hideModal();

      return true;
    } catch (error) {
      console.error('Error updating study guide title:', error);
      Alert.alert('Error', 'Failed to update study guide title');
      return false;
    }
  };

  // TODO
  // const handleFileUpload = async () => {
  //   try {
  //     const result = await DocumentPicker.getDocumentAsync({
  //       type: ['text/*', 'application/pdf'],
  //       copyToCacheDirectory: true
  //     });

  //     if (!result.canceled) {
  //       setSelectedFile(result as any);
  //       // TODO: Handle file content processing
  //     }
  //   } catch (error) {
  //     console.error('Error picking document:', error);
  //   }
  // };

  const goBack = () => {
    setCurrentStudyGuide(null)
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: useThemeColor({}, 'background'),
    },
  
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: useThemeColor({}, 'tint'),
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    addButtonText: {
      fontSize: 24,
      color: useThemeColor({}, 'text'),
      fontWeight: '600',
      lineHeight: 28,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: useThemeColor({}, 'text'),
    },
    guideList: {
      flex: 1,
    },
    guideCard: {
      backgroundColor: useThemeColor({}, 'background'),
      borderRadius: 12,
      marginBottom: 16,
      padding: 16,
      shadowColor: useThemeColor({}, 'text'),
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    cardContent: {
      flex: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    guideTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: useThemeColor({}, 'text'),
      flex: 1,
      marginRight: 8,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    editButton: {
      padding: 4,
    },
    deleteButton: {
      padding: 4,
    },
    actionButtonText: {
      fontSize: 16,
    },
    guideDate: {
      fontSize: 12,
      color: useThemeColor({}, 'icon'),
      marginTop: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: useThemeColor({}, 'background'),
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: useThemeColor({}, 'text'),
    },
    modalCloseButton: {
      fontSize: 24,
      color: useThemeColor({}, 'text'),
    },
    modalBody: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: 50
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: useThemeColor({}, 'text'),
    },
    input: {
      borderWidth: 1,
      borderColor: useThemeColor({}, 'icon'),
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: useThemeColor({}, 'text'),
      backgroundColor: useThemeColor({}, 'background'),
    },
    textArea: {
      height: 120,
      textAlignVertical: 'top',
    },
    uploadButton: {
      borderWidth: 1,
      borderColor: useThemeColor({}, 'icon'),
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    uploadButtonText: {
      color: useThemeColor({}, 'text'),
      fontSize: 16,
    },
    submitButton: {
      backgroundColor: useThemeColor({}, 'tint'),
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    submitButtonText: {
      color: useThemeColor({}, 'text'),
      fontSize: 16,
      fontWeight: '600',
    },
    deleteWarningText: {
      fontSize: 16,
      color: useThemeColor({}, 'icon'),
      marginBottom: 20,
      textAlign: 'center',
    },
    markdownPreview: {
      marginVertical: 12,
      paddingHorizontal: 4,
    },
    heading1: {
      fontSize: 24,
      color: useThemeColor({}, 'text'),
      fontWeight: '600',
      marginBottom: 10,
      letterSpacing: -0.5,
    },
    heading2: {
      fontSize: 20,
      color: useThemeColor({}, 'text'),
      fontWeight: '600',
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    paragraph: {
      fontSize: 16,
      color: useThemeColor({}, 'text'),
      lineHeight: 24,
      letterSpacing: 0.2,
    },
    list: {
      marginLeft: 20,
      marginVertical: 8,
    },
    listItem: {
      marginBottom: 5,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    listUnorderedItemIcon: {
      fontSize: 16,
      color: '#007AFF',
      marginRight: 8,
    },
    blockquote: {
      borderLeftWidth: 2,
      borderLeftColor: '#007AFF',
      paddingLeft: 12,
      marginVertical: 8,
      opacity: 0.8,
    },
    code_inline: {
      fontFamily: 'SpaceMono',
      backgroundColor: '#F5F5F5',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    code_block: {
      fontFamily: 'SpaceMono',
      backgroundColor: '#F5F5F5',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    link: {
      color: '#007AFF',
      textDecorationLine: 'underline',
    },
    image: {
      borderRadius: 8,
      marginVertical: 8,
    },
    hr: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#CCCCCC',
      marginVertical: 16,
    },
    deleteConfirmButton: {
      backgroundColor: '#FF3B30',
    },
    deleteCancelButton: {
      backgroundColor: '#8E8E93',
    },
  });

  const markdownStyles = {
    heading1: {
      fontSize: 24,
      color: useThemeColor({}, 'text'),
      fontWeight: '600',
      marginBottom: 10,
    },
    heading2: {
      fontSize: 20,
      color: '#333333',
      fontWeight: '600',
      marginBottom: 8,
    },
    paragraph: {
      fontSize: 16,
      color: useThemeColor({}, 'text'),
      lineHeight: 24,
    },
    list: {
      marginLeft: 20,
    },
    listItem: {
      marginBottom: 5,
    },
    listUnorderedItemIcon: {
      fontSize: 16,
      color: '#007AFF',
    },
  
  
  };

  const studyOptions = [
    {
      label: "Study Guides",
    },
    {
      label: "Quizzes",
    },
  ]


  return (
    <SafeAreaView style={{ width: "100%", height: "100%", backgroundColor: useThemeColor({}, 'background') }}>
      
        <View style={{width: '100%', display: studyGuidIsLoading ? 'flex' : 'none', gap: 15, alignItems: 'center', flexDirection: 'row', height: 100, justifyContent: 'center', borderBottomWidth: 2, marginBottom: 10, borderBottomColor: useThemeColor({}, 'text')}}>
          <ActivityIndicator/>
          <Text style={{color: useThemeColor({}, 'text')}}>
            Your Study Guide is on its way!
          </Text>
        </View>
        
      <View style={styles.container}>

        <View style={[styles.header, {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }]}>
          <GoBack route="/chooseclass" />
          <Pressable style={styles.addButton} onPress={(e) => showModal(e)}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
      
        <View style={[styles.header, {justifyContent: 'flex-start', gap: 15}]}>
          
          {studyOptions.map((option: { label: string }, index: number) => (
            <Pressable
              key={index}
              onPress={() => setTab(option.label)}
              style={[{
                backgroundColor: tab === option.label ? useThemeColor({}, 'tint') : useThemeColor({}, 'background'),
                padding: 10,
                borderRadius: 100,
                borderWidth: 2,
                borderColor: useThemeColor({}, 'tint'),
              }]}
            >
              <Text style={styles.headerTitle}>{option.label}</Text>
            </Pressable>
          ))}

        </View>


        <ScrollView showsVerticalScrollIndicator={false} style={styles.guideList}>
          
          {tab === "Study Guides" && (
            <>
            {studyGuides && studyGuides.length > 0 ? (
              studyGuides?.map((guide) => (
                <Pressable
                  key={guide.id}
                  style={styles.guideCard}
                  onPress={ async () => {
                    setCurrentStudyGuide(guide as any)
                    // NOTE HOW TO MAKE THAT BUTTON PRESS FEEDBACK THING ON APPS
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/(tabs)/(class)/read-listen')
                  }}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      
                      <Text style={styles.guideTitle}>
                        {guide.title}
                      </Text>
                      <View style={styles.actionButtons}>
                      
                        <Pressable
                          onPress={(e) => showModal(e, guide)}
                          style={styles.editButton}
                        >
                          <Text style={styles.actionButtonText}>✏️</Text>
                        </Pressable>
                        
                        <Pressable
                          onPress={() => {
                            setGuideToDelete(guide as any);
                            setStudyGuideDeleteModalVisible(true);
                          }}
                          style={styles.deleteButton}
                        >
                          <Text style={styles.actionButtonText}>🗑️</Text>
                        </Pressable>
    
                      </View>
    
                    </View>
                    <View style={[styles.markdownPreview, { opacity: 0.618 }]}>
                      <Text style={[styles.addButtonText, {fontSize: 12}]}>Preview:</Text>
                      <Markdown style={markdownStyles}>
                        {guide.text.split('\n').slice(0, 8).join('\n')}
                      </Markdown>
                    </View>
                    <Text style={styles.guideDate}>
                      Last modified: {guide.lastModified}
                    </Text>
                  </View>
                </Pressable>
              ))
              ) : (
                <View style={[styles.guideCard, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={[styles.guideTitle, { textAlign: 'center' }]}>
                  No study guides available
                </Text>
              </View>
            )}
            </>
          )}

          {tab === "Quizzes" && (
            <>
              {quizzes && quizzes.length > 0 ? (
                quizzes.map((quiz) => (
                  <Pressable
                    key={quiz.id}
                    style={styles.guideCard}
                    onPress={ async () => {
                      setCurrentQuiz(quiz as any)
                      // NOTE HOW TO MAKE THAT BUTTON PRESS FEEDBACK THING ON APPS
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push('/(tabs)/(class)/read-listen')
                    }}>
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        
                        <Text style={styles.guideTitle}>
                          {quiz.title}
                        </Text>
                        <View style={styles.actionButtons}>
                        
                          <Pressable
                            // onPress={(e) => showModal(e, guide)}
                            style={styles.editButton}
                          >
                            <Text style={styles.actionButtonText}>✏️</Text>
                          </Pressable>
                          
                          <Pressable
                            onPress={() => {
                              // setGuideToDelete(guide as any);
                              // setDeleteModalVisible(true);
                            }}
                            style={styles.deleteButton}
                          >
                            <Text style={styles.actionButtonText}>🗑️</Text>
                          </Pressable>
      
                        </View>
      
                      </View>
                      <View style={[styles.markdownPreview, { opacity: 0.618 }]}>
                        <Text style={[styles.addButtonText, {fontSize: 12}]}>Preview:</Text>
                        <Markdown style={markdownStyles}>
                          {quiz.quizContent?.[0]?.question}
                          {quiz.quizContent?.[0]?.answer}
                        </Markdown>
                      </View>
                      <Text style={styles.guideDate}>
                        Last modified: {quiz.lastModified}
                      </Text>
                    </View>
                  </Pressable>
                ))
                ) : (
                <View style={[styles.guideCard, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={[styles.guideTitle, { textAlign: 'center' }]}>
                    No quizzes available
                  </Text>
                </View>
              )}
            </>
          )}


        </ScrollView>

       
        {/* REVIEW */}
        {/* Add Study Guide Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={studyGuideModalVisible}
          onRequestClose={hideModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable
              style={styles.modalOverlay}
            >
              <Animated.View
                style={[styles.modalContent, {
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0]
                    })
                  }],
                  paddingBottom: 35,
                }]}
              >
                <Pressable onPress={(e) => e.stopPropagation()}>
                 
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{isEditingStudyGuide ? 'Edit Study Guide' : 'Add New Study Guide'}</Text>
                      <Pressable style={{padding: 5}} onPress={hideModal}>
                        <Text style={styles.modalCloseButton}>×</Text>
                      </Pressable>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Title</Text>
                        <TextInput
                          autoFocus
                          style={styles.input}
                          value={newGuideTitle}
                          onChangeText={setNewGuideTitle}
                          placeholder="Enter study guide title"
                          placeholderTextColor="#999999"
                        />
                      </View>

                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Content</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          value={newGuideContent}
                          onChangeText={setNewGuideContent}
                          placeholder="Paste your study guide content here"
                          placeholderTextColor="#999999"
                          multiline
                          numberOfLines={8}
                        />
                      </View>

                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Or Upload a File</Text>
                        <Pressable
                          style={styles.uploadButton}
                          // onPress={handleFileUpload}
                        >
                          <Text style={styles.uploadButtonText}>
                            {selectedFile ? selectedFile : 'Choose File'}
                          </Text>
                        </Pressable>
                      </View>

                        {studyGuidIsLoading === false && (
                          <Pressable
                            style={styles.submitButton}
                            onPress={() => {handleNewStudyGuide()}}
                          >
                            <Text style={styles.submitButtonText}>{isEditingStudyGuide ? 'Save Changes' : 'Add Study Guide'}</Text>
                          </Pressable>
                        )}
                  
                        {studyGuidIsLoading === true && (
                          <Pressable
                            style={styles.submitButton}
                          >
                            <ActivityIndicator/>
                          </Pressable>
                        )}

                    </ScrollView>

                </Pressable>

              </Animated.View>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        {/* Delete Study Guide Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={deleteStudyGuideModalVisible}
          onRequestClose={() => setStudyGuideDeleteModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setStudyGuideDeleteModalVisible(false)}
          >
            <Animated.View
              style={[styles.modalContent, {
                transform: [{
                  translateY: deleteSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0]
                  })
                }],
                paddingBottom: 35,
              }]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delete Study Guide</Text>
                <Pressable onPress={() => setStudyGuideDeleteModalVisible(false)}>
                  <Text style={styles.modalCloseButton}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.deleteWarningText}>
                  Are you sure you want to delete? This action cannot be undone.
                </Text>
                <Pressable
                  style={[styles.submitButton, styles.deleteConfirmButton]}
                  onPress={async () => {
                    if (guideToDelete && 'id' in guideToDelete) {
                      try {
                        await deleteStudyGuide(guideToDelete.id);
                        setStudyGuideDeleteModalVisible(false);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to delete study guide');
                      }
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Delete Study Guide</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitButton, styles.deleteCancelButton]}
                  onPress={() => setStudyGuideDeleteModalVisible(false)}
                >
                  <Text style={styles.submitButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Modal>

        {/* REVIEW */}
        {/* Add Quiz Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={quizModalVisible}
          onRequestClose={hideModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <Pressable
              style={styles.modalOverlay}
            >
              <Animated.View
                style={[styles.modalContent, {
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0]
                    })
                  }],
                  paddingBottom: 35,
                }]}
              >
                <Pressable onPress={(e) => e.stopPropagation()}>
                 
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{isEditingQuiz ? 'Edit Quiz' : 'Add New Quiz'}</Text>
                      <Pressable style={{padding: 5}} onPress={hideModal}>
                        <Text style={styles.modalCloseButton}>×</Text>
                      </Pressable>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Title</Text>
                        <TextInput
                          autoFocus
                          style={styles.input}
                          value={newQuizTitle}
                          onChangeText={setNewQuizTitle}
                          placeholder="Enter quiz title"
                          placeholderTextColor="#999999"
                        />
                      </View>

                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Prompt</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          value={newQuizQuery}
                          onChangeText={setNewQuizQuery}
                          placeholder="Add quiz question, answers, or just a prompt."
                          placeholderTextColor="#999999"
                          multiline
                          numberOfLines={8}
                        />
                      </View>

                        {studyGuidIsLoading === false && (
                          <Pressable
                            style={styles.submitButton}
                            onPress={() => {handleNewStudyGuide()}}
                          >
                            <Text style={styles.submitButtonText}>{isEditingQuiz ? 'Save Changes' : 'Add Quiz'}</Text>
                          </Pressable>
                        )}
                  
                        {studyGuidIsLoading === true && (
                          <Pressable
                            style={styles.submitButton}
                          >
                            <ActivityIndicator/>
                          </Pressable>
                        )}

                    </ScrollView>

                </Pressable>

              </Animated.View>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        {/* Delete Quiz Modal */}
        {/* <Modal
          animationType="none"
          transparent={true}
          visible={deleteStudyGuideModalVisible}
          onRequestClose={() => setStudyGuideDeleteModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setStudyGuideDeleteModalVisible(false)}
          >
            <Animated.View
              style={[styles.modalContent, {
                transform: [{
                  translateY: deleteSlideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0]
                  })
                }],
                paddingBottom: 35,
              }]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delete Study Guide</Text>
                <Pressable onPress={() => setStudyGuideDeleteModalVisible(false)}>
                  <Text style={styles.modalCloseButton}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.deleteWarningText}>
                  Are you sure you want to delete? This action cannot be undone.
                </Text>
                <Pressable
                  style={[styles.submitButton, styles.deleteConfirmButton]}
                  onPress={async () => {
                    if (guideToDelete && 'id' in guideToDelete) {
                      try {
                        await deleteStudyGuide(guideToDelete.id);
                        setStudyGuideDeleteModalVisible(false);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to delete study guide');
                      }
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Delete Study Guide</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitButton, styles.deleteCancelButton]}
                  onPress={() => setStudyGuideDeleteModalVisible(false)}
                >
                  <Text style={styles.submitButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Modal> */}

      </View>
    </SafeAreaView>
  );
}



