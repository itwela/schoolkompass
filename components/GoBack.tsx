import { Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useThemeColor } from '@/hooks/useThemeColor';

type GoBackProps = {
  route: string;
  onBeforeNavigate?: () => void;
};

export default function GoBack({ route, onBeforeNavigate }: GoBackProps) {
  const handlePress = async () => {
    if (onBeforeNavigate) {
      onBeforeNavigate();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(route as any);
  };

  return (
    <Pressable onPress={handlePress} style={{ paddingRight: 30}}>
      <FontAwesome name="chevron-left" size={24} color={useThemeColor({}, 'text')} />
    </Pressable>
  );
}