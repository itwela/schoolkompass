/* eslint-disable react/jsx-key */
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useClass } from '@/contexts/ClassContext';
import Markdown, { MarkdownIt } from 'react-native-markdown-display';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import GoBack from '@/components/GoBack';
import React, { useEffect, useState } from 'react';
import { Audio } from 'expo-av';

export default function ReadListenScreen() {
  const { currentStudyGuide, setCurrentStudyGuide } = useClass();

  const [studyGuideText, setStudyGuideText] = useState<string>('')

  const goBack = () => {
    setCurrentStudyGuide(null)
  }

  useEffect(() => {
    if (currentStudyGuide) {
      const text = currentStudyGuide.text;
      setStudyGuideText(text)
    }
  }, [currentStudyGuide]);

  return (
    <SafeAreaView style={{ width: "100%", height: "100%", backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, padding: 16, }}>
        <View style={styles.header}>
          <GoBack route="/study" onBeforeNavigate={goBack} />
          <Text style={styles.content}>
            {currentStudyGuide?.title || 'No Study Guide Selected'}
          </Text>
        </View>
        <ScrollView style={styles.container}>
          <View style={[styles.contentContainer]}>
            <Markdown
              style={markdownStyles}
              markdownit={MarkdownIt({ typographer: true }).disable(['link', 'image'])}
                >
              {studyGuideText.trim() as string}
            </Markdown>
          </View>
        </ScrollView>

        {currentStudyGuide?.audioFile && (
          <View style={styles.audioPlayer}>

            <View style={styles.progressContainer}>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>0:00</Text>
                <Text style={styles.timeText}>3:45</Text>
              </View>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[styles.progress, { backgroundColor: '#007AFF' }]}
                />
              </View>
            </View>

            <View style={styles.controlsContainer}>

              <View style={[styles.speedControls, { width: 80, alignSelf: 'center' }]}>
                <View style={[styles.volumeBar, { width: 80 }]}>
                  <View style={styles.volumeProgress}>
                    <Animated.View
                      style={[styles.volumeLevel, { backgroundColor: '#007AFF' }]}
                    />
                  </View>
                  <IconSymbol
                    name="speaker.wave.2.fill"
                    size={16}
                    weight="medium"
                    color="#666666"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.playButton}>
                <IconSymbol
                  name="play.fill"
                  size={24}
                  weight="medium"
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <View style={styles.speedControls}>
                <TouchableOpacity style={styles.speedButton}>
                  <Text style={styles.speedButtonText}>1.5x</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.speedButton}>
                  <Text style={styles.speedButtonText}>2x</Text>
                </TouchableOpacity>
              </View>



            </View>

          </View>
        )
        }
      </View>
    </SafeAreaView>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    color: '#1A1A1A',
    fontFamily: 'Georgia',
    fontSize: 16, // Base font size for all text
    lineHeight: 24,
  },
  paragraph: {
    fontSize: 10, // Regular text size
    color: '#1A1A1A',
    lineHeight: 24,
    marginVertical: 12,
    fontFamily: 'Georgia',
  },
  heading1: {
    fontSize: 28, // Larger size for main headings
    color: '#000000',
    fontWeight: '900',
    marginBottom: 16,
    marginTop: 24,
    letterSpacing: -0.5,
    fontFamily: 'Georgia',
  },
  heading2: {
    fontSize: 24, // Slightly smaller than h1
    color: '#000000',
    fontWeight: '700',
    marginBottom: 14,
    marginTop: 20,
    letterSpacing: -0.3,
    fontFamily: 'Georgia',
  },
  heading3: {
    fontSize: 20, // Slightly smaller than h2
    color: '#000000',
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 18,
    fontFamily: 'Georgia',
  },
  text: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 30,
    fontFamily: 'Georgia',
  },
    heading4: {
    // fontSize: 24,
    color: '#000000',
    fontWeight: '600',
    marginBottom: 20,
    marginTop: 28,
    fontFamily: 'Georgia',
  },
  heading5: {
    // fontSize: 21,
    color: '#000000',
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 24,
    fontFamily: 'Georgia',
  },
  heading6: {
    // fontSize: 19,
    color: '#000000',
    fontWeight: '600',
    marginBottom: 14,
    marginTop: 20,
    fontFamily: 'Georgia',
  },
  bullet_list: {
    marginLeft: 32,
    marginVertical: 24,
  },
  ordered_list: {
    marginLeft: 32,
    marginVertical: 24,
  },
  list_item: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet_list_icon: {
    fontSize: 21,
    color: '#000000',
    marginRight: 16,
    lineHeight: 36,
  },
  ordered_list_icon: {
    fontSize: 21,
    color: '#000000',
    marginRight: 16,
    lineHeight: 36,
  },
  blockquote: {
    borderLeftWidth: 6,
    borderLeftColor: '#000000',
    paddingLeft: 28,
    marginVertical: 32,
    backgroundColor: '#F8F8F8',
    paddingVertical: 24,
    borderRadius: 4,
    fontStyle: 'italic',
  },
  code_inline: {
    fontFamily: 'SpaceMono',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    fontSize: 18,
  },
  code_block: {
    fontFamily: 'SpaceMono',
    backgroundColor: '#F5F5F5',
    padding: 24,
    borderRadius: 8,
    marginVertical: 28,
    fontSize: 18,
    lineHeight: 28,
  },
  fence: {
    marginVertical: 28,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginVertical: 28,
    overflow: 'hidden',
  },
  thead: {
    backgroundColor: '#F8F8F8',
  },
  th: {
    padding: 20,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E0E0E0',
    fontWeight: '600',
  },
  tr: {
    flexDirection: 'row',
  },
  td: {
    padding: 20,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E0E0E0',
  },
  link: {
    color: '#000000',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  image: {
    borderRadius: 8,
    marginVertical: 28,
  },
  hr: {
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    marginVertical: 40,
  },
  strong: {
    fontWeight: '700',
    color: '#000000',
  },
  em: {
    fontStyle: 'italic',
    color: '#1A1A1A',
  },
  s: {
    textDecorationLine: 'line-through',
    color: '#666666',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
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
  contentContainer: {
    paddingTop: 8,
    flex: 1,
    paddingBottom: 100,
  },
  content: {
    fontSize: 18,
    lineHeight: 32,
    letterSpacing: 0.2,
    color: '#000000',
  },
  audioPlayer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    height: 120,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    borderTopColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginHorizontal: 50,
    backgroundColor: '#ffffff',
  },
  progressContainer: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666666',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
  },
  progress: {
    width: '30%',
    height: '100%',
    borderRadius: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 25
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  speedControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  speedButtonText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  volumeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 100,
  },
  volumeProgress: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeLevel: {
    width: '70%',
    height: '100%',
    borderRadius: 2,
  },
})