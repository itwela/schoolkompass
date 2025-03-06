/* eslint-disable react/jsx-key */
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Pressable, Dimensions } from 'react-native';
import { TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useClass } from '@/contexts/ClassContext';
import Markdown, { MarkdownIt } from 'react-native-markdown-display';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import GoBack from '@/components/GoBack';
import React, { useEffect, useRef, useState } from 'react';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTrackPlayer } from '@/hooks/useTrackPlayer';
import TrackPlayer, { AppKilledPlaybackBehavior } from 'react-native-track-player';

export default function ReadListenScreen() {


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: useThemeColor({}, 'background'),
    },
    progress: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: useThemeColor({}, 'tint'),
      padding: 5
    },
    activeSpeedButton: {
      backgroundColor: useThemeColor({}, 'teal'),
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
      color: useThemeColor({}, 'text'),
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
      color: useThemeColor({}, 'text'),
    },
    audioPlayer: {
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
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      borderRadius: 2,
    },
    controllerTextAndAudio: {
      position: 'absolute',
      bottom: 10,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderRadius: 24,
      borderWidth: 5,
      borderColor: useThemeColor({}, 'fadedGrey'),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      marginHorizontal: 50,
      backgroundColor: useThemeColor({}, 'background'),
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      padding: 10
    },
    textScaleBox: {
      height: 40,
      width: '100%',
      paddingHorizontal: 20,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      backgroundColor: useThemeColor({}, 'fadedGrey'),
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
      backgroundColor: useThemeColor({}, 'teal'),
      shadowColor: useThemeColor({}, 'tint'),
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
      backgroundColor: useThemeColor({}, 'fadedGrey'),
    },
    inActiveSpeedButtonText: {
      fontSize: 12,
      color:  useThemeColor({}, 'audioControlTextInactive'),
      fontWeight: '600',
    },
    activeSpeedButtonText: {
      fontSize: 12,
      color:  useThemeColor({}, 'audioControlTextActive'),
      fontWeight: '600',
    },
    speedButtonText: {
      fontSize: 12,
      color:  useThemeColor({}, 'audioControlTextActive'),
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

  const { currentStudyGuide, setCurrentStudyGuide, markedSegments, setMarkedSegments } = useClass();
  const [studyGuideText, setStudyGuideText] = useState<string>('')
  const { isPlaying, position, duration, loadAudio, playPauseAudio, seekAudio, setSpeed } = useTrackPlayer();

  
  // Update useEffect to use new loadAudio
  useEffect(() => {
    if (currentStudyGuide?.audioFile) {
      loadAudio(currentStudyGuide.audioFile, playbackSpeed);
    }
    return () => {
      TrackPlayer.reset();
    };
  }, [currentStudyGuide]);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [tempPosition, setTempPosition] = useState(0);
  const [textScale, setTextScale] = useState<number>(1);
  const scrollViewRef = useRef<ScrollView>(null);
  const segmentRefs = useRef<{ [key: number]: View | null }>({});
  const [contentHeight, setContentHeight] = useState(0);
  const [lastScrolledSegment, setLastScrolledSegment] = useState<number | null>(null);

  useEffect(() => {
    if (currentStudyGuide) {
      const text = currentStudyGuide.text;
      setStudyGuideText(text)
    }
  }, [currentStudyGuide]);


  useEffect(() => {
    if (currentStudyGuide?.timestamps) {
      let lastLoggedIndex: any = null;
      const interval = setInterval(async () => {
        const position = await TrackPlayer.getPosition();
        const positionMillis = position * 1000;
  
        const currentIndex = currentStudyGuide.timestamps.findIndex(
          (segment: any) =>
            positionMillis >= segment.start * 1000 &&
            positionMillis <= segment.end * 1000
        );
  
        // Only log when the segment changes
        if (currentIndex !== lastLoggedIndex) {
          console.log('Current segment:', currentIndex, 'Position:', positionMillis);
          console.log('Matching text:', currentStudyGuide.timestamps[currentIndex]?.text);
          lastLoggedIndex = currentIndex;
        }
  
        setCurrentSegment(currentIndex);
  
        if (currentIndex !== -1) {
          setHighlightedText(currentStudyGuide.timestamps[currentIndex].text);
        } else {
          setHighlightedText('');
        }
        setCurrentSegment(currentIndex);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [currentStudyGuide, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(async () => {
        // if (status.isLoaded) {
        //   setPosition(status.positionMillis);
        // }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (currentSegment !== null && 
        currentSegment !== -1 && 
        currentSegment !== lastScrolledSegment) {
      
      const currentRef = segmentRefs.current[currentSegment];
      if (currentRef) {
        currentRef.measure((x, y, width, height, pageX, pageY) => {
          const windowHeight = Dimensions.get('window').height;
          const scrollToY = Math.max(0, y - (windowHeight / 3));
          scrollViewRef.current?.scrollTo({
            y: scrollToY,
            animated: true
          });
        });
        setLastScrolledSegment(currentSegment);
      }
    }
  }, [currentSegment]);


  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const HighlightedText = ({ text, highlightedText, index }: { text: string, highlightedText: string, index: number }) => {
    
    const handleMakeThisANote = async () => {
      if (!currentStudyGuide?.timestamps) return;
  
      // NOTE HOW TO MAKE THAT BUTTON PRESS FEEDBACK THING ON APPS
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('Double tab on segment:', index);
      
      const newTimestamps = [...currentStudyGuide.timestamps];
      newTimestamps[index] = {
        ...newTimestamps[index],
        makeNoteOfThis: !newTimestamps[index].makeNoteOfThis
      };
  
      // Update markedSegments set
      const newMarkedSegments = new Set(markedSegments);
      if (!markedSegments.has(text)) {
        newMarkedSegments.add(text);
      } else {
        newMarkedSegments.delete(text);
      }
      setMarkedSegments(newMarkedSegments);
  
      setCurrentStudyGuide({
        ...currentStudyGuide,
        timestamps: newTimestamps
      });
    };
  
    return (
      <View  
      ref={(ref) => {
        if (ref) {
          segmentRefs.current[index] = ref;
        }
      }}
      collapsable={false} 
       style={{  marginBottom: 6 }}
       >
        <Pressable 
          // onPress={handleDoubleTab}  // Changed this line
          delayLongPress={200} 
          onLongPress={handleMakeThisANote}
        >
          <Text style={{
            textAlign: 'left',
            marginBottom: 10,
            fontSize: 16 * textScale,
            lineHeight: 24 * textScale,
            color: useThemeColor({}, 'text'),
            backgroundColor: text === highlightedText ? useThemeColor({}, 'highlight') : 'transparent',
            borderRightWidth: markedSegments.has(text) ? 10 : 0,
            borderBottomWidth: markedSegments.has(text) ? 2 : 0,
            borderRightColor: markedSegments.has(text) ? useThemeColor({}, 'teal') : 'transparent',
            borderBottomColor: markedSegments.has(text) ? useThemeColor({}, 'teal') : 'transparent',
          }}>
            {text}
          </Text>
        </Pressable>
      </View>
    );
  };

  const handleTouchStart = async () => {
    setIsDragging(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);     

  };

  const handleTouchMove = (event: any) => {
    if (isDragging) {
      const { locationX } = event.nativeEvent;
      const percentage = Math.min(Math.max(locationX / progressBarWidth, 0), 1);
      const newPosition = Math.floor(duration * percentage);
      setTempPosition(newPosition);
  
      // Find and set the segment
      const segmentIndex = findSegmentIndex(newPosition);
      if (segmentIndex !== -1) {
        setCurrentSegment(segmentIndex);
        setHighlightedText(currentStudyGuide?.timestamps[segmentIndex].text);
      } else {
        setHighlightedText('');
      }
    }
  };

  const handleTouchEnd = (event: any) => {
    setIsDragging(false);
    const { locationX } = event.nativeEvent;
    const percentage = Math.min(Math.max(locationX / progressBarWidth, 0), 1);
    const newPosition = Math.floor(duration * percentage);
    seekAudio(newPosition);

    // Find and set the segment
    const segmentIndex = findSegmentIndex(newPosition);
    if (segmentIndex !== -1) {
      setCurrentSegment(segmentIndex);
      setHighlightedText(currentStudyGuide?.timestamps[segmentIndex].text);
    } else {
      setHighlightedText('');
    }
  };

  const goBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);     
    setCurrentStudyGuide(null)
  }

  const findSegmentIndex = (positionMillis: any) => {
    if (!currentStudyGuide?.timestamps) return -1;
    return currentStudyGuide.timestamps.findIndex(
      (segment: any) =>
        positionMillis >= segment.start * 1000 &&
        positionMillis <= segment.end * 1000
    );
  };


  const handleSeek = (event: any) => {
    const { locationX } = event.nativeEvent;
    const percentage = locationX / progressBarWidth;
    const newPosition = Math.floor(duration * percentage);
    seekAudio(newPosition);
  };



  return (
    <SafeAreaView style={{ width: "100%", height: "100%", backgroundColor: useThemeColor({}, 'background') }}>
      <View style={{ flex: 1, padding: 16, }}>
        <View style={styles.header}>
          <GoBack route="/study" onBeforeNavigate={goBack} />
          <Text style={styles.content}>
            {currentStudyGuide?.title || 'No Study Guide Selected'}
          </Text>
        </View>

        
        <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} style={styles.container}>

          <View style={[styles.contentContainer]}>

            <View style={[styles.contentContainer]}>
              {currentStudyGuide?.timestamps?.map((segment: any, index: number) => (
                <HighlightedText
                  key={index}
                  index={index}
                  text={segment.text}
                  highlightedText={highlightedText}
                 
                />
              ))}
            </View>

          </View>

        </ScrollView>

        {/* TODO TURN THIS INTO A COMPONENT */}
        {/* STUB AUDIO PLAYER */}

        <View style={styles.controllerTextAndAudio}>

      
        <View style={styles.textScaleBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ padding: 10 }}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTextScale(prev => Math.max(0.5, prev - 0.1));
                }}
              >
                <Text style={{ color: useThemeColor({}, 'text') }}>A-</Text>
              </TouchableOpacity>
              <Text style={{ color: useThemeColor({}, 'text') }}>{(textScale * 100).toFixed(0)}%</Text>
              <TouchableOpacity
                style={{ padding: 10 }}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTextScale(prev => Math.min(2, prev + 0.1));
                }}
              >
                <Text style={{ color: useThemeColor({}, 'text') }}>A+</Text>
              </TouchableOpacity>
            </View>
        </View>

        <View style={styles.audioPlayer}>

          <View style={styles.progressContainer}>
            <View style={styles.timeDisplay}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>


            <View style={styles.progressBar}
              onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                setProgressBarWidth(width);
              }}
            >
              <Pressable
                style={{ width: '100%', height: '100%' }}
                onPressIn={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <View style={{ width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                  <Animated.View
                    style={[
                      styles.progress,
                      {
                        width: duration ? `${((isDragging ? tempPosition : position) / duration) * 100}%` : '0%',
                        position: 'absolute',
                        left: 0,
                      }
                    ]}
                  />
                </View>
              </Pressable>
            </View>


          </View>

          <View style={styles.controlsContainer}>
            <View style={styles.speedControls}>

              <TouchableOpacity
                style={[styles.speedButton, playbackSpeed === 1 && styles.activeSpeedButton]}
                onPress={() => setSpeed(1)}
              >
                <Text style={playbackSpeed === 1 ? styles.activeSpeedButtonText : styles.inActiveSpeedButtonText}>1x</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.speedButton, playbackSpeed === 1.5 && styles.activeSpeedButton]}
                onPress={() => setSpeed(1.5)}
              >
                <Text style={playbackSpeed === 1.5 ? styles.activeSpeedButtonText : styles.inActiveSpeedButtonText}>1.5x</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.speedButton, playbackSpeed === 2 && styles.activeSpeedButton]}
                onPress={() => setSpeed(2.0)}
              >
                <Text style={playbackSpeed === 2 ? styles.activeSpeedButtonText : styles.inActiveSpeedButtonText}>2x</Text>
              </TouchableOpacity>

            </View>

            <TouchableOpacity style={styles.playButton} onPress={playPauseAudio}>
              <IconSymbol
                name={isPlaying ? "pause.fill" : "play.fill"}
                size={24}
                weight="medium"
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          

        </View>

        </View>



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
    fontSize: 16, // Increased from 10
    color: '#1A1A1A',
    lineHeight: 24,
    marginVertical: 12,
    fontFamily: 'Georgia',
  },
  text: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 30,
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
