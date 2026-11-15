import { router, Stack } from 'expo-router';
import { View } from 'react-native';
import { Button, Title } from '@/components/ui';
import { theme as t } from '@/theme';
export default function NotFound() {return <View style={{padding:t.space.xl,gap:t.space.lg}}><Stack.Screen options={{title:'Page not found'}}/><Title>This little page wandered off.</Title><Button label="Back to the store" onPress={()=>router.replace('/')}/></View>;}
