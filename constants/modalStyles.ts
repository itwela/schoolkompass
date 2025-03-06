import { StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export const modslStyles = StyleSheet.create({
    
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
  submitButton: {
    backgroundColor: useThemeColor({}, 'tint'),
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: useThemeColor({}, 'background'),
    fontSize: 16,
    fontWeight: '600',
  },
  deleteWarningText: {
    fontSize: 16,
    color: useThemeColor({}, 'icon'),
    marginBottom: 20,
    textAlign: 'center',
  },
  
});