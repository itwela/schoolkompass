import { Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';

type GoBackProps = {
  route: string;
  onBeforeNavigate?: () => void;
};

export default function GoBack({ route, onBeforeNavigate }: GoBackProps) {
  const handlePress = () => {
    if (onBeforeNavigate) {
      onBeforeNavigate();
    }
    router.push(route as any);
  };

  return (
    <Pressable onPress={handlePress} style={{ paddingVertical: 15,}}>
      <FontAwesome name="chevron-left" size={24} color="black" />
    </Pressable>
  );
}