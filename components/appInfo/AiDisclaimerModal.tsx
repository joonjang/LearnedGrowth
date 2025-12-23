import { AlertTriangle, Bot, FileText, ShieldCheck } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { Modal, Pressable, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function AiDisclaimerModal({ visible, onCancel, onConfirm }: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
     <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onCancel}>
        <View className="flex-1 items-center justify-center bg-black/60 px-4">
           <View className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
              <View className="items-center gap-4 mb-6">
                 <View className="h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
                    <Bot size={24} color={isDark ? '#818cf8' : '#4f46e5'} />
                 </View>
                 <Text className="text-center text-xl font-bold text-slate-900 dark:text-white">
                    Before we analyze
                 </Text>
              </View>
              <View className="gap-4 mb-8">
                 <InfoRow icon={<ShieldCheck size={20} color={isDark ? '#94a3b8' : '#64748b'} />} title="Not Medical Advice" description="This AI is a tool for self-reflection, not a doctor. It cannot diagnose mental health conditions." />
                 <InfoRow icon={<AlertTriangle size={20} color={isDark ? '#94a3b8' : '#64748b'} />} title="Check for Accuracy" description="AI can make mistakes. Please use your own judgment when reading the insights." />
                 <InfoRow icon={<FileText size={20} color={isDark ? '#94a3b8' : '#64748b'} />} title="Data Processing" description="Your entry text will be sent to our secure AI provider solely to generate this response." />
              </View>
              <View className="gap-3">
                 <Pressable onPress={onConfirm} className="h-12 w-full items-center justify-center rounded-xl bg-indigo-600 active:bg-indigo-700">
                    <Text className="font-bold text-white text-base">I Understand</Text>
                 </Pressable>
                 <Pressable onPress={onCancel} className="h-12 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700">
                    <Text className="font-bold text-slate-600 dark:text-slate-300 text-base">Cancel</Text>
                 </Pressable>
              </View>
           </View>
        </View>
     </Modal>
  );
}

function InfoRow({ icon, title, description }: { icon: React.ReactNode; title: string; description: string; }) {
  return (
     <View className="flex-row gap-3">
        <View className="mt-0.5">{icon}</View>
        <View className="flex-1 gap-0.5">
           <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</Text>
           <Text className="text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</Text>
        </View>
     </View>
  );
}
