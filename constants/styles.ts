import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#007AFF',
  background: '#FFFFFF',
  text: {
    primary: '#000000',
    secondary: '#666666'
  },
  shadow: {
    primary: '#007AFF',
    dark: '#000'
  }
};

export const commonStyles = StyleSheet.create({
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
    color: colors.text.primary,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 28,
    color: colors.background,
    fontWeight: '300',
  },
  classList: {
    gap: 16,
  },
  classCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  className: {
    fontSize: 28,
    marginBottom: 8,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  classDescription: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text.secondary,
    opacity: 0.9,
  },
});