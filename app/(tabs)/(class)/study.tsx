import { Pressable, SafeAreaView, ScrollView, StyleSheet, View, Text, Dimensions, Modal, TextInput, Animated, Alert } from 'react-native';
import { theme } from '@/constants/theme';
import { useClass } from '@/contexts/ClassContext';
import { useStudyGuidesLocal } from '@/hooks/useDataFetch';
import React, { useRef, useState, useEffect } from 'react';
import { router } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import GoBack from '@/components/GoBack';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { replicate } from '@/constants/clients/replicateClient';
import { markdownScriptEnhancerPrompt } from '@/prompts/prompts';

export default function ClassScreen() {
  const { selectedClassId, setSelectedClassId, setCurrentStudyGuide } = useClass();
  const { studyGuides, loading, error, addStudyGuide, deleteStudyGuide } = useStudyGuidesLocal(selectedClassId || '');
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [newGuideTitle, setNewGuideTitle] = useState('');
  const [newGuideContent, setNewGuideContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [guideToDelete, setGuideToDelete] = useState<any>();
  const [editingGuide, setEditingGuide] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const deleteSlideAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (deleteModalVisible) {
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
  }, [deleteModalVisible]);

  const showModal = (guide?: any) => {
    if (guide) {
      setEditingGuide(guide);
      setNewGuideTitle(guide.title);
      setNewGuideContent(guide.text);
      setIsEditing(true);
    } else {
      setEditingGuide(null);
      setNewGuideTitle('');
      setNewGuideContent('');
      setIsEditing(false);
    }
    setModalVisible(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  };

  const hideModal = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start(() => {
      setModalVisible(false);
      setNewGuideTitle('');
      setNewGuideContent('');
      setEditingGuide(null);
      setIsEditing(false);
    });
  };

  const structureTextToReadableContent = async () => {
    try {
      const input = {
        prompt: `
        {system_prompt}
        ${markdownScriptEnhancerPrompt}
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
    }
  };

  const addGuideToLocalStorage = async () => {
    if (isEditing && editingGuide) {
      const updatedGuide = {
        ...editingGuide,
        title: newGuideTitle.trim(),
        text: newGuideContent.trim(),
        timestamps: [],
        audioFile: null,
        lastModified: new Date().toLocaleDateString(),
      };
      await deleteStudyGuide(editingGuide.id);
      await addStudyGuide(updatedGuide);
    } else {
      const newGuide = {
        id: Date.now().toString(),
        title: newGuideTitle.trim(),
        text: newGuideContent.trim(),
        lastModified: new Date().toLocaleDateString(),
      };
      await addStudyGuide(newGuide);
    }
  }


  const handleSaveStudyGuide = async () => {
    if (newGuideTitle.trim() && (newGuideContent.trim() || selectedFile)) {
      try {

        // structure the text
        const getGoodText = await structureTextToReadableContent()
        
        
        // text to audio

        const kokoroInput = {
          text: getGoodText,
          voice: "af_nicole"
        }

              // Get audio data from replicate
        const kokoroOutput = await replicate.run("jaaari/kokoro-82m:f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13", { input: kokoroInput });
        
              // Convert base64 string to Blob
        const response = await fetch(kokoroOutput.toString());
        const blob = await response.blob();

              // Create a File object that can be used in Expo
        const audioFile = new File([blob], `${newGuideTitle}-${newGuideContent.substring(0, 30)}.wav`, { type: 'audio/wav' });
        // Create a local URI that can be used by Expo's Audio API
        const fileUri = URL.createObjectURL(blob);
      
        // transcribe audio

        const whisperInput = {
          audio: fileUri,
        };

        const whisperOutput = await replicate.run("openai/whisper:8099696689d249cf8b122d833c36ac3f75505c666a395ca40ef26f68e7d3d16e", { input: whisperInput });
        console.log(whisperOutput)
        //=> {"segments":[{"id":0,"end":18.6,"seek":0,"text":" the lit...

        // then add text to local storage with audio file and timestamps

        await addGuideToLocalStorage();

        setNewGuideTitle('');
        setNewGuideContent('');
        setSelectedFile(null);
        hideModal();
      } catch (error) {
        Alert.alert('Error', isEditing ? 'Failed to update study guide' : 'Failed to add study guide');
      }
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'application/pdf'],
        copyToCacheDirectory: true
      });
      
      if (!result.canceled) {
        setSelectedFile(result as any);
        // TODO: Handle file content processing
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };
  
  const goBack = () => {
    setCurrentStudyGuide(null)
  }

  return (
    <SafeAreaView style={{width: "100%", height: "100%", backgroundColor: '#FFFFFF'}}>
      <View style={styles.container}>
          <GoBack route="/chooseclass" />
        <View style={styles.header}>

          <Text style={styles.headerTitle}>Study Guides</Text>
          <Pressable style={styles.addButton} onPress={showModal}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>

        </View>

        <ScrollView  showsVerticalScrollIndicator={false} style={styles.guideList}>
          {studyGuides?.map((guide) => (
            <Pressable
              key={guide.id}
              style={styles.guideCard}
              onPress={() => {
                setCurrentStudyGuide({ ...guide, audioFile: null })
                router.push('/(tabs)/(class)/read-listen')
              }}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.guideTitle}>
                    {guide.title}
                  </Text>
                  <View style={styles.actionButtons}>
                    <Pressable
                      onPress={() => showModal(guide)}
                      style={styles.editButton}
                    >
                      <Text style={styles.actionButtonText}>✏️</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setGuideToDelete(guide as any);
                        setDeleteModalVisible(true);
                      }}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.actionButtonText}>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={[styles.markdownPreview, {opacity: 0.618}]}>
                  <Text style={styles.addButtonText}>Preview:</Text>
                  <Markdown style={markdownStyles}>
                    {guide.text.split('\n').slice(0, 8).join('\n')}
                  </Markdown>
                </View>
                <Text style={styles.guideDate}>
                  Last modified: {guide.lastModified}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        {/* Add Study Guide Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={modalVisible}
          onRequestClose={hideModal}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={hideModal}
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? 'Edit Study Guide' : 'Add New Study Guide'}</Text>
                <Pressable onPress={hideModal}>
                  <Text style={styles.modalCloseButton}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput
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
                    onPress={handleFileUpload}
                  >
                    <Text style={styles.uploadButtonText}>
                      {selectedFile ? selectedFile : 'Choose File'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={styles.submitButton}
                  onPress={handleSaveStudyGuide}
                >
                  <Text style={styles.submitButtonText}>{isEditing ? 'Save Changes' : 'Add Study Guide'}</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Modal>

        {/* Delete Study Guide Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDeleteModalVisible(false)}
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
                <Pressable onPress={() => setDeleteModalVisible(false)}>
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
                        setDeleteModalVisible(false);
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
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={styles.submitButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const markdownStyles = {
  heading1: {
    fontSize: 24,
    color: '#000000',
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
    color: '#666666',
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  modalCloseButton: {
    fontSize: 32,
    color: '#666666',
    marginTop: -5,
  },
  modalBody: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  textArea: {
    height: 200,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 42,
    letterSpacing: -1,
    color: '#000000',
    fontWeight: '700',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  guideList: {
    flex: 1,
  },
  guideCard: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  guideTitle: {
    fontSize: 24,
    marginBottom: 8,
    letterSpacing: -0.5,
    fontWeight: '600',
    color: '#000000',
  },
  guideDate: {
    fontSize: 14,
    color: '#666666',
    opacity: 0.8,
    letterSpacing: 0.2,
  },
  markdownPreview: {
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  heading1: {
    fontSize: 24,
    color: '#000000',
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: 20,
    color: '#333333',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  paragraph: {
    fontSize: 16,
    color: '#666666',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 8,
    marginRight: -8,
    marginTop: -4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    marginTop: -4,
  },
  actionButtonText: {
    fontSize: 18,
    opacity: 0.7,
  },
  deleteConfirmButton: {
    backgroundColor: '#FF3B30',
  },
  deleteCancelButton: {
    backgroundColor: '#8E8E93',
  },
  deleteWarningText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
});