import React, { useState } from "react";
import Animated from "react-native-reanimated";
import { FadeOut, FadeOutDown, FadeOutUp, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { FadeInDown, FadeInUp } from "react-native-reanimated";
import { StyleSheet, KeyboardAvoidingView, Modal, Button, TouchableOpacity, ScrollView, Animated as ReactNativeAnimated, RefreshControl, Pressable, ActivityIndicator, LayoutChangeEvent, Keyboard, TextInputProps, Platform, Image, TextInput } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from "react-native";
import { FontAwesome } from '@expo/vector-icons';
import { TouchableWithoutFeedback } from "react-native-gesture-handler";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export const colors = {
	primary: '#DB581A',
	background: '#000',
	text: '#000',
	textMuted: '#9ca3af',
	icon: "#2F2B2A",
	minimumTrackTintColor: "#2F2B2A",
	maximumTrackTintColor: '#DB581A',
  readioBrown: '#272121',
  readioWhite: '#E9E0C1',
  readioBlack: '#2F2B2A',
  readioOrange: '#DB581A',
  readioDustyWhite: "#DAD2B6"
}

declare interface InputFieldProps extends TextInputProps {
    label: string;
    icon?: any;
    secureTextEntry?: boolean;
    labelStyle?: string;
    containerStyle?: string;
    inputStyle?: string;
    iconStyle?: string;
    className?: string;
  }

  
  export function TestComponent() {
      
      // CONTROLS IF THE MODEL WILL SHOW OR NOT
      const [ isArticleModalVisible, setIsArticleModalVisible ] = useState(true)
      
      
      const styles = StyleSheet.create({
          pagerView: {
        flex: 1,
    },
    page: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 60,
        fontWeight: 'bold',
        color: colors.readioWhite
    },
    subtext: {
        fontSize: 15,
        opacity: 0.5,
        textAlign: 'center',
        color: colors.readioWhite
    },
    animatedBorder: {
        borderWidth: 2,
        borderRadius: 10,
        borderStyle: 'solid',
        zIndex: 5,
        borderColor: colors.readioOrange
    },
    toast: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        zIndex: 10,
        backgroundColor: '#fff',
        maxWidth: '100%',
        height: 50,
        display: 'flex'
    },
    scrollView: {
        width: '90%',
        minHeight: '100%',
    },
    heading: {
        fontSize: 40,
        fontWeight: 'bold',
        textAlign: 'center',
        color: colors.readioWhite,
        zIndex: 1,
    },
    option: {
        fontSize: 12,
        paddingBottom: 10,
        color: colors.readioWhite,
        width: "80%",
        alignSelf: 'center',
        textAlign: 'center',
    },
    title: {
        fontSize: 20,
        // fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: colors.readioWhite,
    },
    announcmentBigText: {
        fontSize: 18,
        color: colors.readioWhite,
    },
    announcmentSmallText: {
        color: colors.readioWhite,
    },
    gap: {
        marginVertical: 20,
    },
    readioRadioContainer: {
        width: 160,
    },
    stationContainer: {
        width: '100%',
    },
    station: {
        width: 140,
        height: 140,
        marginVertical: 15,
    },
    stationImage: {
        width: 170,
        height: 160,
        overflow: 'hidden',
        borderRadius: 10,
        position: 'relative',
    },
    stationName: {
        fontWeight: 'bold',
        textAlign: 'left',
        color: colors.readioWhite,
        paddingHorizontal: 10,
        fontSize: 20
    },
    nowPlaying: {
        borderRadius: 10,
        width: '95%',
        height: 300,
        marginVertical: 10,
        alignSelf: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nowPlayingOverlay: {
        position: 'absolute',
        zIndex: 1,
        top: 0,
        left: 0,
        width: '100%',
        height: 300,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent'
    },
    nowPlayingText: {
        color: colors.readioWhite,
        zIndex: 1,
        fontWeight: 'bold',
        fontSize: 20,
        padding: 10,
    },
    nowPlayingImage: {
        width: '100%',
        height: 300,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        top: 0,
        borderRadius: 10
    },
    // container: {
    //     marginVertical: 8,
    //     width: '100%',
    //   },
      label: {
        fontSize: 20,
        marginBottom: 12,
        color: colors.readioWhite,
      },
      inputContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: colors.readioBlack,
        borderRadius: 10,
        // borderWidth: 1,
        // borderColor: colors.readioWhite,
        color: colors.readioWhite,
      },
      icon: {
        width: 24,
        height: 24,
        marginLeft: 16,
      },
      input: {
        borderRadius: 50,
        padding: 16,
        fontSize: 14,
        flex: 1,
        textAlign: 'left',
        color: colors.readioWhite,
      },
    });
    
    const InputField = ({
        label,
        icon,
        secureTextEntry = false,
        labelStyle,
        containerStyle,
        inputStyle,
        iconStyle,
        className,
        ...props
      }: InputFieldProps) => {
        return (
            <GestureHandlerRootView>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.container]}>
                {label !== '' && (
                  <>
                    <Text style={[styles.label]}>
                      {label}
                    </Text>
                  </>
                )}
                <View style={styles.inputContainer}>
                  {icon && (
                    <Image source={icon} style={[styles.icon]} />
                  )}
                  <TextInput
                    style={[styles.input, {color: colors.readioWhite}]}
                    secureTextEntry={secureTextEntry}
                    placeholderTextColor={colors.readioWhite}
                    {...props}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
          </GestureHandlerRootView>
        );
    };

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isArticleModalVisible}
        // onRequestClose={toggleModal}
        style={{ width: '100%', height: '100%' }}
      >
        <LinearGradient
          colors={[colors.readioBrown, 'transparent']}
          style={{
            zIndex: 1,
            bottom: '60%',
            position: 'absolute',
            width: '150%',
            height: 450,
            transform: [{ rotate: '-180deg' }],
          }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <View style={{ width: "100%", minHeight: "600%", zIndex: -3, position: "absolute", backgroundColor: colors.readioBrown }} />
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1}}>

            <View style={{ width: '100%',display: 'flex', alignItems: 'flex-end', backgroundColor: "transparent" }}>
              <TouchableOpacity style={{ padding: 5 }}>
                <FontAwesome name="close" size={30} color={colors.readioWhite} />
              </TouchableOpacity>
            </View>

            <View style={{ display: 'flex', zIndex: 2, width: '100%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: "transparent", flexDirection: "column" }}>
              
              <Animated.View entering={FadeInUp.duration(300)} exiting={FadeOutDown.duration(300)} style={{  backgroundColor: colors.readioOrange, borderRadius: 100, padding: 10}}>
                <View
                    style={{ width: 80, height: 80,  zIndex: 2, }} 
                  />
              </Animated.View>

              <View style={{ width: '90%', zIndex: 2 }}>
                <Text allowFontScaling={false} style={styles.heading}>Create</Text>
                <Text allowFontScaling={false} style={styles.subtext}>From simple ideas to detailed instructions, craft the perfect article in moments.</Text>
              </View>
              
              <View style={{ marginVertical: 10 }}>
                {/* <Text allowFontScaling={false} style={{ color: colors.readioWhite, opacity: 0.6, textAlign: 'center' }}>Using your wildest imagination,</Text> */}
                <Text allowFontScaling={false} style={{ color: colors.readioWhite, opacity: 0.6, textAlign: 'center' }}>What do you want to hear?</Text>
              </View>

            </View>
           
            <View style={{ justifyContent: 'center', backgroundColor: colors.readioBlack, borderRadius: 10, width: '100%', alignItems: 'flex-start', }}>
              <InputField
                // onChangeText={(text) => setForm({ ...form, query: text })} value={form.query}
                placeholder={"Type your query here..."}
                style={{ width: '90%', height: 45, padding: 15, color: colors.readioWhite, fontSize: 15}} label="">
              </InputField>

              <Pressable
                onPress={() => {}}
                style={{
                  position: 'absolute',
                  backgroundColor: colors.readioBlack,
                  opacity: 0.2,
                  width: 40, height: 40, right: 10, padding: 10, marginVertical: 10, borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <FontAwesome name={'chevron-right'} allowFontScaling={false} style={{ color: colors.readioWhite, fontWeight: 'bold', fontSize: 20 }} ></FontAwesome>
              </Pressable>

            </View>

          </KeyboardAvoidingView>
      </Modal>
    </>
  );
  
}