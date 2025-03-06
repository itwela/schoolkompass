import { Platform, Pressable, StyleSheet, SafeAreaView, View, Text, ActivityIndicator, Modal, TextInput, Animated, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useClass } from '@/contexts/ClassContext';
import { useEffect, useRef, useState } from 'react';
import { colors, commonStyles } from '@/constants/styles';
import { useClassesLocal } from '@/hooks/useDataFetch';
import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';
import { TestComponent } from '@/components/testComponent';


export default function HomeScreen() {
  const { classes, classesLoading, classesError, setSelectedClassId, setCurrentStudyGuide } = useClass()
  const { fetchClasses, addClass, deleteClass, deleteAllClasses } = useClassesLocal()
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const deleteSlideAnim = useRef(new Animated.Value(0)).current;
  const [classToDelete, setClassToDelete] = useState<any>();
  const [deleteClassModalVisible, setDeleteClassModalVisible] = useState(false);
  const [localClasses, setLocalClasses] = useState(classes);

  const handleDeleteAllClasses = async () => {
    await deleteAllClasses();
    setDeleteModalVisible(false);
    setLocalClasses([]);
  };

  useEffect(() => {
    if (Array.isArray(classes)) {  // Add check for array
      setLocalClasses(classes);
    }
  }, [classes]);

  useEffect(() => {
    if (deleteClassModalVisible) {
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
  }, [deleteClassModalVisible]);

  const showModal = () => {
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
    }).start(() => setModalVisible(false));
  };

  const handleAddClass = async () => {
    if (newClassName.trim() && newClassDescription.trim()) {
      const newClass = {
        id: Date.now().toString(),
        name: newClassName.trim(),
        description: newClassDescription.trim()
      };
      await addClass(newClass);
      setLocalClasses(prev => [...prev, newClass]);
      setNewClassName('');
      setNewClassDescription('');
      hideModal();
    }
  };

  useEffect(() => {
    setSelectedClassId(null)
    setCurrentStudyGuide(null)
    fetchClasses()
  }, [])

  const styles = StyleSheet.create({
    ...commonStyles,
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: useThemeColor({}, 'background'),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
      marginTop: 10,
    },

    deleteButtonContainer: {
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 'auto',  // This pushes it to the bottom of the list
    },
    deleteButton: {
      backgroundColor: '#FF3B30',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      opacity: 0.8,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    deleteButtonText: {
      color: useThemeColor({}, 'text'),
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
      headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: useThemeColor({}, 'text'),
      },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: useThemeColor({}, 'teal'),
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
    classList: {
      flex: 1,
      paddingTop: 10,
    },
    classCard: {
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
      marginBottom: 12,
    },
    className: {
      fontSize: 18,
      fontWeight: '600',
      color: useThemeColor({}, 'text'),
      flex: 1,
      marginRight: 8,
    },
    classDescription: {
      fontSize: 16,
      color: useThemeColor({}, 'text'),
      lineHeight: 22,
    },
    trashIcon: {
      padding: 8,
      marginRight: -8,
    },
    trashIconText: {
      fontSize: 20,
      opacity: 0.7,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: useThemeColor({}, 'background'),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingTop: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    modalTitle: {
      fontSize: 28,
      fontWeight: '600',
      color: useThemeColor({}, 'text'),
      letterSpacing: -0.5,
    },
    modalCloseButton: {
      fontSize: 36,
      color: '#666666',
      marginTop: -8,
      marginRight: -8,
    },
    modalBody: {
      gap: 20,
    },
    inputContainer: {
      gap: 10,
    },
    inputLabel: {
      fontSize: 17,
      fontWeight: '600',
      color: useThemeColor({}, 'text'),
      marginBottom: 2,
    },
    input: {
      backgroundColor: useThemeColor({}, 'background'),
      borderRadius: 12,
      padding: 16,
      fontSize: 17,
      color: useThemeColor({}, 'text'),
    },
    textArea: {
      height: 120,
      textAlignVertical: 'top',
    },
    submitButton: {
      backgroundColor: useThemeColor({}, 'tint'),
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      marginTop: 12,
      shadowColor: useThemeColor({}, 'tint'),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    submitButtonText: {
      color: useThemeColor({}, 'text'),
      fontSize: 17,
      fontWeight: '600',
    },
    deleteWarningText: {
      fontSize: 17,
      color: useThemeColor({}, 'text'),
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 24,
    },
    deleteConfirmButton: {
      backgroundColor: '#FF3B30',
    },
    deleteCancelButton: {
      backgroundColor: '#8E8E93',
    },
  });


  return (
    <>


    <SafeAreaView style={{ width: "100%", height: "100%", backgroundColor: useThemeColor({}, 'background') }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Classes</Text>
          <Pressable style={styles.addButton} onPress={showModal}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>

        {/* SECTION LOADING.....  */}
        {classesLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : classesError ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'red' }}>{classesError}</Text>
          </View>
        ) : (
          // SECTION END SECTION LOADING..... */}

          <ScrollView style={styles.classList}>

            {localClasses?.sort((a, b) => (a.id === "0" ? 1 : b.id === "0" ? -1 : 0))?.map((classItem) => (
            <Pressable
              onPress={() => { classItem?.id === "0" ? showModal() : setSelectedClassId(classItem?.id); }}
              key={classItem?.id}
              style={styles.classCard}
            >
              {/* NOTE DELETE CLASS */}
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  
                  <Text style={styles.className}>
                    {classItem.name}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setClassToDelete(classItem);
                      setDeleteClassModalVisible(true);
                    }}
                    style={styles.trashIcon}
                  >
                    <Text style={styles.trashIconText}>🗑️</Text>
                  </Pressable>
                </View>
                <Text style={styles.classDescription}>
                  {classItem.description}
                </Text>
              </View>
            </Pressable>
          ))}

            <View style={styles.deleteButtonContainer}>
              {/* <Pressable
                style={styles.deleteButton}
                onPress={() => setDeleteModalVisible(true)}
              >
                <Text style={styles.deleteButtonText}>Delete All Classes</Text>
              </Pressable> */}
            </View>
          </ScrollView>

        )}

        {/* Add Class Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={modalVisible}
          onRequestClose={hideModal}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
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
                <Text style={styles.modalTitle}>Add New Class</Text>
                <Pressable onPress={hideModal}>
                  <Text style={styles.modalCloseButton}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Class Name</Text>
                  <TextInput
                    style={styles.input}
                    value={newClassName}
                    onChangeText={setNewClassName}
                    placeholder="Enter class name"
                    placeholderTextColor="#999999"
                    autoFocus={true}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newClassDescription}
                    onChangeText={setNewClassDescription}
                    placeholder="Enter class description"
                    placeholderTextColor="#999999"
                    multiline
                    numberOfLines={4}
                    autoFocus={true}
                  />
                </View>

                <Pressable
                  style={styles.submitButton}
                  onPress={handleAddClass}
                >
                  <Text style={styles.submitButtonText}>Add Class</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        {/* Delete SINGLE Confirmation Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={deleteClassModalVisible}
          onRequestClose={() => setDeleteClassModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setDeleteClassModalVisible(false)}
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
                <Text style={styles.modalTitle}>Delete Class</Text>
                <Pressable onPress={() => setDeleteClassModalVisible(false)}>
                  <Text style={styles.modalCloseButton}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.deleteWarningText}>
                  Are you sure you want to delete "{classToDelete?.name}"? This will remove all associated study guides and data.
                </Text>
                <Pressable
                  style={[styles.submitButton, styles.deleteConfirmButton]}
                  onPress={async () => {
                    if (classToDelete?.id) {
                      await deleteClass(classToDelete.id);
                      setDeleteClassModalVisible(false);
                      router.reload();
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Yes, Delete Class</Text>
                </Pressable>
                <Pressable
                  style={[styles.submitButton, styles.deleteCancelButton]}
                  onPress={() => setDeleteClassModalVisible(false)}
                >
                  <Text style={styles.submitButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </Animated.View>
          </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        {/* Delete ALL Confirmation Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
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
                <Text style={styles.modalTitle}>Delete All Classes</Text>
                <Pressable onPress={() => setDeleteModalVisible(false)}>
                  <Text style={styles.modalCloseButton}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.deleteWarningText}>
                  Are you sure you want to delete all classes? This action cannot be undone.
                </Text>
                <Pressable
                  style={[styles.submitButton, styles.deleteConfirmButton]}
                  onPress={handleDeleteAllClasses}
                >
                  <Text style={styles.submitButtonText}>Yes, Delete All</Text>
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
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </SafeAreaView>
    {/* {testMode === false && (
    )} */}

    </>
  );
}


