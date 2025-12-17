import { ROUTE_ENTRIES } from '@/components/constants';
import { Redirect } from 'expo-router';
export default function Index() {
  return <Redirect href={ROUTE_ENTRIES} />;
}
