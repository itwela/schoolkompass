import { Platform, Pressable, StyleSheet, SafeAreaView, View, Text, ActivityIndicator, Modal, TextInput, Animated } from 'react-native';
import { Link, router } from 'expo-router';
import { useClass } from '@/contexts/ClassContext';
import { useEffect, useRef, useState } from 'react';
import { colors, commonStyles } from '@/constants/styles';
import { useClassesLocal } from '@/hooks/useDataFetch';

export default function HomeScreen() {
  const { classes, classesLoading, classesError, setSelectedClassId } = useClass()
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
    fetchClasses()
  }, [])

  return (
    <SafeAreaView style={{ width: "100%", height: "100%", backgroundColor: '#FFFFFF' }}>
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

          <View style={styles.classList}>

            {localClasses?.sort((a, b) => (a.id === "0" ? 1 : b.id === "0" ? -1 : 0))?.map((classItem) => (
            <Pressable
              onPress={() => { classItem?.id === "0" ? console.log('add a class bro') : setSelectedClassId(classItem?.id); }}
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
              <Pressable
                style={styles.deleteButton}
                onPress={() => setDeleteModalVisible(true)}
              >
                <Text style={styles.deleteButtonText}>Delete All Classes</Text>
              </Pressable>
            </View>
          </View>

        )}

        {/* Add Class Modal */}
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
        </Modal>

        {/* Delete SINGLE Confirmation Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={deleteClassModalVisible}
          onRequestClose={() => setDeleteClassModalVisible(false)}
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
        </Modal>

        {/* Delete ALL Confirmation Modal */}
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
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ...commonStyles,
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trashIcon: {
    padding: 8,
    marginRight: -8,
    marginTop: -4,
  },
  trashIconText: {
    fontSize: 18,
    opacity: 0.7,
  },
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
    height: 100,
    textAlignVertical: 'top',
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
  headerTitle: {
    fontSize: 42,
    letterSpacing: -1,
    color: '#000000',
    fontWeight: '700',
  },
  deleteButtonContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#FF3B3030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteWarningText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  deleteConfirmButton: {
    backgroundColor: '#FF3B30',
  },
  deleteCancelButton: {
    backgroundColor: '#8E8E93',
  },
});
